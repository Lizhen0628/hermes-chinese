---
title: "Baoyu Comic — 知识漫画：教育、传记、教程"
sidebar_label: "Baoyu Comic"
description: "知识漫画：教育、传记、教程"
---

{/* 本页由 website/scripts/generate-skill-docs.py 从该技能的 SKILL.md 自动生成。请修改源 SKILL.md，而非本页。 */}

# Baoyu Comic

知识漫画：教育、传记、教程。

## 技能元数据

| | |
|---|---|
| 来源 | 可选 — 使用 `hermes skills install official/creative/baoyu-comic` 安装 |
| 路径 | `optional-skills/creative\baoyu-comic` |
| 版本 | `1.56.1` |
| 作者 | 宝玉 (JimLiu) |
| 许可证 | MIT |
| 平台 | linux、macos、windows |
| 标签 | `comic`、`knowledge-comic`、`creative`、`image-generation` |

## 参考：完整 SKILL.md

:::info
以下是此技能被触发时 Hermes 加载的完整技能定义。这就是技能处于激活状态时智能体所看到的指令。
:::

# 知识漫画创作者

改编自 [baoyu-comic](https://github.com/JimLiu/baoyu-skills)，以适配 Hermes Agent 的工具生态。

创作原创知识漫画，支持灵活的艺术风格 × 基调组合。

## 使用时机

当用户要求创作知识/教育漫画、传记漫画、教程漫画，或使用"知识漫画"、"教育漫画"、"Logicomix 风格"等术语时，触发此技能。用户提供内容（文本、文件路径、URL 或主题），并可选地指定艺术风格、基调、布局、宽高比或语言。

## 参考图像

Hermes 的 `image_generate` 工具是**仅提示词**的——它接受文本提示词和宽高比，并返回图像 URL。它**不**接受参考图像。当用户提供参考图像时，用其**以文本方式提取特征**，并将其嵌入到每一页的提示词中：

**接收**：当用户提供时接受文件路径（或在对话中粘贴图像）。
- 文件路径 → 复制到 `refs/NN-ref-{slug}.{ext}`，与漫画输出放在一起以便追溯来源
- 无路径的粘贴图像 → 通过 `clarify` 向用户询问路径，或以文本方式提取风格特征作为备选方案
- 无参考 → 跳过本节

**使用模式**（按每个参考图像）：

| 用法 | 效果 |
|-------|--------|
| `style` | 提取风格特征（线条处理、质感、氛围），并追加到每一页的提示词正文中 |
| `palette` | 提取十六进制颜色，并追加到每一页的提示词正文中 |
| `scene` | 提取场景构图或主体说明，并追加到相关页面的提示词中 |

**当存在参考图像时，记录到每一页提示词的 frontmatter 中**：

```yaml
references:
  - ref_id: 01
    filename: 01-ref-scene.png
    usage: style
    traits: "muted earth tones, soft-edged ink wash, low-contrast backgrounds"
```

角色一致性由 `characters/characters.md` 中的**文本描述**（在第 3 步编写）驱动，这些描述会被内联嵌入到每一页的提示词中（第 5 步）。第 7.1 步生成的可选 PNG 角色设定图是面向人类审阅的产物，并非 `image_generate` 的输入。

## 选项

### 视觉维度

| 选项 | 取值 | 描述 |
|--------|--------|-------------|
| Art | ligne-claire（默认）、manga、realistic、ink-brush、chalk、minimalist | 艺术风格 / 渲染技法 |
| Tone | neutral（默认）、warm、dramatic、romantic、energetic、vintage、action | 情绪 / 氛围 |
| Layout | standard（默认）、cinematic、dense、splash、mixed、webtoon、four-panel | 分格排列 |
| Aspect | 3:4（默认，竖版）、4:3（横版）、16:9（宽屏） | 页面宽高比 |
| Language | auto（默认）、zh、en、ja 等 | 输出语言 |
| Refs | 文件路径 | 用于提取风格 / 配色特征的参考图像（不会传递给图像模型）。参见上文[参考图像](#reference-images)。 |

### 部分工作流选项

| 选项 | 描述 |
|--------|-------------|
| 仅分镜 | 仅生成分镜，跳过分页提示词和图像 |
| 仅提示词 | 生成分镜 + 提示词，跳过图像 |
| 仅图像 | 从现有的提示词目录生成图像 |
| 重新生成 N | 仅重新生成特定页面（例如 `3` 或 `2,5,8`） |

详情：[references/partial-workflows.md](https://github.com/NousResearch/hermes-agent/blob/main/optional-skills/creative\baoyu-comic/references/partial-workflows.md)

### 美术风格、基调 & 预设目录

- **美术风格**（6 种）：`ligne-claire`、`manga`、`realistic`、`ink-brush`、`chalk`、`minimalist`。完整定义见 `references/art-styles/<style>.md`。
- **基调**（7 种）：`neutral`、`warm`、`dramatic`、`romantic`、`energetic`、`vintage`、`action`。完整定义见 `references/tones/<tone>.md`。
- **预设**（5 种），除单纯的美术风格+基调外还有特殊规则：

  | 预设 | 等价组合 | 卖点 |
  |--------|-----------|------|
  | `ohmsha` | manga + neutral | 视觉隐喻，无对话镜头，道具揭晓 |
  | `wuxia` | ink-brush + action | 气劲效果，战斗画面，氛围感 |
  | `shoujo` | manga + romantic | 装饰元素，眼部细节，浪漫节拍 |
  | `concept-story` | manga + warm | 视觉符号系统，成长弧线，对话与动作平衡 |
  | `four-panel` | minimalist + neutral + four-panel layout | 起承转合结构，黑白+点点色，火柴人角色 |

  完整规则见 `references/presets/<preset>.md` —— 选定预设时加载对应文件。

- **兼容性矩阵**和**内容信号 → 预设**对照表位于 [references/auto-selection.md](https://github.com/NousResearch/hermes-agent/blob/main/optional-skills/creative\baoyu-comic/references/auto-selection.md)。在步骤 2 推荐组合前请先阅读。

## 文件结构

输出目录：`comic/{topic-slug}/`
- Slug：从主题提取 2-4 个单词的 kebab-case（例如 `alan-turing-bio`）
- 冲突处理：追加时间戳（例如 `turing-story-20260118-143052`）

**内容**：
| 文件 | 说明 |
|------|-------------|
| `source-{slug}.md` | 保存的源内容（kebab-case slug 与输出目录一致） |
| `analysis.md` | 内容分析 |
| `storyboard.md` | 分镜脚本，含面板划分 |
| `characters/characters.md` | 角色定义 |
| `characters/characters.png` | 角色参考图（通过 `image_generate` 下载） |
| `prompts/NN-{cover\|page}-[slug].md` | 生成提示词 |
| `NN-{cover\|page}-[slug].png` | 生成的图片（通过 `image_generate` 下载） |
| `refs/NN-ref-{slug}.{ext}` | 用户提供的参考图（可选，用于溯源） |

## 语言处理

**检测优先级**：
1. 用户指定的语言（显式选项）
2. 用户的对话语言
3. 源内容语言

**规则**：所有交互中使用用户的输入语言：
- 分镜大纲与场景描述
- 图像生成提示词
- 用户选择选项与确认
- 进度更新、提问、错误、摘要

技术术语保留英文。

## 工作流

### 进度清单

```
Comic Progress:
- [ ] Step 1: Setup & Analyze
  - [ ] 1.1 Analyze content
  - [ ] 1.2 Check existing directory
- [ ] Step 2: Confirmation - Style & options ⚠️ REQUIRED
- [ ] Step 3: Generate storyboard + characters
- [ ] Step 4: Review outline (conditional)
- [ ] Step 5: Generate prompts
- [ ] Step 6: Review prompts (conditional)
- [ ] Step 7: Generate images
  - [ ] 7.1 Generate character sheet (if needed) → characters/characters.png
  - [ ] 7.2 Generate pages (with character descriptions embedded in prompt)
- [ ] Step 8: Completion report
```

### 流程

```
输入 → 分析 → [检查是否已存在？] → [确认：风格 + 审查项] → 分镜 → [审查？] → 提示词 → [审查？] → 图片 → 完成
```

### 步骤摘要

| 步骤 | 操作 | 关键输出 |
|------|--------|------------|
| 1.1 | 分析内容 | `analysis.md`、`source-{slug}.md` |
| 1.2 | 检查已存在目录 | 处理冲突 |
| 2 | 确认风格、重点、受众、审查项 | 用户偏好 |
| 3 | 生成分镜 + 角色 | `storyboard.md`、`characters/` |
| 4 | 审查大纲（如请求） | 用户批准 |
| 5 | 生成提示词 | `prompts/*.md` |
| 6 | 审查提示词（如请求） | 用户批准 |
| 7.1 | 生成角色参考图（如需要） | `characters/characters.png` |
| 7.2 | 生成页面 | `*.png` 文件 |
| 8 | 完成报告 | 摘要 |

### 用户提问

使用 `clarify` 工具确认选项。由于 `clarify` 一次仅处理一个问题，优先提出最重要的问题并按顺序推进。完整的步骤 2 问题集见 [references/workflow.md](https://github.com/NousResearch/hermes-agent/blob/main/optional-skills/creative\baoyu-comic/references/workflow.md)。

**超时处理（关键）**：`clarify` 可能返回 `"The user did not provide a response within the time limit. Use your best judgement to make the choice and proceed."` —— 这并非用户默认所有选项均同意的授权。

- 将其视为**仅针对该单个问题**的默认值。继续按顺序提出剩余的步骤 2 问题；每个问题都是独立的同意节点。
- **在下一条消息中向用户明示该默认值**，以便其有机会纠正：例如 `"风格：默认使用 ohmsha 预设（clarify 超时）。直接说一声即可切换。"` —— 未告知的默认值与从未询问无从区分。
- 请勿在一次超时后将步骤 2 压缩为单次"使用全部默认值"流程。如果用户确实不在场，那么五个问题其也都不在场 —— 但用户返回时可纠正可见的默认值，而无法纠正不可见的默认值。

### 步骤 7：图像生成

所有图像渲染都使用 Hermes 内置的 `image_generate` 工具。其 schema 仅接受 `prompt` 和 `aspect_ratio`（`landscape` | `portrait` | `square`）；它**返回一个 URL**，而非本地文件。因此，每一张生成的页面或角色设定图都必须下载到输出目录。

**提示词文件要求（硬性）**：在调用 `image_generate` 之前，将每张图片的完整最终提示词写入 `prompts/` 下的独立文件（命名：`NN-{type}-[slug].md`）。提示词文件是可复现性记录。

**宽高比映射** —— 分镜的 `aspect_ratio` 字段按如下方式映射到 `image_generate` 的格式：

| 分镜比例 | `image_generate` 格式 |
|------------------|-------------------------|
| `3:4`、`9:16`、`2:3` | `portrait` |
| `4:3`、`16:9`、`3:2` | `landscape` |
| `1:1` | `square` |

**下载步骤** —— 每次 `image_generate` 调用之后：
1. 从工具结果中读取 URL
2. 使用**绝对**输出路径获取图像字节，例如
   `curl -fsSL "<url>" -o /abs/path/to/comic/<slug>/NN-page-<slug>.png`
3. 在继续下一页之前，验证文件在该确切路径下存在且非空

**切勿依赖 shell 的 CWD 持久性来处理 `-o` 路径。** 终端工具的持久化 shell CWD 可能在不同批次之间发生变化（会话过期、`TERMINAL_LIFETIME_SECONDS`、失败的 `cd` 导致你停留在错误的目录）。`curl -o relative/path.png` 是一个无声的陷阱：如果 CWD 已经漂移，文件会落在别的地方且不会报错。**始终向 `-o` 传递完全限定的绝对路径**，或者向终端工具传递 `workdir=<abs path>`。2026 年 4 月的事件：一部 10 页漫画的第 06-09 页落在了仓库根目录，而不是 `comic/<slug>/`，因为批次 3 从批次 2 继承了一个过期的 CWD，`curl -o 06-page-skills.png` 写到了错误的目录。智能体随后花了好几轮声称文件存在于它们并不存在的位置。

**7.1 角色设定图** —— 当漫画为多页且角色反复出现时生成它（输出到 `characters/characters.png`，比例 `landscape`）。对于简单预设（例如四格极简风）或单页漫画可跳过。调用 `image_generate` 之前，`characters/characters.md` 处的提示词文件必须已存在。渲染出的 PNG 是**面向人工的审核产物**（以便用户可视觉验证角色设计），并作为后续重新生成或手动编辑提示词的参考 —— 它**并不**驱动步骤 7.2。页面提示词已在步骤 5 中根据 `characters/characters.md` 中的**文本描述**写好；`image_generate` 无法接受图像作为视觉输入。

**7.2 页面** —— 在调用 `image_generate` 之前，每一页的提示词必须已经位于 `prompts/NN-{cover|page}-[slug].md`。由于 `image_generate` 仅接受提示词，角色一致性通过在步骤 5 中**将角色描述（来源于 `characters/characters.md`）内联嵌入每一个页面提示词**来实现。无论 7.1 中是否生成了 PNG 设定图，该嵌入都统一执行；PNG 仅是审核/重生成辅助。

**备份规则**：现有 `prompts/…md` 和 `…png` 文件 → 在重新生成前，用 `-backup-YYYYMMDD-HHMMSS` 后缀重命名。

完整的分步工作流（分析、分镜、审核门、再生成变体）：[references/workflow.md](https://github.com/NousResearch/hermes-agent/blob/main/optional-skills/creative\baoyu-comic/references/workflow.md)。

## 参考

**核心模板**：
- [analysis-framework.md](https://github.com/NousResearch/hermes-agent/blob/main/optional-skills/creative\baoyu-comic/references/analysis-framework.md) - 深度内容分析
- [character-template.md](https://github.com/NousResearch/hermes-agent/blob/main/optional-skills/creative\baoyu-comic/references/character-template.md) - 角色定义格式
- [storyboard-template.md](https://github.com/NousResearch/hermes-agent/blob/main/optional-skills/creative\baoyu-comic/references/storyboard-template.md) - 分镜结构
- [ohmsha-guide.md](https://github.com/NousResearch/hermes-agent/blob/main/optional-skills/creative\baoyu-comic/references/ohmsha-guide.md) - Ohmsha 漫画细节

**风格定义**：
- `references/art-styles/` - 美术风格（ligne-claire、manga、realistic、ink-brush、chalk、minimalist）
- `references/tones/` - 色调（neutral、warm、dramatic、romantic、energetic、vintage、action）
- `references/presets/` - 带特殊规则的预设（ohmsha、wuxia、shoujo、concept-story、four-panel）
- `references/layouts/` - 布局（standard、cinematic、dense、splash、mixed、webtoon、four-panel）

**工作流**：
- [workflow.md](https://github.com/NousResearch/hermes-agent/blob/main/optional-skills/creative\baoyu-comic/references/workflow.md) - 完整工作流细节
- [auto-selection.md](https://github.com/NousResearch/hermes-agent/blob/main/optional-skills/creative\baoyu-comic/references/auto-selection.md) - 内容信号分析
- [partial-workflows.md](https://github.com/NousResearch/hermes-agent/blob/main/optional-skills/creative\baoyu-comic/references/partial-workflows.md) - 部分工作流选项

## 页面修改

| 操作 | 步骤 |
|--------|-------|
| **编辑** | **首先更新提示词文件** → 重新生成图像 → 下载新 PNG |
| **添加** | 在相应位置创建提示词 → 嵌入角色描述进行生成 → 重排后续编号 → 更新分镜 |
| **删除** | 删除文件 → 重排后续编号 → 更新分镜 |

**重要**：更新页面时，务必首先更新提示词文件（`prompts/NN-{cover|page}-[slug].md`）再进行重新生成。这确保更改被记录且可复现。

## 陷阱

- 图像生成：每页 10-30 秒；失败时自动重试一次
- **始终下载** `image_generate` 返回的 URL 为本地 PNG —— 下游工具（以及用户的审核）期望文件位于输出目录，而非临时 URL
- **为 `curl -o` 使用绝对路径** —— 切勿跨批次依赖持久化 shell 的 CWD。无声陷阱：文件落在错误的目录，随后对预期路径执行 `ls` 会显示为空。见步骤 7“下载步骤”。
- 对敏感的公众人物使用风格化的替代表现
- **需要步骤 2 确认** - 不要跳过
- **步骤 4/6 为条件性** - 仅在用户在步骤 2 中要求时执行
- **步骤 7.1 角色设定图** - 对多页漫画推荐，对简单预设可选。PNG 是审核/重生成辅助；页面提示词（在步骤 5 中编写）使用 `characters/characters.md` 中的文本描述，而非 PNG。`image_generate` 不接受图像作为视觉输入
- **清除机密** —— 在写入任何输出文件之前，扫描源内容中的 API 密钥、令牌或凭据
