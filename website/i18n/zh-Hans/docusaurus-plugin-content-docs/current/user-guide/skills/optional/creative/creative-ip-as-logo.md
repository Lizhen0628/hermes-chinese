---
title: "IP 作为 Logo — 设计极简可爱的 IP 吉祥物标记，在 32px 下依然可辨识"
sidebar_label: "IP 作为 Logo"
description: "设计极简可爱的 IP 吉祥物标记，在 32px 下依然可辨识"
---

{/* 本页面由 website/scripts/generate-skill-docs.py 根据该技能的 SKILL.md 自动生成。请编辑源 SKILL.md，而非此页面。 */}

# IP 作为 Logo

设计极简可爱的 IP 吉祥物标记，在 32px 下依然可辨识。

## 技能元数据

| | |
|---|---|
| 来源 | 可选 — 使用 `hermes skills install official/creative/ip-as-logo` 安装 |
| 路径 | `optional-skills/creative/ip-as-logo` |
| 版本 | `1.0.0` |
| 作者 | s1dashu (https://github.com/s1dashu, 上游 s1dashu/ip-as-logo-skill)，由 Hermes Agent 移植 |
| 许可证 | MIT |
| 平台 | linux, macos, windows |
| 标签 | `logo`, `mascot`, `branding`, `ip-character`, `image-generation`, `creative` |
| 相关技能 | [`pixel-art`](/docs/user-guide/skills/optional/creative/creative-pixel-art) |

## 参考：完整的 SKILL.md

:::info
以下为该技能被触发时 Hermes 加载的完整技能定义。这就是技能激活时智能体看到的指令内容。
:::

# IP 作为 Logo 技能

创作尽可能最简单的可爱 IP 角色：一个紧凑、惹人喜爱的符号，在 `32 × 32` 下仍然可辨识，而不是一幅细节丰富的角色插画。

> **Hermes 适配说明**（本文档其余部分为上游工作流，保持原样 —
> [s1dashu/ip-as-logo-skill](https://github.com/s1dashu/ip-as-logo-skill)
> 提交 [`b1bf517c`](https://github.com/s1dashu/ip-as-logo-skill/commit/b1bf517c54a407452cfaca98a54668cd052f8e63) 的快照，
> 2026 年 8 月 20 日，MIT — 见 `LICENSE`）：
>
> - **图像生成路径**：使用内置的 `image_generate` 工具，并设置
>   `aspect_ratio="square"`。当前生效的后端由用户配置 — 不要选择或切换模型。现代的指令遵循后端（GPT Image、
>   Seedream、FLUX、Grok Imagine）接受包含自然语言 `Constraints:` 行的完整提示词骨架；`image_generate` 不暴露
>   `negative_prompt` 参数，因此始终使用下文所述的主提示词约束模式。
> - **并行候选**：当上游文本提到“子智能体”时，使用
>   `delegate_task`，每个候选一个任务 — 但仅在用户希望提速且批量较大时这样做；否则在同一轮中进行多次顺序的 `image_generate` 调用更简单，并能让所有结果保留在当前会话中。
> - **保存结果**：`image_generate` 返回 URL 或文件路径。将每个候选连同其标签交付给用户（遵循各平台的文件交付约定）；不要重新托管或进行后处理。
> - **QA**：根据下方的交付规则，不要自动检查/重试/筛选
>   候选。仅当用户明确要求合规检查时，才对某个结果运行 `vision_analyze`。

## 何时使用

当用户想要为某个产品、仓库、应用或社区设计吉祥物、IP 角色、品牌角色或“可爱 logo”时使用。

## 前提条件

- 为内置的 `image_generate` 工具配置一个图像生成后端；用 `hermes tools` 检查，如果该工具报告没有后端，就在那里启用一个。
- `vision_analyze` 仅用于明确请求的合规检查；`delegate_task` 仅用于用户希望提速的大型批量任务。

## 流程

1. 从请求中解析出明确的 IP 主体以及可用的产品上下文。不要要求用户选择配色模式，除非他们明确想要控制它。
2. 当用户未指定 IP 主体且当前工作区是一个产品仓库时，先查看相关的只读上下文，然后再提问。优先选择 README、产品文档、包或应用元数据、落地页文案、清单文件和设计 token。当产品用途、主要受众和预期个性可以较为确信地推断出来时，就认为上下文已经足够。
3. 当产品上下文不足时，只在单轮内提出一组合并的背景问题，涵盖产品做什么、服务谁、应该给人什么感觉。不要开启第二轮背景问卷。在得到回答后，以最有依据的解释继续。
4. 一旦上下文充分，生成之前始终先给出三个简明的方向，并明确提议一次性生成六个独立候选。在用户同意之前不要生成，除非当前请求已经明确授权六份输出，或要求智能体无需再次确认直接继续。
5. 审慎地选择所提议的三个方向：
   - 当用户明确指定 IP 主体时，保留该主体，并基于剪影处理、次色区域、标志性特征或个性强调，提出三种不同的设计方案。
   - 当用户未指定 IP 主体时，提出三个真正不同的 IP 主体或隐喻。将每一个对应到不同的产品属性或品牌承诺；不要给出三个没有依据的随意动物。
6. 准确解读用户的回应：
   - 如果用户接受全部三个方向和六图提议，则为每个方向生成两个独立变体，并将其标记为 `A1`、`A2`、`B1`、`B2`、`C1` 和 `C2`。将 `A1`、`B1`、`C1` 分配给左下，将 `A2`、`B2`、`C2` 分配给右下，使每个方向都从两侧各测试一次。
   - 如果用户选择一个方向但接受六张图像，则为该方向生成六个受控变体，并将其标记为 `A1` 到 `A6`。将奇数变体分配给左下，偶数变体分配给右下。
   - 如果用户拒绝提议的数量、方向或分布，请遵循用户的替代指令，不要为默认方案争辩。
   - 对于预先授权的缩减批量（例如“正好生成 2 张”），用户没有选择方向时，优先采用一个方向搭配 N 个变体，标记为 `A1..AN`；在报告中说明该方向及其依据。当前请求已经授权特定批量并禁止进一步确认时，跳过三个方向的提议环节 — 第 4 步中的“始终给出三个方向”规则仅在有可能进行提议环节时适用。
   - 对于其他任何偶数默认批量，将候选平均分配到左下与右下。对于奇数批量，有意地把多余候选分配给任意一侧并记录这一不均衡。除非用户明确要求，不要使用底部居中。
7. 默认每个候选在整个图像中恰好使用三种语义颜色：恰好两种 IP 基础色加恰好一种背景色。面部标记复用这两种 IP 颜色，而不要引入额外的语义颜色。遵循用户关于其他颜色数量的明确要求。保持所需的产品线索、识别特征、复杂度限制以及任何给定的调色板足够一致，以便进行有效比较。
8. 在承诺输出之前，先确定可用的图像生成路径。在 Hermes 中这就是 `image_generate` 工具；如果它报告没有配置后端，请让用户启用一个（`hermes tools`），而不要编造结果。
9. 如果批量很大且用户希望提速，通过 `delegate_task` 并行处理候选（每个任务一个候选，相同的产品简报和共享约束，各自分配一个方向或变体）。否则，通过多次独立的 `image_generate` 调用生成候选。
10. 如果用户提供了背景调色板，将每一个提供的颜色都保留用于背景，除非他们明确表示另有安排。除非用户同时指定主体颜色，否则为主体独立选择恰好两种 IP 基础色，并为上下文也如此选择。不要将任何历史或示例调色板视为可用背景的封闭清单。
11. 使用下方的复杂度预算对每个主体进行抽象。将每个候选生成为独立的完整分辨率方形资产；绝不要要求图像模型合成拼版、网格或多图拼版。在测试仅靠提示词的可复现性时，不要使用之前的候选作为图像参考。
12. 将每一批视为一次性的创意抽取。每个请求的候选只生成一次，然后原样保留并交付每份返回的结果。不要检查输出以阻止交付、将其归类为推荐或不推荐、自动重试，或用后处理进行修补。
13. 保留并标记每一个生成结果。报告每个标签、IP 方向及依据、分配的角落、保存路径、提示词/颜色映射以及尺寸（当后端只返回 URL 而没有像素尺寸时，报告为“后端原生方形” — 不要仅为测量尺寸而检查图像）。将所有结果一起呈现；仅当用户明确要求再抽一次时，才生成优化或替换版本。

在生成之前提出方向时，用一行简洁描述每个方向：`<IP 主体> — <产品关联> — <标志性剪影>`。结尾直接提议使用上述分布生成六张图像。除非用户要求，不要把发现阶段变成一场漫长的品牌工作坊。

## 复杂度预算

- 用大约 `4–7` 个大型基础几何形状，构建一个占主导地位的连续外部轮廓。删除或合并任何不承载身份、表达或辨识度的形状。
- 最多使用一个物种定义性特征：例如一个大大的袋状喙、一对卷曲的角，或一块宽大的面罩。对于无肢体或无明显特征的题材（蛇、幽灵、团块），定义性特征可以是一个轮廓姿态——一团饱满的盘绕、一道波浪形的下摆——而配对特征规则则简化为两只眼睛。
- 最多使用两个大面积内部色区，对应 IP 的两个基础色。面部保留两只眼睛，仅在表情需要时加一个极小的嘴巴。除非对辨识度至关紧要，否则省略眉毛、高光、鼻孔、纹理、外轮廓线和装饰性标记。
- 移除重复的羽毛、鳞片、毛簇、装甲板、纽扣、螺丝、数字、标签和其他插画细节。
- 把简化、可爱和讨喜的婴儿般气质作为决定性品质。在适合题材的前提下，偏向大头、紧凑比例、柔和脸颊、间距较宽的单眼皮/简洁眼睛和平静友好的表情。
- 要求黑色剪影可读，并且在 `32 × 32` 下仍可辨识。如果某个特征在该尺寸下消失或变成噪点，就放大、合并或移除它。

## 形状语言与构图

- 使用厚实、圆润、有分量的轮廓和宽大的色块。
- 禁用尖角、尖耳朵或尖喙、针状尾巴、细触角、细微笑线、狭窄缝隙以及尖锐的火焰或羽毛尖端。将每一个必要的尖端替换为明显钝圆化的末端。
- 显示成对识别特征中的两侧，例如耳朵、角、翅膀、鳃或铃铛。
- 让角色直立并从上指定的左下角或右下角浮现，占据画布约 `85–95%`，使 IP 在视觉上保持主导。
- 当底边或指定侧的裁切能增强从该角浮现的感觉时，欢迎使用裁切，但不要规定精确的边缘接触或固定裁切。
- 除非用户明确要求，否则绝不把角色置于中央或底部中央。
- 在可见构图中保留成对识别特征的两侧。
- 保持画面直立；除非明确要求，绝不旋转画布或倾斜主标志。

## 简洁与视觉处理

- 从大而干净的语义形状和最强烈的简单剪影开始。角色应被人立即理解，早于任何内部特征被注意到。
- 宁可更少、更大、更柔和的形体，也不要额外定义。不要仅为解释解剖结构或材质而添加特征。
- 让面部标记微小、简单且处于从属地位。不要为眼睛、嘴巴、鼻子或其他小特征添加光泽高光或细致的腔体渲染。
- 让指定的背景色在视觉上保持纯实、均匀，没有场景、纹理、光晕、暗角或光照变化。
- 只在 Prompt 骨架中使用那一句话来要求微妙的立体效果。不要将其扩展为数值强度，或对渐变、高光、阴影的指令。生成器附带返回的渐变、明暗或轻微立体感是可以接受的，且不应触发过滤或重试。
- 让所要求的视觉方向保持图形化和简单，而不要要求黏土、充气、塑料、毛绒、玩具化或照片级写实的渲染效果。

## 色彩与画布

- 默认在完整图像中恰好使用三种语义颜色：恰好两种 IP 基础色，加恰好一种背景色。
- 从产品语境、题材身份、预期气质和用户请求中选择两种 IP 颜色。将两者组织为宽大且有意图的色块；其中一种复用于面部标记，另一种保持在单一连续的定义性区域内，而不是散布成装饰性碎片。
- 独立于背景选择两种题材的颜色。合适时应偏向清晰、活泼的题材色，但不要对 IP 强加全局饱和度、OKLCH、色相偏移或色度带。
- 根据语境或用户提供的调色板自由选择背景色。除非用户要求鲜艳色彩，否则通过略微降低饱和度来温和地压低背景；使其清晰有色且有意为之，而不是鲜艳、灰色或浑浊。历史调色板和示例仅供建议，绝不是允许列表或强制默认调色板。
- 保持主导 IP 剪影、面部标记和背景之间清晰的视觉区分。如果用户提供的背景导致区分度不足，先调整题材颜色，而不是替换所要求的背景。
- 在一批中，有意识地变换两种 IP 颜色的策略，而不是重复同一套中性色偏重的组合。
- 将两个角色颜色视为语义色家族。任一家族内的附带色调变化不会使输出作废。
- 直接命名所期望的纯实背景色。要求它填满每个开放区域和未被占据的角落，而指定浮现的角落由角色占据。不要在生成提示词中使用 `opaque`、`alpha` 或 `transparency` 等图像模式术语。
- 生成一个正方形的 `1:1` 正方形，外边角为直角（在 `image_generate` 中使用 `aspect_ratio="square"`）。按后端原生方形分辨率原样接受；绝不要仅为达到特定像素数量而重采样。

## 提示词骨架

把请求的视觉对象仅描述为一张图像。绝不要告诉图像生成器该图像是 `logo`、`brand mark`、`app icon`、`icon asset`，或用于任何上述用途。不要在前面添加会暴露此类用途的使用场景或资产类型框架。此规则仅适用于生成提示词；周围的用户对话和技能名称仍可描述更广泛的项目。

`image_generate` 只接收单个提示词字符串，因此务必把自然语言的 `Constraints:` 行保留在主提示词内（没有独立的负面提示词通道）。在生成报告中记录每个候选图所用的提示词与颜色映射。

```text
Create one complete full-bleed 1:1 square image.
Background: fill the entire square with solid <background>. Keep <background> visible in every open area and in the corners not occupied by the character; the assigned emergence corner must be occupied by the character.
Subject: place one extremely simplified, cute, endearing <subject> IP character on the background, reduced to one soft rounded continuous silhouette and one defining feature.
Complexity: use only 4–7 large basic shapes and at most two broad internal color regions. Use two simple eyes and add one tiny mouth only when it helps the expression. Remove every nonessential line, outline, anatomical detail, texture, and decoration. Keep the character readable at 32 × 32.
Color behavior: use exactly three semantic colors in the complete image: exactly two IP base colors plus the background color. Choose the two IP colors from the subject and context, organize both into broad purposeful masses, and reuse them for facial marks. Choose the background independently or follow the user's supplied background. Unless the user asks for vivid color, lower the background saturation slightly so it feels gently muted and restrained while remaining clearly chromatic, clean, and intentional rather than gray or muddy. Keep the IP, facial marks, and background clearly separated. Treat any example palette as optional inspiration, never as an allowlist.
Composition: keep the character upright and emerging from the assigned <lower-left or lower-right>, filling about 85–95% of the square so it remains visually dominant. Cropping at the bottom or assigned side is welcome when it strengthens the corner emergence. Preserve both paired identifying features. Never center or bottom-center the character.
Style: make simplification, cuteness, and lovable baby-like appeal the strongest qualities. Use large soft forms, compact proportions, thick rounded contours, and an ultra-clean graphic treatment. Prefer one clear shape over several explanatory details. Add an extremely, extremely subtle, almost imperceptible sense of depth through a barely-there neo-skeuomorphic treatment.
Finish: show only the character on the full-canvas background, with clean surfaces and normal square outer corners.
Constraints: Use no text or watermark. Add no borders, frames, cards, or presentation masks. Include one character only, with no extra subjects or scenery. Use no fragile lines, sharp tips, unnecessary outlines, tiny details, or decorative marks. Add no photorealistic material, dramatic bevel, glossy hotspot, deep occlusion, extrusion, strong three-dimensional rendering, or external cast shadow. Keep the background solid and uniform, with no texture, vignette, or lighting variation.
```

## 交付行为

- 把生成视为一次随机抽取，而非一致性测试。
- 一次性生成所需数量的独立候选图，并交付每一张返回的图像。
- 默认不要检查或报告 alpha、透明度或背景模式。
- 不要因为背景、颜色、细节、构图、渐变、明暗或立体感而阻止交付、将候选图评定为合规或不合规、标记为推荐或不推荐，或自动重试任何结果。
- 不要对结果进行后处理以使其看起来更合规。如果用户之后要求另一方向或替换，请针对该明确请求生成一个新的独立候选图。

## 常见陷阱

- 最大的失败模式是细节蔓延：模型会添加描边、纹理、额外颜色和场景。提示词骨架中的 `Constraints:` 行是关键支撑——绝不要删减它。
- 在生成提示词中把资产称为 "logo" 或 "icon" 会触发展示性框架（徽章、卡片、样机）。让提示词保持纯粹图形化。
- 用一次调用请求变体的网格/拼版会生成小而前后不一致的角色。始终每次调用只生成一个候选图。
- 如果一批中两个候选图返回结果几乎相同，这属于正常的随机行为——两个都交付；不要悄悄重新生成。

## 验证

- 每个交付的候选图在最终报告中都有标签、方向理由、指定角落、提示词/颜色映射，以及文件路径或 URL。
- 批次数量与用户批准的一致；没有任何候选图被扣留、重试或后处理。
