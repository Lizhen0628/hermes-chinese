---
title: "会话存储恢复"
description: "当 Hermes 提示另一个进程仍持有会话数据库预写日志的旧副本时该怎么办，以及 state.db 旁边的那些文件是什么"
---

# 会话存储恢复

Hermes 会为每个配置档把所有对话都保存在一个 SQLite 文件中：`state.db`，另外还有两个由 SQLite 自行管理的附属文件：`state.db-wal`（预写日志）和 `state.db-shm`。多个 Hermes 进程可以安全地共享该文件——网关、Desktop 应用、dashboard、定时任务以及 CLI 命令都通过 SQLite 自身的锁机制进行写入。

但有一件事是不安全的：**在另一个进程正在写入存储时重写它**。当这种情况发生时，仍持有日志*旧*副本的进程会有意停止写入，此后每一轮对话都会返回类似下面的提示：

> 另一个 Hermes 进程仍然持有会话数据库预写日志的旧副本，
> 因此 Hermes 已停止写入以保护文件安全……

本页就是该提示所链接的指南。看到它时并没有任何东西丢失；拒绝写入的存在恰恰是为了避免丢失。

## 三步修复

1. **退出该配置档上的每一个 Hermes 进程。** 包括 Desktop 应用、网关、dashboard、定时任务：

   ```bash
   hermes gateway stop          # 为具名配置档加上 -p <profile>
   ```

   然后从菜单退出 Desktop 应用，并停止你可能在运行的任何 dashboard（`hermes dashboard --stop`）或自定义服务。只重启其中*一个*是不够的——只要有一个进程仍持有旧日志，每个新进程都会持续拒绝写入。

2. **让 doctor 告诉你谁仍持有该日志。**

   ```bash
   hermes doctor                # 为具名配置档加上 -p <profile>
   ```

   只要还有任何进程持有已弃用的日志，doctor 就会把每个持有者打印为
   `PID N (command)` 并附上相同的补救措施，同时跳过其健康探测和任何 `--fix` 操作，以免它自己变成另一个写入者。停掉所列出的进程并再次运行，直到该行消失。

3. **重新启动 Hermes**（先只启动一个进程——网关或 Desktop 应用），然后重新发送你的消息。你的对话将从停止的地方继续。

## 不要做的事

- **不要在进程仍在运行时执行 `hermes doctor --fix`。** 当 doctor 能够看到持有已弃用日志的进程时，它会拒绝执行检查点，但在无法检视进程的主机上，修复路径恰恰就是导致问题的那个第二写入者。
- **不要删除 `state.db-wal` 或 `state.db-shm`。** 该日志保存了尚未写入 `state.db` 的已提交对话。删除它是唯一一种会把拒绝写入变成真正数据丢失的操作。
- **不要只复制 `state.db`。** 这三个文件是一个整体映像。请使用快照（`hermes backup`）或 `hermes sessions recover`，绝不要 `cp state.db somewhere/`。
- **不要让智能体去修复它。** 智能体自身的会话就在同一个存储中；它会遇到同样的拒绝。

## 维护命令在有人写入时会拒绝执行

`hermes sessions optimize`、`hermes sessions optimize-storage 和 `hermes sessions prune`
都会重写存储（VACUUM、全文索引重建、批量删除）。在网关运行时执行其中之一，正是一群智能体最终陷入上述拒绝状态的原因，因此它们现在会先做检查，并在另一个进程持有数据库时拒绝执行：

```text
Refusing `hermes sessions optimize-storage`: another process is using ~/.hermes/state.db.
  PID 41230 (hermes gateway run): state.db, state.db-shm, state.db-wal
  PID 41355 (hermes serve --profile work): state.db-wal
Rewriting the database under a live writer is how every agent ends up refusing turns with the
retired state.db-wal error. Nothing is lost.
Stop them first (`hermes gateway stop`, quit the Desktop app, pause cron), then re-run.
Override with --force if you accept the risk.
```

`--dry-run` 预览永远不会被阻止。`--force` 无论如何都会执行——只有在你确定所列进程处于空闲状态时才使用它（例如你自己启动的某个读取进程）。当你在 Desktop 控制台中输入 `sessions optimize` 时也会运行同样的检查。

## 你可能会在 `state.db` 旁边看到的文件

| 文件或目录 | 它是什么 | 该怎么办 |
|---|---|---|
| `state.db-wal`、`state.db-shm` | SQLite 的实时预写日志及其共享内存索引。当网关或 Desktop 运行时，`-wal` 文件较大是正常的。 | 不要去动它们。它们会在下一次检查点时自行收缩。 |
| `state.db.retired-wal-<timestamp>-<pid>/` | 当一个进程拒绝写入时，Hermes 对该进程仍持有的日志副本所做的一次抓取，外加一份描述它的 `manifest.json`。这是取证证据，不是让你盲目恢复的备份。 | 保留它。如果恢复后缺少事发前不久的对话，请把该目录附到 bug 报告中；维护者可以从 `manifest.json` 判断那些帧是否应叠加到当前文件之上。 |
| `state.db.pre-update-emergency-<timestamp>.bak` | Desktop 更新器在改动存储之前所做的快照。 | 在你使用更新后的应用一段时间之前请保留它。只有在所有 Hermes 进程都停止时才能恢复：先运行 `hermes sessions recover --source <file> --inspect-only`。 |
| `state.db.corrupt.<timestamp>.bak`、`*.malformed-backup` | Hermes 在修复或隔离之前发现已损坏的文件副本。 | 不要把它们恢复到 `state.db` 之上——它们承载的是同一份损坏。留作报告之用；一旦恢复正常就可以安全删除。 |
| `state-snapshots/` | `hermes update` 和 `hermes backup` 所做的快速快照。 | 在所有 Hermes 进程都停止时恢复；参见 [`hermes backup`](../reference/cli-commands.md#hermes-backup)。 |

## 当这三步不奏效时

如果所有 Hermes 进程都已停止，`hermes doctor` 不再列出任何持有者，而网关在启动后仍拒绝写入，那么文件本身可能已损坏。再次停止一切，并在不写入的情况下检视：

```bash
hermes sessions recover --source ~/.hermes/state.db --inspect-only
```

`--inspect-only` 绝不会修改文件。如果它报告该存储可恢复，请遵循它打印出的命令，或者从 `state-snapshots/` 恢复最新的快照。这一切背后的机制见开发者指南：
[State DB recovery](../developer-guide/state-db-recovery.md) 和
[Session storage](../developer-guide/session-storage.md)。
