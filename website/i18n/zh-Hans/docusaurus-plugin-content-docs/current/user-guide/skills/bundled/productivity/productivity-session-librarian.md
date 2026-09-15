---
title: "会话管理员 —— 按提示词整理会话：查找、重命名、归档、清理"
sidebar_label: "会话管理员"
description: "按提示词整理会话：查找、重命名、归档、清理"
---

{/* 本页由 website/scripts/generate-skill-docs.py 根据该技能的 SKILL.md 自动生成。请编辑源 SKILL.md，而不是本页。 */}

# 会话管理员

按提示词整理会话：查找、重命名、归档、清理。

## 技能元数据

| | |
|---|---|
| 来源 | 内置（默认安装） |
| 路径 | `skills/productivity/session-librarian` |
| 版本 | `1.0.0` |
| 作者 | Hermes Agent + Teknium |
| 许可证 | MIT |
| 平台 | linux, macos, windows |
| 标签 | `Sessions`、`Organization`、`Cleanup`、`Library`、`Productivity` |
| 相关技能 | [`weekly-review-planning`](/docs/user-guide/skills/bundled/productivity/productivity-weekly-review-planning) |

## 参考：完整 SKILL.md

:::info
以下是 Hermes 在该技能被触发时加载的完整技能定义。这就是技能激活时智能体看到的指令内容。
:::

# 会话管理员

以对话方式管理用户的会话库：查找关于某个主题的历史会话，总结它们
决定了什么，给它们起有意义的新名字，把工作拆分到并行会话中，
并提出将过期的会话归档或删除——所有这些都可以通过一句自然语言请求完成，
比如*“找出我关于 Q3 定价的会话，保留有用的，清理重复的。”*

灵感来自 Perplexity Computer 的提示词驱动会话管理（2026 年 8 月）：
由智能体启动、整理并清理用户自己的会话库，
并且在动任何东西之前总是先展示方案。

## 何时使用

- “我有哪些关于 X 的会话？”/“关于 X 我们决定了什么？”
- “把这些会话重命名成有意义的名字。”
- “清理我的会话库”/“把过期的归档掉。”
- “把那个会话分叉成一个专注于 Y 的后续会话。”
- “把这个拆成每个工单一会话”（参见下面的并行工作流）。

## 两个入口

| 任务 | 入口 |
|---|---|
| 按主题查找会话、阅读内容、总结决定 | `session_search` 工具（基于消息存储的 FTS5） |
| 按元数据（时间、来源、成本、token、工作区）列出/过滤 | 通过终端执行 `hermes sessions list` / `stats` |
| 重命名 | `hermes sessions rename <session_id> <title...>` |
| 批量软隐藏（可逆） | `hermes sessions archive <filters>` |
| 删除（破坏性） | `hermes sessions delete` / `hermes sessions prune <filters>` |
| 在删除任何有价值内容之前先导出 | `hermes sessions export --session-id <id> --format md` |
| 在新的地方继续工作 | `/branch`（分叉当前会话）或开一个新会话并引用其总结 |

## 操作步骤

① **查找。** 使用 `session_search(query=..., limit=5-10)`，搭配主题
关键词；变换措辞（功能名、症状、项目名）。对于元数据扫描
（“来自 telegram 的超过 60 天的会话”），改用
`hermes sessions list --source telegram --limit 50`。

② **逐个会话总结。** 查找结果的 `bookend_start`（目标）、
匹配窗口和 `bookend_end`（结果）通常就足够了——只有在用户
要求深入了解决定时才转储完整会话（`session_search(session_id=...)`）。
把每个会话报告为：链接（`@session:` 形式）——一句话目标——
一句话结果。

③ **先出方案再行动（凡是会改动内容的操作都必须如此）。** 先展示方案
表格：哪些会话重命名成什么、哪些归档、
哪些建议删除以及原因（与哪个保留项重复、过期、
空会话）。等待用户批准。例外：用户明确
指定的单个重命名可以直接执行。

④ **用最安全的原语行动。**
- 优先用 `archive`（可逆的软隐藏），而不是 `delete`/`prune`。
- 破坏性命令始终先带 `--dry-run` 运行并展示输出，
  确认后再带 `--yes` 重新运行。
- 在删除任何有实质内容的东西之前，提供
  `hermes sessions export --format md` 作为备份。

⑤ **汇报。** 已应用的重命名、已归档的会话（数量 + 如何撤销：
已归档的会话仍留在数据库中，用 `--include-archived` 可列出）、
已导出的内容、跳过的内容及原因。

## 并行工作流

对于“每个工单一会话，各自调查后汇报”：不要试图
驱动其他活跃会话。改用 `delegate_task`，每个工作流一个任务——
每个子智能体会自动运行在自己的会话中——然后综合它们的
总结。说明每次委派的记录本身之后都可通过
`session_search` 检索到。

## 常见坑

- **未经 dry-run + 本次对话中的明确确认，绝不删除。
**
一句常驻的“帮我清理一下”只是*提议*的授权，不是修剪的授权。
- **`session_search` 查找的是内容，不是元数据。** 时间/成本/来源过滤
  在 CLI 里；当请求把两者混在一起时（“关于定价的旧会话”），
  要把它们结合起来用。
- **标题是 `/resume <title>` 的身份标识。** 重命名时，让标题
  简短、唯一、便于作前缀；如果重命名与现有标题冲突，
  要提醒用户。
- **归档 ≠ 删除。** 归档只是从默认列表中隐藏会话。
  要说明你做的是哪一种。
- **跨配置档会话链接**（`@session:<profile>/<id>`）从另一个配置档
  是只读的；管理命令作用于当前配置档的数据库。

## 验证

清理结束后，重新运行查找查询和 `hermes sessions list`，
以确认会话库符合方案（保留项以新标题出现，
归档项从默认列表中消失）。
