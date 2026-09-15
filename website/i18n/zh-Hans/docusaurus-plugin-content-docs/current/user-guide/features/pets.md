---
sidebar_position: 11
title: "宠物（Petdex 吉祥物）"
description: "领养一个会随智能体活动做出反应的动画吉祥物，适用于 CLI、TUI 和桌面应用"
---

# 宠物

Hermes 可以显示一只动画**宠物**——一个小巧的吉祥物精灵，会随智能体当前的
行为（空闲、运行工具、思考、完成、失败）做出反应，支持 **CLI**、**TUI** 和
**桌面应用**。宠物来自公开的
[petdex](https://github.com/crafter-station/petdex) 图库。

宠物纯粹是装饰性的。它们**对提示缓存、Token 消耗或智能体行为没有任何影响**
——精灵仅涉及显示呈现。该功能**默认关闭**，在你安装并选择一只宠物之前一直
处于休眠状态。

## 工作原理

- 宠物安装到你的配置档的 `pets/` 目录中
  （`<HERMES_HOME>/pets/<slug>/`），因此每个[配置档](../profiles.md)保留
  各自的一套宠物。
- 选择宠物会将 `display.pet.slug` 和 `display.pet.enabled` 写入
  `config.yaml` —— 不会以密钥或环境变量的形式存储任何内容。
- 每个界面都监视它已经在跟踪的活动，并将其映射到六种动画状态之一。映射
  集中在一处，因此每个界面的行为都一致：

  | 智能体活动 | 宠物状态 |
  | --- | --- |
  | 工具/轮次刚刚失败 | `failed` |
  | 计划完成（所有待办事项已完成） | `jump`（庆祝） |
  | 一个轮次干净利落地完成 | `wave` |
  | 工具正在执行 | `run` |
  | 模型正在思考/阅读 | `review` |
  | 轮次进行中（未指定） | `run` |
  | 因等待你而被阻塞（澄清/审批提示已打开） | `waiting`（在旧版 8 行图表上回退到 `idle`） |
  | 没有任何活动 | `idle` |

## 渲染

在终端中（CLI/TUI），当你的终端支持图形协议（**kitty**、**Ghostty**、**WezTerm**、
**iTerm2** 或 **sixel**）时，Hermes 会以完整保真度渲染精灵。否则，它会自动
回退到真彩色 Unicode **半块**渲染。在管道或重定向中（无 TTY），终端渲染
按设计禁用。

桌面应用将宠物绘制为画布上的浮动精灵，可通过 **设置 → 外观** 切换。

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
| 安装宠物 | `hermes pets install <slug> [--select] [--force]` |
| 设置激活的宠物 | `hermes pets select [slug]`（省略 slug 则打开选择器） |
| 在所有界面调整宠物大小 | `hermes pets scale <factor>`（例如 `0.5`，限制在 0.1–3.0 之间） |
| 预览/播放动画 | `hermes pets show [slug] [--state <s>] [--cycle] [--once] [--mode <m>] [--scale <f>]` |
| 禁用宠物 | `hermes pets off` |
| 移除已安装的宠物 | `hermes pets remove <slug>` |
| 诊断设置 | `hermes pets doctor` |

`hermes pets show` 的旗标：

- `--state` —— 播放单个状态（`idle`、`wave`、`run`、`failed`、`review`、
  `jump`）。
- `--cycle` —— 循环切换每个状态。
- `--once` —— 播放一次而不是循环播放。
- `--mode` —— 覆盖渲染协议（`kitty`、`iterm`、`sixel`、
  `unicode`、`auto`）。
- `--scale` —— 覆盖屏幕上的缩放比例（`0` = 使用配置）。

## `/pet` 斜杠命令

在 CLI 和 TUI 中，你可以无需离开会话即可管理宠物：

- `/pet` —— 打开/关闭宠物（如果当前没有激活的宠物，则领养第一个已安装
  的宠物）。
- `/pet list` —— 浏览图库。
- `/pet scale <factor>` —— 在所有界面调整宠物大小（例如 `/pet scale 0.5`）。
- `/pet <slug>` —— 领养指定的宠物。
- `/pet off` —— 禁用宠物。

在 TUI 中，`/pet list` 会打开一个交互式选择器浮层；在桌面应用中，它会打开
Cmd+K 宠物面板。

## 生成宠物（`/hatch`）

除了从图库安装现成的宠物，Hermes 还可以**从文本描述生成全新的宠物**——
它拥有自己的 AI 精灵生成流水线。

- CLI/TUI：`/hatch <description>`（别名 `/generate-pet`），或 `hermes pets` → 生成流程。
- 桌面应用：Pokédex 风格的**生成**界面——动画蛋、孵化特效和草稿选择器。

生成的工作方式（一个两步、成本受限的流程）：

1. **基础草稿** —— 生成少量便宜的、仅基于提示词的“这只宠物应该长什么样”变体。
   你选择其中一个，或重新混合/重试获得新的一轮。
2. **孵化** —— 将所选基础用作参考图像，为每个 Hermes 状态生成一行扎根的动画
   （idle、thinking、tool use 等），这些动画被确定性地切分成帧，并打包成标准的
   petdex/Codex 图谱（192×208 单元格的 8×9 网格）。结果是一张有效的精灵表，
   由你保留——并且可以通过 `petdex submit` 提交。

### 图像后端

生成使用激活的[图像生成服务商](/user-guide/features/image-generation)，但它
需要**参考图像扎根**，以使每行动画保持与基础相同的角色。支持参考的后端：
**Nous Portal**、**OpenRouter**、**OpenAI**（`gpt-image-2`）和 **Krea**。OpenRouter/Nous
默认运行质量优先的模型链。

- 解析顺序优先选用 Nous Portal → OpenAI → OpenRouter。
- 如果未配置支持参考的后端，生成会给出可操作的错误，指向 `hermes tools` →
  Image Generation。（安装/领养图库中现有的宠物不需要图像后端。）
- 可通过 `HERMES_PET_IMAGE_PROVIDER` 环境变量覆盖后端（例如
  `HERMES_PET_IMAGE_PROVIDER=openrouter`）。

## 桌面应用

在桌面应用中，你可以通过两种方式管理宠物：

- **Cmd+K → "Pets…"** —— 无需离开键盘即可浏览、搜索、领养和切换宠物
  （与主题选择器类似）。
- **设置 → 外观** —— 相同的图库加上一个**大小滑块**，拖动时可实时调整
  浮动吉祥物的大小。

两者都就地领养/切换/调整浮动吉祥物的大小——大小变更即时生效；领养新宠物
会在片刻内点亮它。

### 漫游

设置 → 外观中有一个 **Roam** 开关：启用后，当智能体空闲时，宠物会自行在窗口
中漫游——沿着表面走动、停顿、在位置之间跳跃。漫游仅在宠物位于窗口内、处于
激活状态且智能体处于静止状态时运行；任何由智能体驱动的状态（工作、庆祝）会
立即接管。该开关默认关闭，并在重启后保持其设置。

### Alt+滚轮调整大小

按住 **Alt** 并在宠物上滚动鼠标滚轮，即可就地调整其大小——无论是在应用窗口中
还是在弹出的浮层上。浮层会朝光标位置缩放，并且生成的缩放比例会被持久化，
因此它能经受重启并与应用内的宠物保持同步。

### 情绪反应

对智能体说些好话——“good bot”、“thank you”、“ily”、`<3` 或爱心表情——宠物
会以漂浮的爱心（桌面）或爱心闪烁（CLI/TUI）回应。检测是一个精心策划的、无
Token 的词库，在每条用户消息上本地匹配（不调用模型）；它针对的是对智能体的
爱意和感激，而非一般的积极情感。所有界面——CLI 宠物、TUI、桌面浮动宠物以及
弹出浮层——都基于同一信号做出反应。

### 弹出浮层

**Shift-点击**浮动宠物，将其弹出为独立的透明、始终置顶的桌面窗口。在那里，
即使 Hermes 最小化，它也会保持可见（Codex 风格），因此一瞥即可知道智能体
在做什么。

弹出后的手势：

| 手势 | 操作 |
| --- | --- |
| **拖拽** | 将宠物移动到屏幕上的任何位置，甚至可移到应用之外。其位置和内外状态在重启后保持。 |
| **单击** | 打开一个迷你输入框，向最近的会话发送提示——无需调出应用。 |
| **双击** | 切换应用窗口：如果它在最前面则最小化它，如果它隐藏则恢复它。 |
| **Shift-点击** | 将宠物弹出回窗口中。 |
| **邮件图标** | 仅当你不在时某个轮次完成时出现；点击可在最近的会话线程上调起应用（并将其标记为已读）。 |

只有弹出的宠物会显示**对话气泡**（`working…`、`thinking…`、
`your turn`……）——在窗口内，应用本身即是界面，因此宠物在那里保持安静。

浮层纯粹是应用内宠物的傀儡——它不携带单独的网关连接，也从不出现在 Dock 或
应用切换器中。

## 配置

所有设置都位于 `config.yaml` 中的 `display.pet` 下：

```yaml
display:
  pet:
    enabled: false        # 总开关（你选择宠物后变为 true）
    slug: ""              # 激活的宠物；留空 = 第一个已安装的宠物
    render_mode: auto      # auto | kitty | iterm | sixel | unicode | off
    scale: 0.33           # 主大小旋钮（相对于原生 192x208 帧）
    unicode_cols: 0       # 终端宽度的硬覆盖（0 = 从 scale 推导）
```

- **`scale`** 是唯一的主大小旋钮。一个数字即可调整每个界面的大小：
  桌面画布按它缩放像素，CLI/TUI 从中推导出终端列宽度。半块回退会限制在
  一个清晰度下限——它不能像真像素的 kitty/GUI 渲染那样缩小到很低而不变得
  模糊，因此相同的 `scale` 在 kitty 下看起来很清晰，但在半块模式下会被
  限制。
- **`render_mode: auto`** 检测 kitty/iTerm2/sixel 并回退到 Unicode
  半块。显式设置它可以强制使用某个协议，或设置为 `off` 以禁用终端渲染，
  同时让宠物保留在桌面上。
- **`unicode_cols`** 独立于 `scale` 固定终端列宽度；
  将其保留为 `0` 以从 `scale` 推导宽度。

## 故障排除

运行 `hermes pets doctor` —— 它会报告：

- pets 目录以及已安装哪些宠物，
- `display.pet.enabled`、`display.pet.slug` 以及解析出的激活宠物，
- 配置的 `render_mode`、检测到的终端图形协议，以及 TTY 下的有效模式，
- Pillow（用于精灵解码）是否可导入。

当宠物已安装、已选择、已启用且 Pillow 可用时，它会打印 `✓ ready`。

常见陷阱：

- 只有当宠物被**安装并选择**（`enabled: true`）后才会显示。
- 在管道/重定向中（无 TTY），终端渲染按设计禁用。
- petdex npm CLI 安装到 `~/.codex/pets`；Hermes 使用其自己的
  配置档作用域 `<HERMES_HOME>/pets/` —— 请通过 `hermes pets` 安装。

## 另见

- [`hermes-agent` 技能](../skills/bundled/autonomous-ai-agents/autonomous-ai-agents-hermes-agent.md)
  可让智能体按你的请求为你安装和切换宠物（参见其
  `references/petdex.md`）。
