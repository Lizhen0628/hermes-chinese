---
sidebar_position: 3
title: "Hermes Desktop"
description: "原生 Hermes 桌面应用——与 Hermes 对话的精致体验，具备流式工具输出、并排预览、文件浏览器、语音、定时任务、配置档、技能和设置。支持 macOS、Windows 和 Linux。"
---

# Hermes Desktop

Hermes 桌面应用是一个原生应用，它围绕你从 CLI 和网关获得的**同一个**智能体构建——相同的配置、相同的 API 密钥、相同的会话、相同的技能、相同的记忆。它不是独立产品或轻量克隆；它使用相同的 Hermes Agent 核心和设置，并通过一个现代且精心设计的 UI 来驱动它。如果你曾在终端中使用过 `hermes`，你在那里设置的一切都已经在这里，你在这里做的任何事情也会出现在那里。

它可运行在 **macOS（Apple Silicon）、Windows 和 Linux** 上——完整支持矩阵请见[平台支持](../getting-started/platform-support.md)。

:::tip 各个界面分别是什么？
Hermes 有多个前端，它们都与同一个智能体通信：

- **桌面应用**（本页）——一个原生应用，配备专门为聊天、配置和管理打造的 UI。
- **CLI**（`hermes`）和 **[TUI](./tui.md)**（`hermes --tui`）——终端界面。
- **[Web 仪表盘](./features/web-dashboard.md)**（`hermes dashboard`）——浏览器管理面板；其可选的 **Chat** 标签页通过伪终端嵌入 TUI。

选择当下最合适的一个。它们共享状态，因此你可以在其中一个中开始会话，然后在另一个中恢复它。
:::

## 安装

从 [Hermes Desktop 产品页](https://hermes-agent.nousresearch.com/desktop)下载应用，或按照 [Hermes Desktop 安装说明](../getting-started/installation.md)操作。

如果你已经安装了 Hermes，只需运行

```bash
hermes desktop
```

它会使用你当前的配置、密钥、会话和技能。

## 应用中包含什么

桌面应用以一个聊天优先的窗口组织，左侧边栏用于导航。它的构建旨在让你能够管理多个同时进行的智能体对话、配置消息服务商、创建工件、浏览项目的文件夹结构，并同时处理多个项目。

侧边栏的选择跟随当前聚焦的聊天窗格。打开或聚焦一个会话标签页会清除页面的高亮，包括 Kanban 等贡献页面，即使工作区仍保留该页面的路由。

### 聊天

应用的核心。你能获得：

- **流式响应**，随着智能体工作实时显示工具活动和结构化的工具调用摘要。
- **Markdown 换行**遵循 Markdown 语义：行尾两个空格创建硬换行；普通换行保持为软换行。媒体和预览提取会保留移除附件片段之外的文本，包括首行代码缩进和未完成的围栏代码块间距。代码显示和复制会保留 Markdown 解析器中的前导空行、尾随空格和终端空行。
- **与其他所有 Hermes 界面相同的对话历史**——在这里开始的会话可以在 CLI/TUI 中恢复，反之亦然。
- **拖放文件**到聊天区域任意位置，即可将其附加到你的下一条消息。
- **独立的背景草稿**——隐藏的聊天标签页可以更新其草稿，而不会在可见编辑器中移动光标或选区。
- **指令芯片操作**——悬停可操作引用（例如 URL）以显示其操作药丸。短暂的宽限期让你在关闭前从芯片移动到药丸。当你停留在其内部时，药丸保持可用；离开后，无关的指针移动不会延迟关闭。点击其操作会保留草稿选区。
- **右侧预览栏**——在你继续聊天时并排呈现网页、文件和工具输出。
- **应用内浏览器中的评论模式**——在预览浏览器栏中点击 **Annotate**，然后点击实时页面上的任意元素（或拖出一个框）并输入备注；每条保存的评论都会在页面上保留为带编号的图钉。保存图钉永远不会发送一个回合——当你完成后，**Add N comments** 会把每个图钉的裁剪截图和一条简短提示附加到编辑器中，提示会列出每条评论，而发送仍然由你亲手按下。每条元素评论都带有其 CSS 选择器、其标记，以及对布局至关重要的计算样式，因此智能体可以在你的源代码中找到该元素，而不是从图片中猜测。密码和隐藏字段值，以及任何看起来像密钥或令牌的属性，都会在标记离开页面之前被脱敏。较大的批量评论会按每条评论在页面中所处的位置分组到达，因此二十多条评论会变成少数几件工作，而不是各占一个任务——而且由于这些组是不同的 DOM 子树，它们通常触及不同的文件，这正是把它们交给并行工作进程是安全的原因。删除图钉后，图钉编号保持不变，切换聊天会清空该栈。
- **编辑器历史和队列编辑**——在空编辑器中按上/下箭头键可调出并复用之前的提示词，并可在排队消息发送前编辑它们。在有排队的回合时按下 Stop（或 Esc）会暂停队列并将其展开显示在编辑器上方；从那里恢复它，或对单个条目进行发送、编辑和删除。
- **编辑器上方的任务进度**——展开 Tasks 标题可检查每个阶段。长列表会保持在输入框上方的边界内；在展开的列表内滚动即可到达最后的任务，而不会移动对话。
- **对话时间线栏**——长聊天会在记录边缘得到一条细长的标记栏，每个提示词对应一个标记。悬停它可弹出提示词列表，点击其中一个可直接跳转到对话中的该位置。（当聊天有一定数量的回合后它才会出现。）
- **阅读位置记忆**——返回到某个会话时会恢复其保存的距底部距离，而不是总是跳到最新消息。停留在底部的会话会继续跟随新输出。使用 **Scroll to bottom** 返回到实时边缘。位置保存在此 Desktop 安装的本地存储中；它们不会通过后端同步。
- **页面内查找**——按 **Cmd/Ctrl+F** 打开查找栏，搜索已渲染的聊天记录。Enter / Shift+Enter（或在查找栏打开时按 Cmd/Ctrl+G / Cmd/Ctrl+Shift+G）可逐个跳转匹配项；Esc 关闭它。

异步定时任务和委托完成会显示为折叠的时间线披露项。打开完成标签可将结果正文（包括任务输出）作为 Markdown 阅读；长报告会在披露项内滚动显示。任务指令和投递信封不会作为报告内容显示。

#### 状态栏

聊天底部的状态栏显示实时会话状态，并提供快捷控制项，无需打开设置：

- **按会话 YOLO 开关** — 仅针对当前会话开启或关闭 YOLO（与 TUI 一致）。YOLO 会绕过危险命令的审批提示，所以要清楚你关掉的是什么 — 见[安全 → YOLO 模式](./security.md#yolo-mode)。
- **上下文用量计量器** — 实时显示会话上下文窗口的“% 已占用”。点击它会打开**上下文用量**弹出面板，按类别（系统提示词、工具定义、技能、记忆、规则、MCP、子智能体定义，以及对话本身）给出 token 明细，让你在压缩介入之前就能看清究竟是什么占用了窗口。
- **缓存命中率和每秒 token 数** — 默认关闭；可在右键菜单中开启。缓存命中率是本会话提示词 token 中由服务商提示词缓存提供的占比（缓存 token 更便宜，所以越高越省钱 — 你可以看着一个会话随着缓存预热逐渐变便宜）。每秒 token 数是最近 10 次模型调用的平均输出吞吐量。两者都在回合进行中实时更新。
- **可自定义项** — 右键点击状态栏（**在状态栏中显示**）可选择显示哪些内容：上下文计量器、缓存命中率、每秒 token 数、工作区、模型、审批、回合/会话计时器、终端、命令中心、后端版本等 — 也可以完全隐藏状态栏（**Cmd/Ctrl+Shift+S** 切换显示）。

想对着另一台机器上的 Hermes 实例聊天，而非内置的本地后端？请看下面的[连接到远程后端](#connecting-to-a-remote-backend) — 而关于远程托管仪表盘连接的完整机制（认证门禁、`/api/ws` 聊天套接字，以及 WebSocket 关闭码排查），见 [Web 仪表盘 → 将 Hermes Desktop 连接到远程后端](./features/web-dashboard.md#connecting-hermes-desktop-to-a-remote-backend)。

#### 字体

**设置 → 外观**中有两个独立的字体设置，都按配置档存储在 `config.yaml` 中：

- **聊天字体**（`desktop.font_family`）— 聊天及应其余界面。诸如 OpenDyslexic 或 Atkinson Hyperlegible 这类易读性字体，只要系统上安装了就会立即生效；活动主题的字体栈仍会作为后备，以便缺失字形时照常渲染。留空表示使用主题字体。
- **终端字体**（`terminal.font_family`）— 嵌入式终端面板；Nerd Fonts 会在这里渲染 shell 图标。留空表示使用内置的 JetBrains Mono。

#### 仓库发现

Hermes Desktop 通过扫描你的主目录（限定深度）来为项目侧边栏发现本地 Git 仓库。你可以按配置档在**设置 → 工作区**中修改，或在 `config.yaml` 中修改：

```yaml
desktop:
  repo_scan_enabled: true
  repo_scan_roots: []
  repo_scan_exclude_paths: []
```

- 将 `repo_scan_enabled` 设为 `false` 可完全停止文件系统扫描。该配置档现有的磁盘发现缓存行会被清除；显式创建的项目以及从有意的 Hermes 会话中推断出的仓库仍然可用。
- 将 `repo_scan_roots` 设为一个文件夹列表可限制扫描范围。空列表保持默认的主目录扫描。
- 将 `repo_scan_exclude_paths` 设为应跳过整棵子树的文件夹。

更改其中任何一项都只会使该配置档的磁盘发现缓存失效，并开始一次符合策略的刷新。**从侧边栏隐藏**仍然是独立的逐项整理操作。

#### 选择模型

模型选择器位于**输入区**中，就在麦克风左侧。点击可切换模型；将鼠标悬停在某个模型行上可查看其选项（思考、努力程度、快速）。旁边有一个**推理胶囊**，显示当前模型的努力程度（`Med`、`High`……），并可直接打开同样的选项，让你无需找到该模型所在行就能更改努力程度。对于目录报告中不含推理控制项的模型，该胶囊会隐藏。

- **输入区选择器是粘性 UI 状态，绝不触碰你的默认值。** 它按设备本地记忆，并在新建聊天和重启时**跟随**，不会跳回默认值 — 选一次模型，之后按 `Cmd/Ctrl+N` 打开时就还是它。在有活跃聊天的情况下切换模型，会把更改限定在**当前聊天**范围内；无论如何，该选择会随会话的创建/切换而保留，并且**绝不**写入配置档默认值 — 只有一个例外：在尚未配置 `model.default`/`model.provider` 的全新配置档上，首次选择会被持久化，以便应用有一个真正的默认值，而不是在重启时落到某个零散的 API-key 环境变量上。持久化遵循与 `/model` 相同的规则（`model.persist_switch_by_default`）；要有意更改默认值，请用**设置 → 模型**。（切换[配置档](#sessions--profiles)会重新播种为该配置档自己的默认值。）
- **在设置 → 模型中设置默认值。** 那个“主”模型是你的**按配置档全局默认值** — 它是新聊天、定时任务、子智能体和辅助任务的起点，并且是唯一会写入它的地方。每个[配置档](#sessions--profiles)各自保留自己的默认值。
- **按模型的努力/快速预设。** 每个模型都会在桌面应用中记住自己的推理努力程度和快速模式选择，每当你选中该模型时都会重新应用到会话。这些预设属于桌面端的便利功能，不会改变定时任务或子智能体。
- **聊天中途切换会重置提示词缓存。** 在活跃聊天中切换模型意味着下一条消息会按完整输入价格重新读取整个对话（服务商提示词缓存以模型为键）。偶尔为之无妨；在长聊天中，用新模型开一个全新聊天往往比来回切换更省钱。

### 文件浏览器

无需离开应用即可浏览和预览工作目录 —— 这在跟随智能体读取、写入和编辑文件时非常有用。使用 `hermes desktop --cwd <path>`（或 `HERMES_DESKTOP_CWD` 环境变量）设置初始项目目录。

### 产物

连接到远程网关时，打开文件产物会通过该网关下载，使用产物来源的配置档和会话。相对路径会基于会话保存的工作目录解析；相对于主目录的路径使用网关的主目录，而非 Desktop 机器的主目录。除正斜杠路径外，也识别 Windows 风格的相对路径；文件 URI 会保留驱动器号和网络共享信息，供网关解析。缺失的会话或工作目录会产生错误，而不是选择其他本地文件。

**产物** 视图将会话生成的内容 —— **图片、文件和链接** —— 汇集到一个可搜索、可浏览的库中。从侧边栏、命令面板（**Artifacts — Browse generated outputs**）或你自行绑定的 `nav.artifacts` 快捷键打开它。它会自动索引近期的会话输出；每个产物都会显示由哪个会话生成，并可跳转回该会话，图片和文件会在预览中打开，并提供下载 / 在浏览器中打开 / 复制操作。

### 窗口、标签页与面板

该应用专为同时处理多项工作而打造：

- **标签页** —— **Cmd/Ctrl+T** 打开新的会话标签页；**Ctrl+Tab** / **Ctrl+Shift+Tab** 循环切换会话，**Ctrl+1…9** 按位置跳转到最近的会话。**Cmd/Ctrl+W** 关闭当前聚焦的标签页，**Cmd/Ctrl+Shift+T** 重新打开最后关闭的标签页。
- **多窗口** —— **Cmd/Ctrl+Shift+N** 打开新窗口；任何会话都可以通过其上下文菜单（**New window**）或命令面板弹出。弹出的窗口只渲染该单个对话，没有全局侧边栏 —— 便于将长时间运行的会话放到另一个显示器上。实时智能体输出会流式传输到显示该会话的每个窗口。
- **面板** —— **Cmd/Ctrl+B** 切换左侧边栏，**Cmd/Ctrl+J** 切换右侧边栏，**Cmd/Ctrl+\\** 交换侧边栏所在的一侧。

### 终端

一个真正的终端位于右侧边栏，在文件浏览器旁边：

- **Ctrl+`** 显示终端（若尚无终端则创建一个）；**Ctrl+Shift+`** 再生成一个。多个终端堆叠在标签栏中 —— **Ctrl+Shift+↓/↑** 在它们之间切换，**Ctrl+Shift+W** 关闭当前活动终端。
- **隐藏时 Shell 依然持久。** 关闭或隐藏面板不会杀死你的 shell —— 每个打开的终端都会保持挂载，其回滚缓冲和运行中的进程保持完好，直到你显式关闭它。
- **Add to chat** —— 选中终端输出并发送到输入框，作为下一条消息的上下文。

### 实时子智能体

当派出的工作进程活跃时，输入框上方会出现一个 **Subagents** 框架，显示其数量、任务名称、已用时间和最新活动。它最多预览三个工作进程；展开标题查看完整名单，然后选择某个工作进程查看详情以及 **Steer** / **Stop** 控件。每个框架都属于其所在对话，分屏面板中亦然。Steering 表示指令已排队等待某个检查点执行，并不意味着子进程已读取该指令。参见 [监控子智能体](/user-guide/features/delegation#monitoring-running-subagents-agents)。

### Git 审阅与工作树

对于在 Git 仓库内运行的会话，应用内置了源代码管理界面：

- **审阅面板** —— **Cmd/Ctrl+G** 切换工作树审阅面板：分支和领先/落后状态、变更文件（列表或树视图），以及限定于 **未提交**、**分支** 或 **最后一轮**（仅智能体在最近一轮中更改的内容）的差异对比。暂存/取消暂存文件、还原更改、编写提交信息（或 **Generate commit message**），然后 **Commit** 或 **Commit & Push** —— 以及通过 GitHub CLI（`gh`）**Create PR**，或用 **Ask Hermes to open PR** 将整个流程交给智能体。你也可以在此创建和切换分支。
- **工作树** —— **Cmd/Ctrl+Shift+B**（或侧边栏中项目上的 **New worktree**）会在新分支上创建 Git 工作树，使智能体能够在仓库的并行副本上工作，而不影响你的检出。工作树会作为项目下的独立通道显示；移除某个工作树时，可选择删除工作树目录（分支保留），或仅隐藏该通道并将其保留在磁盘上；当存在未提交更改时会有强制选项。

### 记忆图

**记忆图**（命令面板 → *记忆图*，或状态栏项目）是一张交互式地图，展示 Hermes 为你学到的内容——技能和记忆以可缩放的节点图铺开，配有时间线，可按 **全部 / 已用 / 学到** 筛选。一个分享控件可将地图布局导出为一段紧凑的代码，你可以粘贴给别人（仅导出布局——不包含你的任何记忆或技能文本），也可以用同样的方式导入代码。

### 快速输入

快速输入是一小块始终可召出的输入器，可通过**系统中的任意位置触发全局热键**唤出——无需切换到（甚至无需打开）主窗口即可发出提示。在 **设置 → 高级 → 快速输入** 中启用；默认快捷键是 **Ctrl/Cmd+Shift+Space**，你也可以设置自己的快捷键（至少需要一个修饰键）。如果该组合已被其他应用占用，设置行会提示你，这样你可以另选一个。

### 语音

与 Hermes 对话并听到它的回复，与其他地方提供的 [语音模式](./features/voice-mode.md) 相同。在 macOS 上，系统会就麦克风访问权限弹出一次提示。

### HUD 模式

**⌘/Ctrl+Shift+H**（或标题栏按钮）会将聊天分离为一个无边框、始终置顶的悬浮条，停留在你正在处理的任何内容之上。应用窗口让到一旁；HUD 保留你的实时对话和一个输入器。你把它停在哪儿本身就是上下文——悬浮条的位置会告诉 Hermes 你在询问哪个应用和哪个屏幕，因此"这个"、"这里"和"那个页面"都会解析为它下方的内容。

- **移动悬浮条** — 在 macOS 和 Windows 上，**按住**输入器上的任意位置稍等片刻，然后拖动。在 Linux/X11 上，按住 **Ctrl** 并用鼠标主键拖动可立即抓取（包括在选中的文本上方）；按住方式同样可用。在调用桌面切换快捷键时保持按住，即可将 HUD 带到另一个虚拟桌面。在原生 Wayland 上，输入器条就是混成器的拖动手柄（这是移动它的唯一方式，因为应用无法自行放置窗口）。
- **调整大小** — 拖动悬浮条的任意边缘或角；对侧边缘保持固定。原生 Wayland 只开放右边和下边，因为混成器不允许应用自行定位顶层窗口。
- **重置布局** — 悬浮条上的丢弃控件可以恢复默认尺寸和位置（在 X11 / macOS / Windows 上）。如果某个被持久化的尺寸导致 HUD 无法使用，请使用此项。
- **吸附到指针** — **⌘/Ctrl+Shift+G**（全局热键，可在任何应用中触发）会将 HUD 跳到光标处。在原生 Wayland 上此操作无效——放置位置由混成器掌管。
- **退出** — 点击悬浮条上的退出按钮，再次按 **⌘/Ctrl+Shift+H**，或在 HUD 获得焦点时按 **⌘/Ctrl+W**。应用窗口会带着你的会话回到前台，光标位于其输入器中。

#### Linux / Wayland

在 Wayland 会话上，Electron 20+ 已经作为原生 Wayland 客户端运行。拖拽、点击穿透和调整大小在这条路径上都能正常工作。

在 **Hyprland**（包括 Omarchy）上，HUD 在映射后会通过混成器的 IPC 浮动并固定——否则 Hyprland 会像其他窗口一样对其分屏，`always-on-top` 会被忽略，混成器拖动也不起作用。无需额外的窗口规则。

少数混成器（尤其是 COSMIC）会忽略原生 Wayland 窗口的 `always-on-top`。要在那里恢复置顶，请在 XWayland 下运行应用：

```yaml
desktop:
  ozone_platform_hint: x11
```

这会在启动时桥接到 `ELECTRON_OZONE_PLATFORM_HINT`（显式的环境变量仍然优先）。代价是：X11 无法恢复一个忽略鼠标的窗口，因此 HUD 会一直是实体窗口，而非点击穿透。某些 KDE 配置在 X11 ozone 后端下还会报告键盘失效——除非你需要始终置顶，否则请将提示保持为 `auto`。

#### WSLg（从 WSL2 使用 Windows GPU）

当 `hermes gui` 在 WSL2 内运行且存在 `/dev/dxg` 并安装了 Mesa 的 `d3d12_dri.so` 时，启动器会为 Electron 设置 `GALLIUM_DRIVER=d3d12`，使渲染使用 Windows GPU 而非 llvmpipe 软件光栅化器；你环境中原有的显式 `GALLIUM_DRIVER`、`MESA_LOADER_DRIVER_OVERRIDE`、`LIBGL_ALWAYS_SOFTWARE` 或 `LIBGL_DRIVERS_PATH` 会保持不变（例如 `GALLIUM_DRIVER=llvmpipe hermes gui` 会保持软件渲染）。

### 设置与引导流程

在真实的图形界面中管理服务商、模型、工具和凭据，而无需编辑 YAML。首次运行的引导流程让你在几秒内发出第一条消息。设置面板涵盖服务商/密钥、模型选择、工具集配置、MCP 服务器、网关以及会话管理。

- **服务商设置面板** — 专门用于管理推理服务商，通过 Accounts / API-keys 交互界面登录并存储各服务商的凭据。Accounts 和 API 密钥共享 Settings 的 **Applies to** 选择：此处进行的凭据读取与编辑、OAuth 账户移除以及登录操作都针对选定的配置档，而非当前活动聊天配置档。登录流程在保存凭据和选择模型的过程中始终保持该目标。更改 **Applies to** 会丢弃未保存的凭据草稿。关闭登录会取消轮询并忽略迟到的结果；已发送的凭据写入仍可能在原配置档中完成。外部管理的 CLI 凭据使用其各自的 CLI，不在此配置档选择器范围内。其 **Local Models** 视图用于安装和管理设备端的 llama.cpp 运行时 — 参见 [本地模型](/user-guide/local-models)。
- **菜单中包含所有服务商和模型** — GUI 会呈现完整的服务商列表以及 `hermes model` 所知的全部模型，因此你选择的是 CLI 所见的同一目录，而非精心筛选的子集。
- **xAI Grok OAuth** — Grok 是启动器中的一等 OAuth 服务商；像其他 OAuth 服务商一样通过浏览器流程登录。
- **从 GUI 安装工具后端** — 直接在应用中运行工具后端的后期安装步骤，无需切换到终端。
- **终端字体选择器** — 在 **Settings → Appearance** 中选择已安装的字体。诸如 `MesloLGS NF` 之类的 Nerd Fonts 可在交互式终端和智能体终端中渲染 Powerlevel10k 分隔符和图标；该设置按配置档保存。
- **启动时重新打开上次聊天** — 默认情况下，冷启动时应用会接着你上次离开的地方继续。在 **Settings → Appearance** 中将其关闭（或在 `config.yaml` 中设置 `display.resume_last_session: false`），即可始终以全新聊天开始。无论哪种方式，深度链接和显式目标都不会被覆盖。
- **辅助模型警告** — 如果你将主模型切换到新的服务商，而辅助任务（标题生成、摘要及类似辅助功能）仍固定在另一个服务商上，应用会发出警告，以免你在不知情的情况下将工作分散到两个服务商。
- **按任务的推理强度** — **Settings → Model → Auxiliary models** 下的每一行在其服务商/模型选择器旁都有一个推理选择器：一个级别、**Off**，或 **inherit · main model effort**（默认值，会移除该任务的覆盖设置）。它以 `auxiliary.<task>.reasoning_effort` 保存在 `config.yaml` 中，与 `hermes model` 写入的是同一个键，设置后会在该行的摘要中显示。用它可以让压缩或标题生成等频繁的辅助任务以低推理或无推理运行，而主智能体保持高推理。
- **VS Code 市场主题** — 除了内置主题预设外，外观设置还包含实时的 VS Code 市场搜索：选择任意配色主题，应用就会下载、转换并安装为桌面主题。从命令面板（*Install theme*）也可使用同样的导入器，导入的主题可以从外观设置中再次移除。
- **保持计算机唤醒** — **Settings → Advanced → Keep computer awake** 可阻止机器休眠，以便长时间或过夜的智能体运行能够持续进行（显示器仍可变暗）。这是一项按计算机设置的选项。

首次运行的引导流程已基于统一的叠加层设计系统重新设计，你可以选择 **Choose provider later** 跳过服务商设置，先进入应用。

#### 按配置档设置："Applies to" 范围

当你有两个或更多[配置档](./profiles.md)时，由配置驱动的设置页面 — **Model、Workspace、Safety、Memory & Context、Voice、Chat、Advanced 和 Tools & Keys** — 以及 **Messaging** 叠加层会在顶部显示共享的 **Applies to** 芯片行。它选择你的编辑所针对的配置档：

- 默认选择**跟随活动配置档**，其行为与此前完全一致 — 编辑你正在使用的配置档。
- 选择另一个配置档可查看和编辑*其*设置，而无需切换整个应用；在你于各设置页面之间移动时该选择会保持。
- 切换应用的活动配置档会重置选择器，因此编辑不会悄无声息地继续落在之前选定的配置档上。
- 若配置档少于两个，芯片行则完全隐藏。

（Gateways 页面以不同方式处理配置档 — 通过其 **Per-profile overrides** 子节 — 而 Capabilities 和 Scheduled Jobs 视图有各自的范围选择器。）

### 管理面板

应用还呈现了更广泛的 Hermes 管理界面，这样你就不必再切换到终端：

- **Skills** — 浏览、安装和管理[技能](./features/skills.md)。Skills 标签页列出了你已安装的技能，并带有启用/禁用开关，下方是 Hermes 自带的完整内置可选技能目录——每一条目都有一个一键 **Install** 按钮，安装完成后该行会转为已安装列表。
- **记忆图谱（星图）** — 在聊天中输入 `/journey`（别名 `/learning`、`/memory-graph`），打开一个交互式星图，展示随时间习得的技能与记忆，并带有回放拖动条。节点可直接从面板编辑或删除（技能被归档，记忆被移除）。参见[学习之旅](./features/memory.md#learning-journey-journey)。
- **定时任务** — 查看和管理[计划任务](../reference/cli-commands.md#hermes-cron)。
- **配置档** — 在多个 [Hermes 配置档](./profiles.md)之间切换（隔离的配置/技能/会话）。
- **消息** — 设置网关通道。Telegram 有一张 **Quick setup** 卡片：点击 **Create with QR**，在 Telegram 中扫描二维码（或打开链接），Hermes 便会帮你创建机器人、检测你的用户 ID 以加入允许列表、保存凭据并重启网关。任何凭据保存、清除或启用开关的操作都会让页面保留一条 **Restart now** 横幅，直到网关真正完成重启；如果重启失败，横幅会继续显示，以便你重试或手动重启。
- **Agents** 和 **Command Center** — 面向多智能体工作的编排界面。

### Bot 模式（内置）

**Bot 模式**随应用附带且默认开启：一个"每个智能体一个聊天"的花名册，其中每个 [Hermes 配置档](./profiles.md)都作为一个机器人出现，拥有自己的头像（几何面孔、上传的图片、AI 生成肖像或像素宠物）、自己规范的 **Bot Chat** 会话以及自己的 **Routines**（由 Hermes 定时任务支持的重现任务）。该花名册位于左侧边栏，作为一个标签页紧挨着你的对话——为一个 **Sessions | Bots** 标签条——而不是堆叠在会话列表下方的第二个面板。采用了较旧堆叠布局的安装会被自动迁移到标签条中，且只迁一次；如果你是自己手动摆放面板的，则你的布局不会被改动。**Cronjobs**（Routines）面板仅在 Bots 标签页激活时停靠在聊天旁边，切回 Sessions 时会消失（较旧的桌面版本会让它始终可见）。

从花名册创建新的智能体——Name / Title / Description，外加一个包含完整能力界面的 Advanced 展开项（模型、SOUL、技能、工具集、MCP 服务器）——将它们分组到板块中，并打开群聊让多个机器人进行讨论。群聊在花名册中以独立的 Discord 风格行出现——堆叠的成员头像、成员数量、最新房间消息的预览，以及"需要你"徽章——与机器人行交织在同一套固定+最近排序中。点击群组行会把该房间作为标签页打开，接管**主聊天窗口**（较旧的桌面版本则退化为在机器人的侧边面板内打开）。

机器人之间会互相发消息：在任意聊天中输入 `@researcher have a look at this`，当前活跃的机器人便会上交该消息并回报结果，机器人之间也能直接访问彼此的 Bot Chats（`hermes -p <bot> chat`）。后端会自动教导每个机器人规范的 **Bot Chat** 会话掌握该消息协议（配置 `agent.bot_mode_protocol`，默认开启）——包括当队友机器人从 CLI 以无头方式打开它时——因此机器人与机器人之间的回复和交接无需改动你的 SOUL.md 即可生效，而你的常规会话保持不变。

Bot 模式的会话——每个机器人规范的 Bot Chat 以及每个群聊成员会话——始终从全局 Sessions 边栏中隐藏。它们位于 Bots 面板（花名册行、房间视图以及每个机器人的会话浏览器）中，而不是与你的对话交织在一起。

你不使用的机器人可以被收起：右键单击某个机器人行 → **Hide Bot**。隐藏的机器人会离开花名册但仍继续工作——@提及仍会解析，群聊成员身份不受影响。只要有至少一个机器人被隐藏，Bots 标题栏就会出现一个眼睛开关；点击它可就地以暗显方式揭示被隐藏的机器人（右键单击 → **Unhide Bot** 可将其恢复），而当被隐藏的机器人有未读活动时，眼睛上会显示一个圆点。隐藏状态存储在机器人的配置档中，因此会随机器人跨机器保留。

不想要它？在 **Capabilities → Plugins → Bots** 中将其 **Desktop** 开关关闭——花名册、任务面板及编辑器中间件会实时注销，无需重启。

完整指南——创建智能体（包括多机器的 **Create on** 选择器）、跨连接的花名册、机器人与机器人之间的提及，以及群聊如何决定由谁回复：[Bot 模式：智能体花名册](./bot-mode.md)。

### 键盘与导航

- **命令面板** — 按 **Cmd+K** 或 **Cmd+P**（Windows/Linux 上为 Ctrl+K / Ctrl+P）即可跳转到操作并从键盘导航应用：打开任意页面或设置分区、按标题或 id 跳转到会话、切换模型/主题/颜色模式、生成终端、重启网关、更新 Hermes 等等。
- **可重新绑定的快捷键** — **设置 → 键盘快捷键**（或 **Cmd/Ctrl+/**）打开快捷键面板，你几乎可以重新映射所有绑定——配置档切换、会话导航、视图切换，以及桌面插件贡献的任意快捷键。重复的分配会被标记为冲突。几个值得记住的默认值：**Cmd/Ctrl+N** 新建会话，**Cmd/Ctrl+.** 命令中心，**Cmd/Ctrl+,** 设置，**Cmd/Ctrl+Shift+F** 搜索会话，**Cmd/Ctrl+1–9** 切换配置档，**Shift+X** 切换浅色/深色。
- **自定义缩放快捷键** — 以半级步进缩放界面，对文字大小进行更精细的控制。
- **界面语言切换器** — 在应用内更改界面语言：英语、简体中文（zh-Hans）、繁体中文（zh-Hant）、日语、阿拉伯语（RTL）和俄语。

### 会话与配置档

- **会话列表大幅改进** — 重新打造的会话列表，具备归档功能和整体会话管理，让列表在增长时依然易于管理。
- **按 id 搜索会话** — 直接通过 id 查找特定会话。
- **并发的多配置档会话** — 同时在多个[配置档](./profiles.md)中运行会话，并通过跨配置档的 `@session` 链接引用另一个配置档中的会话。
- **导出 / 导入配置档** — 将整套设置作为单个文件分享。**⌘K → 导出配置档…**（或右键点击侧栏中的配置档方块）会写出一个 `.tar.gz`，包含技能、记忆、人设、定时任务、插件和设置；API 密钥会被剥离。从桌面端导出还会打包你的外观与界面——皮肤、浅色/深色模式、自定义主题、该配置档的侧栏颜色，以及窗口布局——这样导入的配置档抵达时就保持发送者当时的样貌。通过 **⌘K → 导入配置档…** 或侧栏 **+** 旁边的按钮导入；它会应用覆盖，并将你带入新配置档。同一归档也适用于聊天中的 `/export` / `/import`，以及 shell 中的 `hermes profile export` / `import`。参见[导出和导入配置档文件](./profile-distributions.md#export-and-import-a-profile-file)。

## 更新

应用会在后台检查更新，并在更新就绪时提供一键更新。

在本地更新期间，详细的构建输出会流式写入当前活动配置档的
`logs/update.log`，包括分离的 `--gateway` 更新。它不会占用终端，
但在构建完成前可供排查使用。Windows 交接会把该日志中的新输出计为进度；
一个不产生任何输出的子进程仍受空闲看门狗约束。仅进程存活并不会重置
该看门狗，取消更新也不会等待其构建完成。

桌面应用与其所通信的 Hermes 后端按各自的节奏更新——应用包在你的机器上，
后端则在它运行的地方。当存在多个更新目标时（远程网关，或多个已注册的网关），
更新入口（“关于”面板上的 **立即更新**、⌘K 中的 **更新 Hermes** 行，以及更新就绪的
提示框）会更新**一切**：先更新已连接的后端，然后更新其他所有符合条件且已注册的网关
（Hermes Cloud 条目由平台管理，会跳过），最后才是桌面应用自身，因为应用客户端更新
会重新启动应用。单机安装仍保持一键体验。

在任何后端更新之后，应用还会重新检查自身版本，并在 GUI 仍然落后时以一键
**更新桌面应用**操作发出警告——这样更新远程后端就绝不会悄悄让你停留在过时的
桌面构建上。

[手动更新流程](https://hermes-agent.nousresearch.com/docs/getting-started/updating)同样适用于 GUI。

## 卸载

打开 **设置 → 关于 → 危险区域**，选择要删除的范围：

- **仅卸载聊天 GUI** — 移除桌面应用及其数据；Hermes 智能体、你的配置和你的聊天记录会保留。（等同于 `hermes uninstall --gui`。）
- **卸载 GUI + 智能体，保留我的数据** — 移除应用和智能体，但保留配置、聊天记录和密钥，以便日后重装。（等同于 `hermes uninstall`。）
- **卸载全部** — 移除应用、智能体和全部用户数据。（等同于 `hermes uninstall --full`。）

应用会关闭以完成任务（清理在其退出后运行，这样它才能移除正在运行的应用包及其自身的 venv）。当未安装本地智能体时（例如仅 GUI 的“lite”客户端连接到远程后端），移除智能体的选项会自动隐藏。

你也可以从终端执行相同操作——`hermes uninstall --gui` 仅卸载 GUI，或 `hermes uninstall` / `hermes uninstall --full` 连同智能体一起卸载。

:::note
从**源码检出**（`hermes desktop` 开发构建）运行 `hermes uninstall --gui` 还会移除工作区的 `node_modules` 和 `apps/desktop/{dist,release}` 构建输出，因为那些是 GUI 构建产物。它们可以通过 `hermes desktop`（或 `npm install` + 重新构建）恢复——但如果你正在积极捣鼓桌面应用，请预期之后要重新安装依赖。
:::

## CLI 参考：`hermes desktop`

要通过 CLI 启动，只需运行 `hermes desktop`。默认情况下，它会安装工作区的 Node 依赖，构建当前 OS 的解包 Electron 应用，然后启动该打包产物。

在 Linux 上，启动时会刷新 `$XDG_DATA_HOME/applications/hermes.desktop`（默认是 `~/.local/share/applications/hermes.desktop`），以便 Hermes 出现在应用程序菜单中。若想保留手动编辑过的条目，可禁用刷新：

```bash
hermes config set desktop.manage_launcher_entry false
```

条目缺失时仍会被创建；该标志只是阻止 `hermes desktop` 重写已存在的条目。

| 标志                 | 描述                                                                               |
| -------------------- | ----------------------------------------------------------------------------------------- |
| `--skip-build`       | 跳过 npm install/package，直接启动 `apps/desktop/release` 中已有的解包应用 |
| `--force-build`      | 即使内容戳匹配也强制完整重建                                    |
| `--build-only`       | 构建桌面应用但不启动（供 `hermes update` 使用）                      |
| `--source`           | 通过 `electron .` 针对 `apps/desktop/dist` 启动，而非打包应用           |
| `--cwd PATH`         | 桌面聊天会话的初始项目目录（设置 `HERMES_DESKTOP_CWD`）           |
| `--hermes-root PATH` | 覆盖应用使用的 Hermes 源码根目录（设置 `HERMES_DESKTOP_HERMES_ROOT`）          |
| `--ignore-existing`  | 在后端解析期间强制应用忽略 `PATH` 上已有的任何 `hermes` CLI      |
| `--fake-boot`        | 启用确定性启动延迟，用于验证启动 UI                            |

## 工作原理

打包应用附带 Electron 外壳和一个原生 React 聊天界面。首次启动时，它可以将 Hermes Agent 运行时安装到 `HERMES_HOME`（`~/.hermes`，在 Windows 上为 `%LOCALAPPDATA%\hermes`）——**与 CLI 安装使用的布局完全相同**，这就是两者可以互换的原因。后端解析的顺序是：先遵从 `HERMES_DESKTOP_HERMES_ROOT`，然后是已完成的管理式安装，再然后是探测 `PATH` 上的 `hermes`（除非设置了 `--ignore-existing` / `HERMES_DESKTOP_IGNORE_EXISTING=1`），最后是针对 Nix 等打包者的显式 `HERMES_DESKTOP_HERMES` 命令覆盖。React 渲染器与应用为你启动的无头后端通信——一个提供 `tui_gateway` JSON-RPC/WebSocket API 的 `hermes serve` 进程——并复用智能体运行时，而不是嵌入 `hermes --tui`。桌面应用是**自包含的**：它运行自己的 `hermes serve` 后端，从不打开或依赖 [web dashboard](./features/web-dashboard.md)。（早于 `serve` 命令的运行时会自动回退到无头的 `dashboard --no-open`，因此应用更新永远不会超出其后端。安装、后端解析和自更新逻辑都位于 Electron 主进程中。）

## 连接到远程后端

默认情况下，应用会启动并管理自己的**本地**后端。你也可以改为指向运行在另一台机器上的 Hermes 后端——例如 VPS、家用服务器，或位于 Tailscale 之后的 Mini。

所有与连接相关的设置都集中在一个设置页面：**Settings → Gateways**。（较旧的版本将其拆分到单独的 **Gateway** 和 **Connections** 页面——现在已统一，旧的 `?tab=connections` 深链接会重定向到统一页面。）

**Settings → Gateways → Connection mode** 提供了本地网关之外的替代选项：

- **Remote gateway**——输入你自己运行的 `hermes serve` 后端的 URL 并登录。本节其余部分将围绕此模式展开。
- **Hermes Cloud**——登录一次 Hermes Cloud，然后从你账户下的智能体中选择；无需粘贴 URL。应用会发现你的智能体（若你的账户跨越多个组织，会显示组织选择器），连接到其中一个会自动切换会话。连接激活期间，状态栏会显示云连接。

网关连接是**机器级**的：Gateways 页面管理这台桌面可以连接到哪些网关后端，而配置档则是从你连接的网关*发现*的。会话一次选择一个网关，而相邻的配置档栏选择该网关上发现的配置档。

### 多连接注册表

在同**设置 → 网关**页面继续往下，**已注册网关**管理着应用已知的每一个 Hermes 网关的命名列表——本地运行时、任意数量的远程网关（LAN、Tailscale、互联网）、Hermes Cloud 实例以及 SSH 主机——全部持久化保存在同一处。你可以通过侧边栏配置档栏右端的插头按钮（**连接另一个 Hermes gateway……**）或通过 **⌘K → 网关**跳转过去。完整指南——包括联合智能体名册、`@name-device` 处理、全集群更新以及插件 SDK 界面——见[将 Desktop 连接到多个 Hermes 实例](./multi-connection-desktop.md)。

- **每个连接都需要一个唯一名称**（例如“Homelab”或“Work laptop”这样的设备名）。当同一配置档名称存在于多个已注册网关上时，各处界面会将其消歧为 `@profile-device`（例如 `@research-homelab`）。
- **从会话侧边栏切换网关。** 当注册了多个网关时，会出现一个命名网关选择器，可处理任意规模的注册表，而不会让网关看起来像配置档。相邻的配置档栏随后只显示该网关的智能体，并记住上次在此处使用的配置档；较大的配置档集合会独立折叠。
- **选择重启后打开什么。** **启动时打开**保持向后兼容的 **主网关**默认值，也可以在**上次使用**的网关成功连接后恢复它。此偏好存储在应用程序包之外，并能在 Desktop 更新后保留。
- **添加 / 编辑 / 移除 / 测试**面板中的连接。**添加**流程提供全部四种类型——**本地**、**Hermes Cloud**、**远程网关**和 **SSH**（在应用管理的本地条目存在期间，本地按钮处于禁用状态，并且有提示引导云端添加前往上方的登录/发现流程）。本地条目由应用管理，无法移除。**测试**直接探测连接自身的 HTTP 和 WebSocket 支路。
- **保存时拒绝重复项**：**本地**条目仅允许一个；远程和云端条目按规范化 URL 去重（去除首尾空格、去除末尾斜杠、转为小写——两种类型统一处理）；SSH 条目按规范化后的 `user@host:port` 加 远程配置档 去重。
- 首次运行带注册表的版本时，现有设置会**自动导入**：你当前的全局连接以及任何旧版按配置档覆盖项都会成为命名条目。旧设置文件保持不动，因此旧版本仍可正常使用。
- 云端条目来自上方的 Hermes Cloud 登录/发现流程，而非手动输入的 URL。
- Token 使用操作系统密钥环加密存储（在没有密钥环的 Linux 上可选择显式启用以明文存储）。

并排路由已上线：每个已注册网关按需连接自己的后端和套接字（按连接 + 配置档为键），插件 SDK 暴露联合智能体名册（`host.agents()` / `host.ensureAgent()`），网关页面上的**更新所有实例**会一次性向每个符合条件的网关派发 `hermes update`——Hermes Cloud 条目会被跳过（由平台负责更新它们），每个实例各自报告自己的结果。


:::info 远程后端是一个正在运行的 `hermes serve` 进程
“远程后端”指的是运行在远程机器上的 **`hermes serve`** 服务器——Desktop 应用连接的就是该进程。除非该后端确实已启动且可达，否则本节任何内容都无法工作。Desktop 应用不会为你启动它；你（或一个 `systemd` 服务）需要在远程主机上持续运行 `hermes serve`，应用再连接到它。如果你还使用消息频道（Telegram、Discord 等），**网关**是一个*独立的*长期运行进程，你需要单独启动——见设置步骤后的说明。
:::

连接分为两半：在后端上，你用 **auth 提供程序**保护它；在应用中，你输入后端的 URL 并登录。将后端绑定到非环回地址会自动启用其 auth 门禁，而你配置的提供程序正是让 Desktop 应用得以通过的关键。

**根据后端所在位置选择提供程序：**

- **OAuth（Nous Portal）——适用于任何超出你本机可达范围的情况。** 登录会针对你的 Nous 账户验证，因此这个选项适用于 VPS、公网主机或任何远程后端。用 `hermes dashboard register`（或 Portal 的 [`/local-dashboards`](https://portal.nousresearch.com/local-dashboards) 页面）注册 dashboard，以接入其 OAuth 客户端，然后在应用中使用 **Sign in with Nous Research** 登录。如果你运行自己的身份提供程序，自托管的 OIDC 提供程序工作原理相同。
- **用户名/密码——仅限本地/受信网络使用。** 当后端位于同一受信 LAN 或仅能通过 VPN（例如 Tailscale）访问时，这是最简单的选项。它保护单个共享凭据，没有外部身份提供程序，因此**不要将其用于暴露在公网上的 dashboard**——那里应改用 OAuth。

本节其余部分展示用户名/密码路径，因为它是在受信网络上最快搭建起来的方式；OAuth 路径见[Web Dashboard → 默认提供程序：Nous Research](./features/web-dashboard.md#default-provider-nous-research)。

### 在后端（远程机器）上

设置用户名和密码，然后启动后端并绑定到可访问的地址。凭据存放在 `~/.hermes/.env`（密钥文件，权限 0600）：

```bash
# 1. 设置仪表板登录凭据。
cat >> ~/.hermes/.env <<'EOF'
HERMES_DASHBOARD_BASIC_AUTH_USERNAME=admin
HERMES_DASHBOARD_BASIC_AUTH_PASSWORD=choose-a-strong-password
# 推荐：稳定的签名密钥，使会话在重启后仍然有效。
# 不设置的话，每次启动都会生成一个随机密钥，每次重启你都会被登出。
HERMES_DASHBOARD_BASIC_AUTH_SECRET=$(openssl rand -base64 32)
EOF
chmod 600 ~/.hermes/.env

# 2. 启动后端并绑定到可访问的地址。非回环绑定
#    会启用认证门禁；用户名/密码服务商会处理登录。
hermes serve --host 0.0.0.0 --port 9119
```

只要你希望桌面应用能够连接，就让那个 `hermes serve` 进程保持运行——如果它停止，应用就无法再访问后端。把它跑在 `systemd`、`tmux` 或你选择的进程管理器下，让它在登出和重启后仍能存活。

另外，如果你依赖消息渠道，请确保**网关在远程主机上运行**——桌面应用连接的是 `hermes serve` 后端，但你的 Telegram/Discord/Slack 网关会话是另一个进程，需要单独启动并保持运行。网关设置见[消息渠道](./messaging/index.md)。

不想在磁盘上保留明文密码？可以改为将 `HERMES_DASHBOARD_BASIC_AUTH_PASSWORD_HASH` 设置为 scrypt 哈希——用 `python -c "from plugins.dashboard_auth.basic import hash_password; print(hash_password('PW'))"` 计算。完整配置项（config.yaml 键、所有环境变量、限流器）：[Web 仪表板 → 用户名/密码服务商](./features/web-dashboard.md#usernamepassword-provider-no-oauth-idp)。

以后台服务方式运行后端？为 unit 设置 `EnvironmentFile=%h/.hermes/.env`，让凭据在启动时进入环境。

:::warning
后端会读写你的 `.env`（API 密钥、密钥），并且可以运行智能体命令。上面展示的**用户名/密码**设置适用于可信网络——切勿将密码保护的后端直接暴露到公网；请将其置于 VPN 之后。[Tailscale](https://tailscale.com/) 是干净利落的选择：绑定到该机器的 tailscale IP（`--host <tailscale-ip>`），并使用 `http://<tailscale-ip>:9119` 作为远程 URL，这样只有你的 tailnet 可以访问。若要通过公网访问后端，请改用 **OAuth (Nous Portal)** 服务商。
:::

### 在应用中

**设置 → 网关 → 远程网关：**

1. **远程 URL** —— `http://<backend-host>:9119`（像 `/hermes` 这样的路径前缀在通过反向代理前置时也可用）
2. **登录** —— 应用会检测后端公布的认证方式并调整按钮。对于用户名/密码后端，它会显示一个**登录**按钮，打开凭据表单（输入第 1 步的凭据）。对于 OAuth 后端，它显示**使用 `<provider>` 登录**（例如*使用 Nous Research 登录*），这会在浏览器中运行服务商的登录流程。无论哪种方式，应用最终都会对后端拥有一个已认证的会话。
3. **保存并重新连接** —— 将桌面外壳切换到远程后端。会话会自动刷新；当设置了 `HERMES_DASHBOARD_BASIC_AUTH_SECRET` 时，你会在重启后保持登录状态。

你也可以在启动应用前通过 `HERMES_DESKTOP_REMOTE_URL` 环境变量在不使用 UI 的情况下设置后端 URL（它会覆盖应用内设置）；你仍然需要从网关设置面板登录。

:::note 每配置档远程主机
远程网关主机按[配置档](./profiles.md)配置，因此每个配置档可以指向自己的远程后端（或保留在其本地后端上）。切换配置档会切换应用所连接的远程主机。
:::

### 故障排除

- **登录失败，返回 401 / “凭据无效”** —— 用户名或密码与后端的 `HERMES_DASHBOARD_BASIC_AUTH_USERNAME` / `HERMES_DASHBOARD_BASIC_AUTH_PASSWORD` 不匹配。后端对于未知用户和错误密码会返回相同的通用错误（无枚举断言），因此请核对两者。用 `curl -s http://<host>:9119/api/status | jq '.auth_required, .auth_providers'` 确认门禁已开启——它应该报告 `true` 并包含 `"basic"`。
- **没有“登录”按钮——它要求输入会话令牌** —— 后端的用户名/密码服务商未激活。`/api/status` 不会在 `auth_providers` 中列出 `"basic"`。请确保 `~/.hermes/.env` 中同时设置了用户名和密码（或密码哈希），并且仪表板进程确实加载了它们。
- **每次重启都被登出** —— 将 `HERMES_DASHBOARD_BASIC_AUTH_SECRET` 设置为一个稳定的值。没有它，令牌签名密钥会每次启动重新生成，使所有会话失效。
- **连接被拒绝 / 超时** —— 后端绑定的是 `127.0.0.1`（默认值），或者有防火墙/VPN 阻止了该端口绑定到 `0.0.0.0` 或 tailscale IP，并将端口对你的可信网络开放。

从 Web 仪表板角度的相同设置，见[Web 仪表板 → 将 Hermes Desktop 连接到远程后端](./features/web-dashboard.md#connecting-hermes-desktop-to-a-remote-backend)；环境变量收录在[环境变量 → Web 仪表板与 Hermes Desktop](../reference/environment-variables.md#web-dashboard--hermes-desktop)中。

## 扩展桌面应用

桌面应用是贡献驱动的 —— 窗格、页面、侧边栏导航、状态栏项、命令面板命令、快捷键绑定和主题都通过同一个 SDK 注册，你可以添加自己的。一个插件就是一个 ESM 文件，放到
`$HERMES_HOME/desktop-plugins/<id>/plugin.js`；应用会在几秒内加载它，并在每次保存时热重载。已完成安装的插件可在 **Capabilities → Plugins** 中实时管理。

完整参考见 [Desktop Plugin SDK](../developer-guide/desktop-plugin-sdk.md)。（这与 [web dashboard 插件系统](./features/extending-the-dashboard.md) 是分开的。）

**Capabilities → Plugins** 是扩展 Hermes 的一切的统一入口：**每个插件一行**，带两列开关。

- 一个插件可以扩展**本应用**、**智能体**，或**两者** —— 每行的徽章标明了它属于哪种，依据包中所包含的内容推断（`plugin.yaml`
  → 智能体部分，`plugin.js` → 桌面部分）。双半部分的插件只占一行，绝不分成两行。
- **Desktop 列** —— 加载到本应用的那一半。它是应用级别的：同一个开关、同一个值，无论窗口正面对的是哪个配置档、网关或远程机器。桌面代码只从一个位置加载，
  `~/.hermes/desktop-plugins/`；统一智能体+桌面包中的桌面部分在安装时会由应用复制到那里（并随其更新与卸载），因此切换配置档绝不会加载、卸载或重新划定窗格的作用域。开关会实时生效。
- **Agent 列** —— 安装在所选配置档后端的那一半
  （[智能体插件](./features/plugins.md)：用户、git、项目、pip 和便携安装），当目录固定版本发生移动时会显示一个 **Update** 徽章。配置档选择器位于此列的标题处，因为它只管辖这一列；只有一个配置档时根本不会出现选择器。
  仓库内置的捆绑插件（平台适配器、服务商插件）不会被列出：它们随包自带且默认启用，并从各自的界面进行配置。
- 插件未提供的某一半会显示一条短横线。如果某插件含桌面部分，而其智能体部分在所选配置档中**未**安装，则显示 **Install here**，它会仅针对该配置档，从包的来源（目录条目或 git remote）预填充安装对话框。像
  [Accent Picker](https://github.com/NousResearch/hermes-desktop-accent-picker) 这样的可选附加组件，通过 **Install from Git** 从其自己的仓库进行安装。

发现功能位于其下方：实时的 [Plugin Catalog](./features/plugin-catalog.md)
选择器会把已审查的条目按其所固定的 commit 安装到所选配置档，而 **Install from Git** 则通过同一个先审查后安装的对话框接纳任何其他仓库；它可选的 **Pin to commit** 字段会安装一个精确的 40 字符 commit SHA（含私有仓库），被固定的插件在列表中会带一个 `pinned @ <sha8>` 徽章。旧的 `Settings → Plugins` 链接会重定向到此处。

## 排障

### 无需重启应用即可重新连接

如果 Desktop 聊天或机器人停止响应，而连接仍显示 **已连接**，请选择该机器人/配置档或网关，打开状态栏的网关菜单，然后点击 **Reconnect gateway**。对于处于连接中、开放以及已断开状态的传输通道，重新连接始终可用。它会重新拨号活跃路由，而不会重启 Desktop，也不会刻意关闭其他路由的套接字。所选套接字上的在途请求可能会被打断；这是显式的恢复操作，而非后端或模型的重启。

### 失败的轮次会指出故障层

当某个轮次失败时，聊天会渲染一张错误卡片，指出**哪一层失败了** —— 服务商/模型、自定义端点、流式连接、认证、计费、网关、本地运行时或磁盘 —— 而不是一条通用错误提示。该卡片会提供与故障相匹配的恢复操作：

- **Retry** —— 就地重跑失败的轮次（当重试会确定性地复现故障时会隐藏，例如内容策略拒绝）。
- **Switch provider** —— 在服务商、端点、认证和计费故障时跳转到 Settings → Models。
- **Open logs** —— 在你的文件管理器中打开 `HERMES_HOME/logs`。在远程或 Cloud 连接上，该按钮显示为 **Open Desktop logs**：它会打开 Desktop 本地侧的日志（传输通道证据），因为失败轮次的网关/智能体日志位于远程机器上。
- **Send diagnostics** —— 在明确的同意提示后，把一份已脱敏的调试包上传到 Nous 内部存储（与
  `hermes debug share --nous` 相同的流水线；机密信息一律脱敏，该包仅 Nous 工作人员可查看，并在 14 天后自动删除）。成功后你会获得一个私密查看链接，可粘贴到你的支持帖中，此外还有 GitHub Issues、Nous Portal Support 和 Discord 的快捷链接。在远程或 Cloud 连接上，后端会打包其自己的智能体/网关日志，并附带本地 Desktop 日志一并上传，因此支持人员能看到双方两半。
- **Copy error details** —— 复制一份简洁的纯文本摘要（故障层、代码、服务商/模型、错误消息），可粘贴到 bug 报告或 Discord 中。

该故障层来自智能体重试循环所使用的同一个错误分类器，因此它反映的是真实的故障语义，而不是对消息文本的猜测。早于该描述符的旧后端仍会渲染该卡片，只是带一个通用标题，以及 Retry / Open logs / Copy error details 操作。

启动日志会写入 `HERMES_HOME/logs/desktop.log`（其中包含后端输出和最近的 Python 回溯）—— 如果应用报告了启动失败，请首先检查此文件。你也可以通过 CLI 跟踪它：

```bash
hermes logs gui -f
```

常见重置操作：

```bash
# 强制进行干净的首启动设置（macOS/Linux）
rm "$HOME/.hermes/hermes-agent/.hermes-bootstrap-complete"

# 重建损坏的 Python venv（macOS/Linux）
rm -rf "$HOME/.hermes/hermes-agent/venv"

# 重置卡住的 macOS 麦克风权限提示
tccutil reset Microphone com.nousresearch.hermes
```

### “The host key has CHANGED since you last connected”（SSH 远程连接）

如果你的 SSH 远程主机被重装或其主机密钥发生了轮换，SSH 会即时失败并阻止连接，Desktop 则会卡在一个错误覆盖层上而不进行重试（在清除过期密钥之前，重试永远不会成功）。确认该变更符合预期后，移除旧条目并从覆盖层重试：

```bash
ssh-keygen -R <host>
```

清除条目后点击 **Retry**（或在 Settings → Gateway 中重新应用该连接）——锁定状态会被重置，下次启动会重新拨号。

### “Build desktop app” 卡在 Electron 下载

构建过程会从 `github.com/electron/electron/releases` 下载 Electron 运行时（约 114&nbsp;MB）。如果安装程序卡在 **Build desktop app** 步骤，且实时输出反复出现 `retrying attempt=…`，说明你的网络（防火墙、代理或所在地区）屏蔽或限速了 GitHub。

安装程序会自动修复：构建失败时，它会 (1) 清除损坏的 Electron 缓存 zip 并重试，然后 (2) 如果仍然失败且你未设置 `ELECTRON_MIRROR`，则再通过 `npmmirror.com`（事实上的 Electron 社区镜像）重试一次。`@electron/get` 会对下载进行 SHASUM 校验，但校验和同样来自该镜像——这能发现损坏或不完整的下载，但无法发现被篡改的镜像。如果你不愿信任第三方主机，请自行指定 `ELECTRON_MIRROR`（见下文）；构建过程绝不会覆盖你自己设置的值。

要**选择你自己的镜像**（例如企业/可信镜像），在安装前设置 `ELECTRON_MIRROR`，或手动重新构建——构建过程会遵从此设置且不会覆盖它：

```bash
ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/ \
  bash -c 'cd "$HOME/.hermes/hermes-agent/apps/desktop" && CSC_IDENTITY_AUTO_DISCOVERY=false npm run pack'
```

**其他需要镜像的原生下载（例如 Windows 上的 `get-windows` 预构建包）：** 把 npm 配置键放入 `$HERMES_HOME/npmrc`（Windows 上是 `%LOCALAPPDATA%\hermes\npmrc`，其他平台是 `~/.hermes/npmrc`）——例如 `node_get_windows_binary_host_mirror=https://<mirror>/sindresorhus/get-windows/releases/download/`。更新器启动的每次 `npm ci`/`npm run`（desktop、web 与 TUI 构建）在该文件存在时都会把 `NPM_CONFIG_USERCONFIG` 指向它，因此该配置能挺过 `hermes update`；仓库根目录下的 `.npmrc` 受 git 跟踪，每次更新时会被自动 stash，而 `~/.npmrc` 可能被忽略，因为 desktop 的交接继承了 GUI 的环境。你自己设置的 `NPM_CONFIG_USERCONFIG` 永远不会被覆盖。

手动清除损坏的缓存 zip：

```bash
rm -f "$HOME/Library/Caches/electron"/electron-*.zip   # macOS
rm -f "$HOME/.cache/electron"/electron-*.zip            # Linux
```

## 从源码构建

如果你想直接修改应用本身，先从仓库根目录安装一次 workspace 依赖，然后在 `apps/desktop` 中运行开发服务器：

```bash
npm install          # 在仓库根目录运行 —— 会链接 apps/desktop、web、apps/shared
cd apps/desktop
npm run dev          # Vite 渲染进程 + Electron，会启动 Python 后端
```

让应用指向某个特定的检出目录，或将其与你的真实配置隔离到沙箱环境：

```bash
HERMES_DESKTOP_HERMES_ROOT=/path/to/clone npm run dev
HERMES_HOME=/tmp/throwaway npm run dev
npm run dev:fake-boot   # 用确定性延迟演练启动覆盖层
```

构建安装包：

```bash
npm run dist:mac     # DMG + zip
npm run dist:win     # NSIS + MSI
npm run dist:linux   # AppImage + deb + rpm
npm run pack         # release/ 下的未打包应用（无安装程序）
```

当环境中存在相关凭证时（macOS 需 `CSC_LINK` / `CSC_KEY_PASSWORD` / `APPLE_*`，Windows 需 `WIN_CSC_*`），macOS/Windows 的签名与公证会自动执行。

### macOS 权限与本地重新构建（TCC）

**用一个开关消除所有文件夹提示。** 当 Hermes 触碰各个文件夹时，macOS 会按类别逐一提示（先是 Desktop，然后 Downloads，再是 Documents……）。单次授予 **Full Disk Access** 即可永久覆盖全部——而且得益于 Hermes 稳定的签名身份，它能挺过每一次更新：

1. 系统设置 → **隐私与安全性 → 完全磁盘访问权限**（或运行
   `open "x-apple.systempreferences:com.apple.preference.security?Privacy_AllFiles"`）
2. 启用你的终端应用——如果使用 Desktop，还要启用 **Hermes.app**。
3. 完全退出并重新启动它们一次。

`hermes doctor` 会报告当前终端上下文是否已获得该授权，`hermes setup` 会在 macOS 上尚未获得时显示此提示。

macOS 记住权限授予（完全磁盘访问权限、Desktop/Downloads/Documents、辅助功能、自动化、麦克风）依据的是应用的*代码签名身份*，而非其路径。本地构建与自更新的应用会用固定在标识符上的稳定 ad-hoc 签名来签名，因此授权能在更新后保留。

一次性说明：在标识符固定签名的修复（PR #73681）*之前*的构建所获得的授权，携带的是旧的 cdhash 固定要求。对这类过期授权，macOS 会继续将开关显示为 ON，但依然反复提示，因为存储的授权已不再匹配重建后的二进制——而现代的提示窗口没有 Allow 按钮，看起来似乎没什么可重新确认的。如果遇到这种情况，重置一次过期授权并重新授予：

```bash
tccutil reset ScreenCapture com.nousresearch.hermes   # 按服务逐一重复
```

然后在系统设置中把新条目切换为 ON，并完全退出并重启 Hermes。此后授权就稳定了。

若想要最强的保证——以证书为锚的身份，即 yabai/skhd 用户所依赖的同一机制——只需创建一次自签名代码签名证书，并告诉 Hermes 使用它。一条命令即可完成全部工作（为证书在登录钥匙串中创建、授予 `codesign` 访问权限、写入配置，并对打包后的应用重新签名）：

```bash
hermes desktop --setup-tcc-identity
```

或手动操作：

1. 钥匙串访问 → 证书助理 → **创建证书…**
2. 名称：`Hermes Local Signing`，身份类型：*自签名根证书*，
   证书类型：**代码签名**。
3. 在钥匙串访问中双击新证书 → **信任** → 把
   **代码签名**设为*始终信任*（导入的自签名证书在获得代码签名信任之前不是有效的签名身份——
   之后 `security find-identity -v -p codesigning` 应能列出它）。
4. `hermes config set desktop.macos_signing_identity "Hermes Local Signing"`

在命令中使用 `--identity <name>` 可创建/使用不同名称的证书（默认：`Hermes Local Signing`）。该命令是幂等的——更新后重新运行它即可重新指定配置并对重建后的应用重新签名。

下次更新会用该证书对重建的应用重新签名；所有 TCC 授权都将保留。无需 Apple 开发者账号。经过公证的发行版构建会被检测到，且绝不会被重新签名。

一次性说明：更改签名身份（包括此修复后的第一次更新）会改变应用的身份一次，因此 macOS 会最后再提示一次。此后授权就稳定了。如果某个权限卡住，用 `tccutil reset All com.nousresearch.hermes` 重置并重新授予即可。

## 另请参阅

- [CLI 指南](./cli.md) —— 终端界面
- [TUI](./tui.md) —— `hermes --tui` 与仪表盘聊天标签页所用的现代终端 UI
- [Web 仪表盘](./features/web-dashboard.md) —— 内嵌聊天标签页的浏览器管理面板
- [配置](./configuration.md) —— 桌面应用读取与写入的配置
- [Windows（原生）](./windows-native.md) —— 原生 Windows 安装路径
