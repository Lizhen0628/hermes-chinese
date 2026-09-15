---
title: "每周回顾规划 — 每周重置：承诺、停滞的工作、下周计划"
sidebar_label: "每周回顾规划"
description: "每周重置：承诺、停滞的工作、下周计划"
---

{/* 本页面由 website/scripts/generate-skill-docs.py 从技能的 SKILL.md 自动生成。请编辑源文件 SKILL.md，而不是本页面。 */}

# 每周回顾规划

每周重置：承诺、停滞的工作、下周计划。

## 技能元数据

| | |
|---|---|
| Source | Bundled（默认安装） |
| Path | `skills/productivity\weekly-review-planning` |
| Version | `0.1.0` |
| Author | Ben Barclay (benbarclay), Hermes Agent |
| License | MIT |
| Platforms | linux, macos, windows |
| Tags | `Weekly-Review`, `Planning`, `Tasks`, `Calendar`, `Productivity` |
| 相关技能 | [`obsidian`](/docs/user-guide/skills/bundled/note-taking/note-taking-obsidian), [`notion`](/docs/user-guide/skills/bundled/productivity/productivity-notion), [`airtable`](/docs/user-guide/skills/bundled/productivity/productivity-airtable), [`google-workspace`](/docs/user-guide/skills/bundled/productivity/productivity-google-workspace), [`email-inbox-triage`](/docs/user-guide/skills/bundled/email/email-email-inbox-triage) |

## 参考：完整 SKILL.md

:::info
以下是 Hermes 在本技能被触发时加载的完整技能定义。这就是技能激活时智能体所看到的指令。
:::

# 每周回顾与规划

在用户选定的系统上运行一次有边界的每周重置。这是一项具体的重复性任务，而非通用的生产力方法论——`weekly-review` 自动化蓝图会将其调度为定时任务。

## 使用场景

- "运行我的每周回顾。"
- "我承诺了什么，哪些在滑坡？"
- "根据我的日历、任务和笔记规划下周。"
- "找出停滞的项目和等待中的事项。"
- 定时任务滴答触发了一次计划中的每周回顾。

不适用于：每日简报（参见 `google-workspace` 的 daily-brief 参考）或单一收件箱的分诊（`email-inbox-triage`）。

## 流程

### 1. 设定系统与窗口

确认时区、回顾周期、规划时间跨度、权威任务/项目存储、日历、收件箱以及允许的写入操作。默认情况下产出建议/草稿，而非直接变更。当事实来源冲突有了明确的胜出方即视为完成。

### 2. 回顾日历证据

加载 `google-workspace` 或相关的日历连接器。检查已过去一周的会议与承诺，然后检查未来 1-2 周的最后期限、差旅、准备事项和产能。捕捉过去事件所隐含的后续事项以及前方的冲突。当回顾与前瞻均已涵盖即视为完成。

### 3. 清空收集类收件箱

查看任务收件箱、笔记（`obsidian`、`notion`）、已标记的电子邮件（`email-inbox-triage` 负责线程级分诊）以及其他声明的收集点。将每一项转换为下一行动、项目、等待、已排期、某天、参考、归档或建议删除。在范围获得批准之前不要变更。当剩余的未处理项已清点并说明即视为完成。

### 4. 核对进行中的项目

对每个项目确定期望成果、下一行动、负责人、最后期限、阻碍因素、最近有意义的活动以及来源链接。标记那些没有下一行动、错过日期、存在重复记录或状态矛盾的项目。当每个进行中的项目都是可行动的或已被明确暂停即视为完成。

### 5. 回顾等待事项与承诺

找出用户做出的承诺以及他人欠付的事项。提出带有日期和渠道的跟进建议。不要将沉默推断为已完成。当每一项等待事项都有负责人和下一次回顾/跟进日期即视为完成。

### 6. 构建考虑产能的计划

估算固定日历负荷，并选择少量每周成果以及近期下一行动。按后果、截止期限、依赖关系和投入程度排序；不要填满每一个空闲时段。当计划符合实际产能并指明了被推迟的工作即视为完成。

### 7. 应用已批准的更新

仅在获批的前提下更新任务/项目、创建日历占位、归档已处理项和起草跟进事项。从服务商处读回每一条被修改的记录。当已验证的写入与回顾摘要一致即视为完成。

## 产出形态

1. 成果与已完成的承诺
2. 逾期或有风险事项
3. 等待/跟进事项
4. 停滞或有歧义的项目
5. 下周成果与日历约束
6. 待批准的更新建议
7. 覆盖缺口

## 常见陷阱

- 脱离日历产能进行任务规划。
- 将每一项未完成的事项都作为高优先级向前推延。
- 将没有下一行动的项目标记为进行中。
- 静默删除或重新安排个人承诺。
- 将他人的沉默视为已完成。

## 验证

- [ ] 已完成的一周与规划时间跨度均已涵盖，或已说明缺口。
- [ ] 每一条停滞/等待标记都可追溯到具体记录、事件或线程。
- [ ] 未经批准未变更任何任务、事件或笔记；已批准的写入均已读回。
- [ ] 计划指明了被推迟的是什么，而不仅仅是被选中的是什么。
