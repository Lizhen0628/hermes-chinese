---
sidebar_position: 30
title: "Hermes Relay"
description: "通过拥有平台凭据的中继连接器将 Hermes 连接到消息平台 —— 注册、能力、配置与故障排查"
---

# Hermes Relay (连接器)

:::warning 实验性功能
Relay 目前处于**实验性**阶段。在系统验证期间，通信协议、认证方案和配置可能会在没有弃用周期的情况下发生变化。
:::

Hermes Relay 本身不是聊天平台 —— 它是一个**连接器系统**，让你的网关能够对接一个或多个真实消息平台（Discord、Telegram、Slack、WhatsApp……），而**无需持有任何平台凭据**。一个独立的服务，即*连接器*，拥有平台机器人令牌和套接字。你的网关通过单个经过认证的 WebSocket 向连接器**拨出**连接，在握手时接收能力描述符，然后通过该套接字交换规范化消息事件（入站）和操作（出站）。

关键特性：

- **仅出站网络。** 网关从不开放入站端口。入站消息沿着网关拨出的同一个 WebSocket 传回，因此中继可以在 NAT 后面以及没有公网 IP 的主机上正常工作。
- **网关上没有平台密钥。** 机器人令牌存放在连接器上。需要认证的平台媒体 URL 会在连接器侧重托管，因此平台凭据永远不会跨越通信链路。
- **平台无关。** 网关从握手描述符中获知所对接平台的能力（消息长度限制、markdown 方言、编辑/线程/流式支持，以及支持操作的精确集合），而非来自硬编码的平台逻辑。

正式的网关 ⇄ 连接器接口位于代码仓库的 `docs/relay-connector-contract.md`。

## 何时使用 Relay

Relay 适用于由托管或共享连接器服务管理平台侧的部署场景 —— 例如多租户托管中一个共享机器人对接多个用户的智能体，或者你不希望机器人令牌出现在网关机器上的设置。如果你直接运行自己的机器人，请改用原生平台适配器（[Telegram](/user-guide/messaging/telegram)、[Discord](/user-guide/messaging/discord) 等）。

## 注册

自托管网关使用每个网关独有的密钥向连接器进行认证。`hermes gateway enroll` 会用一个**一次性注册令牌**（由连接器在你的租户路由被配置时生成，并随你的网关配置一起交付）换取该密钥：

```bash
hermes gateway enroll \
  --token <enrollment-token> \
  --connector-url wss://connector.example.com/relay
```

它做了什么：

1. 从你现有的登录信息（`~/.hermes/auth.json`）中解析出一个新的 Nous Portal 访问令牌 —— 这证明你拥有哪个 Nous 组织（租户）。如果配置了 `gateway.idp.token_url`，则改用你自己的 IdP（气隙/自托管 IdP 路径，不涉及 Nous Portal）：当也配置了 `client_id`/`client_secret` 时，执行通用的 OAuth2 客户端凭据授予；当两者都未配置时，该 URL 被视为环境令牌端点（简单的 GET，响应体即为令牌 —— 元数据服务器模式，例如 Domino 的 `$DOMINO_API_PROXY/access-token`）。只配置两个凭据中的一个是错误。
2. 通过 TLS 将注册令牌和网关 id POST 到连接器的 `/relay/enroll` 端点。
3. 连接器验证令牌（签名、一次性、租户匹配），生成一个每网关密钥和一个每租户投递密钥，并一次性返回它们。
4. 将凭据持久化到 `~/.hermes/.env`：
   `GATEWAY_RELAY_ID`、`GATEWAY_RELAY_SECRET`、`GATEWAY_RELAY_DELIVERY_KEY`
   （以及提供时的 `GATEWAY_RELAY_URL` / `GATEWAY_RELAY_WAKE_URL`）。

之后重启网关以加载新的环境变量。

标志：

| 标志 | 描述 |
|------|-------------|
| `--token` | 一次性注册令牌。也可通过 `GATEWAY_RELAY_ENROLL_TOKEN` 设置。 |
| `--connector-url` | 连接器基础 URL 或中继 URL（`wss://…/relay` 或 `https://…`）。也可通过 `GATEWAY_RELAY_URL` 或 `config.yaml` 中的 `gateway.relay_url` 设置。 |
| `--gateway-id` | 此网关实例的稳定 id（用于杀伤开关的粒度）。默认为 `gw-<hostname>`。 |
| `--wake-url` | 可选的可达 URL，连接器会在网关空闲时缓冲工作到达时探测它（无载荷 GET）以唤醒此网关。持久化为 `GATEWAY_RELAY_WAKE_URL`。没有它时，网关仍会在下次重连时排空缓冲消息。 |

:::note 托管安装
`hermes gateway enroll` 在托管/受管安装中拒绝运行 —— 在那里，托管平台会直接将中继密钥配置到容器环境中。
:::

## 配置

当中继 URL 被配置时，Relay 激活。要让某个配置档即使部署注入了 URL 也不使用中继，请在 `config.yaml` 中禁用该平台：

```yaml
platforms:
  relay:
    enabled: false
```

- **显式禁用优先。** 当 `enabled: false` 时，即使设置了 `gateway.relay_url` 或 `GATEWAY_RELAY_URL`，网关也不会解析身份令牌、配置或重写 `GATEWAY_RELAY_*` 凭据、注册中继适配器或发送相关性策略。原生消息适配器会像没有中继 URL 时一样连接，定时任务投递也不会将任何平台视为中继对接。 
- **省略 `enabled` 保持基于 URL 的激活。** `enabled: true` 仍然需要一个连接器 URL。`gateway.json` 中的 `enabled: false` 是建议性的，与所有其他平台一样；将退出选项放在 `config.yaml` 中（用户或托管）。

该判定来自网关加载器使用的相同文件和合并（顶级或 `gateway.platforms` 块、托管覆盖），并在激活时应用。更改后重启网关；已打开的中继套接字不会被拆除。运行时中继被禁用时，`hermes gateway enroll` 仍然可用。

| 设置 | 位置 | 含义 |
|---------|-------|---------|
| `GATEWAY_RELAY_URL` | 环境变量（`~/.hermes/.env`） | 连接器中继 WebSocket URL。启用中继，除非在平台配置中显式禁用。 |
| `gateway.relay_url` | `config.yaml` | 同上，配置文件形式（环境变量优先）。 |
| `GATEWAY_RELAY_ID` | 环境变量 | 此网关实例的 id（由 `enroll` 写入）。 |
| `GATEWAY_RELAY_SECRET` | 环境变量 | 认证 WebSocket 升级的每网关密钥（由 `enroll` 写入）。 |
| `GATEWAY_RELAY_DELIVERY_KEY` | 环境变量 | 每租户投递密钥（由 `enroll` 写入；为向前兼容保留）。 |
| `GATEWAY_RELAY_WAKE_URL` / `gateway.relay_wake_url` | 环境变量 / `config.yaml` | 可选的空闲/挂起网关唤醒探测目标。 |
| `GATEWAY_RELAY_PLATFORMS` | 环境变量 | 此网关通过一个连接对接的平台列表，逗号分隔（例如 `discord,telegram`）。通常由部署/编排器标记。 |
| `GATEWAY_RELAY_BOT_IDS` | 环境变量 | 每平台机器人身份的 JSON 映射，例如 `{"discord": {"botId": "…"}}`。与 `GATEWAY_RELAY_PLATFORMS` 配合使用。 |
| `gateway.idp.token_url` | `config.yaml` | 设置时，注册/配置将对你自己的 IdP 进行认证而非 Nous Portal：当也设置了 `gateway.idp.client_id`/`client_secret` 时为 OAuth2 客户端凭据；否则为环境令牌端点（返回令牌的简单 GET，原始或 `{"access_token": …}`）。 |

## 支持的能力

通过中继连接实际能做什么是在握手时协商的：连接器声明一个 `supported_ops` 列表，网关只使用连接器明确声明支持的操作（较旧的连接器回退到传统的 `send`/`edit`/`typing`/`follow_up` 集合）。每平台能力标志（基于编辑的流式、线程、草稿流式、markdown 方言、消息长度限制）也来自握手描述符。受该协商约束，中继支持：

- **文本消息与流式** —— 发送、回复，以及在前述平台支持消息编辑时基于渐进编辑的流式；否则输出降级为每段一条消息。
- **双向媒体** —— 出站图像、语音、音频、视频和文档上传到连接器（或通过公共 URL 引用），并通过各平台的原生上传通道投递，带标题。入站附件本地化为供智能体使用的文件；需要认证的平台 URL 会在连接器侧重托管，因此平台凭据永远不会到达网关。媒体重托管上限为 25 MB，约 1 小时后过期。
- **原生交互式提示** —— 执行审批、确认和澄清问题以**原生平台控件**呈现（Discord 按钮、Telegram 内联键盘、Slack Block Kit 操作、WhatsApp 按钮/列表消息），而非编号文本回退。按钮按下作为来自实际点击用户经认证的提示响应返回，因此网关的授权门控与键入回复完全一样适用。提示过期在网关侧强制执行。
- **表情回应确认生命周期** —— 机器人的处理状态表情（处理时 👀，完成时 ✅/❌）通过中继工作。表情回应是尽力而为的：失败的表情回应永远不会导致一轮对话失败。
- **线程生命周期** —— 通过平台抽象的 `thread_create` / `thread_rename` 操作创建交接线程和重命名线程（包括 LLM 命名的语义化重命名），配有防止覆盖保护，因此人工的手动重命名优先。可用性取决于平台（例如 Slack 线程无法重命名；WhatsApp 没有线程）。
- **输入指示器** —— 网关在处理期间通过连接器发出输入中（和停止输入）。
- **聊天元数据** —— 当 `get_chat_info` 查找被声明支持时，代理到连接器。
- **缓冲投递与唤醒** —— 当网关空闲或断开连接时，连接器持久地缓冲入站消息，并在重连时按顺序重放它们（确认门控，无丢失或重复）。如果注册了唤醒 URL，连接器会在缓冲工作到达睡眠中的网关时探测它。

支持多平台对接：一个网关可以通过单个中继连接对接多个平台（例如 Discord *和* Telegram），每条出站消息都标记为其目标平台。

## 故障排查

**注册失败并返回 401** —— 连接器无法验证你的身份令牌。使用 `hermes auth add nous`（或 `hermes setup`）重新登录并重试。

**注册失败并返回 403** —— 注册令牌无效、已过期、已被使用或属于不同的租户。注册令牌是一次性的；从配置你租户路由的人那里请求新的令牌。

**"无法访问连接器"** —— 检查连接器 URL。你可以粘贴 `wss://…/relay` 拨号 URL 或 `https://…` 基础 URL；CLI 会自动在两者之间映射。

**`enroll` 拒绝运行** —— 你处于托管/受管安装中，中继密钥由托管平台提供。自助注册仅适用于自托管网关。

**Relay 平台在之前正常工作后显示为禁用** —— 在成功握手*之后* WebSocket 关闭并返回代码 4401 意味着网关的密钥已被撤销（例如实例被取消配置）。网关会故意停止重连并将中继报告为禁用，而非重试。在*任何成功握手之前*的 4401 被视为瞬态的尚未配置竞争，并正常重试。

**注册后没有任何变化** —— 网关在启动时读取 `GATEWAY_RELAY_*`。重启它（`hermes gateway restart`）。

**某项功能（按钮、媒体、线程……）静默降级为纯文本** —— 你平台的连接器在其握手 `supported_ops` 中没有声明该操作。网关是故意回退到文本行为，而非发送连接器无法处理的操作。
