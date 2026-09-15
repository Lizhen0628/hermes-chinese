---
title: "Antigravity Cli — 操作 Antigravity CLI (agy)：插件、认证、沙箱"
sidebar_label: "Antigravity Cli"
description: "操作 Antigravity CLI (agy)：插件、认证、沙箱"
---

{/* 此页面由 website/scripts/generate-skill-docs.py 从该技能的 SKILL.md 自动生成。请编辑源 SKILL.md，而不是此页面。 */}

# Antigravity Cli

操作 Antigravity CLI (agy)：插件、认证、沙箱。

## 技能元数据

| | |
|---|---|
| Source | 可选 — 使用 `hermes skills install official/autonomous-ai-agents/antigravity-cli` 安装 |
| Path | `optional-skills/autonomous-ai-agents\antigravity-cli` |
| Version | `0.2.0` |
| Author | Tony Simons (asimons81), Hermes Agent |
| License | MIT |
| Platforms | linux, macos, windows |
| Tags | `Coding-Agent`、`Antigravity`、`CLI`、`Auth`、`Plugins`、`Sandbox` |
| Related skills | [`grok`](/docs/user-guide/skills/optional/autonomous-ai-agents/autonomous-ai-agents-grok)、[`codex`](/docs/user-guide/skills/bundled/autonomous-ai-agents/autonomous-ai-agents-codex)、[`claude-code`](/docs/user-guide/skills/bundled/autonomous-ai-agents/autonomous-ai-agents-claude-code)、[`hermes-agent`](/docs/user-guide/skills/bundled/autonomous-ai-agents/autonomous-ai-agents-hermes-agent) |

## 参考：完整 SKILL.md

:::info
以下是 Hermes 在此技能被触发时加载的完整技能定义。这就是技能激活时智能体看到的指令内容。
:::

# Antigravity CLI（`agy`）

Antigravity CLI 的操作指南，通过 `agy` 调用。所有 `agy` 命令都通过
Hermes 的 `terminal` 工具运行；使用 `read_file` 检查其配置和日志。此技能
是参考 + 操作流程 — 它不封装网络 API，因此 Hermes 本身无需认证任何东西。

## 何时使用

- 安装、更新或冒烟测试 `agy` 二进制文件
- 驱动非交互式 `agy --print` / `agy -p` 单次运行
- 调试 Antigravity 认证、沙箱、权限或插件状态
- 读取 Antigravity 设置、快捷键绑定、对话或日志

## 心智模型

Antigravity 有两层 — 要保持区分，否则指导会出错：

1. **Shell 包装命令** — `agy help`、`agy install`、`agy plugin`、
   `agy update`、`agy changelog`。通过 `terminal` 工具运行这些命令。
2. **交互式会话内斜杠命令** — `/config`、`/permissions`、
   `/skills`、`/agents` 等。它们只存在于运行中的 `agy` TUI
   会话内，而非 shell 包装器上。

`agy help` 显示的是 shell 包装器的功能面，而不是会话内的斜杠命令。

## 前提条件

- PATH 上有 `agy` 二进制文件。通过 `terminal` 工具验证：
  `command -v agy && agy --version`。
- 此技能不需要任何环境变量或 API 密钥 — Antigravity 通过操作系统钥匙串 /
  浏览器登录管理自己的认证（见下方认证部分）。

## 如何运行

通过 `terminal` 工具调用每一条 `agy` 命令。示例：

```
terminal(command="agy --version")
terminal(command="agy help")
terminal(command="agy plugin list")
terminal(command="agy --print 'Summarize the repo in 3 bullets'", workdir="/path/to/project")
```

对于交互式多轮 TUI 会话，使用 `pty=true` 启动 `agy`（并用
tmux 进行捕获/监控），这与 `codex` / `claude-code`
技能使用的模式相同。对于单次冒烟测试和脚本化提示词，优先使用
`agy --print`（非交互式）。

要检查 Antigravity 自己的文件，请对下方核心路径中的路径使用 `read_file`
— 不要通过终端 `cat` 它们。

## 委派模式

`agy` 是与 `codex` / `claude-code` 同一家族的编码智能体后端，
因此同样的委派形态适用。在把实际工作（功能、修复、审查、二次意见）
交给 Antigravity 而非仅做冒烟测试时，使用这些模式。

### 单次运行（脚本化提示词和二次意见的首选）

```
terminal(command="agy -p 'Review this diff for bugs and security issues' --model 'Gemini 3.1 Pro (High)'", workdir="/path/to/repo", timeout=300)
```

`-p` 是非交互式的：它运行提示词然后退出。通过
`--model` 选择引擎（运行 `agy models` 获取确切的显示字符串，例如
`'Gemini 3.1 Pro (High)'`、`'Claude Opus 4.6 (Thinking)'`）。使用可重复的
`--add-dir` 添加额外的上下文根目录。

### 长时 / 有界运行（测试、构建、多文件更改）

将其后台运行并在完成时获得通知，与 `codex` 技能一样：

```
terminal(command="agy -p 'Implement the change described in TASK.md and run the tests' --dangerously-skip-permissions", workdir="/path/to/repo", background=true, notify_on_complete=true)
# 然后：process(action="poll"/"log"/"wait", session_id=<id>)
```

### 交互式多轮（PTY + tmux）

对于对话式会话，在 `pty=true` 下启动 `agy -i`（或裸 `agy`），
并用 tmux 进行 `capture-pane` / `send-keys`，正是 `codex` / `claude-code`
技能中记载的模式。之后用 `--continue` / `-c` 或特定的 `--conversation <id>` 恢复。

### 并行实例（批量子问题 / 工作树扇出）

为每个任务创建一个 git 工作树，并在每个工作树中启动独立的 `agy -p`
（后台运行），然后收集结果 — 与 `codex` 技能用于批量修复 issue
的工作树扇出相同。将并发限制在机器和你的审查能力可承受的范围内。

### 输出 + 边界注意事项（与 Claude Code 不同）

- `agy -p` 返回**纯文本** — **没有 `--output-format json`**，也没有带
  `session_id` / 成本 / 轮次数的结果信封。直接解析 stdout；不要期望
  一个 JSON 对象。
- **没有 `--max-turns`**。一次 print 运行由 **`--print-timeout`** 界定
  （默认 `5m`）。对于长任务调高它：`--print-timeout 20m`。与 `terminal` 的
  `timeout=` 配合，以免外部调用过早截断运行。

### 编排边界

Antigravity 是**工作者执行后端或第三方意见审查者** — 是由运行任务的
智能体/配置档拥有的执行细节，而不是一等编排原语。不要把 `agy` 作为独立卡片
放在看板上，或将其视为协调层；通过正常任务图路由工作，并让分配的工作者选择 `agy`
（相较于 codex/claude-code/直接工具）作为其方法。只有当用户要求、工作者被配置为
封装它、或你想要一个 Gemini 家族对另一个智能体的计划或 diff 的交叉校验时，才显式使用它。

## 核心路径

- 二进制文件 / 入口点：`agy`
- 应用数据目录：`~/.gemini/antigravity-cli/`
- 设置文件：`~/.gemini/antigravity-cli/settings.json`
- 快捷键绑定文件：`~/.gemini/antigravity-cli/keybindings.json`
- 日志：`~/.gemini/antigravity-cli/log/cli-*.log`
- 对话：`~/.gemini/antigravity-cli/conversations/`
- Brain 制品：`~/.gemini/antigravity-cli/brain/`
- 历史：`~/.gemini/antigravity-cli/history.jsonl`
- 插件暂存区：`~/.gemini/antigravity-cli/plugins/<plugin_name>/`

## 快速参考

### 包装器命令
- `agy changelog`
- `agy help`
- `agy install`
- `agy plugin` / `agy plugins`
- `agy update`

### 有用的标志
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
- **对话控制：** `/resume` (`/switch`)、`/rewind` (`/undo`)、
  `/rename <name>`、`/clear`、`/fork`、`/reset`、`/new`
- **设置与工具：** `/config`、`/settings`、`/permissions`、`/model`、
  `/keybindings`、`/statusline`、`/tasks`、`/skills`、`/mcp`、`/open <path>`、
  `/usage`、`/logout`、`/agents`
- **提示词辅助：** `@` 路径自动补全，`esc esc` 清除提示词（当
  不在流式输出时），`!` 直接运行终端命令，`?` 打开帮助

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
- 启动时覆盖（`--sandbox`、`--dangerously-skip-permissions`）可以
  对当前会话取代持久化设置。

## 认证行为

- CLI 首先尝试操作系统安全钥匙串。
- 若无已保存的会话，则回退到基于浏览器的 Google 登录。
- 在本地，它打开默认浏览器；通过 SSH 时，它打印一个授权 URL
  并期望将授权码粘贴回来。
- `/logout` 移除已保存的凭据。

## 插件

- 插件暂存于 `~/.gemini/antigravity-cli/plugins/<plugin_name>/`。
- 它们可以打包技能、智能体、规则、MCP 服务器和钩子。
- `agy plugin list` 返回无已导入的插件是一种有效的空状态。

## 陷阱

- `agy help` 显示的是包装器命令，而非交互式斜杠命令。
- `agy --version` 是安全的非交互式版本检查；`agy version` 是
  交互式的，没有真正的 TTY 时会失败。
- 寻找失败原因的第一个地方：`~/.gemini/antigravity-cli/log/cli-*.log`
  （用 `read_file` 读取）。
- 不要将持久化的 JSON 设置与启动时覆盖混为一谈。
- `~/.gemini/antigravity-cli/bin/agentapi` 是指向 `agy agentapi` 的薄包装。
- 在 WSL 上，令牌存储是基于文件的，因此认证问题通常是本地文件 /
  会话状态问题，而非仅浏览器问题。
- 工作区身份可能取决于启动目录和 `.antigravitycli`
  项目标记。
- `agy -p` 仅打印纯文本 — 没有 `--output-format json`，没有结果
  信封。不要试图从中解析 JSON 对象（与 `claude-code` 不同）。
- 用 `--print-timeout`（默认 `5m`）界定 print 运行，而不是 `--max-turns`
  （`agy` 上不存在该选项）。

## 验证

确认安装是真实且可用的，全部通过 `terminal` 工具完成（用 `read_file`
读取文件）：

1. `terminal(command="command -v agy")`
2. `terminal(command="agy --version")`
3. `terminal(command="agy help")`
4. `terminal(command="agy plugin list")`
5. 对 `~/.gemini/antigravity-cli/settings.json` 执行 `read_file`
6. 对最新的 `~/.gemini/antigravity-cli/log/cli-*.log` 执行 `read_file`
7. 如有需要，对 `~/.gemini/antigravity-cli/keybindings.json` 执行 `read_file`

## 支持文件

- `references/cli-docs.md` — 摘自入门、用法
  和功能文档的浓缩笔记。
