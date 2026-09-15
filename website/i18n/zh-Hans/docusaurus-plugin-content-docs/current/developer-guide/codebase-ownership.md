---
title: "代码库归属图"
description: "哪些目录归属于哪个子系统，以及每个子系统的文档入口在哪里"
---

# 代码库归属图

Hermes 是一个大型仓库，大多数贡献都只涉及一个子系统。本页将每个子系统映射到其源代码目录，以及在修改它之前你应当阅读的文档入口。用它来找到正确的起始文档、正确的修改位置，以及正确的测试目录（测试与源码相对应：`tools/` 中的代码在 `tests/tools/` 中测试，插件在 `tests/plugins/<type>/` 中测试，依此类推）。

| 子系统 | 源代码目录 | 文档入口 |
|-----------|-------------------|------------------|
| 智能体核心（循环、传输、压缩） | `agent/`、`run_agent.py` | [Agent 循环](agent-loop.md)、[上下文压缩与缓存](context-compression-and-caching.md) |
| 提示词组装 | `agent/prompt_builder.py`、`agent/system_prompt.py` | [提示词组装](prompt-assembly.md) |
| 模型服务商与传输 | `agent/transports/`、`plugins/model-providers/`、`hermes_cli/models.py` | [添加服务商](adding-providers.md)、[模型服务商插件](model-provider-plugin.md)、[服务商运行时](provider-runtime.md) |
| 内置工具 | `tools/` | [添加工具](adding-tools.md)、[工具运行时](tools-runtime.md) |
| 消息网关 | `gateway/`、`plugins/platforms/` | [网关内部机制](gateway-internals.md)、[添加平台适配器](adding-platform-adapters.md) |
| CLI | `hermes_cli/` | [扩展 CLI](extending-the-cli.md) |
| 插件系统 | `plugins/` | [构建 Hermes 插件](plugins/index.md) |
| 技能（内置与可选） | `skills/`、`optional-skills/` | [创建技能](creating-skills.md) |
| 定时任务 / 计划任务 | `cron/` | [定时任务内部机制](cron-internals.md) |
| 会话存储 | `hermes_state.py`、`hermes_state_*.py` | [会话存储](session-storage.md) |
| 浏览器栈 | `tools/browser_tool.py`、`tools/browser_supervisor.py`、`tools/browser_cdp_tool.py` | [浏览器监督器](browser-supervisor.md) |
| 出口防火墙 | `agent/proxy_sources/iron_proxy.py` | [出口内部机制](egress-internals.md) |
| ACP（IDE 集成） | `acp_adapter/` | [ACP 内部机制](acp-internals.md) |
| 桌面应用 | `apps/desktop/` | [桌面插件 SDK](desktop-plugin-sdk.md)、[Worktree UI 开发](worktree-ui-dev.md) |
| TUI | `ui-tui/`、`tui_gateway/` | [Worktree UI 开发](worktree-ui-dev.md) |
| 文档站点 | `website/` | [贡献指南](contributing.md) |
| 测试 | `tests/`、`tests-js/` | [贡献指南 → 提交前](contributing.md#before-submitting) |

由此图可以得出几条约定：

- **改动应当留在其所属子系统内。** 一个需要修改核心文件的插件是一种设计坏味道——应当扩展通用的插件接口，而不是去改核心（参见仓库 `AGENTS.md` 中的贡献评分标准）。
- **对于你触碰的每个源代码目录，都要运行与之对应的测试目录。** 对 `plugins/platforms/telegram/` 的改动需要让 `tests/plugins/platforms/` 通过，而不只是你恰好想到的那个测试文件。
- **当涉及两个子系统时，由范围更窄的那个负责该改动。** 优先在适配器或插件中修复，而不是在智能体核心中加一个分支；核心是一个窄腰，在其中每增加一点东西，都会在每次 API 调用时代出代价。
