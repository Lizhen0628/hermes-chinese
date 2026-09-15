---
title: "房产列表 — 以桌面卡片形式呈现房产与租赁房源"
sidebar_label: "房产列表"
description: "以桌面卡片形式呈现房产与租赁房源"
---

{/* 本页由 website/scripts/generate-skill-docs.py 根据该技能的 SKILL.md 自动生成。请编辑源 SKILL.md，而非本页。 */}

# 房产列表

以桌面卡片形式呈现房产与租赁房源。

## 技能元数据

| | |
|---|---|
| Source | Optional — 使用 `hermes skills install official/productivity/property-listings` 安装 |
| Path | `optional-skills/productivity/property-listings` |
| Version | `0.1.0` |
| Author | Teknium (teknium1), Hermes Agent |
| License | MIT |
| Platforms | linux, macos, windows |
| Tags | `property`, `rental`, `real-estate`, `listings`, `desktop`, `cards` |

## 参考：完整 SKILL.md

:::info
以下是 Hermes 在此技能被触发时加载的完整技能定义。当技能处于激活状态时，这便是智能体看到的指令内容。
:::

# Property Listings 技能

将调研得到的房产以可浏览的卡片形式呈现在 Hermes 桌面端的对话记录中。
这是一种呈现方案，而非房源搜索服务或投资估值工具。

## 何时使用

- 呈现房产或租赁搜索结果、比较候选清单，或对房产重新排序时。
- 跟进已展示过的房产时：继续使用卡片，以便候选清单保持可比性。
- 在桌面应用之外，改用普通 Markdown 并附上来源链接；其他客户端无需渲染 listing 围栏。

## 前提条件

- 需要 Hermes 桌面端会话以渲染原生卡片；后端可以是本地或远程。
- 房产详情由用户提供，或通过 `web_search`、`web_extract` 或本会话中可用的浏览器工具核实。
- 卡片格式化无需额外的 API 密钥或依赖。

## 如何运行

通过 Skills 目录安装此可选技能，或使用 `terminal`：

```text
hermes skills install official/productivity/property-listings
```

在呈现房源时，使用 `skill_view(name="property-listings")` 加载它。
安装不会追溯更新正在运行的会话的技能索引；请新建会话以实现自动发现，
或立即显式加载已安装的技能。

## 快速参考

输出一个语言为 `listing` 的围栏代码块，其主体为有效 JSON。
可使用单个对象、对象数组，或 `{ "listings": [...] }` 以便比较。

| 字段 | 形式与含义 |
|---|---|
| `address` | 必填，非空的街道地址或房产标题。 |
| `price` | 格式化字符串，包含货币及（如适用）租赁周期。 |
| `beds`, `baths` | 正数计数；未知值请省略。 |
| `size` | 格式化面积，包含单位。 |
| `note` | 该房产值得一看的原因。 |
| `facts` | 已验证的简短规格或配套设施组成的数组。 |
| `catches` | 看房前需核实的问题。 |
| `images` | 按房源顺序排列的直接 HTTPS 照片 URL；第一张为主图。 |
| `links` | `{ "label": "Source", "url": "https://..." }` 详情页链接的数组，而非搜索结果 URL。 |

## 操作步骤

1. 收集地址、价格、规格、照片和规范的详情 URL。区分已核实的事实与未知信息；
   不要编造价格、配套设施或照片 URL。
2. 将同一房产在各个门户网站的重复信息去重为一张卡片，并保留有用的来源链接。
   将来源日期和可售性注意事项保留在周围的正文中。
3. 为呈现的每一处房产输出 `listing` 围栏，包括跟进和重新排序的情况。保持 facts 简短，
   并将尚未解决的问题放入 `catches`。
4. 发送前检查 JSON。以下虚构的格式示例展示了所有字段；
   请将其中的值及示例 URL 替换为已验证的房源数据：

```listing
{
  "address": "12 Example Lane",
  "price": "$2,400/mo",
  "beds": 3,
  "baths": 2.5,
  "size": "1,600 sqft",
  "note": "Fits the requested space and budget.",
  "facts": ["12-month lease", "Covered parking"],
  "catches": ["Verify pet policy and total move-in fees"],
  "images": ["https://example.com/property/front.jpg", "https://example.com/property/kitchen.jpg"],
  "links": [{"label": "Listing details", "url": "https://example.com/property/12"}]
}
```

## 注意事项

- 卡片是根据收集的数据编写的，而非从房源 URL 或嵌入的门户页面获取的。
- 信息稀疏的卡片只需地址即可。未知字段请省略，而不要用猜测填充。
- 使用直接的远程图片 URL，而非本地路径、data URL 或搜索结果页面。
  过期或被拦截的图片会从图库中消失；文字和链接仍然重要。
- 每个围栏最多包含 24 处房产、每处房产 40 张图片，以及 facts、catches 和 links 中
  各不超过 12 项。文本字段会被渲染器截断至 400 个字符。
- 格式错误的 JSON 或缺少身份信息的卡片会回退为普通代码块。
  有效的卡片并不证明底层房源是当前或准确的。

## 验证

- 每处呈现的房产都有地址和已验证的来源链接；未知信息明确标注。
- 桌面端将地址、价格、规格、facts、catches 和 links 显示为原生卡片。
- 照片组成图库；选择照片会打开灯箱。三张或更多照片
  采用主图加辅助框架的拼接布局；更多照片仍可在其中浏览。
- 如果卡片渲染失败，请验证围栏语言和 JSON，然后保留一份
  包含相同 facts 和 links、可读的 Markdown 备用内容。
