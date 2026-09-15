# Buzz

Buzz 适配器将 Hermes 连接到 [Buzz](https://github.com/block/buzz) 社区 —— 这是 Block 基于 Nostr 协议构建的开源人机协作平台 —— 并在 Buzz 频道（或私信）与智能体之间转发消息。出站流量通过 shell 调用 `buzz` CLI 二进制（“JSON 输入，JSON 输出”）；入站则使用原生 Nostr WebSocket 订阅（通过已内置的 `websockets` 包），并以 CLI 轮询作为回退。**无需额外的 Python 包** —— 只需 `buzz` 二进制即可。

Buzz 会渲染 markdown，因此智能体的回复会保留格式。图片以上传（本地文件）或链接（URL）的形式传递。回复可以通过事件 id 挂接到现有消息上形成线程。当进度或状态消息启用时，它们会继承触发它们的 Buzz 事件作为回复锚点，而不会作为无关的顶层频道帖子出现。

**发送给**智能体的文件会用智能体的认证身份从中继重新拉取并缓存到本地，因此工具会收到真实的文件路径，而不是匿名请求无法读取的 `/media/…` URL。图片、音频、视频和文档（PDF 等）均受支持。

入站消息默认通过一个持久的、经 NIP-42 认证的 Nostr WebSocket 订阅到达（近乎即时投递），当无法建立 WebSocket 时会自动回退到 CLI 轮询。出站消息始终通过 `buzz` CLI 发送。通过 `transport` / `BUZZ_TRANSPORT` 控制它：`auto`（默认）、`websocket`（要求 WS，否则失败）或 `poll`。如果你的中继成员身份使用 NIP-OA 所有者认证，请将 `BUZZ_AUTH_TAG` 设置为四字符串的认证标签 JSON。

> 运行 `hermes gateway setup` 并选择 **Buzz** 获取引导式配置流程。

## 前置条件

- `PATH` 上有 `buzz` CLI 二进制（或将 `BUZZ_CLI_PATH` 指向它）—— 从 [Buzz 仓库](https://github.com/block/buzz) 用 `cargo build --release -p buzz-cli` 构建
- 一个 Buzz 社区中继 URL（例如 `https://mycommunity.communities.buzz.xyz`）
- 一个 Nostr 私钥（nsec 或十六进制），其身份已经是该社区的**成员**

## 配置 Hermes

你可以通过两种方式配置 Buzz —— `config.yaml` 中的 `gateway` 块（规范方式）或环境变量（会覆盖它）。私钥是**机密**，应始终放在 `~/.hermes/.env` 中。

### 方案 A —— config.yaml

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

### 方案 B —— 环境变量

| 变量 | 必需 | 描述 |
|----------|:--------:|-------------|
| `BUZZ_RELAY_URL` | ✅ | 社区中继的基础 URL |
| `BUZZ_PRIVATE_KEY` | ✅ | Nostr 私钥（nsec 或十六进制）—— 唯一的机密 |
| `BUZZ_CHANNELS` | — | 以逗号分隔的要监听的频道 UUID（默认：所有已加入的频道） |
| `BUZZ_HOME_CHANNEL` | — | 用于定时任务 / 通知投递的频道 UUID（默认为第一个监听的频道） |
| `BUZZ_ALLOWED_USERS` | — | 以逗号分隔的允许与智能体对话的 npub 或十六进制公钥 |
| `BUZZ_ALLOW_ALL_USERS` | — | 允许任何社区成员与智能体对话 |
| `BUZZ_POLL_INTERVAL` | — | 入站轮询扫描之间的秒数（默认：4） |
| `BUZZ_CLI_PATH` | — | `buzz` 二进制的路径（默认：PATH 上的 `buzz`，然后是 `~/bin/buzz`） |
| `BUZZ_CREDENTIALS_FILE` | — | 存放 nsec 的 JSON 凭据文件，在未设置 `BUZZ_PRIVATE_KEY` 时使用 |

## 推荐默认设置

在配置 Buzz 时，请在 `config.yaml` 中设置这些默认值，以保持频道整洁，并让智能体专注于最终结果而非其内部工具执行日志。这些设置与 Telegram 和电子邮件上的行为一致，它们已经会抑制中间工具输出。

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

**为什么采用这些默认值：**

- `interim_assistant_messages: false` —— 防止中间工具结果、推理评论和进度更新作为单独消息发布到频道。只有最终回复进入频道。
- `tool_progress: off` —— 抑制工具进度气泡（例如“Running terminal command...”、“Reading file...”）。让频道专注于实际结果而非过程。
- `poll_interval: 4` —— 平衡入站延迟（最多 4 秒延迟）与中继负载。值越小轮询频率越高；值越大则越低。
- `allowed_users: []` + `allow_all_users: false` —— 默认为私密模式。只有列出的用户可以交互。将 `allow_all_users: true` 设为开启社区模式，让所有人都能对话（管理员层级仍限于所有者）。
- `require_mention: true` —— 在频道中，智能体仅在**被呼及**时响应。无论此设置如何，私信始终会派发。

**理由：** 频道用于最终结果和对话，而非智能体的内部工具执行日志。用户看到的是最终答案，而非达成答案所采取的步骤。这与 Telegram 和电子邮件上的行为一致，它们已经具备这些默认值。

**例外：** 如果你希望用户看到工具进度（例如对于长时间运行的操作），请设置 `tool_progress: all` —— 但 `interim_assistant_messages` 仍应保持为 `false`，以避免每条工具结果都刷屏。

## 提及、频道与私信

- 在共享频道中，智能体仅在**被呼及**时响应 —— 通过 `@name`、其 npub 或其十六进制公钥。其他一切内容均被忽略。
- 私信始终能到达智能体，无需提及。
- 智能体自己的消息永远不会被派发回自身（按公钥进行自回显抑制），每个事件都会针对每个频道的高水位标记按事件 id 进行去重。

## 回复线程

默认情况下，回复会形成线程：智能体的回答（以及任何启用的进度/状态消息）会锚定到触发它的消息上。锚定对 NIP-10 具有感知 —— 当触发消息本身已经**位于**某个线程时，智能体会回复该线程的*根*，因此回答会加入现有线程，而不是在每个回合下嵌套出一个新的单条消息子线程。

若要在频道层级以扁平方式发布回复，请设置以下任一项（它们等效；`reply_in_thread` 与 Slack 使用的键匹配）：

```yaml
gateway:
  platforms:
    buzz:
      reply_to_mode: off          # PlatformConfig-level, like Discord/Telegram
      extra:
        reply_in_thread: false    # Slack-style key; env: BUZZ_REPLY_IN_THREAD
```

此退出设置适用于**所有**发送路径 —— 最终回答、流式更新、中间评论、工具进度气泡以及进程外定时任务投递（`deliver=buzz`）。

## 访问控制

默认情况下允许列表为空，这意味着如果 `BUZZ_ALLOW_ALL_USERS=true`，每个提及智能体的社区成员都会得到响应；否则请在 `BUZZ_ALLOWED_USERS`（或 config.yaml 中的 `allowed_users`）中列出 npub 或十六进制公钥来限制访问。社区成员身份本身由中继强制执行 —— 只有成员才能发布。

允许列表还会对**入站附件**进行门控：中继媒体是使用智能体自己的 Buzz 凭据拉取的，因此只有网关明确授权的发送者才会触发下载。被拒绝、缺失或授权失败会让消息文本保持不变，且不会发出任何凭证化的请求。

定时任务和通知（`deliver=buzz`）会投递到**主频道** —— 若设置了 `BUZZ_HOME_CHANNEL` 则使用它，否则使用第一个监听的频道 —— 并且即使定时任务在网关进程之外运行也能工作。

## 入站附件

带有原生 NIP-94 `imeta` 标签的 Buzz 消息可以向智能体投递图片、音频、视频和文档。Hermes 只有在消息通过了自回显、呼及和发送者授权检查之后才会下载附件。每个文件必须使用 HTTPS 并声明精确的字节大小和 SHA-256 摘要；重定向、URL 凭据、片段、超大载荷以及完整性不匹配都会被拒绝。

中继自身的 HTTPS 来源会被自动信任。如果某个社区将媒体存储在另一公共来源上，请将其精确的 `host` 或 `host:port` 添加到 `gateway.platforms.buzz.extra` 下的 `attachment_hosts`。非默认端口必须显式列出。需要通过 Buzz CLI 进行认证获取的受保护媒体不由此原生公共 URL 路径处理。

## 运行网关

```bash
hermes gateway start
```

用 `hermes gateway status` 检查状态 —— Buzz 连接状态会在那里报告，仅环境变量的配置也会显示。

## 注意事项和限制

- **`BUZZ_*` 环境变量在 Buzz 会话的终端工具子进程中可用** —— 智能体可以直接调用 `buzz` CLI（例如 `buzz messages send ...`），因为当会话的平台是 `buzz` 或进程是 Buzz Desktop 托管智能体（`BUZZ_MANAGED_AGENT`）时，`BUZZ_PRIVATE_KEY`、`BUZZ_AUTH_TAG`、`BUZZ_RELAY_URL` 及其他 `BUZZ_*` 变量会传递给终端子进程。同一主机上的非 Buzz 会话、`execute_code` 以及其他非终端派生仍保持封闭。
- **入站是轮询而非流式的。** `buzz` CLI 是请求/响应式的，因此适配器每隔 `poll_interval` 秒（默认 4）对每个监听的频道轮询一次 `buzz messages get`。入站消息预期最多有一个间隔的延迟。未来的优化方向是 websocket 传输（Buzz 仓库提供了 `buzz-ws-client` 用于真正的流式传输）。
- 在（重新）连接时，适配器会从最新事件播种其高水位标记，因此频道历史永远不会被重放给智能体。
- 新的私信会话会被自动发现（每隔几次轮询扫描）。
- 私钥通过子进程环境传递给 CLI —— 它永远不会出现在 argv 或日志中。
