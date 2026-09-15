---
title: "Session Librarian — 按提示词整理会话：查找、重命名、归档、清理"
sidebar_label: "Session Librarian"
description: "按提示词整理会话：查找、重命名、归档、清理"
---

{/* 本页面由 website/scripts/generate-skill-docs.py 根据该技能的 SKILL.md 自动生成。请编辑源文件 SKILL.md，而非此页面。 */}

# Session Librarian

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
以下是 Hermes 在此技能被触发时加载的完整技能定义。这就是技能激活时智能体看到的指令内容。
:::

# Session Librarian

以对话方式管理用户的会话库：查找关于某主题的历史会话、总结其中做出的决定、为它们起有意义的新名称、把工作拆分为并行会话，并对陈旧会话提出归档或删除建议——这一切都可以通过一句大白话请求完成，例如*“找出我关于 Q3 定价的会话，保留有用的，清理掉重复的。”*

灵感来自 Perplexity Computer 的提示词驱动会话管理（2026 年 8 月）：智能体负责启动、整理和清理用户自己的会话库，并且在动任何东西之前总是先展示计划。

## 何时使用

- “我有哪些关于 X 的会话？”/“关于 X 我们决定了什么？”
- “把这些会话重命名为有意义的名字。”
- “清理我的会话库”/“把陈旧的归档掉。”
- “把那个会话分叉成一个聚焦于 Y 的后续会话。”
- “把它拆分为每个工单一会话”（见下文并行工作流）。

## 两个操作面

| 任务 | 操作面 |
|---|---|
| 按主题查找会话、读取内容、总结决定 | `session_search` 工具（基于消息存储的 FTS5） |
| 按元数据（时长、来源、成本、token、工作区）列出/筛选 | 通过终端执行 `hermes sessions list` / `stats` |
| 重命名 | `hermes sessions rename <session_id> <title...>` |
| 批量软隐藏（可逆） | `hermes sessions archive <filters>` |
| 删除（破坏性） | `hermes sessions delete` / `hermes sessions prune <filters>` |
| 在删除任何有价值内容前先导出 | `hermes sessions export --session-id <id> --format md` |
| 在新位置继续工作 | `/branch`（分叉当前会话）或开启新会话并引用摘要 |

## 流程

① **发现。** 使用 `session_search(query=..., limit=5-10)` 并配上主题关键词；变换措辞（功能名、症状、项目名）。若要做元数据扫查（“60 天以上的 Telegram 会话”），改用 `hermes sessions list --source telegram --limit 50`。

② **逐会话总结。** 发现结果中的 `bookend_start`（目标）、匹配窗口和 `bookend_end`（结论）通常就足够了——只有当用户要求深入了解决定时才转储完整会话（`session_search(session_id=...)`）。每个会话按此格式汇报：链接（`@session:` 形式）——一句话目标——一句话结果。

③ **先计划后行动（凡是会造成变更的操作都必须）。** 先呈报一张计划表：哪些会话重命名成什么、哪些归档、哪些建议删除及原因（与哪个保留项重复、陈旧、为空）。等待用户批准。例外：用户明确指定的一次单个重命名可以直接执行。

④ **使用最安全的原语执行。**
- 优先使用 `archive`（可逆软隐藏）而非 `delete`/`prune`。
- 破坏性命令始终先带 `--dry-run` 运行并展示输出，确认后再带 `--yes` 重跑。
- 删除任何有实际内容的东西之前，提出用 `hermes sessions export --format md` 作为备份。

⑤ **汇报。** 已应用的重命名、已归档的会话（数量 + 如何撤销：归档会话仍留在数据库中，用 `--include-archived` 可列出）、已导出的内容、已跳过及其原因。

## 并行工作流

对于“每个工单一个会话，逐个调查，然后汇报回来”：不要试图去驱动其他活跃会话。改用 `delegate_task`，每个工作流一个任务——每个子智能体自动运行在各自的会话中——然后综合它们的摘要。并说明每次委派的记录本身之后都可以通过 `session_search` 检索。

## 陷阱

- **没有 dry-run + 本次对话中的明确确认，绝不删除。** 一句泛泛的“清理一下”是*提议*的授权，不是清理的授权。
- **`session_search` 查找的是内容，不是元数据。** 时长/成本/来源筛选在 CLI 里；当请求混合两者时（“关于定价的旧会话”）要两者结合使用。
- **标题就是 `/resume <title>` 的身份标识。** 重命名时，保持标题简短、唯一、便于作为前缀；如果重命名与现有标题冲突，要提醒用户。
- **归档 ≠ 删除。** 归档只是把会话从默认列表中隐藏。要说清楚你做的是哪一种。
- **跨配置档会话链接**（`@session:<profile>/<id>`）从另一个配置档访问是只读的；管理命令作用于当前配置档的数据库。

## 验证

一次清理结束后，重新运行发现查询和 `hermes sessions list`，确认会话库反映了计划（保留项以新标题存在，已归档项从默认列表中消失）。
