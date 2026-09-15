---
title: "实时仪表盘 — 从实时数据源构建自动更新的仪表盘"
sidebar_label: "实时仪表盘"
description: "从实时数据源构建自动更新的仪表盘"
---

{/* 本页由 website/scripts/generate-skill-docs.py 根据该技能的 SKILL.md 自动生成。请编辑源文件 SKILL.md，而非本页。 */}

# 实时仪表盘

从实时数据源构建自动更新的仪表盘。

## 技能元数据

| | |
|---|---|
| 来源 | 可选 — 使用 `hermes skills install official/productivity/live-dashboard` 安装 |
| 路径 | `optional-skills/productivity/live-dashboard` |
| 版本 | `0.2.0` |
| 作者 | Teknium (teknium1), Hermes Agent |
| 许可证 | MIT |
| 平台 | linux、macos、windows |
| 标签 | `dashboards`、`monitoring`、`status`、`automation`、`reporting` |
| 相关技能 | [`product-price-monitor`](/docs/user-guide/skills/bundled/productivity/productivity-product-price-monitor)、[`competitor-news-monitor`](/docs/user-guide/skills/bundled/research/research-competitor-news-monitor)、[`email-inbox-triage`](/docs/user-guide/skills/bundled/email/email-email-inbox-triage)、[`google-workspace`](/docs/user-guide/skills/bundled/productivity/productivity-google-workspace) |

## 参考：完整 SKILL.md

:::info
以下是 Hermes 在触发此技能时加载的完整技能定义。这就是该技能激活时智能体看到的指令内容。
:::

# 实时仪表盘

把一句话——"给我们的签证申请做个仪表盘，每天从邮件会话和案件状态网站自动更新"——变成一个持久、自我刷新的状态页面。用户描述他们想看到什么；你定义数据契约、构建一个自包含的 HTML 仪表盘、验证一次实时刷新，然后安排周期性进拍。

设置在前台运行一次；周期性刷新则作为 `cronjob` 进拍运行。安装此技能会通过 `/suggestions`（frontmatter 蓝图）提供一个每日全仪表盘巡检。

## 何时使用

- "给 &lt;项目/流程> 做个仪表盘，并保持更新。"
- "我想在一个地方看到 &lt;交易 / 申请 / 缺陷 / 货运> 的状态。"
- "跨我的邮件和 &lt;网站> 追踪 &lt;东西>，并告诉我它现在处于什么状态。"
- "给我看看 &lt;slug> 仪表盘。"（重新渲染/预览一个已有的仪表盘）
- 某个定时任务为已有仪表盘触发进拍（步骤 5-7）。

不要用于：一次性的状态提问（直接回答）、单品价格/库存阈值监控（使用 `product-price-monitor`），或公司新闻跟踪（使用 `competitor-news-monitor`）。

## 前提条件

- 至少一个仪表盘要读取的源连接器：通过 `himalaya` 或 `google-workspace` 读取邮件/日历，通过 `web_extract` 或 `browser_navigate` 读取网站，通过 `read_file` 读取本地文件。如果没有配置任何连接器，请在编写任何产物之前，在步骤 1 中重新协商数据源。
- 用于周期性进拍的 `cronjob`。
- 可选：`desktop_preview` 工具（Hermes desktop 应用会话）。当它在工具集中时，仪表盘会渲染在应用内预览窗格中；否则向用户提供文件路径。

## 流程 — 设置（前台，一次）

### 1. 定义仪表盘契约

根据用户的那句话，明确以下内容：用一句话描述仪表盘的目的、被追踪的实体（行）、每个实体的字段（列/指标）、"需要注意"的含义、每个字段读取自哪些数据源，以及刷新频率。对任何含糊之处都要询问——一个追踪了错误粒度的仪表盘毫无价值。当仪表盘上的每个字段都指明了将读取的数据源时，即为完成。

### 2. 用一次实时读取验证每个数据源

对每个数据源，现在就地做一次有边界的前台读取：邮件/日历通过连接器技能（`himalaya`、`google-workspace`），网站通过 `web_extract` 或 `browser_navigate`，本地文件通过 `read_file`。记录实际可获取的内容——认证墙、缺失的权限或空结果在此处就会暴露，而非等到第一次定时运行时。删除或替换失败的数据源。当每个字段的数据源都返回了真实数据，或已与用户明确重新协商时，即为完成。

### 3. 构建仪表盘产物

在 Hermes 主目录下的 `dashboards/<slug>/` 中写入两个文件（与 `config.yaml` 所在的同一目录；绝不要假设一个固定位置）：

- `dashboard.json` — 契约加上当前状态：目的、实体、逐字段的值、逐字段的数据源 + 检索时间戳、一个 `needs_attention` 列表，以及一份变更日志（仅追加，最新的在前）。
- `index.html` — 一个单独的自包含 HTML 页面（内联 CSS，无外部请求），用于渲染状态：带有目的和最后更新时间的页头、顶部的"需要注意"部分、实体表格，以及最近的变更列表。每次刷新时从 `dashboard.json` 重新生成；绝不要手工编辑 HTML 状态。

用步骤 2 的读取结果填充这两个文件，然后显示结果（步骤 8）。当页面渲染出实时数据，且页面上的每个值在 `dashboard.json` 中都带有检索时间戳时，即为完成。

### 4. 安排刷新

仅在步骤 3 成功之后，才安排进拍。如果来自 `/suggestions` 的每日全仪表盘巡检已经安排了，且其频率合适，它便会自动纳入此仪表盘——说明这一点并停止。否则创建一个针对单个仪表盘的任务，其提示词需指明状态文件：

```
cronjob(action="create",
        schedule=<契约中的频率，例如 "0 8 * * *">,
        prompt="载入 live-dashboard 技能，为 <dashboards/<slug>/dashboard.json 的绝对路径> 处的仪表盘运行刷新进拍。",
        deliver=<用户的目标位置>)
```

选择一个尊重数据源速率限制的频率。当存在一个覆盖此仪表盘的任务，且其提示词指明了状态文件路径（或巡检任务）时，即为完成。

## 流程 — 进拍（每次定时运行）

### 5. 重新读取数据源并对比

载入 `dashboard.json`（对于巡检：每个 `dashboards/*/dashboard.json`，一次一个），从每个字段指定的数据源重新读取，并针对存储的状态计算字段级差分。读源失败意味着状态未知：保留上一个有效值，将该字段标记为过时并记录失败时间，绝不要用错误覆盖有效数据。当每个字段都被更新、保持不变或被明确标记为过时时，即为完成。

### 6. 更新状态并重新渲染

将差分应用到 `dashboard.json`：更新值和 timestamp，将实质性变化追加到变更日志，并依据契约的注意规则重新计算 `needs_attention`。从更新后的状态重新生成 `index.html`，然后显示结果（步骤 8）。当 JSON 与 HTML 一致，且本次运行的变更日志条目存在（或本次运行被记录为无变更）时，即为完成。

### 7. 对实质性变化进行投递，否则保持静默

如果差分包含实质性变化或有新的需要注意项，投递一份简短摘要：发生了什么变化、需要注意什么，以及仪表盘的位置。否则以 `[SILENT]` 回应——除非用户要求了周期性摘要，否则不要有"仍在监视"这类噪音。当投递内容与差分相符时，即为完成。

## 流程 — 显示仪表盘（在每次构建或重新渲染之后，以及应请求时）

### 8. 在用户能看到的地方渲染

- Desktop/GUI 会话（`desktop_preview` 在工具集中）：`desktop_preview(action="open", url=<index.html 的绝对路径>, label=<仪表盘目的>)`，这样页面将实时渲染在聊天旁边的预览窗格中；每次重新渲染后重新打开，以便窗格显示新状态。
- 任何其他会话（CLI、即时通讯、无 GUI 的定时进拍）：报告 `index.html` 的绝对路径，并在平台允许时提议打开它。

当用户要么看到了渲染后的页面，要么被告知它确切的位置时，即为完成。

## 陷阱

- 在验证数据源之前就构建页面——认证失败随后会在无人值守的运行中暴露。
- 用错误页面或空读取结果覆盖上一个有效值。
- 只把状态渲染进 HTML —— 事实来源是 `dashboard.json`；HTML 只是一个投影。
- 在每次刷新时都告警，而不是仅在实质性变化时告警。
- 追踪了错误的粒度（用户认为是按申请，实际却是按会话线程）。
- 硬编码 Hermes 主路径——应从正在运行的安装中解析它（即含有 `config.yaml` 的目录），并把绝对路径写入定时任务提示词。
- 在桌面会话之外调用 `desktop_preview`——它仅对 GUI 会话存在工具集中；否则退回使用路径。

## 验证

- [ ] 每个仪表盘字段都指明了其数据源，且每个数据源在安排前都通过了一次前台读取。
- [ ] `dashboard.json` 和 `index.html` 存在且一致；每个值都带有检索时间戳。
- [ ] 读取失败时将字段标记为过时，而未破坏上一个有效状态。
- [ ] 进拍仅在实质性变化时投递；无变更的运行均为 `[SILENT]`。
- [ ] 变更日志仅凭状态文件就能重放仪表盘的历史。
- [ ] 仪表盘已在预览窗格中显示（桌面）或其路径已报告（其他环境）。
