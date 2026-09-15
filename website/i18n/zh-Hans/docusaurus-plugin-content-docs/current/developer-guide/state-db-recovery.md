---
title: "State DB 恢复"
description: "当 FTS 索引或文件本身损坏时,Hermes 如何恢复 state.db"
---

# State 数据库与 FTS 恢复

`state.db` 存储两类不同的数据:

- `sessions` 和 `messages` 是权威对话记录。
- `messages_fts*` 表及其同步触发器是派生的搜索索引。

派生索引可以临时分离。它们不应将一次实时消息写入或搜索变成无界的全文重建。

## FTS 损坏时的实时行为

如果 FTS 写入或搜索报告了损坏错误类别,`SessionDB` 会:

1. 记录持久的 `fts_stale` 标记;
2. 在同一事务中移除 FTS 同步触发器;
3. 在缺少派生索引接收端的情况下重试权威写入;并且
4. 通过 `LIKE` 回退从权威行提供搜索。

失败的实时操作绝不应运行 `FTS5('rebuild')`。现有恢复归属保持不变:后续打开 `SessionDB` 时,可以在跨进程准入锁与外部持有者保护的约束下执行重建。如果该受保护的重建无法运行,FTS 保持分离状态,权威写入仍然可用,且 `hermes doctor` 会报告明确的修复命令。

## 文件本身损坏时的实时行为

如果一次实时写入报告了裸的 `SQLITE_CORRUPT` / `SQLITE_NOTADB`(`database disk image is malformed`、`file is not a database`)且没有 FTS 来源,则损坏位于某个权威 B 树、schema 或空闲列表中。此时 `SessionDB` 会隔离该句柄(`StateDbCorruptError`):

1. 失败的写入会传播类型化错误,且不重试任何操作;
2. 该句柄上的后续写入会立即失败,而不触碰文件;
3. 该句柄在 `close()` 之后绝不应重新打开其连接;并且
4. `close()` 会跳过它显式的 WAL checkpoint。

停止写入就是保护措施。在实际现场中,某个句柄在首次结构性错误后仍持续写入约 50 分钟,关机时在错误的页号下 checkpoint 了 15 个页(第 1 页收到了 `messages_fts_trigram_data` 叶子),从而把一个已损坏但仍可读的文件变成了完全无法打开的文件。跳过显式 checkpoint 是第二道防线;在 Python 3.12+ 上,隔离还会禁用 SQLite 自身的最后连接 checkpoint(`SQLITE_DBCONFIG_NO_CKPT_ON_CLOSE`),因此 `-wal` 附属文件在 `close()` 之后仍保留以供取证。在 Python 3.11 上该开关不可用,SQLite 在 close 时可能仍会执行一次 checkpoint,因此在重启任何东西之前,请将 `state.db`、`state.db-wal` 和 `state.db-shm` 一起复制走。

网关和智能体刷新路径会将该隔离视为文件已替换:待处理的对话记录会写入 `sessions/<id>.jsonl` 和网关的 `pending_messages/` 暂存目录,而不是重试队列,并且 FTS 一次性重建绝不会在已损坏的文件上运行。隔离是按进程的 —— 共享句柄对每个持有者都保持毒化状态,直到进程在已修复或已恢复的文件上重启为止。网关仍在运行时,不要执行 `hermes doctor --fix`。后续步骤:

```bash
hermes gateway stop
HERMES_HOME="$HOME/.hermes" hermes sessions recover --source "$HOME/.hermes/state.db" --inspect-only
# 如果可恢复:
HERMES_HOME="$HOME/.hermes" hermes sessions recover --source "$HOME/.hermes/state.db" --output "$HOME/recovered-state.db"
```

或者从 `state-snapshots/` 恢复最新的快照。

## 显式修复

在修复 profile 数据库之前,停止每一个可能打开它的进程。在整个修复与验证窗口内保持它们停止。

```bash
hermes gateway stop
HERMES_HOME="$HOME/.hermes" hermes sessions repair --check-only
HERMES_HOME="$HOME/.hermes" hermes sessions repair
```

`sessions repair` 默认会创建一个 SQLite 备份,并通过仓库的受保护快照与提升路径执行结构性工作。不要用 `cp` 单独复制 `state.db`、`state.db-wal` 和 `state.db-shm`;这些文件共同构成一个实时 SQLite 镜像。

修复之后,在重启网关之前,请验证健康探针、stale 标记、触发器集合以及权威行计数:

```bash
HERMES_HOME="$HOME/.hermes" hermes sessions repair --check-only
sqlite3 "$HOME/.hermes/state.db" \
  "SELECT key, value FROM state_meta WHERE key = 'fts_stale';"
sqlite3 "$HOME/.hermes/state.db" \
  "SELECT type, name FROM sqlite_master WHERE name IN
   ('messages_fts_insert','messages_fts_update','messages_fts_delete')
   ORDER BY name;"
sqlite3 "$HOME/.hermes/state.db" \
  "SELECT 'sessions', COUNT(*) FROM sessions
   UNION ALL SELECT 'messages', COUNT(*) FROM messages;"
```

标记查询应返回空结果,预期的 FTS 触发器应存在,权威行计数不得减少。如果修复失败,请同时保留实时数据库和所报告的备份;绝不要为了让派生索引错误消失而删除权威行。
