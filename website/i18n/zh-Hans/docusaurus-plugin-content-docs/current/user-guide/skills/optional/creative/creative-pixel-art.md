---
title: "像素艺术 — 使用年代调色板的像素艺术（NES、Game Boy、PICO-8）"
sidebar_label: "像素艺术"
description: "使用年代调色板的像素艺术（NES、Game Boy、PICO-8）"
---

{/* 此页面由 website/scripts/generate-skill-docs.py 从技能的 SKILL.md 自动生成。请编辑源 SKILL.md，而非此页面。 */}

# 像素艺术

使用年代调色板的像素艺术（NES、Game Boy、PICO-8）。

## 技能元数据

| | |
|---|---|
| 来源 | 可选 — 使用 `hermes skills install official/creative/pixel-art` 安装 |
| 路径 | `optional-skills/creative\pixel-art` |
| 版本 | `2.0.0` |
| 作者 | dodo-reach |
| 许可证 | MIT |
| 平台 | linux, macos, windows |
| 标签 | `creative`, `pixel-art`, `arcade`, `snes`, `nes`, `gameboy`, `retro`, `image`, `video` |

## 参考：完整 SKILL.md

:::info
以下是 Hermes 在此技能被触发时加载的完整技能定义。这就是技能激活时智能体所看到的指令内容。
:::

# 像素艺术

将任意图像转换为复古像素艺术，然后可选地将其动画化为带有年代贴合效果（雨、萤火虫、雪、余烬）的短 MP4 或 GIF。

此技能附带两个脚本：

- `scripts/pixel_art.py` — 照片 → 像素艺术 PNG（Floyd-Steinberg 抖动）
- `scripts/pixel_art_video.py` — 像素艺术 PNG → 动画 MP4（+ 可选 GIF）

每个脚本都既可导入也可直接运行。当你需要年代精确的颜色时，预设会吸附到硬件调色板（NES、Game Boy、PICO-8 等），或使用自适应 N 色量化来获得街机/SNES 风格的外观。

## 何时使用

- 用户想要从源图像生成复古像素艺术
- 用户要求 NES / Game Boy / PICO-8 / C64 / 街机 / SNES 风格
- 用户想要短循环动画（雨景、夜空、雪等）
- 海报、专辑封面、社交帖子、精灵图、角色、头像

## 工作流

在生成之前，先与用户确认风格。不同预设会产生非常不同的输出，重新生成成本高昂。

### 步骤 1 — 提供风格选项

用 4 个代表性预设调用 `clarify`。根据用户的要求选择这一组——不要只是把全部 14 个都倒出来。

当用户意图不明确时的默认菜单：

```python
clarify(
    question="你想要哪种像素艺术风格？",
    choices=[
        "arcade — 粗犷、厚重的 80 年代街机感觉（16 色，8px）",
        "nes — 任天堂 8 位硬件调色板（54 色，8px）",
        "gameboy — 4 级绿阶 Game Boy DMG（4 色，8px）",
        "snes — 更干净的 16 位外观（32 色，4px）",
    ],
)
```

当用户已经指定了年代（例如 "80s arcade"、"Gameboy"）时，跳过 `clarify`，直接使用匹配的预设。

### 步骤 2 — 提供动画选项（可选）

如果用户要求视频/GIF，或输出可能从动感中受益，询问选择哪个场景：

```python
clarify(
    question="想要让它动起来吗？选择一个场景或跳过。",
    choices=[
        "night — 星星 + 萤火虫 + 落叶",
        "urban — 雨 + 霓虹脉冲",
        "snow — 飘落的雪花",
        "skip — 只要图片",
    ],
)
```

不要连续调用 `clarify` 超过两次。一次选风格，如果涉及动画则再选一次场景。如果用户在消息中明确要求了特定风格和场景，则完全跳过 `clarify`。

### 步骤 3 — 生成

首先运行 `pixel_art()`；如果要求了动画，则对结果继续链式调用 `pixel_art_video()`。

## 预设目录

| 预设 | 年代 | 调色板 | 块大小 | 最适合 |
|--------|-----|---------|-------|----------|
| `arcade` | 80 年代街机 | 自适应 16 | 8px | 粗犷海报、主视觉 |
| `snes` | 16 位 | 自适应 32 | 4px | 角色、精细场景 |
| `nes` | 8 位 | NES（54） | 8px | 真正的 NES 外观 |
| `gameboy` | DMG 掌机 | 4 级绿阶 | 8px | 单色 Game Boy |
| `gameboy_pocket` | Pocket 掌机 | 4 级灰阶 | 8px | 单色 GB Pocket |
| `pico8` | PICO-8 | 16 固定 | 6px | 幻想主机外观 |
| `c64` | Commodore 64 | 16 固定 | 8px | 8 位家用电脑 |
| `apple2` | Apple II 高分辨率 | 6 固定 | 10px | 极致复古，6 色 |
| `teletext` | BBC Teletext | 8 纯色 | 10px | 厚重的原色 |
| `mspaint` | Windows MS Paint | 24 固定 | 8px | 怀旧桌面 |
| `mono_green` | CRT 磷光 | 2 绿 | 6px | 终端/CRT 美学 |
| `mono_amber` | CRT 琥珀色 | 2 琥珀 | 6px | 琥珀色显示器外观 |
| `neon` | 赛博朋克 | 10 霓虹色 | 6px | 蒸汽波/赛博 |
| `pastel` | 柔和粉彩 | 10 粉彩 | 6px | 可爱 / 温柔 |

命名调色板位于 `scripts/palettes.py`（完整列表见 `references/palettes.md` —— 共 28 个命名调色板）。任何预设都可被覆盖：

```python
pixel_art("in.png", "out.png", preset="snes", palette="PICO_8", block=6)
```

## 场景目录（用于视频）

| 场景 | 效果 |
|-------|---------|
| `night` | 闪烁的星星 + 萤火虫 + 飘动的落叶 |
| `dusk` | 萤火虫 + 闪光 |
| `tavern` | 尘埃微粒 + 温暖闪光 |
| `indoor` | 尘埃微粒 |
| `urban` | 雨 + 霓虹脉冲 |
| `nature` | 落叶 + 萤火虫 |
| `magic` | 闪光 + 萤火虫 |
| `storm` | 雨 + 闪电 |
| `underwater` | 气泡 + 光亮闪烁 |
| `fire` | 余烬 + 闪光 |
| `snow` | 雪花 + 闪光 |
| `desert` | 热浪 + 尘埃 |

## 调用方式

### Python（导入）

```python
import sys
import os
sys.path.insert(0, os.path.expanduser("~/.hermes/skills/creative/pixel-art/scripts"))
from pixel_art import pixel_art
from pixel_art_video import pixel_art_video

# 1. 转换为像素艺术
pixel_art("/path/to/photo.jpg", "/tmp/pixel.png", preset="nes")

# 2. 动画化（可选）
pixel_art_video(
    "/tmp/pixel.png",
    "/tmp/pixel.mp4",
    scene="night",
    duration=6,
    fps=15,
    seed=42,
    export_gif=True,
)
```

### CLI

```bash
cd ~/.hermes/skills/creative/pixel-art/scripts

python pixel_art.py in.jpg out.png --preset gameboy
python pixel_art.py in.jpg out.png --preset snes --palette PICO_8 --block 6

python pixel_art_video.py out.png out.mp4 --scene night --duration 6 --gif
```

## 流水线原理

**像素转换：**
1. 增强对比度/颜色/锐度（调色板越小越强）
2. 色调分离以在量化前简化色调区域
3. 以 `block` 尺寸使用 `Image.NEAREST` 缩小（硬像素，无插值）
4. 使用 Floyd-Steinberg 抖动进行量化——针对自适应 N 色调色板或命名硬件调色板
5. 使用 `Image.NEAREST` 放大回原尺寸

在缩小之后量化可使抖动与最终像素网格对齐。如果在此之前量化，则会把误差扩散浪费在会消失的细节上。

**视频叠加：**
- 每个节拍复制基础帧（静态背景）
- 叠加逐帧无状态的粒子绘制（每个效果一个函数）
- 通过 ffmpeg `libx264 -pix_fmt yuv420p -crf 18` 编码
- 可选的 GIF 通过 `palettegen` + `paletteuse`

## 依赖

- Python 3.9+
- Pillow（`pip install Pillow`）
- PATH 中的 ffmpeg（仅在视频时需要 —— Hermes 会打包安装此依赖）

## 常见陷阱

- 调色板键区分大小写（`"NES"`、`"PICO_8"`、`"GAMEBOY_ORIGINAL"`）。
- 非常小的源图（&lt;100px 宽）会在 8-10px 块下崩塌。如果源图很小，请先放大它。
- 小数的 `block` 或 `palette` 会破坏量化——保持它们为正整数。
- 动画粒子数量是为约 640x480 画布调校的。在非常大的图像上，你可能需要用不同的种子再跑一遍以获得合适密度。
- `mono_green` / `mono_amber` 强制 `color=0.0`（去饱和）。如果你覆盖此设置并保留色度，2 色调色板会在平滑区域产生条纹。
- `clarify` 循环：每轮最多调用两次（风格，然后场景）。不要向用户抛出更多的选择。

## 验证

- PNG 在输出路径被创建
- 在预设块大小下可见清晰的方形像素块
- 颜色数与预设匹配（目测图像或运行 `Image.open(p).getcolors()`）
- 视频是有效的 MP4（`ffprobe` 可以打开）且大小非零

## 归属

命名硬件调色板以及 `pixel_art_video.py` 中的程序化动画循环移植自 [pixel-art-studio](https://github.com/Synero/pixel-art-studio)（MIT）。详情请参见本技能目录中的 `ATTRIBUTION.md`。
