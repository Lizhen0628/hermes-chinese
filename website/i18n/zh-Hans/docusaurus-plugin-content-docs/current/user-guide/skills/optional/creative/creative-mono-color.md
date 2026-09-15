---
title: "Mono Color —— 生成单色或双色编辑印刷海报图像"
sidebar_label: "Mono Color"
description: "生成单色或双色编辑印刷海报图像"
---

{/* 本页由 website/scripts/generate-skill-docs.py 依据该技能的 SKILL.md 自动生成。请编辑源 SKILL.md，而非本页。 */}

# Mono Color

生成单色或双色编辑印刷海报图像。

## 技能元数据

| | |
|---|---|
| Source | Optional —— 使用 `hermes skills install official/creative/mono-color` 安装 |
| Path | `optional-skills/creative/mono-color` |
| Version | `1.0.0` |
| Author | Yan Liu（由 Nous Research 改编） |
| License | MIT |
| Platforms | linux、macos、windows |
| Tags | `design`、`poster`、`print`、`duotone`、`risograph`、`editorial`、`image-generation` |
| 相关技能 | [`baoyu-infographic`](/docs/user-guide/skills/bundled/creative/creative-baoyu-infographic)、[`meme-generation`](/docs/user-guide/skills/optional/creative/creative-meme-generation)、[`pixel-art`](/docs/user-guide/skills/optional/creative/creative-pixel-art) |

## 参考：完整 SKILL.md

:::info
以下为 Hermes 在本技能被触发时加载的完整技能定义。这就是技能激活后智能体所看到的指令。
:::

# 单色编辑印刷技能

将任意用户主题、句子或参考照片转化为一件原创的印刷编辑成品，使用同一种稳定的视觉语言：自适应中性基底 + 一种或两种油墨 + 机械复制的图像 + 字体张力 + 简洁的人类语气。

本技能设计并生成图像；它不模仿任何单一参考，不复制来源的构图、措辞、标识或图稿，且使用的印刷油墨从不超过两种。

## 何时使用

当用户要求单色编辑海报、双色印刷、孔版印刷/独立杂志海报、网点照片处理、单墨或双墨封面，或直接点名 mono-color 风格时。中文触发词包括 单色海报、双色印刷、单色调视觉、蓝色/绿色孔版印刷、网点照片、复古或当代编辑排版。不要仅仅因为请求中提到了某个颜色就触发。

## 前置条件

- Hermes 的 `image_generate` 工具（若未加载，请通过延迟工具目录 search/describe 它）。若图像生成不可用，则仅交付提示词，并说明这一点。
- 本技能内置的 `design-system/` 目录（参见快速参考）。

## 快速参考

印刷模式：

| 模式 | 何时使用 |
|---|---|
| 纯单墨 | 用户明确要求一种油墨、单色，或指定的单一油墨且无第二种颜色 |
| 彩色墨 + 黑 | 安静、观察性、自然、建筑、长主题；彩色版呈递图像，碳黑/炭黑承担文字 |
| 互补双色 | 通用默认；主版 70–85%，强调色 15–30% 且承担具体角色；回退配色对为 Cobalt + Terracotta `#2148B8` + `#C65F38` |
| 叠印双色 | 两个印版刻意重叠；较深的混合区并非第三种油墨 |

目录（事实来源 —— **当具体数值不一致时，以目录为准，而非任何叙述文字**；只阅读与当前决策相关的目录）：

| 文件 | 提供内容 |
|---|---|
| `design-system/colors.json` | 基底 ID + 精确 hex、单墨调色板、经批准的成对双墨 |
| `design-system/compositions.json` | 版式族 ID 与几何结构 |
| `design-system/typography.json` | 字体层级角色 ID |
| `design-system/rhythm.json` | 视觉张力配置、焦点事件、未完结边缘 |
| `design-system/imperfections.json` | 受控印刷瑕疵效果 ID 及范围 |
| `design-system/carriers.json` | 载体信号（海报、期刊页、封面等） |

参考文档：

- `references/visual-language.md` —— 完整的色彩/空间/图像处理/字体/语气规则
- `references/composition.md` —— 版式决策流程、版式族、构图语法、节奏
- `references/quality-gate.md` —— 原创性防火墙、硬性禁止项、检查清单

## 流程

1. **读取输入。** 提取五项内容：
   - **主体：** 必须保持可辨识的那一个人、物、场景或想法。
   - **意图：** 诗意观察、宣告、田野笔记、个人陈述、文化海报或标本页。
   - **文字：** 逐字保留用户提供的原文，使用其原始语言 —— 绝不翻译或改写。若未提供文字，则创编一句 2–8 词的英文展示短语，并在多次重试间保持稳定。仅在明确要求时省略文字。
   - **图像角色：** 主视觉照片、孤立标本、裁切片段、纹理来源，或无。
   - **表现方式：** 忠实复制（默认）或抽象符号提取（当用户要求抽象、艺术化、松散、实验性、更不写实或更不摄影化的处理时）。

   对于复杂主题，选取一个具体的视觉隐喻；不要逐点阐释。若用户提供了图像，保留其身份与事实内容 —— 对其裁切/隔离/加网点，绝不替换主体或杜撰品牌细节。

2. **确定配方清单。** 填写每一个字段；不得跳过任何一项，除非用户要求了解流程细节，否则不要暴露该清单。在 `design-system/` 中查找 ID 与精确数值。

   ````yaml
   subject: <一个可辨识的主体>
   intent: <从输入读取中选定的一个意图>
   exact_text: <用户文字、生成的 2-8 词短语，或无>
   text_language: <所提供文字的语言，否则为英语>
   representation: <忠实复制或抽象符号提取>
   ratio: <明确比例或 3:4>
   carrier: <来自 design-system/carriers.json 的一个载体 ID 或无>
   substrate: <来自 design-system/colors.json 的一个基底 ID 及精确 hex>
   mode: <纯单墨、彩色 + 黑、互补双色或叠印双色>
   palette: <来自 design-system/colors.json 的一个调色板 ID>
   inks: <该调色板的具名油墨或经批准的配色对，含精确 hex 值>
   plate_roles: <每个印版明确一个角色>
   layout: <来自 design-system/compositions.json 的一个构图 ID>
   empty_paper: <明确的百分比>
   visual_tension: <来自 design-system/rhythm.json 的 relaxed、balanced 或 assertive>
   focal_event: <来自 design-system/rhythm.json 的一个强视觉事件>
   release_zone: <一个刻意的安静区域，为焦点事件预留空间>
   unresolved_edge: <来自 design-system/rhythm.json 的一个可选边缘行为或无>
   image_treatment: <一种机械复制工艺>
   type_hierarchy: <来自 design-system/typography.json 的一个角色 ID>
   disruption: <一处刻意的破格>
   imperfection_seed: <由已确定配方推导出的稳定哈希>
   imperfections: <当代作品用 0-2 种克制效果 ID，触感/复古作品用 2-3 种>
   ````

   当用户未作选择时的默认值：比例 `3:4`；基底 Neutral White `#FAFAF7`（建筑/科技/克制主题用 Cool Gray `#E9E9E5`；仅触感/档案/怀旧主题用 Pale Beige `#F5F1E8` —— 绝不因为作品使用网点或孔版印刷语言就想当然地使用米色）；模式为互补双色 Cobalt + Terracotta；留白纸张 `35%`；反思性/休闲/未指明的文化主题用 `relaxed` 张力，编辑类信息用 `balanced`，仅强力宣告用 `assertive`；破格 = 一处偏心图像裁切，或无图像时一个超大字号词。用户的明确选择优先于默认值，除非其违反双墨限制或原创性防火墙。相同输入必须解析为相同的清单 —— 绝不为了新颖而变动调色板、版式、百分比或工艺。

   一致地解析泛指颜色词：blue→Cobalt，green→Botanical Green，orange→Terracotta Orange，red→Signal Red，purple→Aubergine，black→Charcoal；green+black→Mint Green + Charcoal；blue+orange→Cobalt + Terracotta。具名的精确油墨始终优先。

3. **选择版式。** 自上而下走过 `references/composition.md` 中的决策流程，取第一个匹配项（事件→分栏信息海报；植物→档案图版；重复物件→物件场；交错图层→叠印拼贴；提供的照片→图像场或编辑封面；孤立物件→标本注释；短语即主体→字体主导的宣告；类随笔→编辑期刊；否则编辑封面）。

4. **按五个紧凑段落编译提示词**，依次为：
   1. **画布与油墨：** 比例、精确的基底 hex 及理由、精确的单/双墨调色板 hex 值、印刷模式、印版角色、平整正对的页面（无样机、画框、桌面或阴影）。
   2. **原创构图：** 版式族、张力配置、一个焦点事件、一个释放区、页边距（5–9%）、留白纸张百分比（25–55%）、网格、主体尺度占比（页面的 45–80%）与边缘裁切、可选的未完结边缘、一处手工痕迹。
   3. **主体：** 呈现内容；对于忠实复制，说明保留/裁切/加网点/露纸；对于抽象提取，说明 2–4 个身份锚点、主导体量、结构轮廓、重复节奏，以及露出的纸张在何处切入。
   4. **字体与文字：** 层级、字体语气、精确的简短展示文字，以及主标题与主体之间明确的叠压/交叉/拆分/紧凑对齐关系。
   5. **材质与规避：** 网点、纤维、溢色、套印不准，加上 `references/quality-gate.md` 中的硬性负面约束。

   只描述可见结果。绝不提及参考艺术家、工作室、样例海报或“以……的风格”。

5. **生成并检查。** 以编译好的提示词调用 `image_generate`。以全尺寸和缩略图尺寸对照 `references/quality-gate.md` 中的清单进行检查；失败时重生成一次（多出油墨、印版角色缺失、留白纸张超出 25–55%、主体不可辨识、无 ≥5x 的字号层级跃变、文字乱码、构图复制参考、无可辨识的焦点事件）。若精确文字在重试一次后仍渲染错误，则生成一张以图为主、文字较少的底图，并说明排版应在布局工具中叠加 —— 绝不把扭曲的文字当作正确。

6. **交付。** 将输出保存到用户工作目录下的 `./mono-color-output/`（如需则创建），或用户指定的其他位置。呈现：
   1. 生成的图像（路径或渲染图）；
   2. 最终提示词，置于围栏 `text` 代码块中；
   3. 简短的配方说明：模式、油墨（精确 hex）、版式、字体（编辑语气 + 实用语气）、工艺，以及一句原创性说明，点明相对任何提供参考的结构性差异。

仅当用户明确要求或图像生成不可用时，才止步于仅交付提示词。

## 注意事项

- **绝不使用超过两种印刷色。** 承印物本身不算油墨；叠印混合和密度变化也不算额外的油墨。渐变、彩虹点缀和全彩照片永远不允许。
- **以目录为准，而非散文描述。** 当 `design-system/` 中的色值、ID、范围或几何参数与任何散文描述不一致时，以目录中的值为准。
- **逐字保留所供文本** —— 原始语言、精确措辞，除非被要求，否则不翻译。绝不用不完美效果扭曲微文案或事实性文本。
- **绝不复制源作品的构图、措辞、Logo 或画面。** 对于任何提供的参考，至少更改四项结构性特征（参见原创性防火墙）。不制作假签名、报头、赞助信息、URL 或凭空编造的品牌标识。
- **默认采用当代风格。** 不要仅仅因为作品使用了半调网点或有限油墨，就添加泛黄的纸张、棕褐色调、做旧边框或复古道具 —— 只有当用户要求复古/档案氛围时才这样做。
- **一个视觉焦点事件，一个释放区域。** 绝不把所有元素居中，绝不把元素像模板一样均匀分布，绝不用装饰填满安静区域。

## 验证

- 清单已完全解析，所有 ID 均存在于 `design-system/` 目录之中。
- 成果使用一个有意选择的白色/灰色/浅米色承印物，以及 ≤2 种角色分工清晰的油墨色版。
- 25–55% 明显空白的纸面；一个视觉主导对象占 45–80%；标题明显穿过或锁定该对象。
- 字体层级呈现 5–12 倍的字号跳变，字体声部 ≤3 种。
- 所供主题和文本精确保留；与每一份所供参考相比，至少有 ≥4 项结构性特征不同。
- 已生成图像（除非明确要求仅提示词）并保存在输出目录下，且配方说明已交付。

## 说明

上游示例作品未包含在内：源仓库中的 `examples/` 为保留所有权利（参见上游 ASSET-LICENSE.md）；此处仅收录 MIT 许可的文本和设计系统目录。代码和文本均为 MIT 许可（参见 `LICENSE.txt`）。
