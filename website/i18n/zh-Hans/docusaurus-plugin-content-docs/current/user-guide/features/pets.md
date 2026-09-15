---
sidebar_position: 11
title: "宠物（Petdex 吉祥物）"
description: "领养一只动画吉祥物，让它对 CLI、TUI 和桌面应用中的智能体活动做出反应"
---

# 宠物

Hermes 可以显示一只动画 **宠物** —— 一个小吉祥物精灵，对智能体正在做的事情（空闲、运行工具、思考、完成、失败）做出反应，横跨 **CLI**、**TUI** 和 **桌面应用**。宠物来自公开的 [petdex](https://github.com/crafter-station/petdex) 图库。

宠物纯属装饰。它们 **对提示缓存、token 或智能体的行为没有任何影响** —— 精灵只是一个显示层面的关注点。该功能 **默认关闭**，在你安装并选择一只宠物之前一直处于休眠状态。

## 工作原理

- 宠物会被安装到你配置档的 `pets/` 目录（`<HERMES_HOME>/pets/<slug>/`），因此每个 [配置档](../profiles.md) 都保留自己的一套。
- 选择一只宠物会把 `display.pet.slug` 和 `display.pet.enabled` 写入 `config.yaml` —— 不会以密钥或环境变量的形式存储任何内容。
- 每个界面会监听它已经追踪的活动，并将其映射到六种动画状态之一。映射只存在于一个地方，因此所有界面的行为都一致：

  | 智能体活动 | 宠物状态 |
  | --- | --- |
  | 某个工具/回合刚刚失败 | `failed` |
  | 一个计划完成（所有待办均已完成） | `jump`（庆祝） |
  | 一个回合顺利完成 | `wave` |
  | 某个工具正在执行 | `run` |
  | 模型正在思考/读取 | `review` |
  | 回合进行中（未指定） | `run` |
  | 等待你输入（一个澄清/审批提示处于打开状态） | `waiting`（在旧式 8 行精灵表上回退为 `idle`） |
  | 什么都没发生 | `idle` |

## 渲染

在终端（CLI/TUI）中，当你的终端支持图形协议（**kitty**、**Ghostty**、**WezTerm**、**iTerm2** 或 **sixel**）时，Hermes 会以完全保真度渲染精灵。否则它会自动回退到真彩色 Unicode **半块** 渲染。在管道或重定向内部（没有 TTY），终端渲染按设计会被禁用。

桌面应用会在画布上将宠物绘制为浮动精灵，并可通过 **设置 → 外观** 切换它。

## 快速开始（CLI）

```bash
# 浏览图库（按子串过滤）
hermes pets list
hermes pets list cat

# 一步安装宠物并使其激活
hermes pets install boba --select

# 在终端中预览/播放动画（Ctrl+C 停止）
hermes pets show

# 检查你的设置
hermes pets doctor
```

## `hermes pets` 命令

| 目标 | 命令 |
| --- | --- |
| 浏览图库 | `hermes pets list [query] [--limit N]` |
| 列出已安装的宠物 | `hermes pets list --installed` |
| 安装一只宠物 | `hermes pets install <slug> [--select] [--force]` |
| 设置当前激活的宠物 | `hermes pets select [slug]`（省略 slug 则打开选择器） |
| 在所有地方调整宠物大小 | `hermes pets scale <factor>`（例如 `0.5`，限制在 0.1–3.0） |
| 预览/播放动画 | `hermes pets show [slug] [--state <s>] [--cycle] [--once] [--mode <m>] [--scale <f>]` |
| 禁用宠物 | `hermes pets off` |
| 移除已安装的宠物 | `hermes pets remove <slug>` |
| 诊断设置 | `hermes pets doctor` |

`hermes pets show` 标志：

- `--state` —— 播放单个状态（`idle`、`wave`、`run`、`failed`、`review`、`jump`）。
- `--cycle` —— 循环遍历每个状态。
- `--once` —— 播放一次而不是循环。
- `--mode` —— 覆盖渲染协议（`kitty`、`iterm`、`sixel`、`unicode`、`auto`）。
- `--scale` —— 覆盖屏幕上的缩放比例（`0` = 使用配置）。

## `/pet` 斜杠命令

在 CLI 和 TUI 内部，你可以不离开会话即可管理宠物：

- `/pet` —— 打开/关闭宠物（如果没有任何激活的宠物，则领养第一只已安装的宠物）。
- `/pet list` —— 浏览图库。
- `/pet scale <factor>` —— 在所有地方调整宠物大小（例如 `/pet scale 0.5`）。
- `/pet <slug>` —— 领养特定宠物。
- `/pet off` —— 禁用宠物。

在 TUI 中，`/pet list` 会打开一个交互式选择器覆盖层；在桌面应用中它会打开 Cmd+K 宠物面板。

## 生成宠物（`/hatch`）

除了从图库安装现成的宠物外，Hermes 还可以 **根据文本描述生成一只全新的宠物** —— 它自己的 AI 精灵生成流水线。

- CLI/TUI：`/hatch <description>`（别名 `/generate-pet`），或 `hermes pets` → 生成流程。
- 桌面应用：宝可梦图鉴风格的 **generate** UI —— 一个动画蛋、孵化特效和一个草稿选择器。

生成的工作原理（一个两步、成本受限的流程）：

1. **基础草稿** —— 生成若干廉价的、仅基于提示词的 "这只宠物应该长什么样" 变体。你选择一个，或重混/重试以开始新一轮。
2. **孵化** —— 选定的基础被用作参考图像，为每个 Hermes 状态（空闲、思考、使用工具等）生成一个基于该基础的动作行，这些动作行会被确定性地切分为帧，并打包成一个标准的 petdex/Codex 图集（8×9 网格，192×208 单元）。结果是一张有效的精灵表，你可以保留它 —— 也可以 `petdex submit`。

### 图像后端

生成使用当前激活的 [图像生成服务商](/user-guide/features/image-generation)，但它需要 **参考图像基础** 以便每个动画行保持与基础相同的角色。支持参考图像的后端：**Nous Portal**、**OpenRouter**、**OpenAI**（`gpt-image-2`）和 **Krea**。OpenRouter/Nous 默认运行质量优先的模型链。

- 解析顺序优先 Nous Portal → OpenAI → OpenRouter。
- 如果没有配置支持参考图像的后端，生成会抛出一个可操作的错误，指向 `hermes tools` → Image Generation。（安装/领养已有的图库宠物则不需要图像后端。）
- 通过 `HERMES_PET_IMAGE_PROVIDER` 环境变量覆盖后端（例如 `HERMES_PET_IMAGE_PROVIDER=openrouter`）。

## 桌面应用

在桌面应用中，你可以通过两种方式管理宠物：

- **Cmd+K → "Pets…"** —— 无需离开键盘即可浏览、搜索、领养和切换宠物（与主题选择器类似）。
- **设置 → 外观** —— 同样的图库，外加一个 **大小滑块**，在你拖动时实时调整浮动吉祥物的大小。

两者都会就地领养/切换/调整浮动吉祥物的大小 —— 大小变化即时生效；领养新宠物会在一瞬间内点亮它。

### 漫游

设置 → 外观有一个 **漫游（Roam）** 开关：启用后，宠物会在智能体空闲时自己在窗口内漫步 —— 走过各种表面，停顿，并在各个点之间跳跃。漫游仅在宠物处于窗口内、处于活动状态且智能体处于静止状态时运行；任何由智能体驱动的状态（工作、庆祝）会立即接管。该开关默认关闭，并在重启后保持。

### Alt+滚轮调整大小

按住 **Alt** 并在宠物上滚动鼠标滚轮即可就地调整其大小 —— 在应用窗口和弹出式浮层上均可。浮层会朝光标位置缩放，由此得到的缩放比例会被持久化，因此它在重启后依然保留，并与应用内的宠物保持同步。

### 情绪反应

对智能体说些好话 —— "good bot"、"thank you"、"ily"、`<3` 或一个爱心表情 —— 宠物会用漂浮的爱心（桌面）或爱心闪光（CLI/TUI）做出反应。检测是一个经过精心策划的、无 token 的词典，在每条用户消息上本地匹配（不调用模型）；它会针对指向智能体的喜爱与感激触发，而不是针对一般性的正面情绪。所有界面 —— CLI 宠物、TUI、桌面浮动宠物以及弹出式浮层 —— 都对同一个信号做出反应。

### 弹出式浮层

**Shift+点击** 浮动宠物，将它弹到一个独立的、透明、始终置顶的桌面窗口。在那里，即使 Hermes 被最小化（Codex 风格），它也能保持可见，因此一眼就能看出智能体正在做什么。

弹出后的手势：

| 手势 | 操作 |
| --- | --- |
| **拖动** | 将宠物移动到屏幕上的任何位置，甚至应用之外。它的位置以及飘进/飘出状态在重启后保留。 |
| **单击** | 打开一个迷你创作窗口，向最近的会话发送提示词 —— 不调出应用。 |
| **双击** | 切换应用窗口：如果它在前台则最小化，如果它被隐藏则恢复。 |
| **Shift+点击** | 将宠物弹回窗口内。 |
| **邮件图标** | 仅当某个回合在你离开期间完成时出现；点击可在最近的会话线程上唤起应用（并标记为已读）。 |

只有弹出的宠物会显示 **气泡speech bubble**（`working…`、`thinking…`、`your turn`……）—— 在窗口内，应用本身就是界面，因此宠物在那里保持安静。

浮层纯粹是应用内宠物的傀儡 —— 它不携带单独的网关连接，也从不出现在程序坞或应用切换器中。

## 配置

所有设置都位于 `config.yaml` 中的 `display.pet` 下：

```yaml
display:
  pet:
    enabled: false        # 总开关（一旦你选择宠物后为 true）
    slug: ""              # 激活的宠物；空 = 第一只已安装的宠物
    render_mode: auto      # auto | kitty | iterm | sixel | unicode | off
    scale: 0.33           # 总大小旋钮（相对于原生 192x208 帧）
    unicode_cols: 0       # 终端宽度的硬覆盖（0 = 从 scale 推导）
```

- **`scale`** 是唯一的总大小旋钮。一个数字就能让所有界面缩小：桌面画布按其缩放像素，CLI/TUI 则据其推导终端列宽。半块回退会限制在一个可读性下限 —— 它无法像真像素 kitty/GUI 渲染那样缩得那么小而不变得糊成一团，因此相同的 `scale` 在 kitty 下看起来清晰，但在半块下会被限制下限。
- **`render_mode: auto`** 会检测 kitty/iTerm2/sixel 并回退到 unicode 半块。显式设置它以强制使用某个协议，或设为 `off` 以禁用终端渲染，同时将宠物保留在桌面上。
- **`unicode_cols`** 独立于 `scale` 固定终端列宽；将其保留为 `0` 以从 `scale` 推导宽度。

## 故障排除

运行 `hermes pets doctor` —— 它会报告：

- 宠物目录以及安装了哪些宠物，
- `display.pet.enabled`、`display.pet.slug` 以及解析出的激活宠物，
- 配置的 `render_mode`、检测到的终端图形协议，以及 TTY 的有效模式，
- Pillow（用于精灵解码）是否可导入。

一旦宠物已安装、已选择、已启用，并且 Pillow 可用，它会打印 `✓ ready`。

常见的坑：

- 宠物只有在 **已安装并已选择**（`enabled: true`）后才会显示。
- 在管道/重定向内部（没有 TTY），终端渲染按设计会被禁用。
- petdex npm CLI 安装到 `~/.codex/pets`；Hermes 使用自己按配置档作用域的 `<HERMES_HOME>/pets/` —— 通过 `hermes pets` 安装。

## 另请参阅

- [`hermes-agent` 技能](../skills/bundled/autonomous-ai-agents/autonomous-ai-agents-hermes-agent.md) 可让智能体按请求为你安装和切换宠物（参见其 `references/petdex.md`）。
