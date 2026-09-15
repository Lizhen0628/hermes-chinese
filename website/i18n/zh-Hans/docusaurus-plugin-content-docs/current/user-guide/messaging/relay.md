---
sidebar_position: 30
title: "Hermes Relay"
description: "通过一个持有平台凭据的中继连接器将 Hermes 连接到消息平台——注册、能力、配置与故障排查"
---

# Hermes Relay（连接器）

:::warning 实验性功能
Relay 目前处于**实验性**阶段。在系统验证期间，其协议约定、认证方案与配置
可能会在不提供弃用周期的情况下发生变化。
:::

Hermes Relay 本身并不是一个聊天平台——它是一个**连接器系统**，让你的网关能够接入
一个或多个真实的即时通讯平台（Discord、Telegram、Slack、WhatsApp……），
**而无需持有任何平台凭据**。一个独立的服务——即*连接器（connector）*——持有平台的
机器人令牌（bot token）与套接字。你的网关通过单条经过认证的 WebSocket **主动向外**
拨号连接到该连接器，在握手时收到能力描述符，随后通过该套接字交换归一化的消息事件
（入站）与动作（出站）。

关键特性：

- **仅出站网络连接。** 网关从不开放入站端口。入站消息沿着网关拨出的同一条
  WebSocket 回传，因此 Relay 可在 NAT 之后以及没有公网 IP 的主机上正常工作。
- **网关侧不保存平台密钥。** 机器人令牌保存在连接器上。需要认证的平台媒体 URL
  会在连接器侧重新托管，因此平台凭据绝不会流经网络。
- **与平台无关。** 网关从握手描述符中获知前端平台能做什么（消息长度限制、
  Markdown 方言、编辑/话题/流式支持，以及确切支持的操作集合），而非依赖
  硬编码的平台逻辑。

正式的网关 ⇄ 连接器接口位于仓库中的
`docs/relay-connector-contract.md`。

## 何时使用 Relay

Relay 适用于由托管或共享的连接器服务管理平台侧的部署场景——例如多租户托管，
一个共享机器人服务众多用户的智能体；或者你不希望机器人令牌出现在网关机器上的
部署环境。如果你自行直接运行机器人，请改用原生的平台适配器
（[Telegram](/user-guide/messaging/telegram)、
[Discord](/user-guide/messaging/discord) 等）。

## 注册

自托管网关使用每个网关专属的密钥向连接器进行认证。`hermes gateway enroll`
会用一个**一次性注册令牌**（由连接器在你的租户路由被开通时生成，并随你的
网关配置一并下发）来换取该密钥：

```bash
hermes gateway enroll \
  --token <enrollment-token> \
  --connector-url wss://connector.example.com/relay
```

它执行的操作：

1. 从你现有的登录（`~/.hermes/auth.json`）中解析出一个全新的 Nous Portal
   访问令牌——以此证明你拥有哪个 Nous 组织（租户）。如果配置了
   `gateway.idp.token_url`，则改用你自己的 IdP（这是气隙/自托管 IdP 路径，
   不涉及 Nous Portal）：当配置了 `client_id`/`client_secret` 时执行通用的
   OAuth2 客户端凭据授予；当两者都未配置时，该 URL 被视为环境令牌端点
   （简单的 GET，其响应体即为令牌——即元数据服务器模式，例如 Domino 的
   `$DOMINO_API_PROXY/access-token`）。只配置两个凭据中的一个属于错误。
2. 通过 TLS 将注册令牌与网关 id POST 到连接器的
   `/relay/enroll` 端点。
3. 连接器验证该令牌（签名、一次性、租户匹配），签发一个每网关专属密钥
   以及一个每租户投递密钥，并将其一次性返回。
4. 将凭据持久化到 `~/.hermes/.env`：
   `GATEWAY_RELAY_ID`、`GATEWAY_RELAY_SECRET`、`GATEWAY_RELAY_DELIVERY_KEY`
   （当提供时，还有 `GATEWAY_RELAY_URL` / `GATEWAY_RELAY_WAKE_URL`）。

之后重启网关以加载新的环境变量。

标志：

| 标志 | 描述 |
|------|-------------|
| `--token` | 一次性注册令牌。也可通过 `GATEWAY_RELAY_ENROLL_TOKEN` 设置。 |
| `--connector-url` | 连接器基础 URL 或中继 URL（`wss://…/relay` 或 `https://…`）。也可通过 `GATEWAY_RELAY_URL` 或在 `config.yaml` 中的 `gateway.relay_url` 设置。 |
| `--gateway-id` | 此网关实例的稳定 id（用于停机开关的粒度）。默认为 `gw-<hostname>`。 |
| `--wake-url` | 可选的可达 URL，连接器在网关空闲期间有缓冲工作到达时对其发起探测（无载荷 GET）以唤醒此网关。持久化为 `GATEWAY_RELAY_WAKE_URL`。没有它时，网关在下次重连时仍会排空缓冲的消息。 |

:::note 托管安装
`hermes gateway enroll` 在托管/被托管的安装中拒绝运行——在这些环境中，
托管平台会直接将中继密钥置入容器环境。
:::

## 配置

当配置了连接器中继 URL 时，Relay 会被激活。即使部署注入了 URL，
若要让某个配置档不接入 Relay，可在 `config.yaml` 中禁用该平台：

```yaml
platforms:
  relay:
    enabled: false
```

- **显式禁用优先。** 当 `enabled: false` 时，网关不解析身份令牌、不置备或重写
  `GATEWAY_RELAY_*` 凭据、不注册中继适配器，也不发送相关性策略——即使设置了
  `gateway.relay_url` 或 `GATEWAY_RELAY_URL`。原生消息适配器会如同没有中继 URL
  一样进行连接，定时任务投递也会视没有任何平台以前端方式接入中继为不存在。
- **省略 `enabled` 保留基于 URL 的激活。** `enabled: true` 仍需要一个连接器
  URL。`gateway.json` 中的 `enabled: false` 只是建议性的，与所有其他平台一样；
  请将退出选项写入 `config.yaml`（用户级或托管级）。

该判定来自网关加载器所使用的相同文件与合并逻辑（顶层或 `gateway.platforms`
块、托管覆盖层），并在激活时应用。更改后请重启网关；已打开的中继套接字
不会被拆除。在运行时中继被禁用期间，`hermes gateway enroll` 仍然可用。

| 设置 | 位置 | 含义 |
|---------|-------|---------|
| `GATEWAY_RELAY_URL` | 环境变量（`~/.hermes/.env`） | 连接器中继 WebSocket URL。除非在平台配置中显式禁用，否则启用 Relay。 |
| `gateway.relay_url` | `config.yaml` | 同上，配置文件形式（环境变量优先）。 |
| `GATEWAY_RELAY_ID` | 环境变量 | 此网关实例的 id（由 `enroll` 写入）。 |
| `GATEWAY_RELAY_SECRET` | 环境变量 | 用于认证 WebSocket 升级的每网关专属密钥（由 `enroll` 写入）。 |
| `GATEWAY_RELAY_DELIVERY_KEY` | 环境变量 | 每租户投递密钥（由 `enroll` 写入；为向前兼容而保留）。 |
| `GATEWAY_RELAY_WAKE_URL` / `gateway.relay_wake_url` | 环境变量 / `config.yaml` | 用于空闲/挂起网关的可选唤醒探测目标。 |
| `GATEWAY_RELAY_PLATFORMS` | 环境变量 | 此网关通过一条连接前端接入的平台逗号分隔列表（例如 `discord,telegram`）。通常由部署/编排器标记。 |
| `GATEWAY_RELAY_BOT_IDS` | 环境变量 | 每平台机器人身份的 JSON 映射，例如 `{"discord": {"botId": "…"}}`。与 `GATEWAY_RELAY_PLATFORMS` 配合使用。 |
| `gateway.idp.token_url` | `config.yaml` | 当设置时，注册/置备将针对你自己的 IdP 认证，而非 Nous Portal：当同时设置了 `gateway.idp.client_id`/`client_secret` 时使用 OAuth2 客户端凭据授予；否则视为环境令牌端点（简单的 GET，返回令牌，原始或 `{"access_token": …}`）。 |

## 支持的能力

通过中继连接实际可用的功能是在握手时协商的：连接器会公布一个 `supported_ops`
列表，网关只会使用连接器明确公布的操作（较旧的连接器会回退到旧版的
`send`/`edit`/`typing`/`follow_up` 集合）。各平台的能力标志
（基于编辑的流式传输、话题、草稿流式传输、Markdown 方言、消息长度限制）
也来自握手描述符。在受该协商约束的前提下，Relay 支持：

- **文本消息与流式传输** — 在当前端平台支持消息编辑时，发送消息、回复以及
  渐进式的基于编辑的流式传输；否则输出降级为每个片段一条消息。
- **双向媒体** — 出站图片、语音、音频、视频与文档会上传到连接器
  （或通过公开 URL 引用），并通过各平台原生的上传通道投递，附带说明文字。
  入站附件会本地化为智能体可用的文件；需要认证的平台 URL 会在连接器侧
  重新托管，因此平台凭据绝不会到达网关。媒体重新托管的上限为 25 MB，
  并会过期（约 1 小时）。
- **原生交互式提示** — 执行审批、确认与澄清问题会以**原生平台控件**
  （Discord 按钮、Telegram 内联键盘、Slack Block Kit 动作、WhatsApp 按钮/列表
  消息）呈现，而非编号文本的降级形式。按钮按下会作为来自实际点击用户的
  经过认证的提示响应返回，因此网关的授权门控与对待键入回复完全相同。
  提示过期由网关侧强制执行。
- **表情回应确认生命周期** — 机器人处理状态的表情回应
  （处理中为 👀，完成时为 ✅/❌）通过中继工作。表情回应为尽力而为：
  表情回应失败绝不会导致轮次失败。
- **话题生命周期** — 通过平台抽象化的 `thread_create` / `thread_rename`
  操作创建交接话题以及重命名话题（包括 LLM 命名的语义化重命名），
  并带有不覆盖保护，因此人工手动重命名优先。可用性取决于平台
  （例如 Slack 话题无法重命名；WhatsApp 没有话题）。
- **输入中指示器** — 网关在处理期间通过连接器发出输入中
  （以及停止输入中）信号。
- **聊天元数据** — 当被公布时，`get_chat_info` 查询会被代理到连接器。
- **缓冲投递与唤醒** — 当网关进入空闲或断开连接时，连接器会持久地缓冲
  入站消息，并在重连时按顺序重放（确认门控，无丢失或重复）。如果注册了
  唤醒 URL，连接器会在有缓冲工作到达临时休眠的网关时对其发起探测。

支持多平台前端接入：一个网关可以通过单条中继连接前端接入多个平台
（例如同时接入 Discord *与* Telegram），每条出站消息都会标记其目标平台。

## 故障排查

**注册失败并返回 401** — 连接器无法验证你的身份令牌。请使用
`hermes auth add nous`（或 `hermes setup`）重新登录后重试。

**注册失败并返回 403** — 注册令牌无效、已过期、已被使用，或属于其他租户。
注册令牌为一次性使用；请向为你开通租户路由的人员索取新的令牌。

**“Could not reach the connector”（无法访问连接器）** — 检查连接器 URL。
你既可以粘贴 `wss://…/relay` 拨号 URL，也可以粘贴 `https://…` 基础 URL；
CLI 会自动在两者之间转换。

**`enroll` 拒绝运行** — 你处于托管/被托管的安装环境中，其中中继密钥由托管
平台置备。自助注册仅适用于自托管网关。

**中继平台在之前正常工作后显示为已禁用** — *在*成功握手*之后*出现关闭码为
4401 的 WebSocket 关闭，意味着网关的密钥已被吊销（例如该实例已被解除置备）。
网关会有意停止重连，并将中继报告为已禁用，而非反复重试。在任何成功握手
*之前*出现 4401 会被视为尚未置备的暂时性竞争，并照常重试。

**注册后没有变化** — 网关在启动时读取 `GATEWAY_RELAY_*`。请重启它
（`hermes gateway restart`）。

**某项功能（按钮、媒体、话题……）静默降级为纯文本** — 你所在平台的连接器
在其握手 `supported_ops` 中未公布该操作。网关会刻意回退到文本行为，
而非发送连接器无法处理的操作。
