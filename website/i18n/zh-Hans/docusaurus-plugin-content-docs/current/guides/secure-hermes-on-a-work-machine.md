---
sidebar_position: 26
title: "在个人或工作机器上运行 Hermes"
description: "在你日常使用的机器上运行 Hermes Agent 的安全态势演练——默认配置保护了什么、如何进一步收紧、以及如何撤销失误"
---

# 在个人或工作机器上运行 Hermes

你即将在一台你日常使用的机器上运行一个智能体——可能是个人笔记本电脑，也可能是雇主管理的工作站。什么样的安全态势才是稳妥的？

简短回答：默认配置已经完成了大部分工作。Hermes 开箱即安全，提供纵深防御模型，覆盖命令审批、文件写入安全和凭据处理。本页将介绍开箱即用的功能、在共享或工作机器上应收紧哪些开关，以及出错时如何撤销。此处涉及的每一项控制都在[安全](/user-guide/security)指南中有深入说明。

## 默认配置已经保护了什么

全新安装、零配置——以下保护措施即已生效：

**危险命令需要审批。** 在执行任何命令之前，Hermes 会将其与一份精心整理的 dangerous 模式列表进行比对——递归删除、写入 `/etc/`、磁盘操作、管道执行 shell 等等。默认的 `approvals.mode: smart` 使用一个辅助 LLM 来评估风险：低风险命令仅对该条命令自动批准，真正危险的命令自动拒绝，不确定的情况则升级为手动提示。

**审批提示采用故障关闭（fail closed）机制。** 如果你在规定超时时间（默认 300 秒）内未响应审批提示，该命令将被**拒绝**。离开工位绝不会导致任何操作被悄悄批准。

**硬性命中列表是始终生效的底线。** 有些命令——如 `rm -rf /`、fork 炸弹、清零物理磁盘——**无论**审批模式、`--yolo` 还是明确的“始终允许”如何设置，都会被拒绝。命中列表会在审批层看到该命令之前就触发，并且没有任何覆盖标志。

**对敏感路径的文件写入被阻止。** `write_file` 和 `patch` 工具无法接触操作系统凭据存储（`~/.ssh/`、`~/.aws/`、`~/.kube/`、`/etc/sudoers`、`~/.netrc`）、Hermes 凭据存储（`auth.json`、`.env`、配对数据），或磁盘上任何位置的项目密钥文件（`.env`、`.env.local`、`.envrc`）。被阻止的写入会立即返回错误——没有审批提示，也无法从聊天界面覆盖。

**输出中的密钥被脱敏。** `security.redact_secrets` 默认开启：工具输出中类似 API 密钥、令牌和密码的模式会在进入对话上下文和日志之前被脱敏。

**你的数据只去你指定的地方。** API 调用**仅**发往你配置的 LLM 服务商。Hermes Agent 不收集遥测、使用数据或分析信息。你的对话、记忆和技能都本地存储在 `~/.hermes/` 中。参见[常见问题](/reference/faq#is-my-data-sent-anywhere)。

:::info
表面之下还有更多——所有具备 URL 能力的工具均有 SSRF 保护，MCP 子进程的环境经过过滤，上下文文件经过提示注入扫描。[安全](/user-guide/security)页面记录了每一层防护。
:::

## 为共享或工作机器收紧配置

在存有雇主数据、生产凭据或他人文件的机器上，可在默认配置之上叠加以下措施。

### 将审批切换为手动

`smart` 模式会自动批准低风险命令。如果你希望亲自审查每一条被标记的命令：

```yaml
approvals:
  mode: manual
```

手动模式在执行被标记的命令之前始终会提示你。

### 添加你自己的拒绝规则

`approvals.deny` 是一个 glob 模式列表，无条件阻止匹配的终端命令——即使处于 `--yolo`、`/yolo` 或 `mode: off` 下也生效。它是内置硬性命中列表的用户可编辑对应物。用它来声明在这台机器上绝不能运行的内容：

```yaml
approvals:
  deny:
    - "git push --force*"
    - "*curl*|*sh*"
    - "dd if=* of=/dev/*"
```

模式是大小写不敏感的 [fnmatch](https://docs.python.org/3/library/fnmatch.html) glob，与整条命令文本匹配，且匹配会针对危险模式检测器所使用的同样归一化/去混淆变体运行，因此简单的引号技巧无法绕过规则。始终给模式加引号——裸的前导 `*` 会导致 YAML 解析错误。更改立即生效，无需重启。详情：[用户自定义拒绝规则](/user-guide/security#user-defined-deny-rules-approvalsdeny)。

### 沙箱文件写入

`HERMES_WRITE_SAFE_ROOT` 将 `write_file` 和 `patch` 限制在你列出的目录前缀内——前缀之外的内容被硬性阻止。在 Unix 上多个根目录用 `:` 分隔：

```bash
export HERMES_WRITE_SAFE_ROOT=/path/to/project:/home/you/.hermes
```

安全根目录内部的敏感路径仍会被阻止——将其指向 `$HOME` 并不会允许写入 `~/.ssh/id_rsa`。

:::caution
不要随意将其添加到 `~/.hermes/.env`。如果你只将其设置为项目目录，智能体将无法写入 `~/.hermes/cron/jobs.json`、配置档技能，或该前缀之外的其他 Hermes 状态。像上面那样将你的 Hermes 主目录作为第二个根目录包含进来。
:::

### 将命令执行移出主机

最强的隔离是完全不在你的机器上运行命令。终端工具支持多个[后端](/user-guide/features/tools#terminal-backends)：

| 后端 | 隔离 |
|---------|-----------|
| `local` | 无——在主机上运行（危险命令检查适用） |
| `docker` | 容器——容器本身就是安全边界 |
| `ssh` | 远程机器——将执行保持在独立服务器上 |

```yaml
terminal:
  backend: docker
  docker_image: "nikolaik/python-nodejs:python3.11-nodejs20"
  docker_forward_env: []  # 仅显式 allowlist；留空可将密钥挡在容器之外
```

每个 Docker 容器都以强化设置运行——丢弃所有 Linux 能力（仅保留一组最小化的加回项）、`no-new-privileges`、进程数限制以及大小受限的 tmpfs 挂载。使用容器后端时，容器内部的破坏性命令无法伤害主机，这就是为什么在该环境中危险命令检查会被跳过。

对于 `ssh`，在 `config.yaml` 中设置 `terminal.backend: ssh`，并通过 `~/.hermes/.env` 中的 `TERMINAL_SSH_HOST`、`TERMINAL_SSH_USER` 和 `TERMINAL_SSH_KEY` 提供主机详情。参见[网络隔离](/user-guide/security#network-isolation)。

### 如果开启了消息传递：allowlist 与配对

在这台机器上运行[网关](/user-guide/security#user-authorization-gateway)？默认设置已经是拒绝：如果未配置任何 allowlist 且未设置 `GATEWAY_ALLOW_ALL_USERS`，**所有用户都会被拒绝**。保持显式配置：

```bash
# ~/.hermes/.env
TELEGRAM_ALLOWED_USERS=123456789
GATEWAY_ALLOWED_USERS=123456789
```

或者使用 DM 配对而非硬编码 ID：未知用户会收到一次性配对码，你从 CLI 使用 `hermes pairing approve <platform> <code>` 批准他们。切勿在你关心的机器上设置 `GATEWAY_ALLOW_ALL_USERS=true`。

## 撤销层：检查点与 `/rollback`

审批门防止损害；[检查点](/user-guide/checkpoints-and-rollback)则撤销损害。启用后，Hermes 会在破坏性操作之前自动为你的项目创建快照——包括 `write_file`、`patch`，以及像 `rm`、`mv`、`sed -i` 和 `git reset` 这样的破坏性终端命令——存储到 `~/.hermes/checkpoints/store/` 下的影子 git 存储中。你真实的项目 `.git` 绝不会被触碰。

检查点是选择性加入的。可按会话启用：

```bash
hermes chat --checkpoints
```

或全局启用：

```yaml
checkpoints:
  enabled: true
```

然后，在会话中：

| 命令 | 描述 |
|---------|-------------|
| `/rollback` | 列出所有检查点及变更统计 |
| `/rollback diff <N>` | 预览自检查点 N 以来的变更 |
| `/rollback <N>` | 恢复到检查点 N（同时撤销最后一轮对话） |
| `/rollback <N> <file>` | 从检查点 N 恢复单个文件 |

:::tip
恢复前先用 `/rollback diff <N>` 预览，并将检查点与 git worktree 结合使用以获得最大安全性——每个 Hermes 会话放在自己的工作树中，检查点作为额外一层。
:::

## 这个威胁模型是什么——以及不是什么

要清楚地认识到这些控制能防御什么。正如[安全](/user-guide/security#user-defined-deny-rules-approvalsdeny)指南所言：

> 拒绝规则是针对诚实但会犯错的智能体的护栏，与危险模式检测器属于同一威胁模型。它们不是针对蓄意对抗进程的沙箱——如需后者，请使用隔离后端（Docker、Modal）或出口受限的环境。

文件写入防护同样如此：它们仅适用于 `write_file` 和 `patch`，而 `terminal` 工具以同一操作系统用户身份运行。拒绝列表减少意外损害，并给模型一个明确的停止信号；它不会沙箱化敌对或被攻陷的智能体。如果你的要求是遏制而非护栏，答案是隔离的终端后端——这才是为此设计的边界。

## 一个谨慎的起始配置

将上述所有内容汇总。在 `~/.hermes/config.yaml` 中按需调整：

```yaml
approvals:
  mode: manual                  # 亲自审查每一条被标记的命令
  timeout: 300                  # 未响应的提示被拒绝（故障关闭）
  deny:                         # 永不运行列表——即使 /yolo 也无法绕过
    - "git push --force*"
    - "*curl*|*sh*"
    - "dd if=* of=/dev/*"

security:
  redact_secrets: true          # 已是默认值；此处列出以示明确

checkpoints:
  enabled: true                 # 破坏性操作前创建快照

terminal:
  backend: docker               # 或 ssh——让执行保持在主机之外
  docker_forward_env: []        # 容器内不含主机密钥
```

如果你想要写入沙箱，在 `~/.hermes/.env` 中：

```bash
HERMES_WRITE_SAFE_ROOT=/path/to/project:/home/you/.hermes
```

## 另请参阅

- **[安全](/user-guide/security)** — 完整的纵深防御参考：每一种审批模式、容器强化标志、网关授权、MCP 凭据过滤
- **[检查点与回滚](/user-guide/checkpoints-and-rollback)** — 配置、存储维护和恢复工作流
- **[工具与工具集](/user-guide/features/tools)** — 所有终端后端及其配置
- **[配置](/user-guide/configuration)** — 完整的 `config.yaml` 参考
