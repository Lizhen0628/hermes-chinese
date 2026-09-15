---
title: "Pixel Art — 使用时代调色板的像素艺术（NES、Game Boy、PICO-8）"
sidebar_label: "Pixel Art"
description: "使用时代调色板的像素艺术（NES、Game Boy、PICO-8）"
---

{/* 本页面由 website/scripts/generate-skill-docs.py 根据该技能的 SKILL.md 自动生成。请编辑源 SKILL.md，而非本页面。 */}

# Pixel Art

使用时代调色板的像素艺术（NES、Game Boy、PICO-8）。

## 技能元数据

| | |
|---|---|
| Source | 可选 — 使用 `hermes skills install official/creative/pixel-art` 安装 |
| Path | `optional-skills/creative\pixel-art` |
| Version | `2.0.0` |
| Author | dodo-reach |
| License | MIT |
| Platforms | linux、macos、windows |
| Tags | `creative`、`pixel-art`、`arcade`、`snes`、`nes`、`gameboy`、`retro`、`image`、`video` |

## 参考：完整的 SKILL.md

:::info
以下是 Hermes 在该技能被触发时加载的完整技能定义。这就是该技能处于活跃状态时智能体所看到的指令。
:::

# Pixel Art

将任意图像转换为复古像素艺术，随后可选地将其动画化为一段带时代感特效（雨、萤火虫、雪、余烬）的短 MP4 或 GIF。

本技能附带两个脚本：

- `scripts/pixel_art.py` — 照片 → 像素艺术 PNG（Floyd-Steinberg 抖动）
- `scripts/pixel_art_video.py` — 像素艺术 PNG → 动画 MP4（+ 可选 GIF）

两者均可导入或直接运行。当你需要精准还原时代的色彩时，可让预设套用硬件调色板（NES、Game Boy、PICO-8 等），或使用自适应 N 色量化为街机/SNES 风格外观。

## 何时使用

- 用户想从源图像获得复古像素艺术
- 用户要求 NES / Game Boy / PICO-8 / C64 / 街机 / SNES 风格
- 用户想要一段短循环动画（雨景、夜空、雪等）
- 海报、专辑封面、社交媒体贴文、精灵图、角色、头像

## 工作流程

生成前，先与用户确认风格。不同的预设会产生截然不同的输出，重新生成的代价颇高。

### 第 1 步 — 提供一种风格

调用 `clarify` 并提供 4 个代表性预设。根据用户的需求挑选组合 — 不要一股脑地把 14 个全倒出来。

当用户意图不明确时使用默认菜单：

```python
clarify(
    question="Which pixel-art style do you want?",
    choices=[
        "arcade — bold, chunky 80s cabinet feel (16 colors, 8px)",
        "nes — Nintendo 8-bit hardware palette (54 colors, 8px)",
        "gameboy — 4-shade green Game Boy DMG",
        "snes — cleaner 16-bit look (32 colors, 4px)",
    ],
)
```

当用户已经点明了某个时代（例如“80 年代街机”“Gameboy”），跳过 `clarify`，直接使用匹配的预设。

### 第 2 步 — 提供动画选项（可选）

如果用户要求视频/GIF，或输出可能因动态效果而受益，询问使用哪个场景：

```python
clarify(
    question="Want to animate it? Pick a scene or skip.",
    choices=[
        "night — stars + fireflies + leaves",
        "urban — rain + neon pulse",
        "snow — falling snowflakes",
        "skip — just the image",
    ],
)
```

不要连续调用 `clarify` 超过两次。一次用于风格，一次用于场景（如果要考虑动画）。如果用户在消息中明确要求特定的风格和场景，则完全跳过 `clarify`。

### 第 3 步 — 生成

先运行 `pixel_art()`；如果请求了动画，则在其结果上串联 `pixel_art_video()`。

## 预设目录

| 预设 | 时代 | 调色板 | 块大小 | 最适合 |
|--------|-----|---------|-------|----------|
| `arcade` | 80 年代街机 | 自适应 16 | 8px | 大胆海报、主视觉图 |
| `snes` | 16 位 | 自适应 32 | 4px | 角色、精细场景 |
| `nes` | 8 位 | NES（54） | 8px | 真实 NES 外观 |
| `gameboy` | DMG 掌机 | 4 种绿色 | 8px | 单色 Game Boy |
| `gameboy_pocket` | Pocket 掌机 | 4 种灰色 | 8px | 单色 GB Pocket |
| `pico8` | PICO-8 | 16 固定 | 6px | 幻想主机外观 |
| `c64` | Commodore 64 | 16 固定 | 8px | 8 位家用电脑 |
| `apple2` | Apple II 高分辨率 | 6 固定 | 10px | 极致复古，6 色 |
| `teletext` | BBC Teletext | 8 纯色 | 10px | 粗犷原色 |
| `mspaint` | Windows MS Paint | 24 固定 | 8px | 怀旧桌面 |
| `mono_green` | CRT 磷光 | 2 种绿色 | 6px | 终端/CRT 美学 |
| `mono_amber` | CRT 琥珀色 | 2 种琥珀色 | 6px | 琥珀色显示器外观 |
| `neon` | 赛博朋克 | 10 种霓虹色 | 6px | 蒸汽波/赛博 |
| `pastel` | 柔和粉彩 | 10 种粉彩 | 6px | 可爱 / 温柔 |

具名调色板位于 `scripts/palettes.py`（完整列表参见 `references/palettes.md` — 共 28 个具名调色板）。任何预设都可被覆盖：

```python
pixel_art("in.png", "out.png", preset="snes", palette="PICO_8", block=6)
```

## 场景目录（用于视频）

| 场景 | 效果 |
|-------|---------|
| `night` | 闪烁星星 + 萤火虫 + 飘落的叶片 |
| `dusk` | 萤火虫 + 闪光 |
| `tavern` | 尘埃微粒 + 温暖闪光 |
| `indoor` | 尘埃微粒 |
| `urban` | 雨 + 霓虹脉冲 |
| `nature` | 叶片 + 萤火虫 |
| `magic` | 闪光 + 萤火虫 |
| `storm` | 雨 + 闪电 |
| `underwater` | 气泡 + 光亮闪光 |
| `fire` | 余烬 + 闪光 |
| `snow` | 雪花 + 闪光 |
| `desert` | 热浪扭曲 + 尘沙 |

## 调用方式

### Python（导入）

```python
import sys
import os
sys.path.insert(0, os.path.expanduser("~/.hermes/skills/creative/pixel-art/scripts"))
from pixel_art import pixel_art
from pixel_art_video import pixel_art_video

# 1. Convert to pixel art
pixel_art("/path/to/photo.jpg", "/tmp/pixel.png", preset="nes")

# 2. Animate (optional)
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

## 处理管线原理

**像素转换：**
1. 增强对比度/色彩/锐度（调色板越小，增强力度越大）
2. 色调分离，以在量化前简化色调区域
3. 使用 `Image.NEAREST` 按 `block` 缩小（硬像素，不插值）
4. 使用 Floyd-Steinberg 抖动量化 — 针对自适应 N 色调色板或具名硬件调色板
5. 使用 `Image.NEAREST` 放大回原尺寸

在缩小之后进行量化，可使抖动与最终像素网格对齐。若在缩小前量化，则会把误差扩散浪费在那些终将消失的细节上。

**视频叠加：**
- 每帧复制基础画面（静态背景）
- 叠加上逐帧无状态的粒子绘制（每种效果一个函数）
- 通过 ffmpeg 编码 `libx264 -pix_fmt yuv420p -crf 18`
- 可选 GIF，通过 `palettegen` + `paletteuse`

## 依赖

- Python 3.9+
- Pillow（`pip install Pillow`）
- PATH 中的 ffmpeg（仅视频需要 — Hermes 会安装此软件包）

## 注意事项

- 调色板键区分大小写（`"NES"`、`"PICO_8"`、`"GAMEBOY_ORIGINAL"`）。
- 极小的源图（宽度 &lt;100px）会在 8-10px 的块下崩塌。如果源图很小，请先放大。
- 分数形式的 `block` 或 `palette` 会破坏量化 — 请保持为正整数。
- 动画粒子数量针对约 640x480 画布调优。在超大图像上，你可能想用不同随机种子再跑一遍以调整密度。
- `mono_green` / `mono_amber` 强制 `color=0.0`（去饱和）。如果你覆盖了它并保留彩度，双色调色板可能会在平滑区域产生条纹。
- `clarify` 循环：每轮最多调用两次（先风格，后场景）。不要用更多选项来烦扰用户。

## 验证

- 在输出路径创建了 PNG 文件
- 在预设的块大小下可见清晰的方形像素块
- 颜色数量与预设匹配（目视检查图像，或运行 `Image.open(p).getcolors()`）
- 视频是有效的 MP4（`ffprobe` 能打开它）且文件大小非零。

## 归属声明

`pixel_art_video.py` 中的具名硬件调色板与程序化动画循环移植自 [pixel-art-studio](https://github.com/Synero/pixel-art-studio)（MIT）。详情参见本技能目录中的 `ATTRIBUTION.md`。
