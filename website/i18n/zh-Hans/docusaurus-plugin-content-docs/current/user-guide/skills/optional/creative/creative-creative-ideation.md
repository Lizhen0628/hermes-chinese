---
title: "创意构思 — 通过创意实践中的命名方法生成想法"
sidebar_label: "创意构思"
description: "通过创意实践中的命名方法生成想法"
---

{/* 本页面由 website/scripts/generate-skill-docs.py 根据该技能的 SKILL.md 自动生成。请编辑源 SKILL.md，而非此页面。 */}

# 创意构思

通过创意实践中的命名方法生成想法。

## 技能元数据

| | |
|---|---|
| 来源 | 可选 — 使用 `hermes skills install official/creative/creative-ideation` 安装 |
| 路径 | `optional-skills/creative\creative-ideation` |
| 版本 | `2.1.0` |
| 作者 | SHL0MS |
| 许可证 | MIT |
| 平台 | linux, macos, windows |
| 标签 | `Creative`、`Ideation`、`Brainstorming`、`Methods`、`Inspiration` |

## 参考：完整 SKILL.md

:::info
以下是 Hermes 在触发该技能时加载的完整技能定义。当技能处于激活状态时，这就是智能体看到的指令内容。
:::

# 创意构思

一个适用于任何领域的构思方法库。解读用户的情境，路由到匹配的方法，加以应用，生成具体且非显而易见的结果。方法是工具——为情境挑选合适的那一个，不要把它们全都执行一遍。

## 何时使用

任何开放式的生成性或选择性提问：“我想做／构建／写／开始点什么”、“我卡住了”、“给我点灵感”、“让这个更古怪一些”、“帮我挑一个”、“我需要发明 X”、“给我一个研究问题”。

## 运行规则

1. **约束加方向才是创造力。** 没有约束 = 没有抓地力。没有方向 = 没有形状。方法同时提供两者。
2. **拒绝前三个想法。** 它们是垃圾。生成、丢弃、重新生成。参见 `references/anti-slop.md`。
3. **除非被要求，每次回复只用一个方法。** 不要堆叠。
4. **具体优于抽象。** 真实的专有名词、真实的材料、真实的机制。“一个用于 X 的应用”是垃圾；“一个 200 行的 CLI 工具，当 Z 时打印 Y”才是方向。说出技术栈不算具体——要说出一个机制。
5. **古怪也必须好。** 打破框架是目标，但一个怪异却没有真实情境、机制或存在理由的想法，本身就是一种失败模式。每组想法必须至少包含一个真正*现在就可构建／可追求*的想法——非显而易见但脚踏实地，有真实的第一步。不要用全部实用性去换取惊喜。
6. **说出你使用的方法以及是谁发明的。** 归功能唤起那份纪律。
7. **当用户挑中一个时，就把它做出来。** 他们已经选定后，不要再继续生成。

## 路由 — 4 步流程

在生成任何输出*之前*做这件事。路由失败会产生垃圾。

如果更清爽，你可以跳过对路由步骤的叙述，但**绝不要以牺牲每个想法的深度为代价来压缩**：每个想法的具体机制、情境绑定和诚实的失败模式，才是让输出变好的关键（可衡量）——它们不是脚手架，不要砍掉。

### 第 1 步 — 从提示中提取三个信号

**PHASE**（阶段）——用户处于哪个阶段？

| 阶段 | 线索 |
|---|---|
| **GENERATING**（生成） | “给我个想法”、“我该做什么”、“给我点灵感”，还没有想法 |
| **EXPANDING**（扩展） | “还有什么”、“更多像这样的”、“给我一些变体”——已有一个基础想法 |
| **SELECTING**（选择） | “帮我挑一个”、“我该做哪个”、“我有这些选项” |
| **UNBLOCKING**（破阻） | “我卡住了”、“被卡住了”、“兜圈子”、“陈旧了”——已有素材 |
| **SUBVERTING**（颠覆） | “让它更古怪”、“少一些显而易见”、“这太安全了” |
| **REFINING**（打磨） | “这个不错但缺点什么”、“感觉还很粗糙” |
| **SYNTHESIZING**（综合） | “我有一堆笔记／访谈／观察” |

**DOMAIN**（领域）——用户在做什么？

| 领域 | 线索 |
|---|---|
| **TEXT**（文本） | 小说、散文、诗歌、歌词、剧本、文案 |
| **OBJECT**（物件） | 视觉艺术、音乐、声音、表演、装置、雕塑 |
| **ARTIFACT**（人造物） | 软件、硬件、机制、设备 |
| **SYSTEM**（系统） | 组织、市政、机构、生态、社群 |
| **SELF**（自我） | 人生决策、职业、个人实践 |
| **RESEARCH**（研究） | 论文、学位论文、学术问题 |
| **PRODUCT**（产品） | 商业、市场、服务 |

**SPECIFICITY**（具体度）——提示中有多少约束？

| 层级 | 线索 |
|---|---|
| **NONE**（无） | “我很无聊”、“给我点灵感”——没有领域，没有项目 |
| **DOMAIN**（领域） | “我想写点东西”——知道领域，没有项目 |
| **PROJECT**（项目） | “我正在做这个特定的 X” |
| **PROBLEM**（问题） | “我在 X 里遇到了这个具体的摩擦” |

### 第 2 步 — 应用覆盖规则（最高优先级，先触发）

覆盖规则优先于路由表：

- **情绪信号** — 用户说“古怪”、“奇怪”、“令人惊讶”、“少一些显而易见”、“更有趣” → 使用 `references/methods/lateral-provocations.md` 或 `references/methods/pataphysics.md`，不论领域为何。
- **用户点名某个方法** — 就用它。
- **用户请求方法推荐**（“用哪个方法”）→ 列出 2–3 个候选，各配一行说明，问要用哪一个。不要默默默认。
- **高垃圾地形** — “AI 点子”、“创业点子”、“习惯追踪器”、“生产力／健康／健身／美食／旅行应用” → 强制使用 `references/methods/lateral-provocations.md` 或 `references/methods/pataphysics.md`，而非那个显而易见的默认方法。拒绝前 **5** 个想法，而非 3 个。

### 第 3 步 — 先按阶段路由，再按领域

**按阶段（不论领域均适用）：**

| 阶段 | 默认路由 |
|---|---|
| GENERATING + SPECIFICITY=NONE | `references/full-prompt-library.md` 的 **常规** 部分（约束调度） |
| GENERATING + 已知 DOMAIN | 按领域路由（见下表） |
| EXPANDING | `references/methods/scamper.md` |
| SELECTING | `references/methods/premortem-and-inversion.md`（或用于上行空间的 `references/methods/compression-progress.md`） |
| UNBLOCKING | `references/methods/oblique-strategies.md` |
| SUBVERTING | `references/methods/lateral-provocations.md`（备选 `references/methods/pataphysics.md`） |
| REFINING（文本） | `references/methods/defamiliarization.md` |
| REFINING（其他） | `references/methods/creative-discipline.md`（Tharp 的脊柱） |
| SYNTHESIZING | `references/methods/affinity-diagrams.md` |
| 需要快速产出大量内容 | `references/methods/volume-generation.md` |

**按领域（当 GENERATING 且已知 DOMAIN 时）：**

| 领域 | 默认路由 |
|---|---|
| TEXT — 形式／诗歌 | `references/methods/oulipo.md` |
| TEXT — 叙事 | `references/methods/story-skeletons.md` |
| TEXT — 有素材可混搭 | `references/methods/chance-and-remix.md` |
| OBJECT（音乐、视觉、表演） | `references/methods/oblique-strategies.md` |
| OBJECT — 实体制作者／想要一个起始约束 | `references/full-prompt-library.md` 的 **实体／物件** 部分 |
| ARTIFACT — 想要一个起始约束 | `references/full-prompt-library.md` 的 **软件／人造物** 部分 |
| ARTIFACT — 有参数冲突的工程发明 | `references/methods/triz-principles.md` |
| ARTIFACT — 软件架构 | `references/methods/pattern-languages.md` |
| ARTIFACT — 有自然系统类比 | `references/methods/biomimicry.md` |
| ARTIFACT — 有累积的假设待质疑 | `references/methods/first-principles.md` |
| SYSTEM（市政、组织、机构） | `references/methods/leverage-points.md` |
| SYSTEM — 集体／参与式 | `references/full-prompt-library.md` 的 **社会／集体** 部分 |
| SELF（人生、职业、学什么） | `references/methods/derive-and-mapping.md` |
| RESEARCH — 挑选一个问题 | `references/methods/compression-progress.md` |
| RESEARCH — 攻克一个已知问题 | `references/methods/polya.md` |
| PRODUCT（商业、服务） | `references/methods/jobs-to-be-done.md` |
| 需要打破一个框架／找到类比 | `references/methods/analogy-and-blending.md` |

### 第 4 步 — 处理歧义与矛盾

- **多条路径都说得通** → 挑选最接近用户实际措辞的那一条。不要为了显得老练而挑最有趣的方法。
- **确实有歧义** → 问一个澄清问题，不要默默猜测。例如：*“你是在生成想法，还是在已有想法之间挑选？”* / *“这是用于小说、散文，还是别的什么？”*
- **信号矛盾**（例如“古怪的创业点子” → 产品领域 + 古怪情绪）→ **明确地叠加两个方法**。说明你在做什么：*“用 `jobs-to-be-done` 做产品框架 + 用 `lateral-provocations` 去打破显而易见的形状。”*
- **没有匹配** → 约束调度（`references/full-prompt-library.md`）是安全的备选。
- **同样的提问再次出现** → 换方法。方法的变化 = 想法分布的变化。

### 反默认检查（在生成前运行）

- 即将写下“这里有 5 个想法：”或一个裸露的编号列表？→ 停。先选方法。
- 即将默认进入泛泛的 LLM 模式头脑风暴？→ 停。从上面选一条路径。
- 输出看起来像是一个未经路由的 LLM 会产出的东西？→ 路由失败，重做。

默认的 LLM 模式恰恰是本技能存在的意义所在——去取代它。如果你未经路由就生成，你就是被这个技能给战胜了。

关于更深入的边缘情况（情绪信号、叠加、反模式），参见 `references/heuristics.md`。

## 输出格式

针对约束调度的默认路径：

```
## 约束：[名称] — 来自 [来源]
> [那个约束，一句话]

### 想法

1. **[一句话定位]**
   [2-3 句话——具体做出了什么，为什么有趣]
   ⏱ [周末／周／月]  •  🔧 [技术栈／媒介／材料]

2. ...
3. ...
```

对于其他方法，使用该方法指定的格式（TRIZ 产出的是矛盾分析；OuLiPo 产出的是受约束的文本；Oblique Strategies 产出一张应用后的单张卡片 → 下一步行动）。不要强迫每个方法都套进约束模板。

**每一组想法，不论方法为何：**
- 说出所使用的方法。在高垃圾地形上，说出你拒绝的那些显而易见想法。
- 给每个想法它的具体机制和它诚实的失败模式／权衡／适合谁。这种深度才是让想法落地的关键——可衡量，而非装饰性。
- 至少把其中一个想法标记为**脚踏实地**的那个——现在就可构建／可追求，非显而易见但有真实的第一步。其余的可以跑得更远更怪；这一个必须真正可做。不要让整组想法只剩古怪而不实用。

## 文件地图

- `references/full-prompt-library.md` — 约束库，按领域分节（常规、软件、实体、社会、清单）。SPECIFICITY=NONE 时的默认路径。
- `references/method-catalog.md` — 每个方法的一行摘要 + 何时使用
- `references/heuristics.md` — 用于边缘情况的扩展决策树
- `references/anti-slop.md` — 反垃圾规则；适用于每次输出
- `references/exercises.md` — 限时练习（5 分钟／30 分钟／1 小时／一天／一周）
- `references/methods/` — 22 个具名方法，每个一个文件，只加载你正在使用的那个

## 来源归属

约束调度核心改编自 [wttdotm.com/prompts.html](https://wttdotm.com/prompts.html)。方法取自每个方法文件中所标注的一手来源。
