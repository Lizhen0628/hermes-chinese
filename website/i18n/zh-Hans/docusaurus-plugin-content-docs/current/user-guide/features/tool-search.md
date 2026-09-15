---
title: "工具搜索"
sidebar_position: 95
---

# 工具搜索

当会话中挂载了许多 MCP 服务器或非核心插件工具时，它们的 JSON schema 会在每一轮对话中消耗相当大一部分上下文窗口——即使其中只有少数几个与用户实际提出的需求相关。

**Tool Search** 是 Hermes 针对该问题提供的可选渐进式披露层。启用后，MCP 和插件工具会在模型可见的工具数组中被三个桥接工具替代，模型按需加载每个具体工具的 schema。

:::info Hermes 内置工具永不延迟加载
构成 Hermes 核心能力集的工具（`terminal`、`read_file`、`write_file`、`patch`、`search_files`、`todo`、`memory`、`browser_*`、`web_search`、`web_extract`、`clarify`、`execute_code`、`delegate_task`、`session_search`，以及 `_HERMES_CORE_TOOLS` 中的其余工具）*始终*直接加载。只有 MCP 工具和非核心插件工具有资格被延迟。
:::

## 工作原理

当某一轮对话激活 Tool Search 时，模型会看到三个新工具来替代被延迟的工具：

```
tool_search(queries, limit?)   搜索被延迟工具的目录（一个或多个查询）
tool_describe(names)           加载一个或多个工具的完整 schema
tool_call(calls)               调用被延迟的工具；`calls` 是 {name, arguments} 的数组
```

`calls` 每次调用占用一个条目；单个本地调用即为只包含一个元素的数组。只有 `connectors__` 名称可以批量放在一起；混合批次和多个本地调用的批次会被拒绝。

一次典型的交互如下所示：

```
模型: tool_search(["create a github issue", "send a slack message"])
  → { results: [ { query: "create a github issue",
                   matches: ["mcp_github_create_issue", ...] },
                 { query: "send a slack message",
                   matches: ["mcp_slack_post_message", ...] } ],
      tools: { mcp_github_create_issue: { description: "...",
                                          required: ["title"], ... },
               mcp_slack_post_message: { ... } } }
模型: tool_describe(["mcp_github_create_issue", "mcp_slack_post_message"])
  → { tools: { mcp_github_create_issue: { parameters: { ... } },
               mcp_slack_post_message: { parameters: { ... } } } }
模型: tool_call({ calls: [{ name: "mcp_github_create_issue",
                             arguments: { title: "...", body: "..." } }] })
  → { ok: true, issue_number: 42 }
```

`tool_search` 调用中的每个查询都会针对同一目录独立搜索（`limit` 按每个查询分别生效）；每个查询的分组只携带工具名称，而共享的 `tools` 映射会为每个匹配到的工具保存一次其描述和必需参数名。查询会进行词干提取，因此 "issues" 能找到 `create_issue`。每个未返回任何匹配的查询分组都会包含一份已连接服务器的 `available_sources` 摘要，以免词汇层面的未命中被误认为是能力缺失。
`tool_describe` 在一次调用中解析所有请求的名称；未知名称会在 `not_found` 中报告，而不会导致该批次其余部分失败。

当模型调用 `tool_call` 时，Hermes 会**解开桥接**，并完全按照模型直接调用底层工具的方式来派发。工具调用前的钩子、护栏、审批提示以及工具调用后的钩子都针对真实工具名运行——而非针对 `tool_call`。CLI 和网关中的活动流同样会解开，因此你看到的是底层工具，而不是桥接。

## 何时激活？

Tool Search 使用**分层披露**：只要存在*任何*可延迟的（MCP/插件）工具就会激活桥接；随目录规模扩展的是目录中仍保持可见的部分有多少，而非 schema 是否延迟。

| 层级 | 条件 | 模型所见内容 |
| --- | --- | --- |
| **0** | 没有 MCP/插件工具 | 所有工具预先加载，无桥接。直接透传。 |
| **1** | 被延迟目录的清单能容纳在预算内 | 桥接 + 每个被延迟工具的技能风格清单（名称 + 简短描述，超出预算时降级为仅名称）。降级是**按服务器**进行的：当一个超大服务器（Cloudflare）与小服务器（Linear）一起挂载时，小服务器保留其逐工具清单，只有超大服务器折叠为一行摘要。 |
| **2** | 即使所有服务器都仅名称列出，逐工具清单仍超出预算（例如仅 Cloudflare 的扁平 API 面：约 3,300 个工具，其名称约 32K token） | 裸桥接 + 每服务器一行摘要（服务器名 + 工具数量），让模型知道哪些域可达；单个工具只能通过 `tool_search` 发现。 |

清单预算为 `min(threshold_pct% of context, listing_max_tokens)`。
每次构建工具数组时都会重新评估该决策，因此在会话进行中增加或移除 MCP 服务器，会在下一次组装时使会话在层级间迁移。

## 配置

```yaml
tools:
  tool_search:
    enabled: auto       # auto（默认）、on 或 off
    threshold_pct: 5    # 列表预算，以上下文百分比表示
    search_default_limit: 5
    max_search_limit: 25
    listing: auto       # 嵌入分组的名称+描述目录清单
    listing_max_tokens: 4000
```

| 键 | 默认值 | 含义 |
| --- | --- | --- |
| `enabled` | `auto` | `auto`/`on` 在存在至少一个可延迟工具时激活；`off` 完全禁用（所有内容保持急切加载）。`auto` 当前是 `on` 的别名——它为未来的模式保留：当 schema 能放进上下文时内联，放不下时才延迟。如果你想让当前行为在升级后保持一致，请固定为 `on` 或 `off`。 |
| `threshold_pct` | `5` | 列表预算，以活动模型上下文长度的百分比表示。范围 0–100。 |
| `search_default_limit` | `5` | 当模型调用 `tool_search` 且未指定 `limit` 时，每查询返回的命中数。 |
| `max_search_limit` | `25` | 模型可通过 `limit` 请求的硬上限（每查询）。范围 1–50。 |
| `listing` | `auto` | 在 `tool_search` 桥接描述中嵌入一份技能风格的清单，列出所有延迟工具（名称 + 描述的第一句，≤60 字符，按 MCP 服务器分组）。`auto` 在能放进预算时包含它（否则回退到仅名称，再回退到第 2 层服务器摘要）；`on`/`off` 强制指定其中一种。 |
| `listing_max_tokens` | `4000` | 嵌入列表的绝对上限，不受上下文大小影响。范围 200–60000。大型目录会降级为仅名称或按服务器摘要，完整 schema 仍可通过搜索获得。 |

每次调用的数组上限是内部安全边界，而非配置项。超限调用会返回错误，以便模型用更小的批次重试。

### 列表存在的原因

没有它，延迟能力就是*不可见的*——实际基准测试表明，模型会替代性地调用可见的核心工具（在终端中运行 `gh`，而不是搜索延迟的 GitHub 工具），或者声称某项能力不存在，而不是调用 `tool_search`。列表将技能模式应用于工具：每项能力始终可按名称发现，同时完整的参数 schema 保持延迟。如果模型在列表中看到确切的工具名，它可以跳过 `tool_search` 直接调用 `tool_describe`，节省一次往返。

你也可以使用旧的布尔写法：

```yaml
tools:
  tool_search: true   # 等价于 {enabled: auto}
```

## 连接器（远程工具）

当你登录 Nous Portal 后，桥接还会访问**连接器**——由托管工具网关提供的远程工具。它们从不在本地注册：`tool_search` 将每个查询发送给网关，把网关的命中结果作为文档加入本地目录（标记为 `source: "connectors"`，命名为 `connectors__<connector>__<tool>`），然后用同一套 BM25 流程和同样的最稀有 token 规则对两者排序，因此 `limit` 会限制整个分组，一个能回答查询的连接器工具不会被仅与其共享一个词的本地工具挤掉。网关调用有 30 秒超时限制；网关缓慢或不可用时会降级为仅本地结果。`tool_describe` 从网关获取连接器 schema，`tool_call` 会按输入顺序将批次中的每个连接器条目作为单独的网关请求发送（网关在其常规 slug 下不认识的工具名会用字面 slug 重试一次，因此一个条目可能耗费两次请求）。如果某个连接器同时提供了 `GMAIL_X` 和字面的 `X`，两者都会组合为 `connectors__gmail__X`，执行的是 `GMAIL_X`；搜索会保留该孪生项，丢弃另一个，并记录警告。结果会按批次原顺序拼接回去，并重新计算计数。

```yaml
tools:
  connectors:
    enabled: true   # false — 不触碰连接器路由；桥接的行为
                    # 与不存在该特性时完全一致
```

未登录时（或网关不为你的账户提供连接器时），上述一切均不可见：本地搜索的行为与本页面其余部分描述的完全一致，不会向模型显示任何错误。

需要尚未关联账户的连接器调用会返回 `CONNECTION_REQUIRED` 错误。`manage_connections` 工具列出连接器及其连接状态并发起授权：在桌面应用中，该调用会显示一张卡片，阻塞直到每个应用都已连接或跳过，并报告结果；在其他地方，它会返回每个应用的连接链接供用户打开。断开账户由用户在 Portal 中完成。该工具还能从目录安装、启用和授权本地 MCP 服务器（`mcp: true` 的目标），因此无论你是否登录它都存在；只有托管连接器相关操作需要登录。

`tool_call` 接受一个批次：`calls` 是 `{name, arguments}` 条目的数组（单个调用就是只含一个元素的数组）。批次中的每个连接器条目都会作为一个独立的网关请求依次派发；本地延迟工具在每次 `tool_call` 中仍保持一个条目。审批在派发前按条目完成，条目之间的 `/stop` 会让尚未开始的条目不被发送（它们的槽位报告 `INTERRUPTED`）。

## 何时不要使用它

Tool Search 用固定的每轮 token 开销（三个桥接工具的 schema 加上目录列表）以及冷工具上至少一次额外的往返（describe → call），换取对延迟加载 schema 的节省。在 tier 1 下，列表会让每一项能力保持可见，因此发现阶段的往返通常就消失了——模型会直接去调用 `tool_describe`。实测基准显示，列表模式在任务成功率上与 eager loading 持平，而成本低于仅有的桥接本身。

如果你希望在小工具集上恢复旧的始终 eager 的行为，设置 `enabled: off`。

## 无法消除的权衡

这些来自 prompt 缓存完整性不变量——它们是任何渐进式披露设计所固有的，而非本实现特有：

- **冷工具上的一次额外往返。** 模型第一次需要某个延迟工具时，会多花一两次模型调用去查找并加载 schema。静态侧的 token 节省是真实的，但其中一部分会在运行时付回去。
- **延迟 schema 没有缓存收益。** 加载后的 `tool_describe` 结果进入对话历史（因此后续轮次确实会被缓存），但它永远不会受益于系统提示词的缓存前缀。
- **延迟 schema 没有服务商原生校验。** `tool_describe` 让模型读取延迟工具的 schema，但服务商仍然只看到通用的 `tool_call.arguments` 对象。因此 Hermes 会在分发前本地强制转换并校验底层参数；对于 Hermes 无法安全校验的 schema（例如格式不正确的 schema 或外部引用），仍由具体工具或 MCP 服务器负责。
- **依赖模型质量。** Tool Search 假设模型能够为自己想要的工具写出合理的搜索查询。较小的模型在这方面表现较差；Anthropic 公布的数字（Opus 4 上使用与不使用 tool search 时为 49% → 74%）展示了上限收益，但也表明约 26 个百分点的准确率差距仍是检索失败。
- **编辑工具集会失效缓存。** 在会话中途添加或移除工具会改变桥接工具的描述（其中包含延迟工具的数量）和目录，因此 prompt 缓存会失效。这与任何工具集编辑是同样的权衡。

## 实现细节

- **检索：** 对分词后的工具名称、来源名称（该工具所属的 MCP 服务器或插件工具集，因此搜索 `"linear"` 即使工具自身名称不含该服务名也能找到该服务器的工具）、描述和参数名进行 BM25 检索，并对索引和查询都应用 Snowball 词干化（英语），使形态变体也能匹配（"issues" 能找到 `create_issue`）。只有包含查询中最稀有 token 的工具才会成为结果（该 token 出现在最少的工具文档中，也就是命名意图的那个词：`gmail`、`github`、`incident`，而不是 `send` 或 `create`）。如果某个查询的最稀有 token 在任何工具中都不出现，则返回一个空分组，附带已连接的来源和重试提示，而不是返回 `limit` 个仅共享一个常见词的工
- **相关性下限：** 一个工具必须匹配查询中至少一半的*可回答*词项（即在目录中任何位置出现的词项）才会被提供——与长查询共享一个 incidental 词并不算匹配。对不存在能力的查找会返回空结果，而不是返回一个看似合理、让模型反复改写查询的列表。该下限仅在四个及以上可回答词项时才生效，因此像 "list issues" 这样的短查询保持完整召回，而精确的工具名称查询总是匹配。
- **并行执行会解开桥接。** 批处理规划器基于 `tool_call` 的*底层*工具决定并发，而不是基于字面的桥接名称——因此通过 `supports_parallel_tool_calls: true` 选择加入的 MCP 服务器在通过桥接调用其工具时保持并发，并且 `tool_search` / `tool_describe` 查找像任何只读工具一样并发批处理。
- **跨轮次目录是无状态的。** 每次组装时它都从当前 tools-defs 列表重建——没有以 session 为键的 `Map`。这避免了存储的目录与实时工具注册表漂移不同步这一类 bug。
- **目录范围限定为会话的工具集。** `tool_search`、`tool_describe` 和 `tool_call` 只会看到并调用会话实际被授予的工具。被限制为工具集子集的子智能体、kanban 工作者或网关会话，无法使用桥接来发现或调用该子集之外的工具——延迟目录是会话自身启用/禁用工具集中可延迟的部分，而不是整个进程注册表。
- **没有 JS 沙箱。** Hermes 使用更简单的 "structured tools" 模式（search / describe / call 作为普通函数）。其他一些实现提供的 JS 沙箱 "code mode" 面积很大，我们跳过它。

## 另请参阅

- `tools/tool_search.py` — 实现
- `tests/tools/test_tool_search.py` — 回归测试套件
- 原始实现 PR 中的 `openclaw-tool-search-report` PDF，用于塑造该设计的研究
