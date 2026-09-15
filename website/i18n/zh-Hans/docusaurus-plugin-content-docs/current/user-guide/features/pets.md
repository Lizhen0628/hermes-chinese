---
sidebar_position: 11
title: "宠物（Petdex 吉祥物）"
description: "领养一个动画吉祥物，让它在 CLI、TUI 和桌面应用中随智能体活动做出反应"
---

# 宠物

Hermes 可以显示一个动画**宠物** —— 一个小吉祥物精灵，会随智能体正在做的事情（空闲、运行工具、思考、完成、失败）在 **CLI**、**TUI** 和**桌面应用**中做出反应。宠物来自公开的 [petdex](https://github.com/crafter-station/petdex) 图库。

宠物纯粹是装饰性的。它们**对提示缓存、token 或智能体行为没有任何影响** —— 精灵只是一个显示层面的东西。该功能**默认关闭**，在你安装并选择一只宠物之前一直处于休眠状态。

## 工作原理

- 宠物会安装到你的配置档的 `pets/` 目录中（`<HERMES_HOME>/pets/<slug>/`），因此每个[配置档](../profiles.md)都保留自己的一套。
- 选择宠物会把 `display.pet.slug` 和 `display.pet.enabled` 写入 `config.yaml` —— 没有任何内容会作为密钥或环境变量存储。
- 每个界面都监听它已经在追踪的活动，并将其映射到六种动画状态之一。这个映射只需维护在一处，因此所有界面的行为都一致：

  | 智能体活动 | 宠物状态 |
  | --- | --- |
  | 某个工具/回合刚刚失败 | `failed` |
  | 一个计划完成（所有待办事项已完成） | `jump`（庆祝） |
  | 一个回合干净利落地结束 | `wave` |
  | 某个工具正在执行 | `run` |
  | 模型正在思考/读取 | `review` |
  | 回合进行中（未指定） | `run` |
  | 阻塞于你（有一个澄清/审批提示已打开） | `waiting`（在旧的 8 行精灵表上回退到 `idle`） |
  | 没有任何活动 | `idle` |

## 渲染

在终端（CLI/TUI）中，当你的终端支持图形协议（**kitty**、**Ghostty**、**WezTerm**、**iTerm2** 或 **sixel**）时，Hermes 会以完整保真度渲染精灵。否则它会自动回退到真彩色 Unicode **半块**渲染。在管道或重定向中（无 TTY），按设计会禁用终端渲染。

桌面应用会把宠物绘制为画布上的浮动精灵，并通过 **设置 → 外观**来切换它。

## 快速开始（CLI）

```bash
# Browse the gallery (filter by substring)
hermes pets list
hermes pets list cat

# Install a pet and make it active in one step
hermes pets install boba --select

# Preview / animate it in your terminal (Ctrl+C to stop)
hermes pets show

# Check your setup
hermes pets doctor
```

## `hermes pets` 命令

| 目标 | 命令 |
| --- | --- |
| 浏览图库 | `hermes pets list [query] [--limit N]` |
| 列出已安装的宠物 | `hermes pets list --installed` |
| 安装一只宠物 | `hermes pets install <slug> [--select] [--force]` |
| 设置当前宠物 | `hermes pets select [slug]`（省略 slug 会弹出选择器） |
| 在所有地方调整宠物大小 | `hermes pets scale <factor>`（例如 `0.5`，限制在 0.1–3.0） |
| 预览/动画 | `hermes pets show [slug] [--state <s>] [--cycle] [--once] [--mode <m>] [--scale <f>]` |
| 禁用宠物 | `hermes pets off` |
| 移除已安装的宠物 | `hermes pets remove <slug>` |
| 诊断设置 | `hermes pets doctor` |

`hermes pets show` 参数：

- `--state` —— 播放单个状态（`idle`、`wave`、`run`、`failed`、`review`、`jump`）。
- `--cycle` —— 循环播放每一个状态。
- `--once` —— 只播放一次而不是循环。
- `--mode` —— 覆盖渲染协议（`kitty`、`iterm`、`sixel`、`unicode`、`auto`）。
- `--scale` —— 覆盖屏幕上的缩放（`0` = 使用配置项）。

## `/pet` 斜杠命令

在 CLI 和 TUI 内部，你可以不必离开会话就能管理宠物：

- `/pet` —— 切换宠物的开/关（如果没有激活的宠物，会领养第一只已安装的宠物）。
- `/pet list` —— 浏览图库。
- `/pet scale <factor>` —— 在所有地方调整宠物大小（例如 `/pet scale 0.5`）。
- `/pet <slug>` —— 领养指定的宠物。
- `/pet off` —— 禁用宠物。

在 TUI 中，`/pet list` 会打开一个交互式选择器浮层；在桌面应用中它会打开 Cmd+K 宠物命令面板。

## 生成宠物（`/hatch`）

除了从图库安装预制宠物之外，Hermes 还能**从文本描述生成一只全新的宠物** —— 这是它自己的 AI 精灵生成流水线。

- CLI/TUI：`/hatch <description>`（别名 `/generate-pet`），或者 `hermes pets` → 生成流程。
- 桌面应用：宝可梦图鉴风格的**生成**界面 —— 一枚动画蛋、孵化特效和一个草稿选择器。

生成的工作原理（一个两步、成本可控的流程）：

1. **基础草稿** —— 会生成几个廉价的、仅基于提示的“这只宠物该长什么样”的变体。你挑选其中一个，或者混搭/重试来换一批。
2. **孵化** —— 用所选的基础作为参考图，为每个 Hermes 状态（空闲、思考、工具使用等）生成一行有据可依的动画，然后确定性地把它们切成帧，并打包成标准的 petdex/Codex 精灵图集（8×9 网格，每个单元 192×208）。结果是一张你可保留的有效精灵表 —— 而且可以向 `petdex submit` 提交。

### 图像后端

生成使用当前的[图像生成服务商](/user-guide/features/image-generation)，但它需要**参考图锚定**，以便每一行动画都与基础保持为同一个角色。支持参考图的后端有：**Nous Portal**、**OpenRouter**、**OpenAI**（`gpt-image-2`）和 **Krea**。OpenRouter/Nous 默认运行一条质量优先的模型链。

- 解析顺序优先为 Nous Portal → OpenAI → OpenRouter。
- 如果没有配置支持参考图的后端，生成会抛出一个可操作的错误，指引你到 `hermes tools` → 图像生成。（安装/领养现有的图库宠物不需要图像后端。）
- 通过 `HERMES_PET_IMAGE_PROVIDER` 环境变量覆盖后端（例如 `HERMES_PET_IMAGE_PROVIDER=openrouter`）。

## 桌面应用

在桌面应用中，你可以通过两种方式管理宠物：

- **Cmd+K → “Pets…”** —— 不必离开键盘就能浏览、搜索、领养和切换宠物（与主题选择器对应）。
- **设置 → 外观** —— 同样的图库，外加一个**尺寸滑块**，在你拖动时实时调整浮动吉祥物的大小。

两者都是就地领养/切换/调整浮动吉祥物的大小 —— 尺寸变化立即生效；领养一只新宠物会在一瞬间点亮它。

### 漫游

设置 → 外观有一个**漫游**开关：启用后，当智能体空闲时，宠物会自己在窗口中漫步 —— 走到各种表面、停下来、在景点之间跳跃。漫游仅在宠物处于窗口内、处于激活状态且智能体处于静止时运行；任何由智能体驱动的状态（工作、庆祝）都会立即接管。该开关默认关闭，并在重启后保持。

### Alt+滚轮缩放

按住 **Alt** 并在宠物上滚动鼠标滚轮，可就地调整它的大小 —— 在应用窗口中和弹出的浮层中都一样。浮层会朝光标位置缩放，并且所得的缩放比例会被持久化，因此它能在重启后保留并与应用内的宠物保持同步。

### 氛围反应

对智能体说些好听的话 —— “good bot”“thank you”“ily”、`<3` 或一个爱心 emoji —— 宠物就会做出反应，浮出爱心（桌面）或闪过一丝爱心（CLI/TUI）。检测是一份经过精选的、零 token 的词库，在每条用户消息上本地匹配（不调用模型）；它只针对指向智能体的喜爱与感激，而非一般性的正面情绪。所有界面 —— CLI 宠物、TUI、桌面浮动宠物和弹出浮层 —— 都由同一个信号触发反应。

### 弹出浮层

**Shift+单击**浮动宠物，可将其弹到它自己的透明、总在最前的桌面窗口中。在那里，即使 Hermes 被最小化它也会保持可见（Codex 风格），所以你瞥一眼就能知道智能体在做什么。

弹出后的手势：

| 手势 | 操作 |
| --- | --- |
| **拖动** | 把宠物移到屏幕上的任何位置，甚至移到应用之外。它的位置和弹出/收回状态在重启后保持。 |
| **单击** | 打开一个迷你输入框，向最近的会话发送一条提示 —— 而不必把应用调到前面。 |
| **双击** | 切换应用窗口：如果它在前台就最小化它，如果它被隐藏就恢复它。 |
| **Shift+单击** | 把宠物弹回窗口内。 |
| **邮件图标** | 仅当你不在时某个回合结束了才会出现；点击它在最近的会话线程上唤起应用（并标记为已读）。 |

只有弹出的宠物才会显示**对话气泡**（`working…`、`thinking…`、`your turn` 等）—— 在窗口内，应用本身就是界面，因此宠物在那里是安静的。

浮层完全是应用内宠物的傀儡 —— 它不携带单独的网关连接，也绝不会出现在 Dock 或应用切换器中。

## 配置

所有设置都位于 `config.yaml` 中的 `display.pet` 下：

```yaml
display:
  pet:
    enabled: false        # master on/off (true once you select a pet)
    slug: ""              # active pet; empty = first installed
    render_mode: auto      # auto | kitty | iterm | sixel | unicode | off
    scale: 0.33           # master size knob (relative to native 192x208 frames)
    unicode_cols: 0       # hard override for terminal width (0 = derive from scale)
```

- **`scale`** 是唯一的主尺寸旋钮。一个数字就能让每个界面缩小：桌面画布按它缩放像素，CLI/TUI 从中推导终端列宽。半块回退会限制在一个清晰度下限 —— 它无法像真正像素级的 kitty/GUI 渲染那样缩小那么多而不变得糊成一团，所以同样的 `scale` 在 kitty 下看起来锐利，但在半块下会触及下限。
- **`render_mode: auto`** 会检测 kitty/iTerm2/sixel 并回退到 unicode 半块。把它明确设置为强制某种协议，或设置为 `off` 以在桌面上保留宠物的同时禁用终端渲染。
- **`unicode_cols`** 独立于 `scale` 固定终端列宽；让它保持为 `0`，以从 `scale` 推导宽度。

## 故障排除

运行 `hermes pets doctor` —— 它会报告：

- pets 目录以及安装了哪些宠物，
- `display.pet.enabled`、`display.pet.slug` 以及解析后的当前宠物，
- 配置的 `render_mode`、检测到的终端图形协议，以及某个 TTY 上的有效模式，
- Pillow（用于精灵解码）是否可导入。

一旦安装了宠物、选择了宠物、启用了宠物且 Pillow 可用，它会打印 `✓ ready`。

常见坑点：

- 宠物只有在**已安装且已选择**（`enabled: true`）后才会显示。
- 在管道/重定向中（无 TTY），按设计会禁用终端渲染。
- petdex npm CLI 会安装到 `~/.codex/pets`；Hermes 则使用它自己的、按配置档区分的 `<HERMES_HOME>/pets/` —— 请通过 `hermes pets` 安装。

## 另请参阅

- [`hermes-agent` 技能](../skills/bundled/autonomous-ai-agents/autonomous-ai-agents-hermes-agent.md)让智能体可以应请求为你安装和切换宠物（见它的 `references/petdex.md`）。
