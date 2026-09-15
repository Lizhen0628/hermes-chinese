---
title: "Openhands — 将编码任务委派给 OpenHands CLI（模型无关，LiteLLM）"
sidebar_label: "Openhands"
description: "将编码任务委派给 OpenHands CLI（模型无关，LiteLLM）"
---

{/* This page is auto-generated from the skill's SKILL.md by website/scripts/generate-skill-docs.py. Edit the source SKILL.md, not this page. */}

# Openhands

将编码任务委派给 OpenHands CLI（模型无关，LiteLLM）。

## 技能元数据

| | |
|---|---|
| 来源 | 可选 — 使用 `hermes skills install official/autonomous-ai-agents/openhands` 安装 |
| 路径 | `optional-skills/autonomous-ai-agents\openhands` |
| 版本 | `0.1.0` |
| 作者 | Tim Koepsel (xzessmedia), Hermes Agent |
| 许可证 | MIT |
| 平台 | linux, macos |
| 标签 | `Coding-Agent`, `OpenHands`, `Model-Agnostic`, `LiteLLM` |
| 相关技能 | [`claude-code`](/docs/user-guide/skills/bundled/autonomous-ai-agents/autonomous-ai-agents-claude-code), [`codex`](/docs/user-guide/skills/bundled/autonomous-ai-agents/autonomous-ai-agents-codex), [`opencode`](/docs/user-guide/skills/bundled/autonomous-ai-agents/autonomous-ai-agents-opencode), [`hermes-agent`](/docs/user-guide/skills/bundled/autonomous-ai-agents/autonomous-ai-agents-hermes-agent) |

## 参考：完整 SKILL.md

:::info
以下为此技能被触发时 Hermes 加载的完整技能定义。这就是技能激活时智能体所看到的指令。
:::

# OpenHands CLI

通过 `terminal` 工具将编码任务委派给 [OpenHands CLI](https://github.com/All-Hands-AI/OpenHands)。OpenHands 与模型无关：任何 LiteLLM 支持的服务商均可（OpenAI、Anthropic、OpenRouter、DeepSeek、Ollama、vLLM 等）。

本技能是用于批量 / 一次性委派的 headless 模式封装。Hermes 不会使用交互式文本界面。

## 何时使用

- 用户希望将编码任务专门委派给 OpenHands。
- 用户希望使用可在非 Anthropic / 非 OpenAI 服务商（DeepSeek、Qwen、Ollama、vLLM、Nous 等）上运行的编码智能体——同类技能 `claude-code` 与 `codex` 均绑定单一供应商。
- 在工作区内进行多步文件编辑与 shell 命令。

对于 Claude 原生，优先使用 `claude-code`。对于 OpenAI 原生，优先使用 `codex`。对于 Hermes 原生子智能体，使用 `delegate_task`。

## 前提条件

1. 安装上游版本（需要 Python 3.12+ 与 `uv`）：

   ```
   terminal(command="uv tool install openhands --python 3.12")
   ```

   验证：`openhands --version`（撰写本文时当前为 `OpenHands CLI 1.16.0` / `SDK v1.21.0`）。

2. 选择模型并为 `--override-with-envs` 设置环境变量：

   ```
   export LLM_MODEL=openrouter/openai/gpt-4o-mini       # 或任意 LiteLLM slug
   export LLM_API_KEY=$OPENROUTER_API_KEY
   export LLM_BASE_URL=https://openrouter.ai/api/v1     # 原生 OpenAI 时省略
   ```

   `LLM_MODEL` 使用 LiteLLM 的完整 slug。当服务商为 OpenRouter 时，slug 是双重前缀：`openrouter/<vendor>/<model>`（例如 `openrouter/anthropic/claude-sonnet-4.5`）。对于原生 Anthropic：`anthropic/claude-sonnet-4-5`。对于原生 OpenAI：`openai/gpt-4o-mini`。

3. 抑制启动横幅，以便 JSON 输出前不会出现 ASCII 艺术：

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

### 后台执行长任务

```
terminal(command="<same as above>", workdir="/path/to/project", background=true, notify_on_complete=true)
process(action="poll", session_id="<id>")
process(action="log", session_id="<id>")
```

### 恢复之前的对话

OpenHands 在每次运行结束时打印 `Conversation ID: <32-hex>` 以及一行 `Hint: openhands --resume <dashed-uuid>`。使用带连字符的形式进行恢复：

```
terminal(
  command="OPENHANDS_SUPPRESS_BANNER=1 LLM_MODEL=... openhands --headless --json --override-with-envs --exit-without-confirmation --resume <dashed-uuid> -t 'Now fix the bug you found'",
  workdir="/path/to/project"
)
```

## 真实参数列表

已针对 `openhands --help`（CLI 1.16.0）验证。未在此表中的内容均非参数——请通过环境变量或设置文件传入。

| 参数 | 作用 |
|------|--------|
| `--headless` | 无界面，需要 `-t` 或 `-f`。自动批准所有操作（此模式下无 `--llm-approve`）。 |
| `--json` | JSONL 事件流（需要 `--headless`）。 |
| `-t TEXT` | 任务提示词。 |
| `-f PATH` | 从文件读取任务。 |
| `--resume [ID]` | 恢复对话。无 ID → 列出最近记录。 |
| `--last` | 恢复最近一条（与 `--resume` 一同使用）。 |
| `--override-with-envs` | 应用 `LLM_API_KEY` / `LLM_BASE_URL` / `LLM_MODEL` 环境变量。若不使用，OpenHands 将使用 `~/.openhands/settings.json` 并忽略环境变量。 |
| `--exit-without-confirmation` | 不显示"你确定吗"退出对话框。 |
| `--always-approve` / `--yolo` | 自动批准每个操作（`--headless` 下的默认行为）。 |
| `--llm-approve` | 基于 LLM 的安全网关（仅交互式 — 在 headless 下无效）。 |
| `--version` / `-v` | 打印版本并退出。 |

**没有 `--model`、`--max-iterations`、`--workspace`、`--sandbox`、`--sandbox-type` 参数。** 模型通过 `LLM_MODEL` 指定。工作区是你传给 `terminal` 工具的 `workdir`。沙箱 / 运行时通过 `RUNTIME` 与 `SANDBOX_VOLUMES` 环境变量指定。

## JSON 事件架构

使用 `--json --headless` 时，OpenHands 输出 JSONL——每行一个 JSON 对象，外加少量非 JSON 状态行（`Initializing agent...`、`Agent is working`、`Agent finished`、最终摘要框、`Goodbye!`、`Conversation ID:`、`Hint:`）。筛选以 `{` 开头的行。

顶层 `kind` 字段用于区分事件：

- `MessageEvent` — 用户 / 智能体文本轮次。`source` 为 `user` 或 `agent`。
- `ActionEvent` — 智能体选定了某个工具。读取 `tool_name`（`file_editor`、`terminal`、`finish`）与 `action.kind`（`FileEditorAction`、`TerminalAction`、`FinishAction`）。
- `ObservationEvent` — 工具结果。`observation.is_error` 是成功标志。`source` 为 `environment`。
- `ActionEvent` 内的 `FinishAction` 在 `action.message` 中携带智能体的最终消息。

CLI 会先打印来自 LiteLLM/Authlib 的所有 stderr 输出——参见"坑点"。仅解析 stdout，逐行进行，忽略不以 `{` 开头的行。

## 坑点

- **每次调用都会有 LiteLLM 警告。** 由于未安装 `botocore`，CLI 会向 stderr 打印 `bedrock-runtime` 与 `sagemaker-runtime` 警告。此外还有一条 Authlib 弃用警告。这些都是噪音，不是失败。将 stderr 管道输出到 `/dev/null`，或在展示给用户前过滤掉。
- **横幅刷屏。** 若不设置 `OPENHANDS_SUPPRESS_BANNER=1`，每次运行都会以多行 `+--+` ASCII 盒子开头，宣传 SDK。务必导出该变量。
- **自动化场景下 `--override-with-envs` 是必须的。** 不使用它，OpenHands 会忽略 `LLM_API_KEY` / `LLM_BASE_URL` / `LLM_MODEL`，回退到 `~/.openhands/settings.json`。在全新安装上该文件不存在，CLI 会挂起等待首次运行设置。
- **模型 slug 是 LiteLLM 的，而非服务商的。** `openrouter/openai/gpt-4o-mini` 可用；在指向 OpenRouter 时 `openai/gpt-4o-mini` 不可用。`anthropic/claude-sonnet-4-5`（连字符）是原生 Anthropic；`openrouter/anthropic/claude-sonnet-4.5`（点）是经由 OpenRouter。用错 → 出现难以理解的 LiteLLM 400 错误。
- **`pip install openhands-ai` 是错误的包。** 那是旧版 V0 SDK。新的 CLI 是 `uv tool install openhands --python 3.12`。没有维护中的 conda 包。
- **恢复 ID 格式很讲究。** CLI 会以 `Conversation ID: f46573d9cfdb45e492ca189bde40019b`（无连字符）结束，然后给出 `Hint: openhands --resume f46573d9-cfdb-45e4-92ca-189bde40019b`（带连字符）。请使用带连字符的形式。
- **Headless 忽略 `--llm-approve`。** 如果你传入，会得到 argparse 错误。Headless 模式硬编码为始终批准。
- **上游不支持 Windows。** OpenHands 文档要求在 Windows 上使用 WSL。因此本技能被限定为 `[linux, macos]`。
- **`~/.openhands/conversations/<id>/` 会不断累积。** 每次运行都会持久化一份轨迹。批量运行时应清理。
- **安装体积庞大（约 200 个包）。** 使用 `uv tool install`（隔离 venv）以避免与当前项目产生依赖冲突。

## 验证

```
terminal(
  command="OPENHANDS_SUPPRESS_BANNER=1 LLM_MODEL=openrouter/openai/gpt-4o-mini LLM_API_KEY=$OPENROUTER_API_KEY LLM_BASE_URL=https://openrouter.ai/api/v1 openhands --headless --json --override-with-envs --exit-without-confirmation -t 'Print the string OPENHANDS_OK to stdout via the terminal tool.'",
  workdir="/tmp",
  timeout=120
)
```

若 JSONL 流以 `FinishAction` 结束且其 `action.message` 中提及 `OPENHANDS_OK`，说明安装正常。

## 相关

- [OpenHands GitHub](https://github.com/All-Hands-AI/OpenHands)
- [OpenHands CLI command reference](https://docs.openhands.dev/openhands/usage/cli/command-reference)
- 同类技能：`claude-code`（仅 Anthropic）、`codex`（仅 OpenAI）、`opencode`（经由 OpenCode 支持多服务商）、`hermes-agent`（通过 `delegate_task` 的 Hermes 子智能体）。
