---
title: "Grok — 将编码委派给 xAI Grok Build CLI（功能、PR）"
sidebar_label: "Grok"
description: "将编码委派给 xAI Grok Build CLI（功能、PR）"
---

{/* 本页面由 website/scripts/generate-skill-docs.py 根据技能的 SKILL.md 自动生成。请编辑源 SKILL.md，而非此页面。 */}

# Grok

将编码委派给 xAI Grok Build CLI（功能、PR）。

## 技能元数据

| | |
|---|---|
| 来源 | 可选 — 使用 `hermes skills install official/autonomous-ai-agents/grok` 安装 |
| 路径 | `optional-skills/autonomous-ai-agents\grok` |
| 版本 | `0.1.1` |
| 作者 | Matt Maximo (MattMaximo), Hermes Agent |
| 许可证 | MIT |
| 平台 | linux、macos、windows |
| 标签 | `Coding-Agent`、`Grok`、`xAI`、`Code-Review`、`Refactoring`、`Automation` |
| 相关技能 | [`codex`](/docs/user-guide/skills/bundled/autonomous-ai-agents/autonomous-ai-agents-codex)、[`claude-code`](/docs/user-guide/skills/bundled/autonomous-ai-agents/autonomous-ai-agents-claude-code)、[`hermes-agent`](/docs/user-guide/skills/bundled/autonomous-ai-agents/autonomous-ai-agents-hermes-agent) |

## 参考：完整的 SKILL.md

:::info
以下是 Hermes 在此技能被触发时加载的完整技能定义。这就是技能激活时智能体所看到的指令。
:::

# Grok Build CLI — Hermes 编排指南

通过 Hermes 终端将编码任务委派给 [Grok Build](https://docs.x.ai/build/overview)（xAI 的自主编码智能体 CLI，即 `grok` 命令）。Grok 可以读取文件、编写代码、运行 shell 命令、孵化子智能体，并管理 git 工作流。它以三种方式运行：交互式 TUI、**无头模式**（`-p`），以及作为基于 JSON-RPC 的 **ACP 智能体**。

这是 `codex` 和 `claude-code` 的第三个同胞。编排模式几乎完全相同 —— **一次性任务优先使用无头 `-p` 模式**，交互式会话则使用 PTY。

## 使用场景

- 构建功能
- 重构
- PR 审查
- 批量问题修复
- 任何你本会求助 Codex / Claude Code 但更想用 Grok 的任务

## 前提条件

- **安装（首选）：** `npm install -g @xai-official/grok`
  - 官方安装器 `curl -fsSL https://x.ai/cli/install.sh | bash` 也可用，但在某些环境中 `x.ai` 主机会被 Cloudflare 拦截。npm 方式完全避开了这一依赖。
- **认证 —— SuperGrok / X Premium+ 订阅（主要方式）：**
  - 运行一次 `grok login` → 会打开浏览器进行 OAuth → token 缓存于 `~/.grok/auth.json`。这会使用你的 **SuperGrok 或 X Premium+** 订阅（不按 token 进行 API 计费）。
  - 通过查看是否存在 `~/.grok/auth.json` 来检查登录状态，或运行一次低成本的无头冒烟测试：`grok --no-auto-update -p "Say ok."`
  - 在 TUI 中，`/logout` 可登出，`/login`（或重新启动）可重新登录。
- **不需要 git 仓库** —— 与 Codex 不同，Grok 在 git 目录之外也能正常运行（适合临时/一次性任务）。
- **零配置兼容 Claude Code / AGENTS.md** —— Grok 会自动读取 `CLAUDE.md`、`.claude/`（skills、agents、MCPs、hooks、rules）以及 `AGENTS.md` 系列。现有项目上下文开箱即用。

> **API 密钥回退方案（非此用户的默认方案）：** Grok 也支持设置 `XAI_API_KEY` 环境变量，以便通过 `api.x.ai` 进行按用量付费计费。仅在 `grok login` / SuperGrok 认证不可用时才使用此方案。订阅方式（`grok login`）才是此处预期的设置。

## 两种编排模式

### 模式 1：无头模式（`-p`）— 非交互式（首选）

运行一次性任务，打印结果并退出。无需 PTY，无需应对交互式对话框。这是最干净的集成路径 —— 相当于 `claude -p` 和 `codex exec`。

```
terminal(command="grok --no-auto-update -p 'Add a dark mode toggle to settings'", workdir="/path/to/project", timeout=180)
```

在自动化中始终传递 `--no-auto-update`，以跳过后台更新检查。

**无头模式的使用场景：**
- 一次性编码任务（修复 bug、添加功能、重构）
- CI/CD 自动化与脚本编写
- 使用 `--output-format json` 进行结构化输出解析
- 任何不需要多轮对话的任务

### 模式 2：交互式 PTY — 多轮 TUI 会话

TUI 是一个全屏、支持鼠标交互的应用。使用 `pty=true` 来驱动它。为了稳健的监控/输入，请使用 tmux（与 `claude-code` 技能相同的模式）。

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

**关于无头但内联输出的提示：** 如果你想要 TUI 风格的输出，但又不希望全屏 alt-screen 接管（例如为了更干净的日志），请添加 `--no-alt-screen`。对于纯自动化场景，无头的 `-p` 仍然比 TUI 更干净。

## 无头模式深入解析

### 常用标志

| 标志 | 效果 |
|------|--------|
| `-p, --single <PROMPT>` | 发送一个提示，以无头方式运行，然后退出 |
| `-m, --model <MODEL>` | 选择模型 |
| `-s, --session-id <UUID>` | 为一个新对话分配一个**新的**有效 UUID（该 UUID 必须尚不存在）。这**不会**恢复会话——如需恢复请使用 `--resume`/`--continue`。仅在与 `--fork-session` 配对时，配合 `--resume`/`--continue` 才有效 |
| `-r, --resume [<UUID>]` | 通过 UUID 恢复现有会话（如果省略则恢复最近的会话） |
| `-c, --continue` | 继续当前目录中最近的会话 |
| `--fork-session` | 恢复时，创建新的会话 ID 而不是复用原有的 |
| `--max-turns <N>` | 限制智能体轮次的最大数量 |
| `--cwd <PATH>` | 设置工作目录 |
| `--output-format <FMT>` | `plain`（默认）、`json` 或 `streaming-json` |
| `--always-approve` | 自动批准所有工具执行（相当于 `--full-auto` / `--yolo`） |
| `--no-alt-screen` | 以内联方式运行，不进行全屏 TUI 接管 |
| `--no-auto-update` | 跳过后台更新检查（用于所有自动化场景；在 `--help` 中隐藏但仍有效） |

### 输出格式

- `plain` —— 人类可读的文本（默认）
- `json` —— 在运行结束时输出一个 JSON 对象（便于干净地解析结果）
- `streaming-json` —— 以换行分隔的 JSON 事件，随到达实时输出

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

对于交互式（TUI）后台会话，请使用 `pty=true` + tmux，并通过 `tmux capture-pane` 进行监控，方式与 `claude-code` / `codex` 技能完全一致。

### 会话延续

会话以 **UUID** 为键，而不是以名称。`--session-id` 为一个全新的运行分配一个*新* UUID（它**不会**恢复会话）；`--resume` 接受现有会话的 UUID（或省略该值以恢复最近的会话）。

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

要让 Grok 审查本地产物并返回一份干净的 markdown 笔记（可用于 Obsidian 或仓库）而不修改任何内容：

1. 先用 Hermes 工具（`read_file`、`write_file`）准备好稳定的输入文件。只把相关上下文快照到临时文件中，而不要直接倒入原始路径。
2. 以 headless 模式运行 Grok，**不要**加 `--always-approve`，这样它就无法自动写入，并且要求 `markdown only, no preamble`。
3. 用 `write_file()` 将 Grok 的 stdout 直接保存到目标笔记中。

```
grok --no-auto-update -p "Read /tmp/current.md and /tmp/inventory.md. Produce markdown only, no preamble. Output a clean note titled 'Cleanup Review'." --output-format plain
```

**陷阱（与 Claude Code 相同）：** 对于文档重写，一个宽松的“rewrite this”提示词可能会返回变更摘要而非完整文件。正确做法是：把文件通过管道传入，并要求 `Return ONLY the full revised markdown document. No intro, no explanation, no code fences. Start immediately with '# Title'.`。在覆盖目标文件之前，用 `read_file()` 验证开头的几行。

## PR 审查模式

### 快速审查（Headless）

```
terminal(command="cd /path/to/repo && git diff main...feature-branch | grok --no-auto-update -p 'Review this diff for bugs, security issues, and style problems. Be thorough.'", timeout=120)
```

### 克隆到临时目录审查（安全，不修改仓库）

```
terminal(command="REVIEW=$(mktemp -d) && git clone https://github.com/user/repo.git $REVIEW && cd $REVIEW && gh pr checkout 42 && grok --no-auto-update -p 'Review the changes vs origin/main. Check bugs, security, race conditions, missing tests.'", pty=true, timeout=300)
```

### 发布审查结果

```
terminal(command="gh pr comment 42 --body '<review text>'", workdir="/path/to/repo")
```

## 使用 Worktree 并行修复 Issue

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

## 有用的子命令与 TUI 命令

| 命令 | 用途 |
|---------|---------|
| `grok` | 启动交互式 TUI |
| `grok -p "query"` | Headless 单次执行 |
| `grok login` / `grok logout` | 登录 / 登出（SuperGrok / X Premium+ OAuth） |
| `grok inspect` | 显示 Grok 在当前工作目录中发现的内容：配置来源、指令、技能、插件、hooks、MCP 服务器 |
| `grok agent stdio` | 以 ACP 智能体形式通过 JSON-RPC 运行（供 IDE/工具集成） |
| `grok update` | 更新 CLI（需要 `x.ai` 主机；在自动化中跳过） |

TUI 斜杠命令（仅交互式）：`/model <name>`、`/always-approve`、`/plan`、`/context`、`/compact`、`/resume`、`/sessions`、`/fork`、`/usage`、`/quit`。`Shift+Tab` 循环切换会话模式（包括 Plan 模式，它会阻止除会话计划文件以外的写入工具）。

## 配置（`~/.grok/config.toml`）

```toml
[cli]
auto_update = false          # skip background update checks persistently

[ui]
permission_mode = "ask"      # or "always-approve" to skip tool prompts by default

[models]
default = "grok-build-0.1"
```

把全局偏好放在 `~/.grok/config.toml`（而不是项目级的 `.grok/config.toml`）中。`permission_mode` 取代了旧的 `approval_mode` / `yolo = true` 键。

## 陷阱与注意事项

1. **认证受订阅限制。** `grok login` 需要 SuperGrok 或 X Premium+ 订阅。如果登录失败或没有 `~/.grok/auth.json`，在回退到 `XAI_API_KEY` 之前先确认订阅处于有效状态。
2. **不要混淆 Hermes 的 xAI 认证与 `grok` CLI 的认证。** Hermes 的 `x_search` 使用它自己的 xAI OAuth；独立的 `grok` CLI 在 `~/.grok/auth.json` 中有一个单独的令牌。`x_search` 可用并**不**意味着 `grok` 已登录。
3. **在自动化中始终传入 `--no-auto-update`** —— 否则 Grok 会联网进行更新检查（而 `x.ai`/`storage.googleapis.com` 可能无法访问）。
4. **优先使用 npm 安装而非 curl 安装脚本** —— `npm install -g @xai-official/grok` 可避开受 Cloudflare 拦截的 `x.ai` 主机。
5. **`--always-approve` 是自主构建的开关。** 没有它，headless 运行可能会卡在工具审批提示上。对于只读审查/审计工作，要有意省略它，这样 Grok 就无法修改文件。
6. **Headless `-p` 会跳过 TUI 对话框**；TUI 需要 `pty=true`（再加 tmux 用于监控），与 Claude Code 相同。
7. **如果以内联方式运行 TUI** 并且全屏 alt-screen 接管导致捕获的输出乱码，请使用 `--no-alt-screen`。
8. **不需要 git 仓库**，但对于 PR/提交工作流你仍然需要一个 —— 用 `mktemp -d && git init` 处理临时的提交任务。
9. **完事后清理 tmux 会话**，用 `tmux kill-session -t <name>`。

## 针对 Hermes 智能体的规则

1. **单一任务优先使用 headless `-p`** —— 集成最干净，通过 `--output-format json` 获得结构化输出。
2. **始终设置 `workdir`**（或 `--cwd`），让 Grok 定位到正确的项目。
3. **在每次自动化调用中传入 `--no-auto-update`**。
4. **仅在 Grok 需要自主写入时才使用 `--always-approve`**；对于只读审查和审计则省略它。
5. **用 `background=true, notify_on_complete=true` 后台运行长任务**，并通过 `process` 工具监控。
6. **多轮交互式工作使用 tmux**，并用 `tmux capture-pane -t <session> -p -S -50` 监控。
7. **在依赖认证之前先验证它** —— 检查 `~/.grok/auth.json` 或运行一次低成本的 `grok -p "Say ok."` 冒烟测试；不要假设 Hermes 的 xAI 认证会自动沿用。
8. **把结果报告给用户** —— 总结 Grok 改了什么以及还剩什么。
