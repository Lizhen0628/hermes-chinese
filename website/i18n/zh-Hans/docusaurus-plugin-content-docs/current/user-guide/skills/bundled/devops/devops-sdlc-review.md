---
title: "Sdlc Review — 审查 Kanban 交接并流转已验证结果"
sidebar_label: "Sdlc Review"
description: "审查 Kanban 交接并流转已验证结果"
---

{/* This page is auto-generated from the skill's SKILL.md by website/scripts/generate-skill-docs.py. Edit the source SKILL.md, not this page. */}

# Sdlc Review

审查 Kanban 交接并流转已验证结果。

## 技能元数据

| | |
|---|---|
| Source | Bundled (installed by default) |
| Path | `skills/devops\sdlc-review` |
| Version | `1.1.0` |
| Author | Jakub Wolniewicz (@frizikk) + Hermes Agent |
| License | MIT |
| Platforms | linux, macos, windows |
| Tags | `kanban`, `review`, `quality`, `verification` |

## 参考：完整 SKILL.md

:::info
以下是 Hermes 在该技能被触发时加载的完整技能定义。这就是智能体在技能激活时所看到的指令内容。
:::

# SDLC Review Skill

独立验证从 Kanban 实现运行移交给审查通道的工作，然后批准它、请求更改或上报。本技能审查交付物及其证据，不接管实现者的工作。

## 何时使用

当以下条件全部满足时使用本技能：

- 调度器为从 `review` 通道认领的任务生成了你；
- 实现者提交了一次 `review_requested` 交接；
- 任务在完成前需要独立的裁决。

不要将它用于单独的下游审查卡片。下游卡片是面向审查的规格说明的普通实现工作，并历经自身的生命周期完成。

## 前置条件

- 具备当前任务与运行标识符的 Kanban 工作器上下文。
- 原生 Kanban 工具：`kanban_show`、`kanban_comment`、`kanban_complete`、`kanban_request_changes` 与 `kanban_block`。
- 当交付物是代码时，通过 `read_file`、`search_files` 和 `terminal` 访问工作区。
- 必须能够通过 `kanban_show` 获取任务的原始规格说明、验收标准、交接摘要与先前的运行历史。

## 如何运行

本技能由审查调度器自动加载。在检查文件或选择裁决前，先从 `kanban_show` 开始。

1. 阅读任务规格说明与最新的 `review_requested` 交接。
2. 检查实际交付物并运行相关验证。
3. 选择恰好一种裁决：批准、请求更改或上报。
4. 在终端 Kanban 流转中记录具体证据。

## 快速参考

| 裁决 | 时机 | 最终动作 |
|---|---|---|
| Approve（批准） | 验收标准与验证通过 | `kanban_complete` |
| Request changes（请求更改） | 尚存在可修正的实现缺陷 | 先 `kanban_comment`，再 `kanban_request_changes` |
| Escalate（上报） | 需要人工决策或外部前置条件 | `kanban_block` |

请求更改的流转会将任务返回给其原始实现者。当该实现者再次请求审查且未指定审查者时，持久化的审查者来源信息会将复审路由回同一审查者配置档。

## 审查视角

在每一轮中变化你看待工作的方式，而不是重复同样的检查。去相关的视角能捕获不同类别的缺陷：对产物的冷读会暴露被实现者叙述所掩盖的设计与正确性问题，实际执行会暴露无法复现的声明，严格的契约审计会暴露悄然发生的范围漂移。在第三轮重复第一轮的视角，基本只是重新发现第一轮已经发现的东西。

从任务记录已经提供的历史中确定当前轮次：统计工作器上下文“Prior attempts on this task”部分中 `changes_requested` 条目的数量（在 `kanban_show` 中也可作为先前运行可见）。当前审查轮次为该数量加一。因此第一轮显示零次 `changes_requested` 尝试；第二轮显示一次；依此类推。

| 轮次 | 视角 | 如何应用 |
|---|---|---|
| 1 | Artifact（产物） | 在阅读实现者摘要之前先对差异或交付物进行冷读。形成独立判断，然后将其与交接叙述进行比较，并调查每一处不匹配。 |
| 2 | Execution（执行） | 检出该工作并通过 `terminal` 实际运行它：自行构建、测试并演练所报告的行为。用实证验证每一条交接声明，而不是重新阅读产物。 |
| 3+ | Contract（契约） | 重新阅读原始任务正文与验收标准，然后严格据此审计交付物。还要验证先前每一轮 `kanban_request_changes` 中的每一项是否确实落地。 |

Procedure 部分中的基线职责在每一轮仍然适用；视角决定了你先以何者为主进行审查并最侧重它。

### 临时审查分派中的视角变化

同样的原则也适用于 Kanban 审查通道之外。当通过 `delegate_task` 生成多个并行审查者时，给每个审查者不同的视角——一个仅差异的简报、一个完整上下文的简报、一个检出并运行的简报——而不是相同的简报。相同的简报会产生相关的裁决与重复的发现；变化的简报在相同审查投入下覆盖更多类别的缺陷。

## 流程

### 1. 从持久化任务记录入手

调用 `kanban_show` 并识别：

- 原始任务正文与验收标准；
- 最新的实现摘要与结构化元数据；
- 变更的文件、提交标识符与测试证据；
- 先前运行的评论与决策；
- 先前审查轮次的发现。

将交电视为待验证的声明，而非工作正确的证明。

### 2. 将请求的行为与交付的行为进行比较

将每一条验收标准映射到具体的实现或输出证据。在决定是否运行更深入的检查前，记下遗漏、语义变化与无关范围。

对于代码工作：

1. 使用 `read_file` 和 `search_files` 检查变更的路径及其调用方。
2. 使用 `terminal` 检查差异并运行项目已有的聚焦测试、lint、类型检查或构建命令。
3. 在可行时演练所报告的失败路径以及至少一条普通控制路径。
4. 检查与该变更相关的错误处理、边界情况、并发边界、数据保留、安全边界与跨平台行为。
5. 确认测试断言的是行为，而不仅仅是快照源代码文本或常量。

对于非代码工作：

1. 检查完整的交付物，而不只是其摘要。
2. 检查正确性、完整性、格式与来源。
3. 当引用的 URL 或外部事实影响裁决时，用适当的原生工具进行验证。

### 3. 选择一种裁决

#### 批准

仅当验收标准得到满足且证据充分时才批准。调用：

```text
kanban_complete(
    summary="Reviewed and approved. <what was verified>",
    metadata={"review_outcome": "approved", "reviewer_checks": [...]}
)
```

包含已通过的确切检查以及任何不阻碍接受的有界保留意见。

#### 请求更改

用于具体、可修正的缺陷。首先记录可执行的发现：

```text
kanban_comment(
    task_id="<current-task-id>",
    body="Changes requested:\n1. <file or artifact + defect>\n2. <required correction>",
)
```

然后将同一任务返回给其实现者：

```text
kanban_request_changes(
    reason="<concise summary of the required corrections>"
)
```

说明缺陷所在、如何复现、为何违反任务要求，以及何种最低限度成果才可解决该问题。此流转不使用阻塞者重现计数。

#### 上报

仅在审查者与实现者若无人工决策或外部前置条件便无法解决问题时使用上报：

```text
kanban_block(
    reason="escalation: <decision or prerequisite required>"
)
```

解释被阻塞的决策以及继续所需的最小信息。

### 4. 保持角色分离

在担任审查者时不要编辑实现。请求更改并让实现者产出下一个候选项；然后在下一轮审查运行中独立验证该候选项。

## 陷阱

- **橡皮图章式批准：** 一份通过的交接摘要并非独立证据。
- **审查者代为实现：** 编辑交付物会掩盖归属，并削弱复审边界。
- **含糊的发现：** “需要改进”无法给实现者一个可复现的修正目标。
- **仅因风格而阻塞：** 当行为与仓库标准已满足时，不要因偏好层面的挑剔请求更改。
- **跳过先前轮次：** 复审必须同时确认所请求的修正以及先前已通过行为的保留。
- **将阻塞者用于普通返工：** 可修正的缺陷应归入 `kanban_request_changes`；将 `kanban_block` 保留给真正的外部阻塞者或人工决策。
- **无证据完成：** 每一条批准摘要都必须列出实际检查过的检查项或产物。

## 验证

在提交裁决前，确认：

- [ ] 已为当前任务与运行阅读 `kanban_show`。
- [ ] 每一条验收标准都已映射到证据。
- [ ] 实际交付物已被检查。
- [ ] 相关聚焦检查已运行，或当执行不可行时记录了明确原因。
- [ ] 先前请求的更改在复审中已重新测试。
- [ ] 已考虑无关的回归与范围变更。
- [ ] 裁决恰好使用一个终端动作。
- [ ] 摘要包含具体、非机密的证据。
- [ ] 审查者未编辑任何实现文件。
