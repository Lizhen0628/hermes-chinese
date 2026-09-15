---
title: "Observer Hooks"
description: "插件的只读遥测契约：事件族、关联 ID、负载安全"
---

# Hermes Observer Hooks

Hermes observer hooks 是插件的只读遥测契约，用于在不改变运行时行为的前提下重建智能体执行过程。该契约支持 trace、metrics、audit、replay 和 export 集成，例如 Langfuse、OpenTelemetry 风格的收集器以及 NeMo Relay。

Observer hooks 有意保持后端中立。它们暴露稳定的生命周期事件、关联 ID、经过清洗的负载、计时、状态和错误字段。它们不替代 Hermes 的规划器、模型服务商、记忆、工具注册表、审批 UX、CLI、网关行为或执行语义。

改变行为的请求或执行包装器不属于此 observer 契约。Observer hooks 应报告发生了什么；它们不应替代服务商请求、工具参数或执行回调。

Hermes 还有一条第一方 NeMo Relay 共享指标路径。它直接使用这些生命周期边界，无需启用可观测性插件。参见 [Relay shared metrics](relay-shared-metrics.md)。

## 契约

插件从 `register(ctx)` 注册 observer 回调：

```python
def register(ctx):
    ctx.register_hook("pre_api_request", on_pre_api_request)
    ctx.register_hook("post_api_request", on_post_api_request)
    ctx.register_hook("pre_tool_call", on_pre_tool_call)
    ctx.register_hook("post_tool_call", on_post_tool_call)
```

每个 hook 回调接收关键字参数。插件应接受 `**kwargs`，以便新增字段保持向后兼容：

```python
def on_post_tool_call(**kwargs):
    tool_name = kwargs.get("tool_name")
    status = kwargs.get("status")
    result = kwargs.get("result")
```

插件管理器会将此字段注入每个 hook 负载：

```text
telemetry_schema_version = "hermes.observer.v1"
```

Hook 回调采用 fail-open 策略。Hermes 会捕获回调异常、记录警告，并保持智能体循环继续运行。

大多数 observer hook 的返回值会被忽略。例外的是较早的、会影响行为的 hook：

| Hook | 返回行为 |
| --- | --- |
| `pre_llm_call` | 可返回字符串或 `{"context": "..."}`，以将临时上下文注入当前用户消息。 |
| `pre_tool_call` | 可返回 `{"action": "block", "message": "..."}` 在执行前阻止工具，或返回 `{"action": "modify", "args": {...}}` 转换工具的输入参数。 |
| `transform_tool_result` | 可在 `post_tool_call` 之后返回替换用的工具结果字符串。 |
| `transform_llm_output` | 可返回替换用的最终助手文本字符串。 |

遥测插件应将这些影响行为的返回值视为可选的兼容特性，而非可观测性要求。

## 关联 ID

Observer 负载使用稳定的 ID，使插件无需仅依赖回调顺序即可关联事件。

| 字段 | 含义 |
| --- | --- |
| `session_id` | 对话/会话身份。 |
| `task_id` | 任务身份，尤其适用于子智能体和隔离执行。 |
| `turn_id` | 一个回合内 API 尝试与工具调用共享的用户回合身份。 |
| `api_request_id` | 不透明的服务商尝试身份。不要解析其字符串格式。 |
| `api_call_count` | 智能体循环内的数值型 API 尝试计数。 |
| `tool_call_id` | 服务商提供的工具调用 ID（若可用）。 |
| `parent_session_id` / `child_session_id` | 委派子智能体的会话链接。 |
| `parent_subagent_id` / `child_subagent_id` | 子智能体链接（若可用）。 |
| `parent_turn_id` | 派生委派工作的父回合。 |

消费方应优先使用显式字段，而非解析复合 ID。特别是 `api_request_id` 是不透明的关联值。

## 事件族

### 会话生命周期

会话 hook 描述对话边界与重置：

| Hook | 触发时机 |
| --- | --- |
| `on_session_start` | 在构建系统提示后，全新会话开始。 |
| `on_session_end` | 一次 `run_conversation` 调用结束，包括被中断或不完整的回合。 |
| `on_session_finalize` | CLI 或网关拆除活动会话身份。 |
| `on_session_reset` | CLI 或网关从旧会话身份切换到新会话身份。 |

常见字段包括 `session_id`、`completed`、`interrupted`、`reason`、`old_session_id` 和 `new_session_id`（若可用）。

`on_session_end` 的作用域是回合/运行。它不一定是一个聊天身份最终的生命周期边界。对于每个会话身份必须发生一次的生命周期清理，请使用 `on_session_finalize` 和 `on_session_reset`。

### 回合级 LLM Hooks

这些 hooks 框定用户回合，而非单次服务商 API 尝试：

| Hook | 触发时机 |
| --- | --- |
| `pre_llm_call` | 用户回合的工具循环开始之前。 |
| `post_llm_call` | 该回合以最终助手输出完成后。 |

常见的 `pre_llm_call` 字段包括 `session_id`、`turn_id`、
`user_message`、`conversation_history`、`is_first_turn`、`model`、`platform`
以及 `sender_id`。

常见的 `post_llm_call` 字段包括 `session_id`、`turn_id`、
`user_message`、`assistant_response`、`conversation_history`、`model` 以及
`platform`。

使用请求级 API hooks 进行 LLM span 遥测。使用 `pre_llm_call` 和
`post_llm_call` 实现回合级上下文、兼容性以及最终回合摘要。

### 请求级 API Hooks

API hooks 描述智能体循环内部的服务商尝试：

| Hook | 触发时机 |
| --- | --- |
| `pre_api_request` | 服务商 API 请求之前立即触发。 |
| `post_api_request` | 服务商成功响应之后。 |
| `api_request_error` | 服务商请求失败或进入可重试错误路径之后。 |

`pre_api_request` 包含：

- 标识：`session_id`、`task_id`、`turn_id`、`api_request_id`
- 运行时：`platform`、`model`、`provider`、`base_url`、`api_mode`
- 尝试元数据：`api_call_count`、`message_count`、`tool_count`、
  `approx_input_tokens`、`request_char_count`、`max_tokens`
- 计时：`started_at`
- 清理后的请求负载：`request`

`post_api_request` 包含相同的标识/运行时字段，另有：

- `api_duration`、`started_at`、`ended_at`
- `finish_reason`、`message_count`、`response_model`
- `usage`
- `assistant_content_chars`、`assistant_tool_call_count`
- 清理后的响应负载：`response`
- 兼容性对象：`assistant_message`

`api_request_error` 包含相同的标识/运行时字段，另有：

- `api_duration`、`started_at`、`ended_at`
- `status_code`、`retry_count`、`max_retries`、`retryable`、`reason`
- 结构化的 `error = {"type": ..., "message": ...}`
- 清理后的失败请求负载：`request`

清理后的 `request`、`response` 和 `error` 字段是新消费方的规范观察者输入。

### 工具生命周期

工具 hooks 描述各个工具调用：

| Hook | 触发时机 |
| --- | --- |
| `pre_tool_call` | 护栏批准的工具有效分发之前。 |
| `post_tool_call` | 工具分发、取消、阻止或错误完成后。 |
| `transform_tool_result` | `post_tool_call` 之后，结果追加到模型上下文之前。 |

`pre_tool_call` 包含 `tool_name`、`args`、`task_id`、`session_id`、
`tool_call_id`、`turn_id` 以及 `api_request_id`。

`post_tool_call` 包含相同的标识字段，另有 `result`、
`duration_ms`、`status`、`error_type` 以及 `error_message`。

`status` 是观察者级的生命周期结果。常见值包括：

| 状态 | 含义 |
| --- | --- |
| `ok` | 工具正常完成。 |
| `error` | 工具已运行并返回或抛出错误结果。 |
| `blocked` | 某个 `pre_tool_call` hook 阻止了执行。 |
| `cancelled` | 执行在正常完成前被取消。 |

`post_tool_call` 会在被阻止和已取消的路径上触发，以便遥测
插件能够干净地关闭 spans。

### 审批生命周期

审批 hooks 描述危险命令审批提示：

| Hook | 触发时机 |
| --- | --- |
| `pre_approval_request` | 审批请求显示或发送之前。 |
| `post_approval_response` | 用户响应或请求超时之后。 |

常见字段包括 `command`、`description`、`pattern_key`、
`pattern_keys`、`session_key` 以及 `surface`。

`post_approval_response` 还包含 `choice`，其值如 `once`、
`session`、`always`、`deny` 以及 `timeout`。

审批 hooks 仅用于观察。插件无法通过这些 hooks 预先作答或否决审批。
若要阻止工具进入审批流程，请使用
`pre_tool_call` 阻止。

### 子智能体生命周期

子智能体 hooks 描述委派的子智能体工作：

| Hook | 触发时机 |
| --- | --- |
| `subagent_start` | 委派的子智能体被创建。 |
| `subagent_stop` | 委派的子智能体返回或失败。 |

`subagent_start` 字段包括 `parent_session_id`、`parent_turn_id`、
`parent_subagent_id`、`child_session_id`、`child_subagent_id`、`child_role`
以及 `child_goal`。

`subagent_stop` 字段包括父/子会话 ID、角色/状态字段、
`child_summary`、`duration_ms` 以及仅含元数据的 `tool_call_history`。每条
历史记录包含工具名称、参数名、有界的副作用
目标、输入/输出字节数以及结果。URL 查询字符串和片段
会被移除；原始参数、提示词、命令、内容、头和结果
被有意排除。

观察者可以使用这些 hooks 对嵌套轨迹建模，同时将子
智能体执行关联到产生它的父回合。

## 负载安全

观察者负载是为遥测消费方设计的，而非原始对象访问。
新消费方应使用清理后的 API 负载：

- `pre_api_request.request`
- `post_api_request.response`
- `api_request_error.request`
- `api_request_error.error`

清理会将服务商对象转换为 JSON 兼容结构、限制
大型负载、脱敏敏感键，并避免在清理后的字段中暴露原始响应
对象。

诸如 `request_messages`、`conversation_history`
以及 `assistant_message` 等旧版兼容字段可能仍会为现有插件保留。新的
可观测性消费方应优先使用清理后的负载。

## 性能

默认未插桩路径应保持低开销。昂贵的请求/响应
负载构建由 `has_hook(...)` 控制，因此 Hermes 仅在至少
一个插件注册了相关 hook 时才构建
清理后的 API 遥测负载。

插件作者应保留此特性：

- 仅注册插件实际消费的 hooks。
- 避免深拷贝或重新清理已清理的负载。
- 保持 hook 回调快速且失败开放。
- 在可行时卸载网络导出或批量写入。

## 编写观察者插件

最小观察者插件：

```python
def register(ctx):
    ctx.register_hook("pre_api_request", on_pre_api_request)
    ctx.register_hook("post_api_request", on_post_api_request)
    ctx.register_hook("pre_tool_call", on_pre_tool_call)
    ctx.register_hook("post_tool_call", on_post_tool_call)


def on_pre_api_request(**kwargs):
    start_llm_span(
        request_id=kwargs.get("api_request_id"),
        turn_id=kwargs.get("turn_id"),
        request=kwargs.get("request"),
        model=kwargs.get("model"),
    )


def on_post_api_request(**kwargs):
    finish_llm_span(
        request_id=kwargs.get("api_request_id"),
        response=kwargs.get("response"),
        usage=kwargs.get("usage"),
        duration=kwargs.get("api_duration"),
    )


def on_pre_tool_call(**kwargs):
    start_tool_span(
        call_id=kwargs.get("tool_call_id"),
        name=kwargs.get("tool_name"),
        args=kwargs.get("args"),
    )


def on_post_tool_call(**kwargs):
    finish_tool_span(
        call_id=kwargs.get("tool_call_id"),
        result=kwargs.get("result"),
        status=kwargs.get("status"),
        duration_ms=kwargs.get("duration_ms"),
    )
```

使用 `session_id`、`turn_id`、`api_request_id` 以及 `tool_call_id` 进行 span
关联。当导出格式支持
嵌套智能体工作或安全生命周期事件时，使用子智能体和审批 hooks。

## 现有消费方

捆绑的 Langfuse 插件演示了针对
回合、服务商请求和工具调用的直接基于 hook 的可观测性。

原生 NeMo Relay SDK 集成将 Hermes 会话、回合、LLM 和工具
生命周期映射到 Relay。显式的 Relay 插件配置可以添加
[ATOF、ATIF 或 OTEL](https://docs.nvidia.com/nemo/relay/configure-plugins/observability/about)
导出器和执行中间件；参见
[Relay 共享指标](relay-shared-metrics.md)。
