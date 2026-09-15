---
sidebar_position: 3
title: "Hermes Desktop"
description: "原生 Hermes 桌面应用——与 Hermes 对话的精致体验，包含流式工具输出、并排预览、文件浏览器、语音、定时任务、配置档、技能和设置。支持 macOS、Windows 和 Linux。"
---

# Hermes Desktop

Hermes 桌面应用是一款原生应用，它围绕与你从 CLI 和网关获得的**相同**智能体构建——相同的配置、相同的 API 密钥、相同的会话、相同的技能、相同的记忆。它不是独立的产品，也不是轻量级克隆；它使用相同的 Hermes Agent 内核和设置，并通过现代且精心设计的 UI 来驱动它。如果你在终端中使用过 `hermes`，那么你在那里设置的一切这里都已经有了，而你在这里做的任何事情也会显示在那里。

它运行在 **macOS（Apple Silicon）、Windows 和 Linux** 上——完整支持矩阵请参见[平台支持](../getting-started/platform-support.md)。

:::tip 哪个界面是哪个？
Hermes 有几个前端，它们都与同一个智能体通信：

- **桌面应用**（本页）——一款原生应用，拥有专为聊天、配置和管理打造的 UI。
- **CLI**（`hermes`）和 **[TUI](./tui.md)**（`hermes --tui`）——终端界面。
- **[Web 仪表盘](./features/web-dashboard.md)**（`hermes dashboard`）——浏览器管理面板；其可选的 **Chat** 标签页通过伪终端嵌入 TUI。

选择适合当下场景的那个即可。它们共享状态，因此你可以在一个界面中开始会话，然后在另一个界面中恢复它。
:::

## 安装

从 [Hermes Desktop 产品页面](https://hermes-agent.nousresearch.com/desktop)下载应用，或按照 [Hermes Desktop 安装说明](../getting-started/installation.md)进行操作。

如果你已经安装了 Hermes，只需运行

```bash
hermes desktop
```

这会使用你当前的配置、密钥、会话和技能。

## 应用中的功能

桌面应用以聊天为中心的窗口呈现，左侧边栏用于导航。它的构建目标是支持管理多个同时进行的智能体会话、配置消息服务商、创建产物、浏览项目的文件夹结构，以及同时处理多个项目。

侧边栏的选择状态会跟随当前聚焦的聊天窗格。打开或聚焦某个会话标签页会清除页面的高亮状态，包括 Kanban 等贡献页面，即使工作区仍保留该页面的路由也是如此。

### 聊天

应用的核心。你将获得：

- **流式响应**，在智能体工作时实时展示工具活动和结构化的工具调用摘要。
- **Markdown 换行**遵循 Markdown 语义：两个尾随空格创建硬换行；普通换行保持为软换行。媒体和预览提取会保留被移除附件片段之外的文本，包括首行代码缩进和未完成的围栏代码块间距。代码显示和复制会保留 Markdown 解析器产生的开头空行、尾随空格和终端空行。
- **与其他所有 Hermes 界面相同的对话历史**——在这里开始的会话可以在 CLI/TUI 中恢复，反之亦然。
- **拖放文件**到聊天区域的任意位置，即可将其附加到你的下一条消息。
- **独立的后台草稿**——隐藏的聊天标签页可以更新其草稿，而不会移动可见编辑区中的光标或选区。
- **指令胶囊操作**——悬停在可操作的引用上（例如 URL）即可显示其操作胶囊。短暂宽限期让你可以从指令移动到胶囊而不致其消失。在胶囊内部移动时它会保持可用；离开后，无关的指针移动不会延迟其消失。点击其操作会保留草稿选区。
- **右侧预览栏**——在你继续聊天的同时，并排渲染网页、文件和工具输出。
- **应用内浏览器中的评论模式**——在预览浏览器栏中点击 **Annotate**，然后在实时页面上点击任意元素（或拖拽出一个框）并输入备注；每条保存的评论都会作为编号图钉留在页面上。保存图钉永远不会发送轮次——当你完成后，**Add N comments** 会为每个图钉附加一张裁剪截图和一段列出每条评论的简短提示到编辑区，最后仍由你自己按下发送。每条元素评论都会携带其 CSS 选择器、其标记结构以及对布局至关重要的计算样式，这样智能体就能在你的源码中找到该元素，而不必仅凭图片猜测。密码和隐藏字段的值，以及任何看起来像密钥或令牌的属性，都会在标记结构离开页面之前被脱敏处理。较大的批次会按每条评论所在页面的位置分组，这样二十多条评论就变成几块工作，而不是每条评论一个任务——而且由于这些分组是独立的 DOM 子树，它们通常会触及不同的文件，这正是可以安全地把它们交给并行工作者的原因。删除某条评论后，图钉编号保持不变，切换聊天会清空整个堆栈。
- **编辑区历史和队列编辑**——在空编辑区按上/下方向键即可调出并复用之前的提示，并在发送前编辑你已排队的消息。当有轮次排队时，按 Stop（或 Esc）会暂停队列并在编辑区上方展开它；你可以从这里恢复队列，或发送、编辑、删除单个条目。
- **编辑区上方的任务进度**——展开 Tasks 标题即可检查每个阶段。长列表在输入框上方保持有界；在展开列表中滚动即可查看最后的任务，而无需移动整个对话。
- **对话时间轴栏**——长聊天会在转录边缘显示一条细长的标记栏，每个提示对应一个标记。悬停它会弹出提示列表，点击其中一个即可直接跳转到对话中的相应位置。（当聊天有若干轮次后它就会出现。）
- **阅读位置记忆**——返回到某个会话时会恢复其保存的距底部距离，而不是总是跳转到最新消息。留在底部的会话会继续跟随新输出。使用 **Scroll to bottom** 返回到实时边缘。位置保存在本 Desktop 安装的本地存储中；它们不会通过后端同步。
- **页面内查找**——按 **Cmd/Ctrl+F** 打开查找栏，在当前渲染的聊天转录中搜索。Enter / Shift+Enter（或在查找栏打开时按 Cmd/Ctrl+G / Cmd/Ctrl+Shift+G）逐个跳转匹配项；Esc 关闭。

异步定时任务和委托完成会以折叠的时间轴披露形式出现。打开完成标签即可将结果正文（包括任务输出）以 Markdown 形式阅读；长报告会在该披露区域内滚动。任务指令和投递信封不会作为报告内容显示。

#### 状态栏

聊天窗口底部的状态栏显示实时会话状态，并提供快捷控制项，无需打开设置：

- **按会话的 YOLO 开关** — 仅针对当前会话开启或关闭 YOLO（与 TUI 保持一致）。YOLO 会绕过危险命令的审批提示，因此请务必了解你在关闭什么 — 参见[安全 → YOLO 模式](./security.md#yolo-mode)。
- **上下文用量计** — 实时显示会话上下文窗口的“已用百分比”。点击它会打开 **Context Usage** 弹窗，按类别（系统提示、工具定义、技能、记忆、规则、MCP、子智能体定义以及对话本身）展示 token 明细，让你在压缩启动之前就看清究竟是什么在占用窗口。
- **缓存命中率与每秒 token 数** — 默认关闭；可从右键菜单开启。缓存命中率是本会话 prompt token 中由服务商 prompt 缓存提供的那部分占比（缓存 token 成本更低，所以越高越省钱 — 你可以眼看着一个会话随着缓存预热而变得越来越便宜）。每秒 token 数是最近 10 次模型调用的平均输出吞吐量。两者都会在回合进行中实时更新。
- **可自定义项** — 右键点击状态栏（**Show in status bar**）可选择显示哪些内容：上下文计量表、缓存命中率、每秒 token 数、工作区、模型、审批、回合/会话计时器、终端、Command Center、后端版本等等 — 也可以完全隐藏状态栏（**Cmd/Ctrl+Shift+S** 可切换显示）。

如果你连接的是另一台机器上的 Hermes 实例，而不是内置的本地后端？参见下方的[连接到远程后端](#connecting-to-a-remote-backend) — 关于远程托管仪表盘连接的完整机制（认证关卡、`/api/ws` 聊天 socket 以及 WebSocket 关闭码排查），参见 [Web Dashboard → 将 Hermes Desktop 连接到远程后端](./features/web-dashboard.md#connecting-hermes-desktop-to-a-remote-backend)。

#### 字体

**Settings → Appearance** 中有两个独立的字体设置，均按配置档存储在 `config.yaml` 中：

- **Chat Font** (`desktop.font_family`) — 聊天以及应用其余 UI。OpenDyslexic 或 Atkinson Hyperlegible 等易读字型在系统安装后即可使用；当前主题的字体栈会作为你的选择之后的回退，因此缺失字形仍能正常渲染。留空表示使用主题字体。
- **Terminal Font** (`terminal.font_family`) — 内嵌终端面板；Nerd Fonts 会在这里渲染 shell 图标。留空表示使用内置的 JetBrains Mono。

#### 仓库发现

Hermes Desktop 通过以有限深度扫描你的主目录，来为 Projects 侧边栏发现本地 Git 仓库。你可以在 **Settings → Workspace** 中按配置档修改此行为，或在 `config.yaml` 中修改：

```yaml
desktop:
  repo_scan_enabled: true
  repo_scan_roots: []
  repo_scan_exclude_paths: []
```

- 将 `repo_scan_enabled: false` 设为此项可以完全停止文件系统扫描。该配置档现有的磁盘发现缓存行会被清除；显式项目以及从有意的 Hermes 会话中推断出的仓库仍然可用。
- 将 `repo_scan_roots` 设置为一组文件夹路径以限制扫描范围。空列表保留默认的主目录扫描。
- 将 `repo_scan_exclude_paths` 设置为需要跳过整个子树的文件夹。

修改其中任何值都只会使该配置档的磁盘发现缓存失效，并启动一次符合策略的刷新。**Hide from sidebar** 仍然是独立的按项整理操作。

#### 选择模型

模型选择器位于**输入框**中，就在麦克风左边。点击它可切换模型；将鼠标悬停在模型行上可查看其选项（thinking、effort、fast）。它旁边的**推理药丸**会显示当前模型的 effort 级别（`Med`、`High` 等），并直接打开相同的选项，因此你无需找到模型的所在行即可更改 effort。对于目录中报告不提供推理控制的模型，该药丸会隐藏。

- **输入框选择器是粘性 UI 状态，绝不会改动你的默认值。** 它在本地按设备记忆，并且会**跟随**你跨新聊天和重启，而不是跳回默认值 — 选一次模型，下一个 `Cmd/Ctrl+N` 就会以它打开。在实时聊天中切换模型时，更改范围仅限于该**当前聊天**；无论如何，该选择都会在会话创建/切换时随之生效，并且**绝不会**写入配置档默认值 — 唯一的例外是：在一个尚未配置 `model.default`/`model.provider` 的全新配置档上，首次选择会被持久化，以便应用有一个真正的默认值，而不会在重启时回落到某个杂散的 API-key 环境变量。持久化遵循与 `/model` 相同的规则（`model.persist_switch_by_default`）；若要有意更改默认值，请使用 **Settings → Model**。（切换[配置档](#sessions--profiles)时，会重新播种为该配置档自身的默认值。）
- **在 Settings → Model 中设置默认值。** 那个“主”模型是你的**按配置档的全局默认值** — 新聊天、定时任务、子智能体和辅助任务都从它开始，并且它是唯一写入默认值的地方。每个[配置档](#sessions--profiles)都保留自己的默认值。
- **按模型的 effort/fast 预设。** 每个模型会在桌面应用中记住自身的推理 effort 和 fast 模式选择，每当你选择该模型时都会重新应用到会话。这些预设是桌面端的便利功能，不会改变定时任务或子智能体。
- **聊天中途切换会重置 prompt 缓存。** 在实时聊天中切换模型意味着下一条消息会按完整输入价格重新读取整个对话（服务商的 prompt 缓存以模型为键）。偶尔为之无妨；在长聊天中，在新模型上开一个新聊天往往比来回切换更便宜。

### 文件浏览器

无需离开应用即可浏览和预览工作目录——在智能体读取、写入和编辑文件时，便于你同步跟进。可以使用 `hermes desktop --cwd <path>`（或 `HERMES_DESKTOP_CWD` 环境变量）设置初始项目目录。

### 制品

当连接到远程网关时，打开文件制品会通过该网关下载，使用该制品来源的配置档和会话。相对路径会相对于会话保存的工作目录解析；以 home 开头的相对路径使用网关的 home 目录，绝不使用 Desktop 机器的 home 目录。Windows 风格的相对路径与正斜杠路径同样被识别，文件 URI 会保留驱动器与网络共享信息，交由网关解释。会话或工作目录缺失时会产生错误，而不是选择其他本地文件。

**制品**视图将会话生成的内容——**图片、文件和链接**——汇集到一个可搜索、可浏览的画廊中。可从侧边栏、命令面板（**制品——浏览生成的输出**）或你自行绑定的 `nav.artifacts` 快捷键打开。它会自动索引近期的会话输出；每个制品都会显示其来源会话，并可跳回该聊天，图片和文件会在预览中打开，并提供下载 / 在浏览器中打开 / 复制操作。

### 窗口、标签页与窗格

该应用为同时处理多项任务而构建：

- **标签页**——**Cmd/Ctrl+T** 打开新的会话标签页；**Ctrl+Tab** / **Ctrl+Shift+Tab** 在会话间循环切换，**Ctrl+1…9** 按位置跳转到近期会话。**Cmd/Ctrl+W** 关闭当前聚焦的标签页，**Cmd/Ctrl+Shift+T** 重新打开最近关闭的标签页。
- **多窗口**——**Cmd/Ctrl+Shift+N** 打开新窗口，任何会话都可通过其上下文菜单（**新建窗口**）或从命令面板弹出。弹出的窗口只渲染单个聊天，不含全局侧边栏——便于将长时间运行的会话停放在另一台显示器上。实时的智能体输出会流式传输到显示该会话的每个窗口。
- **窗格**——**Cmd/Ctrl+B** 切换左侧边栏，**Cmd/Ctrl+J** 切换右侧边栏，**Cmd/Ctrl+\\** 交换侧边栏所在的一侧。

### 终端

真正的终端位于右侧边栏，紧邻文件浏览器：

- **Ctrl+`** 显示终端（若无终端则打开一个）；**Ctrl+Shift+`** 新增一个终端。多个终端会在标签栏中堆叠——**Ctrl+Shift+↓/↑** 在它们之间切换，**Ctrl+Shift+W** 关闭当前活动的终端。
- **隐藏时 shell 保持存活。** 关闭或隐藏面板不会终止你的 shell——每个打开的终端都会保持挂载，其滚动缓冲区与运行中的进程完好无损，直到你显式关闭它。
- **添加到聊天**——选中终端输出并将其作为下一条消息的上下文发送到输入框。

### 实时子智能体

当被委派的工作者处于活动状态时，输入框上方会出现一个**子智能体**框架，显示其数量、任务名称、已用时间和最新活动。它最多预览三个工作者；展开标题可查看完整名单，然后选择某个工作者查看详情以及**引导** / **停止**控件。每个框架属于其所属聊天，分屏窗格中也是如此。引导操作表示该指导已排队等待某个检查点，而并非子智能体已读取该指导。请参阅[监控子智能体](/user-guide/features/delegation#monitoring-running-subagents-agents)。

### Git 审查与工作树

对于在 Git 仓库内运行的会话，应用内置了源代码管理界面：

- **审查窗格**——**Cmd/Ctrl+G** 切换工作树审查窗格：显示分支及领先/落后状态、已更改文件（列表或树状视图），以及范围限定为**未提交**、**分支**或**上一轮**（仅智能体在最近一轮中更改的内容）的差异。可暂存/取消暂存文件、还原更改、编写提交信息（或**生成提交信息**），然后**提交**或**提交并推送**——还可通过 GitHub CLI（`gh`）**创建 PR**，或用**让 Hermes 打开 PR** 将整件事交给智能体处理。你也可以在此处创建和切换分支。
- **工作树**——**Cmd/Ctrl+Shift+B**（或侧边栏项目中某项的**新建工作树**）会在新分支上创建 Git 工作树，使智能体可以在仓库的并行副本上工作，而不会影响你的检出。工作树会作为项目下各自的通道显示；删除某个工作树时，可选择删除工作树目录（分支保留）或仅隐藏该通道并将其留在磁盘上，当存在未提交更改时还提供强制选项。

### 记忆图谱

**记忆图谱**（命令面板 → *Memory Graph*，或状态栏项）是一张交互式的地图，展示了 Hermes 为你学到的东西 —— 技能和记忆以可缩放的节点图形式呈现，配有时间线，可按 **全部 / 已使用 / 已学习** 筛选。分享控件可将地图布局导出为一段紧凑的代码，你可以粘贴给别人（只是布局 —— 不包含你的任何记忆或技能文本），也可以通过同样的方式导入代码。

### 快速输入

快速输入是一个随时可用的小型输入框，可通过 **系统中的全局热键** 在任何地方唤起 —— 无需切换到（甚至无需打开）主窗口即可发起提示。在 **设置 → 高级 → 快速输入** 中启用；默认快捷键为 **Ctrl/Cmd+Shift+Space**，你也可以自定义（至少需要一个修饰键）。如果该组合键已被其他应用占用，设置行会提示你，以便你换一个。

### 语音

与 Hermes 对话并听到它的回应，与其他地方提供的同一个 [语音模式](./features/voice-mode.md) 一致。在 macOS 上，系统会提示一次以获取麦克风访问权限。

### HUD 模式

**⌘/Ctrl+Shift+H**（或标题栏按钮）会将聊天从主窗口中分离出来，变成一个无边框、始终置顶的浮动栏，悬浮在你正在处理的任何内容之上。应用窗口退到一旁；HUD 保留你的实时对话和一个输入框。你停放它的位置就是上下文 —— 浮动栏的位置会告诉 Hermes 你在询问哪个应用和屏幕，因此「这个」「这里」和「那个页面」会解析为其下方的内容。

- **移动浮动栏** —— 在 macOS 和 Windows 上，在输入框的任意位置**按住**片刻，然后拖动。在 Linux/X11 上，按住 **Ctrl** 并用鼠标主键拖动即可立即抓取（包括在选中文本之上）；按住方式同样可用。在调用桌面切换快捷键时保持抓取不放，即可将 HUD 带到另一个虚拟桌面。在原生 Wayland 上，输入栏本身就是合成器的拖动句柄（这是移动它的唯一方式，因为应用无法自行摆放自己的窗口）。
- **调整大小** —— 拖动浮动栏的任意边缘或角；对侧边缘保持锚定。原生 Wayland 只暴露右边和下边，因为合成器不允许应用自行定位顶层窗口。
- **重置布局** —— 浮动栏上的舍弃控件会恢复默认大小，并在 X11 / macOS / Windows 上恢复默认位置。如果持久化的尺寸导致 HUD 无法使用，请用此选项。
- **对齐指针** —— **⌘/Ctrl+Shift+G**（全局热键，可从任何应用中使用）会将 HUD 跳转到光标所在位置。在原生 Wayland 上此操作无效 —— 位置由合成器掌管。
- **退出** —— 点击浮动栏上的退出按钮、再次按 **⌘/Ctrl+Shift+H**，或在 HUD 获得焦点时按 **⌘/Ctrl+W**。应用窗口会带着你的会话回到前台，光标位于其输入框中。

#### Linux / Wayland

Electron 20+ 在 Wayland 会话上已经作为原生 Wayland 客户端运行。在该路径下，拖动、点击穿透和调整大小均可正常工作。

在 **Hyprland**（包括 Omarchy）上，HUD 在映射后会通过合成器的 IPC 被浮动并固定 —— 否则 Hyprland 会像对待其他窗口一样将其平铺，`always-on-top` 被忽略，合成器拖动也不起作用。无需额外的窗口规则。

少数合成器（尤其是 COSMIC）会忽略原生 Wayland 窗口的 `always-on-top`。要在那里恢复固定，请在 XWayland 下运行应用：

```yaml
desktop:
  ozone_platform_hint: x11
```

这会在启动时桥接到 `ELECTRON_OZONE_PLATFORM_HINT`（显式设置的环境变量仍然优先）。代价是：X11 无法恢复已忽略鼠标的窗口，因此 HUD 会保持为实心窗口而非点击穿透。某些 KDE 环境在使用 X11 ozone 后端时还会报告键盘问题 —— 除非你需要始终置顶，否则请将提示保持为 `auto`。

#### WSLg（从 WSL2 使用 Windows GPU）

当 `hermes gui` 在 WSL2 中运行，且存在 `/dev/dxg` 并安装了 Mesa 的 `d3d12_dri.so` 时，启动器会为 Electron 设置 `GALLIUM_DRIVER=d3d12`，以便使用 Windows GPU 进行渲染，而非 llvmpipe 软件光栅化器；你环境中显式设置的 `GALLIUM_DRIVER`、`MESA_LOADER_DRIVER_OVERRIDE`、`LIBGL_ALWAYS_SOFTWARE` 或 `LIBGL_DRIVERS_PATH` 则保持不变（例如 `GALLIUM_DRIVER=llvmpipe hermes gui` 会保留软件渲染）。

### 设置与引导

通过真正的 UI 管理服务商、模型、工具和凭据，无需手动编辑 YAML。首次运行的引导流程能让你在几秒内发出第一条消息。各设置面板涵盖服务商/密钥、模型选择、工具集配置、MCP 服务器、网关和会话管理。

- **服务商设置面板** —— 专门用于管理推理服务商，提供 Accounts / API-keys 交互界面，用于登录并按服务商存储凭据。账户与 API 密钥共享设置中的 **Applies to**（适用于）选择：凭据的读取与编辑、OAuth 账户移除，以及在此发起的登录，都作用于所选配置档，而非当前聊天的配置档。登录流程会在凭据保存和模型选择过程中保持该目标。更改 **Applies to** 会丢弃未保存的凭据草稿。关闭登录会取消轮询并忽略迟到的结果；已发出的凭据写入仍可能在原配置档中完成。外部管理的 CLI 凭据使用各自的 CLI，不受此配置档选择器影响。其 **Local Models** 视图会安装并管理设备本地的 llama.cpp 运行时——详见 [本地模型](/user-guide/local-models)。
- **菜单中包含所有服务商和模型** —— GUI 展示完整的服务商列表，以及 `hermes model` 所知晓的每一个模型，因此你可以从 CLI 所见的同一份目录中选择，而非经过筛选的子集。
- **xAI Grok OAuth** —— Grok 在启动器里是一等 OAuth 服务商；与其他 OAuth 服务商一样，通过浏览器流程登录。
- **从 GUI 安装工具后端** —— 直接在应用中运行工具后端的安装后步骤，无需切换到终端。
- **终端字体选择器** —— 在 **Settings → Appearance** 中选择已安装的字体。诸如 `MesloLGS NF` 等 Nerd Fonts 可在交互式终端和智能体终端中渲染 Powerlevel10k 分隔符和图标；该设置按配置档保存。
- **启动时重新打开上次对话** —— 默认情况下，应用冷启动后会从你上次中断的地方继续。可在 **Settings → Appearance** 中关闭（或在 `config.yaml` 中设置 `display.resume_last_session: false`），以始终从新对话开始。无论哪种情况，深度链接和显式目标都不会被覆盖。
- **辅助模型警告** —— 如果你将主模型切换到新的服务商，而辅助任务（标题生成、摘要等辅助功能）仍固定于另一个服务商，应用会发出警告，避免你在不知情的情况下将工作分散到两个服务商。
- **按任务的推理强度** —— **Settings → Model → Auxiliary models** 下的每一行，在其服务商/模型选择器旁都有一个推理选择器：一个级别、**Off**，或 **inherit · main model effort**（默认值，会移除该任务的覆盖设置）。它以 `auxiliary.<task>.reasoning_effort` 保存在 `config.yaml` 中，与 `hermes model` 写入的是同一个键，设置后会在该行的摘要中显示。你可以用它让压缩或标题生成等高频辅助任务以低推理或无推理运行，而主智能体保持高推理。
- **VS Code Marketplace 主题** —— 除内置主题预设外，外观设置还包含一个实时的 VS Code Marketplace 搜索：选择任意配色主题，应用便会下载、转换并安装为桌面主题。命令面板中也有相同的导入功能（*Install theme*），导入的主题可再次从外观设置中移除。
- **保持计算机唤醒** —— **Settings → Advanced → Keep computer awake** 可阻止机器休眠，让长时间或整夜的智能体运行持续进行（显示器仍可调暗）。这是逐计算机设置。

首次运行的引导流程已基于统一覆盖层设计系统重新设计，你可以选择 **Choose provider later**（稍后选择服务商）以跳过服务商设置，先进入应用。

#### 按配置档设置：“Applies to” 作用域

当你有两个或更多[配置档](./profiles.md)时，由 config 支持的设置页面——**Model、Workspace、Safety、Memory & Context、Voice、Chat、Advanced 和 Tools & Keys**——以及 **Messaging** 覆盖层，会在顶部显示共享的 **Applies to** 芯片行。它用于选择编辑所针对的配置档：

- 默认选择**跟随当前活动配置档**，行为与以往完全一致——即编辑你正在使用的配置档。
- 选择其他配置档即可查看并编辑*其*设置，而无需切换整个应用；在设置页面之间移动时该选择会保持。
- 切换应用的活动配置档会重置该选择器，因此编辑不会悄悄继续作用于之前选中的配置档。
- 当配置档少于两个时，该芯片行完全隐藏。

（Gateways 页面以不同方式处理配置档——通过其 **Per-profile overrides** 子节——而 Capabilities 和 Scheduled Jobs 视图有各自的作用域选择器。）

### 管理面板

应用还开放了更广泛的 Hermes 管理界面，你不必再退回到终端：

- **Skills** — 浏览、安装与管理[技能](./features/skills.md)。Skills 标签页会列出你已安装的技能，带启用/禁用开关；下方则是 Hermes 内置的可选技能完整目录——每一项都有一个一键 **安装** 按钮，安装完成后该行会切换到已安装列表。
- **记忆图谱(星图)** — 在聊天中输入 `/journey`（别名 `/learning`、`/memory-graph`）即可打开一个交互式星座图，以时间维度展示学习到的技能与记忆，并配有回放滑块。可直接在面板中编辑或删除节点（技能会被归档，记忆会被移除）。参见[学习之旅](./features/memory.md#learning-journey-journey)。
- **定时任务** — 查看与管理[已调度任务](../reference/cli-commands.md#hermes-cron)。
- **配置档** — 在多个 [Hermes 配置档](./profiles.md)（彼此隔离的配置/技能/会话）之间切换。
- **消息** — 设置网关渠道。Telegram 有一个 **快速设置** 卡片：点击 **使用二维码创建**，用 Telegram 扫描二维码（或打开链接），Hermes 便会创建机器人、检测你的用户 ID 以加入允许列表、保存凭证，并为你重启网关。任何凭证的保存、清除或启用开关操作后，页面都会保留一条 **立即重启** 横幅，直到网关真正完成重启；如果重启失败，横幅会保留，方便你重试或手动重启。
- **智能体** 与 **指挥中心** — 用于多智能体协作的编排界面。

### Bot Mode（内置）

**Bot Mode** 随应用一同提供，且默认开启：“每个智能体一个聊天”的名册，
其中每个 [Hermes 配置档](./profiles.md) 都表现为一个拥有自己头像的
机器人（几何面孔、上传的图片、AI 生成的头像或像素宠物）、自己规范的
**Bot Chat** 会话，以及自己的 **例程**（由 Hermes 定时任务支撑的重复性
任务）。该名册位于左侧边栏中、与你对话列表并排的一个标签页——即
**Sessions | Bots** 标签条——而不是堆叠在会话列表下方的第二块面板。
采用了旧式堆叠布局的安装会自动（且仅一次）迁移到标签条中；如果你自己
手动摆放了面板，则不会改动你的布局。**Cronjobs**（例程）面板只在
Bots 标签处于活动状态时停靠在聊天旁边，切回 Sessions 时便隐藏
（较旧的桌面版构建会始终显示它）。

从名册创建新的智能体——
名称/头衔/描述，外加一个包含完整能力界面的高级折叠项（模型、
SOUL、技能、工具集、MCP 服务器）——将它们分组成各个分区，并打开多名
机器人参与讨论的群聊。群聊在名册中表现为独立的 Discord 风格行——
堆叠的成员头像、成员数量、最新房间消息的预览，以及“需要你”徽章——
与机器人行一起按相同的置顶+最近使用顺序交错排列。点击群聊行会将该
房间作为标签页打开，并接管**主聊天窗口**（较旧的桌面版构建会回退为在
机器人侧边面板中打开）。

机器人之间会互相发消息：在任何聊天中输入 `@researcher have a look at this`，
当前活跃的机器人便会将消息转交并回报，机器人之间也能直接访问彼此的
Bot Chat（`hermes -p <bot> chat`）。后端会自动向每个机器人规范的
**Bot Chat** 会话传授这套消息协议（配置 `agent.bot_mode_protocol`，
默认开启）——包括由同伴机器人在 CLI 中无头地打开它的情况——因此
机器人之间的回复与转交无需改动你的 SOUL.md，你的常规会话也保持
原样不受影响。

Bot Mode 的会话——每个机器人规范的 Bot Chat 以及每个群聊成员
会话——始终从全局 Sessions 侧边栏中隐藏。它们改而位于 Bots 面板
中（名册行、房间视图，以及每个机器人的会话浏览器），不会与你自己的
对话混杂在一起。

你不需要的机器人可以收起来：右键点击某个机器人行 → **隐藏
机器人**。被隐藏的机器人会离开名册但仍在工作——@提及依然会被处理，
群聊成员身份不受影响。只要至少有一个机器人被隐藏，Bots 标题栏中就会
出现一个眼睛开关；点击它可将隐藏的机器人就地淡显（右键 → **取消隐藏
机器人** 可将其中某个恢复），当隐藏的机器人有未读活动时，眼睛上会显示
一个圆点。隐藏状态存储在该机器人的配置档中，因此会随机器人在各台设备
间同步。

不想用它？在 **能力 → 插件 → Bots** 中将其 **桌面** 开关关闭——
名册、例程面板与输入框中间件会即时注销，无需重启。

完整指南——创建智能体（包括多机的 **创建于** 选择器）、跨连接的
名册、机器人之间的提及，以及群聊如何决定由谁回复：[Bot Mode:
智能体名册](./bot-mode.md)。

### 键盘与导航

- **命令面板** —— 按 **Cmd+K** 或 **Cmd+P**（在 Windows/Linux 上为 Ctrl+K / Ctrl+P）可直接跳转到操作项并通过键盘导航应用：打开任意页面或设置分区、按标题或 id 跳转到会话、切换模型/主题/颜色模式、创建终端、重启网关、更新 Hermes 等。
- **可重新绑定的快捷键** —— **设置 → 键盘快捷键**（或 **Cmd/Ctrl+/**）可打开快捷键面板，你可以在其中重新映射几乎所有的按键绑定 —— 配置档切换、会话导航、视图切换，以及桌面插件提供的任意快捷键。重复的分配会被标记为冲突。几个值得了解的默认值：**Cmd/Ctrl+N** 新建会话，**Cmd/Ctrl+.** 命令中心，**Cmd/Ctrl+,** 设置，**Cmd/Ctrl+Shift+F** 搜索会话，**Cmd/Ctrl+1–9** 切换配置档，**Shift+X** 切换浅色/深色模式。
- **自定义缩放快捷键** —— 以半步为增量缩放界面，对文字大小进行更精细的控制。
- **界面语言切换器** —— 在应用内更改界面语言：英语、简体中文（zh-Hans）、繁体中文（zh-Hant）、日语、阿拉伯语（RTL）和俄语。

### 会话与配置档

- **会话列表重构** —— 重新设计的会话列表，新增归档功能以及常规的会话整理机制，随列表增长仍保持可管理状态。
- **按 id 搜索会话** —— 直接通过 id 查找特定会话。
- **并发多配置档会话** —— 同时跨多个[配置档](./profiles.md)运行会话，并通过跨配置档 `@session` 链接引用另一个配置档中的会话。
- **导出 / 导入配置档** —— 将整套设置以单个文件分享。**⌘K → 导出配置档…**（或右键点击侧栏中的配置档方块）会写出一个包含技能、记忆、人设、定时任务、插件和设置的 `.tar.gz` 文件；API 密钥会被剔除。从桌面端导出时还会打包你的外观与界面 —— 皮肤、浅色/深色模式、自定义主题、配置档的侧栏颜色，以及你的窗口布局 —— 因此导入的配置档抵达时就与发送者的样貌一致。通过 **⌘K → 导入配置档…** 或侧栏 **+** 旁边的按钮进行导入；它会应用这套覆盖并让你直接进入新的配置档。同一个归档文件也可用于聊天中的 `/export` / `/import`，以及 shell 中的 `hermes profile export` / `import`。参见[导出和导入配置档文件](./profile-distributions.md#export-and-import-a-profile-file)。

## 更新

应用会在后台检查更新，并在有更新就绪时提供一键更新。

在本地更新期间，详细的构建输出会流入当前配置档的
`logs/update.log`，包括分离的 `--gateway` 更新。这些输出不会显示在
终端中，但在构建完成前可用于排查故障。Windows 的交接过程会将该日志中
新增的输出计为进度；即使子进程没有产生任何输出，仍受空闲看门狗的约束。仅凭进程存活
不会重置该看门狗，取消更新也不会等待其构建完成。

桌面应用与其所通信的 Hermes 后端按各自的节奏更新 —— 应用包在你的机器上，
后端则运行在其所在之处。当存在多个更新目标时（远程网关，或若干个已注册的
网关），更新入口（关于面板上的**立即更新**、⌘K 的**更新 Hermes** 项，以及
更新就绪的提示）会更新**所有内容**：先是连接的后端，然后是每一个其他符合条件的
已注册网关（Hermes Cloud 条目由平台管理，会被跳过），最后是桌面应用本身，
因为应用客户端更新会重启应用。单机安装则保持一键体验。

任何后端更新之后，应用还会再次检查自身版本，如果 GUI 仍然落后，会通过一键的
**更新桌面应用**操作发出警告 —— 因此更新远程后端绝不会静默地让你停留在过时的
桌面构建上。

[手动更新流程](https://hermes-agent.nousresearch.com/docs/getting-started/updating)同样适用于 GUI。

## 卸载

打开**设置 → 关于 → 危险区域**，选择要移除的范围：

- **仅卸载聊天 GUI** —— 移除桌面应用及其数据；Hermes 智能体、你的配置和聊天记录都保留。（等同于 `hermes uninstall --gui`。）
- **卸载 GUI + 智能体，保留我的数据** —— 移除应用和智能体，但保留配置、聊天记录和密钥以备将来重新安装。（等同于 `hermes uninstall`。）
- **全部卸载** —— 移除应用、智能体以及所有用户数据。（等同于 `hermes uninstall --full`。）

应用会先关闭再完成任务（清理在退出后运行，以便移除正在运行的应用包及其自己的 venv）。当没有安装本地智能体时（例如连接到远程后端的纯 GUI「lite」客户端），移除智能体的选项会被自动隐藏。

你也可以在终端中做同样的事 —— `hermes uninstall --gui` 仅卸载 GUI，或 `hermes uninstall` / `hermes uninstall --full` 连同智能体一起卸载。

:::note
从**源码检出**（一个 `hermes desktop` 开发构建）运行 `hermes uninstall --gui`
还会移除工作区的 `node_modules` 以及 `apps/desktop/{dist,release}` 构建输出，
因为它们属于 GUI 构建产物。它们可以通过 `hermes desktop`（或 `npm install` + 重新构建）
恢复 —— 但如果你正在积极地折腾桌面应用，请做好之后重装依赖的准备。
:::

## CLI 参考：`hermes desktop`

要通过 CLI 启动，只需运行 `hermes desktop`。默认情况下，它会安装工作区的 Node 依赖，构建当前操作系统的解包 Electron 应用，然后启动该打包产物。

在 Linux 上，启动会刷新 `$XDG_DATA_HOME/applications/hermes.desktop`（默认为 `~/.local/share/applications/hermes.desktop`），以便 Hermes 出现在应用程序菜单中。要保留手动编辑过的条目，请禁用刷新：

```bash
hermes config set desktop.manage_launcher_entry false
```

缺失的条目仍会被创建；该标志仅阻止 `hermes desktop` 重写已存在的条目。

| 标志                 | 描述                                                                               |
| -------------------- | ----------------------------------------------------------------------------------------- |
| `--skip-build`       | 跳过 npm install/package，直接从 `apps/desktop/release` 启动现有的解包应用 |
| `--force-build`      | 即使内容戳匹配也强制完整重建                                    |
| `--build-only`       | 构建桌面应用但不启动它（由 `hermes update` 使用）                      |
| `--source`           | 通过 `electron .` 针对 `apps/desktop/dist` 启动，而不是打包应用           |
| `--cwd PATH`         | 桌面聊天会话的初始项目目录（设置 `HERMES_DESKTOP_CWD`）           |
| `--hermes-root PATH` | 覆盖应用使用的 Hermes 源码根目录（设置 `HERMES_DESKTOP_HERMES_ROOT`）          |
| `--ignore-existing`  | 在后端解析期间强制应用忽略 `PATH` 上已有的任何 `hermes` CLI      |
| `--fake-boot`        | 启用确定性启动延迟以验证启动 UI                            |

## 工作原理

打包应用附带 Electron 外壳和原生 React 聊天界面。首次启动时，它可以将 Hermes Agent 运行时安装到 `HERMES_HOME`（`~/.hermes`，Windows 上为 `%LOCALAPPDATA%\hermes`）——**与 CLI 安装使用的布局相同**，因此两者可以互换。后端解析首先遵循 `HERMES_DESKTOP_HERMES_ROOT`，然后是已完成的管理安装，再是探测 `PATH` 上的 `hermes`（除非设置了 `--ignore-existing` / `HERMES_DESKTOP_IGNORE_EXISTING=1`），最后是供 Nix 等打包者使用的显式 `HERMES_DESKTOP_HERMES` 命令覆盖。React 渲染进程与应用为你启动的无头后端通信——一个提供 `tui_gateway` JSON-RPC/WebSocket API 的 `hermes serve` 进程——并复用智能体运行时，而不是嵌入 `hermes --tui`。桌面应用是**自包含的**：它运行自己的 `hermes serve` 后端，并且从不打开或依赖[Web 仪表盘](./features/web-dashboard.md)。（早于 `serve` 命令的运行时会自动回退到无头的 `dashboard --no-open`，因此应用更新永远不会超出其后端的能力。) 安装、后端解析和自更新逻辑位于 Electron 主进程中。

## 连接到远程后端

默认情况下，应用启动并管理自己的**本地**后端。你也可以将其指向运行在另一台机器上的 Hermes 后端——VPS、家庭服务器，或位于 Tailscale 后面的 Mini。

所有与连接相关的内容都在一个设置页面上：**Settings → Gateways**。（较早的版本将此分散在单独的 **Gateway** 和 **Connections** 页面——现在已统一，旧的 `?tab=connections` 深度链接会重定向到统一页面。)

**Settings → Gateways → Connection mode** 提供了本地网关之外的替代方案：

- **Remote gateway** — 输入你自己运行的 `hermes serve` 后端的 URL 并登录。这是本节其余部分将要讲解的模式。
- **Hermes Cloud** — 只需登录一次 Hermes Cloud，然后从你账户上的智能体中选择；无需粘贴 URL。应用会发现你的智能体（如果你账户跨多个组织，会显示组织选择器），连接到其中一个会自动切换会话。连接处于活动状态时，状态栏会显示云连接。

网关连接是**机器级别的**：Gateways 页面管理此桌面可以连接到哪些网关后端，而配置档则是*从*你连接的网关中发现。会话一次选择一个网关，而相邻的配置档栏选择在该网关上发现的配置档。

### 多连接注册表

还是同一个 **设置 → 网关** 页面，再往下是 **已注册的网关**，它以命名列表的形式管理应用已知的每一个 Hermes 网关——本地运行时、任意数量的远程网关（LAN、Tailscale、公网）、Hermes Cloud 实例，以及 SSH 主机——全部集中持久化在一处。你可以从侧边栏配置档栏最右侧的插头按钮（**连接另一个 Hermes 网关…**）跳转过去，也可以通过 **⌘K → 网关** 进入。完整指南（包含合并智能体名录、`@名称-设备` 句柄、全舰队范围更新以及插件 SDK 接口面）见[将 Desktop 连接到多个 Hermes 实例](./multi-connection-desktop.md)。

- **每个连接都需要一个唯一的名称**（比如“Homelab”或“工作笔记本”这样的设备名）。当同一个配置档名存在于多个已注册网关上时，各个界面会将其消歧为 `@配置档-设备`（例如 `@research-homelab`）。
- **在会话侧边栏中切换网关**。当注册了多个网关时，会出现一个带名称的网关选择器，它可以处理任意规模的注册表，而不会让网关看起来像配置档。旁边的配置档栏随后只显示该网关下的智能体，并记住那里上次使用的配置档；配置档很多时会各自独立折叠收纳。
- **选择重启后打开什么**。**启动时打开** 保持向后兼容的 **主网关** 默认值，也可以在 **上次使用** 的网关成功连接后恢复它。该偏好项存储在应用程序包之外，Desktop 更新后依然保留。
- 在面板中 **添加 / 编辑 / 移除 / 测试** 连接。**添加** 流程提供全部四种类型——**本地**、**Hermes Cloud**、**远程网关** 和 **SSH**（当应用托管的本地条目存在时，本地按钮会被禁用，并有一条提示将云端添加指向上述的登录/发现流程）。本地条目由应用托管，无法移除。**测试** 会直接探测该连接自己的 HTTP 和 WebSocket 两段链路。
- **重复条目在保存时会被拒绝**：始终只有一个 **本地** 条目；远程和云端条目按规范化后的 URL 去重（去除首尾空白、去掉结尾斜杠、转为小写——跨这两种类型）；SSH 条目按规范化后的 `user@host:port` 加上远程配置档去重。
- 首次运行带注册表的构建时，现有设置会 **自动导入**：你当前的全局连接以及任何旧版的按配置档覆盖项都会变成命名条目。旧版设置文件保持不动，因此更早的构建仍可正常工作。
- 云端条目来自上述的 Hermes Cloud 登录/发现流程，而不是手动输入的 URL。
- Token 使用操作系统密钥环加密存储（在无密钥环的 Linux 上可选择显式启用明文存储）。

并排路由已经可用：每个已注册的网关按需拨号连接自己的后端与套接字（按连接 + 配置档分别建立），插件 SDK 对外暴露合并的智能体名录（`host.agents()` / `host.ensureAgent()`），而网关页面上的 **更新所有实例** 会一次性向每个符合条件的网关派发 `hermes update`——Hermes Cloud 条目会被跳过（由平台负责更新它们），每个实例各自上报自己的结果。


:::info 远程后端是一个正在运行的 `hermes serve` 进程
“远程后端”指的是在远程机器上运行的 **`hermes serve`** 服务——Desktop 应用连接的就是这个进程。除非该后端确实已启动且可访问，本节内容否则一律无效。Desktop 应用不会替你启动它；你需要（或由一个 `systemd` 服务）让 `hermes serve` 在远程主机上持续运行，应用再连接到它。如果你还使用消息渠道（Telegram、Discord 等），**网关** 是一个你独立启动的 *单独* 长期运行进程——参见设置步骤之后的说明。
:::

连接分为两半：在后端，你用 **认证服务商** 保护它；在应用中，你输入后端 URL 并登录。将后端绑定到非回环地址会自动启用其认证大门，而你所配置的服务商正是让 Desktop 应用得以通过的关键。

**根据后端所在位置选择服务商：**

- **OAuth（Nous Portal）——只要你自己的机器之外能访问到它，就首选这个。** 登录会针对你的 Nous 账号进行验证，因此这个选项适用于 VPS、公网主机或任何远程后端。使用 `hermes dashboard register`（或 Portal 的 [`/local-dashboards`](https://portal.nousresearch.com/local-dashboards) 页面）注册仪表盘以预置其 OAuth 客户端，然后在应用中使用 **使用 Nous Research 登录** 进行登录。如果你运行自己的身份服务商，自托管的 OIDC 服务商运作方式相同。
- **用户名/密码——仅用于本地 / 可信网络。** 当后端位于同一可信 LAN 或仅可通过 VPN（例如 Tailscale）访问时，这是最简单的选项。它保护单个共享凭据而无需外部身份服务商，因此 **不要将其用于暴露在公网的仪表盘**——那种情况请改用 OAuth。

本节接下来展示的是用户名/密码路径，因为它是在可信网络上最快搭建起来的方式；OAuth 路径参见 [Web Dashboard → 默认服务商：Nous Research](./features/web-dashboard.md#default-provider-nous-research)。

### 在后端（远程机器）上

设置用户名和密码，然后将后端绑定到一个可达地址上启动。凭据存放在 `~/.hermes/.env`（密钥文件，权限模式 0600）：

```bash
# 1. Set the dashboard login credentials.
cat >> ~/.hermes/.env <<'EOF'
HERMES_DASHBOARD_BASIC_AUTH_USERNAME=admin
HERMES_DASHBOARD_BASIC_AUTH_PASSWORD=choose-a-strong-password
# Recommended: a stable signing secret so sessions survive restarts.
# Without it a random key is generated per boot and you'll be logged out
# on every restart.
HERMES_DASHBOARD_BASIC_AUTH_SECRET=$(openssl rand -base64 32)
EOF
chmod 600 ~/.hermes/.env

# 2. Run the backend bound to a reachable address. The non-loopback bind
#    engages the auth gate; the username/password provider handles login.
hermes serve --host 0.0.0.0 --port 9119
```

只要你还希望桌面应用能够连接，就请让那个 `hermes serve` 进程一直运行——如果它停止了，应用就无法再访问后端。请将其运行在 `systemd`、`tmux` 或你惯用的进程管理器之下，使其能经受注销和重启。

另外，如果你依赖消息渠道，请确保远程主机上 **网关正在运行**——`hermes serve` 后端是桌面应用与之通信的对象，但你的 Telegram/Discord/Slack 网关会话是另一个独立进程，需要你自行启动并保持运行。网关配置请参见[消息](./messaging/index.md)。

不想在磁盘上存储明文密码？可以将 `HERMES_DASHBOARD_BASIC_AUTH_PASSWORD_HASH` 设置为 scrypt 哈希——用 `python -c "from plugins.dashboard_auth.basic import hash_password; print(hash_password('PW'))"` 来计算它。完整的配置面（config.yaml 键、每个环境变量、速率限制器）：[Web 仪表盘 → 用户名/密码服务商](./features/web-dashboard.md#usernamepassword-provider-no-oauth-idp)。

将后端作为 systemd 服务运行？在 unit 中加入 `EnvironmentFile=%h/.hermes/.env`，让凭据在启动时进入环境。

:::warning
后端会读写你的 `.env`（API 密钥、机密），并且可以运行智能体命令。上文所示的 **用户名/密码** 设置适用于受信任网络——绝不要将受密码保护的后端直接暴露在开放的互联网上；请将其置于 VPN 之后。[Tailscale](https://tailscale.com/) 是简洁的选择：绑定到该机器的 tailscale IP（`--host <tailscale-ip>`），并使用 `http://<tailscale-ip>:9119` 作为远程 URL，这样只有你的 tailnet 能访问它。要通过公共互联网访问后端，请改用 **OAuth（Nous Portal）** 服务商。
:::

### 在应用中

**Settings → Gateways → Remote gateway：**

1. **Remote URL** — `http://<backend-host>:9119`（如果用反向代理做前置，路径前缀如 `/hermes` 也可以正常工作）
2. **Sign in** — 应用会检测后端通告的是哪个服务商，并相应调整按钮。对于用户名/密码后端，它会显示一个 **Sign in** 按钮，打开凭据表单（输入步骤 1 中的凭据）。对于 OAuth 后端，它会显示 **Sign in with `<provider>`**（例如 *Sign in with Nous Research*），运行该服务商的浏览器登录流程。无论哪种方式，应用最终都会与后端建立一个已认证的会话。
3. **保存并重新连接** — 将桌面 shell 切换到远程后端。会话会自动刷新；当设置了 `HERMES_DASHBOARD_BASIC_AUTH_SECRET` 时，重启后你仍保持登录状态。

你也可以在启动应用前通过 `HERMES_DESKTOP_REMOTE_URL` 环境变量设置后端 URL，而不使用 UI（它会覆盖应用内设置）；你仍需在 Gateways 设置面板中登录。

:::note 按配置档设置远程主机
远程网关主机是按[配置档](./profiles.md)配置的，因此每个配置档都可以指向各自的远程后端（或保持使用其本地后端）。切换配置档会切换应用所连接的远程主机。
:::

### 故障排查

- **登录失败，返回 401 / “Invalid credentials”** — 用户名或密码与后端的 `HERMES_DASHBOARD_BASIC_AUTH_USERNAME` / `HERMES_DASHBOARD_BASIC_AUTH_PASSWORD` 不匹配。后端对未知用户和错误密码返回相同的通用错误（无枚举预言机），因此请仔细核对两者。用 `curl -s http://<host>:9119/api/status | jq '.auth_required, .auth_providers'` 确认门禁已开启——它应报告 `true` 并包含 `"basic"`。
- **没有 “Sign in” 按钮——它反而要求输入会话令牌** — 后端的用户名/密码服务商未激活。`/api/status` 的 `auth_providers` 中不会列出 `"basic"`。确保 `~/.hermes/.env` 中同时设置了用户名和密码（或密码哈希），并且 dashboard 进程确实加载了它们。
- **每次重启都被登出** — 将 `HERMES_DASHBOARD_BASIC_AUTH_SECRET` 设置为一个稳定值。没有它，令牌签名密钥每次启动都会重新生成，从而使所有会话失效。
- **连接被拒绝 / 超时** — 后端绑定到了 `127.0.0.1`（默认值），或者防火墙/VPN 屏蔽了该端口。请绑定到 `0.0.0.0` 或 tailscale IP，并向你的受信任网络开放该端口。

需要从 Web 仪表盘视角了解相同的设置，请参见 [Web 仪表盘 → 将 Hermes Desktop 连接到远程后端](./features/web-dashboard.md#connecting-hermes-desktop-to-a-remote-backend)；这些环境变量收录于[环境变量 → Web 仪表盘与 Hermes Desktop](../reference/environment-variables.md#web-dashboard--hermes-desktop)。

## 扩展桌面应用

桌面应用由社区贡献驱动 —— 窗格、页面、侧边栏导航、状态栏项、命令面板命令、快捷键和主题都通过同一个 SDK 注册，你也能添加自己的。插件就是一个放进 `$HERMES_HOME/desktop-plugins/<id>/plugin.js` 的单个 ESM 文件；应用会在几秒内加载它，并在每次保存时热重载。在 **Capabilities → Plugins** 中实时管理已安装的插件。

完整参考见 [Desktop Plugin SDK](../developer-guide/desktop-plugin-sdk.md)。（这不同于 [web dashboard 插件系统](./features/extending-the-dashboard.md)。）

**Capabilities → Plugins** 是所有扩展 Hermes 之物的统一入口：**每个插件一行**，带两列开关。

- 一个插件可以扩展**本应用**、**智能体**或**两者** —— 每行上的徽章会注明是哪种，依据包内容推断（`plugin.yaml` → 智能体那半，`plugin.js` → 桌面那半）。同时含有两半的插件是一行，绝不拆成两行。
- **Desktop 列** —— 加载进本应用的那半。它是应用级的：无论窗口连接的是哪个配置档、网关或远程机器，都是同一个开关、同一个值。桌面代码只从一个位置加载，即 `~/.hermes/desktop-plugins/`；当一个智能体+桌面统一包被安装时，应用会将其桌面部分复制到那里（并随其更新和卸载变动），所以切换配置档永远不会加载、卸载或重新作用域化某个窗格。切换即时生效。
- **Agent 列** —— 安装在所选配置档后端的那半（[智能体插件](./features/plugins.md)：用户级、git、项目级、pip 和便携式安装），当目录锁定的版本变动时会显示 **Update** 标记。配置档选择器位于这一列的表头，因为它只管辖这一列；只有一个配置档时则完全没有选择器。仓库内置项（平台适配器、服务商插件）不在此列出：它们随应用默认启用，并从各自的界面进行配置。
- 插件未提供的某一半会显示短横线。若某插件的桌面部分有，而其中智能体部分**未**安装在所选配置档中，则显示 **Install here**，它会依据包的来源（目录条目或 git 远程）为该配置档预填安装对话框。诸如 [Accent Picker](https://github.com/NousResearch/hermes-desktop-accent-picker) 这类的可选附加组件通过 **Install from Git** 从各自的仓库安装。

发现机制置于其下：实时的 [Plugin Catalog](./features/plugin-catalog.md) 选择器会把已审核的条目按锁定的提交安装到所选配置档，而 **Install from Git** 通过同一个先审核后安装的对话框接收任何其他仓库；它可选的 **Pin to commit** 字段可安装一个确切的 40 字符提交 SHA（含私有仓库），被固定的插件在列表中带有 `pinned @ <sha8>` 徽章。旧的 `Settings → Plugins` 链接会重定向到这里。

## 故障排查

### 无需重启应用即可重连

如果某个 Desktop 聊天或 bot 在连接仍显示 **Connected** 时停止响应，请选择该 bot/配置档或网关，打开状态栏的网关菜单，然后点击 **Reconnect gateway**。对于打开中、连接中和已断开传输，Reconnect 始终可用。它会为活跃路由重新拨号，而无需重启 Desktop 或刻意关闭其他路由的套接字。所选套接字上的进行中请求可能会被中断；这是一项显式恢复操作，不是后端或模型重启。

### 失败的回合会指明出错的层

当某回合失败时，聊天会渲染一张错误卡片，指明**哪一层失败** —— 服务商/模型、自定义端点、流式连接、身份验证、计费、网关、本地运行时或磁盘 —— 而非通用的错误提示。卡片会提供与失败相匹配的恢复操作：

- **Retry** —— 原地重跑失败的回合（当重试会确定性地重现该失败时会隐藏，例如内容策略拒绝）。
- **Switch provider** —— 跳转到 Settings → Models，针对服务商、端点、身份验证和计费失败。
- **Open logs** —— 在你的文件管理器中打开 `HERMES_HOME/logs`。在远程或 Cloud 连接上按钮显示为 **Open Desktop logs**：它打开本地的 Desktop 端日志（传输证据），因为失败回合的网关/智能体日志位于远程机器上。
- **Send diagnostics** —— 在明确的同意提示后把经过脱敏的调试包上传到 Nous 内部存储（与 `hermes debug share --nous` 同一管道；机密始终脱敏，该包仅 Nous 工作人员可见并在 14 天后自动删除）。成功后你会得到一个私密查看链接，可粘贴到你的支持帖中，另有 GitHub Issues、Nous Portal Support 和 Discord 的快捷链接。在远程或 Cloud 连接上，后端会打包其自己的智能体/网关日志，并附带本地 Desktop 日志，从而支持方能看到两半。
- **Copy error details** —— 复制一份简明的纯文本摘要（层、代码、服务商/模型、错误消息），可粘贴到 bug 报告或 Discord 中。

该层来自智能体重试循环所用的同一错误分类器，因此它反映真实的失败语义，而非根据消息文本猜测。早于该描述符的旧后端仍会渲染卡片，但使用通用标题及 Retry / Open logs / Copy error details 操作。

启动日志落在 `HERMES_HOME/logs/desktop.log`（其中包含后端输出和近期 Python traceback）—— 如果应用报告启动失败，请先检查它。你也可以从 CLI 中实时跟踪：

```bash
hermes logs gui -f
```

常见重置操作：

```bash
# Force a clean first-launch setup (macOS/Linux)
rm "$HOME/.hermes/hermes-agent/.hermes-bootstrap-complete"

# Rebuild a broken Python venv (macOS/Linux)
rm -rf "$HOME/.hermes/hermes-agent/venv"

# Reset a stuck macOS microphone prompt
tccutil reset Microphone com.nousresearch.hermes
```

### “The host key has CHANGED since you last connected”（SSH 远程）

如果你的 SSH 远程主机被重装或其主机密钥已轮换，SSH 会以失败关闭（fail closed），Desktop 会锁定一个错误覆盖层而不是重试（在清除过期密钥之前，重试永远不可能成功）。确认该变更是预期内的，然后移除旧条目并从覆盖层重试：

```bash
ssh-keygen -R <host>
```

清除条目后点击 **Retry**（或在 Settings → Gateway 中重新应用连接）——锁存会重置，下一次启动会重新拨号。

### “Build desktop app” 卡在 Electron 下载

构建会从 `github.com/electron/electron/releases` 下载 Electron 运行时（约 114&nbsp;MB）。如果安装程序卡在 **Build desktop app** 步骤，实时输出反复出现 `retrying attempt=…`，说明你的网络（防火墙、代理或所在地区）屏蔽或限速了 GitHub。

安装程序会自动自愈：构建失败时，它 (1) 清除损坏的缓存 Electron zip 并重试，然后 (2) 如果仍然失败且你未设置 `ELECTRON_MIRROR`，则再通过 `npmmirror.com`（事实上的 Electron 社区镜像）重试一次。`@electron/get` 会对下载进行 SHASUM 校验，但校验和来自同一个镜像——这能捕获损坏或不完整的下载，却无法捕获被篡改的镜像。如果你不愿信任第三方主机，可以自行固定 `ELECTRON_MIRROR`（见下文）；构建永远不会覆盖你已设置的镜像。

要**选择你自己的镜像**（例如公司/可信镜像），在安装前设置 `ELECTRON_MIRROR` 或手动重新构建——构建会遵循该设置且不会覆盖它：

```bash
ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/ \
  bash -c 'cd "$HOME/.hermes/hermes-agent/apps/desktop" && CSC_IDENTITY_AUTO_DISCOVERY=false npm run pack'
```

**其他需要镜像的原生下载（例如 Windows 上的 `get-windows` 预编译包）：** 把 npm 键放入 `$HERMES_HOME/npmrc`（Windows 上是 `%LOCALAPPDATA%\hermes\npmrc`，其他平台是 `~/.hermes/npmrc`）——例如 `node_get_windows_binary_host_mirror=https://<mirror>/sindresorhus/get-windows/releases/download/`。更新程序启动的每个 `npm ci`/`npm run`（桌面、Web 和 TUI 构建）在该文件存在时会将其 `NPM_CONFIG_USERCONFIG` 指向它，因此该配置在 `hermes update` 后仍然保留；仓库根目录的 `.npmrc` 受 git 跟踪，每次更新都会自动暂存（autostash），而 `~/.npmrc` 可能会被遗漏，因为桌面的交接继承的是 GUI 的环境。你自己设置的 `NPM_CONFIG_USERCONFIG` 永远不会被覆盖。

手动清除损坏的缓存 zip：

```bash
rm -f "$HOME/Library/Caches/electron"/electron-*.zip   # macOS
rm -f "$HOME/.cache/electron"/electron-*.zip            # Linux
```

## 从源码构建

如果你想改动应用本身，先从仓库根目录安装一次工作区依赖，然后从 `apps/desktop` 运行开发服务器：

```bash
npm install          # from repo root — links apps/desktop, web, apps/shared
cd apps/desktop
npm run dev          # Vite renderer + Electron, which boots the Python backend
```

让应用指向特定的检出目录，或将其与真实配置隔离到沙箱：

```bash
HERMES_DESKTOP_HERMES_ROOT=/path/to/clone npm run dev
HERMES_HOME=/tmp/throwaway npm run dev
npm run dev:fake-boot   # exercise the startup overlay with deterministic delays
```

构建安装包：

```bash
npm run dist:mac     # DMG + zip
npm run dist:win     # NSIS + MSI
npm run dist:linux   # AppImage + deb + rpm
npm run pack         # unpacked app under release/ (no installer)
```

当环境中存在相关凭据时（macOS 用 `CSC_LINK` / `CSC_KEY_PASSWORD` / `APPLE_*`，Windows 用 `WIN_CSC_*`），macOS/Windows 的签名与公证会自动运行。

### macOS 权限与本地重新构建（TCC）

**用一个开关静默所有文件夹提示。** 当 Hermes 访问每个文件夹时，macOS 会按类别弹出提示（先桌面，再下载，再文稿……）。授予一次 **完全磁盘访问权限（Full Disk Access）** 即可永久覆盖所有这些类别——凭借 Hermes 稳定的签名身份，它还能在每次更新后依然有效：

1. 系统设置 → **隐私与安全性 → 完全磁盘访问权限**（或运行
   `open "x-apple.systempreferences:com.apple.preference.security?Privacy_AllFiles"`）
2. 启用你的终端应用——如果你使用 Desktop，还要启用 **Hermes.app**。
3. 将它们完全退出并各重新启动一次。

`hermes doctor` 会报告当前终端上下文是否已获得该授权，`hermes setup` 在 macOS 上未获得时会显示此提示。

macOS 依据应用的*代码签名身份*而非其路径来记忆权限授权（完全磁盘访问、桌面/下载/文稿、辅助功能、自动化、麦克风）。本地构建和自更新的应用使用稳定的、固定标识符的 ad-hoc 签名，因此授权在更新后依然保留。

一次性说明：在固定标识符签名修复（PR #73681）*之前*的构建上所做的授权携带的是旧的固定 cdhash 要求。macOS 会继续把这些过期授权显示为开启，但仍会重新提示，因为所存储的授权不再与重建后的二进制匹配——而现代提示没有“允许”按钮，所以看起来好像没有什么可重新勾选的。如果发生这种情况，重置一次过期授权再重新授予：

```bash
tccutil reset ScreenCapture com.nousresearch.hermes   # repeat per service
```

然后在系统设置中将这条新的条目切换为开启，并完全退出并重新启动 Hermes。此后授权即保持稳定。

若要最强保证——一个锚定证书的身份，即 yabai/skhd 用户所依赖的同一机制——只需创建一次自签名代码签名证书，并告诉 Hermes 使用它。这条一次性命令会完成所有工作（在你的登录钥匙串中创建证书、授予 `codesign` 访问权限、写入配置并重新签名打包后的应用）：

```bash
hermes desktop --setup-tcc-identity
```

或手动操作：

1. 钥匙串访问 → 证书助理 → **创建证书…**
2. 名称：`Hermes Local Signing`，身份类型：*自签名根证书*，
   证书类型：**代码签名**。
3. 在钥匙串访问中，双击新证书 → **信任** → 将
   **代码签名**设为*始终信任*（导入的自签名证书在因代码签名而被信任之前不是有效的签名身份——
   之后 `security find-identity -v -p codesigning` 应会列出它）。
4. `hermes config set desktop.macos_signing_identity "Hermes Local Signing"`

在命令中使用 `--identity <name>` 可创建/使用不同名称的证书（默认：`Hermes Local Signing`）。该命令是幂等的——更新后重新运行它即可重新指向配置并重新签名重建后的应用。

下一次更新会用该证书重新签名重建后的应用；每一项 TCC 授权都将保留。无需 Apple Developer 账号。已公证的发布构建会被检测到且绝不会被重新签名。

一次性说明：更改签名身份（包括此修复后的第一次更新）会一次性改变应用的身份，因此 macOS 会最后再提示一次。此后授权即保持稳定。如果某个权限卡住，用 `tccutil reset All com.nousresearch.hermes` 重置并重新授予。

## 另请参阅

- [CLI 指南](./cli.md) — 终端界面
- [TUI](./tui.md) — 由 `hermes --tui` 和仪表盘聊天标签页使用的现代终端 UI
- [Web Dashboard](./features/web-dashboard.md) — 带有嵌入式聊天标签页的浏览器管理面板
- [Configuration](./configuration.md) — 桌面应用读写所用的配置
- [Windows（原生）](./windows-native.md) — 原生 Windows 安装路径
