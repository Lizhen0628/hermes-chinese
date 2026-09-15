---
title: "Grok — 将编码委托给 xAI Grok Build CLI（功能、PR）"
sidebar_label: "Grok"
description: "将编码委托给 xAI Grok Build CLI（功能、PR）"
---

{/* 此页面由 website/scripts/generate-skill-docs.py 根据技能的 SKILL.md 自动生成。请编辑源 SKILL.md，而非此页面。 */}

# Grok

将编码委托给 xAI Grok Build CLI（功能、PR）。

## 技能元数据

| | |
|---|---|
| 来源 | 可选 — 使用 `hermes skills install official/autonomous-ai-agents/grok` 安装 |
| 路径 | `optional-skills/autonomous-ai-agents\grok` |
| 版本 | `0.1.1` |
| 作者 | Matt Maximo (MattMaximo)、Hermes Agent |
| 许可证 | MIT |
| 平台 | linux、macos、windows |
| 标签 | `Coding-Agent`、`Grok`、`xAI`、`Code-Review`、`Refactoring`、`Automation` |
| 相关技能 | [`codex`](/docs/user-guide/skills/bundled/autonomous-ai-agents/autonomous-ai-agents-codex)、[`claude-code`](/docs/user-guide/skills/bundled/autonomous-ai-agents/autonomous-ai-agents-claude-code)、[`hermes-agent`](/docs/user-guide/skills/bundled/autonomous-ai-agents/autonomous-ai-agents-hermes-agent) |

## 参考：完整的 SKILL.md

:::info
以下是 Hermes 在触发此技能时加载的完整技能定义。这就是技能激活时智能体所看到的指令。
:::

# Grok Build CLI — Hermes 编排指南

通过 Hermes 终端将编码任务委托给 [Grok Build](https://docs.x.ai/build/overview)（xAI 的自主编码智能体 CLI，即 `grok` 命令）。Grok 可以读取文件、编写代码、运行 shell 命令、启动子智能体，并管理 git 工作流。它有三种运行方式：交互式 TUI、**无头模式**（`-p`），以及作为基于 JSON-RPC 的 **ACP 智能体**。

这是 `codex` 与 `claude-code` 的第三个同类技能。编排模式几乎完全一致——**一次性任务优先使用无头 `-p`**，交互式会话则使用 PTY。

## 何时使用

- 构建功能
- 重构
- PR 审查
- 批量修复问题
- 任何你原本会用 Codex / Claude Code、但想改用 Grok 的任务

## 前置条件

- **安装（推荐）：** `npm install -g @xai-official/grok`
  - 官方安装脚本 `curl -fsSL https://x.ai/cli/install.sh | bash` 也可用，但在某些环境中 `x.ai` 主机受 Cloudflare 限制。npm 途径完全避免了这一依赖。
- **认证 — SuperGrok / X Premium+ 订阅（主要途径）：**
  - 运行一次 `grok login` → 打开浏览器进行 OAuth → 令牌缓存到 `~/.grok/auth.json`。这使用的是你的 **SuperGrok 或 X Premium+** 订阅（无按令牌 API 计费）。
  - 通过查找 `~/.grok/auth.json` 检查登录状态，或运行一个简单低成本的无头冒烟测试：`grok --no-auto-update -p "Say ok."`
  - 在 TUI 中，`/logout` 注销，`/login`（或重新启动）重新登录。
- **无需 git 仓库** — 与 Codex 不同，Grok 在 git 目录之外也能正常运行（适合临时/一次性任务）。
- **零配置兼容 Claude Code / AGENTS.md** — Grok 自动读取 `CLAUDE.md`、`.claude/`（技能、智能体、MCP、钩子、规则）以及 `AGENTS.md` 系列文件。已有的项目上下文可直接使用。

> **API 密钥回退方案（非此用户默认方案）：** Grok 也支持设置 `XAI_API_KEY` 环境变量，通过 `api.x.ai` 进行按量付费计费。仅在 `grok login` / SuperGrok 认证不可用时使用此方式。订阅途径（`grok login`）才是此处的预期设置。

## 两种编排模式

### 模式 1：无头模式（`-p`）— 非交互式（首选）

运行一次性任务，打印结果，然后退出。无需 PTY，无交互式对话框需要处理。这是最简洁的集成方式——相当于 `claude -p` 和 `codex exec`。

```
terminal(command="grok --no-auto-update -p 'Add a dark mode toggle to settings'", workdir="/path/to/project", timeout=180)
```

在自动化中始终传递 `--no-auto-update`，以跳过后台更新检查。

**何时使用无头模式：**
- 一次性编码任务（修复 bug、添加功能、重构）
- CI/CD 自动化和脚本编写
- 使用 `--output-format json` 解析结构化输出
- 任何不需要多轮对话的任务

### 模式 2：交互式 PTY——多轮 TUI 会话

TUI 是一个全屏、支持鼠标交互的应用。用 `pty=true` 驱动它。为了实现稳健的
监控/输入，请使用 tmux（与 `claude-code` 技能相同的模式）。

```
# Launch in a tmux session for capture-pane monitoring
terminal(command="tmux new-session -d -s grok-work -x 140 -y 40")
terminal(command="tmux send-keys -t grok-work 'cd /path/to/project && grok' Enter")

# Wait for startup, then send a task
terminal(command="sleep 5 && tmux send-keys -t grok-work 'Refactor the auth module to use JWT' Enter")

# Monitor progress
terminal(command="sleep 15 && tmux capture-pane -t grok-work -p -S -50")

# Exit when done
terminal(command="tmux send-keys -t grok-work '/quit' Enter && sleep 1 && tmux kill-session -t grok-work")
```

**无头但内联输出的提示：** 如果你想要 TUI 风格的输出而不需要全屏 alt-screen
接管（例如为了更干净的日志），请加上 `--no-alt-screen`。
对于纯自动化，无头 `-p` 仍然比 TUI 更干净。

## 无头模式深入解析

### 常用标志

| 标志 | 作用 |
|------|--------|
| `-p, --single <PROMPT>` | 发送一条提示，以无头方式运行，然后退出 |
| `-m, --model <MODEL>` | 选择模型 |
| `-s, --session-id <UUID>` | 为一个新会话分配一个**新的**合法 UUID（必须尚不存在）。**不会**恢复会话——要恢复请使用 `--resume`/`--continue`。仅在与 `--fork-session` 配对时，才可与 `--resume`/`--continue` 一起使用 |
| `-r, --resume [<UUID>]` | 按其 UUID 恢复现有会话（若省略则恢复最近的会话） |
| `-c, --continue` | 继续当前目录中最近的会话 |
| `--fork-session` | 恢复时创建一个新的会话 ID，而不是复用原始 ID |
| `--max-turns <N>` | 限制智能体回合的最大数量 |
| `--cwd <PATH>` | 设置工作目录 |
| `--output-format <FMT>` | `plain`（默认）、`json` 或 `streaming-json` |
| `--always-approve` | 自动批准所有工具执行（相当于 `--full-auto` / `--yolo`） |
| `--no-alt-screen` | 内联运行，不进行全屏 TUI 接管 |
| `--no-auto-update` | 跳过后台更新检查（在所有自动化中使用；虽然不显示在 `--help` 中但仍然有效） |

### 输出格式

- `plain` —— 人类可读文本（默认）
- `json` —— 运行结束时输出一个 JSON 对象（可干净地解析结果）
- `streaming-json` —— 以换行分隔的 JSON 事件，随到随输出

```
# Structured result for parsing
terminal(command="grok --no-auto-update -p 'List all TODO comments in src/' --output-format json", workdir="/project", timeout=120)

# Auto-approve for autonomous building
terminal(command="grok --no-auto-update --always-approve -p 'Refactor the database layer and run the tests'", workdir="/project", timeout=300)
```

### 后台模式（长任务）

```
# Start headless in background
terminal(command="grok --no-auto-update --always-approve -p 'Refactor the auth module'", workdir="/project", background=true, notify_on_complete=true)
# Returns session_id

# Monitor
process(action="poll", session_id="<id>")
process(action="log", session_id="<id>")

# Kill if needed
process(action="kill", session_id="<id>")
```

对于交互式（TUI）后台会话，请使用 `pty=true` + tmux，并用
`tmux capture-pane` 进行监控，与 `claude-code` / `codex` 技能完全一致。

### 会话续接

会话以 **UUID** 为键，而不是以名称为键。`--session-id` 为一次新的运行分配一个*新的*
UUID（它**不会**恢复会话）；`--resume` 接收现有会话的
UUID（或省略该值以恢复最近的会话）。

```
# Start a session with a self-assigned UUID (must be a valid, unused UUID)
SID=$(uuidgen)
terminal(command="grok --no-auto-update -s $SID -p 'Start refactoring the database layer' --always-approve", workdir="/project", timeout=240)

# Resume that exact session later by its UUID
terminal(command="grok --no-auto-update -r $SID -p 'Now add connection pooling' --always-approve", workdir="/project", timeout=180)

# Or just continue the most recent session in this directory (no UUID needed)
terminal(command="grok --no-auto-update -c -p 'What did you change last time?'", workdir="/project", timeout=60)
```

## 只读审计 → Markdown 笔记模式

要让 Grok 审查本地工件并返回一份干净的 markdown 笔记（用于 Obsidian 或某个代码仓库），且不修改任何内容：

1. 先用 Hermes 工具（`read_file`、`write_file`）准备好稳定的输入文件。只把相关上下文快照到一个临时文件里，而不要直接灌入原始路径。
2. 以无头模式运行 Grok，**不要**加 `--always-approve`，这样它就无法自动写入，并要求 `markdown only, no preamble`。
3. 用 `write_file()` 把 Grok 的 stdout 直接保存到目标笔记中。

```
grok --no-auto-update -p "Read /tmp/current.md and /tmp/inventory.md. Produce markdown only, no preamble. Output a clean note titled 'Cleanup Review'." --output-format plain
```

**坑点（与 Claude Code 相同）：** 对于文档重写，宽松的 "rewrite this" 提示词可能会返回一份改动摘要，而不是完整的文件。应改为：把文件通过管道传入，并要求 `Return ONLY the full revised markdown document. No intro, no explanation, no code fences. Start immediately with '# Title'.`。在覆盖目标文件之前，先用 `read_file()` 核对开头几行。

## PR 审查模式

### 快速审查（无头）

```
terminal(command="cd /path/to/repo && git diff main...feature-branch | grok --no-auto-update -p 'Review this diff for bugs, security issues, and style problems. Be thorough.'", timeout=120)
```

### 克隆到临时目录审查（安全，不修改仓库）

```
terminal(command="REVIEW=$(mktemp -d) && git clone https://github.com/user/repo.git $REVIEW && cd $REVIEW && gh pr checkout 42 && grok --no-auto-update -p 'Review the changes vs origin/main. Check bugs, security, race conditions, missing tests.'", pty=true, timeout=300)
```

### 发布审查意见

```
terminal(command="gh pr comment 42 --body '<review text>'", workdir="/path/to/repo")
```

## 使用 worktree 并行修复 Issue

```
# Create worktrees
terminal(command="git worktree add -b fix/issue-78 /tmp/issue-78 main", workdir="~/project")
terminal(command="git worktree add -b fix/issue-99 /tmp/issue-99 main", workdir="~/project")

# Launch Grok headless in each (background)
terminal(command="grok --no-auto-update --always-approve -p 'Fix issue #78: <description>. Commit when done.'", workdir="/tmp/issue-78", background=true, notify_on_complete=true)
terminal(command="grok --no-auto-update --always-approve -p 'Fix issue #99: <description>. Commit when done.'", workdir="/tmp/issue-99", background=true, notify_on_complete=true)

# Monitor
process(action="list")

# After completion: push and open PRs
terminal(command="cd /tmp/issue-78 && git push -u origin fix/issue-78")
terminal(command="gh pr create --repo user/repo --head fix/issue-78 --title 'fix: ...' --body '...'")

# Cleanup
terminal(command="git worktree remove /tmp/issue-78", workdir="~/project")
```

## 常用子命令与 TUI 命令

| 命令 | 用途 |
|---------|---------|
| `grok` | 启动交互式 TUI |
| `grok -p "query"` | 无头单次执行 |
| `grok login` / `grok logout` | 登录 / 登出（SuperGrok / X Premium+ OAuth） |
| `grok inspect` | 显示 Grok 在当前工作目录中发现的内容：配置来源、指令、技能、插件、钩子、MCP 服务器 |
| `grok agent stdio` | 作为 ACP 智能体基于 JSON-RPC 运行（用于 IDE/工具集成） |
| `grok update` | 更新 CLI（需要 `x.ai` 主机；自动化中应跳过） |

TUI 斜杠命令（仅交互式）：`/model <name>`、`/always-approve`、`/plan`、`/context`、`/compact`、`/resume`、`/sessions`、`/fork`、`/usage`、`/quit`。`Shift+Tab` 可循环切换会话模式（包括 Plan 模式，它会阻断写入工具，但会话计划文件除外）。

## 配置（`~/.grok/config.toml`）

```toml
[cli]
auto_update = false          # skip background update checks persistently

[ui]
permission_mode = "ask"      # or "always-approve" to skip tool prompts by default

[models]
default = "grok-build-0.1"
```

把全局偏好放在 `~/.grok/config.toml` 中（而非项目范围的 `.grok/config.toml`）。`permission_mode` 取代了旧版的 `approval_mode` / `yolo = true` 键。

## 坑点与注意事项

1. **认证受订阅门槛限制。** `grok login` 需要 SuperGrok 或 X Premium+ 订阅。如果登录失败，或不存在 `~/.grok/auth.json`，在回退到 `XAI_API_KEY` 之前，先确认该订阅是否处于有效状态。
2. **不要混淆 Hermes 的 xAI 认证与 `grok` CLI 的认证。** Hermes 的 `x_search` 使用它自己的 xAI OAuth；独立的 `grok` CLI 在 `~/.grok/auth.json` 中有一份单独令牌。`x_search` 能用并**不**意味着 `grok` 已登录。
3. **在自动化中永远传入 `--no-auto-update`** —— 否则 Grok 会联网进行更新检查（而 `x.ai`/`storage.googleapis.com` 可能无法访问）。
4. **优先用 npm 安装而非 curl 安装脚本** —— `npm install -g @xai-official/grok` 可避开受 Cloudflare 拦截的 `x.ai` 主机。
5. **`--always-approve` 是自主构建的开关。** 没有它，无头运行可能会卡在工具批准提示上等待。对于只读审查/审计工作，应有意省略它，使 Grok 无法修改文件。
6. **无头 `-p` 会跳过 TUI 弹窗**；TUI 需要 `pty=true`（外加 tmux 用于监控），就像 Claude Code 一样。
7. **使用 `--no-alt-screen`** —— 如果你以内联方式运行 TUI，全屏 alt-screen 接管会使捕获的输出变得混乱。
8. **不需要 git 仓库**，但对于 PR/提交工作流，你仍然需要它 —— 用 `mktemp -d && git init` 来做临时提交任务。
9. **完成后清理 tmux 会话**，使用 `tmux kill-session -t <name>`。

## 面向 Hermes 智能体的规则

1. **对单一任务优先使用无头 `-p`** —— 集成最干净，可通过 `--output-format json` 获得结构化输出。
2. **始终设置 `workdir`**（或 `--cwd`），使 Grok 定位到正确的项目。
3. **在每次自动化调用中都传入 `--no-auto-update`**。
4. **仅当 Grok 应当自主写入时才使用 `--always-approve`**；对于只读审查与审计应省略它。
5. **长任务放到后台**，用 `background=true, notify_on_complete=true`，并通过 `process` 工具监控。
6. **多轮交互式工作使用 tmux**，并用 `tmux capture-pane -t <session> -p -S -50` 监控。
7. **在依赖认证之前先验证它** —— 检查 `~/.grok/auth.json` 或运行一次廉价的 `grok -p "Say ok."` 冒烟测试；不要假定 Hermes 的 xAI 认证会沿用到它。
8. **向用户报告结果** —— 总结 Grok 改动了什么，以及还剩下什么。
