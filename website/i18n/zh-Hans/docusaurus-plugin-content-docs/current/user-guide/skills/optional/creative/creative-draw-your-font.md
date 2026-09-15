---
title: "Draw Your Font — 将手写照片转成可安装的 TTF 字体"
sidebar_label: "Draw Your Font"
description: "将手写照片转成可安装的 TTF 字体"
---

{/* This page is auto-generated from the skill's SKILL.md by website/scripts/generate-skill-docs.py. Edit the source SKILL.md, not this page. */}

# Draw Your Font

将手写照片转成可安装的 TTF 字体。

## 技能元数据

| | |
|---|---|
| 来源 | 可选 — 通过 `hermes skills install official/creative/draw-your-font` 安装 |
| 路径 | `optional-skills/creative\draw-your-font` |
| 版本 | `0.1.0` |
| 作者 | Danilo Znamerovszkij (https://github.com/danilo-znamerovszkij/draw-your-font)，由 Hermes Agent 移植 |
| 许可证 | MIT |
| 平台 | linux, macos, windows |
| 标签 | `font`, `handwriting`, `typography`, `ttf`, `woff`, `vision`, `creative` |
| 相关技能 | [`pixel-art`](/docs/user-guide/skills/optional/creative/creative-pixel-art) |

## 参考：完整 SKILL.md

:::info
以下是 Hermes 在触发本技能时加载的完整技能定义。也就是技能激活时智能体所看到的指令。
:::

# draw-your-font

手写字母照片输入 → 可安装字体输出。视觉部分由你完成（找到并标注字母、判断质量）；几何计算（描迹、度量、字体组装）全部由 CLI 负责。切勿自行编辑 SVG 路径或坐标。

## 在 Hermes 中设置（每个会话一次）

CLI 是固定版本的 npm 包 `draw-your-font@0.1.0` — 通过 npx 运行 (需要 Node ≥ 18，无需全局安装):

```bash
npx -y draw-your-font@0.1.0 --help
```

下文示例中凡是出现 `$DYF` 的地方，都改用 `npx -y draw-your-font@0.1.0`。shell 变量在工具调用之间不会保留，因此每次都要粘贴完整命令。一切都在本地运行；用户的手写内容绝不会离开本机。

照片会以消息中的文件路径或通过网关图片缓存到达 Hermes — 请将实际文件路径用于 CLI。当对话中出现一张照片但没有任何路径时，向用户索要文件 (CLI 需要真实文件，而不是你记忆中的图像)。

视觉步骤（联系表、预览、字形表）请通过 `vision_analyze` 加载 PNG 来完成。

## 决定流程

- **用户还没有照片** → 提供模板：打印、书写、拍照。
- **用户分享了一张或多张手写照片** → 走下方主流程。
- **用户粘贴了图像但没有文件路径** → 你能看到它，但 CLI 需要一个文件。请让用户将该图像文件拖入终端 (这会插入其路径) 或直接给出路径。不要凭记忆继续。
- **用户想要修改本次会话中构建的字体** → 参见精修部分。

## 模板流程（最佳质量）

```bash
$DYF template -o template.pdf --charset minimal   # 或：spanish
```

告诉用户：将其打印，用深色笔 (0.5 mm 以上) 在每个方框中写一个字符，让字母坐在实线上，然后在光线充足的环境下从正上方拍摄每一页，并分享文件路径。网格以浅灰色打印，并在处理过程中消失 — 只有他们的墨迹会保留下来。

## 主流程：照片 → 字体

**1. 分割。** 同样适用于模板页和自由形式的照片：

```bash
$DYF segment photo1.jpg photo2.jpg -d work
```

**2. 观察，然后标注。** 用 `vision_analyze` 加载 `work/contact-1.png` (每张照片一个)：每个检测到的斑块都有编号。这一步是你的眼睛发挥作用的地方 — 检查：

- 每个写下的字符是否都恰好得到一个方框？由分离笔画绘制的字母可能显示为两个方框 (重新标注可处理：给主方框标注该字符，并将碎片标记为 `""`)，而两个相邻的字母可能共用一个方框 (请用户仅针对这些重新拍摄，或接受这个缺口)。
- 垃圾方框 (阴影、横线、污渍、页面边缘) → 将其标注为 `""`。

然后编写 `work/labels.json`，映射斑块 id → 字符，例如
`{"0": "A", "1": "B", "7": "", "8": "a"}`:

- 模板页：顺序就是模板上打印的字符集顺序 — 对照纸张加以核对，不要盲目相信。minimal 顺序：A–Z、a–z、0–9，然后是 `.,;:!?'"-()@#&+/$`；spanish 在此基础上追加 `ÑñÁÉÍÓÚáéíóúü¿¡`。
- 自由形式：从联系表逐个识别每个字母。形状相近者的大写与小写 (S/s、O/o、C/c、X/x……) 由相对大小和位置决定 — 与你确定的相邻字母进行比较。
- 用户告诉过你他们写了什么 (例如 "先是 ABC 然后 abc")？相信它，按阅读顺序映射 (先第一行，从左到右)，并进行视觉核对。
- 同一字母出现两次 → 标注画得更好的那个，将另一个标为 `""`。

**3. 构建。**

```bash
$DYF build -d work --labels work/labels.json --name "Dan's Hand"
```

以用户的名字命名字体 (如果不清楚就询问 — 最多问一个简短的问题)。

**4. 交付前先评判。** 用 `vision_analyze` 加载 `work/preview.png` 和 `work/glyphs.png`，像艺术总监一样点评：

- 断开的或斑驳的字母 (描迹不佳) → 通常是笔迹太淡；尝试 `--weight 1`，或请求仅针对该字母重新拍摄。
- 全部都太细/太粗 → 用 `--weight 1` / `--weight -1` 重新构建。
- 边缘锯齿 → 用 `--smooth 1.5` 重新构建 (最高到 2)。
- 某个字母位置错误 (例如 `g` 不下伸) → 通常是标注错误；修正 labels.json 并重新构建。
- 字腔被填实 (b、o、g 看起来是实心的)：这不应该发生 — 如果发生了，说明裁剪区域被涂抹了；请求重新拍摄。

重新构建成本低，可以安全地反复迭代。先自行修复你能修好的；只有当源墨迹本身有问题时才需要麻烦用户重新拍摄。

**5. 交付。** 字体生成在 `<工作目录>/<去除空格的名称>.ttf` (构建输出会打印出准确路径)。给出该路径以及安装方法：
macOS — 双击 → "Install Font"；Windows — 右键点击 → "Install"。
说明缺失的内容 (构建会打印出未覆盖的字母)，并在不强推的情况下提供：

- Web 格式 + CSS：用 `--formats ttf,woff,woff2,css` 重新构建。
- 易读性评估 (见下文)。
- 用他们的下一张照片填补缺失字符：将所有照片 (旧的和新的) 重新运行 segment 到全新的工作目录 — `$DYF segment p1.jpg p2.jpg -d work2` — 然后根据新的联系表重新标注 (斑块 id 会重新编号；旧的 labels.json 不会沿用)，并从新的工作目录构建。

## 精修（对话式迭代）

| 用户说 | 做法 |
|---|---|
| "更平滑 / 更圆润" | `build … --smooth 1.5` (最大 2) |
| "更粗 / 更醒目" | `build … --weight 1` (最大 2) |
| "更细 / 更轻" | `build … --weight=-1` (负数需要 `=` 形式) |
| "这个 g 看起来不好" | 向他们展示该字母的 `work/crops/<id>.png`；提供重新拍摄或平滑处理 |
| "字母错了" / 交换 | 编辑 labels.json，重新构建 |
| "给我 woff2 / web" | `build … --formats ttf,woff,woff2,css` |
| 自定义预览文本 | `$DYF preview -d work --text "…"` (在构建之后) |

所有精修命令都从存储的裁剪图重新构建 — 除非墨迹本身有问题，否则无需重新拍摄。

## 易读性报告（交付后提供）

```bash
$DYF preview -d work --text "minimum mill rn m cl d I l 1 O 0 quick brown fox" -o work/legibility.png
```

阅读并给出诚实、友善的评价：针对正文使用的十分制评分，最可能让人混淆的 2–3 组字母对 (rn→m、cl→d、I/l/1、O/0)，以及一两条具体改进建议 (将那些字母写得更大、间距更宽)。注意展示用途 (标题、笔记) 比段落正文更宽容。切勿以此作为交付的前提 — 这是建议，而非阻碍。

## 故障排查

分割找到的斑块过多/过少、灰色辅助线残留、阴影斑块、圆珠笔笔迹过淡 → 参见 `references/troubleshooting.md`。
