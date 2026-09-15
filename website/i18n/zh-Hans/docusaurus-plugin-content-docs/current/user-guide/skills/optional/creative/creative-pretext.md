---
title: "Pretext — 使用无 DOM 文本布局构建创意浏览器演示"
sidebar_label: "Pretext"
description: "使用无 DOM 文本布局构建创意浏览器演示"
---

{/* 此页面由 website/scripts/generate-skill-docs.py 从技能的 SKILL.md 自动生成。请编辑源 SKILL.md，而非此页面。 */}

# Pretext

使用无 DOM 文本布局构建创意浏览器演示。

## 技能元数据

| | |
|---|---|
| 来源 | 可选 — 使用 `hermes skills install official/creative/pretext` 安装 |
| 路径 | `optional-skills/creative\pretext` |
| 版本 | `1.0.0` |
| 作者 | Hermes Agent |
| 许可证 | MIT |
| 平台 | linux, macos, windows |
| 标签 | `creative-coding`, `typography`, `pretext`, `ascii-art`, `canvas`, `generative`, `text-layout`, `kinetic-typography` |
| 相关技能 | [`p5js`](/docs/user-guide/skills/bundled/creative/creative-p5js), [`claude-design`](/docs/user-guide/skills/bundled/creative/creative-claude-design), [`excalidraw`](/docs/user-guide/skills/optional/creative/creative-excalidraw), [`architecture-diagram`](/docs/user-guide/skills/bundled/creative/creative-architecture-diagram) |

## 参考：完整 SKILL.md

:::info
以下是 Hermes 在触发此技能时加载的完整技能定义。这就是技能激活时智能体所看到的指令。
:::

# Pretext 创意演示

## 概述

[`@chenglou/pretext`](https://github.com/chenglou/pretext) 是 Cheng Lou（React 核心、ReasonML、Midjourney）开发的一个 15KB 零依赖 TypeScript 库，用于**无 DOM 的多行文本测量与布局**。它只做一件事：给定 `(text, font, width)`，返回换行位置、每行宽度、每个字素的位置以及总高度——全部通过 canvas 测量完成，无需重排。

这听起来像是管道工程。但并非如此。因为它快速且具有几何性质，它是一个**创意原语**：你可以在 60fps 下围绕移动的精灵重新排版段落，构建关卡几何由真实单词组成的游戏，让 ASCII 标志流经散文，将文本打碎成具有精确逐字素起始位置的粒子，或者打包紧缩换行的多行 UI，而无需任何 `getBoundingClientRect` 抖动。

此技能的存在是为了让 Hermes 能够用它制作**酷炫的演示**——那种人们会发到 X 上的作品。参见 `pretext.cool` 和 `chenglou.me/pretext` 了解社区演示集。

## 何时使用

在用户要求以下内容时使用：
- “pretext 演示” / “酷炫的 pretext 东西” / “文本作为 X”
- 文本围绕移动形状流动（主视觉区域、编辑排版、动画长文页面）
- 使用**真实单词或散文**而非等宽光栅的 ASCII 艺术效果
- 游戏场地/障碍物/砖块由文本组成的游戏（字母俄罗斯方块、散文打砖块）
- 具有逐字形物理效果的动态排版（破碎、散落、群集、流动）
- 排版生成艺术，尤其是使用非拉丁文字或混合文字
- 多行“紧缩换行” UI（仍能容纳文本的最小容器宽度）
- 任何需要在渲染*之前*知道换行位置的情况

不适用于：
- 静态 SVG/HTML 页面，CSS 已能解决布局——直接使用 CSS 即可
- 富文本编辑器、通用行内格式引擎（pretext 有意保持窄范围）
- 图像 → 文本（使用 `ascii-art` / `ascii-video` 技能）
- 无文本角色的纯 canvas 生成艺术——使用 `p5js`

## 创意标准

这是在浏览器中渲染的视觉艺术。Pretext 返回数字；**你**来绘制作品。

- **不要交付“hello world”演示。** `hello-orb-flow.html` 模板只是*起*点。每个交付的演示都必须添加有意的色彩、运动、构图，以及一个用户没要求但会喜欢的视觉细节。
- **深色背景、暖色核心、讲究的配色。** 经典的琥珀色配黑色（CRT / 终端）可行，但冷白色配炭灰色（编辑风格）和低饱和度粉彩（孔版印刷）同样可行。选一个并坚持。
- **比例字体是关键。** Pretext 的整个风格就是“非等宽”——深入利用它。使用 Iowan Old Style、Inter、JetBrains Mono、Helvetica Neue 或可变字体。永远不要用默认无衬线字体。
- **真实源文本，而非 lorem ipsum。** 语料应当有意义。短宣言、诗歌、真实源代码、拾得文本、库自己的 README——永远不要 `lorem ipsum`。
- **首帧卓越。** 没有加载状态，没有空白帧。演示打开的那一刻就必须看起来可交付。

## 技术栈

每个演示都是单个自包含 HTML 文件。无需构建步骤。

| 层级 | 工具 | 用途 |
|-------|------|---------|
| 核心 | 通过 `esm.sh` CDN 引入 `@chenglou/pretext` | 文本测量 + 行布局 |
| 渲染 | HTML5 Canvas 2D | 字形渲染、逐帧合成 |
| 分割 | `Intl.Segmenter`（内置） | 为 emoji / CJK / 组合标记进行字素拆分 |
| 交互 | 原生 DOM 事件 | 鼠标 / 触摸 / 滚轮——无框架 |

```html
<script type="module">
import {
  prepare, layout,                   // 用例 1：简单高度
  prepareWithSegments, layoutWithLines,  // 用例 2a：固定宽度行
  layoutNextLineRange, materializeLineRange, // 用例 2b：流式 / 可变宽度
  measureLineStats, walkLineRanges,  // 无需字符串分配的统计
} from "https://esm.sh/@chenglou/pretext@0.0.6";
</script>
```

固定版本号。撰写时为 `@0.0.6` —— 如果演示行为异常，请到 [npm](https://www.npmjs.com/package/@chenglou/pretext) 查看最新版本。

## 两种用例

几乎所有情况都可归结为这两种形态之一。两者都要掌握。

### 用例 1 —— 测量，然后用 CSS/DOM 渲染

```js
const prepared = prepare(text, "16px Inter");
const { height, lineCount } = layout(prepared, 320, 20);
```

你仍然让浏览器来绘制文本。Pretext 只是告诉你在给定宽度下盒子会有多高，**无需** DOM 读取。适用于：
- 行内含自动换行文本的虚拟化列表
- 需要精确卡片高度的瀑布流布局
- “这个标签放得下吗？”的开发期检查
- 远程文本加载时防止布局抖动

**让 `font` 和 `letterSpacing` 与你的 CSS 完全保持一致。** canvas 的 `ctx.font` 格式（例如 `"16px Inter"`、`"500 17px 'JetBrains Mono'"`）必须与实际渲染的 CSS 匹配，否则测量会产生偏差。

### 用例 2 —— *同时* 测量并自行渲染

```js
const prepared = prepareWithSegments(text, FONT);
const { lines } = layoutWithLines(prepared, 320, 26);
for (let i = 0; i < lines.length; i++) {
  ctx.fillText(lines[i].text, 0, i * 26);
}
```

这里才是创意工作所在。你掌控绘制，所以你可以：
- 渲染到 canvas、SVG、WebGL，或任何坐标系
- 对每个字形替换变换（旋转、抖动、缩放、透明度）
- 把行元数据（宽度、字素位置）当作几何数据使用

对于**逐行可变宽度**的排版流（文字绕形状排列、文字排成圆环带、文字排入非矩形列）：

```js
let cursor = { segmentIndex: 0, graphemeIndex: 0 };
let y = 0;
while (true) {
  const lineWidth = widthAtY(y);  // 你的函数：此 y 处的通廊有多宽？
  const range = layoutNextLineRange(prepared, cursor, lineWidth);
  if (!range) break;
  const line = materializeLineRange(prepared, range);
  ctx.fillText(line.text, leftEdgeAtY(y), y);
  cursor = range.end;
  y += lineHeight;
}
```

这是整个库中最重要的模式。它解锁了“文字绕过被拖拽精灵流动”——那个在 X 上爆火的演示。

### 值得了解的辅助函数

- `measureLineStats(prepared, maxWidth)` → `{ lineCount, maxLineWidth }` —— 最宽的一行，即多行收缩包裹宽度。
- `walkLineRanges(prepared, maxWidth, callback)` —— 遍历各行而不分配字符串。当你不需要字符本身、只需要对字素做统计/物理运算时使用。
- `@chenglou/pretext/rich-inline` —— 同一套系统，但用于混合字体 / 芯片 / @提及 的段落。从该子路径导入。

## 演示配方模式

社区作品集（见 `references/patterns.md`）可归结为若干强势模式。挑一个并加以变奏——除非被要求，否则不要发明新类别。

| 模式 | 关键 API | 示例点子 |
|---|---|---|
| **绕障碍重排** | `layoutNextLineRange` + 逐行宽度函数 | 杂志式段落围绕被拖拽的光标精灵分开 |
| **文本即几何的游戏** | `layoutWithLines` + 逐行碰撞矩形 | 打砖块游戏，每块砖都是被测量过的单词 |
| **碎裂 / 粒子** | `walkLineRanges` → 逐字素 (x,y) → 物理 | 点击后爆炸成字母的句子 |
| **ASCII 障碍排版** | `layoutNextLineRange` + 逐行障碍跨度测量 | 位图 ASCII 标志、形状形变，以及可拖拽的线框物体，让文字绕其真实几何形状散开 |
| **杂志式多列** | 每列 `layoutNextLineRange` + 共享游标 | 带动人引文的动画杂志跨页 |
| **动感字体** | `layoutWithLines` + 随时间变换各行 | 星球大战式爬升、波浪、弹跳、故障 |
| **多行收缩包裹** | `measureLineStats` | 自动收缩到最紧凑容器的引文卡片 |

可运行的单文件起步模板参见 `templates/donut-orbit.html` 和 `templates/hello-orb-flow.html`。

## 工作流程

1. **选择一种模式**——根据用户的简要需求，从上表中挑选。
2. **从模板开始**：
   - `templates/hello-orb-flow.html` —— 文本围绕移动的球体重新排版（绕过障碍物重新排版模式）
   - `templates/donut-orbit.html` —— 进阶示例：经过测量的 ASCII 标志障碍物、可拖拽的线框球体/立方体、变形形状场、可选择的 DOM 文本，以及仅用于开发的控件
   - 用 `write_file` 写入 `/tmp/` 或用户工作区中的新 `.html`。
3. **替换语料库**，换成符合简要需求的内容。使用真实文章，10-100 句，不要用 lorem。
4. **调整美学**——字体、调色板、构图、交互。这才是核心工作；不要跳过。
5. **在本地验证**：
   ```sh
   cd <dir-with-html> && python -m http.server 8765
   # then open http://localhost:8765/<file>.html
   ```
6. **检查控制台**——如果用错误的字体字符串调用 `prepareWithSegments`，pretext 会抛错；`Intl.Segmenter` 在所有现代浏览器中都可用。
7. **把文件路径展示给用户**，而不只是代码——他们想要打开它。

## 性能注意事项

- `prepare()` / `prepareWithSegments()` 是开销较大的调用。每个文本+字体对**只需执行一次**。缓存其句柄。
- 在窗口尺寸变化时，只重新运行 `layout()` / `layoutWithLines()`——绝不要重新 prepare。
- 对于逐帧动画中文本不变但几何形状会变化的情况，在紧循环中调用 `layoutNextLineRange` 足够廉价，可以在 60fps 下对普通长度的段落每帧执行。
- 逐帧渲染 ASCII 掩码时，保留一个单元格缓冲区（`Uint8Array`/类型化数组），从单元格或投影几何推导出测量到的每行障碍物跨度，合并这些跨度，然后在绘制文本之前将这些跨度输入 `layoutNextLineRange`。
- 保持视觉动画与布局动画相互耦合。如果球体变形成一个立方体，用相同的值同时补间渲染的单元格缓冲区和障碍物跨度；否则演示看起来像是贴上去的，而不是真正被物理重新排版。
- 对于淡出效果，优先使用图层不透明度，而不是更改字形强度或障碍物缩放。将短暂的 ASCII 精灵放在它们自己的画布上，并用 CSS/GSAP 不透明度让画布淡出，这样几何形状就不会显得在缩小。
- 画布 `ctx.font` 的设置慢得惊人；如果字体不变，每帧**设置一次**，而不是每次 `fillText` 调用都设置。

## 常见陷阱

1. **CSS/画布字体字符串漂移。** `ctx.font = "16px Inter"` 被测量，但 CSS 写的是 `font-family: Inter, sans-serif; font-size: 16px`。*如果* Inter 加载成功就没问题。如果 Inter 返回 404，CSS 会回退到 sans-serif，测量值就会漂移 5-20%。始终 `preload` 字体，或使用 web 安全字体族。

2. **在动画循环内重新 prepare。** 只有 `layout*` 是廉价的。每帧重新调用 `prepare` 会拖垮性能。将已 prepare 的句柄保留在模块作用域中。

3. **忘记用 `Intl.Segmenter` 进行字素拆分。** 表情符号、组合标记、CJK——`"é".split("")` 会得到两个字符。对单个可见字形采样时，使用 `new Intl.Segmenter(undefined, { granularity: "grapheme" })`。

4. **`break: 'never'` 的自定义标签没有 `extraWidth`。** 在 `rich-inline` 中，如果你为原子化标签/提及使用 `break: 'never'`，还必须提供用于药丸状内边距的 `extraWidth`——否则标签外观会溢出容器。

5. **从 `unpkg` 加载仅含 TypeScript 入口的 `@chenglou/pretext`。** 使用 `esm.sh`——它会自动将 TS 导出编译为可直接在浏览器中使用的 ESM。`unpkg` 会返回 404 或提供原始 TS。

6. **等宽字体回退悄无声息地抹掉了重点。** 看到类似等宽输出的用户，通常是 CSS `font-family` 回退到了 `monospace`。通过 DevTools 验证实际渲染的字体。

7. **绕过形状时跳过行与调整宽度的区别。** 如果该行的走廊太窄容不下一行，*跳过该行*（`y += lineHeight; continue;`），而不是向 `layoutNextLineRange` 传入一个极小的 maxWidth——pretext 会返回单个字素的行，看起来像坏掉了。

8. **发布一个冷冰冰的演示。** 默认的首屏渲染看起来像教程级别。要添加：暗角、细微扫描线、空闲自动运动、一个精心选择的交互响应（拖拽、悬停、滚动、点击）。没有这些，“炫酷的 pretext 演示”就会沦为“README 的实习生复刻版”。

## 验证清单

- [ ] 演示是单个自包含的 `.html` 文件——双击即可打开，或通过 `python -m http.server` 打开
- [ ] 通过 `esm.sh` 导入 `@chenglou/pretext`，并锁定版本
- [ ] 语料库是真实文章，而非 lorem ipsum，且与演示的概念相符
- [ ] 传给 `prepare` 的字体字符串与 CSS 字体完全一致
- [ ] `prepare()` / `prepareWithSegments()` 只调用一次，而不是每帧调用
- [ ] 深色背景 + 经过考量的调色板——不要用默认的白色画布
- [ ] 至少有一个交互响应（拖拽 / 悬停 / 滚动 / 点击）或空闲自动运动
- [ ] 用 `python -m http.server` 在本地测试，并确认没有控制台错误
- [ ] 在中端笔记本电脑上达到 60fps（或记录了优雅降级方案）
- [ ] 一个用户没有要求的“额外加分”细节

## 参考资料：社区演示

克隆这些以获得灵感 / 模式参考（大多为 MIT 许可，链接自 [pretext.cool](https://www.pretext.cool/)）：

- **Pretext Breaker** —— 用字块打出的打砖块 —— `github.com/rinesh/pretext-breaker`
- **Tetris × Pretext** —— `github.com/shinichimochizuki/tetris-pretext`
- **Dragon animation** —— `github.com/qtakmalay/PreTextExperiments`
- **Somnai editorial engine** —— `github.com/somnai-dreams/pretext-demos`
- **Bad Apple!! ASCII** —— `github.com/frmlinn/bad-apple-pretext`
- **Drag-sprite reflow** —— `github.com/dokobot/pretext-demo`
- **Alarmy editorial clock** —— `github.com/SmisLee/alarmy-pretext-demo`

官方游乐场：[chenglou.me/pretext](https://chenglou.me/pretext/) —— accordion、bubbles、dynamic-layout、editorial-engine、justification-comparison、masonry、markdown-chat、rich-note。
