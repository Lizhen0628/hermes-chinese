# IRC

IRC 适配器将 Hermes 连接到任意 IRC 服务器，并在 IRC 频道（或私信）与智能体之间转发消息。它通过 Python 标准库的 `asyncio` 实现 IRC 协议——**无外部依赖、无 SDK、无守护进程**。它适用于 [Libera.Chat](https://libera.chat/) 等公共网络以及任何自托管的 ircd。

IRC 是纯文本的：不支持语音、图片、文件、话题串、表情回应、输入状态或流式传输——回复以 `PRIVMSG` 行发送，过长的消息会被拆分以符合 IRC 行长度限制。

> 运行 `hermes gateway setup` 并选择 **IRC** 以获取引导式设置流程。

## 前置条件

- 要连接的 IRC 服务器（例如 `irc.libera.chat`）
- 要加入的频道（例如 `#hermes`）——多个频道用逗号分隔
- 机器人的昵称（默认：`hermes-bot`）
- 可选：已注册的昵称 + NickServ 密码，如果你的网络需要身份验证

## 配置 Hermes

你可以通过两种方式配置 IRC——环境变量（适合快速、仅用环境变量的设置）或 `~/.hermes/config.yaml` 中的 `gateway` 块。

### 方式 A —— config.yaml

```yaml
gateway:
  platforms:
    irc:
      enabled: true
      extra:
        server: irc.libera.chat
        port: 6697
        nickname: hermes-bot
        channel: "#hermes"
        use_tls: true
        server_password: ""       # 可选的服务器密码
        nickserv_password: ""     # 可选的 NickServ 身份验证
        allowed_users: []         # 留空 = 允许所有人，或填写昵称列表
        max_message_length: 450   # IRC 行长度限制（安全的默认值）
```

### 方式 B —— 环境变量

| 变量 | 必需 | 描述 |
|----------|:--------:|-------------|
| `IRC_SERVER` | ✅ | IRC 服务器主机名（例如 `irc.libera.chat`） |
| `IRC_CHANNEL` | ✅ | 要加入的频道——多个频道用逗号分隔 |
| `IRC_NICKNAME` | ✅ | 机器人昵称（默认：`hermes-bot`） |
| `IRC_PORT` | — | 服务器端口（默认：使用 TLS 时为 `6697`，否则为 `6667`） |
| `IRC_USE_TLS` | — | 使用 TLS（`true`/`false`；端口 6697 默认 `true`） |
| `IRC_SERVER_PASSWORD` | — | 用于 `PASS` 命令的服务器密码 |
| `IRC_NICKSERV_PASSWORD` | — | 连接时自动 IDENTIFY 的 NickServ 密码 |
| `IRC_ALLOWED_USERS` | — | 允许与机器人对话的昵称，逗号分隔 |
| `IRC_ALLOW_ALL_USERS` | — | 允许频道内任何人跟机器人对话（仅限开发环境） |
| `IRC_HOME_CHANNEL` | — | 用于定时任务 / 通知投递的频道（默认为 `IRC_CHANNEL`） |

## 访问控制

默认情况下，只有 `allowed_users`（或 `IRC_ALLOWED_USERS`）中列出的昵称才能与机器人对话。将列表留空**并且**设置 `IRC_ALLOW_ALL_USERS=true`，即可允许频道内任何人与 Hermes 对话——这对测试很有用，但在公共网络上不推荐使用，因为除非网络强制执行 NickServ，否则 IRC 昵称未经身份验证。

如果你的网络注册了昵称，请设置 `IRC_NICKSERV_PASSWORD`（或 `nickserv_password`），以便机器人在连接时向 NickServ 进行身份验证并保住其已注册的昵称。

## 频道与私信

- 已加入频道中的消息被视为**群组**对话。
- 发送给机器人的私信被视为**私信**。

定时任务和通知会投递到**主频道**——如果设置了 `IRC_HOME_CHANNEL` 则用它，否则用第一个 `IRC_CHANNEL`。

## 运行网关

```bash
hermes gateway start
```

使用 `hermes gateway status` 检查状态——IRC 连接状态会在此处报告，仅用环境变量的设置也不例外。

## 说明

- 较长的智能体回复会自动拆分为多个 `PRIVMSG` 行，以保持在 IRC 行长度限制之内（`max_message_length`，考虑协议开销后默认 450 字节）。
- 适配器会为每个服务器+昵称获取一个作用域内的凭据锁，因此两个 Hermes 配置档不会争抢同一个 IRC 身份。
