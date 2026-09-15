---
title: "Pretext — 使用无 DOM 文本布局构建创意浏览器演示"
sidebar_label: "Pretext"
description: "使用无 DOM 文本布局构建创意浏览器演示"
---

{/* 本页由 website/scripts/generate-skill-docs.py 从技能的 SKILL.md 自动生成。请编辑源文件 SKILL.md，而非本页。 */}

# Pretext

使用无 DOM 文本布局构建创意浏览器演示。

## 技能元数据

| | |
|---|---|
| 来源 | 可选 — 通过 `hermes skills install official/creative/pretext` 安装 |
| 路径 | `optional-skills/creative\pretext` |
| 版本 | `1.0.0` |
| 作者 | Hermes Agent |
| 许可证 | MIT |
| 平台 | linux, macos, windows |
| 标签 | `creative-coding`, `typography`, `pretext`, `ascii-art`, `canvas`, `generative`, `text-layout`, `kinetic-typography` |
| 相关技能 | [`p5js`](/docs/user-guide/skills/bundled/creative/creative-p5js), [`claude-design`](/docs/user-guide/skills/bundled/creative/creative-claude-design), [`excalidraw`](/docs/user-guide/skills/optional/creative/creative-excalidraw), [`architecture-diagram`](/docs/user-guide/skills/bundled/creative/creative-architecture-diagram) |

## 参考：完整的 SKILL.md

:::info
以下为此技能被触发时 Hermes 加载的完整技能定义。当技能激活时，这就是智能体看到的指令内容。
:::

# Pretext 创意演示

## 概述

[`@chenglou/pretext`](https://github.com/chenglou/pretext) 是 Cheng Lou（React 核心、ReasonML、Midjourney）编写的 15KB 零依赖 TypeScript 库，用于**无 DOM 的多行文本测量与布局**。它只做一件事：给定 `(text, font, width)`，返回换行位置、每行宽度、每个字素的位置以及总高度——全部通过 canvas 测量完成，无需回流。

这听起来像是管道工程。但并非如此。由于它快速且几何化，它是一个**创意原语**：你可以在 60fps 下让段落围绕移动的精灵重新排布，构建以真实单词作为关卡几何体的游戏，用普通文本驱动 ASCII 标志，以精确的逐字素起始位置将文字粉碎为粒子，或者打包收缩包裹的多行 UI 而无需任何 `getBoundingClientRect` 抖动。

本技能的存在是为了让 Hermes 能够用它制作**炫酷的演示**——那种人们会发到 X 上的作品。参见 `pretext.cool` 和 `chenglou.me/pretext` 了解社区演示合集。

## 何时使用

当用户要求以下内容时使用：
- "pretext demo" / "cool pretext thing" / "text-as-X"
- 文字围绕移动形状流动（主视觉区、编辑排版、动画长文页面）
- 使用**真实单词或散文**而非等宽光栅的 ASCII 艺术效果
- 游戏中的竞技场 / 障碍物 / 方块由文字构成（字母俄罗斯方块、散文打砖块）
- 具有逐字形物理效果的动态排版（粉碎、散开、成群、流动）
- 排版生成艺术，尤其是使用非拉丁文字或混合文字时
- 多行"收缩包裹"UI（仍能容纳文本的最小容器宽度）
- 任何需要在渲染*之前*知道换行位置的情况

不适用于：
- CSS 已能解决布局的静态 SVG/HTML 页面——直接用 CSS 即可
- 富文本编辑器、通用行内格式化引擎（pretext 有意做窄）
- 图像 → 文字（使用 `ascii-art` / `ascii-video` 技能）
- 文字不承担任何角色的纯 canvas 生成艺术——使用 `p5js`

## 创意标准

这是浏览器中渲染的视觉艺术。Pretext 返回数字；**你**来绘制这个东西。

- **不要发布 "hello world" 演示。** `hello-orb-flow.html` 模板只是*起点*。每个交付的演示都必须加入有意图的色彩、动效、构图，以及一个用户没要求但会欣赏的视觉细节。
- **深色背景、暖色核心、精心考量的调色板。** 经典的黑底琥珀色（CRT / 终端）可行，但炭黑底的冷白（编辑排版）和低饱和度粉彩（丝网印刷）也同样可行。选一种并贯彻到底。
- **比例字体才是重点。** Pretext 的整体气质就是"非等宽"——充分发挥这一点。使用 Iowan Old Style、Inter、JetBrains Mono、Helvetica Neue 或可变字体。绝不要使用默认无衬线体。
- **真实源文/文本，而非乱数假文。** 语料应当有意义。短篇宣言、诗歌、真实源代码、拾得文本、库自身的 README——绝不要 `lorem ipsum`。
- **首屏即卓越。** 没有加载状态，没有空白帧。演示必须在打开的那一刻看起来就可以交付。

## 技术栈

每个演示都是单个自包含的 HTML 文件。无需构建步骤。

| 层次 | 工具 | 用途 |
|-------|------|---------|
| 核心 | 通过 `esm.sh` CDN 引入 `@chenglou/pretext` | 文本测量 + 行布局 |
| 渲染 | HTML5 Canvas 2D | 字形渲染、逐帧合成 |
| 分段 | `Intl.Segmenter`（内置） | 用于 emoji / CJK / 组合记号的字素切分 |
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

锁定版本。撰写时为 `@0.0.6`——如果演示行为异常，请查看 [npm](https://www.npmjs.com/package/@chenglou/pretext) 获取最新版本。

## 两种用例

几乎所有场景都可归为以下两种形态之一。请掌握二者。

### 用例 1 —— 只测量，用 CSS/DOM 渲染

```js
const prepared = prepare(text, "16px Inter");
const { height, lineCount } = layout(prepared, 320, 20);
```

你仍然让浏览器绘制文本。Pretext 只是告诉你在给定宽度下盒子会有多高，**不**需要读取 DOM。适用于：
- 行内含换行文本的虚拟化列表
- 需要精确卡片高度的瀑布流布局
- “这个标签放得下吗？”的开发期检查
- 在远程文本加载时防止布局抖动

**确保 `font` 和 `letterSpacing` 与你的 CSS 完全一致。** canvas `ctx.font` 格式（例如 `"16px Inter"`、`"500 17px 'JetBrains Mono'"`）必须与渲染出的 CSS 匹配，否则测量会出现偏差。

### 用例 2 —— 自己测量*并*渲染

```js
const prepared = prepareWithSegments(text, FONT);
const { lines } = layoutWithLines(prepared, 320, 26);
for (let i = 0; i < lines.length; i++) {
  ctx.fillText(lines[i].text, 0, i * 26);
}
```

创意工作就在于此。你掌控绘制，因此可以：
- 渲染到 canvas、SVG、WebGL 或任意坐标系
- 对每个字形施加变换（旋转、抖动、缩放、透明度）
- 将行元数据（宽度、字素位置）用作几何数据

对于**逐行可变宽度**的排版流（环绕形状的文字、甜甜圈状条带中的文字、非矩形栏中的文字）：

```js
let cursor = { segmentIndex: 0, graphemeIndex: 0 };
let y = 0;
while (true) {
  const lineWidth = widthAtY(y);  // 你的函数：这个 y 处的通道有多宽？
  const range = layoutNextLineRange(prepared, cursor, lineWidth);
  if (!range) break;
  const line = materializeLineRange(prepared, range);
  ctx.fillText(line.text, leftEdgeAtY(y), y);
  cursor = range.end;
  y += lineHeight;
}
```

这是整个库中最重要的模式。它解锁了“文字环绕被拖拽的精灵流动”——那个在 X 上爆火的演示。

### 值得了解的辅助函数

- `measureLineStats(prepared, maxWidth)` → `{ lineCount, maxLineWidth }` —— 最宽的一行，即多行收缩包裹宽度。
- `walkLineRanges(prepared, maxWidth, callback)` —— 遍历行而无需分配字符串。当你不需要字符本身，只需对字素做统计/物理运算时使用。
- `@chenglou/pretext/rich-inline` —— 同样的系统，但用于混合字体 / 芯片 / 提及的段落。从该子路径导入。

## 演示配方模式

社区语料库（见 `references/patterns.md`）聚集为几种强模式。挑一个进行发挥——除非有要求，不要发明新类别。

| 模式 | 关键 API | 示例创意 |
|---|---|---|
| **环绕障碍物重排** | `layoutNextLineRange` + 逐行宽度函数 | 杂志风段落围绕被拖拽的光标精灵分列 |
| **文字即几何的游戏** | `layoutWithLines` + 逐行碰撞矩形 | 打砖块游戏中每块砖都是一个测量过的单词 |
| **碎裂 / 粒子** | `walkLineRanges` → 逐字素 (x,y) → 物理 | 点击后句子炸裂成字母 |
| **ASCII 障碍物排版** | `layoutNextLineRange` + 测量的逐行障碍跨度 | 位图 ASCII 徽标、形状变形，以及可拖拽的线框物体——文字围绕其真实的几何形状打开 |
| **杂志风多栏** | 每栏 `layoutNextLineRange` + 共享光标 | 带动画引用块的动画杂志跨页 |
| **动态字体** | `layoutWithLines` + 随时间变化的逐行变换 | 星球大战爬行字幕、波浪、弹跳、故障特效 |
| **多行收缩包裹** | `measureLineStats` | 自动收缩到最紧凑容器的引用卡片 |

`templates/donut-orbit.html` 和 `templates/hello-orb-flow.html` 提供了可直接运行的单文件起始模板。

## 工作流程

1. **从上表中挑选一种模式**，依据用户的 brief。
2. **从模板开始**：
   - `templates/hello-orb-flow.html` — 文本围绕移动的球体重排（绕障重排模式）
   - `templates/donut-orbit.html` — 进阶示例：经过测量的 ASCII 标志障碍物、可拖拽的线框球体/立方体、变形形状场、可选择的 DOM 文本以及仅供开发使用的控件
   - 使用 `write_file` 在 `/tmp/` 或用户的工作区中创建一个新的 `.html` 文件。
3. **替换语料库**，换成贴合 brief 意图的内容。真实的散文，10-100 句，不用 lorem。
4. **调整美学**——字体、配色、构图、交互。这就是正经工作;别跳过这一步。
5. **在本地验证**：
   ```sh
   cd <dir-with-html> && python -m http.server 8765
   # 然后打开 http://localhost:8765/<file>.html
   ```
6. **检查控制台**——如果用错误的字体字符串调用 `prepareWithSegments`,pretext 会抛出异常;`Intl.Segmenter` 在所有现代浏览器中都可用。
7. **给用户显示文件路径**，而不仅仅是代码——他们想打开它。

## 性能注意事项

- `prepare()` / `prepareWithSegments()` 是开销大的调用。对每对文本+字体只做**一次**。缓存返回的句柄。
- 在 resize 时，只重新运行 `layout()` / `layoutWithLines()` ——绝不重新 prepare。
- 对于每帧动画中文本不变但几何变化的情况，在紧凑循环中使用 `layoutNextLineRange` 对于正常长度的段落即使在 60fps 下也足够轻量,可以每帧执行。
- 每帧渲染 ASCII 掩码时,保留一个单元缓冲区(`Uint8Array`/类型化数组),从单元或投影几何中推导出经过测量的每行障碍物区间,合并这些区间,然后在绘制文本之前将这些区间传入 `layoutNextLineRange`。
- 保持视觉动画与布局动画同步。如果球体变形为立方体,使用相同的值同时补间渲染的单元缓冲区和障碍物区间;否则 demo 会看起来像是贴上去的,而不是物理意义上重排的。
- 对于淡入淡出,优先使用图层不透明度,而不是更改字形强度或障碍物缩放。将临时的 ASCII 精灵放在它们自己的 canvas 上,并用 CSS/GSAP 的 opacity 淡入淡出 canvas,这样几何就不会显得缩小。
- Canvas 的 `ctx.font` 设置慢得出人意料;如果字体不变,就每帧设置**一次**,而不是每次 `fillText` 调用时都设置。

## 常见陷阱

1. **CSS/canvas 字体字符串不一致。** 测量时用 `ctx.font = "16px Inter"`,但 CSS 中写的是 `font-family: Inter, sans-serif; font-size: 16px`。如果 Inter 能正常加载就没事。但如果 Inter 返回 404,CSS 会回退到 sans-serif,测量结果会偏移 5-20%。始终对字体使用 `preload` 或使用 web-safe 字体族。

2. **在动画循环内部重新 prepare。** 只有 `layout*` 是轻量的。每帧重新调用 `prepare` 会严重拖垮性能。将准备好的句柄保留在模块作用域中。

3. **用双引号给 graphene 切分时忘记用 `Intl.Segmenter`。** Emoji、组合标记、CJK——`"é".split("")` 会得到两个字符。在采样单个可见字形时,使用 `new Intl.Segmenter(undefined, { granularity: "grapheme" })`。

4. **`break: 'never'` 的小块没有 `extraWidth`。** 在 `rich-inline` 中,如果对原子区域块/提及使用 `break: 'never'`,还必须为药丸内边距提供 `extraWidth`——否则块外壳会溢出容器。

5. **从 `unpkg` 使用 `@chenglou/pretext` 的纯 TypeScript 入口。** 使用 `esm.sh`——它会自动将 TS 导出编译为浏览器就绪的 ESM。`unpkg` 会返回 404 或提供原始 TS。

6. **Monospace 回退悄然抹杀了整个要点。** 看到 monospace 风格输出的用户其 CSS `font-family` 往往回退到了 `monospace`。通过 DevTools 验证实际渲染的字体。

7. **围绕形状排版时跳过行与调整宽度。** 如果此行上的走廊太窄，装不下一行,直接*跳过该行*(`y += lineHeight; continue;`),而不是将很小的 maxWidth 传给 `layoutNextLineRange`——pretext 会返回看起来像是坏掉的单字形行。

8. **交付一个冷启动的 demo。** 默认的首次绘制看起来像教程级别。加入：晕影、细微扫描线、空闲自动运动、一个精心挑选的交互响应(拖拽、悬停、滚动、点击)。没有这些,"很酷的 pretext demo" 会被当成 "官方文档示例的实习生复刻"。

## 验证清单

- [ ] Demo 是单个自包含的 `.html` 文件——双击即可打开,或通过 `python -m http.server` 打开
- [ ] `@chenglou/pretext` 通过 `esm.sh` 引入,并固定版本
- [ ] 语料库是真实的散文,不是 lorem ipsum,并且与 demo 的概念相匹配
- [ ] 传给 `prepare` 的字体字符串与 CSS 字体完全一致
- [ ] `prepare()` / `prepareWithSegments()` 只调用一次,而非每帧
- [ ] 深色背景 + 经过深思的配色——不是默认的白色画布
- [ ] 至少有一个交互响应(拖拽 / 悬停 / 滚动 / 点击)或空闲自动运动
- [ ] 已在本地用 `python -m http.server` 测试,并确认没有控制台错误
- [ ] 在中端笔记本上达到 60fps(或记录了可接受的降级方案)
- [ ] 一个用户没提出过的“超预期”细节

## 参考：社区 demos

克隆这些获取灵感 / 模式(均为 MIT 类许可,链接来自 [pretext.cool](https://www.pretext.cool/)):

- **Pretext Breaker**——用单词积木进行的打砖块—— `github.com/rinesh/pretext-breaker`
- **Tetris × Pretext**—— `github.com/shinichimochizuki/tetris-pretext`
- **Dragon animation**—— `github.com/qtakmalay/PreTextExperiments`
- **Somnai editorial engine**—— `github.com/somnai-dreams/pretext-demos`
- **Bad Apple!! ASCII**—— `github.com/frmlinn/bad-apple-pretext`
- **Drag-sprite reflow**—— `github.com/dokobot/pretext-demo`
- **Alarmy editorial clock**—— `github.com/SmisLee/alarmy-pretext-demo`

官方 playground: [chenglou.me/pretext](https://chenglou.me/pretext/) — accordion、bubbles、dynamic-layout、editorial-engine、justification-comparison、masonry、markdown-chat、rich-note。
