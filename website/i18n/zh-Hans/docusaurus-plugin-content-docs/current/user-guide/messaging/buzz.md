# Buzz

Buzz 适配器将 Hermes 连接到 [Buzz](https://github.com/block/buzz) 社区 —— Block 基于 Nostr 协议构建的开源人类+智能体协作平台 —— 并在 Buzz 频道（或私信）与智能体之间中继消息。出站流量通过调用 `buzz` CLI 二进制文件（“JSON 进，JSON 出”）执行；入站使用原生 Nostr WebSocket 订阅（通过已捆绑的 `websockets` 包）并以 CLI 轮询作为兜底。**无需额外的 Python 包** —— 只需 `buzz` 二进制文件。

Buzz 会渲染 markdown，因此智能体的回复会保留其格式。图片以上传（本地文件）或链接（URL）的形式投递。回复可以通过事件 id 作为线程挂接到已有消息上。当进度消息或状态消息启用时，它们会继承触发它们的 Buzz 事件作为回复锚点，而不是作为无关的顶层频道帖子出现。

发送**给**智能体的文件会使用智能体经过身份验证的身份从中继取回并本地缓存，因此工具收到的是真实的文件路径，而不是匿名请求无法读取的 `/media/…` URL。图片、音频、视频和文档（PDF 等）都会被处理。

入站消息默认通过一个持久的、经过 NIP-42 身份验证的 Nostr WebSocket 订阅到达（近乎即时投递），当无法建立 WebSocket 时自动回退到 CLI 轮询。出站消息始终通过 `buzz` CLI 发送。通过 `transport` / `BUZZ_TRANSPORT` 控制：`auto`（默认）、`websocket`（要求 WS，否则失败）或 `poll`。如果你的中继成员资格使用 NIP-OA 所有者证明，请将 `BUZZ_AUTH_TAG` 设为四字符串的 auth tag JSON。

> 运行 `hermes gateway setup` 并选择 **Buzz** 以获得引导式演练。

## 前提条件

- `buzz` CLI 二进制文件位于你的 `PATH` 中（或将 `BUZZ_CLI_PATH` 指向它）—— 从 [Buzz 仓库](https://github.com/block/buzz) 使用 `cargo build --release -p buzz-cli` 构建它
- 一个 Buzz 社区中继 URL（例如 `https://mycommunity.communities.buzz.xyz`）
- 一个 Nostr 私钥（nsec 或 hex），其身份已是该社区的**成员**

## 配置 Hermes

你可以通过两种方式配置 Buzz —— `config.yaml` 中的 `gateway` 块（规范方式）或环境变量（会覆盖它）。私钥是**机密**，始终应放在 `~/.hermes/.env` 中。

### 方式 A —— config.yaml

```yaml
gateway:
  platforms:
    buzz:
      enabled: true
      extra:
        relay_url: https://mycommunity.communities.buzz.xyz
        attachment_hosts: []         # additional exact HTTPS host[:port] origins for inbound files
        channels:                  # channel UUIDs to watch (empty = all joined)
          - ccc2bc1a-7a82-5a8f-8c4e-57a070cbe7cd
        home_channel: ccc2bc1a-7a82-5a8f-8c4e-57a070cbe7cd
        poll_interval: 4           # seconds between inbound poll sweeps
        cli_path: ""               # buzz binary (default: PATH, then ~/bin/buzz)
        credentials_file: ""       # JSON file with the nsec (BUZZ_PRIVATE_KEY fallback)
        allowed_users: []          # empty = allow all; hex pubkeys or npubs
```

另外，在 `~/.hermes/.env` 中：

```
BUZZ_PRIVATE_KEY=nsec1...
```

### 方式 B —— 环境变量

| 变量 | 必需 | 说明 |
|----------|:--------:|-------------|
| `BUZZ_RELAY_URL` | ✅ | 社区中继的基础 URL |
| `BUZZ_PRIVATE_KEY` | ✅ | Nostr 私钥（nsec 或 hex）—— 唯一的机密 |
| `BUZZ_CHANNELS` | — | 以逗号分隔的要监视的频道 UUID（默认：所有已加入的频道） |
| `BUZZ_HOME_CHANNEL` | — | 用于定时任务 / 通知投递的频道 UUID（默认为第一个被监视的频道） |
| `BUZZ_ALLOWED_USERS` | — | 以逗号分隔的允许与智能体对话的 npub 或 hex 公钥 |
| `BUZZ_ALLOW_ALL_USERS` | — | 允许任何社区成员与智能体对话 |
| `BUZZ_POLL_INTERVAL` | — | 入站轮询扫描之间的秒数（默认：4） |
| `BUZZ_CLI_PATH` | — | `buzz` 二进制文件的路径（默认：PATH 中的 `buzz`，然后是 `~/bin/buzz`） |
| `BUZZ_CREDENTIALS_FILE` | — | 保存 nsec 的 JSON 凭据文件，当 `BUZZ_PRIVATE_KEY` 未设置时使用 |

## 推荐的默认设置

在配置 Buzz 时，请在 `config.yaml` 中设置这些默认值，以保持频道整洁，并让智能体专注于最终结果，而非其内部工具执行日志。这些设置与 Telegram 和 email 上的行为一致，后者已经抑制了中间工具输出。

```yaml
display:
  platforms:
    buzz:
      interim_assistant_messages: false   # suppress intermediate tool results, reasoning comments, and progress updates — only the final response reaches the channel
      tool_progress: off                  # suppress tool progress bubbles (e.g., "Running terminal command...", "Reading file...")
gateway:
  platforms:
    buzz:
      enabled: true
      extra:
        relay_url: https://mycommunity.communities.buzz.xyz
        attachment_hosts: []         # additional exact HTTPS host[:port] origins for inbound files
        channels:                         # channel UUIDs to watch (empty = all joined)
          - ccc2bc1a-7a82-5a8f-8c4e-57a070cbe7cd
        home_channel: ccc2bc1a-7a82-5a8f-8c4e-57a070cbe7cd
        poll_interval: 4                  # seconds between inbound poll sweeps (default 4 — balances latency vs. relay load)
        cli_path: ""                      # buzz binary (default: PATH, then ~/bin/buzz)
        credentials_file: ""              # JSON file with the nsec (BUZZ_PRIVATE_KEY fallback)
        allowed_users: []                 # empty = allow all if allow_all_users is true; otherwise restrict to listed npubs/hex pubkeys
        require_mention: true             # in channels: only respond when addressed (@name, npub, or hex pubkey); DMs always dispatch regardless
        allow_all_users: false            # set true for community mode (everyone can chat, only owner is admin); false for private mode (only allowed_users)
```

**为什么使用这些默认值：**

- `interim_assistant_messages: false` —— 防止中间工具结果、推理评论和进度更新作为单独消息发布到频道。只有最终回复会进入频道。
- `tool_progress: off` —— 抑制工具进度气泡（例如“正在运行终端命令...”、“正在读取文件...”）。让频道专注于实际结果，而非过程。
- `poll_interval: 4` —— 在入站延迟（最多 4 秒延迟）与中继负载之间取得平衡。更低的值会增加轮询频率；更高的值会降低它。
- `allowed_users: []` + `allow_all_users: false` —— 默认私有模式。只有列出的用户才能交互。将 `allow_all_users: true` 设为社区模式，此时每个人都能聊天（管理员层级仍仅限于所有者）。
- `require_mention: true` —— 在频道中，智能体仅在被呼及时才响应。私信无论如何都会分派，与此设置无关。

**理由：** 频道用于最终结果和对话，而非智能体的内部工具执行日志。用户看到最终答案，而不是达成答案所采取的步骤。这与 Telegram 和 email 上的行为一致，它们已经具有这些默认值。

**例外：** 如果你希望用户看到工具进度（例如，对于长时间运行的操作），请设置 `tool_progress: all` —— 但 `interim_assistant_messages` 仍应保持为 `false`，以免每一条工具结果都造成刷屏。

## 提及、频道和私信

- 在共享频道中，智能体仅在**被呼及**时响应 —— 通过 `@name`、其 npub 或其 hex 公钥。其他一切都会被忽略。
- 直接消息总是能到达智能体，无需提及。
- 智能体自己的消息从不会被分派回给它（按公钥进行自回显抑制），每个事件都会按事件 id 对照每频道的高水位标记进行去重。

## 回复线程

回复默认以线程方式发送：智能体的回答（以及任何已启用的进度消息/状态消息）锚定到触发它的消息上。锚定是感知 NIP-10 的 —— 当触发的消息已**处于**某个线程**内部**时，智能体会回复该线程的*根*，这样答案会加入现有线程，而不是在每一轮对话下嵌套一个新的单消息子线程。

若要改为在频道层级平铺发布回复，请设置以下任一选项（二者等效；`reply_in_thread` 匹配 Slack 所用的键）：

```yaml
gateway:
  platforms:
    buzz:
      reply_to_mode: off          # PlatformConfig-level, like Discord/Telegram
      extra:
        reply_in_thread: false    # Slack-style key; env: BUZZ_REPLY_IN_THREAD
```

该选择退出适用于**所有**发送路径 —— 最终答案、流式更新、中间评论、工具进度气泡以及进程外定时任务投递（`deliver=buzz`）。

## 访问控制

默认情况下允许列表为空，这意味着每个提及智能体的社区成员只有在 `BUZZ_ALLOW_ALL_USERS=true` 时才会得到响应；否则请通过在 `BUZZ_ALLOWED_USERS`（或 config.yaml 中的 `allowed_users`）中列出 npub 或 hex 公钥来限制访问。社区成员资格本身由中继强制执行 —— 只有成员才能发帖。

允许列表也对**入站附件**进行门控：中继媒体是使用智能体自己的 Buzz 凭据获取的，因此仅对网关明确授权的发送者才进行下载。被拒绝、缺失或失败的授权会保持消息文本不变，且不发出任何带凭据的请求。

定时任务和通知（`deliver=buzz`）投递到**主频道** —— 若设置了 `BUZZ_HOME_CHANNEL` 则为该频道，否则为第一个被监视的频道 —— 且即使定时任务在网关进程之外运行也能正常工作。

## 入站附件

带有原生 NIP-94 `imeta` 标签的 Buzz 消息可以将图片、音频、视频和文档投递给智能体。Hermes 仅在消息通过自回显、呼及和发送者授权检查后才下载附件。每个文件必须使用 HTTPS，并声明确切的字节大小和 SHA-256 摘要；重定向、URL 凭据、片段、超大负载和完整性不匹配都会被拒绝。

中继自己的 HTTPS 源会被自动信任。如果某个社区将媒体存储在另一个公共源上，请将其确切的 `host` 或 `host:port` 添加到 `gateway.platforms.buzz.extra` 下的 `attachment_hosts` 中。非默认端口必须显式列出。需要通过 Buzz CLI 进行身份验证检索的受保护媒体不由此原生公共 URL 路径处理。

## 运行网关

```bash
hermes gateway start
```

使用 `hermes gateway status` 检查状态 —— Buzz 连接状态会在那里报告，包括仅使用环境变量的设置。

## 注意事项和限制

- **`BUZZ_*` 环境变量在 Buzz 会话的终端工具子进程中可用** —— 智能体可以直接调用 `buzz` CLI（例如 `buzz messages send ...`），因为当会话的平台为 `buzz` 或该进程是 Buzz Desktop 托管智能体（`BUZZ_MANAGED_AGENT`）时，`BUZZ_PRIVATE_KEY`、`BUZZ_AUTH_TAG`、`BUZZ_RELAY_URL` 以及其他 `BUZZ_*` 变量会传递给终端子进程。同一主机上的非 Buzz 会话、`execute_code` 以及其他非终端派生进程仍保持封闭。
- **入站是轮询而非流式的。** `buzz` CLI 是请求/响应式的，因此适配器每 `poll_interval` 秒（默认 4）对每个被监视频道轮询 `buzz messages get`。入站消息预期会有最多一个间隔的延迟。未来的优化是使用 websocket 传输（Buzz 仓库提供了 `buzz-ws-client` 用于真正的流式传输）。
- 在（重新）连接时，适配器会从最新事件为其高水位标记播种，因此频道历史永远不会被重放给智能体。
- 新私信对话会被自动发现（每隔几次轮询扫描）。
- 私钥通过子进程环境传递给 CLI —— 它绝不会出现在 argv 或日志中。
