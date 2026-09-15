---
sidebar_position: 4
---

# 同时运行多个网关

在一台机器上以受管服务的方式运行多个[配置档](./profiles.md) —— 每个配置档都拥有自己的机器人令牌、会话和记忆。本页涵盖运维方面的关注点：一起启动它们、跨配置档查看日志、防止主机进入睡眠，以及从常见的 launchd/systemd 怪异行为中恢复。

如果你只运行一个 Hermes 智能体，则无需阅读本页 —— 基础内容请参见[配置档](./profiles.md)。而如果你的实例分布在*不同*的机器上，且需要由一个桌面应用同时连接，请参见[将 Desktop 连接到多个 Hermes 实例](./multi-connection-desktop.md)。

## 何时使用此方案

当你拥有两个或更多应同时在线的 Hermes 智能体时，就需要这种设置。常见原因：

- 一个 Telegram 机器人上运行个人助理，另一个运行编码智能体
- 每个家庭成员一个智能体，或每个 Slack 工作区一个智能体
- 同一配置的沙箱 + 生产实例
- 一个研究智能体 + 一个写作智能体 + 一个定时任务驱动的机器人 —— 各自拥有隔离的记忆和技能

每个配置档本来就拥有各自的按平台区分的 LaunchAgent（`ai.hermes.gateway-<name>.plist`）或 systemd 用户服务（`hermes-gateway-<name>.service`）。本指南补充了统一管理它们的模式。

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

就是这样 —— 三个独立的智能体，各自运行在独立进程上，在崩溃时和用户登录时自动重启。

## 替代方案：所有配置档共用一个网关（多路复用）

上述模型为**每个配置档运行一个进程**。这是默认做法，也是大多数设置的正确选择。但在拥有许多配置档的主机上 —— 或者在每个配置档一个进程从运维角度看过于沉重的容器部署中 —— 你可以改为运行**单个多路复用网关**：默认配置档的网关成为唯一的入站进程，为机器上*每一个*配置档处理消息。

这是**选择启用**的，且**默认关闭**。关闭时，本页内容不会有任何变化 —— 下文所有行为都不生效。

### 何时优先选择多路复用

- 在容器/VPS 部署中，N 个 supervisor 单元、N 个端口和 N 个 PID 文件是负担。
- 有许多低流量配置档，它们各自并不需要一个完整进程。
- 你希望只有一个东西可以启动、监控和重启。

当你希望在配置档之间实现硬性的进程级隔离时（独立的内存占用、独立的崩溃域、能够在不影响其他配置档的情况下重启某一个配置档），请坚持每个配置档一个进程。

### 如何选择启用

在**默认配置档**上设置该标志（它拥有多路复用器），然后重启其网关：

```bash
hermes config set gateway.multiplex_profiles true
hermes gateway restart
```

等同于在默认配置档的 `~/.hermes/config.yaml` 中：

```yaml
gateway:
  multiplex_profiles: true
```

（为方便起见，该标志也可作为顶层的 `multiplex_profiles: true` 使用。）在下一次启动时，默认网关会枚举每一个配置档，以各配置档自己的凭据启动该配置档已启用的平台，并将每条入站消息路由到它所属的配置档。每一轮交互都会解析被路由配置档的配置、技能、记忆、SOUL **以及服务商密钥** —— 凭据绝不在配置档之间共享。

你**不**需要为次要配置档运行 `hermes gateway start` —— 默认网关会为它们提供服务。请参见下文的契约变更。

### 多路复用开启后有哪些变化

启用该标志会改变几处行为。一旦该标志关闭，所有这些都会立即恢复原样。

#### 1. 次要配置档不得启动自己的网关

在多路复用器运行的情况下，对具名配置档执行 `hermes gateway run`、`start`、`install` 或 `restart` 是**硬错误**（退出码 78），并会指引你回到多路复用器：

```
The default gateway is running as a profile multiplexer and already serves
profile 'coder'. ...
```

该拒绝发生在 CLI 中，在任何服务管理器被触及之前，因此被提供服务的配置档绝不会最终留下一个永久失败的 systemd 单元或 launchd 重启循环。当 coder 没有自己的网关时，`hermes -p coder gateway stop` 也会以同样方式拒绝（退出码 78）—— 除了多路复用器之外没有东西可停止，而对默认配置档执行 `hermes gateway stop` 会为每一个被提供服务的配置档将其关闭。仪表盘和 Desktop 应用遵循 CLI 的行为：对于被提供服务的配置档，“启动”和“停止”网关操作会以 `409` 及同样的说明作答（在系统页面上渲染为内联提示），而“重启”会重启多路复用器（即实际为该配置档提供服务的进程），而不是生成一个只会失败的 `-p coder gateway restart`。由于该重启会重新连接设备上的每一个机器人，这两个应用都会先询问 *“Restart the shared gateway? All bots on this device reconnect: default, coder, research”*（该列表是运行中网关的 `served_profiles`），并在完成时报告 *“Shared gateway restarted (3 bots)”*。独立配置档则保持普通的重启行为。`/api/status?profile=coder` 会在 `gateway_shared_with` 中携带同样的列表（对于独立网关为 null）。

“被提供服务”是从运行中网关自己的记录（默认主目录下 `gateway_state.json` 中的 `served_profiles`）读取的，因此即使多路复用器仅通过默认配置档环境中的 `GATEWAY_MULTIPLEX_PROFILES` 启用，或者在网关启动之后才添加了配置档，它也能保持正确。

多路复用器是唯一的入站进程；第二个配置档网关会双重绑定该配置档的平台。只有在你有意想要为该配置档使用一个独立进程时，才传递 `--force`（被 `run`、`start`、`install` 和 `restart` 接受）（在多路复用器运行时并不推荐）。因此，本页前面提到的跨配置档生命周期包装脚本在多路复用模式下**不**使用 —— 你只需管理默认网关。

#### 2. HTTP 入站平台通过 `/p/<profile>/` URL 前缀访问

次配置档的 HTTP 入站流量通过配置档前缀到达默认配置档的**单个**监听器，而**不是**第二个端口：

```
# 默认配置档
POST http://host:8644/webhooks/<route>
# "coder" 配置档，同一监听器
POST http://host:8644/p/coder/webhooks/<route>
```

前缀中未知或未配置的配置档会返回 `404`。共享监听器即默认配置档的 `api_server` 端口（若未启用 API 服务器，则为 `webhook` 端口）；它提供三类带配置档前缀的路径：

- **`api_server` 与 `webhook` 被镜像**，而从不重复。`/p/coder/v1/...` 和 `/p/coder/webhooks/<route>` 由默认配置档自身的适配器在 coder 的作用域下应答。因此次配置档**不得**自行启用 `api_server` 或 `webhook`（控制面板会以 `409` 拒绝；次配置档 `.env` 中的 `API_SERVER_KEY` 或 `WEBHOOK_ENABLED` 只注册凭据，不启动监听器）。
- **所有其他入站端口平台以共享监听器模式运行。** 配置了 Twilio SMS、LINE、Teams、BlueBubbles、Microsoft Graph、WhatsApp Cloud、WeCom 回调或飞书 webhook 模式的次配置档会以**不绑定端口**的方式构建其**独立的**适配器实例；默认监听器将 `/p/<profile>/<该适配器通常的路径>` 转发给它。参见[多路复用器下的入站端口平台](#inbound-port-platforms-under-the-multiplexer)。

身份验证遵循 URL 中指定的配置档。无前缀端点继续使用默认监听器现有的凭据。

- `/p/coder/...` API 服务器请求必须使用 `~/.hermes/profiles/coder/.env` 中的 `API_SERVER_KEY`；默认监听器的密钥会被拒绝。在多路复用器下，该密钥仅对前缀进行身份验证 —— 它不会在次配置档中开启第二个 `api_server` 监听器，因此你无需在次配置档的 `config.yaml` 中固定 `platforms.api_server.enabled: false`。
- 目标为 `coder` 的 webhook 路由必须在默认配置档的 `config.yaml` 中，在现有的路由专属 `secret` 旁声明 `profile: coder`。该 secret 随后仅在 `/p/coder/webhooks/<route>` 被接受，且在所有其他配置档前缀上被拒绝。
- 不带 `profile` 的 webhook 路由仍为默认配置档的路由，无法通过命名的配置档前缀访问。动态订阅以相同方式绑定：`hermes webhook subscribe <name> --route-profile coder` 会将 `profile: coder` 写入默认网关的 `webhook_subscriptions.json`，并打印 `/p/coder/webhooks/<name>` URL（`hermes webhook ls` 会显示该绑定）。请使用 `--route-profile`，而非全局的 `-p coder`：`-p` 会将订阅写入 coder 自己的订阅文件中，默认网关的 webhook 适配器从不读取该文件。
- 投递遵循相同的绑定。`profile: coder` 路由的回复（或 `deliver_only` 消息）通过 **coder 的**适配器发送至 `deliver` 平台，当 `deliver_extra.chat_id` 未设置时回退到 **coder 的**主频道；`github_comment` 投递会使用 `profiles/coder/.env` 中的 `GH_TOKEN` / `GITHUB_TOKEN` 运行 `gh`。如果 coder 没有该平台的适配器，投递会失败（502），而不会以其他配置档的机器人身份发布；默认路由同样从不借用仅在次配置档上启用的平台。
- `/p/coder/api/platforms/<platform>/events` 回调由 coder 的适配器验证并分发；当 coder 没有相应适配器时，回调返回 503。

当目标配置档没有 `API_SERVER_KEY` 时，命名 API 请求会安全失败。安全配置错误仍然是致命的：例如，一个 `open` 自有策略平台若没有 `GATEWAY_ALLOW_ALL_USERS` 或其平台特定的允许全部选项，仍会中止网关启动，而不是静默丢弃该不安全的配置档。

#### 多路复用器下的入站端口平台

独立的 `hermes -p coder gateway run` 会在各自的端口上绑定 coder 的 Twilio、LINE、Teams…… webhook 服务器。在多路复用器下，这些适配器仍然是 coder 的 —— 使用来自 `profiles/coder/.env` 的相同凭据、相同的 `config.yaml`、通过 coder 的频道发送回复 —— 但它们**不绑定端口**。默认配置档的共享监听器将 `/p/coder/<path>` 转发给它们，其中 `<path>` 正是该适配器独立运行时原本会提供的路径。请求由 **coder 的**适配器使用 **coder 的** secret（Twilio 认证令牌、LINE 频道密钥、Teams 应用凭据、BlueBubbles 密码……）验证，并在 coder 的运行时作用域下执行；默认配置档自身的 `/path` 不受影响，没有对应路径适配器的配置档会得到 `404`，而绝不会得到其他配置档的机器人。

| 平台 | 次配置档在共享监听器上的回调 URL | 使用命名配置档的以下内容验证 |
|---|---|---|
| Twilio SMS (`sms`) | `https://<host>/p/<profile>/webhooks/twilio` | `TWILIO_AUTH_TOKEN` 签名（`SMS_WEBHOOK_URL` 必须为此 URL） |
| LINE (`line`) | `https://<host>/p/<profile>/line/webhook`（媒体：`/p/<profile>/line/media/...`） | `LINE_CHANNEL_SECRET` |
| Microsoft Teams (`teams`) | `https://<host>/p/<profile>/api/messages` | 针对 `TEAMS_CLIENT_ID` 的 Bot Framework 令牌 |
| BlueBubbles (`bluebubbles`) | `http://<host>/p/<profile>/bluebubbles-webhook`（自动向服务器注册） | `BLUEBUBBLES_PASSWORD` |
| Microsoft Graph (`msgraph_webhook`) | `https://<host>/p/<profile>/msgraph/webhook` | `extra.client_state` |
| WhatsApp Cloud (`whatsapp_cloud`) | `https://<host>/p/<profile>/whatsapp/webhook` | `WHATSAPP_CLOUD_APP_SECRET` / 验证令牌 |
| WeCom 回调 (`wecom_callback`) | `https://<host>/p/<profile>/wecom/callback` | 应用的回调令牌 / AES 密钥 |
| 飞书 webhook 模式 (`feishu`) | `https://<host>/p/<profile>/feishu/webhook` | `FEISHU_VERIFICATION_TOKEN` / `FEISHU_ENCRYPT_KEY` |

`<host>` 是默认配置档监听器前方的公网主机名（隧道、反向代理）；配置档配置中自定义的 `webhook_path` 会将路径相应地移动到 `/p/<profile>` 之后。网关在启动时记录确切的 URL：

```
[sms] profile 'coder' is served on the default profile's shared listener:
http://127.0.0.1:8642/p/coder/webhooks/twilio (point the vendor's callback URL at this path ...)
```

并且每个状态界面都会重复它，以便你知晓该粘贴什么到厂商控制台：

```
$ hermes -p coder gateway status
✓ Gateway is running via the default-profile multiplexer
  Manage it from the default profile: hermes gateway status

Inbound callback URLs on the shared listener:
  line: http://127.0.0.1:8642/p/coder/line/webhook
  sms: http://127.0.0.1:8642/p/coder/webhooks/twilio
```

默认配置档上的 `hermes gateway status` 和 `hermes status` 会按所服务的配置档列出相同的 URL，控制面板的 Channels 页面和 Desktop Messaging 页面在查看该配置档时会将它们显示为各平台的 `ingress_url`。默认配置档自身的 `api_server` 和 `webhook` 以相同方式针对被服务的配置档报告 —— 显示为**已连接**，`ingress_url` 为 `http://127.0.0.1:8642/p/coder/v1`（分别为 `.../p/coder/webhooks/<route>`）—— 因为该配置档没有自己的适配器；是在 `/p/coder/` 前缀下应答的默认监听器。次配置档 `.env` 中每个配置档的 `SMS_WEBHOOK_PORT`、`LINE_PORT`、`TEAMS_PORT`…… 在多路复用器下被忽略（不绑定任何端口）；一旦该配置档运行自己的独立网关，它便立即重新生效。

#### 3. 按凭证隔离的平台仍需每个配置档自己的 token

轮询/连接型平台（Telegram、Discord、Slack、Matrix、Signal……）多路复用运行正常，但每个启用某平台的配置档都必须提供**自己**的机器人 token —— 同一个 token 不能被两个配置档同时轮询。如果两个配置档配置了相同的 `(platform, token)`，网关会记录一条错误日志并点名两个配置档，然后停放（park）**重复的**适配器（在运行时状态中显示为 `fatal / duplicate_credential`），而首个认领者和所有其他配置档继续运行 —— 网关本身不会退出。默认配置档的适配器会最先连接并认领其凭证，因此被停放的适配器一定是次级配置档的（参见
[Token 冲突安全](#token-conflict-safety) —— 规则未变，只是现在在同一个进程内强制执行）。

#### 4. 会话键按配置档命名空间隔离

每个配置档的会话都位于 `agent:<profile>:…` 命名空间下，因此同一平台/聊天上的两个配置档在共享会话存储中永远不会冲突。**默认**配置档逐字节保留历史的 `agent:main:…` 命名空间，因此既有的默认配置档会话不受影响 —— 无需迁移，不会有孤立的历史记录。每条读取键值的网关路径 —— 重启后的委托完成回调、关闭通知、针对兄弟运行的用户线程内 `/stop`、`/undo`、QQ 审批按钮 —— 也都接受 `agent:<profile>:…` 形式，因此次级配置档能获得与默认配置档相同的行为。唯一会与默认命名空间冲突的配置档名 —— 一个名字恰好叫 `main` 的配置档 —— 会被加上 `agent:main~:…` 作为键，以保留自己的会话和自己的 `profiles/main/state.db`。

每个配置档的行都落在**自己的** `state.db`：有名字的配置档在 `profiles/<name>/state.db`，默认配置档在启动主目录（launch home）下 —— 即使写操作发生在另一个配置档的路由回合或后台 tick 内也是如此。Desktop/TUI 后端自己的存储同样固定在其启动时的主目录下，Bot Chat 的侧边子智能体（`prompt.background`）会把数据持久化在其父对话旁边。

#### 5. 一个 PID/锁和一个状态呈现面

存在单一的进程级 PID 和锁（多路复用器，位于默认主目录下）。默认配置档上的 `hermes status` 会报告多路复用器并列出其服务的配置档（`Serves: coder, research`）；`hermes -p coder status`、`hermes -p coder gateway status` 和 `hermes -p coder cron status` 都报告“running via the default-profile multiplexer”而非“stopped”，仪表盘的 `/api/status?profile=coder` / Channels 页会报告该多路复用器为 coder 的运行中网关（并以 coder 自己的适配器作为其平台）。唯一的 `gateway_state.json` 位于默认主目录下：次级适配器在其中以 `<profile>:<platform>` 条目出现在 `served_profiles` 旁边；次级配置档的主目录下不会写入任何内容。

#### 什么**不会**改变

按配置档的 `.env` 凭证隔离得以保留，甚至更严格：配置档的键从它自己的作用域中解析，绝不并入共享环境。像 MCP 服务器和 Kanban worker 这样的子进程永远只能看到自己配置档的密钥 —— 包括由外部密钥来源（1Password、Bitwarden……）注入的凭证：为配置档 B 启动的 stdio MCP 服务器收到的此类名称的值只能是 B 的值，若 B 没有则为空，绝不是默认配置档的。MCP 服务器**按配置档**连接：两个都以自己的 token 命名同一个 `github` 服务器的配置档会得到两个连接，各自只看到自己的工具；`mcp_servers` 条目完全相同（同一路由*和*凭证，包括 mTLS 的 `client_cert`/`client_key`）的配置档共享一个连接，拥有者执行 `/reload-mcp` 会重新注册共享配置档的工具，而它们无需重载。`auth: oauth` 服务器从不跨配置档共享：每个配置档在自己的 `mcp-tokens/` 下持有自己的 token，并开启自己的连接。信任策略保持按配置档：一个 `trust: untrusted` 的配置档共享 `trust: full` 配置档的连接时，在每次具备写能力的调用前仍会被询问，`supports_parallel_tool_calls` 仅对设置它的配置档生效。终端设置（`terminal.backend`、`terminal.cwd`、`terminal.docker_volumes`、`terminal.docker_shared_container_key`、SSH 目标……）同样在每个路由回合都按配置档解析：省略终端键的配置档会获得文档规定的默认值，绝不是启动配置档的值，而 `config.yaml`/`.env` 无法解析的配置档，其终端执行会被拒绝，而不是在另一个配置档的沙箱策略下运行。媒体投递凭证守卫（`MEDIA:` 附件背后的拒绝清单 —— `.env`、`auth.json`、`config.yaml`、`state.db`、会话转录稿、OAuth token 存储）覆盖 `profiles/` 下的每个配置档，因此任何配置档的回合都不能将另一个配置档的密钥或聊天历史附加到回复中。授权也按配置档进行：`GATEWAY_ALLOW_ALL_USERS`、`GATEWAY_ALLOWED_USERS` 以及每个平台的白名单或允全部的选择性开启都从所属配置档的 `.env` 读取 —— 默认配置档选择开放访问绝不会开放次级配置档的机器人，仅在自身 `.env` 中选择开放的次级配置档则会被尊重。写在配置档 `config.yaml` 中的按机器人行为同样如此（`require_mention`、`mention_patterns`、`allow_bots`、`reactions`、`auto_thread`、`dm_policy`、`ignored_channels`、Matrix 的 `session_scope`……）：次级配置档的 YAML 永远不会进入共享进程环境，因此不会变成默认配置档的策略，默认配置档的 YAML 也永远不会管理次级机器人。`terminal.env_passthrough` 白名单、Yuanbao 自动指定的主频道，以及保护每个配置档自己的 `config.yaml` 的写守卫也都按配置档解析。Kanban、按配置档作用域的 Skills/记忆/SOUL 和模型路由，其按配置档的行为与使用独立网关时完全一致。

出站身份也按配置档区分。为配置档 `P` 运行的回合调用 `send_message` 工具（发送、回应、媒体）时，会通过 `P` 自己的机器人发送；`P` 会话的“Gateway shutting down/restarted”和 `/update` 通知、从 `P` 的聊天设置的 `/loop` 唤醒，以及 `P` 的 Discord 机器人的未授权斜杠命令操作员告警（发到 `P` 的主频道）也是如此。如果 `P` 没有为该平台连接机器人，发送会以明确的错误失败 —— 绝不会回退到默认配置档的机器人。

工具和记忆服务商的凭证遵循同样的规则。托管 OCR（`FIRECRAWL_API_KEY`）、Modal / Browser Use 云关卡、mem0 OSS 的 OpenAI 密钥、xAI 视频，以及每个记忆服务商身份（`MEM0_USER_ID`、`SUPERMEMORY_CONTAINER_TAG`、`RETAINDB_PROJECT`、`OPENVIKING_ACCOUNT/USER`、`HINDSIGHT_BANK_ID`、`HERMES_HONCHO_HOST`）都从路由到的配置档的 `.env` 读取，因此次级配置档的记忆落在**它自己的**账户/库/项目（或该服务商的按配置档默认值），绝不是默认配置档的。自定义端点随其密钥一起生效 —— `OPENAI_BASE_URL`、`XAI_BASE_URL`、`NOUS_INFERENCE_BASE_URL`、`GATEWAY_PROXY_URL`、Firecrawl / Browserbase / RetainDB / Supermemory / Honcho / Hindsight 的 URL —— 因此配置档的密钥绝不会被发送到另一个配置档的代理或自托管服务器。`WEIXIN_HOME_CHANNEL`、`HERMES_LANGUAGE` 和 `display.language`，以及 `hooks.outbound[].secret_env` 同样按配置档区分，被逐出的次级会话在会话结束时进行记忆提取会在该配置档的作用域下运行。

按回合的运行时设置也跟随路由到的配置档：`agent.max_turns`、`fallback_providers`、`file_read_max_chars`、`tool_output.*`、`browser.*` 超时、`timezone`（包括交给 `execute_code` 沙箱的 `TZ`）、媒体投递策略（`gateway.strict`、`media_delivery_allow_dirs`、`trust_recent_files*`）以及用于辅助调用的 Nous `auth.json`，都从服务该回合的配置档读取，绝不是从网关启动时所在的配置档读取。按配置档的状态文件（`processes.json`、`checkpoints/`、沙箱快照存储、Feishu 评论规则/配对）和网关钩子同样如此：每个配置档的 `hooks/` 目录独立加载，只对该配置档的事件触发。Shell 钩子以路由到的配置档的 `HERMES_HOME` 运行，其环境中没有默认配置档的密钥，其 stdin 载荷带有 `profile` 字段，标明触发它们的配置档。

#### 每个配置档隔离的内容

一份快速参考，说明一次多路复用轮次会从**它自己**的配置档解析哪些内容，并且绝不与默认配置档或任何同级配置档共享：

| 关注点 | 解析来源 | 配置档缺少该项时的行为 |
|---|---|---|
| 服务商密钥、机器人令牌、`config.yaml` 中的 `${VAR}` 引用 | 配置档自己的 `.env`（其密钥作用域） | 未解析 / 无适配器——绝不使用默认配置档的值 |
| 授权（`GATEWAY_ALLOW_ALL_USERS`、`GATEWAY_ALLOWED_USERS`、各平台允许列表与允许全部选项） | 所属配置档的 `.env` 与 `config.yaml` | 关闭——默认配置档的选项绝不开放次级配置档的机器人 |
| HTTP 端点（`/p/<profile>/api/...`、`/p/<profile>/webhooks/...`、平台事件回调） | 指定配置档的 `API_SERVER_KEY`、绑定 `profile:` 的 webhook 路由，以及它自己的适配器 | `401`/`404`；无适配器投递时返回 `502`/`503`，绝不使用其他配置档的机器人 |
| 入站端口平台（`/p/<profile>/webhooks/twilio`、`/p/<profile>/line/webhook`、`/p/<profile>/api/messages` 等） | 指定配置档自己的适配器及其密钥（Twilio 认证令牌、LINE 频道密钥、Teams 应用、BlueBubbles 密码等）；回复通过该适配器发出 | 密钥错误时 `401`/`403`，配置档无此类适配器时 `404`——绝不使用默认配置档的适配器 |
| 适配器设置（`*_REQUIRE_MENTION`、`*_REACTIONS`、`*_ALLOW_BOTS`、`*_PROXY`、Discord `allow_mentions`、Matrix `allowed_users` / `ignore_user_patterns`、webhook 主机/端口/URL、Matrix thread/session/E2EE 策略、Discord 回填/附件上限、Buzz 回复模式、A2A 智能体卡片/公共 URL、WhatsApp 桥接策略、Yuanbao 主页频道） | 所属配置档，按此顺序：显式 `.env` 值 → 其 `config.yaml` → 适配器默认值 | 适配器记录的默认值——绝不使用默认配置档的设置。单配置档安装保持 env 覆盖 YAML 的行为，与各平台页面记录完全一致 |
| `MEDIA:` 附件拒绝列表 | `profiles/` 下的每个主目录加上默认主目录，在检查时枚举 | 一个轮次永远无法附加另一个配置档的 `.env`、`auth.json`、`state.db`、会话或令牌存储 |
| stdio MCP 子进程环境 | 安全基线 + 配置档为密钥来源名称限定的值 + 服务器自己的 `env:` | 配置档缺少的名称在子进程中不存在——不会回落到默认配置档 |
| 出站出口（`send_message`、关闭/重启/`/update` 通知、`/loop` 唤醒、绑定 `profile:` 的 webhook 投递、`github_comment` 令牌） | 配置档自己已连接的适配器与 `.env` | 明确失败；绝不通过默认配置档的机器人发布 |
| 会话命名空间 | `agent:<profile>:…`（默认为 `agent:main:…`） | 同一聊天上的两个配置档永不共享历史 |
| 日志 | 配置档自己主目录下的 `agent.log` / `errors.log` / `gateway.log` | — |
| 终端沙箱设置（`terminal.*`、SSH 目标） | 配置档的 `config.yaml` | 记录的默认值；无法解析的配置 → 拒绝执行 |
| 轮次的工作目录（未设置 `terminal.cwd`） | 与独立网关相同规则：本地后端为 `$HOME`，否则为沙箱默认值 | 绝不是多路复用器进程启动时所在的目录 |
| 命令审批（`command_allowlist`、"always" 选择） | 配置档自己的 `config.yaml` | 默认配置档的 "always" 绝不预批准次级配置档的命令；次级配置档的选择保存到它自己的配置 |
| 沙箱凭据文件挂载（`terminal.credential_files`）、`security.redact_secrets`、`browser.*` 引擎/有头标志、`lsp.*`、辅助服务商健康标记、`logs/mcp-stderr.log` | 配置档自己的 `config.yaml` / `.env` | 记录的默认值——绝不使用启动配置档缓存的值 |
| 云 SDK 凭据客户端（Bedrock boto3 客户端 + 模型发现、Azure Entra 凭据）、凭据获取的目录（DeepInfra、Copilot 上下文限制、Nous 推理上限、Ramp Router 努力级别、xAI / OpenRouter 图像模型、自定义端点 `/models`）、Camofox VNC 地址、计算机使用辅助视觉路由、技能同步推送、远程后端探测文本、学习的图像令牌成本、`display.skin`、访客铸造退避、banner 技能、Yuanbao "active" 适配器、Langfuse 客户端 | 配置档自己的 `.env` / `config.yaml` / `<home>/cache` | 记录的默认值——绝不使用启动配置档缓存的值或其凭据 |
| 会话搜索旋钮（`sessions.cjk_fts`、`sessions.search_slow_ms`） | 配置档的 `config.yaml` | 记录的默认值——绝不使用默认配置档的桥接值 |
| 平台代理（`TELEGRAM_PROXY`、`DISCORD_PROXY`、`HTTPS_PROXY` 等） | 配置档自己的 `.env` | 直连——绝不使用默认配置档的代理 |
| Desktop/dashboard 后端中的 MCP 发现 | 每个已服务的配置档主目录一次 | 在另一个配置档已构建智能体之后选择的配置档，仍会发现自己 的 `mcp_servers` |
| Dashboard 操作（由 Desktop/dashboard 启动的 `hermes -p <name> …`） | 清理过的子环境，固定到该配置档的 `HERMES_HOME` | 子进程加载自己的 `.env`；不继承 dashboard 配置档的令牌与端口 |
| Cron `.env` 调优（`HERMES_CRON_TIMEOUT`、`HERMES_MODEL` 回落、`HERMES_CRON_MAX_PARALLEL`、预填文件）、worker / Bot Chat 子环境 | 配置档自己的 `.env`；子进程绝不继承默认配置档的 `.env` 设置或桥接的 `TERMINAL_*` 策略 | Cron 默认值 / 模型拒绝，与独立运行 `hermes -p <name> gateway run` 完全一致 |
| 某配置档任务的看板 worker 与通知 | 被分配者的 `.env` + `config.yaml`（工具集固定、终端后端、媒体策略、显示语言） | — |
| `/loop` 滴答、`background_process_notifications` 门控、`notice_delivery`、后台进程检查点恢复 | 所属配置档的 `state.db` / `config.yaml` / `processes.json` | — |

按设计**共享**的内容：进程、其 PID/锁与 `gateway_state.json`（默认主目录）、那个唯一的 HTTP 监听器，以及 `profile_routes` 表（在默认配置档上声明）。

### 哪些配置档会被提供服务

`gateway.multiplex_profiles: true` 会提供默认配置档，以及 `profiles/` 下**每一个**存活的具名配置档——不存在按配置档的排除列表。（原先的 `gateway.multiplex_profile_allowlist` 键已废弃；配置迁移会将它从 `config.yaml` 中移除，而你不想被提供服务的配置档应当改为归档或删除——`hermes profile delete <name>`，或将该目录移出 `profiles/`。）已删除的配置档会留下墓碑记录，永远不会被枚举；目录已消失的配置档也绝不会被已提供服务的回合、cron 时钟或日志路由重新创建。

被提供服务的集合控制 `/p/<profile>/` API 与前缀 webhook、运行时状态、配置档路由的资格，以及进程内 cron 调度器会为哪些配置档打点（Desktop 后端的时钟枚举同一集合，并对任何已由运行中的多路复用器或自身网关提供服务的配置档退让）。以 `hermes -p <name> gateway run` 启动的多路复用器始终也会为其自身配置档的 cron 存储打点。

被提供服务的集合是**实时**的。在多路复用器运行期间创建的配置档（`hermes profile create`、仪表板、Desktop 或 TUI）会立即被提供服务：创建方通过控制套接字 ping 多路复用器，同时多路复用器每 30 秒重新扫描 `profiles/` 作为安全网。新配置档的适配器会在其 `config.yaml`/`.env` 携带机器人 token 的那一刻构建（创建方通常先创建，再添加 token），默认配置档的 `gateway_state.json` 中的 `served_profiles` 会被更新，且 `hermes -p <name> gateway status` 会报告该配置档已被提供服务——无需重启，其他配置档的适配器和进行中的回合不受影响。删除配置档会以同样的方式停止并取消路由其适配器，而 `hermes profile rename` 会在目录移动前取消旧名称的路由，并热提供新名称（旧名称不会被仍绑定于它的适配器或 cron 时钟复活）。一凭据一轮询器的规则仍然适用：热添加的配置档若复用了另一配置档的 token，会被以 `duplicate_credential` 错误停放，绝不会作为第二个轮询器启动。

### 将共享机器人聊天路由到配置档（`profile_routes`）

多路复用按**凭据**选择配置档（每个配置档自己的机器人 token）或按 **URL 前缀**选择（HTTP 平台使用 `/p/<profile>/`）。当多个社区共享**同一个**机器人 token 时——例如一个 Discord 机器人服务多个 guild——你可以额外用 `gateway.profile_routes` 将特定的 guild/频道/thread 路由到不同的配置档：

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

    # 一个 Telegram 群（无 guild 概念——仅 chat_id）
    - name: tg-group
      platform: telegram
      chat_id: "-1001234567890"
      profile: tg-profile

    # 一条 WhatsApp 私信——写入电话号码；JID 和 LID 形式也能匹配
    - name: owner-whatsapp
      platform: whatsapp
      chat_id: "15551234567"
      profile: owner
```

路由按最具体优先匹配（`thread_id` > `chat_id` > `guild_id`），所有声明的字段都必须成立（AND），且以频道为键的路由还会匹配其父级为该频道的 thread/论坛帖子。不匹配任何路由的消息留在默认/活动配置档上。被路由的配置档获得上文描述的完整按配置档隔离（配置、技能、记忆、凭据、会话命名空间）。路由适用于所有平台适配器，而不只是 Discord。

除非用 `bot_profile: <profile>` 指定另一个机器人，否则路由仅适用于**默认配置档的机器人**接收到的消息。Telegram 私信对每个机器人使用相同的 `chat_id`（用户 id），因此若无此设置，本意给予共享机器人的 `chat_id` 路由也会用次要配置档的专用机器人捕获该用户的私信。发送到次要配置档自身机器人的消息留在该配置档中：

```yaml
    # 将某用户与 team_b 自有机器人的私信固定到第三个配置档
    - name: teamb-owner-dm
      platform: telegram
      bot_profile: team_b
      chat_id: "72719239"
      profile: ops-for-team-b
```

被路由消息的授权始终由**接收方机器人的配置档**决定（其 token 和允许列表），包括智能体忙碌时发送的后续消息以及 `/topic` 或 `/stop` 之类的回合中检查；被路由的配置档本身无需允许列表的副本。没有自己机器人的被路由配置档，在网关重启后也会通过共享机器人接收后台通知（进程完成、心跳、异步委派结果）。

在 WhatsApp 和 WhatsApp Cloud 上，`chat_id` 路由会在用户身份的多种形式间匹配：纯电话号码（`15551234567`）、JID（`15551234567@s.whatsapp.net`）和 LID（`…@lid`），一旦桥接将它们配对，就都指向同一个人（会话键和适配器允许列表已经在用同样的规范化方式）。你可以把电话号码写进 `profile_routes`，无论 WhatsApp 投递的是 JID 还是 LID，入站私信仍能匹配。尚无 LID 映射时，号码形式仍能匹配 JID（后缀会被剥离），但无法解析未知的 LID——该入站会落到默认配置档，直到映射出现。群聊（`…@g.us`）不是发送者身份，仍精确匹配。Telegram 数字 id 不变。

`profile_routes` 需要 `gateway.multiplex_profiles: true`；多路复用关闭时路由被忽略。若显式路由匹配但其目标配置档未安装（或已被删除），网关会拒绝该入站并记录该路由与目标。它不会运行默认配置档。不匹配任何路由的流量保持既有的默认配置档行为。

被路由配置档拥有的cron 任务也通过共享机器人投递，但仅投递到启用的、带有指向该配置档的 `chat_id`/`thread_id` 的路由所映射的目标（`guild_id + chat_id` 路由也使其频道符合资格）——被路由配置档的任务若针对未路由的聊天（或路由到另一配置档的聊天），绝不会通过共享机器人发送。仅 guild 的路由不能让 cron 目标符合资格；请为投递频道添加 `chat_id` 路由。被路由的配置档对此无需自己的 `platforms.<platform>` 块：共享机器人的授权来自路由，而非来自卫星配置。

## 一次性启动、停止或重启所有网关

CLI 自带单配置档的生命周期命令。要对所有配置档生效，需要将它们包在一个 shell 循环中。把下面的片段放到 `~/.local/bin/hermes-gateways` 并执行 `chmod +x`：

```sh
#!/bin/sh
set -eu

# Add or remove profile names here as you create / delete profiles.
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
hermes-gateways start      # start every configured profile
hermes-gateways stop       # stop every configured profile
hermes-gateways restart    # restart all
hermes-gateways status     # status across all
hermes-gateways list       # delegates to `hermes gateway list`
```

:::tip
`default` 配置档通过 `hermes gateway <action>`（不带 `-p`）来操作，而不是 `hermes -p default gateway <action>`。上面的封装脚本同时处理这两种形式。
:::

## 管理单个配置档

每个配置档都会安装的快捷命令：

```bash
coder gateway run        # foreground (Ctrl-C to stop)
coder gateway start      # start the managed service
coder gateway stop       # stop the managed service
coder gateway restart    # restart
coder gateway status     # status
coder gateway install    # create the LaunchAgent / systemd unit
coder gateway uninstall  # remove the service file
```

这些命令等同于 `hermes -p coder gateway <action>` —— 当配置档别名不在 `PATH` 上，或者需要在脚本中动态指定配置档时非常有用。

## 服务文件

每个配置档都会以唯一的名称安装自己的服务，因此各套安装之间永远不会冲突：

| 平台 | 路径                                                              |
| -------- | ----------------------------------------------------------------- |
| macOS    | `~/Library/LaunchAgents/ai.hermes.gateway-<profile>.plist`        |
| Linux    | `~/.config/systemd/user/hermes-gateway-<profile>.service`         |

默认配置档沿用历史名称：`ai.hermes.gateway.plist` / `hermes-gateway.service`。

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

同时流式查看每个配置档的日志：

```bash
tail -f ~/.hermes/logs/gateway.log ~/.hermes/profiles/*/logs/gateway.log
```

CLI 还提供结构化的日志查看器：

```bash
hermes logs -f                  # follow default profile
hermes -p coder logs -f         # follow one profile
hermes logs --help              # filters, levels, JSON output
```

## 识别实际正在运行的内容

```bash
hermes profile list             # profiles + model + gateway state
hermes-gateways status          # full status across every profile
launchctl list | grep hermes    # macOS — PIDs and labels
systemctl --user list-units 'hermes-gateway-*'   # Linux — units
```

## 编辑配置

每个配置档都将配置保存在自己的目录中：

```
~/.hermes/profiles/<name>/
├── .env              # API keys, bot tokens (chmod 600)
├── config.yaml       # model, provider, toolsets, gateway settings
└── SOUL.md           # personality / system prompt
```

默认配置档直接使用 `~/.hermes/`，包含相同的三个文件。

可以用任何编辑器或通过 CLI 编辑它们：

```bash
hermes config set model.model anthropic/claude-sonnet-4    # default profile
coder config set model.model openai/gpt-5                  # named profile
```

编辑 `.env` 或 `config.yaml` 后，重启受影响的网关：

```bash
coder gateway restart
# or, for everything:
hermes-gateways restart
```

## 保持主机唤醒

网关进程可以全天运行，但操作系统在空闲时仍会尝试休眠。有两种模式：

### macOS —— `caffeinate`

`caffeinate` 内置于 macOS，在其运行期间阻止休眠。无需安装。

```bash
caffeinate -dis                    # 阻止显示器、空闲和系统休眠
caffeinate -dis -t 28800           # 同上，8 小时后自动退出
caffeinate -i -w $(cat ~/.hermes/gateway.pid) &   # 默认网关运行时保持唤醒

# 持久运行：后台运行并遗忘
nohup caffeinate -dis >/dev/null 2>&1 &
disown

# 检查 / 停止
pmset -g assertions | grep -iE 'caffeinate|prevent|user is active'
pkill caffeinate
```

| 标志   | 效果                                              |
| ------ | ------------------------------------------------- |
| `-d`   | 阻止显示器休眠                                    |
| `-i`   | 阻止空闲系统休眠（默认）                          |
| `-m`   | 阻止磁盘休眠                                      |
| `-s`   | 阻止系统休眠（仅限使用交流电的 Mac）              |
| `-u`   | 模拟用户活动（阻止屏幕锁定）                      |
| `-t N` | 在 `N` 秒后自动退出                               |
| `-w P` | 当 PID `P` 退出时随之退出                         |

:::warning 合上盖子仍会让 Mac 休眠
`caffeinate` 无法覆盖 MacBook 上由硬件驱动的合盖休眠。若要在合盖状态下运行，请更改你的节能器 / 电池偏好设置，或使用第三方工具。
:::

### Linux —— `systemd-inhibit` 或 `loginctl`

```bash
# 在某命令运行期间禁止挂起
systemd-inhibit --what=idle:sleep --who=hermes --why="gateways running" \
  sleep infinity &

# 允许用户服务在注销后继续运行（推荐）
sudo loginctl enable-linger "$USER"
```

启用 lingering 后，你的 systemd 用户单元（包括 `hermes-gateway-<profile>.service`）将在 SSH 断开和重启后继续运行。

## 令牌冲突安全

每个配置档必须为各平台使用各自唯一的机器人令牌。如果两个配置档共用同一个 Telegram、Discord、Slack、WhatsApp 或 Signal 令牌，第二个网关会拒绝启动，并报错指明冲突的配置档。在[多路复用](#alternative-one-gateway-for-all-profiles-multiplexing)模式下，同样的规则只会停用重复配置档的适配器，共享网关继续运行。

审计：

```bash
grep -H 'TELEGRAM_BOT_TOKEN\|DISCORD_BOT_TOKEN' \
     ~/.hermes/.env ~/.hermes/profiles/*/.env
```

## 从按配置档网关迁移

如果你的各个配置档目前各自运行自己的网关（每个配置档一个 systemd 单元或 launchd agent），你可以用一条命令将它们合并为单个多路复用的默认网关——并用另一条命令回滚。独立的按配置档网关仍完全受支持；这是一次可选的迁移，而非移除。

```bash
hermes gateway migrate --multiplex --dry-run   # 打印计划及任何阻塞项；不做任何更改
hermes gateway migrate --multiplex             # 应用（在 TTY 上会请求确认；-y 跳过）
hermes gateway migrate --standalone            # 回滚为按配置档网关
```

### `hermes update` 会做什么

更新成功后，当安装中存在两个或更多配置档、至少一个次要配置档运行自己的网关（活跃进程或已安装服务）、且 `gateway.multiplex_profiles` 处于关闭状态时，`hermes update` 会运行相同的预检：

- **没有任何阻塞** → 迁移自动运行（与 `hermes gateway migrate --multiplex --yes` 相同的代码路径）并打印其操作。该过程是确定性的，绝不提示，因此也会在无头/cron 更新中运行。
- **有阻塞** → 一个警告块列出每个阻塞项及其确切的修复方法，以及稍后可运行的一行命令。不做任何更改。

单配置档安装永远不会被迁移（没有收益），已经处于多路复用的安装也保持原样。当没有任何次要配置档运行自己的网关时，`hermes update` 也不做任何事——它绝不会在什么都没运行的安装上切换模式。

### `hermes update` 自身永远不会跨越的边界

非交互式钩子只会合并那些共享**同一个 UNIX 用户、同一个服务域和同一个 `profiles/` 树**的配置档——也就是 `hermes profile create` 生成的那种形态。位于以下任何边界之外的独立次要网关会让自动路径停下来：

| 边界 | 示例 |
|---|---|
| 不同的服务管理器或作用域 | 默认实例在用户级 systemd 上，而次要实例在**系统级** systemd(或 launchd)上，或者默认实例以分离方式运行而次要实例由服务管理器管理 |
| 一个配置档上安装了一个以上的单元 | 同一个配置档同时存在用户级**和**系统级单元(显式命令会同时移除两者) |
| 不同的 UNIX 用户 | 带有自己 `User=` 的系统级单元，或由其他 uid 拥有的活跃网关；某系统级单元的 `User=` 在本主机上无法解析时，会被视为未知，而绝不会被视为“同一用户” |
| `HERMES_HOME` 位于 `<默认 home>/profiles/` 之外 | 某个单元固定了 `HERMES_HOME=/opt/hermes/profiles/emma` |

在这种情况下，`hermes update` 会打印它发现的边界以及
`hermes gateway migrate --multiplex`，然后不做任何更改——不移除任何单元，
`gateway.multiplex_profiles` 保持关闭。合并这样的集群会用进程内隔离替换
内核强制的边界(文件所有权、`User=`)，这是运维人员的决定。显式命令仍然可以
这么做：同样的发现会以**通知**的形式出现在 `hermes gateway migrate --multiplex --dry-run`
中，方便你先阅读，然后在你确认后 `--multiplex` 才会继续执行。

### 退出自动迁移

在**默认**配置档上设置 `gateway.auto_multiplex_migration: false`，即可让此安装
永远不运行自动合并：

```bash
hermes config set gateway.auto_multiplex_migration false
```

此后 `hermes update` 会完全保持各配置档网关原样，没有输出也没有任何更改，
无论安装看起来多么符合条件。该设置存放在配置中，因此能跨更新保留——
决定只需做一次，而不必在每个版本上重新争论。它和其他所有设置一样从生效配置中读取，
因此在受管作用域(`/etc/hermes/config.yaml`)中固定的值会优先于配置档自己的文件。
它只管辖**自动**路径：`hermes gateway migrate --multiplex` 是显式请求，仍会执行迁移
(这也是重新启用的受支持方式)。缺失或设为 `true` 则保持上述默认行为。

显式命令则不同：在两个或更多配置档且**没有**独立次要网关的情况下，
`hermes gateway migrate --multiplex` 仍会执行剩下的那一步——它会设置
`gateway.multiplex_profiles: true`，(重新)启动默认网关，并写入同样的回滚清单
(`secondaries` 列表为空)，因此 `--standalone` 可以撤销它。你要求多路复用，
就会得到多路复用。

:::tip 克隆不会携带渠道
`hermes profile create --clone` 会留下源配置档的机器人令牌和允许列表
(参见 [配置档 → 消息渠道从不被克隆](./profiles.md#messaging-channels-are-never-cloned---clone-channels-to-opt-in)),
因此一整批克隆不会再触发下面的重复凭据阻断项。
仍然携带这些凭据的旧克隆会被 `hermes profile list` 标记出来。
:::

### 迁移会做什么

1. 停止每个次要配置档的独立网关，并卸载其服务(systemd 用户级/系统级单元或
   launchd 代理)。被移除的内容会记录在 `~/.hermes/gateway_migration.json` 中以便回滚。
2. 在**默认**配置档的 `config.yaml` 中设置 `gateway.multiplex_profiles: true`。
3. 重启默认网关——或者在次要网关原先使用的同一服务管理器上安装并启动它，
   这样由 systemd 管理的集群仍由 systemd 管理。
4. 等待默认网关记录覆盖每个配置档的 `served_profiles`，然后打印摘要。

### 阻断项与修复

| 阻断项 | 原因 | 修复 |
|---|---|---|
| 两个配置档配置了同一个平台凭据(例如相同的 `TELEGRAM_BOT_TOKEN`) | 在同一个进程下，机器人令牌只能被轮询一次；多路复用器会搁置重复的那个，该配置档的机器人就会静默 | 从第二个配置档中移除该令牌，或将其保留在 `default` 中并用 [`profile_routes`](#routing-shared-bot-chats-to-profiles-profile_routes) 路由该配置档的聊天 |
| 某次要配置档启用了一个端口绑定平台，但默认监听器上**没有** `/p/<profile>/` 入口 | 多路复用器会跳过整个配置档(参见[规则 2](#2-http-inbound-platforms-are-reached-via-a-pprofile-url-prefix)) | 在该配置档中禁用该平台(`platforms.<name>.enabled: false`)，或用 `hermes -p <name> gateway start --force` 让该配置档继续使用独立网关 |

凭据检查复用了网关自身的冲突检测，因此其判定结果与多路复用器启动时的行为一致。
哪些端口绑定平台具有 `/p/<profile>/` 入口是从适配器自身读取的(每个适配器都声明
`serves_profile_prefix`)，因此当新的 HTTP 入站适配器获得该前缀时，预检仍能保持正确。

### 入站端口配置档会发生什么变化

在自身端口上使用 `api_server` 或 `webhook` 的次级配置档**不会**被阻止——但其 URL 会发生变化。预检会打印确切的新 URL，例如：

```
Profile 'coder': api_server moves onto the default listener at
http://127.0.0.1:8642/p/coder/v1/... (its key/secret is unchanged; update
clients that call the old per-profile port).
```

配置档自身的 `API_SERVER_KEY` / webhook secret 仍会对带前缀的 URL 进行认证；密钥的其他方面没有任何变化。

### 迁移后创建的配置档

在多路复用器运行时创建的配置档无需重启即可被服务（见上文）。当正在运行的多路复用器识别到该配置档时，`hermes profile create` 会予以确认；只有当它无法连接到多路复用器时（例如网关由旧版本构建启动），它才会打印 `hermes gateway restart` 提醒。

### 回滚

```bash
hermes gateway migrate --standalone
```

读取 `gateway_migration.json`，将 `gateway.multiplex_profiles` 恢复为其先前值，重启默认网关，并重新安装/启动每个已记录的按配置档的服务（system 单元会带着它原有的 `User=` 恢复）。一切恢复后，清单文件会被移除。

正向迁移同样是事务性的：如果在移除按配置档的网关之后，默认网关启动失败（例如一个必须以 root 运行的 system 单元），`--multiplex` 会当场通过清单文件回滚，因此不会有配置档处于没有网关的状态。如果在切换标志位与启动默认网关之间进程终止，下一次 `hermes gateway migrate --multiplex` 会看到清单文件却没有正在运行的网关，因而从清单文件继续执行，而不是报告“已多路复用”。如果不存在清单文件（你手动启用了多路复用），请用 `hermes config set gateway.multiplex_profiles false && hermes gateway restart` 退出多路复用模式，并重新安装你所需的按配置档服务。

不自动涵盖的情况：s6 监督的容器（在默认配置档上设置标志位并重启容器）和 Windows 计划任务（设置标志位，停止按配置档的任务，`hermes gateway restart`）。当预检发现有符合条件安装时，仪表盘的 System 页面会提供同样的迁移功能作为按钮。

## 更新代码

`hermes update` 拉取一次最新代码，并将新增的捆绑技能同步到每个配置档：

```bash
hermes update
hermes-gateways restart
```

更新本身会重启正在运行的网关；在仍按配置档逐个运行网关的安装上，更新随后会提供[迁移到单一多路复用网关](#migrating-from-per-profile-gateways)的选项——在没有任何阻碍时自动进行，否则以警告形式给出修复建议。

用户修改过的技能永远不会被覆盖。

## 故障排除

### “Could not find service in domain for user gui: 501”

这是在先前的 `hermes gateway stop` 之后又运行了 `hermes gateway start`。CLI 的 `stop` 会执行完整的 `launchctl unload`，这会将服务从 launchd 的注册表中移除。CLI 在 `start` 时会捕获这个特定的错误，并自动重新加载 plist（`↻ launchd job was unloaded; reloading service definition`）。服务会正常启动。无需修复。

### 崩溃后残留的 PID

如果某个配置档的网关显示 `not running`，但进程仍然存活：

```bash
ps -ef | grep "hermes_cli.*-p <profile>"
cat ~/.hermes/profiles/<profile>/gateway.pid
kill -TERM <pid>          # graceful
kill -KILL <pid>          # if that fails after a few seconds
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
hermes doctor                  # default profile
hermes -p <profile> doctor     # one profile
```
