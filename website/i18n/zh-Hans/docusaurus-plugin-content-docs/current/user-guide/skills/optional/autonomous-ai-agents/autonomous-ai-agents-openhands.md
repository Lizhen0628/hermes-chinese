---
title: "Openhands — 将编码委托给 OpenHands CLI（模型无关，LiteLLM）"
sidebar_label: "Openhands"
description: "将编码委托给 OpenHands CLI（模型无关，LiteLLM）"
---

{/* 本页面由 website/scripts/generate-skill-docs.py 根据技能的 SKILL.md 自动生成。请编辑源文件 SKILL.md，而非此页面。 */}

# Openhands

将编码委托给 OpenHands CLI（模型无关，LiteLLM）。

## 技能元数据

| | |
|---|---|
| Source | 可选 — 使用 `hermes skills install official/autonomous-ai-agents/openhands` 安装 |
| Path | `optional-skills/autonomous-ai-agents\openhands` |
| Version | `0.1.0` |
| Author | Tim Koepsel (xzessmedia), Hermes Agent |
| License | MIT |
| Platforms | linux, macos |
| Tags | `Coding-Agent`, `OpenHands`, `Model-Agnostic`, `LiteLLM` |
| Related skills | [`claude-code`](/docs/user-guide/skills/bundled/autonomous-ai-agents/autonomous-ai-agents-claude-code), [`codex`](/docs/user-guide/skills/bundled/autonomous-ai-agents/autonomous-ai-agents-codex), [`opencode`](/docs/user-guide/skills/bundled/autonomous-ai-agents/autonomous-ai-agents-opencode), [`hermes-agent`](/docs/user-guide/skills/bundled/autonomous-ai-agents/autonomous-ai-agents-hermes-agent) |

## 参考：完整 SKILL.md

:::info
以下是当此技能被触发时 Hermes 加载的完整技能定义。这是智能体在技能激活时看到的指令内容。
:::

# OpenHands CLI

通过 `terminal` 工具将编码任务委托给 [OpenHands CLI](https://github.com/All-Hands-AI/OpenHands)。OpenHands 与模型无关：任何 LiteLLM 支持的服务商皆可（OpenAI、Anthropic、OpenRouter、DeepSeek、Ollama、vLLM 等）。

此技能是用于批处理 / 一次性委托的无头模式封装。交互式文本 UI 不会从 Hermes 中使用。

## 何时使用

- 用户希望将编码任务专门委托给 OpenHands。
- 用户希望编码智能体能够在非 Anthropic / 非 OpenAI 的服务商（DeepSeek、Qwen、Ollama、vLLM、Nous 等）上运行 —— 兄弟技能 `claude-code` 和 `codex` 都与单一供应商绑定。
- 在工作区内进行多步骤文件编辑 + shell 命令。

对于 Claude 原生，优先使用 `claude-code`。对于 OpenAI 原生，优先使用 `codex`。对于 Hermes 原生子智能体，使用 `delegate_task`。

## 前提条件

1. 安装上游版本（需要 Python 3.12+ 和 `uv`）：

   ```
   terminal(command="uv tool install openhands --python 3.12")
   ```

   验证：`openhands --version`（撰写时为 `OpenHands CLI 1.16.0` / `SDK v1.21.0`）。

2. 选择一个模型并为 `--override-with-envs` 设置环境变量：

   ```
   export LLM_MODEL=openrouter/openai/gpt-4o-mini       # 或任何 LiteLLM slug
   export LLM_API_KEY=$OPENROUTER_API_KEY
   export LLM_BASE_URL=https://openrouter.ai/api/v1     # 原生 OpenAI 可省略
   ```

   `LLM_MODEL` 使用 LiteLLM 的完整 slug。当服务商为 OpenRouter 时，slug 会双重前缀：`openrouter/<vendor>/<model>`（例如 `openrouter/anthropic/claude-sonnet-4.5`）。原生 Anthropic 使用：`anthropic/claude-sonnet-4-5`。原生 OpenAI 使用：`openai/gpt-4o-mini`。

3. 抑制启动横幅，以便 JSON 输出不会被 ASCII 艺术画前置：

   ```
   export OPENHANDS_SUPPRESS_BANNER=1
   ```

## 如何运行

始终通过 `terminal` 工具调用。自动化时始终传入 `--headless --json --override-with-envs --exit-without-confirmation`。

### 一次性任务

```
terminal(
  command="OPENHANDS_SUPPRESS_BANNER=1 LLM_MODEL=openrouter/openai/gpt-4o-mini LLM_API_KEY=$OPENROUTER_API_KEY LLM_BASE_URL=https://openrouter.ai/api/v1 openhands --headless --json --override-with-envs --exit-without-confirmation -t 'Add error handling to all API calls in src/'",
  workdir="/path/to/project",
  timeout=600
)
```

### 后台运行长任务

```
terminal(command="<同上>", workdir="/path/to/project", background=true, notify_on_complete=true)
process(action="poll", session_id="<id>")
process(action="log", session_id="<id>")
```

### 恢复之前的会话

OpenHands 在每次运行结束时会打印 `Conversation ID: <32-hex>` 和一行 `Hint: openhands --resume <dashed-uuid>`。使用带连字符的形式来恢复：

```
terminal(
  command="OPENHANDS_SUPPRESS_BANNER=1 LLM_MODEL=... openhands --headless --json --override-with-envs --exit-without-confirmation --resume <dashed-uuid> -t 'Now fix the bug you found'",
  workdir="/path/to/project"
)
```

## 真实参数列表

已对照检查 `openhands --help`（CLI 1.16.0）。不在本表中的任何内容都不是参数 —— 请通过环境变量或设置文件传递。

| 参数 | 作用 |
|------|------|
| `--headless` | 无 UI，需要 `-t` 或 `-f`。自动批准所有动作（此模式下无 `--llm-approve`）。 |
| `--json` | JSONL 事件流（需要 `--headless`）。 |
| `-t TEXT` | 任务提示词。 |
| `-f PATH` | 从文件读取任务。 |
| `--resume [ID]` | 恢复会话。无 ID → 列出最近的会话。 |
| `--last` | 恢复最近的会话（与 `--resume` 同用）。 |
| `--override-with-envs` | 应用 `LLM_API_KEY` / `LLM_BASE_URL` / `LLM_MODEL` 环境变量。没有此项，OpenHands 会使用 `~/.openhands/settings.json` 而忽略环境变量。 |
| `--exit-without-confirmation` | 不显示"你确定吗"退出对话框。 |
| `--always-approve` / `--yolo` | 自动批准每个动作（在 `--headless` 中为默认）。 |
| `--llm-approve` | 基于 LLM 的安全关口（仅限交互式 —— 在无头模式下不能使用）。 |
| `--version` / `-v` | 打印版本并退出。 |

**不存在 `--model`、`--max-iterations`、`--workspace`、`--sandbox`、`--sandbox-type` 参数。** 模型是 `LLM_MODEL`。工作区是你传递给 `terminal` 工具的 `workdir`。沙箱 / 运行时是 `RUNTIME` 和 `SANDBOX_VOLUMES` 环境变量。

## JSON 事件架构

使用 `--json --headless` 时，OpenHands 输出 JSONL —— 每行一个 JSON 对象，加上少量非 JSON 状态行（`Initializing agent...`、`Agent is working`、`Agent finished`、最终的摘要框、`Goodbye!`、`Conversation ID:`、`Hint:`）。筛选以 `{` 开头的行。

顶层 `kind` 字段用于区分事件：

- `MessageEvent` —— 用户 / 智能体文本轮次。`source` 为 `user` 或 `agent`。
- `ActionEvent` —— 智能体选择了工具。读取 `tool_name`（`file_editor`、`terminal`、`finish`）和 `action.kind`（`FileEditorAction`、`TerminalAction`、`FinishAction`）。
- `ObservationEvent` —— 工具结果。`observation.is_error` 是成功标志。`source` 为 `environment`。
- `ActionEvent` 中的 `FinishAction` 携带智能体的最终消息于 `action.message`。

CLI 会先打印来自 LiteLLM/Authlib 的所有 stderr —— 参见"陷阱"部分。仅逐行解析 stdout，忽略不以 `{` 开头的行。

## 陷阱

- **每次调用都会有 LiteLLM 警告。** 由于未安装 `botocore`，CLI 会向 stderr 打印 `bedrock-runtime` 和 `sagemaker-runtime` 警告。还有一个 Authlib 弃用提示。这些是噪音，不是故障。在展示给用户之前将 stderr 重定向到 `/dev/null` 或将其过滤掉。
- **横幅刷屏。** 不设置 `OPENHANDS_SUPPRESS_BANNER=1`，每次运行都会以一个多行 `+--+` ASCII 框开头来宣传 SDK。始终导出它。
- **自动化时 `--override-with-envs` 是强制性的。** 没有它，OpenHands 会忽略 `LLM_API_KEY` / `LLM_BASE_URL` / `LLM_MODEL` 并回退到 `~/.openhands/settings.json`。在全新安装时此文件不存在，CLI 会挂起等待首次运行设置。
- **模型 slug 是 LiteLLM 的，不是服务商的。** `openrouter/openai/gpt-4o-mini` 可用；在指向 OpenRouter 时使用 `openai/gpt-4o-mini` 则不可用。`anthropic/claude-sonnet-4-5`（连字符）是原生 Anthropic；`openrouter/anthropic/claude-sonnet-4.5`（点号）是通过 OpenRouter。弄错 → 神秘的 LiteLLM 400 错误。
- **`pip install openhands-ai` 是错误的包。** 那是遗留的 V0 SDK。新的 CLI 是 `uv tool install openhands --python 3.12`。没有维护中的 conda 包。
- **恢复 ID 格式很麻烦。** CLI 结尾是 `Conversation ID: f46573d9cfdb45e492ca189bde40019b`（无连字符），然后是 `Hint: openhands --resume f46573d9-cfdb-45e4-92ca-189bde40019b`（有连字符）。使用带连字符的形式。
- **无头模式忽略 `--llm-approve`。** 如果你传入它，会得到 argparse 错误。无头模式硬编码为始终批准。
- **上游不支持 Windows。** OpenHands 文档在 Windows 上要求 WSL。此技能相应地被限定为 `[linux, macos]`。
- **`~/.openhands/conversations/<id>/` 会累积。** 每次运行都会持久化一个轨迹。如果批量运行，请清理它。
- **安装很重（约 200 个包）。** 使用 `uv tool install`（隔离 venv）以避免与活动项目的依赖冲突。

## 验证

```
terminal(
  command="OPENHANDS_SUPPRESS_BANNER=1 LLM_MODEL=openrouter/openai/gpt-4o-mini LLM_API_KEY=$OPENROUTER_API_KEY LLM_BASE_URL=https://openrouter.ai/api/v1 openhands --headless --json --override-with-envs --exit-without-confirmation -t 'Print the string OPENHANDS_OK to stdout via the terminal tool.'",
  workdir="/tmp",
  timeout=120
)
```

如果 JSONL 流以 `FinishAction` 结尾且其 `action.message` 提到了 `OPENHANDS_OK`，则安装正常。

## 相关

- [OpenHands GitHub](https://github.com/All-Hands-AI/OpenHands)
- [OpenHands CLI 命令参考](https://docs.openhands.dev/openhands/usage/cli/command-reference)
- 兄弟技能：`claude-code`（仅 Anthropic）、`codex`（仅 OpenAI）、`opencode`（通过 OpenCode 支持多服务商）、`hermes-agent`（通过 `delegate_task` 使用 Hermes 子智能体）。
