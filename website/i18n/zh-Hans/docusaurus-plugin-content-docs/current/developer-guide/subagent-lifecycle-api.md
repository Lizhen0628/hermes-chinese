---
title: "公共子智能体生命周期 API"
sidebar_label: "子智能体生命周期 API"
---

# 公共子智能体生命周期 API

插件可以启动并监督全新的 Hermes 子会话，而无需导入 `tools.delegate_tool`、网关内部实现、TUI 状态或 `AIAgent` 字段。
该服务会从当前智能体回合中解析其父级，因此在 CLI、网关、非交互式以及看板工作会话中均可工作。在活跃的智能体回合之外启动会以失败关闭（fail closed）方式返回 `No active Hermes parent session`。

```python
from agent.subagent_lifecycle import SubagentLaunchRequest

def launch_review(ctx):
    # Call from a plugin tool or hook while an agent turn is active.
    service = ctx.subagent_lifecycle
    handle = service.launch(SubagentLaunchRequest(
        goal="Review this change for regressions.",
        context="Only inspect the supplied repository.",
        role="leaf",
        correlation_id="review-42",
        allowed_toolsets=("file",),
    ))
    # Persist handle.to_dict() if desired.
    if service.wait(handle, timeout_seconds=2).timed_out:
        return handle.to_dict()
    return service.result(handle)
```

`SubagentHandle` 可序列化，并携带一个带版本、不透明的能力令牌。
将它传回给 `status`、`wait`、`cancel`、`result` 或 `reconnect`；格式错误或伪造的句柄会返回 `UNKNOWN`/`UNKNOWN_HANDLE`，且无法访问子级。

稳定状态包括 `PENDING`、`STARTING`、`RUNNING`、`SUCCEEDED`、`FAILED`、
`INTERRUPTED`、`CANCEL_REQUESTED`、`CANCELLED` 以及 `UNKNOWN`。

`cancel(handle, reason=...)` 是协作式的：它请求子智能体在其下一个安全边界处中断，并返回 `CANCEL_REQUESTED`；在 `wait` 或 `result` 观察到终态之前，它绝不声称已完成。终态结果是不可变、幂等的，上限为 32k 字符，省略转录内容和隐藏推理，并包含稳定的结果哈希。

此 API 是受生命周期管理的异步执行。子级构建与完成使用与 `delegate_task` 相同的宿主自有路径，包括父级工具解析恢复、记忆通知、串行化的 `subagent_stop` 钩子、资源清理以及子级成本汇总。它不会改变同步的 `delegate_task` 工具、批量委托或其网关/TUI 显示。
初始实现在进程内将元数据和终态结果保留一小时。
进程重启后，`reconnect` 返回 `RECONNECT_UNAVAILABLE`，且绝不会启动替代子级。运行中的 Python 线程也无法在进程退出后存活；调用方必须将此类句柄视为因进程退出而中断。

请求以失败关闭方式处理：目标/上下文/元数据的大小有上限，未知或会扩大父级范围的工具集会被拒绝，且针对单个工具的阻塞、工作目录覆盖以及每次启动的超时会被明确拒绝，直到 Hermes 能在不削弱隔离性的前提下支持它们为止。使用 `allowed_toolsets` 来收窄子级；Hermes 现有的不安全工具拦截仍然强制执行。
