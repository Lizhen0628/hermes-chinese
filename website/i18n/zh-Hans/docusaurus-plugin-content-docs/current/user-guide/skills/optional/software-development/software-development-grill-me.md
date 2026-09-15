---
title: "Grill Me — 实现前的对抗式方案访谈"
sidebar_label: "Grill Me"
description: "实现前的对抗式方案访谈"
---

{/* 此页面由 website/scripts/generate-skill-docs.py 从技能的 SKILL.md 自动生成。请编辑源 SKILL.md，而非此页面。 */}

# Grill Me

实现前的对抗式方案访谈。

## 技能元数据

| | |
|---|---|
| 来源 | 可选 — 使用 `hermes skills install official/software-development/grill-me` 安装 |
| 路径 | `optional-skills/software-development\grill-me` |
| 版本 | `2.0.0` |
| 作者 | Rafael Zendron (rafaumeu) + Matt Pocock (mattpocock/skills, grilling) + Hermes Agent |
| 许可证 | MIT |
| 平台 | linux, macos, windows |
| 标签 | `planning`, `adversarial`, `interview`, `decision-tree`, `pre-implementation`, `review`, `alignment` |
| 相关技能 | [`requesting-code-review`](/docs/user-guide/skills/bundled/software-development/software-development-requesting-code-review), [`subagent-driven-development`](/docs/user-guide/skills/optional/software-development/software-development-subagent-driven-development), [`test-driven-development`](/docs/user-guide/skills/bundled/software-development/software-development-test-driven-development) |

## 参考：完整的 SKILL.md

:::info
以下是 Hermes 在此技能被触发时加载的完整技能定义。这就是技能激活时智能体看到的指令内容。
:::

# Grill Me

在写下任何代码之前，通过结构化的对抗式提问对方案进行压力测试。将方案建模为一棵**设计树**——每个决策都分支为挂靠其下的决策——并分轮访谈用户，直到每一分支都已解决，没有任何内容被悄然假设。

结合了原始版本的分阶段纪律与 mattpocock/skills 中 `grilling` 的前沿轮次机制。

## 何时使用

- 用户说“grill me”、“访谈我的方案”、“对这个想法做压力测试”
- 复杂工作之前：鉴权流程、schema 变更、迁移、支付
- 方案中存在未解决的决策，或显得含糊不清
- 在进行 `subagent-driven-development` 分解之前

不要用于现有代码（请使用 `requesting-code-review`）或简单的一次性任务。

## 前置条件

无。该技能适用于任何方案或原始想法。

## 核心机制：前沿轮次

将方案映射为一棵设计树。**前沿**是所有前置条件已确定的决策——也就是你现在无需猜测尚未听到的答案就能提出的问题。

以**轮次**推进：在一条消息中提出当前整个前沿的所有问题，编号列出，每个问题都附带你推荐的答案。然后等待。若某个问题的答案取决于本轮中另一个仍未解决的问题，那么它属于之后的轮次，而非本轮。

每一轮的格式如下：

```
❓ Q1 — <问题标题>：<问题正文，如相关可列出选项>
➡️ 推荐：<你推荐的答案 + 一行理由>

❓ Q2 — <问题标题>：<问题正文>
➡️ 推荐：<...>
```

每个答案都会重塑这棵树：已确定的决策将前沿向外推进，并解锁依赖的问题。重新计算前沿并提出下一轮。

**查找事实是你的职责；做决策是用户的职责。** 当前沿问题需要来自环境（代码库、文件系统、配置、文档）的事实时，用 `search_files` / `read_file` / `terminal` 自行查找——或者对于繁重的探查，通过 `delegate_task` 派发一个子智能体。绝不要向你本可以自行查找的对用户提问。不要因某项探查而阻塞：只有其下游的问题需要等待；本轮其余问题现在就问。

## 问题覆盖范围（将这些分支纳入树中）

**理解** —— 真正的目标与边界：
- 实际的目的是什么？什么是明确**在范围内**和**在范围外**的？
- 有哪些约束（时间、技术、团队、预算）？用户是谁？

**技术决策** —— 对每个架构选择：
- “为什么用这种方法而不是 X？”/“如果 Y 失败了会怎样？”
- “最坏情况是什么？”/“你会如何回滚？”
- 交叉参考现有代码库；如果项目对此已有既定模式，请指出来。

**边界情况：**
- “如果用户做了 Z 会怎样？”/“如果依赖 X 宕机了会怎样？”
- “如果量级是预期的 100 倍会怎样？”/“有哪些安全方面的影响？”

## 综合（当前沿为空时）

1. 用要点总结所有决策
2. 列出任何仍悬而未决的事项，以及明确**在范围外**的内容
3. 询问：“达成一致了吗？我应该开始实现，还是需要调整什么？”

在用户确认共识之前，不要依据该方案采取行动。

## 陷阱

1. **按依赖顺序之外提问。** 一个依赖未解答问题的问题，不过是个戴着问号的猜测。把它留到后一轮。
2. **跳过代码库。** 用 Hermes 工具在代码中查找事实，而不是询问用户。
3. **把“我不知道”当作最终答案接受。** 提出选项、解释权衡、给出推荐。
4. **在问询期间写代码。** 只做对齐——得到明确的绿灯之后再写代码。
5. **过于顺从。** 你的职责是找出问题。如果一切看起来都没问题，那就更深入地找。
6. **不适应用户的语言。** 用用户所说的任何语言进行访谈。

## 验证

- [ ] 轮次中的每个问题，其所有前置条件都已解决
- [ ] 每个问题都附有推荐答案
- [ ] 探查了代码库以获取事实，而非询问用户
- [ ] 在综合之前前沿已为空（没有分支被悄然假设）
- [ ] 产出了所有决策与悬而未决事项的清晰总结
- [ ] 在停止之前确认了用户的一致认同
