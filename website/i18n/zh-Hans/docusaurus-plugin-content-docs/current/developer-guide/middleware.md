---
title: "中间件"
description: "用于 LLM 调用和工具调用的行为变更插件中间件：契约、执行顺序、示例"
---

# Hermes 中间件

Hermes 中间件是观察者钩子的行为变更搭档。
观察者钩子报告发生了什么。中间件可以改变将要发生的事情，
方法是在执行前重写请求，或者包装执行回调本身。

这一契约刻意保持后端中立。插件可以将其用于本地策略、请求塑形、
追踪、自适应路由、缓存控制、沙箱选择，或移交给诸如 NeMo Relay 之类的运行时，
而无需改变 Hermes 的规划器、模型服务商适配器、工具注册表、记忆或 CLI 用户体验。

启用中间件后，插件可以：

- 在 Hermes 调用服务商之前重写 LLM 服务商请求 kwargs。
- 在护栏、审批检查、钩子和工具执行看到工具参数之前重写它们。
- 包装实际的 LLM 执行回调，同时保留 Hermes 重试、流式传输、中断和钩子行为。
- 包装实际的工具执行回调，同时保留 Hermes 护栏、审批、工具后钩子和工具结果转换。

## 契约

插件从 `register(ctx)` 注册中间件：

```python
def register(ctx):
    ctx.register_middleware("llm_request", on_llm_request)
    ctx.register_middleware("llm_execution", on_llm_execution)
    ctx.register_middleware("tool_request", on_tool_request)
    ctx.register_middleware("tool_execution", on_tool_execution)
```

每个中间件回调都会收到：

- `telemetry_schema_version`：目前为 `hermes.observer.v1`
- `middleware_schema_version`：目前为 `hermes.middleware.v1`
- 运行时上下文，例如适用的 `session_id`、`task_id`、`turn_id`、
  `api_request_id`、`provider`、`model`、`api_mode`、`tool_name` 和
  `tool_call_id`。

支持的中间件类型：

| 类型 | 载荷 | 返回结构 | 用途 |
| --- | --- | --- | --- |
| `llm_request` | `request`、`original_request` | `{"request": {...}}` | 在服务商执行前替换生效的服务商 kwargs。 |
| `tool_request` | `tool_name`、`args`、`original_args` | `{"args": {...}}` | 在钩子、护栏、审批和执行之前替换生效的工具参数。 |
| `llm_execution` | `request`、`original_request`、`next_call` | 任意服务商响应 | 包装或替换实际的服务商调用。 |
| `tool_execution` | `tool_name`、`args`、`original_args`、`next_call` | 任意工具结果 | 包装或替换实际的工具调用。 |

请求中间件可以返回可选的追踪字段：

```python
return {
    "request": updated_request,
    "source": "my-plugin",
    "reason": "selected fallback model",
}
```

Hermes 会将这些追踪条目存储在后续观察者钩子载荷中，作为
`middleware_trace` 的一部分。

执行中间件会收到一个 `next_call` 回调。调用它以延续调用链：

```python
def on_tool_execution(**kwargs):
    result = kwargs["next_call"](kwargs["args"])
    return result
```

如果多个插件注册了同一种执行中间件，Hermes 会按注册顺序将它们作为嵌套链运行。
中间件故障为故障开放：Hermes 记录警告，并继续下一个中间件或基础运行时路径。

## 执行顺序

### LLM 调用

对于每个服务商请求，Hermes 按以下顺序应用中间件：

1. 从当前对话构建服务商 kwargs。
2. 应用 `llm_request` 中间件。
3. 使用生效后的请求发出 `pre_api_request` 观察者钩子。
4. 通过 `llm_execution` 中间件运行服务商执行。
5. 发出 `post_api_request` 或 `api_request_error` 观察者钩子。

请求中间件能看到完整的服务商 kwargs，包括 `messages` 或 Responses API 的 `input`、
模型设置、工具定义、流选项以及服务商特定选项。执行中间件会收到相同的生效请求
以及 `next_call`。

### 工具调用

对于每个工具调用，Hermes 按以下顺序应用中间件：

1. 解析并强制转换模型提供的工具参数。
2. 应用 `tool_request` 中间件。
3. 使用生效后的参数运行 Hermes 常规的执行前路径：
   工具可用性检查、观察者阻止指令、护栏和审批检查。
4. 通过 `tool_execution` 中间件运行工具执行。
5. 发出 `post_tool_call` 观察者钩子。
6. 在结果被追加回对话上下文之前应用 `transform_tool_result` 钩子。

工具请求中间件在审批检查之前运行。请谨慎使用：被重写的路径、命令或 URL
就是下游策略将要评估的值。

## 启用方式

中间件只对已启用的插件运行。对于内置插件：

```bash
hermes plugins enable <plugin-name>
```

对于隔离的本地测试，将同一个 `HERMES_HOME` 同时用于插件启用和智能体运行：

```bash
export HERMES_HOME=/tmp/hermes-middleware-test
mkdir -p "$HERMES_HOME"
hermes plugins enable <plugin-name>
hermes chat --query 'Reply exactly ok'
```

对于源码检出，推荐使用源代码命令，以便运行时能看到工作树中的插件和中间件：

```bash
uv sync
uv run hermes plugins enable <plugin-name>
uv run hermes chat --query 'Reply exactly ok'
```

## 通用插件示例

下面的示例刻意保持简短。它们展示中间件契约的形态，不依赖 NeMo Relay。

### LLM 请求中间件

此插件标记服务商请求并记录一个中间件追踪条目：

```python
def register(ctx):
    ctx.register_middleware("llm_request", tag_llm_request)


def tag_llm_request(**kwargs):
    request = dict(kwargs["request"])
    extra_body = dict(request.get("extra_body") or {})
    extra_body.setdefault("metadata", {})["hermes_middleware_demo"] = True
    request["extra_body"] = extra_body
    return {
        "request": request,
        "source": "middleware-demo",
        "reason": "tagged provider request",
    }
```

生效后的请求会传递给 `pre_api_request`、服务商执行和
`post_api_request`。

### 工具请求中间件

此插件将 `terminal` 调用限制到已知的工作目录：

```python
def register(ctx):
    ctx.register_middleware("tool_request", normalize_terminal_workdir)


def normalize_terminal_workdir(**kwargs):
    if kwargs.get("tool_name") != "terminal":
        return None
    args = dict(kwargs["args"])
    args.setdefault("workdir", "/tmp/hermes-middleware-demo")
    return {
        "args": args,
        "source": "middleware-demo",
        "reason": "defaulted terminal workdir",
    }
```

由于这在钩子和审批之前运行，下游遥测和策略会观察到重写后的 `workdir`。

### LLM 执行中间件

此插件包装服务商调用并保留原始服务商响应：

```python
import time


def register(ctx):
    ctx.register_middleware("llm_execution", time_llm_execution)


def time_llm_execution(**kwargs):
    started = time.monotonic()
    response = kwargs["next_call"](kwargs["request"])
    elapsed_ms = int((time.monotonic() - started) * 1000)
    print(f"llm_execution elapsed_ms={elapsed_ms}")
    return response
```

返回 Hermes 期望从服务商适配器获得的相同响应结构。不要将响应包在
插件特定的封装中，除非运行时其余部分也期望该封装。

### 工具执行中间件

此插件包装工具执行并保留工具结果：

```python
def register(ctx):
    ctx.register_middleware("tool_execution", annotate_tool_execution)


def annotate_tool_execution(**kwargs):
    result = kwargs["next_call"](kwargs["args"])
    # Metrics, logging, or external routing can happen here.
    return result
```

执行中间件可以调用 `next_call(modified_args)`，将更改后的
载荷传递给后续中间件和基础工具调度器。

插件特定的示例应与拥有该行为的插件放在一起。
NeMo Relay 执行中间件通过显式选择的
Relay `plugins.toml` 安装；请参阅
[Relay 共享指标](relay-shared-metrics.md)。

## 安全注意事项

- 除非显式路由到动态外部系统，否则中间件对相同输入应当是确定性的。
- 请求中间件应返回完整的替换载荷，而不是部分补丁。
- 执行中间件应恰好调用一次 `next_call(...)`，除非它有意短路执行。
- 如果执行中间件在调用 `next_call(...)` 之前抛出异常，Hermes 会将该情况
  视为中间件故障，并继续执行剩余的中间件链和基础执行。
- 如果执行中间件成功调用 `next_call(...)` 之后在后处理期间抛出异常，
  Hermes 会保留下游结果，不会再次运行服务商或工具。
- 如果下游服务商或工具执行失败，中间件可以让该错误传播，或有意翻译它。
  Hermes 不会将下游失败转换为成功的 `None` 结果。
- 工具请求中间件在审批之前运行。如果它修改了文件路径、命令、URL 或参数，
  被修改后的值就是护栏和审批将要评估的值。
- 观察者钩子仍然是只读遥测的正确位置。仅在插件需要改变或包装行为时
  才使用中间件。
