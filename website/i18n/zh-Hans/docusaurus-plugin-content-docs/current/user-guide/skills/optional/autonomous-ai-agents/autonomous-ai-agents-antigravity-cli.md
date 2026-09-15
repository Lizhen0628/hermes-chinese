---
title: "Antigravity Cli — 操作 Antigravity CLI（agy）：插件、认证、沙箱"
sidebar_label: "Antigravity Cli"
description: "操作 Antigravity CLI（agy）：插件、认证、沙箱"
---

{/* 本页由 website/scripts/generate-skill-docs.py 从该技能的 SKILL.md 自动生成。请编辑源 SKILL.md，而不是此页面。 */}

# Antigravity Cli

操作 Antigravity CLI（agy）：插件、认证、沙箱。

## 技能元数据

| | |
|---|---|
| Source | 可选 — 使用 `hermes skills install official/autonomous-ai-agents/antigravity-cli` 安装 |
| Path | `optional-skills/autonomous-ai-agents\antigravity-cli` |
| Version | `0.2.0` |
| Author | Tony Simons (asimons81), Hermes Agent |
| License | MIT |
| Platforms | linux, macos, windows |
| Tags | `Coding-Agent`, `Antigravity`, `CLI`, `Auth`, `Plugins`, `Sandbox` |
| Related skills | [`grok`](/docs/user-guide/skills/optional/autonomous-ai-agents/autonomous-ai-agents-grok), [`codex`](/docs/user-guide/skills/bundled/autonomous-ai-agents/autonomous-ai-agents-codex), [`claude-code`](/docs/user-guide/skills/bundled/autonomous-ai-agents/autonomous-ai-agents-claude-code), [`hermes-agent`](/docs/user-guide/skills/bundled/autonomous-ai-agents/autonomous-ai-agents-hermes-agent) |

## 参考：完整 SKILL.md

:::info
以下是该技能被触发时 Hermes 加载的完整技能定义。当该技能处于活动状态时，这就是智能体看到的指令内容。
:::

# Antigravity CLI (`agy`)

Antigravity CLI 的操作员指南，通过 `agy` 调用。通过 Hermes 的 `terminal` 工具运行所有 `agy` 命令；使用 `read_file` 检查其配置与日志。本技能是参考 + 流程——它不包装网络 API，因此 Hermes 本身无需认证任何内容。

## 何时使用

- 安装、更新或冒烟测试 `agy` 二进制文件
- 驱动非交互式的 `agy --print` / `agy -p` 单次运行
- 调试 Antigravity 的认证、沙箱、权限或插件状态
- 读取 Antigravity 的设置、快捷键绑定、会话或日志

## 心智模型

Antigravity 分为两层——请保持区分，否则给出的指导会是错的：

1. **Shell 包装命令** — `agy help`、`agy install`、`agy plugin`、`agy update`、`agy changelog`。通过 `terminal` 工具运行这些命令。
2. **交互式会话内斜杠命令** — `/config`、`/permissions`、`/skills`、`/agents` 等。这些仅存在于正在运行的 `agy` TUI 会话内，不在 shell 包装命令中。

`agy help` 展示的是 shell 包装命令的界面，而不是会话内斜杠命令。

## 前置条件

- `agy` 二进制文件在 PATH 中。通过 `terminal` 工具验证：`command -v agy && agy --version`。
- 本技能不需要任何环境变量或 API 密钥——Antigravity 通过操作系统密钥环 / 浏览器登录自行管理认证（见下方的认证）。

## 如何运行

通过 `terminal` 工具调用每一条 `agy` 命令。例如：

```
terminal(command="agy --version")
terminal(command="agy help")
terminal(command="agy plugin list")
terminal(command="agy --print 'Summarize the repo in 3 bullets'", workdir="/path/to/project")
```

对于交互式的多轮 TUI 会话，使用 `pty=true` 启动 `agy`（并用 tmux 进行捕获/监控），这与 `codex` / `claude-code` 技能使用的模式相同。对于单次冒烟测试和脚本化提示，优先使用 `agy --print`（非交互式）。

要检查 Antigravity 自己的文件，对下方“核心路径”中的路径使用 `read_file`——不要通过终端用 `cat` 查看这些文件。

## 委托模式

`agy` 是与 `codex` / `claude-code` 同一家族的编码智能体后端，因此相同的委托形式都适用。当你把真实工作（功能、修复、审查、第二意见）交给 Antigravity 而不仅仅是冒烟测试时，请使用这些模式。

### 单次运行（脚本化提示和第二意见的首选）

```
terminal(command="agy -p 'Review this diff for bugs and security issues' --model 'Gemini 3.1 Pro (High)'", workdir="/path/to/repo", timeout=300)
```

`-p` 是非交互式的：它运行提示后退出。用 `--model` 选择引擎（运行 `agy models` 获取确切的显示字符串，例如 `'Gemini 3.1 Pro (High)'`、`'Claude Opus 4.6 (Thinking)'`）。用可重复的 `--add-dir` 添加额外的上下文根。

### 长时间 / 有界运行（测试、构建、多文件更改）

将其放到后台，并在完成时获得通知，与 `codex` 技能相同：

```
terminal(command="agy -p 'Implement the change described in TASK.md and run the tests' --dangerously-skip-permissions", workdir="/path/to/repo", background=true, notify_on_complete=true)
# then: process(action="poll"/"log"/"wait", session_id=<id>)
```

### 交互式多轮（PTY + tmux）

对于对话式会话，在 `pty=true` 下启动 `agy -i`（或直接 `agy`），并使用 tmux 进行 `capture-pane` / `send-keys`，正是 `codex` / `claude-code` 技能中记录的相同模式。稍后可用 `--continue` / `-c` 或特定的 `--conversation <id>` 恢复。

### 并行实例（批量子问题 / worktree 扇出）

为每个任务创建一个 git worktree，并在其中各自启动一个独立的 `agy -p`（后台运行），然后收集结果——与 `codex` 技能用于批量问题修复的相同 worktree 扇出方式。将并发限制在机器和你的审查能力可承受的范围内。

### 输出 + 有界性注意事项（与 Claude Code 不同）

- `agy -p` 返回**纯文本**——**没有 `--output-format json`**，也没有带 `session_id` / 成本 / 轮次的结果封装。直接解析 stdout；不要期望 JSON 对象。
- **没有 `--max-turns`**。一次 print 运行由 **`--print-timeout`** 限制（默认 `5m`）。对于长任务请调高它：`--print-timeout 20m`。同时配合 `terminal` 的 `timeout=`，以免外层调用提前中断运行。

### 编排边界

Antigravity 是**工作方执行后端或第三意见审查者**——是由运行任务的智能体/配置档拥有的一项执行细节，而**不是**一等编排原语。不要将 `agy` 作为一张单独的卡片放到看板上，也不要将其视为协调层；让工作通过正常任务图流转，并由被分配的工作方选择 `agy`（相对于 codex/claude-code/直接工具）作为其方法。仅在用户明确要求、工作方被配置为包装它，或你想要对另一个智能体的方案或 diff 进行 Gemini 家族交叉验证时，才显式地动用它。

## 核心路径

- 二进制 / 入口点：`agy`
- 应用数据目录：`~/.gemini/antigravity-cli/`
- 设置文件：`~/.gemini/antigravity-cli/settings.json`
- 快捷键绑定文件：`~/.gemini/antigravity-cli/keybindings.json`
- 日志：`~/.gemini/antigravity-cli/log/cli-*.log`
- 会话：`~/.gemini/antigravity-cli/conversations/`
- Brain 产物：`~/.gemini/antigravity-cli/brain/`
- 历史：`~/.gemini/antigravity-cli/history.jsonl`
- 插件暂存区：`~/.gemini/antigravity-cli/plugins/<plugin_name>/`

## 快速参考

### 包装命令
- `agy changelog`
- `agy help`
- `agy install`
- `agy plugin` / `agy plugins`
- `agy update`

### 实用标志
- `--add-dir`
- `--continue` / `-c`
- `--conversation`
- `--dangerously-skip-permissions`
- `--print` / `-p`
- `--print-timeout`
- `--prompt`
- `--prompt-interactive` / `-i`
- `--sandbox`
- `--log-file`
- `--version`

### 插件子命令（`agy plugin --help`）
- `list`、`import [source]`、`install <target>`、`uninstall <name>`、
  `enable <name>`、`disable <name>`、`validate [path]`、`link <mp> <target>`、
  `help`

### 安装标志（`agy install --help`）
- `--dir`、`--skip-aliases`、`--skip-path`

### 会话内斜杠命令
- **会话控制：** `/resume` (`/switch`)、`/rewind` (`/undo`)、
  `/rename <name>`、`/clear`、`/fork`、`/reset`、`/new`
- **设置与工具：** `/config`、`/settings`、`/permissions`、`/model`、
  `/keybindings`、`/statusline`、`/tasks`、`/skills`、`/mcp`、`/open <path>`、
  `/usage`、`/logout`、`/agents`
- **提示辅助：** `@` 路径自动补全，`esc esc` 清除提示（在流式传输时不可用），`!` 直接运行终端命令，`?` 打开帮助

## 设置与权限

### 常见设置键（`settings.json`）
- `allowNonWorkspaceAccess`
- `colorScheme`
- `permissions.allow`
- `trustedWorkspaces`

### 权限模式
`request-review`、`always-proceed`、`strict`、`proceed-in-sandbox`。

### 沙箱行为
- `enableTerminalSandbox` 是 `settings.json` 中的布尔值；默认 `false`。
- 启动时覆盖项（`--sandbox`、`--dangerously-skip-permissions`）可以取代当前会话的持久设置。

## 认证行为

- CLI 首先尝试操作系统安全密钥环。
- 没有已保存的会话时，回退到基于浏览器的 Google 登录。
- 本地会打开默认浏览器；通过 SSH 时会打印一个授权 URL，并期望你粘贴回认证码。
- `/logout` 移除已保存的凭据。

## 插件

- 插件暂存于 `~/.gemini/antigravity-cli/plugins/<plugin_name>/`。
- 它们可以捆绑技能、智能体、规则、MCP 服务器和钩子。
- `agy plugin list` 没有返回任何已导入插件是一个合法的空状态。

## 陷阱

- `agy help` 展示包装命令，而不是交互式斜杠命令。
- `agy --version` 是安全的非交互式版本检查；`agy version` 是交互式的，在没有真实 TTY 时会失败。
- 排查故障的首选位置：`~/.gemini/antigravity-cli/log/cli-*.log`（用 `read_file` 读取）。
- 不要混淆持久 JSON 设置与启动时覆盖项。
- `~/.gemini/antigravity-cli/bin/agentapi` 是指向 `agy agentapi` 的薄包装。
- 在 WSL 上，令牌存储是基于文件的，因此认证问题通常是本地文件 / 会话状态问题，而非仅浏览器的问题。
- 工作区标识可能取决于启动目录和 `.antigravitycli` 项目标记。
- `agy -p` 仅打印纯文本——没有 `--output-format json`，没有结果封装。不要试图从中解析 JSON 对象（与 `claude-code` 不同）。
- 用 `--print-timeout`（默认 `5m`）来限制 print 运行，而不是 `--max-turns`（`agy` 上不存在该标志）。

## 验证

确认安装是真实且可用的，全部通过 `terminal` 工具进行（用 `read_file` 读取文件）：

1. `terminal(command="command -v agy")`
2. `terminal(command="agy --version")`
3. `terminal(command="agy help")`
4. `terminal(command="agy plugin list")`
5. 对 `~/.gemini/antigravity-cli/settings.json` 使用 `read_file`
6. 对最新的 `~/.gemini/antigravity-cli/log/cli-*.log` 使用 `read_file`
7. 如需要，对 `~/.gemini/antigravity-cli/keybindings.json` 使用 `read_file`

## 支持文件

- `references/cli-docs.md` — 来自入门、使用和功能文档的精简笔记。
