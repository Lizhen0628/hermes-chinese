---
sidebar_position: 3
title: "Hermes Desktop"
description: "原生 Hermes 桌面应用——精致的 Hermes 聊天体验，具备流式工具输出、并排预览、文件浏览器、语音、定时任务、配置档、技能与设置。支持 macOS、Windows 和 Linux。"
---

# Hermes Desktop

Hermes 桌面应用是一个原生应用，它围绕着你从 CLI 和网关获得的**同一个**智能体构建——相同的配置、相同的 API 密钥、相同的会话、相同的技能、相同的记忆。它不是独立产品或轻量版克隆；它使用同一套 Hermes Agent 核心和设置，并通过一个现代且经过精心设计的 UI 来驱动它。如果你曾在终端中使用过 `hermes`，你在那里设置的一切这里都已经具备，你在这里做的任何操作也会在那里显示。

它可在 **macOS（Apple Silicon）、Windows 和 Linux** 上运行——完整支持矩阵见[平台支持](../getting-started/platform-support.md)。

:::tip 哪个界面是哪个？
Hermes 有多个前端，它们都与同一个智能体通信：

- **桌面应用**（本页）——一个原生应用，拥有专门为聊天、配置和管理打造的 UI。
- **CLI**（`hermes`）和 **[TUI](./tui.md)**（`hermes --tui`）——终端界面。
- **[Web 仪表盘](./features/web-dashboard.md)**（`hermes dashboard`）——浏览器管理面板；其可选的 **Chat**（聊天）标签页通过伪终端嵌入 TUI。

选择适合当下场景的界面即可。它们共享状态，因此你可以在一个界面中开始会话，然后在另一个界面中恢复它。
:::

## 安装

从 [Hermes Desktop 产品页](https://hermes-agent.nousresearch.com/desktop) 下载该应用，或按照 [Hermes Desktop 安装说明](../getting-started/installation.md) 操作。

如果你已经安装了 Hermes，只需运行

```bash
hermes desktop
```

即可使用你当前的配置、密钥、会话和技能。

## 应用中有什么

桌面应用组织为一个以聊天优先的窗口，左侧边栏用于导航。它旨在支持同时管理多个智能体会话、配置消息服务商、创建工件、浏览项目文件夹结构，以及同时处理多个项目。

侧边栏的选择会跟随聚焦的聊天窗格。打开或聚焦会话标签页会清除页面的高亮，包括 Kanban 等贡献页面，即使工作区仍保留该页面的路由也是如此。

### 聊天

应用的中心。你可以获得：

- **流式响应** ，在智能体工作时实时显示工具活动和结构化的工具调用摘要。
- **Markdown 换行** 遵循 Markdown 语义：两个尾随空格创建硬换行；普通换行保持为软换行。媒体和预览提取会保留被移除附件片段之外的文本，包括首行代码缩进和未闭合围栏代码的空格。代码显示和复制会保留 Markdown 解析器中的前导空行、尾随空格和终端空行。
- **与其他所有 Hermes 界面相同的对话历史** ——在这里开始的会话可以在 CLI/TUI 中恢复，反之亦然。
- **拖放文件** 到聊天区域的任意位置，即可将它们附加到你的下一条消息。
- **独立的背景草稿** ——隐藏的聊天标签页可以更新其草稿，而不会移动可见编辑器中的光标或选区。
- **指令芯片操作** ——将鼠标悬停在可操作的引用（例如 URL）上，可显示其操作药丸按钮。短暂的宽限期让你可以从芯片移动到药丸按钮，然后它才会消失。当你在药丸按钮内移动时，它会保持可用；离开后，无关的指针移动不会延迟消失。点击其操作会保留草稿选区。
- **右侧预览栏** ——在你继续聊天的同时，并排渲染网页、文件和工具输出。
- **应用内浏览器中的评论模式** ——点击预览浏览器栏中的 **Annotate**（批注），然后点击实时页面上的任意元素（或拖拽一个框）并输入注释；每条保存的评论都会作为带编号的图钉留在页面上。保存图钉不会发送一轮对话——完成后，**Add N comments**（添加 N 条评论）会将每个图钉对应的裁剪截图和一段简短提示（点名每条评论）附加到编辑器，然后仍由你自己点击发送。每条元素评论都会带上它的 CSS 选择器、它的标记，以及对布局至关重要的计算样式，这样智能体就能在你的源代码中找到该元素，而不是从图片中猜测。密码和隐藏字段的值，以及任何看起来像密钥或令牌的属性，都会在标记离开页面之前被脱敏。较大的批次会按每条评论在页面中所处的位置分组，因此二十多条评论会变成少量几块工作，而不是每条一个任务——而且由于这些组是独立的 DOM 子树，它们通常涉及不同的文件，这正是将它们交给并行工作器处理安全的原因。删除某条评论后，其余图钉编号保持不变；切换聊天会清空整个队列。
- **编辑器历史与队列编辑** ——在空编辑器中按上/下箭头键可调出并复用之前的提示词，还可以编辑已排队但尚未发送的消息。当有对话轮次排队时，按停止（或 Esc）会暂停队列并在编辑器上方展开它；你可以从那里恢复队列，或发送、编辑、删除单个条目。
- **编辑器上方的任务进度** ——展开 Tasks（任务）标题可查看每个阶段。长列表会在输入框上方保持有界；在展开的列表内部滚动即可到达最后的任务，而不会移动对话。
- **对话时间线导轨** ——长聊天会在对话记录边缘出现一条细长的标记导轨，每条提示词对应一个标记。将鼠标悬停其上会弹出提示词列表，点击其中一个可直接跳转到对话中的该位置。（当聊天有几轮对话后它就会出现。）
- **阅读位置记忆** ——返回某个会话时，会恢复其保存的距底部距离，而不是总是跳到最后一条消息。停留在底部的会话会继续跟随新输出。使用 **Scroll to bottom**（滚动到底部）可回到最新边缘。位置保存在此 Desktop 安装的本地存储中；它们不会通过后端同步。
- **页面内查找** ——按 **Cmd/Ctrl+F** 打开查找栏，在渲染后的聊天记录中搜索。Enter / Shift+Enter（或查找栏打开时按 Cmd/Ctrl+G / Cmd/Ctrl+Shift+G）可逐条浏览匹配项；Esc 关闭它。

异步定时任务和委派完成会以折叠的时间线披露项显示。打开完成标签即可将结果正文（包括任务输出）作为 Markdown 阅读；长报告会在披露项内部滚动。任务指令和投递信封不会作为报告内容显示。

#### 状态栏

聊天底部的条形栏显示实时会话状态，并提供快捷控制，无需打开 Settings：

- **各会话独立的 YOLO 开关** —— 仅针对当前会话开启或关闭 YOLO（与 TUI 行为一致）。YOLO 会绕过危险命令的审批提示，因此请明确你正在关闭什么 —— 参见[安全 → YOLO 模式](./security.md#yolo-mode)。
- **上下文用量计量器** —— 会话上下文窗口的实时「% 已满」计量器。点击它会打开 **Context Usage** 弹窗，其中按类别列出 token 明细（系统提示、工具定义、技能、记忆、规则、MCP、子智能体定义以及对话本身），让你在压缩机制介入之前精确看清是什么在占用上下文窗口。
- **缓存命中率与每秒 token 数** —— 默认关闭；可从右键菜单中开启。缓存命中率是本会话的提示词 token 中由服务商提示缓存所提供的比例（缓存 token 更便宜，因此越高越省钱 —— 你能看到会话随着预热而逐渐变得便宜）。每秒 token 数是最近 10 次模型调用的输出吞吐量平均值。两者在对话轮次过程中都会实时更新。
- **可自定义项目** —— 右键点击状态栏（**Show in status bar**）可自行选择显示哪些内容：上下文计量器、缓存命中率、每秒 token 数、工作区、模型、审批（approvals）、轮次/会话计时器、终端、Command Center、后端版本等 —— 也可以完全隐藏该栏（**Cmd/Ctrl+Shift+S** 可切换显示）。

若你要连接的是另一台机器上的 Hermes 实例，而非捆绑的本地后端，请参阅下文的[连接到远程后端](#connecting-to-a-remote-backend)；如需了解远程托管的 dashboard 连接机制的完整图景（认证门控、`/api/ws` 聊天套接字，以及 WebSocket 关闭码排查），请参阅 [Web Dashboard → 将 Hermes Desktop 连接到远程后端](./features/web-dashboard.md#connecting-hermes-desktop-to-a-remote-backend)。

#### 字体

**Settings → Appearance** 中有两项各自独立的字体设置，二者都按配置档存储在 `config.yaml` 中：

- **Chat Font**（`desktop.font_family`）—— 聊天界面以及应用其它 UI 部分的字体。诸如 OpenDyslexic 或 Atkinson Hyperlegible 之类的可读性字体，只要系统上已安装即可生效；当前主题的字体栈会作为备用，对缺失字形仍能正常渲染。留空表示使用主题字体。
- **Terminal Font**（`terminal.font_family`）—— 内嵌的终端面板字体；Nerd Fonts 在此渲染 shell 图标。留空表示使用捆绑的 JetBrains Mono。

#### 仓库发现

Hermes Desktop 会以有限深度扫描用户主目录，从而为 Projects 侧边栏发现本地 Git 仓库。你可以在 **Settings → Workspace** 中或 `config.yaml` 中按配置档调整：

```yaml
desktop:
  repo_scan_enabled: true
  repo_scan_roots: []
  repo_scan_exclude_paths: []
```

- 将 `repo_scan_enabled: false` 设为关闭即可完全停止文件系统扫描。该配置档在磁盘发现缓存中的既有记录会被清除；显式创建的项目以及从有意的 Hermes 会话中推断出的仓库仍然可用。
- 将 `repo_scan_roots` 设为一组文件夹，用于限制扫描范围。留空列表则保留默认的主目录扫描。
- 将 `repo_scan_exclude_paths` 设为一组文件夹，其整个子树都将会被跳过。

更改上述任意设置只会使该配置档的磁盘发现缓存失效，并启动一次符合策略的刷新。**Hide from sidebar** 仍是一个独立的、按条目的整理操作。

#### 选择模型

模型选择器位于 **composer** 中，就在麦克风图标左侧。点击它可以切换模型；将鼠标悬停在某一行模型上可查看其选项（thinking、effort、fast）。相邻的 **推理标记**（reasoning pill）会显示当前模型所用的思考强度等级（`Med`、`High`……），并直接打开相同的选项，因此你无需再找到那一行便可更改思考强度。对于目录中报告不支持推理控制的模型，该标记会隐藏。

- **造器（composer）选择器属于粘性 UI 状态，绝不会触碰你的默认值。** 它仅在本地记忆（按设备），并在新聊天和重启之间**延续**，而不会弹回默认值 —— 选好一次后，下一次 `Cmd/Ctrl+N` 也会以它打开。在已有聊天中切换模型会将该变更限定在**当前聊天**内；无论哪种情况，选中的模型都会在会话创建/切换时随之生效，并且**绝不会**写入配置档默认值 —— 有一个例外：刚创建的配置档尚未配置 `model.default`/`model.provider` 时，第一次选择会被持久化，从而让应用拥有一个真正的默认模型，而不是在重启后退化到某个不知从哪来的 API-key 环境变量上。持久化行为遵循与 `/model` 相同的规则（`model.persist_switch_by_default`）；要用**Settings → Model** 有意更改默认值。（切换[配置档](#sessions--profiles)时会重新采用该配置档自身的默认值。）
- **在 Settings → Model 中设置默认模型。** 那个「main」模型就是你的**每配置档全局默认模型** —— 它也是新聊天、定时任务、子智能体和辅助任务的起点，并且是唯一会写入它的地方。每个[配置档](#sessions--profiles)都各自保有自己的默认模型。
- **按模型的 effort/fast 预设。** 每个模型都会在桌面应用中记住自己的思考强度和快速模式选择，并在你每次选中该模型时重新应用到会话上。这些预设只是桌面端的便利措施，不会改变定时任务或子智能体。
- **聊天中途切换模型会重置提示缓存。** 在已有聊天中切换模型意味着下一条消息会以完整输入价格重新读取整个对话（服务商的提示缓存是按模型为键的）。偶尔为之无妨；但在很长的聊天中，换到新模型开一个新聊天通常比来回切换更便宜。

### 文件浏览器

无需离开应用即可浏览和预览工作目录 —— 在智能体读取、写入和编辑文件时，这对于跟进操作特别有用。使用 `hermes desktop --cwd <path>`（或 `HERMES_DESKTOP_CWD` 环境变量）设置初始项目目录。

### 产物

连接到远程网关时，打开文件产物会通过该网关下载，使用产物来源所对应的配置档和会话。相对路径基于会话保存的工作目录解析；相对于主目录的路径使用网关的主目录，绝不是 Desktop 所在机器的主目录。除正斜杠路径外，Windows 风格的相对路径也能被识别，文件 URI 会保留驱动器与网络共享信息，交由网关解释。会话或工作目录缺失时会产生错误，而不会选择其他本地文件。

**产物**视图将会话生成的内容 —— **图片、文件和链接** —— 汇集到一个可搜索、可浏览的图库中。你可以从侧边栏、命令面板（**Artifacts — Browse generated outputs**），或自行绑定的 `nav.artifacts` 快捷键打开它。它会自动索引近期的会话输出；每件产物都会显示其来自哪个会话，并提供跳回该聊天的入口，图片和文件会在预览中打开，附带下载 / 在浏览器中打开 / 复制操作。

### 窗口、标签页与面板

本应用专为同时处理多项任务而构建：

- **标签页** —— **Cmd/Ctrl+T** 打开新的会话标签页；**Ctrl+Tab** / **Ctrl+Shift+Tab** 循环切换会话，**Ctrl+1…9** 按位置跳转到最近的会话。**Cmd/Ctrl+W** 关闭当前聚焦的标签页，**Cmd/Ctrl+Shift+T** 重新打开最近关闭的标签页。
- **多窗口** —— **Cmd/Ctrl+Shift+N** 打开新窗口，任何会话都可以通过其上下文菜单（**New window**）或命令面板弹出为新窗口。弹出的窗口仅渲染该单个聊天，不显示全局侧边栏 —— 非常适合将长时间运行的会话停驻在另一台显示器上。智能体的实时输出会流式传输到显示该会话的每个窗口。
- **面板** —— **Cmd/Ctrl+B** 切换左侧边栏，**Cmd/Ctrl+J** 切换右侧边栏，**Cmd/Ctrl+\\** 交换侧边栏所在的左右两侧。

### 终端

右侧边栏中紧邻文件浏览器处有一个真实的终端：

- **Ctrl+`** 显示终端（若没有则新建一个）；**Ctrl+Shift+`** 额外新建一个。多个终端堆叠在标签导轨中 —— **Ctrl+Shift+↓/↑** 在它们之间切换，**Ctrl+Shift+W** 关闭当前活动终端。
- **隐藏时 Shell 会保持运行。** 关闭或隐藏面板不会终止你的 Shell —— 每个打开的终端都会保持挂载，其回滚缓冲区和运行中的进程都原封不动，直到你显式关闭它。
- **添加到聊天** —— 选中终端输出并将其作为下一条消息的上下文发送到输入框。

### 实时子智能体

当委派的执行者处于活跃状态时，输入框上方会出现一个**子智能体**框，显示其数量、任务名称、已用时间和最新活动。它最多预览三个执行者；展开标题可查看完整名单，然后选择某个执行者可查看详情和 **引导** / **停止** 控制项。每个框都属于其对应的聊天，包括在分割面板中也是如此。引导仅表示该指引已排队等待某个检查点，并不意味着子智能体已读取它。参见[监控子智能体](/user-guide/features/delegation#monitoring-running-subagents-agents)。

### Git 审查与工作树

对于在 Git 仓库内运行的会话，应用内置了源代码管理界面：

- **审查面板** —— **Cmd/Ctrl+G** 切换工作区审查面板：分支及领先/落后状态、变更文件（列表或树形视图），以及限定于**未提交**、**分支**或**上一回合**（即智能体在最近一回合中所做的更改）范围的差异对比。暂存/取消暂存文件、还原更改、撰写提交信息（或 **生成提交信息**），然后 **提交** 或 **提交并推送** —— 以及通过 GitHub CLI（`gh`）**创建 PR**，或用 **让 Hermes 打开 PR** 将整个流程交给智能体。你还可以在此创建和切换分支。
- **工作树** —— **Cmd/Ctrl+Shift+B**（或侧边栏中某个项目上的 **New worktree**）会在新分支上创建 Git 工作树，以便智能体操作仓库的并行副本，而不影响你的检出。工作树会作为项目下的独立通道显示；移除工作树时可选择删除工作树目录（分支保留），或仅隐藏该通道并保留磁盘上的文件，当存在未提交的更改时会提供强制选项。

### 记忆图谱

**记忆图谱**（命令面板 → *记忆图谱*，或状态栏项目）是一张交互式地图，展示 Hermes 为你学到的内容——技能和记忆以可缩放节点图的形式呈现，配有时间线，并可按 **全部 / 已使用 / 已学习** 筛选。共享控件会将地图布局导出为一段紧凑代码，你可以粘贴给别人（仅布局——不包含你的任何记忆或技能文本），也可以用同样的方式导入代码。

### 快速输入

快速输入是一个始终可用的小型输入框，可通过**系统范围内的全局热键**从任何地方唤出——无需切换到（甚至无需打开）主窗口即可发出提示词。在 **设置 → 高级 → 快速输入** 中启用；默认快捷键是 **Ctrl/Cmd+Shift+Space**，你也可以设置自己的快捷键（至少需要一个修饰键）。如果某个快捷键已被其他应用占用，设置行会提示你，以便你另选一个。

### 语音

与 Hermes 对话并听到它的回应，与其他地方可用的[语音模式](./features/voice-mode.md)相同。在 macOS 上，系统会提示一次以获取麦克风访问权限。

### HUD 模式

**⌘/Ctrl+Shift+H**（或标题栏按钮）会将聊天分离为一个无边框、始终置顶的浮动栏，悬浮在你正在使用的任何应用之上。应用窗口会退居一旁；HUD 保留你的实时对话和一个输入框。你把它停在哪里本身就是上下文——浮动栏的位置告诉 Hermes 你在询问哪个应用和屏幕，因此“这个”、“这里”和“那个页面”都指向它下方的内容。

- **移动浮动栏**——在 macOS 和 Windows 上，**按住**输入框上的任意位置片刻，然后拖动。在 Linux/X11 上，按住 **Ctrl** 并用主鼠标键拖动可立即抓取（包括在选中文本上）；按住拖动同样可用。在调用桌面切换快捷键时保持抓取状态，可将 HUD 带到另一个虚拟桌面。在原生 Wayland 上，输入框栏本身就是合成器的拖动手柄（这是移动它的唯一方式，因为应用无法自行放置窗口）。
- **调整大小**——拖动浮动栏的任意边缘或角落；对侧边缘保持锚定。原生 Wayland 仅暴露右侧和底部边缘，因为合成器不允许应用自行定位顶层窗口。
- **重置布局**——浮动栏上的丢弃控件会恢复默认大小和（在 X11 / macOS / Windows 上）位置。如果持久化的大小导致 HUD 无法使用，请使用此项。
- **吸附到指针**——**⌘/Ctrl+Shift+G**（全局热键，可在任何应用中生效）会将 HUD 跳转到光标所在位置。在原生 Wayland 上此操作无效——放置位置由合成器掌控。
- **退出**——点击浮动栏上的退出按钮，再次按 **⌘/Ctrl+Shift+H**，或在 HUD 获得焦点时按 **⌘/Ctrl+W**。应用窗口会带着你的会话回到前台，光标位于其输入框中。

#### Linux / Wayland

在 Wayland 会话中，Electron 20+ 已经作为原生 Wayland 客户端运行。在该路径下，拖动、点击穿透和调整大小均可正常工作。

在 **Hyprland**（包括 Omarchy）上，HUD 在其映射后通过合成器的 IPC 被浮动并固定——否则 Hyprland 会像对待其他窗口一样将其平铺，`always-on-top` 会被忽略，合成器拖动也不起作用。无需额外的窗口规则。

少数合成器（尤其是 COSMIC）会忽略原生 Wayland 窗口的 `always-on-top`。要在那里恢复置顶，可在 XWayland 下运行应用：

```yaml
desktop:
  ozone_platform_hint: x11
```

这会在启动时桥接到 `ELECTRON_OZONE_PLATFORM_HINT`（显式环境变量仍然优先）。代价是：X11 无法恢复一个已忽略鼠标事件的窗口，因此 HUD 会保持为实心窗口而非点击穿透。某些 KDE 设置在使用 X11 ozone 后端时还会报告键盘失灵——除非你需要始终置顶，否则请将提示保留为 `auto`。

#### WSLg（从 WSL2 使用 Windows GPU）

当 `hermes gui` 在 WSL2 内运行，且存在 `/dev/dxg` 并安装了 Mesa 的 `d3d12_dri.so` 时，启动器会为 Electron 设置 `GALLIUM_DRIVER=d3d12`，使渲染使用 Windows GPU 而非 llvmpipe 软件光栅化器；你的环境中显式设置的 `GALLIUM_DRIVER`、`MESA_LOADER_DRIVER_OVERRIDE`、`LIBGL_ALWAYS_SOFTWARE` 或 `LIBGL_DRIVERS_PATH` 会被保留不动（例如 `GALLIUM_DRIVER=llvmpipe hermes gui` 会保持软件渲染）。

### 设置与入门引导

在真实的 UI 中管理服务商、模型、工具与凭据，无需手动编辑 YAML。首次运行的入门引导只需几秒即可让你发出第一条消息。设置面板涵盖服务商/密钥、模型选择、工具集配置、MCP 服务器、网关以及会话管理。

- **服务商设置面板**——专门用于管理推理服务商，提供 Accounts / API-keys（账户 / API 密钥）交互界面，用于登录并按服务商存储凭据。账户与 API 密钥共用设置中的 **Applies to**（应用于）选择：此处发起的凭据读取与编辑、OAuth 账户移除以及登录都作用于所选配置档，而非当前聊天所在的配置档。登录流程在凭据保存与模型选择期间会保持该目标不变。更改 **Applies to** 会丢弃未保存的凭据草稿。关闭登录会取消轮询并忽略迟到的结果；但已经发出的凭据写入仍可能在原配置档中完成。外部管理的 CLI 凭据使用其自己的 CLI，不受此配置档选择器管辖。其 **Local Models**（本地模型）视图可安装并管理设备端的 llama.cpp 运行时——请参阅 [Local Models](/user-guide/local-models)。
- **菜单中包含所有服务商与模型**——GUI 展示完整的服务商列表以及 `hermes model` 所知的全部模型，因此你能够从 CLI 所见的同一目录中进行挑选，而不是一个精选子集。
- **xAI Grok OAuth**——Grok 在启动器中是一等的 OAuth 服务商；像其他 OAuth 服务商一样通过浏览器流程登录即可。
- **从 GUI 安装工具后端**——直接在应用中运行工具后端的安装后设置步骤，无需转到终端。
- **终端字体选择器**——在 **Settings → Appearance**（设置 → 外观）中选择一个已安装的字体。诸如 `MesloLGS NF` 之类的 Nerd Fonts 可在交互式终端与智能体终端中渲染 Powerlevel10k 分隔符与图标；该设置按配置档保存。
- **启动时重新打开上次聊天**——默认情况下，应用在冷启动时会恢复上次的进度。在 **Settings → Appearance**（设置 → 外观）中将其关闭（或在 `config.yaml` 中设置 `display.resume_last_session: false`），即每次都以全新聊天开始。无论哪种方式，深链接和显式指定的目标都不会被覆盖。
- **辅助模型警告**——如果你在辅助任务（生成标题、摘要等类似的辅助功能）仍固定使用另一服务商的情况下，将主模型切换到新服务商，应用会发出警告，以免你在不知情的情况下将工作分散到两个服务商上。
- **按任务设置推理强度**——**Settings → Model → Auxiliary models**（设置 → 模型 → 辅助模型）下的每一行，在其服务商/模型选择器旁都有一个推理选择器：一个强度等级、**Off**（关闭），或 **inherit · main model effort**（继承 · 主模型强度，此为默认值，会移除该任务的覆盖设置）。它会以 `auxiliary.<task>.reasoning_effort` 保存在 `config.yaml` 中，与 `hermes model` 写入的键相同，并在设置后显示在该行的摘要中。可用它在低推理或无推理下运行压缩、生成标题等频繁调用的辅助功能，同时让主智能体保持高强度推理。
- **VS Code Marketplace 主题**——除内置的主题预设外，外观设置还包含一个实时的 VS Code Marketplace 搜索：挑选任意颜色主题，应用会将其下载、转换并安装为桌面主题。同样的导入器也可从命令面板（*Install theme*）使用，导入的主题可从外观设置中再次移除。
- **保持电脑唤醒**——**Settings → Advanced → Keep computer awake**（设置 → 高级 → 保持电脑唤醒）可阻止机器休眠，以便长时间或通宵的智能体运行能够持续进行（显示器仍可变暗）。这是一项按电脑设置的选项。

首次运行的入门引导已在统一覆盖层设计系统上重新设计，你可以选择 **Choose provider later**（稍后选择服务商）以跳过服务商设置，先进入应用。

#### 按配置档设置："Applies to" 作用域

当你拥有两个或更多[配置档](./profiles.md)时，由配置驱动的设置页面——**Model、Workspace、Safety、Memory & Context、Voice、Chat、Advanced 与 Tools & Keys**——以及 **Messaging** 覆盖层会在顶部显示一行共享的 **Applies to** 标签。它选定你的编辑所针对的配置档：

- 默认选择为 **跟随当前配置档**，其行为与以往完全一致——编辑你正在使用的配置档。
- 选择其他配置档，即可查看和编辑*它*的设置而无需切换整个应用；该选择在你于各设置页面之间移动时保持不变。
- 切换应用当前配置档会重置该选择器，因此编辑不会悄无声息地继续作用于之前选定的配置档。
- 配置档少于两个时，该标签行会完全隐藏。

（Gateways 页面以不同方式处理配置档——通过其 **Per-profile overrides**（按配置档覆盖）子节——而 Capabilities 与 Scheduled Jobs 视图有自己的作用域选择器。）

### 管理面板

应用还把 Hermes 更广泛的管理界面也呈现了出来，你不必再退回到终端操作：

- **Skills** — 浏览、安装和管理[技能](./features/skills.md)。Skills 选项卡会列出你已安装的技能，并带有启用/禁用开关；下方是随 Hermes 附带的内置可选技能完整目录——每一项都有一个一键 **Install** 按钮，安装完成后该行就会转入已安装列表。
- **Memory graph (Star Map)** — 在聊天中输入 `/journey`（别名 `/learning`、`/memory-graph`），即可打开一个交互式星座图，按时间展示学习到的技能和记忆，并带有回放拖动条。可以直接在面板中编辑或删除节点（技能会被归档，记忆会被移除）。参见[学习旅程](./features/memory.md#learning-journey-journey)。
- **Cron** — 查看和管理[定时任务](../reference/cli-commands.md#hermes-cron)。
- **Profiles** — 在多个 [Hermes 配置档](./profiles.md)（彼此隔离的配置/技能/会话）之间切换。
- **Messaging** — 设置网关渠道。Telegram 有一张 **Quick setup** 卡片：点击 **Create with QR**，在 Telegram 中扫描二维码（或打开链接），Hermes 会创建机器人、检测你的用户 ID 用于允许列表、保存凭据，并替你重启网关。任何凭据的保存、清除或启用开关操作，都会在页面上保留一条 **Restart now** 横幅，直到网关真正完成重启；如果重启失败，横幅会继续保留，以便你重试或手动重启。
- **Agents** 和 **Command Center** — 用于多智能体工作的编排界面。

### Bot Mode（内置）

**Bot Mode** 随应用一起提供，默认开启：一种"每个智能体一个聊天"的花名册，
其中每个 [Hermes 配置档](./profiles.md) 都表现为一个机器人，拥有自己的
头像（几何面孔、上传图片、AI 生成肖像或像素宠物）、自己的规范 **Bot Chat**
会话，以及自己的 **Routines**（由 Hermes 定时任务支持的重发性任务）。花名册位于左侧
边栏，作为你对话旁边的选项卡——一条 **Sessions | Bots** 选项卡
栏——而不是堆叠在会话列表下方的第二个窗格。采用了旧版堆叠
布局的安装会被自动重新归入选项卡栏，仅执行一次；如果你自己手动放置了
窗格，你的布局则保持不变。**Cronjobs**（Routines）窗格仅在
Bots 选项卡处于活动状态时停靠在聊天旁边，切换回
Sessions 时它会消失（较旧的桌面版本会使其始终可见）。

从花名册创建新的智能体——
名称 / 标题 / 描述，外加一个展开的 Advanced 选项，包含完整
能力界面（模型、SOUL、技能、工具集、MCP 服务器）——将它们分组到各个区段，并打开让多个机器人进行
讨论的群聊。群聊在花名册中显示为独立的 Discord 风格行——层叠的
成员头像、成员数量、最新房间消息的预览，以及
"需要你"徽章——与机器人行交错在同样的置顶 + 按最近使用排序中。点击群组
行会将该房间作为选项卡打开，接管
**主聊天窗口**（较旧的桌面版本会退而在
机器人侧边面板内打开）。

机器人会互相发消息：在任意聊天中输入 `@researcher have a look at this`，
当前活动的机器人会把消息转交出去并回报结果，并且机器人之间可以直接访问彼此的
Bot Chat（`hermes -p <bot> chat`）。后端会自动
教会每个机器人规范的 **Bot Chat** 会话这套消息协议
（配置 `agent.bot_mode_protocol`，默认开启）——包括
当队友机器人从 CLI 以无头方式打开它时——因此机器人之间的
回复和交接无需改动你的 SOUL.md 就能工作，你的常规
会话也不受影响。

Bot Mode 的会话——每个机器人的规范 Bot Chat 以及每个群聊
成员会话——始终全局 Sessions 侧边栏中隐藏。它们
存放在 Bots 窗格中（花名册行、房间视图，以及每个机器人的会话
浏览器），而不会与你自己对话交错在一起。
交错在你自己的对话之中。

你不使用的机器人可以收起来：右键点击机器人行 → **Hide
Bot**。被隐藏的机器人会离开花名册但仍继续工作——@提及仍然
可以解析，群聊成员资格也不受影响。只要至少有一个机器人被隐藏，
Bots 标题栏就会出现一个眼睛切换按钮；点击它就能就地显示
（变暗的）隐藏机器人（右键 → **Unhide Bot** 可将其恢复），
当某个隐藏机器人有未读活动时，眼睛上会显示一个圆点。隐藏
状态存储在机器人自身的配置档中，因此会跟随机器人跨
机器保持。

不想要它？在 **Capabilities → Plugins → Bots** 中将其 **Desktop** 开关关闭——花名册、
routines 窗格和 composer 中间件都会实时注销，无需重启。

完整指南——创建智能体（包括多机器 **Create on**
选择器）、跨连接的机器人花名册、机器人之间的提及，以及群聊
如何决定由谁回复：[Bot Mode: A Roster of Agents](./bot-mode.md)。

### 键盘与导航

- **命令面板** — 按 **Cmd+K** 或 **Cmd+P**（Windows/Linux 上为 Ctrl+K / Ctrl+P），即可从键盘跳转到各项操作并导航整个应用：打开任意页面或设置区段、按标题或 id 跳转到某个会话、切换模型/主题/配色模式、启动终端、重启网关、更新 Hermes，等等。
- **可重新绑定的快捷键** — **设置 → 键盘快捷键**（或 **Cmd/Ctrl+/**）会打开快捷键面板，你几乎可以重映射所有绑定 — 配置档切换、会话导航、视图切换，以及任何由桌面插件贡献的快捷键。重复的按键分配会被标记为冲突。有几个值得了解的默认值：**Cmd/Ctrl+N** 新建会话，**Cmd/Ctrl+.** 命令中心，**Cmd/Ctrl+,** 设置，**Cmd/Ctrl+Shift+F** 搜索会话，**Cmd/Ctrl+1–9** 切换配置档，**Shift+X** 切换浅色/深色。
- **自定义缩放快捷键** — 以半步为增量缩放界面，对文字大小进行更精细的控制。
- **界面语言切换器** — 在应用内更改应用的界面语言：英语、简体中文（zh-Hans）、繁体中文（zh-Hant）、日语、阿拉伯语（RTL）和俄语。

### 会话与配置档

- **会话列表重构** — 重新设计的会话列表，支持归档和通用的会话清理功能，让列表在增长时依然易于管理。
- **按 id 搜索会话** — 直接通过 id 找到特定会话。
- **并发多配置档会话** — 同时在多个[配置档](./profiles.md)之间运行会话，并通过跨配置档的 `@session` 链接引用另一个配置档中的会话。
- **导出 / 导入配置档** — 将整套配置作为一个文件分享。**⌘K → 导出配置档…**（或右键点击侧栏中的配置档方块）会写出一个 `.tar.gz` 文件，其中包含技能、记忆、人格、定时任务、插件和设置；API 密钥会被剥离。从桌面端导出时还会打包你的外观与界面 — 皮肤、浅色/深色模式、自定义主题、配置档的侧栏颜色，以及你的窗口布局 — 因此导入的配置档会以发送者当时的样子呈现。通过 **⌘K → 导入配置档…** 或侧栏 **+** 旁的按钮进行导入；它会应用该覆盖层并让你进入新的配置档。同一个归档文件也可用于聊天中的 `/export` / `/import`，以及 shell 中的 `hermes profile export` / `import`。参见[导出和导入配置档文件](./profile-distributions.md#export-and-import-a-profile-file)。

## 更新

应用会在后台检查更新，并在有新版本就绪时提供一键更新。

在本地更新期间，详细的构建输出会流式写入活动配置档的
`logs/update.log`，包括分离式的 `--gateway` 更新。它不会出现在
终端中，但在构建完成前可用于故障排查。Windows 的交接会将
此日志中的新输出计为进度；一个不产生任何输出的子进程仍会受到
空闲看门狗的约束。仅进程存活并不会重置该看门狗，取消更新也不会等待其构建完成。

桌面应用与它所通信的 Hermes 后端按各自的时钟更新 — 应用包在你的机器上，后端则在其运行的位置。当存在多个更新目标时（一个远程网关，或若干个已注册的网关），更新入口（关于面板上的 **立即更新**、⌘K 中的 **更新 Hermes** 行，以及更新就绪提示）会更新**所有内容**：先更新已连接的后端，然后更新每一个其他符合条件的已注册网关（Hermes 云端条目由平台管理，会被跳过），最后更新桌面应用本身，因为应用客户端更新会重新启动应用。单机安装则保留一键更新的体验。

在任何后端更新之后，应用还会重新检查自身版本，如果 GUI 仍然落后，会以一键 **更新桌面应用** 操作发出警告 — 因此更新远程后端绝不会让你在不知不觉中停留在过时的桌面构建上。

[手动更新流程](https://hermes-agent.nousresearch.com/docs/getting-started/updating)同样适用于 GUI。

## 卸载

打开 **设置 → 关于 → 危险区域**，选择要移除的内容量：

- **仅卸载聊天 GUI** — 移除桌面应用及其数据；Hermes 智能体、你的配置和你的聊天记录会保留。（等同于 `hermes uninstall --gui`。）
- **卸载 GUI + 智能体，保留我的数据** — 移除应用和智能体，但保留配置、聊天记录和密钥，以便日后重新安装。（等同于 `hermes uninstall`。）
- **全部卸载** — 移除应用、智能体和所有用户数据。（等同于 `hermes uninstall --full`。）

应用会关闭以完成操作（清理会在其退出后运行，这样它才能移除正在运行的应用包及其自身的 venv）。当未安装本地智能体时（例如仅 GUI 的「lite」客户端连接到远程后端），移除智能体的选项会自动隐藏。

你也可以在终端中做同样的事 — 仅卸载 GUI 用 `hermes uninstall --gui`，连智能体一起卸载用 `hermes uninstall` / `hermes uninstall --full`。

:::note
从**源码检出**（`hermes desktop` 开发构建）运行 `hermes uninstall --gui` 也会移除工作区中的 `node_modules` 以及 `apps/desktop/{dist,release}` 构建产物，因为它们是 GUI 构建产物。它们可以通过 `hermes desktop`（或 `npm install` 加一次重新构建）恢复 — 但如果你正在积极开发桌面应用，请预期之后需要重新安装依赖。
:::

## CLI 参考：`hermes desktop`

要通过 CLI 启动，只需运行 `hermes desktop`。默认情况下，它会安装 workspace 的 Node 依赖，构建当前操作系统未打包的 Electron 应用，然后启动该打包产物。

在 Linux 上，启动会刷新 `$XDG_DATA_HOME/applications/hermes.desktop`（默认为 `~/.local/share/applications/hermes.desktop`），以便 Hermes 出现在应用程序菜单中。若要保留手动编辑过的条目，请禁用刷新：

```bash
hermes config set desktop.manage_launcher_entry false
```

缺失的条目仍会被创建；该标志只是阻止 `hermes desktop` 重写已存在的条目。

| 标志                  | 描述                                                                               |
| -------------------- | ----------------------------------------------------------------------------------------- |
| `--skip-build`       | 跳过 npm install/package，直接启动 `apps/desktop/release` 中已存在的未打包应用 |
| `--force-build`      | 即使内容戳记匹配也强制进行完整重建                                    |
| `--build-only`       | 构建桌面应用但不启动（由 `hermes update` 使用）                      |
| `--source`           | 通过 `electron .` 针对 `apps/desktop/dist` 启动，而不是打包后的应用           |
| `--cwd PATH`         | 桌面聊天会话的初始项目目录（设置 `HERMES_DESKTOP_CWD`）           |
| `--hermes-root PATH` | 覆盖应用所使用的 Hermes 源码根目录（设置 `HERMES_DESKTOP_HERMES_ROOT`）          |
| `--ignore-existing`  | 在后端解析期间强制应用忽略 `PATH` 上任何已有的 `hermes` CLI      |
| `--fake-boot`        | 启用确定性的启动延迟，以验证启动界面                            |

## 工作原理

打包后的应用附带 Electron 外壳和原生 React 聊天界面。首次启动时，它可以将 Hermes Agent 运行时安装到 `HERMES_HOME`（`~/.hermes`，在 Windows 上为 `%LOCALAPPDATA%\hermes`）——**与 CLI 安装使用相同的布局**，这正是两者可以互换的原因。后端解析首先遵循 `HERMES_DESKTOP_HERMES_ROOT`，然后是已完成的管理安装，接着是探测 `PATH` 上的 `hermes`（除非设置了 `--ignore-existing` / `HERMES_DESKTOP_IGNORE_EXISTING=1`），最后是面向 Nix 等打包者的显式 `HERMES_DESKTOP_HERMES` 命令覆盖。React 渲染器与应用为你启动的无头后端通信——一个提供 `tui_gateway` JSON-RPC/WebSocket API 的 `hermes serve` 进程——从而复用智能体运行时，而不是嵌入 `hermes --tui`。桌面应用是**自包含的**：它运行自己的 `hermes serve` 后端，从不打开或需要[网页仪表板](./features/web-dashboard.md)。（早于 `serve` 命令的运行时会自动回退到无头的 `dashboard --no-open`，因此应用更新永远不会超出其后端的能力。）安装、后端解析和自更新逻辑位于 Electron 主进程中。

## 连接到远程后端

默认情况下，应用启动并管理自己的**本地**后端。你也可以将其指向运行在另一台机器上的 Hermes 后端——一台 VPS、家用服务器，或者 Tailscale 后面的 Mac Mini。

所有与连接相关的内容都在同一个设置页面上：**Settings → Gateways**。（较旧的版本将其拆分到单独的 **Gateway** 和 **Connections** 页面——现已统一，旧的 `?tab=connections` 深度链接会重定向到统一页面。）

**Settings → Gateways → Connection mode** 提供了本地网关之外的替代方案：

- **Remote gateway**——输入你自己运行的 `hermes serve` 后端的 URL 并登录。本节其余部分将逐步介绍这种模式。
- **Hermes Cloud**——登录一次 Hermes Cloud，然后从你账户上的智能体中选择；无需粘贴 URL。应用会发现你的智能体（如果你的账户跨越多个组织，则会显示组织选择器），连接到其中一个会自动切换会话。连接激活时，状态栏会显示云连接。

网关连接是**机器级**的：Gateways 页面管理此桌面可以连接到哪些网关后端，而配置档是*从*你连接的网关中发现的。会话一次选择一个网关，而相邻的配置档导轨则选择在该网关上发现的配置档。

### 多连接注册表

在同一个 **Settings → Gateways** 页面下方，**Registered gateways**（已注册网关）管理着一份命名列表，涵盖应用已知的每一个 Hermes 网关——本地运行时、任意数量的远程网关（局域网、Tailscale、互联网）、Hermes Cloud 实例，以及 SSH 主机——全部持久化保存在同一处。你可以通过侧边栏配置档栏最右侧的插头按钮（**Connect another Hermes gateway…**）或 **⌘K → Gateways** 跳转到那里。完整指南（包括智能体联合名册、`@name-device` 句柄、全集群更新以及插件 SDK 接口）见[将 Desktop 连接到多个 Hermes 实例](./multi-connection-desktop.md)。

- **每个连接都需要唯一的名称**（如 "Homelab" 或 "Work laptop" 这样的设备名）。当同一个配置档名存在于多个已注册网关上时，各界面会用 `@profile-device`（例如 `@research-homelab`）来消歧。
- **从 Sessions 侧边栏切换网关。** 当注册了多个网关时，会出现一个命名的网关选择器，它能处理任意规模的注册表，而不会让网关看起来像配置档。旁边的配置档栏则只显示该网关的智能体，并记住上次在那里使用的配置档；庞大的配置档集合会独立折叠。
- **选择重启后打开哪个连接。** **Open on launch** 保持向后兼容的 **Primary gateway** 默认值，也可以在成功连接后恢复 **Last used** 网关。此偏好设置存储在应用包之外，并能在 Desktop 更新后保留。
- **在面板中 添加 / 编辑 / 移除 / 测试** 连接。**Add**（添加）流程提供全部四种类型——**Local**、**Hermes Cloud**、**Remote gateway** 和 **SSH**（当应用托管的本地条目存在时，Local 按钮会被禁用，并有一条提示引导云服务的添加走上面的登录/发现流程）。本地条目由应用管理，无法移除。**Test**（测试）会直接探测该连接自身的 HTTP 和 WebSocket 链路。
- **保存时会拒绝重复项**：**本地**条目有且仅有一个；远程和云条目按规范化 URL（去除首尾空白、去掉末尾斜杠、转为小写——两类共用同一规则）去重；SSH 条目按规范化的 `user@host:port` 加上远程配置档去重。
- 首次运行带注册表的版本时，现有设置会**自动导入**：你当前的全局连接以及任何旧式的每配置档覆盖设置都会变成命名条目。旧版设置文件保持原样不动，因此较早的版本仍可正常工作。
- 云条目来自上面的 Hermes Cloud 登录/发现流程，而非手动输入的 URL。
- 令牌使用操作系统钥匙串加密存储（在无钥匙串的 Linux 上可显式选择明文存储）。

并行路由已生效：每个已注册网关按需拨号连接自己的后端和套接字（以连接 + 配置档为键），插件 SDK 暴露联合智能体名册（`host.agents()` / `host.ensureAgent()`），Gatewayses 页面上的 **Update all instances** 会同时向每个符合条件的网关派发 `hermes update`——Hermes Cloud 条目会被跳过（由其平台负责更新），每个实例各自上报结果。


:::info 远程后端是一个正在运行的 `hermes serve` 进程
"远程后端"指的是运行在远程机器上的 **`hermes serve`** 服务器——Desktop 应用连接的就是这个进程。除非该后端确实已启动且可访问，否则本节内容均无法生效。Desktop 应用不会为你启动它；你需要（或通过 `systemd` 服务）在远程主机上保持 `hermes serve` 运行，应用再接入它。如果你还使用消息渠道（Telegram、Discord 等），**网关**则是一个 *单独的* 长期运行进程，你需要独立启动它——参见设置步骤后的说明。
:::

连接分为两半：在后端，你通过 **认证服务商** 保护它；在应用中，你输入后端 URL 并登录。将后端绑定到非回环地址会自动启用其认证门禁，而你所配置的服务商决定了 Desktop 应用能否通过。

**根据后端所在位置选择服务商：**

- **OAuth（Nous Portal）——适用于任何超出本机范围的连接，首选。** 登录会针对你的 Nous 账户进行验证，因此这是适合 VPS、公网主机或任何远程后端的选项。使用 `hermes dashboard register`（或 Portal 的 [`/local-dashboards`](https://portal.nousresearch.com/local-dashboards) 页面）注册仪表盘以配置其 OAuth 客户端，然后在应用中通过 **Sign in with Nous Research** 登录。如果你运行自己的身份提供商，自托管的 OIDC 服务商也以同样方式工作。
- **用户名/密码——仅供本地 / 可信网络使用。** 当后端位于同一可信局域网，或仅通过 VPN（如 Tailscale）可访问时，这是最简单的选项。它保护单个共享凭证，没有外部身份提供商，因此 **切勿用于暴露在公共互联网上的仪表盘**——那种情况应改用 OAuth。

本节余下部分演示用户名/密码路径，因为它是在可信网络中搭建起来最快的方式；OAuth 路径请参见[Web Dashboard → 默认服务商：Nous Research](./features/web-dashboard.md#default-provider-nous-research)。

### 在后端（远程机器）上

设置用户名和密码，然后启动后端并绑定到可访问的地址。凭据存放于 `~/.hermes/.env`（密钥文件，权限模式 0600）：

```bash
# 1. 设置仪表盘登录凭据。
cat >> ~/.hermes/.env <<'EOF'
HERMES_DASHBOARD_BASIC_AUTH_USERNAME=admin
HERMES_DASHBOARD_BASIC_AUTH_PASSWORD=choose-a-strong-password
# 推荐：设置一个稳定的签名密钥，让会话在重启后依然有效。
# 若不设置，每次启动都会随机生成密钥，重启后你就会被登出。
HERMES_DASHBOARD_BASIC_AUTH_SECRET=$(openssl rand -base64 32)
EOF
chmod 600 ~/.hermes/.env

# 2. 启动后端并绑定到可访问的地址。绑定到非回环地址
#    会启用认证门禁；用户名/密码服务商负责处理登录。
hermes serve --host 0.0.0.0 --port 9119
```

只要你希望桌面应用能够连接，就要保持该 `hermes serve` 进程持续运行 —— 一旦它停止，应用就无法再访问后端。请将其运行在 `systemd`、`tmux` 或你惯用的进程管理器下，以便在注销和重启后仍能存活。

另外，如果你依赖消息渠道，请确保**网关在远程主机上运行** —— `hermes serve` 后端是桌面应用通信的对象，但你的 Telegram/Discord/Slack 网关会话是另一个独立进程，需要你自己单独启动并保活。网关设置请参见 [消息渠道](./messaging/index.md)。

不想在磁盘上保留明文密码？可以改为将 `HERMES_DASHBOARD_BASIC_AUTH_PASSWORD_HASH` 设置为 scrypt 哈希值 —— 用 `python -c "from plugins.dashboard_auth.basic import hash_password; print(hash_password('PW'))"` 计算。完整配置面（config.yaml 键、所有环境变量、速率限制器）：[Web 仪表盘 → 用户名/密码服务商](./features/web-dashboard.md#usernamepassword-provider-no-oauth-idp)。

将后端作为 systemd 服务运行？在该单元中设置 `EnvironmentFile=%h/.hermes/.env`，让凭据在启动时进入环境。

:::warning
后端会读写你的 `.env`（API 密钥、机密）并能运行智能体命令。上述**用户名/密码**方案面向受信任的网络 —— 切勿将受密码保护的后端直接暴露在公网上；请将其置于 VPN 之后。[Tailscale](https://tailscale.com/) 是干净的选择：绑定到该机器的 tailscale IP（`--host <tailscale-ip>`）并使用 `http://<tailscale-ip>:9119` 作为远程 URL，这样只有你的 tailnet 可以访问它。若要经公网访问后端，请改用 **OAuth（Nous Portal）** 服务商。
:::

### 在应用内

**设置 → 网关 → 远程网关：**

1. **远程 URL** —— `http://<backend-host>:9119`（如果前面用反向代理做了前缀，像 `/hermes` 这样的路径前缀也可以）
2. **登录** —— 应用会探测后端所通告的服务商并相应调整按钮。对于用户名/密码后端，会显示一个**登录**按钮，打开凭据表单（输入步骤 1 中的凭据）。对于 OAuth 后端，会显示 **Sign in with `<provider>`**（例如 *Sign in with Nous Research*），它会运行该服务商的浏览器登录。无论哪种方式，应用最终都会与后端建立一个已认证的会话。
3. **保存并重连** —— 将桌面壳切换到远程后端。会话会自动刷新；设置了 `HERMES_DASHBOARD_BASIC_AUTH_SECRET` 时，重启后你仍保持登录状态。

你也可以在启动应用前通过 `HERMES_DESKTOP_REMOTE_URL` 环境变量（无需界面）设置后端 URL（它会覆盖应用内设置）；你仍需从网关设置面板登录。

:::note 按配置档划分的远程主机
远程网关主机按[配置档](./profiles.md)进行配置，因此每个配置档可以指向各自的远程后端（或留在本机后端上）。切换配置档即切换应用所连接的远程主机。
:::

### 故障排除

- **登录失败，返回 401 / "Invalid credentials"** —— 用户名或密码与后端的 `HERMES_DASHBOARD_BASIC_AUTH_USERNAME` / `HERMES_DASHBOARD_BASIC_AUTH_PASSWORD` 不匹配。后端对未知用户和错误密码返回同一通用错误（不提供枚举预言机），因此两者都要仔细核对。用 `curl -s http://<host>:9119/api/status | jq '.auth_required, .auth_providers'` 确认门禁已启用 —— 它应报告 `true` 且包含 `"basic"`。
- **没有"登录"按钮 —— 转而索要会话令牌** —— 后端的用户名/密码服务商未激活。`/api/status` 不会在 `auth_providers` 中列出 `"basic"`。请确保用户名和密码（或密码哈希）都已在 `~/.hermes/.env` 中设置，并且仪表盘进程确实加载了它们。
- **每次重启都被登出** —— 将 `HERMES_DASHBOARD_BASIC_AUTH_SECRET` 设置为一个稳定值。若不设置，令牌签名密钥每次启动都会重新生成，导致所有会话失效。
- **连接被拒绝 / 超时** —— 后端绑定到了 `127.0.0.1`（默认值），或防火墙/VPN 封锁了该端口。请绑定到 `0.0.0.0` 或 tailscale IP，并向受信任的网络开放该端口。

若从 Web 仪表盘视角了解相同设置，请参见 [Web 仪表盘 → 将 Hermes Desktop 连接到远程后端](./features/web-dashboard.md#connecting-hermes-desktop-to-a-remote-backend)；环境变量在 [环境变量 → Web 仪表盘与 Hermes Desktop](../reference/environment-variables.md#web-dashboard--hermes-desktop) 中编目。

## 扩展桌面应用

桌面应用是贡献驱动的 —— 窗格、页面、侧边栏导航、状态栏项、命令面板命令、快捷键绑定和主题都通过同一个 SDK 注册，你也可以添加自己的。插件就是一个放进 `$HERMES_HOME/desktop-plugins/<id>/plugin.js` 的 ESM 文件；应用会在几秒内加载它，并在每次保存时热重载。管理已安装插件请到 **Capabilities → Plugins**。

完整参考见 [Desktop Plugin SDK](../developer-guide/desktop-plugin-sdk.md)。（这与 [web dashboard 插件系统](./features/extending-the-dashboard.md) 是分开的。）

**Capabilities → Plugins** 是一个集中管理所有扩展 Hermes 内容的地方：**每个插件一行**，配有两列开关。

- 一个插件可以扩展 **这个应用**、**智能体** 或 **两者** —— 每行的徽标会标明是哪一种，依据包内包含的内容推断（`plugin.yaml` → 智能体那一半，`plugin.js` → 桌面那一半）。同时包含两半的插件只有一行，绝不会显示为两行。
- **Desktop 列** —— 加载进此应用的那一半。它是应用级的：无论窗口正在查看哪个配置档、网关或远程机器，开关和取值都保持一致。桌面代码只从一个位置加载：`~/.hermes/desktop-plugins/`；当统一的智能体+桌面包被安装时，应用会把该包的桌面那一半复制到那里（并跟随它的更新和卸载），因此切换配置档永远不会加载、卸载窗格或重新划分其作用范围。开关即时生效。
- **Agent 列** —— 安装在所选配置档后端的那一半（[智能体插件](./features/plugins.md)：user、git、project、pip 和便携式安装），当目录固定版本发生移动时会显示一个 **Update** 标记。配置档选择器位于此列的标题处，因为它只管这一列；只有一个配置档时根本不会出现选择器。仓库内捆绑的内置项（平台适配器、服务商插件）不在此列出：它们随装即启用，并在各自对应的界面中配置。
- 插件未附带的那一半会显示一个短横。如果桌面那一半所对应的智能体那一半 **未** 安装在所选配置档中，会显示 **Install here**，它会仅针对该配置档、根据包的来源（目录条目或 git 远程）预填安装对话框。可选附加项（例如 [Accent Picker](https://github.com/NousResearch/hermes-desktop-accent-picker)）通过 **Install from Git** 从它们各自的仓库安装。

发现机制位于下方：实时的 [Plugin Catalog](./features/plugin-catalog.md) 选择器会把已审核的条目安装到所选配置档中的固定提交上，而 **Install from Git** 会让任何其他仓库经过同一个先审核后安装的对话框；其可选的 **Pin to commit** 字段可安装一个确切的 40 字符提交 SHA（包括私有仓库），被固定的插件在列表中会带有 `pinned @ <sha8>` 徽标。旧的 `Settings → Plugins` 链接会重定向到这里。

## 故障排查

### 无需重启应用即可重连

如果 Desktop 聊天或机器人停止响应，而连接仍显示 **Connected**，请选择该机器人/配置档或网关，打开状态栏的网关菜单，然后点击 **Reconnect gateway**。对于已打开、连接中以及已断开的传输，Reconnect 始终可用。它会在不重启 Desktop、也不刻意关闭其他路由套接字的情况下重新拨号当前活动路由。所选套接字上正在进行的请求可能会被中断；这是一项显式的恢复操作，而非后端或模型的重启。

### 失败的轮次会指明失败所在层

当某一轮失败时，聊天会渲染一张错误卡片，指明 **是哪一层失败了** —— 服务商/模型、自定义端点、流式连接、身份认证、计费、网关、本地运行时或磁盘 —— 而不是一句泛泛的错误提示。卡片会提供与失败相匹配的恢复操作：

- **Retry** —— 原地重新运行失败的轮次（当重试会确定性地复现该失败时会隐藏，例如内容策略被拒）。
- **Switch provider** —— 针对服务商、端点、认证和计费失败，跳转到 Settings → Models。
- **Open logs** —— 在文件管理器中打开 `HERMES_HOME/logs`。在远程或 Cloud 连接上，该按钮显示为 **Open Desktop logs**：它会打开本地 Desktop 侧日志（传输层的证据），因为失败轮次的网关/智能体日志位于远程机器上。
- **Send diagnostics** —— 在明确征得同意后，把一份已脱敏的调试包上传到 Nous 内部存储（与 `hermes debug share --nous` 是同一条流水线；密钥始终会脱敏，该包仅对 Nous 员工可见，并在 14 天后自动删除）。成功后你会获得一个私密查看链接，可粘贴到你的支持帖子中，另外还有前往 GitHub Issues、Nous Portal Support 和 Discord 的快捷链接。在远程或 Cloud 连接上，后端会打包它自己的智能体/网关日志，并且本地 Desktop 日志会一并附上，因此支持人员能看到两半的内容。
- **Copy error details** —— 复制一份简洁的纯文本摘要（层、代码、服务商/模型、错误消息），可粘贴到缺陷报告或 Discord 中。

该层信息来自智能体重试循环所用的同一个错误分类器，因此它反映的是真实的失败语义，而不是根据消息文本作出的猜测。早于该描述符的旧版后端仍会以通用标题以及 Retry / Open logs / Copy error details 操作来渲染卡片。

启动日志落于 `HERMES_HOME/logs/desktop.log`（其中包含后端输出和最近的 Python 回溯）—— 如果应用报告启动失败，请先检查它。你也可以从 CLI 中跟踪它：

```bash
hermes logs gui -f
```

常用重置：

```bash
# Force a clean first-launch setup (macOS/Linux)
rm "$HOME/.hermes/hermes-agent/.hermes-bootstrap-complete"

# Rebuild a broken Python venv (macOS/Linux)
rm -rf "$HOME/.hermes/hermes-agent/venv"

# Reset a stuck macOS microphone prompt
tccutil reset Microphone com.nousresearch.hermes
```

### “主机密钥自上次连接后已更改”（SSH 远程）

如果你的 SSH 远程主机被重装，或其主机密钥发生轮换，SSH 会安全失败关闭，Desktop 会锁定并显示错误浮层，而不是重试（在清除过期密钥之前，重试永远不会成功）。确认此变更是预期内的，然后删除旧条目并从浮层重试：

```bash
ssh-keygen -R <host>
```

清除条目后点击 **重试**（或在“设置 → Gateway”中重新应用该连接）——锁存会复位，下次启动时会重新拨号。

### “构建桌面应用”卡在 Electron 下载

该构建会从 `github.com/electron/electron/releases` 下载 Electron 运行时（约 114&nbsp;MB）。如果安装程序在 **构建桌面应用** 步骤挂起，且实时输出反复出现 `retrying attempt=…`，说明你所在网络（防火墙、代理或区域）屏蔽或限速了 GitHub。

安装程序会自动自愈：构建失败时它（1）清除损坏的 Electron 缓存 zip 并重试，然后（2）如果仍然失败且你未设置 `ELECTRON_MIRROR`，会再通过 `npmmirror.com`（事实上的 Electron 社区镜像）重试一次。`@electron/get` 会对下载做 SHASUM 校验，但校验和来自同一镜像——这能捕获损坏或不完整的下载，但无法发现被篡改的镜像。如果你不愿信任第三方主机，可自行指定 `ELECTRON_MIRROR`（见下文）；构建绝不会覆盖你已设置的镜像。

要**选择你自己的镜像**（例如公司/受信任的镜像），在安装前设置 `ELECTRON_MIRROR`，或手动重新构建——构建会遵循它，且不会覆盖：

```bash
ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/ \
  bash -c 'cd "$HOME/.hermes/hermes-agent/apps/desktop" && CSC_IDENTITY_AUTO_DISCOVERY=false npm run pack'
```

**其他需要镜像的原生下载（例如 Windows 上的 `get-windows` 预构建包）：** 将 npm 键放入 `$HERMES_HOME/npmrc`（Windows 上是 `%LOCALAPPDATA%\hermes\npmrc`，其他平台是 `~/.hermes/npmrc`）——例如 `node_get_windows_binary_host_mirror=https://<mirror>/sindresorhus/get-windows/releases/download/`。更新器启动的每次 `npm ci`/`npm run`（desktop、web 和 TUI 构建）在该文件存在时，会将 `NPM_CONFIG_USERCONFIG` 指向它，因此该配置能在 `hermes update` 后保留；仓库根目录的 `.npmrc` 受 git 跟踪，每次更新都会被自动贮藏，而 `~/.npmrc` 可能会被遗漏，因为 desktop 交接继承了 GUI 的环境。你自行设置的 `NPM_CONFIG_USERCONFIG` 绝不会被覆盖。

手动清除损坏的缓存 zip：

```bash
rm -f "$HOME/Library/Caches/electron"/electron-*.zip   # macOS
rm -f "$HOME/.cache/electron"/electron-*.zip            # Linux
```

## 从源码构建

如果你想修改应用本身，先从仓库根目录安装 workspace 依赖一次，然后从 `apps/desktop` 运行开发服务器：

```bash
npm install          # from repo root — links apps/desktop, web, apps/shared
cd apps/desktop
npm run dev          # Vite renderer + Electron, which boots the Python backend
```

将应用指向某个特定检出，或将其从你的真实配置中隔离到沙箱：

```bash
HERMES_DESKTOP_HERMES_ROOT=/path/to/clone npm run dev
HERMES_HOME=/tmp/throwaway npm run dev
npm run dev:fake-boot   # exercise the startup overlay with deterministic delays
```

构建安装程序：

```bash
npm run dist:mac     # DMG + zip
npm run dist:win     # NSIS + MSI
npm run dist:linux   # AppImage + deb + rpm
npm run pack         # unpacked app under release/ (no installer)
```

当环境中存在相关凭据时（macOS 需要 `CSC_LINK` / `CSC_KEY_PASSWORD` / `APPLE_*`，Windows 需要 `WIN_CSC_*`），macOS/Windows 的签名和公证会自动运行。

### macOS 权限与本地重建（TCC）

**用一个开关消除所有文件夹提示。** macOS 会在 Hermes 访问每个文件夹时按类别逐一提示（先是桌面，然后是下载，再是文稿……）。单独授予一次 **完全磁盘访问权限** 即可永久覆盖所有类别——并且凭借 Hermes 稳定的签名身份，它能在每次更新后继续有效：

1. 系统设置 → **隐私与安全性 → 完全磁盘访问权限**（或运行
   `open "x-apple.systempreferences:com.apple.preference.security?Privacy_AllFiles"`）
2. 启用你的终端应用——若使用 Desktop，还需启用 **Hermes.app**。
3. 将它们完全退出并重新启动一次。

`hermes doctor` 会报告当前终端上下文是否已获得该授权，`hermes setup` 会在 macOS 上未获得授权时显示此提示。

macOS 记住权限授予（完全磁盘访问、桌面/下载/文稿、辅助功能、自动化、麦克风）是针对应用的*代码签名身份*，而不是其路径。本地构建和自更新的应用使用稳定的、固定标识符的 ad-hoc 签名，因此授权在更新后依然保留。

一次性说明：在固定标识符签名修复（PR #73681）*之前*的构建上所做的授权，携带的是旧的基于 cdhash 固定的要求。对于这些过期授权，macOS 仍会显示开关为 ON，但依然会重新提示，因为存储的授权不再匹配重建后的二进制文件——而现代提示没有“允许”按钮，所以看起来似乎没有什么需要重新勾选。如果出现这种情况，重置一次过期授权并重新授予：

```bash
tccutil reset ScreenCapture com.nousresearch.hermes   # repeat per service
```

然后在系统设置中将新条目开关打开，并完全退出并重新启动 Hermes。从那时起授权就稳定了。

若要获得最强保证——证书锚定的身份，即 yabai/skhd 用户所依赖的同一机制——创建一次自签名代码签名证书，并告诉 Hermes 使用它。这条一次性命令会完成一切（在你的登录钥匙串中创建证书、授予 `codesign` 访问权限、写入配置，并重新签署打包后的应用）：

```bash
hermes desktop --setup-tcc-identity
```

或手动操作：

1. 钥匙串访问 → 证书助理 → **创建证书…**
2. 名称：`Hermes Local Signing`，身份类型：*自签名根证书*，
   证书类型：**代码签名**。
3. 在钥匙串访问中，双击新证书 → **信任** → 将
   **代码签名** 设为 *始终信任*（导入的自签名证书在对代码签名受信任之前不是有效的签名身份——
   之后 `security find-identity -v -p codesigning` 应将其列出）。
4. `hermes config set desktop.macos_signing_identity "Hermes Local Signing"`

在此命令中配合 `--identity <name>` 可创建/使用不同名称的证书（默认：`Hermes Local Signing`）。该命令是幂等的——更新后重新运行它即可重新指向配置并重新签署重建后的应用。

下次更新会用该证书重新签署重建后的应用；所有 TCC 授权都会保留。无需 Apple Developer 账户。已公证的发行版构建会被检测到，且绝不会被重新签署。

一次性说明：更改签名身份（包括此修复后的首次更新）会一次性更改应用的身份，因此 macOS 会最后再提示一次。从那时起授权就稳定了。如果某个权限卡住，用 `tccutil reset All com.nousresearch.hermes` 重置它并重新授予。

## 另请参阅

- [CLI 指南](./cli.md) — 终端界面
- [TUI](./tui.md) — `hermes --tui` 和仪表盘聊天标签页所使用的现代终端 UI
- [Web 仪表盘](./features/web-dashboard.md) — 带有内嵌聊天标签页的浏览器管理面板
- [配置](./configuration.md) — 桌面应用读取和写入的配置
- [Windows（原生）](./windows-native.md) — 原生 Windows 安装路径
