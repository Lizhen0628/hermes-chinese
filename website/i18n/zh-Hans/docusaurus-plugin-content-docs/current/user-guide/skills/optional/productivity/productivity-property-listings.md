---
title: "房产列表 — 以桌面卡片形式展示房产和租赁房源"
sidebar_label: "房产列表"
description: "以桌面卡片形式展示房产和租赁房源"
---

{/* 本页面由 website/scripts/generate-skill-docs.py 从该技能的 SKILL.md 自动生成。请编辑源 SKILL.md，而非本页面。 */}

# 房产列表

以桌面卡片形式展示房产和租赁房源。

## 技能元数据

| | |
|---|---|
| Source | 可选 — 使用 `hermes skills install official/productivity/property-listings` 安装 |
| Path | `optional-skills/productivity/property-listings` |
| Version | `0.1.0` |
| Author | Teknium (teknium1), Hermes Agent |
| License | MIT |
| Platforms | linux, macos, windows |
| Tags | `property`, `rental`, `real-estate`, `listings`, `desktop`, `cards` |

## 参考：完整 SKILL.md

:::info
以下是 Hermes 在触发该技能时加载的完整技能定义。这就是技能激活时智能体所看到的指令内容。
:::

# Property Listings 技能

将调研所得的房产以可浏览的卡片形式呈现在 Hermes 桌面端对话记录中。
这是一种展示方式，而非房源搜索服务或投资估值工具。

## 何时使用

- 展示房产或租赁搜索结果、比较候选清单，或对房产重新排序。
- 跟进已展示过的房产：继续使用卡片，使候选清单保持可比性。
- 在桌面应用之外，改用带来源链接的普通 Markdown；其他客户端无需渲染 listing 围栏。

## 前提条件

- 用于原生卡片的 Hermes 桌面端会话；后端可以是本地或远程。
- 房产详情由用户提供，或通过 `web_search`、`web_extract` 或本会话中可用的浏览器工具核实。
- 卡片格式化无需额外的 API 密钥或依赖。

## 如何运行

通过 Skills 目录安装此可选技能，或使用 `terminal`：

```text
hermes skills install official/productivity/property-listings
```

在展示房源时，使用 `skill_view(name="property-listings")` 加载它。
安装不会追溯更新正在运行会话的技能索引；请新建会话以实现自动发现，
或立即显式加载已安装的技能。

## 快速参考

输出一个围栏代码块，其语言为 `listing`，内容为有效 JSON。
使用单个对象、对象数组，或 `{ "listings": [...] }` 进行比较。

| 字段 | 结构与含义 |
|---|---|
| `address` | 必填的非空街道地址或房产标题。 |
| `price` | 格式化字符串，如适用需包含货币和租赁周期。 |
| `beds`、`baths` | 正数计数；未知值请省略。 |
| `size` | 格式化面积，包含单位。 |
| `note` | 该房产值得一看的原因。 |
| `facts` | 简短、已核实的规格或配套设施组成的数组。 |
| `catches` | 看房前需核实的风险或问题组成的数组。 |
| `images` | 按房源顺序排列的直接 HTTPS 照片 URL；第一张为主图。 |
| `links` | `{ "label": "Source", "url": "https://..." }` 详情页链接组成的数组，而非搜索结果 URL。 |

## 步骤

1. 收集地址、价格、规格、照片和规范详情 URL。区分已核实的事实与未知项；
   不要杜撰价格、配套设施或照片 URL。
2. 将同一房产在各个门户网站的镜像版本去重合并为一张卡片，保留有用的
   来源链接。在周边文字中保留来源日期和可用性注意事项。
3. 为每套展示的房产输出 `listing` 围栏，包括跟进和重新排序时。
   保持 facts 简短，将未解决的问题放入 `catches`。
4. 发送前检查 JSON。以下虚构的格式示例展示了所有字段；
   请将其值与示例 URL 替换为已核实的房源数据：

```listing
{
  "address": "12 Example Lane",
  "price": "$2,400/mo",
  "beds": 3,
  "baths": 2.5,
  "size": "1,600 sqft",
  "note": "符合所要求的空间和预算。",
  "facts": ["12-month lease", "Covered parking"],
  "catches": ["核实宠物政策和入住费用总额"],
  "images": ["https://example.com/property/front.jpg", "https://example.com/property/kitchen.jpg"],
  "links": [{"label": "Listing details", "url": "https://example.com/property/12"}]
}
```

## 注意事项

- 卡片是根据收集的数据编写的，而不是从房源 URL 或嵌入的门户页面获取的。
- 信息稀疏的卡片只需要地址。未知字段请省略，不要用猜测填充。
- 使用直接远程图片 URL，而非本地路径、data URL 或搜索结果页面。
  过期或被拦截的图片会从图库中消失；文字和链接仍然重要。
- 每个围栏最多 24 套房产、每套房产 40 张图片，facts、catches 和 links 中
  各最多 12 项。文本字段会被渲染器截断为 400 个字符。
- JSON 格式错误或卡片缺少身份信息的，会退化为普通代码块。
  卡片有效并不代表底层房源是当前或准确的。

## 验证

- 每套展示的房产都有地址和已核实的来源链接；未知项明确标注。
- 桌面端以原生卡片显示地址、价格、规格、facts、catches 和 links。
- 照片组成图库；选择某张照片会打开灯箱。三张或更多照片
  使用主图加辅助图片的拼贴布局；更多照片可在其中继续浏览。
- 如果卡片渲染失败，请验证围栏语言和 JSON，然后保留一份
  包含相同事实和链接的可读 Markdown 后备内容。
