---
title: "机器人屏幕"
sidebar_position: 17
---

# 机器人屏幕

在无头 Linux 网关主机（服务器、云虚拟机、Hermes Cloud）上，每个机器人都有**自己的桌面**：一块 Xfce 屏幕，机器人的 `computer_use` 和有头浏览器在其上操作，并实时流式传输到 Hermes Desktop。你可以观看机器人的操作，在它遇到登录、2FA 提示、CAPTCHA 或支付步骤时**接管**，然后**交还控制权**，让它继续使用你刚刚登录的会话。关闭应用或合上笔记本电脑后，机器人仍会继续工作；屏幕存在于网关主机上，而不在你的机器上。

每个 Hermes 配置档（“机器人”）都有自己的屏幕、自己的浏览器配置档和自己的 Cookie。屏幕是工作界面，而非安全边界：机器人共享主机的用户账户、文件和网络（与其它托管智能体产品采用相同的模式）。

**威胁模型。** 屏幕的 RFB 套接字、X 显示、浏览器配置档和控制租约文件都属于网关的操作系统用户。以该用户身份运行的任何进程——同一主机上的另一个机器人，以及机器人自身的 `terminal` 工具——都可以绕过面板和租约直接访问它们。租约是施加在 `computer_use` 和浏览器工具上的工具级栅栏，而不是操作系统级的。有一个边界比操作系统用户更宽：Chromium 的 DevTools 端口（dock 的浏览器以及每次 agent-browser 启动都会在回环地址上通告一个，以便智能体可以附加）可被主机上**任何**本地用户访问，而 Chromium 对此不提供任何按用户限制。将每个机器人作为独立的操作系统用户运行不在范围内；如果这种隔离对你很重要，或者主机上有不受信任的本地用户，请把机器人放在不同的主机上。两个值得了解的时序细节：WebSocket 桥在两次重新读取租约文件之间会将其租约决定缓存最长 250 毫秒，因此由另一进程发起的接管会在该时间窗内生效（无论时间窗如何，机器人的工具结果都会因租约纪元而被作废）。另外，查看器的一次性、30 秒 `display_ticket` 会特意作为 URL 查询参数传递——noVNC 无法协商 WebSocket 子协议，因此无法使用请求头——这意味着反向代理的访问日志可能会记录一个已被使用的 ticket。

## 要求

- 网关主机运行 Linux。macOS 和 Windows 主机已经拥有真实显示器；在这些平台上不提供该面板。
- 主机上安装了 TigerVNC 的 `Xvnc` 和 Xfce 核心组件。不会静默安装任何东西：`hermes update` 和全新安装都会让每台机器保持原样。当它们缺失时，Hermes Desktop 中的“屏幕”面板会显示 **Install on host**——一键即可在网关主机上运行包管理器（它会在一张掩码卡片中索要该主机的 sudo 密码；密码只发送到该主机，且绝不会被存储），并流式输出日志。当 Hermes 本身以 root 身份运行时——容器中的常见情况——安装器会直接运行包管理器，无需 sudo，也没有密码卡片。当它不是 root 且主机上完全没有 `sudo` 时，面板和 CLI 会打印出确切的安装命令，供你在主机上运行，而不是显示卡片。官方 Docker 镜像（`nousresearch/hermes-agent`，Hermes Cloud 也由它驱动）属于第二种情况：网关以非特权用户运行，且镜像中没有 `sudo`，因此面板会显示 `apt-get` 命令行，由运维人员在容器中以 root 身份运行一次（`docker exec -u 0 <container> apt-get install -y …`）。如果你想要 dock 的浏览器图标，请在该行中加入 `chromium`；参见下方的[浏览器会话](#browser-sessions-that-survive-the-handoff)。在 shell 中，`hermes computer-use screen status` 会打印出确切的命令行，`hermes computer-use screen install` 会运行它：

  | 发行版 | 软件包 |
  |---|---|
  | Debian / Ubuntu | `tigervnc-standalone-server xfce4-panel xfwm4 xfdesktop4 xfce4-settings xfce4-terminal dbus-x11 x11-xserver-utils x11-utils xauth fonts-dejavu-core` |
  | Fedora | `tigervnc-x11-server xfce4-panel xfwm4 xfdesktop xfce4-settings xfce4-terminal dbus-daemon xsetroot xset xdpyinfo xprop xorg-x11-xauth setxkbmap dejavu-sans-fonts` |
  | Arch | `tigervnc xfce4-panel xfwm4 xfdesktop xfce4-settings xfce4-terminal xorg-xsetroot xorg-xset xorg-xdpyinfo xorg-xprop xorg-xauth xorg-setxkbmap ttf-dejavu` |

  在 Fedora 上，`Xvnc` 二进制文件位于 `tigervnc-x11-server` 中（而不是 `tigervnc-server-minimal`），而 `dbus-run-session` 来自 `dbus-daemon`。刻意**不**使用 `xfce4` 元包：它会引入屏幕保护程序、电源管理器和 polkit 代理，这些会在无头桌面上锁定桌面或弹出提示。
- 为机器人启用 [Computer Use](./computer-use.md)（已安装 cua-driver）。
- 内存。在官方镜像中实测：网关空闲时约 300 MB，Xvnc + Xfce 增加约 220 MB，而接管期间人工打开的有头 Chromium 会增加 0.5–1 GB（一个页面：约 550 MB）。请按**每个带浏览器的打开屏幕约 1.1–1.5 GB** 来规划；桌面本身很便宜，浏览器才是开销所在。CPU 不是限制（空闲桌面约 0.01 核，实时流式传输约 0.03 核）。在 Debian 13 上这些软件包占用约 930 MB 磁盘空间。

  在启动屏幕之前，Hermes 会检查主机——或其容器 cgroup，取更严格的一方——是否有 `bot_desktop.min_free_memory_mb` 的空闲内存（默认 1536；`0` 禁用该检查）。低于该值时，面板会在**Start screen** 的位置显示原因，并且 `hermes computer-use screen start` 会拒绝执行；对于已运行的屏幕，该检查永远不会将其关闭。无人使用的屏幕会在 `bot_desktop.idle_stop_minutes`（默认 30）后被停止，并在下次使用时恢复，因此实例只在有东西占用桌面时才为其付费。针对小型实例的实用建议：4 GB 可以运行桌面，8 GB 才能顺畅地进行带浏览器的接管。

### 将软件包烘焙进容器镜像

面向托管或非特权部署的镜像无法在运行时安装任何东西，因此这些软件包必须预先构建进去。CI 会为每个版本发布两种变体：不带这些软件包的无后缀标签（`:latest`、`:v*`），以及带这些软件包的 **`-desktop` 标签**（`:latest-desktop`、`:v*-desktop`）。托管部署（Fly Machines、Azure 容器实例）通过拉取带后缀的标签来获得 Bot Screen；构建参数无论如何也传不到它那里，因为它根本不运行构建。provisioner 中目前还没有任何逻辑会选择 `-desktop`，因此托管实例启动时仍然是不含这些包的版本；不过你自己拉取带后缀的标签，今天就能用。

只有在你想把这些软件包放进自定义镜像里时才需要自己构建。官方 `Dockerfile` 有一个可选的构建参数，默认关闭，所以直接 `docker build .` 会保持精简：

```bash
docker build --build-arg HERMES_BOT_DESKTOP=1 -t hermes-agent:screen .
```

它会加入 TigerVNC、Xfce 组件以及带界面的 `chromium`（用于 dock 的 Browser 图标），再加上 Playwright 的带界面 Chromium 构建——镜像约为 **1.4 GB**（实测：不带该参数为 4.1 GB，在 arm64 上带该参数为 5.5 GB），其中约 930 MB 是 apt 层。启动时不会运行任何东西；以此方式构建的镜像在启动屏幕之前不消耗内存。

## 使用方法

每个 bot 的电脑在 Hermes Desktop 的三处位置都只有一键之遥：

- **Bots → 某个 bot → Scheduled Jobs**：bot 的屏幕是该面板最顶部的醒目区域，位于标题和例程之上：一个桌面实时预览（面板可见时每隔几秒刷新一次），并显示当前由谁控制；点击画面即可展开为实时访问。当屏幕关闭或未安装时，同一位置会显示相应提示，并提供 Start / Install。
- **Bots → 右键点击某个 bot → Open Screen**。同一菜单中还有 **Open Screen when the bot uses it**：勾选后，在 bot 某次运行的首次 `computer_use` 或浏览器调用时，Screen 标签页会自动切到前面，让你实时观看它的工作，而不是事后才发现。默认关闭，按 bot 单独设置。它会把该标签页提前显示但不会夺取你的键盘焦点，永不为重放的历史记录触发，最多每 30 秒触发一次，而且如果你在运行中途关闭该标签页，它会保持关闭直到 bot 的下一次运行。
- **Sessions 侧边栏**，按 gateway / profile 分组：每个 profile 的标题下方都有相同的 **Screen** 框，因此也可以从该 profile 的对话中访问它的机器。

1. 通过上述任一路径打开 Screen。
   屏幕**默认关闭**，不会自动为你启动：在面板中点击 **Start screen**，在宿主机上运行 `hermes computer-use screen start`，或者如果你希望无头宿主机在 bot 首次 `computer_use` 调用或首次带界面浏览器使用（`browser.headed: true`）时自行启动屏幕，可设置 `bot_desktop.auto_start: true` —— 默认关闭是为了让安装 TigerVNC 不会产生一个无人请求的屏幕。屏幕运行后，带界面的浏览器会打开在它上面。
2. 面板会串流 bot 的桌面。头部的标签会显示当前由谁控制：默认是 **Bot is in control**。
3. 点击 **Take over**。边框变红，你的键盘和鼠标现在可以操作 bot 的屏幕。登录、完成 CAPTCHA、确认支付。
4. 点击 **Hand back**。bot 重新获得控制权，并在继续之前重新捕获屏幕。关闭面板同样会归还控制权。连接**断开**则不同：如果你在持有控制权时合上笔记本盖子或 Wi-Fi 断开，你会继续持有控制权——bot 会被锁定在你可能正在登录的屏幕之外——直到你重新连接并归还。如果你在重新加载后回来，面板仍显示由人类持有控制权，则会出现一个 **Hand back (force)** 按钮来清除它。

在你持有控制权期间，bot 的 `computer_use` 和浏览器工具会被拒绝，并返回 `human_has_control`，截图也包括在内。这是工具层面的围栏，不是操作系统层面的：bot 与其屏幕以同一用户身份运行。不要在你不会信任其秘密的 bot 中输入机密信息。

当 bot 遇到不应由它自己执行的步骤（登录、2FA、CAPTCHA、支付）时，它会在回复中说明，并结束本轮。该请求会通过你正在使用的任意聊天工具送达你。你准备好时接管，完成该步骤，交还控制权，然后告诉 bot 继续。bot 在等待期间其一侧不会有任何阻塞：接管始终由你主动发起，bot 从不会保持一个工具调用打开来等待你。

同一屏幕上的两个观看者：最近的 **Take over** 胜出；之前的控制者退回为观看者。

## 交接后仍存续的浏览器会话

当屏幕运行时，机器人的浏览器工具与 Dock 上的 **Browser** 图标指向同一个浏览器：即 Chromium 智能体浏览器所驱动的那个，每个机器人都有一个持久的 user-data-dir（`<HERMES_HOME>/bot-desktop/browser-profile`；设置 `AGENT_BROWSER_PROFILE` 可固定为你自己的目录——`~` 会展开，相对路径如 `pin` 则相对于该机器人的 `HERMES_HOME` 解析，即 `<HERMES_HOME>/pin`）。在接管期间点击 Browser，你就进入了机器人自己的窗口和 Cookie 罐；你登录了什么，机器人之后以及后续每一个会话中用的就是什么，直到该站点使登录过期。设置 `browser.headed: true`，这样机器人自己的浏览行为也能显示在屏幕上。

Dock 只会被初始化**一次**，即某个配置文件首次启动屏幕时。这个保护机制由面板布局文件 `<HERMES_HOME>/bot-desktop/xdg/xfce4/xfconf/xfce-perchannel-xml/xfce4-panel.xml` 实现：只要该文件存在，启动器就不会碰面板，因此修改 `AGENT_BROWSER_EXECUTABLE_PATH` 或 `AGENT_BROWSER_PROFILE` 并重启屏幕不会重新固定 Browser 图标。删除该文件后，Dock 会在下一次 `screen start` 时根据当时安装的内容重建。

Dock 和机器人使用哪个 Chromium：显式设置的 `AGENT_BROWSER_EXECUTABLE_PATH` 优先；否则 Hermes 会倾向于使用系统安装的 `chromium` / `google-chrome`（如果存在），并回退到 Chromium Playwright 自带版本。这个顺序的原因是沙箱：在 Ubuntu 23.10 及更高版本中，`kernel.apparmor_restrict_unprivileged_userns=1` 会阻止 Playwright 自带的 Chromium 以非 root 用户身份建立沙箱，使其以 `FATAL: No usable sandbox!` 退出；而发行版自带的 Chromium 则附带了一个允许此操作的 AppArmor 配置文件。如果选择不适用于你的主机，请在网关的环境变量中设置 `AGENT_BROWSER_EXECUTABLE_PATH=/usr/bin/chromium`（或你的 Chrome 路径）。官方 Docker 镜像只包含 Playwright 的*无头 shell*，无法绘制窗口，因此在其中 Dock 没有 Browser 图标，窗格 / `screen status` 会报告 **no headed browser**，直到你安装一个有头版本（`apt-get install chromium`）；一旦安装好，Dock 图标就会以与该容器中 agent-browser 相同的沙箱设置启动它，所以人类的 Browser 和机器人的浏览器就是同一个。

## CLI

```bash
hermes computer-use screen status          # 是否已安装？是否正在运行？谁持有控制权？
hermes computer-use screen start           # 启动此配置文件的屏幕
hermes computer-use screen stop            # 停止它；人类持有控制权时拒绝执行
hermes computer-use screen stop --force    # ...除非你明确要求（同时释放僵持的租约）
hermes computer-use screen install [-y]    # 通过 apt/dnf/pacman 安装这些软件包
hermes -p research computer-use screen start   # 另一个机器人的屏幕
```

## 配置

```yaml
bot_desktop:
  geometry: "1440x900"      # 屏幕尺寸；查看器会缩放以适应窗格
  auto_start: false         # 设为 true 以在首次调用 computer_use 或使用有头浏览器时启动
  min_free_memory_mb: 1536  # 剩余可用内存低于此值时拒绝启动（0 = 从不检查）
  idle_stop_minutes: 30     # 停止长时间无人使用的屏幕（0 = 一直保持运行）
```

`auto_start` 默认关闭。可以从 Desktop 的 Screen 窗格（**Start screen**）启动屏幕，用 `hermes computer-use screen start` 启动，或在无头主机上将标志设为 `true`，让它在该机器人首次调用 `computer_use` 或打开有头浏览器（`browser.headed: true`）且没有可用显示时自动启动屏幕。

状态存放在每个配置文件的 `<HERMES_HOME>/bot-desktop/` 下（RFB Unix socket、Xauthority、启动器日志、每配置文件的 xfconf）。

## 工作原理

- **TigerVNC 的 `Xvnc`** 在一个进程中同时充当 X 服务器和 RFB 服务器，按配置文件独立运行，只监听一个 `0600` 权限的 Unix socket。没有 TCP 端口，没有 VNC 密码：只有以网关用户身份运行的进程才能访问它（见上面的威胁模型），而网关的 WebSocket 桥接是经过认证的接入途径。
- **Xfce** 按组件启动（`xfsettingsd`、`xfwm4 --compositor=off`、`xfdesktop`、`xfce4-panel`），运行在私有的 D-Bus 会话下，不启动 `xfce4-session`，因此不会有东西试图锁定屏幕或连接 `logind`。
- **Hermes Desktop** 内置了 noVNC。它通过正常的认证连接向网关请求一次性票据（`display.observe`），并打开一个到 `/api/display/ws` 的同级 WebSocket；网关负责拼接 RFB 流。没有暴露任何新东西；该窗格在本地、SSH、URL+token 和 Hermes Cloud 连接下均能正常工作。
- **控制权租约。** 网关会在 RFB 字节层面丢弃任何不持有租约的查看器发来的键盘、指针和剪贴板消息；noVNC 的只读标志只是界面提示。同一个租约也对 `computer_use` 和浏览器工具进行把关。它是 `<HERMES_HOME>/bot-desktop/` 下的一个文件：文件不存在意味着机器人持有控制权（新配置文件）；文件存在但无法读取或解析时按失败关闭处理——机器人被视为锁定状态，直到下一次成功交接时重写它。Xvnc 从不将屏幕的剪贴板推送给查看器（`-SendCutText=0`），因此观察者不会接收到控制者所复制的内容；但向屏幕中粘贴仍然有效。
- **显示绑定。** 启动器会公布 `DISPLAY`、`XAUTHORITY` 和 D-Bus 地址；该配置文件的每次 cua-driver 和有头浏览器派生进程都会继承它们，因此机器人绝不会作用于人类正在使用的显示。

## 故障排查

- **"Screen packages missing"** — 在窗格中点击 **Install on host**，或在网关主机上（不是运行 Hermes Desktop 的机器上）运行打印出来的安装命令。当已经有一个安装正在运行时，窗格会拒绝再次安装。
- **屏幕启动后随即停止** — 查看 `<HERMES_HOME>/bot-desktop/launcher.log`。
- **接管期间键入产生错误字符** — 屏幕运行的是 US 键盘映射，这样 RFB 键符和 cua-driver 才能一致；一旦 Xvnc 支持，noVNC 会发送原始键码（QEMU 扩展按键事件），因此在你持有控制权时，非 US 物理键盘上依赖于布局的按键（Y/Z、符号）会以对应的 US 键位输入。输入密码时请记住这一点，或在该 `DISPLAY` 上用 `setxkbmap` 更改布局。
- **你离开后机器人仍显示 `human_has_control`** — 在窗格中点击 **Hand back**（重新加载后则是 **Hand back (force)**）。在 shell 中，`hermes computer-use screen stop --force` 会释放租约并停止屏幕（不加 `--force` 时，命令会在人类持有控制权时拒绝执行，因此运维脚本永远无法抢走正在进行的接管）；`hermes computer-use screen start` 会让它恢复并由机器人持有控制权。

### 在 WSL 下测试

WSL2 算作受支持的 Linux 主机：`screen status` 会如此报告，并提供窗格。有一个 WSLg 的怪癖会妨碍首次启动：WSLg 以只读方式挂载 `/tmp/.X11-unix`，因此 `Xvnc` 无法创建其显示 socket，并以 `launcher.log` 中的 `Cannot establish any listening sockets` 退出。请在启动屏幕前，将该挂载替换为一个可写目录：

```bash
sudo umount /tmp/.X11-unix  # no-tmp: ok — X11 socket directory, fixed by the protocol
sudo mkdir -p /tmp/.X11-unix && sudo chmod 1777 /tmp/.X11-unix  # no-tmp: ok — same
```

该挂载会在下次 WSL 重启后恢复；届时重复执行这两条命令即可。
