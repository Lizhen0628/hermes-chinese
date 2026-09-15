---
title: "创意构思 — 通过创意实践中的命名方法生成点子"
sidebar_label: "创意构思"
description: "通过创意实践中的命名方法生成点子"
---

{/* 本页面由 website/scripts/generate-skill-docs.py 从技能的 SKILL.md 自动生成。请编辑源 SKILL.md，而非本页面。 */}

# 创意构思

通过创意实践中的命名方法生成点子。

## 技能元数据

| | |
|---|---|
| 来源 | 可选 — 通过 `hermes skills install official/creative/creative-ideation` 安装 |
| 路径 | `optional-skills/creative\creative-ideation` |
| 版本 | `2.1.0` |
| 作者 | SHL0MS |
| 许可证 | MIT |
| 平台 | linux, macos, windows |
| 标签 | `Creative`, `Ideation`, `Brainstorming`, `Methods`, `Inspiration` |

## 参考：完整 SKILL.md

:::info
以下是 Hermes 在触发此技能时加载的完整技能定义。这就是技能激活时智能体看到的指令。
:::

# 创意构思

一个适用于任何领域的构思方法库。阅读用户的情况，路由到匹配的方法，应用它，生成具体而不显而易见的输出。方法只是工具 — 为情况挑选合适的那个，不要全部执行。

## 何时使用

任何开放式的生成性或选择性问题："我想做/构建/写/开始点什么"、"我卡住了"、"给我点灵感"、"让它更怪一点"、"帮我选一个"、"我需要发明某个东西"、"给我一个研究问题"。

## 操作规则

1. **约束加方向就是创意。** 没有约束 = 没有牵引力。没有方向 = 没有形状。方法同时提供两者。
2. **拒绝最初三个点子。** 它们是废话。生成、丢弃、重新生成。参见 `references/anti-slop.md`。
3. **每次回复只用一个方法，除非用户要求。** 不要堆叠。
4. **具体胜过抽象。** 真实的专有名词、真实的材料、真实的机制。"一个做 X 的应用"是废话；"一个 200 行的 CLI 工具，当 Z 时打印 Y"才是方向。说出技术栈不是具体 — 要说出机制。
5. **怪也必须好。** 打破框架是目标，但一个怪异却没有真实场景、机制或存在理由的点子本身就是一种失败模式。每一组点子至少必须包含一个真正*现在就可构建/可推进*的 — 不显而易见但有根基，且有一个真实的第一步。不要用实用性去换取全部的惊奇。
6. **说出你使用的方法以及谁发明了它。** 署名是在唤起这份纪律。
7. **当用户选定一个时，就把它做出来。** 在他们选定之后不要再继续生成。

## 路由 — 4 步流程

在生成任何输出*之前*做这件事。路由失败会产出废话。

如果更清晰，你可以跳过对路由步骤的叙述，但**绝不要以牺牲每个点子的深度为代价去压缩**：每个点子的具体机制、情境绑定以及诚实的失败模式，正是让输出变好的东西（这是可衡量的） — 它们是支柱，不是脚手架，不要砍掉它们。

### 第 1 步 — 从提示中提取三个信号

**PHASE（阶段）** — 用户处于哪个阶段？

| 阶段 | 线索 |
|---|---|
| **GENERATING（生成）** | "给我一个点子"、"我该做什么"、"给我点灵感"、还没有点子 |
| **EXPANDING（扩展）** | "还有什么"、"更多像这样的"、"给我变体" — 已有一个基础点子 |
| **SELECTING（选择）** | "帮我选"、"我该做哪个"、"我有这些选项" |
| **UNBLOCKING（破局）** | "我卡住了"、"被堵住了"、"兜圈子"、"陈旧" — 有素材 |
| **SUBVERTING（颠覆）** | "让它更怪"、"不那么显而易见"、"太保守了" |
| **REFINING（打磨）** | "这还不错但少了点什么"、"感觉毛毛糙糙" |
| **SYNTHESIZING（综合）** | "我有一堆笔记/访谈/观察" |

**DOMAIN（领域）** — 用户在制作/做什么？

| 领域 | 线索 |
|---|---|
| **TEXT（文本）** | 小说、文章、诗、歌词、剧本、文案 |
| **OBJECT（物件）** | 视觉艺术、音乐、声音、表演、装置、雕塑 |
| **ARTIFACT（人工物）** | 软件、硬件、机械、设备 |
| **SYSTEM（系统）** | 组织、市政、机构、生态、社区 |
| **SELF（自我）** | 人生决策、职业、个人实践 |
| **RESEARCH（研究）** | 论文、学位论文、学术问题 |
| **PRODUCT（产品）** | 商业、市场、服务 |

**SPECIFICITY（具体程度）** — 提示中有多少约束？

| 级别 | 线索 |
|---|---|
| **NONE（无）** | "我很无聊"、"给我点灵感" — 没有领域，没有项目 |
| **DOMAIN（领域）** | "我想写点东西" — 知道领域，没有项目 |
| **PROJECT（项目）** | "我正在做一个具体的 X" |
| **PROBLEM（问题）** | "我在 X 内有一个具体的摩擦点" |

### 第 2 步 — 应用覆盖规则（最高优先级，最先触发）

覆盖规则优先于路由表：

- **情绪信号** — 用户说"怪"、"奇怪"、"出人意料"、"不那么显而易见"、"更有意思" → `references/methods/lateral-provocations.md` 或 `references/methods/pataphysics.md`，不论领域。
- **用户点名了方法** — 使用它。
- **用户要求推荐方法**（"用哪个方法"）→ 呈现 2–3 个候选，每个一行，询问应用哪一个。不要默默默认。
- **高废话风险地带** — "AI 点子"、"创业点子"、"习惯追踪器"、"生产力/健康/健身/食物/旅行应用" → 强制使用 `references/methods/lateral-provocations.md` 或 `references/methods/pataphysics.md`，而非显而易见的方法。拒绝最初 **5** 个点子，而不是 3 个。

### 第 3 步 — 先按阶段路由，再按领域

**按阶段（不论领域均适用）：**

| 阶段 | 默认路由 |
|---|---|
| GENERATING + SPECIFICITY=NONE | `references/full-prompt-library.md` 的 **General** 部分（约束分发） |
| GENERATING + 已知 DOMAIN | 按领域路由（见下表） |
| EXPANDING | `references/methods/scamper.md` |
| SELECTING | `references/methods/premortem-and-inversion.md`（或用于上行空间的 `references/methods/compression-progress.md`） |
| UNBLOCKING | `references/methods/oblique-strategies.md` |
| SUBVERTING | `references/methods/lateral-provocations.md`（回退到 `references/methods/pataphysics.md`） |
| REFINING（文本） | `references/methods/defamiliarization.md` |
| REFINING（其他） | `references/methods/creative-discipline.md`（Tharp 的脊柱） |
| SYNTHESIZING | `references/methods/affinity-diagrams.md` |
| 需要快速产出大量 | `references/methods/volume-generation.md` |

**按领域（当 GENERATING 且已知 DOMAIN 时）：**

| 领域 | 默认路由 |
|---|---|
| TEXT — 形式/诗歌 | `references/methods/oulipo.md` |
| TEXT — 叙事 | `references/methods/story-skeletons.md` |
| TEXT — 有可混编的素材 | `references/methods/chance-and-remix.md` |
| OBJECT（音乐、视觉、表演） | `references/methods/oblique-strategies.md` |
| OBJECT — 实体制作者/想要一个起始约束 | `references/full-prompt-library.md` 的 **Physical / object** 部分 |
| ARTIFACT — 想要一个起始约束 | `references/full-prompt-library.md` 的 **Software / artifact** 部分 |
| ARTIFACT — 存在参数冲突的工程发明 | `references/methods/triz-principles.md` |
| ARTIFACT — 软件架构 | `references/methods/pattern-languages.md` |
| ARTIFACT — 有自然系统可类比 | `references/methods/biomimicry.md` |
| ARTIFACT — 积累了要质疑的假设 | `references/methods/first-principles.md` |
| SYSTEM（市政、组织、机构） | `references/methods/leverage-points.md` |
| SYSTEM — 集体/参与式 | `references/full-prompt-library.md` 的 **Social / collective** 部分 |
| SELF（人生、职业、学什么） | `references/methods/derive-and-mapping.md` |
| RESEARCH — 选择一个问题 | `references/methods/compression-progress.md` |
| RESEARCH — 攻克一个已知问题 | `references/methods/polya.md` |
| PRODUCT（商业、服务） | `references/methods/jobs-to-be-done.md` |
| 需要打破框架/寻找类比 | `references/methods/analogy-and-blending.md` |

### 第 4 步 — 处理模糊与矛盾

- **多条路径都说得通** → 挑选最贴近用户实际措辞的那条。不要为了显得高深而挑最有趣的方法。
- **真正模糊** → 提一个澄清问题，不要默默猜测。例如：*"你是在生成点子，还是在已有点子之间挑选？"* / *"这是用于小说、文章，还是别的什么？"*
- **信号矛盾**（例如"怪的创业点子" → 产品领域 + 怪的情绪）→ **显式叠加两个方法**。说明你在做什么：*"用 `jobs-to-be-done` 做产品框架 + `lateral-provocations` 来打破显而易见的形状。"*
- **无匹配** → 约束分发（`references/full-prompt-library.md`）是安全的回退。
- **同一个问题又问了一遍** → 换个方法。方法的变体 = 点子分布的变体。

### 反默认检查（生成前运行）

- 正打算写"这里有 5 个点子："或一个裸的编号列表？ → 停下。先挑一个方法。
- 正打算默认进入通用 LLM 模式的头脑风暴？ → 停下。挑选上面的一条路径。
- 输出看起来像一个未经路由的 LLM 会产出的东西？ → 路由失败，重做。

默认的 LLM 模式正是此技能存在的目的所在。如果你不做路由就生成，你就已经击败了这个技能。

更深层的边缘情况（情绪信号、叠加、反模式）参见 `references/heuristics.md`。

## 输出格式

对于约束分发默认路径：

```
## Constraint： [名称] — 来自 [来源]
> [约束，一句话]

### 点子

1. **[一句话推介]**
   [2-3 句话 — 具体做了什么东西，为什么它有意思]
   ⏱ [周末/周/月]  •  🔧 [技术栈/媒介/材料]

2. ...
3. ...
```

对于其他方法，使用该方法指定的格式（TRIZ 产出矛盾分析；OuLiPo 产出受限文本；Oblique Strategies 产出一张已应用的卡片 → 下一步行动）。不要强行把每个方法塞进约束模板。

**每一组点子，不论方法：**
- 说出使用的方法。在高废话风险地带，说出你拒绝了哪些显而易见的点子。
- 给每个点子它的具体机制以及它诚实的失败模式/取舍/适合谁。这种深度正是让点子立得住的原因 — 这是可衡量的，不是装饰。
- 至少把一个点子标为 **有根基的** — 现在就可构建/可推进，不显而易见但有一个真实的第一步。其他的可以更偏向怪异；这一个必须真正可做。不要让整组都怪而不切实际。

## 文件地图

- `references/full-prompt-library.md` — 约束库，按领域分节（General、Software、Physical、Social、Lists）。SPECIFICITY=NONE 时的默认路径。
- `references/method-catalog.md` — 每个方法的一行摘要 + 何时使用
- `references/heuristics.md` — 用于边缘情况的扩展决策树
- `references/anti-slop.md` — 反废话规则；适用于每个输出
- `references/exercises.md` — 限时练习（5 分钟/30 分钟/1 小时/一天/一周）
- `references/methods/` — 22 个命名方法，每个一个文件，只加载你要用的那个

## 署名

约束分发核心改编自 [wttdotm.com/prompts.html](https://wttdotm.com/prompts.html)。方法取自各方法文件中引用的原始来源。
