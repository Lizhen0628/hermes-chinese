---
title: "Mono Color——生成单色或双色编辑印刷海报图像"
sidebar_label: "Mono Color"
description: "生成单色或双色编辑印刷海报图像"
---

{/* 本页面由 website/scripts/generate-skill-docs.py 从技能的 SKILL.md 自动生成。请编辑源 SKILL.md，而非本页面。 */}

# Mono Color

生成单色或双色编辑印刷海报图像。

## 技能元数据

| | |
|---|---|
| 来源 | 可选——使用 `hermes skills install official/creative/mono-color` 安装 |
| 路径 | `optional-skills/creative/mono-color` |
| 版本 | `1.0.0` |
| 作者 | Yan Liu (adaptated by Nous Research) |
| 许可证 | MIT |
| 平台 | linux, macos, windows |
| 标签 | `design`, `poster`, `print`, `duotone`, `risograph`, `editorial`, `image-generation` |
| 相关技能 | [`baoyu-infographic`](/docs/user-guide/skills/bundled/creative/creative-baoyu-infographic)、[`meme-generation`](/docs/user-guide/skills/optional/creative/creative-meme-generation)、[`pixel-art`](/docs/user-guide/skills/optional/creative/creative-pixel-art) |

## 参考：完整 SKILL.md

:::info
以下是 Hermes 在此技能被触发时加载的完整技能定义。这就是该技能激活时智能体看到的指令内容。
:::

# 单色编辑印刷技能

将任意用户主题、句子或参考照片转化为一件原创的印刷编辑作品，采用一套稳定的视觉语言：自适应中性材质 + 一种或两种油墨 + 机械化复制的图像 + 字体张力 + 简洁的人类声音。

本技能负责设计和生成图像；它不模仿任何单一参考，不复制来源构图、措辞、标志或艺术作品，且使用的印刷油墨从不超过两种。

## 何时使用

用户要求单色编辑海报、双色印刷、孔版印刷/独立杂志海报、半色调照片处理、单油墨或双油墨封面，或明确提及 mono-color 风格。中文触发词汇包括单色海报、双色印刷、单色调视觉、蓝色/绿色孔版印刷、网点照片、复古或当代编辑排版。不要仅因请求中提及某种颜色就触发。

## 前置条件

- Hermes 的 `image_generate` 工具（若未加载，通过延迟工具目录搜索/描述它）。若图像生成功能不可用，则仅提供提示词并说明这一情况。
- 本技能附带的 `design-system/` 目录（参见快速参考）。

## 快速参考

印刷模式：

| 模式 | 使用时机 |
|---|---|
| 纯单油墨 | 用户明确要求单油墨、单色，或指定单一油墨且无第二色 |
| 彩色油墨 + 黑色 | 安静、观察性、自然、建筑、长篇主题；彩色版承载图像，碳黑/炭黑承载文字 |
| 互补双色 | 通用默认；主版 70–85%，强调色 15–30% 且承担明确角色；默认组合 Cobalt + Terracotta `#2148B8` + `#C65F38` |
| 叠印双色 | 两版刻意重叠；较深的混合区域不构成第三种油墨 |

目录（事实来源——**当具体数值出现差异时，以目录为准，而非任何文字描述**；只阅读与当前决策相关的目录）：

| 文件 | 提供内容 |
|---|---|
| `design-system/colors.json` | 材质 ID + 精确十六进制色值、单油墨调色板、已批准的双油墨组合 |
| `design-system/compositions.json` | 布局族 ID 与几何结构 |
| `design-system/typography.json` | 字体层级角色 ID |
| `design-system/rhythm.json` | 视觉张力配置、焦点事件、未解决边缘 |
| `design-system/imperfections.json` | 受控印刷瑕疵效果 ID 与范围 |
| `design-system/carriers.json` | 载体信号（海报、期刊页面、封面等） |

参考文件：

- `references/visual-language.md`——完整的颜色/空间/图像处理/字体/语调规则
- `references/composition.md`——布局决策流程、布局族、构图语法、节奏
- `references/quality-gate.md`——原创性防火墙、硬性禁忌、检查清单

## 流程

1. **阅读输入。** 提取五项内容：
   - **主题：** 必须保持可辨识的单一人物、物品、场景或想法。
   - **意图：** 诗意思考、宣告、田野笔记、个人陈述、文化海报或标本页面。
   - **文字：** 逐字保留所提供的原文，维持其原始语言——绝不翻译或改写。若未提供文字，则创作一个 2–8 词的英文展示短语，并在各次重试中保持一致。仅当明确要求时才省略文字。
   - **图像角色：** 主视觉照片、孤立标本、裁剪碎片、纹理来源或无。
   - **表现方式：** 忠实复制（默认）或抽象符号提取（当用户要求抽象、艺术化、松散、实验性、较少现实主义或较少照片化处理时）。

   对于复杂主题，选择一个具体的视觉隐喻；不要图解每一点。若用户提供图像，保留其身份与事实内容——裁剪/孤立/半色调化，绝不要替换主体或编造品牌细节。

2. **解析配方清单。** 填写每个字段；不要跳过任何一项，除非用户要求过程细节，否则不要暴露该清单。在 `design-system/` 中查找 ID 与精确数值。

   ````yaml
   subject: <一个可辨识的主体>
   intent: <来自输入阅读的一个意图>
   exact_text: <用户文字、生成的 2-8 词短语，或无>
   text_language: <所提供文字的语言，否则为 English>
   representation: <忠实复制或抽象符号提取>
   ratio: <明确比例或 3:4>
   carrier: <来自 design-system/carriers.json 的一个载体 ID，或无>
   substrate: <来自 design-system/colors.json 的一个材质 ID 与精确十六进制色值>
   mode: <纯单油墨、彩色 + 黑色、互补双色或叠印双色>
   palette: <来自 design-system/colors.json 的一个调色板 ID>
   inks: <该调色板的具名油墨或已批准的组合及其精确十六进制色值>
   plate_roles: <每个油墨版一个明确角色>
   layout: <来自 design-system/compositions.json 的一个构图 ID>
   empty_paper: <明确百分比>
   visual_tension: <来自 design-system/rhythm.json 的松弛、平衡或强烈>
   focal_event: <来自 design-system/rhythm.json 的一个强烈视觉事件>
   release_zone: <一个刻意安静、为焦点事件留出空间的区域>
   unresolved_edge: <来自 design-system/rhythm.json 的一个可选边缘行为，或无>
   image_treatment: <一种机械复制工艺>
   type_hierarchy: <来自 design-system/typography.json 的一个角色 ID>
   disruption: <一项刻意的干扰>
   imperfection_seed: <从已解析配方推导出的稳定哈希>
   imperfections: <当代作品使用 0-2 种克制的效果 ID，触感/复古作品使用 2-3 种>
   ````

   用户未选择时的默认值：比例 `3:4`；材质 Neutral White `#FAFAF7`（建筑/科技/克制风格使用 Cool Gray `#E9E9E5`；Pale Beige `#F5F1E8` 仅用于触感/档案/怀旧主题——绝不要仅因作品使用半色调或孔版印刷语言就假定米色）；模式为互补双色 Cobalt + Terracotta；留白纸张 `35%`；张力对于沉思/休闲/未指定文化主题使用 `relaxed`，对于编辑信息使用 `balanced`，仅对于强硬宣告使用 `assertive`；干扰 = 一次偏离中心的图像裁剪，或当没有图像时使用一个超大单词。用户的明确选择覆盖默认值，除非它们违反双油墨限制或原创性防火墙。相同输入必须解析为完全相同的清单——绝不为追求新意而变动调色板、布局、百分比或工艺。

   一致地解析泛泛的颜色词：blue→Cobalt，green→Botanical Green，orange→Terracotta Orange，red→Signal Red，purple→Aubergine，black→Charcoal；green+black→Mint Green + Charcoal；blue+orange→Cobalt + Terracotta。具名油墨始终优先。

3. **选择布局。** 自上而下遍历 `references/composition.md` 中的决策流程，取第一个匹配项（事件→信息海报；植物→档案版；重复物品→物品场；交叉图层→叠印拼贴；提供的照片→图像场或编辑封面；孤立物体→标本注释；短语作为主体→文字主导宣告；类散文→编辑期刊；否则为编辑封面）。

4. **编写提示词**，按顺序分为五个简洁段落：
   1. **画布与油墨：** 比例、精确的材质十六进制色值及原因、精确的单/双油墨调色板十六进制色值、印刷模式、版角色、平面正面页面（无样机、边框、桌面或阴影）。
   2. **原创构图：** 布局族、张力配置、一个焦点事件、一个释放区、边距（5–9%）、留白纸张百分比（25–55%）、网格、主物体尺度（页面的 45–80%）及边缘裁剪、可选的未解决边缘、一次手工痕迹。
   3. **主体：** 出现什么；对于忠实复制，保留/裁剪/半色调/纸张暴露；对于抽象提取，2–4 个身份锚点、主导体量、结构轮廓、重复节奏，以及暴露纸张穿过何处。
   4. **字体与文字：** 层级、字体声音、精确的短展示文字，以及标题与主物体之间明确的重叠/交叉/分离/紧密结合。
   5. **材质与禁忌：** 网点、纤维、渗色、套印不准，加上来自 `references/quality-gate.md` 的硬性负面约束。

   仅描述可见的结果。绝不提及参考艺术家、工作室、样本海报或"以……的风格"。

5. **生成与检查。** 使用编写的提示词调用 `image_generate`。以全尺寸和缩略图尺寸对照 `references/quality-gate.md` 中的清单进行检查；失败时重新生成一次（多余油墨、版角色缺失、留白纸张超出 25–55%、主体不可辨识、无明显 ≥5 倍字体尺寸跳跃、文字乱码、复制参考构图、无明显焦点事件）。若精确文字在一次重试后仍渲染错误，则生成一张文字较少的基底图像，并说明应在布局工具中叠加排版——绝不要假装扭曲的文字是正确的。

6. **交付。** 将输出保存在用户工作目录下的 `./mono-color-output/` 中（若不存在则创建），或用户指定的其他位置。呈现：
   1. 生成的图像（路径或渲染结果）；
   2. 以围栏 `text` 块形式呈现最终提示词；
   3. 一份简短配方说明：模式、油墨（精确十六进制色值）、布局、字体（编辑声音 + 实用声音）、工艺，以及一句原创性声明，点名相对于任何所提供参考的结构性偏离。

   仅当用户明确要求或图像生成不可用时，才止步于仅提供提示词。

## 注意事项

- **永远不要超过两种印刷用墨。** 承印物本身不是一种墨；叠印混色与密度变化不算额外的墨。渐变、彩虹点缀和全彩摄影一律排除在外。
- **目录优先于散文描述。** 当 `design-system/` 中的色值、ID、范围或几何参数与任何散文描述不一致时，以目录中的值为准。
- **逐字保留所给文本**——保留原语言、原文用词，除非明确要求翻译，否则不翻译。切勿用不完美效果扭曲微文案或事实性文本。
- **绝不复制来源的构图、用词、标志或 artwork。** 与任何所提供的参考物相比，至少更改四项结构性特征（参见原创性防火墙）。不得添加虚假签名、报头、赞助商、URL 或杜撰的品牌标识。
- **默认采用当代风格。** 不要仅因为作品使用了半调网点或有限墨色，就添加泛黄纸张、棕褐色调、破损边框或复古道具——只有当用户要求复古/档案氛围时才这样做。
- **一个视觉焦点，一个释放区。** 绝不要将一切居中，绝不要像模板那样均匀分布元素，绝不要用装饰填满留白区。

## 验证清单

- Manifest 完全解析，所有 ID 均存在于 `design-system/` 目录中。
- 结果使用一种有意图的白色/灰色/浅米色承印物，以及 ≤2 种墨色，且各印版角色清晰。
- 25–55% 明显空白的纸张；一个主导物在 45–80% 之间；标题明显跨越或锁定该主导物。
- 字体层级呈现 5–12 倍的字号跳跃，且 ≤3 种字体声音。
- 所提供的主题与文本完全保留；与每个所提供的参考物相比，至少有 4 项结构性特征不同。
- 已生成图像（除非要求仅提示词）并保存在输出目录下，且已交付配方说明。

## 声明

不包含上游示例 artwork：源仓库中的 `examples/` 为版权所有（见上游 ASSET-LICENSE.md）；此处仅提供了 MIT 许可的文本和 design-system 目录。代码与文本均为 MIT 许可（见 `LICENSE.txt`）。
