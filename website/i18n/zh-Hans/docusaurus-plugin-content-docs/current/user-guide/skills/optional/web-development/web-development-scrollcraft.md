---
title: "Scrollcraft — 高级滚动驱动落地页；滚动 = 时间轴"
sidebar_label: "Scrollcraft"
description: "高级滚动驱动落地页；滚动 = 时间轴"
---

{/* 此页面由 website/scripts/generate-skill-docs.py 从技能的 SKILL.md 自动生成。请编辑源文件 SKILL.md，而非此页面。 */}

# Scrollcraft

高级滚动驱动落地页；滚动 = 时间轴。

## 技能元数据

| | |
|---|---|
| 来源 | 可选 — 使用 `hermes skills install official/web-development/scrollcraft` 安装 |
| 路径 | `optional-skills/web-development/scrollcraft` |
| 版本 | `1.0.0` |
| 作者 | nateherkai（上游 scroll-craft），由 Hermes Agent 移植 |
| 许可证 | MIT |
| 平台 | linux, macos, windows |
| 标签 | `web-development`、`landing-page`、`scrollytelling`、`animation`、`design`、`frontend` |

## 参考：完整的 SKILL.md

:::info
以下是 Hermes 在此技能被触发时加载的完整技能定义。这就是技能激活时智能体看到的指令内容。
:::

# scrollcraft

滚动是每位访客都已熟知的唯一输入方式。本技能将其视为一条时间轴：滚轮是
擦洗器，页面是一部影片、其上有真实文字，每个区块的行为都足够不同，以让
访客持续向下滚动。

**你的产出：**一份访谈简报、一套页面文法、一张客户旅程图、一条带有一个
精心设计的峰值的感觉曲线、一份滚动画布、一个标志性动作、各类素材、一个
基于令牌驱动设计底线的真实 HTML 页面，以及一列截图，证明它在每个滚动位置
都站得住脚。

适用场景：“scrollytelling”、“滚动动画网站”、“一个滚动即播放视频的
网站”、“Apple 风格的落地页”、“3D 滚动世界”、“把我的品牌做成滚动
体验”、“这个看起来像模板”，或任何要求网站应感觉像一种体验而非一份文档
的需求。

## 这不是什么

这不是“生成一段飞行穿越画面再往上面丢文字”。那只会得到一个应用于整页的
单一装置，一眼就能看穿。四条核心规则：

1. **多样性才是产品本身。** 至少四种装置族，绝不连续两次使用同一
   装置。阅读 [references/devices.md](https://github.com/NousResearch/hermes-agent/blob/main/optional-skills/web-development/scrollcraft/references/devices.md)。
2. **世界是照片级的**，除非品牌确实是插画风格。默认禁止使用黏土/低多边形
   立体景观。阅读 [references/worlds.md](https://github.com/NousResearch/hermes-agent/blob/main/optional-skills/web-development/scrollcraft/references/worlds.md)。
3. **除非需求简报字面上就是“一段连续的旅程”，否则不做连续链条**（那么请参阅 [references/worldflight.md](https://github.com/NousResearch/hermes-agent/blob/main/optional-skills/web-development/scrollcraft/references/worldflight.md)）。
4. **不同的世界不等于不同的页面。** 结构是一个独立的维度；要有意识地做
   决定。阅读 [references/uniqueness.md](https://github.com/NousResearch/hermes-agent/blob/main/optional-skills/web-development/scrollcraft/references/uniqueness.md)。

## 第 0 步：访谈

**构建任何东西之前，务必先在聊天中询问用户。** 真实的问题，在对话中被提出并
被回答、被记录下来——而不是从品牌名推断出的简报。一次性提出八个问题：

1. **用三到五个词形容氛围**，外加最多三个来自任意媒介的参考（电影、专辑
   封面、店铺、杂志、游戏——不是“你喜欢的网站”）。
2. **逐区块的滚动旅程，用他们自己的话描述。**
3. **能量曲线**——哪里平缓，哪里强烈。
4. **滚动时人们应当有点感受，逐阶段而言，以及那唯一一个他们应当记住的
   时刻是什么？** 这成为感觉曲线以及峰值。
   参阅 [references/feel.md](https://github.com/NousResearch/hermes-agent/blob/main/optional-skills/web-development/scrollcraft/references/feel.md)。
5. **这个网站应当做一件他们见过的任何网站都没做过的事**——标志性动作的
   种子。
6. **距离高级极简有多远？** 在
   [references/uniqueness.md](https://github.com/NousResearch/hermes-agent/blob/main/optional-skills/web-development/scrollcraft/references/uniqueness.md) §5 中给出可选范围：粗野主义、
   极繁主义、俏皮、复古、密集、编辑风格、高级极简。
7. **一个不间断的世界，还是各自独立的场景？** 这是最大的结构分叉点，而且
   他们说了算。
8. **他们已经拥有哪些素材？** 影像、照片、产品图、品牌套件。“什么都没有”
   没关系，那就意味着一个完全生成的世界。

在任何幕次规划之前，把答案逐字写入
`<workspace>/builds/<name>/BRIEF.md`（使用 write_file）。BRIEF.md 必须包含这
八个答案、感觉曲线（每一幕一行：情绪，然后是成因）、峰值（以访客会对朋友说
出的那句话呈现）、已填充的“它是这样一个网站，___”句子，以及任何精心设计的
静默。如果在完全自主运行中确实无法联系到用户，就自撰 BRIEF.md，将其标记为
`Self-authored, not interviewed`，并在报告中说明这一点。

## Bootstrap

运行预检，而不是手动检查（它能识别出一个被精简掉的 ffmpeg——那会把缺失的滤镜报成语法错误）：

```bash
node <skill>/scripts/doctor.mjs
node <skill>/scripts/workspace.mjs --ensure   # 打印工作区，初始化注册表
```

工作区解析顺序：`SCROLLCRAFT_HOME` 环境变量；从 cwd 向上查找最近的
`.scrollcraft.json`（`{ "workspace": "..." }`）；
`<项目根目录>/scrollcraft`。构建产物位于 `<workspace>/builds/<name>/`，指纹
注册表位于 `<workspace>/FINGERPRINTS.md`（由
[templates/FINGERPRINTS.md](https://github.com/NousResearch/hermes-agent/blob/main/optional-skills/web-development/scrollcraft/templates/FINGERPRINTS.md) 初始化，起始为空 —— 这道
关卡是为了阻止你重复*自己*）。

把 `engine/scrollcraft.js` 和 `engine/scrollcraft.css` 复制到构建文件夹中。
**永远不要按项目修改引擎。** 用令牌做主题；写你自己的标记。定制行为就是页面里的
定制 JS，由 `--sc-p` 和你自己的 `data-sc-*` 属性驱动。

## 第 1 步：简报，以旅程为先

用平实的散文向主题对象开放提问。然后只问第 0 步没覆盖到的内容：
这是什么，面向谁；页面要传达的那一句话；那个下一步动作（一个标签，随处使用）；
他们已有什么；艺术方向参考 [references/worlds.md](https://github.com/NousResearch/hermes-agent/blob/main/optional-skills/web-development/scrollcraft/references/worlds.md)。然后写出
**旅程**：四到七个节拍，每一拍都是访问者所知或所感的转变。节拍是脊柱；服务不了任何
节拍的段落一律砍掉。在生成素材之前先与用户确认这段旅程 —— 素材才是昂贵的那部分。

## 第 2 步：语法、关卡，然后评分

完整细节见 [references/uniqueness.md](https://github.com/NousResearch/hermes-agent/blob/main/optional-skills/web-development/scrollcraft/references/uniqueness.md)。

- **选择一种语法。** 八种，互斥。选择 filmic one-shot 意味着要在报告中说明
  为什么其他七种败下阵来。导航、主视觉和收尾都由语法决定。
- **发明标志性动作。** 一个在页面中编码的定制交互，而不是对套装装置做参数调整。
  访谈问题 5 就是种子。
- **运行指纹关卡。** 计划中的构建必须在 6 个维度中的至少 4 个上与
  `<workspace>/FINGERPRINTS.md` 中的每一行不同：语法、导航处理、主视觉装置、
  幕序形态、收尾模式、标志性动作。如果失败，改动的是计划，而不是日志。
- **在评分表之前写出感受曲线**（方法：
  [references/feel.md](https://github.com/NousResearch/hermes-agent/blob/main/optional-skills/web-development/scrollcraft/references/feel.md)）。然后在书面表格中
  为每一拍分配一个装置（节拍 / 装置 / 原因）。

构建前检查：语法禁令成立；4+ 种装置家族；没有装置连续重复两次；`scrub` 幕最多
两幕；没有两个相邻幕感受相同；一个峰值，跨度最大；页面总长度 8–14 个
视口高度。

## 第 3 步：素材

完整流水线、提示词脚手架和模型注意事项：[references/assets.md](https://github.com/NousResearch/hermes-agent/blob/main/optional-skills/web-development/scrollcraft/references/assets.md)。

**Hermes 原生路径优先：**

- **用户提供的视频和照片** —— 无需密钥，无需花费，是一条一等路径。
  对它们做调色和编码。
- **`image_generate` 工具**用于静帧：在所有提示词中原样复用一个风格序言，正是
  让六张图像看起来像是同一次拍摄的关键。使用前检查每个素材（vision_analyze）；
  重新生成也比交付一个糟糕帧要好。

**可选上游路径 —— kie.ai**（原样内置为
[scripts/kie.mjs](https://github.com/NousResearch/hermes-agent/blob/main/optional-skills/web-development/scrollcraft/scripts/kie.mjs)）：照片级真实静帧和运镜片段。
需要 `KIE_AI_API_KEY` 环境变量（在你的 shell 中导出它；此移植版没有附带的环境文件）。
用 `node <skill>/scripts/kie.mjs probe` 检查余额；一张静帧花费几分钱，一段 5 秒
片段更多。

```bash
node <skill>/scripts/kie.mjs still "<style preamble>\n\n<scene>" out/01-hero.png --ar 16:9
node <skill>/scripts/kie.mjs shot  "<camera move>" out/01-hero.png out/01.mp4 --dur 5
bash  <skill>/scripts/encode.sh out/01.mp4 assets/01.mp4
bash  <skill>/scripts/encode.sh out/01.mp4 assets/01-m.mp4 mobile
```

**为快速擦洗而编码，而不是为播放而编码。** `encode.sh` 设置密集的 GOP，
因为快进快退要从上一个关键帧开始走；普通的网页编码擦洗起来如同泥浆。
它还会剥离音频。

## 第 4 步：构建页面

编写真正的 HTML —— 真正的 `<h1>`、真正的 `<p>`、真正的阅读顺序。引擎从你的标记中读取 `data-sc-*` 属性并驱动它；它从不生成 DOM。从 [references/template.html](https://github.com/NousResearch/hermes-agent/blob/main/optional-skills/web-development/scrollcraft/references/template.html) 开始。设备模式：[references/devices.md](https://github.com/NousResearch/hermes-agent/blob/main/optional-skills/web-development/scrollcraft/references/devices.md)。间距、字体、深度、颜色：[references/taste.md](https://github.com/NousResearch/hermes-agent/blob/main/optional-skills/web-development/scrollcraft/references/taste.md) —— 编写标记之前请先阅读它。通过覆盖 token 来设定主题，六个值和两种字体：

```css
:root {
  --sc-canvas: #0A0806;  --sc-surface: #16110E;
  --sc-ink:    #F5EBDD;  --sc-ink-soft: #A2968A;
  --sc-accent: #FF5A3D;  --sc-accent-ink: #15110F;
  --sc-font-display: "Archivo", system-ui, sans-serif;
  --sc-font-text:    "Geist", system-ui, sans-serif;
}
```

## 第 5 步：通过滚动来验证

不是可选项。每个滚动位置都是一个不同的画面；缺陷就藏在你查看的那两帧之间。完整流程：[references/verify.md](https://github.com/NousResearch/hermes-agent/blob/main/optional-skills/web-development/scrollcraft/references/verify.md)。

```bash
cd <build project> && npm i playwright-core     # 执行一次
node <skill>/scripts/serve.mjs --root . --port 4500 &
node <skill>/scripts/shoot.mjs --url http://localhost:4500 --out lab/shots
node <skill>/scripts/shoot.mjs --url http://localhost:4500 --out lab/mobile --width 390 --height 844
node <skill>/scripts/shoot.mjs --url http://localhost:4500 --out lab/reduced --reduced-motion
```

测试装置会在六个位置逐一走查每个幕，等待擦除视频稳定，报告死滚动、从未达到完全不透明度的提示点，以及合成对比度；它会写出一张联系表。然后你自己读取 `sheet.png`（vision_analyze）—— 测试装置证明的是某个片段在推进，而不是页面有什么意义。运行手感检查（[references/feel.md](https://github.com/NousResearch/hermes-agent/blob/main/optional-skills/web-development/scrollcraft/references/feel.md) §6）：冷滚动，每一幕一个词，与 BRIEF.md 做差异比对。二者不一致时，错的是页面，不是简报。

一次绿色的运行并不覆盖真实手机（视频解码器、自动播放策略、低电量模式）。在报告任何移动端缺陷时，第一轮就把 [references/device-diag.html](https://github.com/NousResearch/hermes-agent/blob/main/optional-skills/web-development/scrollcraft/references/device-diag.html) 部署到站点旁，让设备来回答。

## 硬性规则（发布阻断项）

不存在黏土立体模型式的默认风格；没有"滚动以探索"的提示或动画鼠标图标；没有 `01 / 06` 这样的章节计数器；每三个章节最多一个引导标签（eyebrow）；不要出现可见的破折号；改变文案锚点；不要连续两次使用同一设备；绝不在访谈之前就开始构建；一个精心设计的峰值，不是零个也不是三个；结尾要收束，而不是渐淡到一个页脚；先曲线后设备；一个定制的签名动作；针对每一行都达到 6 项指纹检查中的 4 项通过；绝不修改引擎；不要为了对比度使用全画面暗色覆盖（只在文字所在处使用遮罩）；不要把文字烘焙进图像；不要编造统计数据；不使用 `transition: all`，也不动画化 width/height/top/left（用 `transform`/`opacity`；擦除用 `clip-path`）；不要渐变文字或霓虹发光；擦除片段不加音频；没有第 5 步绝不发布。

## 输出

包含 BRIEF.md 的构建文件夹，然后是一份简短报告：语法以及为什么其他七种落选了、签名动作、每一行的指纹门结果、旅程、感受曲线与峰值、手感检查差异、评分表、你生成了什么、你用截图验证了什么，以及你无法验证什么。将本次构建的行追加到 `<workspace>/FINGERPRINTS.md`。

## 陷阱

- `scripts/shoot.mjs` 需要 Playwright（`npm install playwright`，或 `playwright-core` 加一个 Chrome 安装）。Hermes 的 `browser_exec` 工具是更轻量的滚动截图验证替代方案：提供构建内容，逐步滚动，捕获截图，然后自己检查它们。
- `scripts/kie.mjs` 需要 `KIE_AI_API_KEY` 和付费额度；预算不明确时优先使用 `image_generate` 或用户素材。
- `encode.sh` 和 `doctor.mjs` 需要完整的 ffmpeg 构建；发行版精简过的 ffmpeg 会把缺失的滤镜报告为命令语法错误 —— 先运行 `scripts/doctor.mjs`。
- 上面的上游脚本调用是从上游文档复制的，除了 `node --check` 语法校验之外，本移植版未做验证 —— 如果有出入，请以 `--help`/源码为准。
- 上游仓库附带完整示例和变更日志，本移植版未收录；如需它们，请参阅上游仓库。
