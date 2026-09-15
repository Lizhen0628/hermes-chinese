---
title: "Draw Your Font — 将手写照片变​​成可安装的 TTF 字体"
sidebar_label: "Draw Your Font"
description: "将手写照片变成可安装的 TTF 字体"
---

{/* 本页由 website/scripts/generate-skill-docs.py 从技能的 SKILL.md 自动生成。请编辑源 SKILL.md，而不是本页。 */}

# Draw Your Font

将手写照片变成可安装的 TTF 字体。

## 技能元数据

| | |
|---|---|
| 来源 | 可选 — 使用 `hermes skills install official/creative/draw-your-font` 安装 |
| 路径 | `optional-skills/creative\draw-your-font` |
| 版本 | `0.1.0` |
| 作者 | Danilo Znamerovszkij (https://github.com/danilo-znamerovszkij/draw-your-font)，由 Hermes Agent 移植 |
| 许可证 | MIT |
| 平台 | linux, macos, windows |
| 标签 | `font`, `handwriting`, `typography`, `ttf`, `woff`, `vision`, `creative` |
| 相关技能 | [`pixel-art`](/docs/user-guide/skills/optional/creative/creative-pixel-art) |

## 参考：完整 SKILL.md

:::info
以下是 Hermes 在触发此技能时加载的完整技能定义。这是技能激活时智能体看到的指令。
:::

# draw-your-font

输入手写字母照片 → 输出可安装字体。你负责“看”（找到并标记字母、判断质量）；CLI 负责所有几何处理（描摹、度量、字体组装）。切勿自行编辑 SVG 路径或坐标。

## 在 Hermes 中设置（每个会话一次）

CLI 是指定版本的 npm 包 `draw-your-font@0.1.0` — 通过 npx 运行（需要 Node ≥ 18，无需全局安装）：

```bash
npx -y draw-your-font@0.1.0 --help
```

下文示例中凡是出现 `$DYF` 的地方，都请使用 `npx -y draw-your-font@0.1.0`。Shell 变量不会在工具调用之间保留，所以每次都要粘贴完整命令。一切都在本地运行；用户的手写内容绝不会离开本机。

照片会以消息中的文件路径或通过网关图片缓存的方式到达 Hermes — 请将实际文件路径交给 CLI 使用。当对话中出现照片但没有路径时，向用户索要文件（CLI 需要真实文件，而不是你对图片的记忆）。

视觉相关的步骤（联系表、预览、字形表）请通过 `vision_analyze` 加载 PNG 来完成。

## 决定流程

- **用户还没有照片** → 提供模板：打印、书写、拍照。
- **用户分享了手写照片** → 走下面的主流程。
- **用户粘贴了图片但没有文件路径** → 你能看到它，但 CLI 需要文件。请他们
  将图片文件拖入终端（这会插入其路径）或直接提供路径。不要凭记忆继续。
- **用户想要修改本次会话中构建的字体** → 参见“精修”部分。

## 模板流程（最佳质量）

```bash
$DYF template -o template.pdf --charset minimal   # 或者：spanish
```

告诉用户：打印它，用深色笔（0.5 mm 以上）每格写一个字符，让字母坐落在实线上，然后在良好光线下从正上方拍摄每一页并分享文件路径。网格以浅灰色打印并在处理过程中消失 —— 只有他们的墨迹会保留下来。

## 主流程：照片 → 字体

**1. 分割。** 模板页和自由形式的照片都适用：

```bash
$DYF segment photo1.jpg photo2.jpg -d work
```

**2. 先看，再标记。** 用 `vision_analyze` 加载 `work/contact-1.png`（每张照片一个）：每个检测到的墨迹都会编号。这一步需要你的眼睛发挥作用 —— 请检查：

- 每个手写字符是否恰好得到一个框？用分离笔画绘制的字母可能会显示为两个框（重新标记可以解决：给主框该字符，并把碎片标记为 `""`），而两个相触的字母可能共用一个框（请用户仅重拍这些，或接受这个空缺）。
- 垃圾框（阴影、格线、污渍、页面边缘）→ 将其标记为 `""`。

然后写入 `work/labels.json`，将墨迹 id 映射到字符，例如
`{"0": "A", "1": "B", "7": "", "8": "a"}`：

- 模板页：顺序就是模板上打印的字集顺序 —— 请对照实际纸张核实，而不要盲目相信。minimal 顺序：A–Z、a–z、0–9，然后 `.,;:!?'"-()@#&+/$`；spanish 顺序末尾追加 `ÑñÁÉÍÓÚáéíóúü¿¡`。
- 自由形式：从联系表中识别每个字母。形似字母对（S/s、O/o、C/c、X/x……）的大小写由相对大小和位置决定 —— 与你确定无疑的相邻字母进行比较。
- 用户告诉你他们写了什么（例如“ABC 然后 abc”）？相信它，按阅读顺序映射（先顶行，从左到右），并进行视觉核实。
- 同一字母出现两次 → 给画得更好的那个打标签，另一个标为 `""`。

**3. 构建。**

```bash
$DYF build -d work --labels work/labels.json --name "Dan's Hand"
```

以用户的名字命名字体（如果不清楚就问 —— 最多问一个简短的问题）。

**4. 交付前先评估。** 用 `vision_analyze` 加载 `work/preview.png` 和 `work/glyphs.png`，并像艺术总监一样进行批判：

- 断裂或斑驳的字母（描摹不佳）→ 通常是笔迹太淡；尝试
  `--weight 1`，或请求仅重拍那个字母。
- 整体太细/太粗 → 使用 `--weight 1` / `--weight -1` 重新构建。
- 边缘锯齿状 → 使用 `--smooth 1.5`（最高 2）重新构建。
- 字母位置错误（例如 `g` 没有下延部）→ 通常是标记错误；
  修复 labels.json 并重新构建。
- 实心的字碗（b、o、g 看起来是实心的）：本不应发生 —— 如果发生了，
  说明裁剪件有污渍；请求重拍。

重新构建成本低廉，可以安全地反复迭代。先自行修复你能修复的问题；
只有当源墨迹本身有问题时，才打扰用户请求重拍。

**5. 交付。** 字体会生成在 `<workdir>/<NameWithoutSpaces>.ttf`（构建
输出会打印确切路径）。提供该路径及安装方法：
macOS —— 双击 →“安装字体”；Windows —— 右键 →“安装”。
提及缺少了什么（构建会打印未覆盖的字母），并提供以下选项，
但不要强推：

- Web 格式 + CSS：使用 `--formats ttf,woff,woff2,css` 重新构建。
- 可读性报告（见下文）。
- 他们的下一张照片用以补全缺失字符：将全部
  照片（新旧都包括）重新运行 segment 到新的工作目录 —— `$DYF segment p1.jpg p2.jpg -d
  work2` —— 然后从新的联系表重新标记（墨迹 id 会重新编号；
  旧的 labels.json 不会延续）并从新工作目录构建。

## 精修（对话式迭代）

| 用户说 | 操作 |
|---|---|
| “更平滑 / 更圆润” | `build … --smooth 1.5`（最高 2） |
| “更粗 / 更粗体” | `build … --weight 1`（最高 2） |
| “更细 / 更轻” | `build … --weight=-1`（负值需要 `=` 形式） |
| “这个 g 看起来不好” | 向他们展示该字母的 `work/crops/<id>.png`；提供重拍或平滑选项 |
| “字母错了” / 交换 | 编辑 labels.json，重新构建 |
| “给我 woff2 / web” | `build … --formats ttf,woff,woff2,css` |
| 自定义预览文本 | `$DYF preview -d work --text "……"`（构建之后） |

所有精修命令都从已存储的裁剪件重新构建 —— 除非墨迹本身有问题，否则无需重拍。

## 可读性报告（交付后提供）

```bash
$DYF preview -d work --text "minimum mill rn m cl d I l 1 O 0 quick brown fox" -o work/legibility.png
```

阅读它并给出诚实、友善的评价：用于正文文本的 10 分制评分，最可能混淆的
2–3 个字母对（rn→m、cl→d、I/l/1、O/0），以及一
两个具体修复建议（把这些字母写得更大、增加间距）。注意
展示用途（标题、备注）比段落更宽容。绝不要以
此为交付门槛 —— 这是建议，不是阻碍。

## 故障排除

分割找到了太多/太少的墨迹、灰色参考线残留、阴影墨迹、
圆珠笔笔画太淡 → 参见
`references/troubleshooting.md`。
