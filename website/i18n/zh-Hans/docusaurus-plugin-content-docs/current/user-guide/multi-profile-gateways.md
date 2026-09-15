---
sidebar_position: 4
---

# 同时运行多个网关

在单台机器上以托管服务的形式运行多个 [配置档](./profiles.md) —— 每个都有自己的机器人令牌、会话和记忆。本页介绍运维相关的内容：一起启动它们、跨配置档查看日志、防止主机休眠，以及从常见的 launchd/systemd 问题中恢复。

如果你只运行一个 Hermes 智能体，就不需要本页 —— 基础内容请参阅[配置档](./profiles.md)。如果你的实例位于*不同*机器上、而一个桌面应用需要同时连接它们，请参阅[将 Desktop 连接到多个 Hermes 实例](./multi-connection-desktop.md)。

## 何时使用

当你有两个或更多 Hermes 智能体需要同时在线时，就需要这套配置。常见原因：

- 一个个人助理运行在一个 Telegram 机器人上，一个编码智能体运行在另一个上
- 每个家庭成员一个智能体，或每个 Slack 工作区一个
- 同一配置的沙箱 + 生产实例
- 一个研究智能体 + 一个写作智能体 + 一个定时任务驱动的机器人 —— 各自拥有隔离的记忆和技能

每个配置档本来就会获得它自己的、按平台区分的 LaunchAgent（`ai.hermes.gateway-<name>.plist`）或 systemd 用户服务（`hermes-gateway-<name>.service`）。本指南补充的是统一管理它们的模式。

## 快速开始

```bash
# Create profiles (once)
hermes profile create coder
hermes profile create personal-bot
hermes profile create research

# Configure each
coder setup
personal-bot setup
research setup

# Install each gateway as a managed service
coder gateway install
personal-bot gateway install
research gateway install

# Start them all
coder gateway start
personal-bot gateway start
research gateway start
```

就这样 —— 三个相互独立的智能体，各自运行在自己的进程中，崩溃时自动重启，用户登录时也会启动。

## 替代方案：一个网关服务所有配置档（多路复用）

上面的模型为**每个配置档运行一个进程**。这是默认行为，对大多数配置来说是正确选择。但在拥有大量配置档的主机上 —— 或者在每个配置档一个进程运维成本过高的容器化部署中 —— 你可以改为运行**单个多路复用网关**：默认配置档的网关成为唯一的入站进程，并为机器上*每一个*配置档处理消息。

这是**自愿启用**且**默认关闭**的。关闭时，本页内容都不会改变 —— 下述所有行为都是空操作。

### 何时优先选择多路复用

- 容器/VPS 部署中，N 个 supervisor 单元、N 个端口和 N 个 PID 文件是负担。
- 大量低流量配置档，每一个都不值得占用完整进程。
- 你希望只有一个东西需要启动、监控和重启。

当你想让配置档之间保持严格的进程级隔离（独立的内存占用、独立的崩溃域、能不触碰其他配置档就重启某一个配置档的能力）时，请坚持每个配置档一个进程。

### 如何启用

在**默认配置档**上设置该标志（它拥有多路复用器）并重启其网关：

```bash
hermes config set gateway.multiplex_profiles true
hermes gateway restart
```

等价地，在默认配置档的 `~/.hermes/config.yaml` 中：

```yaml
gateway:
  multiplex_profiles: true
```

（为方便起见，该标志也接受顶层的 `multiplex_profiles: true`。）下一次启动时，默认网关会枚举每个配置档，使用各配置档自己的凭据启动其已启用的平台，并将每条入站消息路由到它所属的配置档。每一轮都会解析被路由到的配置档的配置、技能、记忆、SOUL **以及服务商密钥** —— 凭据绝不会在配置档之间共享。

你**不需要**为次级配置档运行 `hermes gateway start` —— 默认网关会为它们服务。契约变更见下文。

### 启用多路复用后会有什么变化

启用该标志会改变一些行为方式。标志一关闭，这些都是立即恢复原样。

#### 1. 次级配置档不得启动自己的网关

多路复用器运行时，具名配置档的 `hermes gateway run`、`start`、`install` 或 `restart` 都是**硬错误**（退出码 78），会把你指回多路复用器：

```
The default gateway is running as a profile multiplexer and already serves
profile 'coder'. ...
```

拒绝发生在 CLI 中、在触及任何服务管理器之前，因此被服务的配置档绝不会留下永久失败的 systemd 单元或 launchd 重生循环。当 coder 没有自己的网关时，`hermes -p coder gateway stop` 同样会以相同方式拒绝（退出码 78）—— 除多路复用器外没有可停止的东西，而在默认配置档上执行 `hermes gateway stop` 会为所有被服务的配置档一并关停该多路复用器。dashboard 和 Desktop 应用遵循 CLI 的行为：对于被服务的配置档，"Start" 和 "Stop" 网关操作会以 `409` 响应并给出相同解释（在系统页上以内联提示呈现），而 "Restart" 会重启多路复用器（真正为该配置档提供服务的进程），而不是去启动一个只会失败的 `-p coder gateway restart`。由于该重启会重连设备上的每个机器人，这两个应用都会先询问 *"Restart the shared gateway? All bots on this device reconnect: default, coder, research"*（列表即运行中网关的 `served_profiles`），并在完成时报告 *"Shared gateway restarted (3 bots)"*。独立配置档保持普通重启语义。`/api/status?profile=coder` 会以 `gateway_shared_with` 携带相同的列表（独立网关为 null）。
"被服务"这一状态读取自运行中网关自己的记录（默认 home 中 `gateway_state.json` 的 `served_profiles`），因此当多路复用器仅通过默认配置档环境中的 `GATEWAY_MULTIPLEX_PROFILES` 启用时，或者在网关启动之后才添加了配置档时，它依然保持正确。

多路复用器是唯一的入站进程；第二个配置档网关会导致该配置档的平台被双重绑定。只有当你确实想为该配置档使用单独进程时，才传 `--force`（`run`、`start`、`install` 和 `restart` 均接受），而在多路复用器运行时并不推荐这样做。因此，本页前面提到的跨配置档生命周期包装脚本在多路复用模式下**不**使用 —— 你只需管理默认网关。

#### 2. HTTP 入站平台通过 `/p/<profile>/` URL 前缀访问

次级配置档的 HTTP 入站流量通过配置档前缀抵达默认配置档的**同一个**监听器，而**不是**第二个端口：

```
# 默认配置档
POST http://host:8644/webhooks/<route>
# "coder" 配置档，同一监听器
POST http://host:8644/p/coder/webhooks/<route>
```

前缀中未知或未配置的配置档返回 `404`。共享监听器是默认配置档的 `api_server` 端口（未启用 API server 时则是其 `webhook` 端口）；它提供三类带配置档前缀的路径：

- **`api_server` 与 `webhook` 是镜像的**，而绝不会重复。`/p/coder/v1/...`
  和 `/p/coder/webhooks/<route>` 由默认配置档自身的适配器在 coder 的作​​用域下应答。因此次级配置档**不得**自行启用
  `api_server` 或 `webhook`（仪表盘会以 `409` 拒绝；次级配置档的 `.env` 中出现
  `API_SERVER_KEY` 或 `WEBHOOK_ENABLED` 只会写入凭据而不会启动监听器）。
- **所有其他入站端口平台以共享监听器模式运行。** 配置了 Twilio SMS、LINE、Teams、BlueBubbles、Microsoft
  Graph、WhatsApp Cloud、WeCom 回调或 Feishu webhook 模式的次级配置档会构建其**自己的**
  适配器实例而不绑定端口；默认监听器将
  `/p/<profile>/<the adapter's usual path>` 转发给它。参见
  [多路复用器下的入站端口平台](#inbound-port-platforms-under-the-multiplexer)。

认证遵循 URL 中指定的配置档。非前缀端点继续使用默认监听器现有的凭据。

- `/p/coder/...` API-server 请求必须使用
  `~/.hermes/profiles/coder/.env` 中的 `API_SERVER_KEY`；默认监听器的密钥会被拒绝。在多路复用器下，该密钥仅认证该前缀——它不会在次级配置档中开启第二个 `api_server` 监听器，因此你无需在次级配置档的 `config.yaml` 中固定 `platforms.api_server.enabled: false`。
- 目标为 `coder` 的 webhook 路由必须在其默认配置档 `config.yaml` 中现有的路由专属
  `secret` 旁声明 `profile: coder`。该 secret 之后仅在
  `/p/coder/webhooks/<route>` 被接受，并会在其他所有配置档前缀上被拒绝。
- 没有 `profile` 的 webhook 路由仍是默认配置档路由，无法通过命名的配置档前缀访问。动态订阅以同样方式绑定：`hermes webhook subscribe <name> --route-profile coder` 会将
  `profile: coder` 写入默认网关的 `webhook_subscriptions.json`，并打印 `/p/coder/webhooks/<name>` URL（`hermes webhook ls` 会显示该绑定）。请使用 `--route-profile`，而非全局的 `-p coder`：`-p` 会将订阅写入 coder 自己的订阅文件，而默认网关的 webhook 适配器从不读取该文件。
- 投递遵循同样的绑定。`profile: coder` 路由的回复（或
  `deliver_only` 消息）会通过 **coder 的**适配器发送到 `deliver` 平台，当
  `deliver_extra.chat_id` 未设置时回退到 **coder 的** home 频道，而
  `github_comment` 投递会使用 `profiles/coder/.env` 中的 `GH_TOKEN` / `GITHUB_TOKEN` 运行 `gh`。如果 coder 没有该平台的适配器，投递会失败（502），而不是以其他配置档的机器人身份发布；默认路由同样绝不会借用仅在次级配置档上启用的平台。
- `/p/coder/api/platforms/<platform>/events` 回调由 coder 的适配器验证并分发；当 coder 没有适配器时，该回调返回 503。

当目标配置档没有
`API_SERVER_KEY` 时，命名 API 请求会安全失败（fail closed）。安全配置错误仍然是致命的：例如，一个
`open` 自有策略平台若没有 `GATEWAY_ALLOW_ALL_USERS` 或其平台特定的全允许选项，仍会使网关启动中止，而不是静默丢弃该不安全的配置档。

#### 多路复用器下的入站端口平台

独立的 `hermes -p coder gateway run` 会将 coder 的 Twilio、LINE、Teams、
… webhook 服务器绑定在各自的端口上。在多路复用器下，这些适配器仍然属于 coder——来自 `profiles/coder/.env` 的相同凭据、相同的
`config.yaml`，回复通过 coder 的渠道发送——但它们**不绑定任何端口**。
默认配置档的共享监听器将 `/p/coder/<path>` 转发给它们，其中
`<path>` 正是适配器独立运行时对应的路径。请求由 **coder 的**适配器使用 **coder 的** secret 验证（Twilio 认证令牌、LINE
渠道 secret、Teams 应用凭据、BlueBubbles 密码……），并在
coder 的运行时作​​用域下运行；默认配置档自身的 `/path` 不受影响，而路径没有对应适配器的配置档会得到 `404`，绝不会得到其他配置档的机器人。

| 平台 | 共享监听器上次级配置档的回调 URL | 使用命名配置档的什么进行验证 |
|---|---|---|
| Twilio SMS（`sms`） | `https://<host>/p/<profile>/webhooks/twilio` | `TWILIO_AUTH_TOKEN` 签名（`SMS_WEBHOOK_URL` 必须是此 URL） |
| LINE（`line`） | `https://<host>/p/<profile>/line/webhook`（媒体：`/p/<profile>/line/media/...`） | `LINE_CHANNEL_SECRET` |
| Microsoft Teams（`teams`） | `https://<host>/p/<profile>/api/messages` | `TEAMS_CLIENT_ID` 的 Bot Framework 令牌 |
| BlueBubbles（`bluebubbles`） | `http://<host>/p/<profile>/bluebubbles-webhook`（自动向服务器注册） | `BLUEBUBBLES_PASSWORD` |
| Microsoft Graph（`msgraph_webhook`） | `https://<host>/p/<profile>/msgraph/webhook` | `extra.client_state` |
| WhatsApp Cloud（`whatsapp_cloud`） | `https://<host>/p/<profile>/whatsapp/webhook` | `WHATSAPP_CLOUD_APP_SECRET` / 验证令牌 |
| WeCom 回调（`wecom_callback`） | `https://<host>/p/<profile>/wecom/callback` | 应用的 callback token / AES key |
| Feishu webhook 模式（`feishu`） | `https://<host>/p/<profile>/feishu/webhook` | `FEISHU_VERIFICATION_TOKEN` / `FEISHU_ENCRYPT_KEY` |

`<host>` 是默认配置档监听器前面的公共主机名（隧道、反向代理）；配置档配置中的自定义 `webhook_path` 会相应地移动 `/p/<profile>` 之后的路径。网关会在启动时记录确切的 URL：

```
[sms] profile 'coder' is served on the default profile's shared listener:
http://127.0.0.1:8642/p/coder/webhooks/twilio (point the vendor's callback URL at this path ...)
```

每个状态显示界面都会重复它，这样你就知道该把什么粘贴到厂商控制台：

```
$ hermes -p coder gateway status
✓ Gateway is running via the default-profile multiplexer
  Manage it from the default profile: hermes gateway status

Inbound callback URLs on the shared listener:
  line: http://127.0.0.1:8642/p/coder/line/webhook
  sms: http://127.0.0.1:8642/p/coder/webhooks/twilio
```

默认配置档上的 `hermes gateway status` 和 `hermes status` 会按被服务的配置档列出相同的 URL，而仪表盘的 Channels 页面和 Desktop 的 Messaging 页面在查看该配置档时会将其显示为各平台的 `ingress_url`。默认配置档自身的 `api_server` 和 `webhook` 也会以同样方式为被服务的配置档报告——显示为**已连接**，`ingress_url` 为
`http://127.0.0.1:8642/p/coder/v1`（分别为 `.../p/coder/webhooks/<route>`）——因为该配置档自身没有对应的适配器；实际是默认配置档的监听器在 `/p/coder/` 前缀下应答。次级配置档 `.env` 中按配置档设置的
`SMS_WEBHOOK_PORT`、`LINE_PORT`、`TEAMS_PORT`……在多路复用器下会被忽略（不会绑定任何内容）；一旦该配置档运行自己的独立网关，它就重新生效。

#### 3. 按凭据区分的平台仍需要每个配置档自己的令牌

轮询/连接类平台（Telegram、Discord、Slack、Matrix、Signal 等）多路复用没有问题，但每个启用它们的配置档都必须提供它**自己**的机器人令牌——同一个令牌不能被两个配置档同时轮询。如果两个配置档配置了相同的 `(platform, token)`，网关会记录一条错误日志并同时列出这两个配置档，然后停用那个**重复的**适配器（在运行时状态中显示为 `fatal / duplicate_credential`），而首个声明者和所有其他配置档继续运行——网关本身不会退出。默认配置档的适配器先连接并声明其凭据，因此被停用的适配器总是次要配置档的（参见[令牌冲突安全](#token-conflict-safety)——规则未变，只是现在是在单一进程内强制执行）。

#### 4. 会话键按配置档进行命名空间隔离

每个配置档的会话都位于 `agent:<profile>:…` 命名空间下，因此同一平台/聊天上的两个配置档绝不会在共享会话存储中发生冲突。**默认**配置档逐字节保留历史性的 `agent:main:…` 命名空间，因此现有的默认配置档会话不受影响——无需迁移，不会产生孤立的历史记录。每一条会回读键的网关路径——重启后的委托完成通知、关闭通知、对同级运行的按用户线程 `/stop`、`/undo`、QQ 审批按钮——也都接受 `agent:<profile>:…` 形式，因此次要配置档获得与默认配置档相同的行为。唯一会与默认命名空间冲突的配置档名，即将配置档恰好命名为 `main` 的情况，会被键名为 `agent:main~:…`，从而保留它自己的会话和自己的 `profiles/main/state.db`。

每个配置档的行数据落入**它自己的** `state.db`：命名配置档的位于 `profiles/<name>/state.db`，默认配置档的位于启动主目录下——即便写入发生在另一个配置档的路由回合或后台 tick 中也是如此。Desktop/TUI 后端自己的存储同样固定在其启动时所在的主目录下，而 Bot Chat 的侧智能体（`prompt.background`）则持久化在其父对话旁边。

#### 5. 单一 PID/锁与单一状态界面

只有一个进程级 PID 和锁（多路复用器，位于默认主目录下）。对默认配置档执行 `hermes status` 会报告多路复用器并列出它服务的配置档（`Serves: coder, research`）；`hermes -p coder status`、`hermes -p coder gateway status` 和 `hermes -p coder cron status` 都报告"通过默认配置档多路复用器运行"而非"已停止"，仪表盘的 `/api/status?profile=coder` / Channels 页面也将多路复用器报告为 coder 正在运行的网关（以 coder 自己的适配器作为其平台）。单一的 `gateway_state.json` 位于默认主目录下：次要适配器在那里以 `<profile>:<platform>` 条目的形式出现在 `served_profiles` 旁边；次要配置档的主目录下不会写入任何内容。

#### 什么**不会**改变

按配置档的 `.env` 凭据隔离得以保留，甚至更为严格：配置档的键从其自身作用域解析，绝不会并入共享环境。MCP 服务器和 Kanban worker 之类的子进程只看到它们自己配置档的机密——包括由外部机密源（1Password、Bitwarden 等）注入的凭据：为配置档 B 启动的 stdio MCP 服务器接收到的是此类名称在 B 中的值，如果 B 没有则为空，绝不会收到默认配置档的。MCP 服务器按配置档连接：两个配置档都用一个自己的令牌同名命名 `github` 服务器时，会得到两个连接，各自只看到自己的工具；`mcp_servers` 条目完全相同（相同路由**且**相同凭据，包括 mTLS `client_cert`/`client_key`）的配置档共享一个连接，拥有者的 `/reload-mcp` 会重新注册共享方配置档的工具，而无需它们重新加载。`auth: oauth` 服务器绝不会跨配置档共享：每个配置档在它自己的 `mcp-tokens/` 下持有自己的令牌并打开自己的连接。信任策略按配置档保留：一个 `trust: untrusted` 配置档若共享 `trust: full` 配置档的连接，在每次具备写入能力的调用之前仍会被询问，而 `supports_parallel_tool_calls` 仅适用于设置它的配置档。终端设置（`terminal.backend`、`terminal.cwd`、`terminal.docker_volumes`、`terminal.docker_shared_container_key`、SSH 目标等）同样在每个路由回合按配置档解析：省略终端键的配置档获得文档规定的默认值，绝不会获得启动配置档的值，而 `config.yaml`/`.env` 无法解析的配置档，其终端执行会被拒绝，而不是在另一个配置档的沙箱策略下运行。媒体传送凭据防护（`MEDIA:` 附件背后的拒绝列表——`.env`、`auth.json`、`config.yaml`、`state.db`、会话转录、OAuth 令牌存储）覆盖 `profiles/` 下的每一个配置档，因此任何配置档的回合都无法将另一个配置档的机密或聊天历史附加到回复中。授权同样按配置档进行：`GATEWAY_ALLOW_ALL_USERS`、`GATEWAY_ALLOWED_USERS` 以及每一个平台白名单或全员放行选项都从所属配置档的 `.env` 读取——默认配置档选择开放访问绝不会打开次要配置档的机器人，而次要配置档仅在其自己的 `.env` 中选择加入则会被遵照。写入配置档 `config.yaml` 中的按机器人行为（`require_mention`、`mention_patterns`、`allow_bots`、`reactions`、`auto_thread`、`dm_policy`、`ignored_channels`、Matrix `session_scope` 等）同样如此：次要配置档的 YAML 绝不会落入共享进程环境，因此它无法成为默认配置档的策略，默认配置档的 YAML 也绝不会支配次要机器人。`terminal.env_passthrough` 白名单、Yuanbao 自动指定的主频道，以及保护每个配置档自身 `config.yaml` 的写入防护，也都按配置档解析。Kanban、配置档作用域的技能/记忆/SOUL，以及模型路由的行为都与使用独立网关时完全一样，逐配置档生效。

出站身份同样按配置档进行。为配置档 `P` 运行的回合若调用 `send_message` 工具（发送、react、媒体），会通过 `P` 自己的机器人发布；针对 `P` 会话的"Gateway shutting down/restarted"和 `/update` 通知、从 `P` 的聊天设置的 `/loop` 唤醒，以及 `P` 的 Discord 机器人的 Discord 未授权斜杠操作员警报（发往 `P` 的主频道）也是如此。如果 `P` 没有为该平台连接机器人，发送会明确报错失败——绝不会回退到默认配置档的机器人。

工具和记忆服务商凭据遵循同样的规则。托管 OCR（`FIRECRAWL_API_KEY`）、Modal / Browser Use 云门禁、mem0 OSS OpenAI 键、xAI video，以及每一个记忆服务商身份（`MEM0_USER_ID`、`SUPERMEMORY_CONTAINER_TAG`、`RETAINDB_PROJECT`、`OPENVIKING_ACCOUNT/USER`、`HINDSIGHT_BANK_ID`、`HERMES_HONCHO_HOST`）都从被路由配置档的 `.env` 读取，因此次要配置档的记忆落入**它自己的**账户/库/项目（或该服务商的按配置档默认值），绝不会落入默认配置档的。自定义端点随其密钥一起传递——`OPENAI_BASE_URL`、`XAI_BASE_URL`、`NOUS_INFERENCE_BASE_URL`、`GATEWAY_PROXY_URL`、Firecrawl / Browserbase / RetainDB / Supermemory / Honcho / Hindsight 的 URL——因此一个配置档的密钥绝不会被发送到另一个配置档的代理或自托管服务器。`WEIXIN_HOME_CHANNEL`、`HERMES_LANGUAGE` 和 `display.language`，以及 `hooks.outbound[].secret_env` 同样按配置档进行，被逐出的次要会话的会末记忆提取也在该配置档的作用域下运行。

按回合的运行时设置也跟随被路由的配置档：`agent.max_turns`、`fallback_providers`、`file_read_max_chars`、`tool_output.*`、`browser.*` 超时、`timezone`（包括交给 `execute_code` 沙箱的 `TZ`）、媒体传送策略（`gateway.strict`、`media_delivery_allow_dirs`、`trust_recent_files*`）以及用于辅助调用的 Nous `auth.json`，都从服务该回合的配置档读取，而绝不是从启动网关时的配置档读取。按配置档的状态文件（`processes.json`、`checkpoints/`、沙箱快照存储、Feishu 评论规则/配对）和网关钩子同样如此：每个配置档的 `hooks/` 目录独立加载，并仅针对该配置档的事件触发。Shell 钩子以被路由配置档的 `HERMES_HOME` 运行，其环境中不含默认配置档的机密，其 stdin 载荷携带一个 `profile` 字段，指明触发它们的配置档。

#### 每个配置档隔离的内容

一份快速参考，说明多路复用的一轮对话从**它自己的**配置档解析哪些内容，而绝不与默认配置档或任何同级配置档共享：

| 关注项 | 解析来源 | 配置档缺少该项时的行为 |
|---|---|---|
| 服务商密钥、机器人令牌、`config.yaml` 中的 `${VAR}` 引用 | 配置档自己的 `.env`（及其密钥作用域） | 未解析 / 无适配器——绝不使用默认配置档的值 |
| 授权（`GATEWAY_ALLOW_ALL_USERS`、`GATEWAY_ALLOWED_USERS`、各平台的允许列表与全部允许选项） | 所属配置档的 `.env` 和 `config.yaml` | 关闭——默认配置档的授权开关绝不打开次级配置档的机器人 |
| HTTP 端点（`/p/<profile>/api/...`、`/p/<profile>/webhooks/...`、平台事件回调） | 指定名称配置档的 `API_SERVER_KEY`、绑定 `profile:` 的 webhook 路由及其自己的适配器 | `401`/`404`；无适配器时投递为 `502`/`503`，绝不使用其他配置档的机器人 |
| 入站端口平台（`/p/<profile>/webhooks/twilio`、`/p/<profile>/line/webhook`、`/p/<profile>/api/messages` 等） | 指定名称配置档自己的适配器及其密钥（Twilio 认证令牌、LINE 频道密钥、Teams 应用、BlueBubbles 密码等）；回复经该适配器发出 | 密钥错误时 `401`/`403`，配置档无此类适配器时 `404`——绝不使用默认配置档的适配器 |
| 适配器设置（`*_REQUIRE_MENTION`、`*_REACTIONS`、`*_ALLOW_BOTS`、`*_PROXY`、Discord 的 `allow_mentions`、Matrix 的 `allowed_users` / `ignore_user_patterns`、webhook 主机/端口/URL、Matrix 线程/会话/E2EE 策略、Discord 回填/附件上限、Buzz 回复模式、A2A 智能体卡片 / 公开 URL、WhatsApp 桥接策略、Yuanbao 主频道） | 所属配置档，按以下顺序：显式的 `.env` 值 → 其 `config.yaml` → 适配器的默认值 | 适配器文档所述的默认值——绝不使用默认配置档的设置。（单配置档安装在所有情形下均保持 YAML 被环境变量覆盖的原则，与各平台文档所述完全一致。） |
| `MEDIA:` 附件拒绝列表 | 检查时枚举 `profiles/` 下每个 home 加上默认 home | 一轮对话绝不能附带其他配置档的 `.env`、`auth.json`、`state.db`、会话或令牌存储 |
| stdio MCP 子进程环境 | 安全基线 + 配置档对密钥来源名称的作用域值 + 服务器自己的 `env:` | 配置档缺少的名称在子进程中缺失——不发生默认配置档穿透 |
| 出站出口（`send_message`、关闭/重启/`/update` 通知、`/loop` 唤醒、绑定 `profile:` 的 webhook 投递、`github_comment` 令牌） | 配置档自己已连接的适配器和 `.env` | 明确的失败；绝不通过默认配置档的机器人发帖 |
| 会话命名空间 | `agent:<profile>:…`（默认保持 `agent:main:…`） | 同一聊天上的两个配置档绝不共享历史 |
| 日志 | 配置档自己 home 下的 `agent.log` / `errors.log` / `gateway.log` | — |
| 终端沙箱设置（`terminal.*`、SSH 目标） | 配置档的 `config.yaml` | 文档所述的默认值；无法解析的配置 → 拒绝执行 |
| 一轮对话的工作目录（未设置 `terminal.cwd`） | 与独立网关相同的规则：本地后端为 `$HOME`，其他情况为沙箱默认值 | 绝不是启动多路复用器进程所在目录 |
| 命令审批（`command_allowlist`、"always" 选择） | 配置档自己的 `config.yaml` | 默认配置档的 "always" 绝不预先批准次级配置档的命令；次级配置档的选择保存到其自己的配置 |
| 沙箱凭据文件挂载（`terminal.credential_files`）、`security.redact_secrets`、`browser.*` 引擎/有头标志、`lsp.*`、辅助服务商健康标记、`logs/mcp-stderr.log` | 配置档自己的 `config.yaml` / `.env` | 文档所述的默认值——绝不是启动配置档的缓存值 |
| 云 SDK 凭据客户端（Bedrock boto3 客户端 + 模型发现、Azure Entra 凭据）、凭据拉取的目录（DeepInfra、Copilot 上下文限制、Nous 推理想象上限、Ramp Router 努力档位、xAI / OpenRouter 图像模型、自定义端点 `/models`）、Camofox VNC 地址、计算机使用辅助视觉路由、技能同步推送、远程后端探测文本、习得的图像 token 成本、`display.skin`、访客铸币退避、横幅 skills、Yuanbao "active" 适配器、Langfuse 客户端 | 配置档自己的 `.env` / `config.yaml` / `<home>/cache` | 文档所述的默认值——绝不是启动配置档的缓存值或其凭据 |
| 会话搜索开关（`sessions.cjk_fts`、`sessions.search_slow_ms`） | 配置档的 `config.yaml` | 文档所述的默认值——绝不是默认配置档的桥接值 |
| 平台代理（`TELEGRAM_PROXY`、`DISCORD_PROXY`、`HTTPS_PROXY` 等） | 配置档自己的 `.env` | 直接连接——绝不使用默认配置档的代理 |
| Desktop/dashboard 后端中的 MCP 发现 | 每个被服务的配置档 home 各一次 | 在另一配置档已构建智能体之后选中的配置档仍会发现它自己的 `mcp_servers` |
| Dashboard 操作（Desktop/dashboard 启动的 `hermes -p <name> …`） | 固定到该配置档 `HERMES_HOME` 的剔除后子进程环境 | 子进程加载它自己的 `.env`；不继承 dashboard 配置档的令牌与端口 |
| Cron `.env` 调优（`HERMES_CRON_TIMEOUT`、`HERMES_MODEL` 回退、`HERMES_CRON_MAX_PARALLEL`、预填文件）、worker / Bot Chat 子进程环境 | 配置档自己的 `.env`；子进程绝不继承默认配置档的 `.env` 设置或桥接的 `TERMINAL_*` 策略 | Cron 默认值 / 模型拒绝，与独立的 `hermes -p <name> gateway run` 完全一致 |
| 某配置档任务的看板 worker 与通知 | 负责人的 `.env` + `config.yaml`（工具集固定、终端后端、媒体策略、显示语言） | — |
| `/loop` 计时、`background_process_notifications` 开关、`notice_delivery`、后台进程检查点恢复 | 所属配置档的 `state.db` / `config.yaml` / `processes.json` | — |

**设计上共享**的内容：进程、其 PID/锁与 `gateway_state.json`（默认 home）、唯一的 HTTP 监听器，以及 `profile_routes` 表（在默认配置档上声明）。

### 哪些配置档会被提供服务

`gateway.multiplex_profiles: true` 会为默认配置档以及 `profiles/` 下**每一个**
存活的具名配置档提供服务——不存在按配置档的排除名单。
（原来的 `gateway.multiplex_profile_allowlist` 键已废弃；配置迁移会将其从
`config.yaml` 中移除，你不想提供服务的配置档改为归档或删除——使用
`hermes profile delete <name>`，或将该目录移出 `profiles/`。）已删除的配置档会留下墓碑标记，永远不会被枚举；目录已消失的配置档永远不会被提供服务的轮次、定时任务计时器或日志路由重新创建。

被提供服务的集合控制 `/p/<profile>/` API 与 webhook 前缀、运行时状态、配置档路由资格，以及进程内定时任务调度器为哪些配置档计时（Desktop 后端的计时器枚举同一集合，并对任何已由运行中的多路复用器或其自身网关提供服务的配置档让位）。以 `hermes -p <name> gateway run` 启动的多路复用器始终会为其自身配置档的定时任务存储计时。

被提供服务的集合是**实时的**。多路复用器运行期间创建的配置档（通过 `hermes profile create`、仪表盘、Desktop 或 TUI）会立即被提供服务：创建方通过控制套接字向多路复用器发送 ping，多路复用器还会每 30 秒重新扫描 `profiles/` 作为安全网。新配置档的适配器会在其 `config.yaml`/`.env` 带有 bot token 的那一刻构建（创建方通常先创建，再添加 token），默认配置档的 `gateway_state.json` 中的 `served_profiles` 会更新，且 `hermes -p <name> gateway status` 会报告其已被提供服务——无需重启，其他配置档的适配器和进行中的轮次不受影响。删除配置档也会以同样方式停止并取消路由其适配器，而 `hermes profile rename` 会在目录移动前取消旧名称的路由，并热提供新名称的服务（仍绑定到旧名称的适配器或定时任务计时器不会使其复活）。一凭据一轮询器规则仍然适用：热添加的配置档若复用了另一配置档的 token，会被以 `duplicate_credential` 错误搁置，绝不会作为第二个轮询器启动。

### 将共享 bot 的聊天路由到配置档（`profile_routes`）

多路复用按**凭据**（每个配置档自己的 bot token）或按 **URL 前缀**（HTTP 平台使用 `/p/<profile>/`）来选择配置档。当多个社区共享**一个** bot token 时——例如一个 Discord bot 服务多个服务器——你可以额外用 `gateway.profile_routes` 将特定的服务器/频道/线程路由到不同的配置档：

```yaml
gateway:
  multiplex_profiles: true
  profile_routes:
    # 整个 Discord 服务器 → 一个配置档
    - name: acme-server
      platform: discord
      guild_id: "1234567890"
      profile: acme

    # 该服务器中的一个频道 → 另一个配置档
    - name: acme-support
      platform: discord
      guild_id: "1234567890"
      chat_id: "9876543210"
      profile: acme-support

    # 一个 Telegram 群组（没有服务器概念——只有 chat_id）
    - name: tg-group
      platform: telegram
      chat_id: "-1001234567890"
      profile: tg-profile

    # 一个 WhatsApp 私聊——写入电话号码；JID 和 LID 形式也能匹配
    - name: owner-whatsapp
      platform: whatsapp
      chat_id: "15551234567"
      profile: owner
```

路由按最具体优先（`thread_id` > `chat_id` > `guild_id`）匹配，所有声明的字段都必须成立（AND），基于某个频道的路由还会匹配其父级为该频道的线程/论坛帖子。不匹配任何路由的消息保留在默认/活动配置档上。被路由到的配置档会获得上文所述的完整按配置档隔离（配置、技能、记忆、凭据、会话命名空间）。路由在所有平台适配器上都有效，不只是 Discord。

除非用 `bot_profile: <profile>` 指明另一个 bot，否则路由只适用于**默认配置档的 bot** 接收到的消息。Telegram 私聊对每个 bot 使用相同的 `chat_id`（用户 id），因此若不指明，一条本为共享 bot 准备的 `chat_id` 路由也会捕获该用户与某个次级配置档专用 bot 的私聊。到达次级配置档自己 bot 的消息保留在该配置档中：

```yaml
    # 将某用户与 team_b 自己 bot 的私聊固定到第三个配置档
    - name: teamb-owner-dm
      platform: telegram
      bot_profile: team_b
      chat_id: "72719239"
      profile: ops-for-team-b
```

被路由消息的授权始终由**接收 bot 的配置档**（其 token 和允许名单）决定，包括 agent 忙碌时发送的后续消息以及 `/topic` 或 `/stop` 等轮次中途检查；被路由到的配置档本身无需持有允许名单的副本。自身没有 bot 的被路由配置档还会在网关重启后通过共享 bot 接收后台通知（进程完成、心跳、异步委派结果）。

在 WhatsApp 和 WhatsApp Cloud 上，`chat_id` 路由会跨用户身份形式匹配：纯电话号码（`15551234567`）、JID
（`15551234567@s.whatsapp.net`）和 LID（`…@lid`）在桥接配对后都指向同一个人（与规范化会话键和适配器允许名单已使用的相同规范化一致）。你可以把电话号码放进
`profile_routes`，无论 WhatsApp 投递的是 JID 还是 LID，入站私聊都仍会匹配。尚无 LID 映射时，号码形式仍能匹配 JID（后缀会被去除），但无法解析未知的 LID——该入站消息会落到默认配置档，直到映射出现。群聊（`…@g.us`）不是发送者身份，仍精确匹配。Telegram 数字 id 不变。

`profile_routes` 需要 `gateway.multiplex_profiles: true`；多路复用关闭时路由会被忽略。若某条显式路由匹配但目标配置档未安装（或已被删除），网关会拒绝该入站请求并记录该路由及目标。它不会改用默认配置档运行。不匹配任何路由的流量保持历史上的默认配置档行为。

被路由配置档拥有的定时任务也会通过共享 bot 投递，但仅限投递到某个已启用且带有 `chat_id`/`thread_id` 的路由映射到该配置档的目标（`guild_id + chat_id` 路由可使其频道合格）——被路由配置档的定时任务若指向未路由的聊天（或路由到其他配置档的聊天），绝不会通过共享 bot 发送。仅基于服务器（guild）的路由不能使定时任务目标合格；请为投递频道添加一条 `chat_id` 路由。该被路由配置档无需为此拥有自己的 `platforms.<platform>` 块：共享 bot 的授权来自路由，而非来自该附属配置档的配置。

## 一次性启动、停止或重启所有网关

CLI 内置的是单配置档的生命周期命令。若要对所有配置档生效，把它们包进一个 shell 循环即可。把下面的片段保存为 `~/.local/bin/hermes-gateways` 并执行 `chmod +x`：

```sh
#!/bin/sh
set -eu

# 在你创建 / 删除配置档时，在这里增删配置档名称。
profiles="default coder personal-bot research"

usage() {
  echo "Usage: hermes-gateways {start|stop|restart|status|list}"
}

run_for_profile() {
  profile="$1"
  action="$2"
  if [ "$profile" = "default" ]; then
    hermes gateway "$action"
  else
    hermes -p "$profile" gateway "$action"
  fi
}

action="${1:-}"
case "$action" in
  start|stop|restart|status)
    for profile in $profiles; do
      echo "==> $action $profile"
      run_for_profile "$profile" "$action"
    done
    ;;
  list)
    hermes gateway list
    ;;
  *)
    usage
    exit 2
    ;;
esac
```

然后：

```bash
hermes-gateways start      # 启动所有已配置的配置档
hermes-gateways stop       # 停止所有已配置的配置档
hermes-gateways restart    # 重启全部
hermes-gateways status     # 查看所有配置档的状态
hermes-gateways list       # 委托给 `hermes gateway list`
```

:::tip
`default` 配置档要通过 `hermes gateway <action>`（不带 `-p`）来操作，而不是 `hermes -p default gateway <action>`。上面的包装脚本同时处理了这两种形式。
:::

## 管理单个配置档

每个配置档都会安装的快捷命令：

```bash
coder gateway run        # 前台运行（Ctrl-C 停止）
coder gateway start      # 启动托管的服务
coder gateway stop       # 停止托管的服务
coder gateway restart    # 重启
coder gateway status     # 状态
coder gateway install    # 创建 LaunchAgent / systemd unit
coder gateway uninstall  # 移除服务文件
```

这些命令等价于 `hermes -p coder gateway <action>` —— 当某个配置档别名不在 `PATH` 中，或者你要在脚本里动态指定配置档时，它们会很有用。

## 服务文件

每个配置档都安装自己独有的服务，名称唯一，因此各安装之间永远不会冲突：

| 平台     | 路径                                                              |
| -------- | ----------------------------------------------------------------- |
| macOS    | `~/Library/LaunchAgents/ai.hermes.gateway-<profile>.plist`        |
| Linux    | `~/.config/systemd/user/hermes-gateway-<profile>.service`         |

`default` 配置档沿用历史名称：`ai.hermes.gateway.plist` / `hermes-gateway.service`。

## 查看日志

每个配置档写入自己的日志文件：

```bash
# Default profile
tail -f ~/.hermes/logs/gateway.log
tail -f ~/.hermes/logs/gateway.error.log

# Named profile
tail -f ~/.hermes/profiles/<name>/logs/gateway.log
tail -f ~/.hermes/profiles/<name>/logs/gateway.error.log
```

同时流式查看所有配置档的日志：

```bash
tail -f ~/.hermes/logs/gateway.log ~/.hermes/profiles/*/logs/gateway.log
```

CLI 还提供了结构化日志查看器：

```bash
hermes logs -f                  # 跟随 default 配置档
hermes -p coder logs -f         # 跟随某个配置档
hermes logs --help              # 过滤器、级别、JSON 输出
```

## 确定实际在运行的是什么

```bash
hermes profile list             # 配置档 + 模型 + 网关状态
hermes-gateways status          # 覆盖每个配置档的完整状态
launchctl list | grep hermes    # macOS —— PID 和标签
systemctl --user list-units 'hermes-gateway-*'   # Linux —— units
```

## 编辑配置

每个配置档都把自己的配置保存在各自的目录内：

```
~/.hermes/profiles/<name>/
├── .env              # API 密钥、机器人令牌（chmod 600）
├── config.yaml       # 模型、服务商、工具集、网关设置
└── SOUL.md           # 个性 / 系统提示词
```

`default` 配置档直接使用 `~/.hermes/`，同样包含这三个文件。

可以用任意编辑器或通过 CLI 编辑它们：

```bash
hermes config set model.model anthropic/claude-sonnet-4    # default profile
coder config set model.model openai/gpt-5                  # named profile
```

编辑完 `.env` 或 `config.yaml` 后，重启受影响的网关：

```bash
coder gateway restart
# 或者，针对全部：
hermes-gateways restart
```

## 保持主机唤醒

网关进程可以全天候运行，但操作系统在空闲时仍会尝试睡眠。两种模式：

### macOS — `caffeinate`

`caffeinate` 内置于 macOS，可在其运行期间阻止睡眠。无需安装。

```bash
caffeinate -dis                    # 阻止显示器、空闲和系统睡眠
caffeinate -dis -t 28800           # 同上，8 小时后自动退出
caffeinate -i -w $(cat ~/.hermes/gateway.pid) &   # 在默认网关运行期间保持唤醒

# 持久化：在后台运行并忽略
nohup caffeinate -dis >/dev/null 2>&1 &
disown

# 检查 / 停止
pmset -g assertions | grep -iE 'caffeinate|prevent|user is active'
pkill caffeinate
```

| 标志   | 效果                                          |
| ------ | --------------------------------------------- |
| `-d`   | 阻止显示器睡眠                                |
| `-i`   | 阻止空闲系统睡眠（默认）                      |
| `-m`   | 阻止磁盘睡眠                                  |
| `-s`   | 阻止系统睡眠（仅限交流电供电的 Mac）          |
| `-u`   | 模拟用户活动（防止屏幕锁定）                  |
| `-t N` | 在 `N` 秒后自动退出                           |
| `-w P` | 当 PID `P` 退出时退出                         |

:::warning 合上盖子仍会使 Mac 睡眠
`caffeinate` 无法覆盖 MacBook 上由硬件驱动的合盖睡眠。若要在合盖状态下运行，请更改你的节能器/电池偏好设置，或使用第三方工具。
:::

### Linux — `systemd-inhibit` 或 `loginctl`

```bash
# 在命令运行期间抑制挂起
systemd-inhibit --what=idle:sleep --who=hermes --why="gateways running" \
  sleep infinity &

# 允许用户服务在注销后继续运行（推荐）
sudo loginctl enable-linger "$USER"
```

启用 lingering 后，你的 systemd 用户单元（包括
`hermes-gateway-<profile>.service`）将在 SSH 断开连接和重启后继续运行。

## Token 冲突安全

每个配置档在每个平台上必须使用唯一的机器人 token。如果两个配置档共享同一个 Telegram、Discord、Slack、WhatsApp 或 Signal token，第二个网关将拒绝启动，并报错指出冲突的配置档。在[多路复用](#alternative-one-gateway-for-all-profiles-multiplexing)模式下，同样的规则只会暂停重复配置档的适配器，而共享网关会继续运行。

审计：

```bash
grep -H 'TELEGRAM_BOT_TOKEN\|DISCORD_BOT_TOKEN' \
     ~/.hermes/.env ~/.hermes/profiles/*/.env
```

## 从每配置档网关迁移

如果你的配置档目前各自运行自己的网关（每个配置档一个 systemd 单元或 launchd agent），你可以用一条命令将它们合并为一个单一的多路复用默认网关——并用另一条命令回滚。独立的每配置档网关仍获得完全支持；这是可选的迁移，而非移除。

```bash
hermes gateway migrate --multiplex --dry-run   # 打印计划和任何阻碍项；不做任何更改
hermes gateway migrate --multiplex             # 应用（在 TTY 上请求确认；-y 跳过）
hermes gateway migrate --standalone            # 回滚到每配置档网关
```

### `hermes update` 的行为

更新成功后，当安装有两个或更多配置档、至少一个次要配置档运行自己的网关（活动进程或已安装的服务），且 `gateway.multiplex_profiles` 关闭时，`hermes update` 会运行相同的预检：

- **没有任何阻碍** → 迁移自动运行（与 `hermes gateway migrate --multiplex --yes` 相同的代码路径）并打印其操作。这是确定性的且从不提示，因此也会在无头/cron 更新中运行。
- **有阻碍** → 一个警告块列出每个阻碍项及其确切的修复方法和稍后运行的一行命令。不做任何更改。

单配置档安装永远不会被迁移（没有收益），而已经多路复用的安装则保持不变。当没有次要配置档运行自己的网关时，`hermes update` 也不做任何操作——它从不在没有任何东西运行的安装上切换模式。

### `hermes update` 自身永不跨越的边界

无人值守钩子只收纳共享 **同一个 UNIX 用户、同一个服务域、同一个 `profiles/` 树** 的配置档——也就是 `hermes profile create` 生成的形态。只要独立次级网关位于下列任一界线之后，自动路径便会停止：

| 边界 | 示例 |
|---|---|
| 不同的服务管理器或作用域 | 默认运行在用户 systemd 上，某个次级运行在 **系统** systemd（或 launchd）上，或默认以分离模式运行而某个次级由服务管理 |
| 一个配置档上安装了不止一个单元 | 同一配置档同时有 **用户** 单元 **和** 系统单元（显式命令会将两者都移除） |
| 不同的 UNIX 用户 | 带有自己 `User=` 的系统单元，或由其他 uid 拥有的活动网关；如果系统单元的 `User=` 在本机上无法解析，则视为未知，绝不视为“同一用户” |
| `HERMES_HOME` 位于 `<默认主目录>/profiles/` 之外 | 某个单元固定 `HERMES_HOME=/opt/hermes/profiles/emma` |

在这种情况下，`hermes update` 会打印它发现的边界以及 `hermes gateway migrate --multiplex`，并且不做任何更改——不删除任何单元，`gateway.multiplex_profiles` 也保持关闭。合并这样的集群会把由内核强制执行的边界（文件所有权、`User=`）替换为进程内隔离，这属于运维人员的决定。显式命令仍会执行该操作：相同发现会作为 **提示** 出现在 `hermes gateway migrate --multiplex --dry-run` 中，以便你先阅读，确认后 `--multiplex` 才会继续。

### 退出自动迁移

在 **默认** 配置档上设置 `gateway.auto_multiplex_migration: false`，即可让此安装永远不会进行自动收纳：

```bash
hermes config set gateway.auto_multiplex_migration false
```

此后，无论此安装看起来多有资格，`hermes update` 都会让每个配置档的网关保持原样，无输出也无更改。该设置保存在配置中，因此会跨更新持续存在——决定只需做一次，而无需在每次发布时重新裁定。它和所有其他设置一样从有效配置中读取，因此托管作用域（`/etc/hermes/config.yaml`）中固定的值会优先于配置档自己的文件。它只管辖 **自动** 路径：`hermes gateway migrate --multiplex` 是显式请求，仍会执行迁移（也是重新选择加入的受支持方式）。该项缺失或为 `true` 时，保持上述默认行为。

显式命令则不同：当存在两个或更多配置档且 **没有** 独立次级网关时，`hermes gateway migrate --multiplex` 仍会应用剩下的唯一步骤——它会设置 `gateway.multiplex_profiles: true`，（重新）启动默认网关并写入相同的回滚清单（其中 `secondaries` 列表为空），因此 `--standalone` 可以撤销它。你请求了多路复用，就会得到多路复用。

:::tip 克隆不携带频道
`hermes profile create --clone` 不会复制源配置档的机器人令牌和允许列表（见 [配置档 → 消息频道从不会被克隆](./profiles.md#messaging-channels-are-never-cloned---clone-channels-to-opt-in)），因此克隆出的集群不会再触发下面的重复凭据阻塞项。仍携带这些内容的旧克隆会被 `hermes profile list` 标记出来。
:::

### 迁移做了什么

1. 停止每个次级配置档的独立网关并卸载其服务（systemd 用户/系统单元或 launchd 代理）。被移除的内容记录在 `~/.hermes/gateway_migration.json` 中，用于回滚。
2. 在 **默认** 配置档的 `config.yaml` 中设置 `gateway.multiplex_profiles: true`。
3. 重启默认网关——或在次级网关此前使用的同一服务管理器上安装并启动它，从而使由 systemd 管理的集群仍由 systemd 管理。
4. 等待默认网关记录覆盖每个配置档的 `served_profiles`，然后打印摘要。

### 阻塞项与修复方法

| 阻塞项 | 原因 | 修复方法 |
|---|---|---|
| 两个配置档配置了同一平台凭据（例如相同的 `TELEGRAM_BOT_TOKEN`） | 在单个进程下，一个机器人令牌只能被轮询一次；多路复用器会将重复项搁置，导致该配置档的机器人静默 | 从第二个配置档中移除该令牌，或将其保留在 `default` 中并用 [`profile_routes`](#routing-shared-bot-chats-to-profiles-profile_routes) 路由该配置档的聊天 |
| 某个次级配置档启用了绑定端口的平台，而默认监听器上 **没有** `/p/<profile>/` 入口 | 多路复用器会跳过整个该配置档（见 [规则 2](#2-http-inbound-platforms-are-reached-via-a-pprofile-url-prefix)） | 在该配置档中禁用该平台（`platforms.<name>.enabled: false`），或用 `hermes -p <name> gateway start --force` 让该配置档继续使用独立网关 |

凭据检查复用了网关自身的冲突检测，因此其判定与多路复用器启动时的行为一致。哪些绑定端口的平台拥有 `/p/<profile>/` 入口是从适配器自身读取的（每个都声明了 `serves_profile_prefix`），因此随着新的 HTTP 入站适配器获得该前缀，预检仍然正确。

### 入站端口配置档会发生什么变化

使用自身端口的 `api_server` 或 `webhook` 的副配置档**不会**被阻止——但它的 URL 会改变。预检会打印出确切的新 URL，例如：

```
配置档 'coder'：api_server 迁移到默认监听器上，地址为
http://127.0.0.1:8642/p/coder/v1/...（其密钥/机密不变；请更新调用
旧独立端口配置档的客户端。）
```

该配置档自身的 `API_SERVER_KEY` / webhook secret 仍将用于对带前缀的 URL 进行认证；密钥本身没有任何其他变化。

### 迁移之后创建的配置档

在复用器运行时创建的配置档无需重启即可提供服务（见上文）。`hermes profile create` 会在实时复用器已接收该配置档时确认这一点；只有当它无法连接到复用器时（例如网关由较旧的构建版本启动），才会打印 `hermes gateway restart` 提醒。

### 回滚

```bash
hermes gateway migrate --standalone
```

读取 `gateway_migration.json`，将 `gateway.multiplex_profiles` 恢复为其先前的值，重启默认网关，并重新安装/启动每个已记录的单配置档服务（system unit 会以它原本的 `User=` 恢复）。一切恢复后，manifest 将被删除。

正向迁移同样以事务方式执行：如果在移除各单配置档网关之后，启动默认网关失败（例如某个必须以 root 运行的系统单元），`--multiplex` 会通过 manifest 当场回滚，不会留下任何没有网关的配置档。若进程在切换标志与启动默认网关之间死亡，下一次 `hermes gateway migrate --multiplex` 会看到没有活跃网关的 manifest，并从中恢复，而不是报告“already multiplexed”。如果不存在 manifest（你是手动启用复用的），请使用 `hermes config set gateway.multiplex_profiles false && hermes gateway restart` 退出复用模式，并重新安装你所需的各单配置档服务。

不会自动覆盖的情况：s6 监管的容器（在默认配置档上设置标志并重启容器）以及 Windows 计划任务（设置标志，停止各单配置档任务，`hermes gateway restart`）。当预检发现符合条件的安装时，仪表盘的 System 页面也会以按钮形式提供相同的迁移。

## 更新代码

`hermes update` 拉取一次最新代码，并将新的内置技能同步到每一个配置档：

```bash
hermes update
hermes-gateways restart
```

正在运行的网关将由更新本身重启；在仍按每个配置档运行一个网关的安装上，更新随后会提供[迁移到单一复用网关](#migrating-from-per-profile-gateways)的选项——当没有任何阻碍时会自动进行，否则作为带有修复措施的警告。

用户修改过的技能绝不会被覆盖。

## 故障排除

### “Could not find service in domain for user gui: 501”

你在之前执行 `hermes gateway stop` 之后运行了 `hermes gateway start`。CLI 的 `stop` 会执行完整的 `launchctl unload`，这会将该服务从 launchd 的注册表中移除。CLI 会在 `start` 时捕获这个特定错误，并自动重新加载 plist（`↻ launchd job was unloaded; reloading service definition`）。服务将正常启动。无需修复。

### 崩溃后残留的 PID

如果某个配置档的网关显示 `not running`，但进程仍存活：

```bash
ps -ef | grep "hermes_cli.*-p <profile>"
cat ~/.hermes/profiles/<profile>/gateway.pid
kill -TERM <pid>          # 优雅退出
kill -KILL <pid>          # 如果几秒后仍失败
<profile> gateway start
```

### 强制硬重置某个服务

```bash
# macOS
launchctl unload ~/Library/LaunchAgents/ai.hermes.gateway-<profile>.plist
launchctl load   ~/Library/LaunchAgents/ai.hermes.gateway-<profile>.plist

# Linux
systemctl --user restart hermes-gateway-<profile>.service
```

### 健康检查

```bash
hermes doctor                  # 默认配置档
hermes -p <profile> doctor     # 某个配置档
```
