---
title: "工具搜索"
sidebar_position: 95
---

# 工具搜索

当一个会话中挂载了大量 MCP 服务器或非核心插件工具时，它们的 JSON schema 在每一轮对话中都可能占用相当大一部分上下文窗口——即使其中只有少数几个与用户实际的提问相关。

**工具搜索（Tool Search）** 是 Hermes 为解决该问题而提供的可选渐进式披露层。启用后，模型可见的工具数组中的 MCP 和插件工具会被三个桥接工具所替换，模型按需加载每个具体工具的 schema。

:::info Hermes 内置工具永不延迟加载
构成 Hermes 核心能力集的工具（`terminal`、`read_file`、`write_file`、`patch`、`search_files`、`todo`、`memory`、`browser_*`、`web_search`、`web_extract`、`clarify`、`execute_code`、`delegate_task`、`session_search` 以及 `_HERMES_CORE_TOOLS` 中的其余成员）*始终*直接加载。只有 MCP 工具和非核心插件工具才有资格被延迟加载。
:::

## 工作原理

当某一轮对话中工具搜索激活时，模型会看到三个替代被延迟工具的新工具：

```
tool_search(queries, limit?)   搜索被延迟工具的目录（可包含一个或多个查询）
tool_describe(names)           加载一个或多个工具的完整 schema
tool_call(calls)               调用被延迟的工具；`calls` 是 {name, arguments} 的数组
```

`calls` 中每次调用占一个条目；单个本地调用就是长度为 1 的数组。只有 `connectors__` 开头的名称可以一起批量调用；混合批次和多本地批次会被拒绝。

一次典型的交互如下所示：

```
模型：tool_search(["create a github issue", "send a slack message"])
  → { results: [ { query: "create a github issue",
                   matches: ["mcp_github_create_issue", ...] },
                 { query: "send a slack message",
                   matches: ["mcp_slack_post_message", ...] } ],
      tools: { mcp_github_create_issue: { description: "...",
                                          required: ["title"], ... },
               mcp_slack_post_message: { ... } } }
模型：tool_describe(["mcp_github_create_issue", "mcp_slack_post_message"])
  → { tools: { mcp_github_create_issue: { parameters: { ... } },
               mcp_slack_post_message: { parameters: { ... } } } }
模型：tool_call({ calls: [{ name: "mcp_github_create_issue",
                             arguments: { title: "...", body: "..." } }] })
  → { ok: true, issue_number: 42 }
```

`tool_search` 调用中的每个查询都会针对同一目录独立搜索（`limit` 对每个查询分别生效）；按查询分组的结果只携带工具名称，而共享的 `tools` 映射则一次性存放每个匹配工具的描述和必填参数名。查询会经过词干化处理，因此 "issues" 能找到 `create_issue`。每个未返回匹配的分组会附带一个 `available_sources`，列出已连接的服务器摘要，以免一次词法未命中被误认为是能力缺失。
`tool_describe` 在一次调用中解析所有请求的名称；未知名称会报告在 `not_found` 中，而不会导致整个批次失败。

当模型调用 `tool_call` 时，Hermes 会**拆开桥接层**，并像模型直接调用那样派发底层工具。工具调用前钩子、护栏、审批提示以及工具调用后钩子都会针对真实工具名运行——而非 `tool_call`。CLI 和网关中的活动流同样会拆开桥接，因此你看到的是底层工具，而不是桥接工具。

## 何时激活？

工具搜索采用**分层披露**：只要存在*任何*可延迟加载（MCP/插件）的工具，桥接就会激活；随目录规模变化的是目录中有多少内容保持可见，而不是 schema 是否被延迟。

| 层级 | 条件 | 模型所见内容 |
| --- | --- | --- |
| **0** | 没有 MCP/插件工具 | 所有工具直接加载，无桥接。直通模式。 |
| **1** | 被延迟目录的清单在预算内 | 桥接 + 每个被延迟工具的 skills 风格清单（名称 + 简短描述，超出预算时降级为仅名称）。降级是**按服务器**进行的：当一个超大服务器（Cloudflare）与若干小服务器（Linear）一起挂载时，小服务器保留其逐工具清单，只有超大服务器折叠为一行摘要。 |
| **2** | 逐工具清单即使对每个服务器仅保留名称也超出预算（例如仅 Cloudflare 的扁平 API 面：约 3,300 个工具，其名称约 32K token） | 裸桥接 + 每服务器一行摘要（服务器名 + 工具数），使模型知道哪些域可达；具体工具只能通过 `tool_search` 发现。 |

清单预算为 `min(threshold_pct% of context, listing_max_tokens)`。每次构建工具数组时都会重新评估该决定，因此在会话中途添加或移除 MCP 服务器，会在下一次组装时将会话在各层级之间移动。

## 配置

```yaml
tools:
  tool_search:
    enabled: auto       # auto (default), on, or off
    threshold_pct: 5    # 列表预算占上下文长度的百分比
    search_default_limit: 5
    max_search_limit: 25
    listing: auto       # 嵌入一份按组划分的名称+描述目录清单
    listing_max_tokens: 4000
```

| 键 | 默认值 | 含义 |
| --- | --- | --- |
| `enabled` | `auto` | 只要存在至少一个可延迟工具，`auto`/`on` 就会激活；`off` 完全禁用（所有工具保持即时加载）。`auto` 目前是 `on` 的别名——它预留给未来的模式，该模式会在模式适配上下文时内联模式，仅在不适配时才对模式进行延迟。如果你希望今天的默认行为在升级后得到保证，请固定为 `on` 或 `off`。 |
| `threshold_pct` | `5` | 列表预算占当前激活模型上下文长度的百分比。取值范围 0–100。 |
| `search_default_limit` | `5` | 当模型调用 `tool_search` 而未指定 `limit` 时，每次查询返回的命中数。 |
| `max_search_limit` | `25` | 模型可通过 `limit` 请求的硬性上限（每次查询）。取值范围 1–50。 |
| `listing` | `auto` | 在 `tool_search` 桥接描述中嵌入每个延迟工具的 skills 风格清单（名称 + 描述首句，≤60 个字符，按 MCP 服务器分组）。`auto` 会在其适配预算时包含它（回退到仅名称，然后是第二级服务器摘要）；`on`/`off` 强制使用任一方式。 |
| `listing_max_tokens` | `4000` | 嵌入式列表的绝对上限，与上下文大小无关。取值范围 200–60000。大型目录会降级为仅名称或按服务器摘要，确保完整模式仍可通过搜索获得。 |

每次调用的数组上限是内部安全边界，而非配置。超过上限的
调用会返回错误，以便模型可以用更小的批次重试。

### 为什么会存在列表

如果没有它，延迟能力就是*不可见的*——实时基准测试显示，
模型会替代性使用可见的核心工具（在终端中运行 `gh`，而不是搜索被延迟的
GitHub 工具），或者断言某项能力不存在，而不是调用 `tool_search`。该列表将
skills 模式应用于工具：每个能力始终可按名称被发现，
而完整的参数模式则保持延迟。如果模型在列表中看到确切的
工具名称，它就可以跳过 `tool_search` 直接调用 `tool_describe`，节省一次往返。

你也可以改为传统的布尔形式：

```yaml
tools:
  tool_search: true   # 等价于 {enabled: auto}
```

## 连接器（远程工具）

当你登录到 Nous Portal 后，该桥接还会访问
**连接器**——由托管工具网关提供的远程工具。它们从不会在本地注册：
`tool_search` 将每个查询发送到网关，以文档形式把网关的命中结果添加到本
地目录（标记为 `source: "connectors"`，命名格式为 `connectors__<connector>__<tool>`），并对两者执行同一轮 BM25 处理和相同的稀有词元规则进行排序，因此 `limit` 是对
整个组设置的上限，能回答查询的连接器工具永远不会被仅与其共享一个词的本地工具挤出。
网关调用有 30 秒的时限；缓慢或不可用的网关会降级为仅本地
结果。`tool_describe` 从网关获取连接器模式，
而 `tool_call` 会按输入顺序将批次中的每个连接器条目作为独立的网关
请求发送（若网关在其常规 slug 下不认识某个工具名，会在字面 slug 下重试一次，因此一个条目可能耗费两次请求）。如果某个连接器同时提供了 `GMAIL_X` 和一个字面的
`X`，两者都会组合成 `connectors__gmail__X`，这会调用 `GMAIL_X`；
搜索会保留那个孪生项，丢弃另一个，并记录一条警告。结果会拼回批次的原始顺序，
计数会被重新计算。

```yaml
tools:
  connectors:
    enabled: true   # false — 永不触碰连接器路由；该桥接
                    # 的表现就好像该功能不存在一样
```

未登录（或网关不为你的
账户提供连接器服务）时，以上所有内容都是不可见的：本地搜索的表现完全与本页面
其余部分所述一致，不会向模型显示任何错误。

某个连接器调用需要你尚未关联的账户时，会返回
`CONNECTION_REQUIRED` 错误。`manage_connections` 工具会列出连接器及其
连接状态，并启动授权：在桌面应用中，调用会
显示一张卡片，在应用连接或跳过之前阻塞，并报告
结果；在其他情况下，它会为每个应用返回一个连接链接供用户打开。
断开账户连接由用户在 Portal 中完成。该工具还会安装、启用和授权来自目录的
本地 MCP 服务器（目标需具有 `mcp: true`），因此无论你是否登录它都存在；
只有托管连接器相关的操作需要登录。

`tool_call` 接受一个批次：`calls` 是一个由 `{name, arguments}`
条目组成的数组（单次调用即长度为 1 的数组）。批次中的每个连接器条目
都会作为独立的网关请求被依次派发；本地延迟
工具在每一次 `tool_call` 中仍只占一个条目。审批在
派发前按条目结算，条目之间的 `/stop` 会使尚未启动的条目不被发送
（它们的槽位会报告 `INTERRUPTED`）。

## 何时不应使用它

Tool Search 用固定的每轮 token 开销（三个桥接工具 schema 加上目录清单）以及冷工具上至少多出的一个往返（describe → call），来换取延迟 schema 节省的空间。在 tier 1 中，清单纯粹让所有能力保持可见，因此发现往返通常消失——模型直接走向 `tool_describe`。实际基准测试表明，清单模式在任务成功率上匹配急切加载，同时开销低于裸桥接。

如果你希望小工具集获得旧的始终急切加载行为，请设置 `enabled: off`。

## 不会消失的权衡

这些来源于提示缓存完整性不变量——它们对任何渐进式披露设计都是固有的，而非特定于这一实现：

- **冷工具上多一次往返。** 模型第一次需要使用延迟工具时，会多花一两次模型调用来查找并加载 schema。静态端的 token 节省是真实的，但一部分会在运行时偿还。
- **延迟 schema 没有缓存收益。** 加载的 `tool_describe` 结果会进入对话历史（因此后续轮次确实会缓存），但它不会从系统提示的缓存前缀中受益。
- **延迟 schema 没有供应商原生校验。** `tool_describe` 让模型读取一个延迟工具的 schema，但供应商仍然只看到通用的 `tool_call.arguments` 对象。因此 Hermes 在派发前会在本地强制转换并校验底层参数；Hermes 无法安全校验的具体工具或 MCP 服务器仍对 schema 负责，例如格式错误的 schema 或外部引用。
- **依赖模型质量。** Tool Search 假设模型能够为它想要的工具编写合理的搜索查询。较小的模型做得不够好；已发布的 Anthropic 数据（Opus 4 在有和无工具搜索时的 49% → 74%）展示了利好，但也表明约有 26 个百分点的准确率仍然来源于检索失败。
- **工具集编辑会失效缓存。** 在会话中间添加或移除工具会改变桥接工具的说明（其中包含延迟工具的数量）和目录，因此提示缓存会失效。这与任何工具集编辑的权衡相同。

## 实现细节

- **检索：** 对分词后的工具名称、来源名称（工具所属的 MCP 服务器或插件工具集，因此搜索 `"linear"` 能找到该服务器的工具，即使工具自身的名称不包含该服务）、描述和参数名称执行 BM25，对索引和查询都应用 Snowball 词干提取（英语），这样形态变体能够匹配（"issues" 能找到 `create_issue`）。只有当工具包含查询中最稀有的 token（即在最少工具文档中出现的那个 token，因此它就是命名意图的词：`gmail`、`github`、`incident`，而非 `send` 或 `create`）时，它才是结果。最稀有 token 不出现在任何工具中的查询会返回一个带有已连接来源和重试提示的空组，而不是共享一个常见词的 `limit` 个工具。
- **相关性下限：** 工具必须匹配查询中至少一半的*可应答*术语（目录中任意位置出现的术语）才会被提供——与一个长查询共享一个偶然的词不算匹配。对不存在能力的搜寻不会返回任何结果，而不是一个看似合理、模型会反复改述的列表。此下限从四个可应答术语起才会启用，因此像 "list issues" 这样的短查询保持完全召回，精确工具名查询始终匹配。
- **并行执行会解包桥接。** 批处理规划器根据 `tool_call` 的*底层*工具来决定并发性，而不是按字面的桥接名称——因此通过 `supports_parallel_tool_calls: true` opt-in 的 MCP 服务器在其工具通过桥接调用时保持其并发性，而 `tool_search` / `tool_describe` 查找会像任何只读工具一样并发批处理。
- **目录跨轮次是无状态的。** 它每次组装时都会从当前工具定义列表重建——没有按会话键的 `Map`。这避免了存储的目录与实时工具注册表失去同步的这类 bug。
- **目录的范围限定为会话的工具集。** `tool_search`、`tool_describe` 和 `tool_call` 只会看到并调用会话实际被授予的工具。一个仅限于部分工具集的子智能体、kanban worker 或网关会话无法使用桥接来发现或调用该子集之外的工具——延迟目录是会话自身已启用/禁用工具集中可延迟的切片，而不是整个进程注册表。
- **没有 JS 沙箱。** Hermes 使用更简单的"结构化工具"模式（搜索 / 描述 / 调用作为普通函数）。某些其他实现提供的 JS 沙箱"代码模式"面积很大；我们跳过它。

## 另见

- `tools/tool_search.py` — 实现
- `tests/tools/test_tool_search.py` — 回归测试套件
- 原始实现 PR 中承载影响设计的调研的 `openclaw-tool-search-report` PDF
