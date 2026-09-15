---
title: "Relay ↔ Connector 契约"
description: "Hermes 网关 relay 适配器与外部连接器之间的通信契约（实验性）"
---

# Relay ↔ Connector 契约（v1，实验性）

> **状态：** 实验性。在至少两个真实的 Class-1 平台（Discord + Telegram）验证此契约之前，本契约可能在不经过弃用周期的情况下发生变更。实验阶段的演进遵循**仅新增**原则，由 `contract_version` 控制。破坏性变更需在两个仓库中同步更新。

本文档是 **Hermes 网关**（Python，`gateway/relay/`）与**连接器**（Node/TypeScript，`NousResearch/gateway-gateway`）之间的正式接口。连接器实现者的第一步就是阅读此文件。

网关运行一个通用的 `RelayAdapter`，它**向外**拨号到连接器，在握手时接收 `CapabilityDescriptor`，然后通过每轮双向 WebSocket 交换规范化的 `MessageEvent`（入站）和动作（出站）。网关永远不会知悉其前置的具体平台；连接器拥有所有平台特定的 socket/身份逻辑。

---

## 1. 握手

1. 网关打开传输通道（`connect`）。
2. 网关调用 `handshake()`；连接器返回一个 `CapabilityDescriptor`（见第 2 节），描述此适配器实例所前置的平台。
3. 网关根据描述符配置适配器（字符限制、长度单位、草稿/编辑/线程/markdown 能力），并注册入站处理器。
4. 连接器随后推送入站事件并接受出站动作。

`contract_version`（当前为 `1`）携带在描述符中。网关忽略未知的描述符字段（向前兼容），并从默认值填充缺失的可选字段。

---

## 2. CapabilityDescriptor（握手载荷）

JSON 对象。事实来源：`gateway/relay/descriptor.py`。

| 字段 | 类型 | 必填 | 含义 |
| --- | --- | --- | --- |
| `contract_version` | int | 是 | 契约版本（同一版本内仅新增）。 |
| `platform` | string | 是 | 平台名称（例如 `"discord"`、`"telegram"`）。 |
| `label` | string | 是 | 人类可读的标签。 |
| `max_message_length` | int | 是 | 字符限制；网关将其暴露为 `MAX_MESSAGE_LENGTH`。0 → 视为 4096。 |
| `supports_draft_streaming` | bool | 是 | 原生草稿流式预览支持。 |
| `supports_edit` | bool | 是 | 支持基于编辑的流式传输；若为 false，消费者降级为每段一条消息。 |
| `supports_threads` | bool | 是 | `create_handoff_thread` 能力。 |
| `markdown_dialect` | string | 是 | `"plain"`、`"markdown_v2"`、`"discord"` 等（驱动 `supports_code_blocks`）。 |
| `len_unit` | string | 是 | `"chars"`（内置 len）或 `"utf16"`（Telegram UTF-16 代码单元）。 |
| `emoji` | string | 否 | 展示用 emoji（默认 🔌）。 |
| `platform_hint` | string | 否 | 系统提示词中的平台提示。 |
| `pii_safe` | bool | 否 | 在会话描述中脱敏 PII。 |
| `supports_context` | bool | 否 | 连接器是否能为该平台上的被寻址轮次提供周围频道/群组**上下文**（模式 A 按需拉取历史 —— Discord/Slack/Matrix；模式 B 被动缓冲 —— Telegram/Signal/WhatsApp）。默认 false ⇒ 入站事件不附带 `context`。参见 §3。 |
| `supports_inchannel_continuable` | bool | 否 | 平台是否可承载**扁平的可持续定时任务界面**（原生 Slack 的 `cron_continuable_surface: in_channel`）：简报在频道/私信中作为顶层消息发布，纯回复即通过扁平的 `(platform, chat_id, None)` 会话继续该任务。默认 false ⇒ 网关的调度器安全回退到线程模式（D6 门控），因此旧版连接器保持现有的线程行为。 |
| `supports_block_formatting` | bool | 否 | 当网关在 `send`/`edit` 帧上标记 `metadata.format_hints` 时，该平台的发送者是否能从原始 markdown 渲染**块级格式**（Slack：对表格/列表/代码使用原生 `markdown` 块，保留 mrkdwn 文本作为回退）。默认 false ⇒ 网关永不打标记，因此旧版连接器永远不会收到该元数据。 |
| `supported_ops` | string[] | 否 | 操作级能力发现：该平台连接器的发送者实际实现的出站操作名称（例如 `["send", "edit", "typing", "follow_up", "get_chat_info"]`）。缺失/为空 ⇒ 连接器早于该字段，网关假定为旧版操作集（`send`/`edit`/`typing`/`follow_up`）；新操作仅在显式声明时才被使用。 |

大多数字段是网关现有 `PlatformEntry` 的投影；仅运行时字段（`len_unit`、`supports_*`、`markdown_dialect`）来自实时平台适配器的能力方法。

---

## 3. 入站：`MessageEvent` 信封

连接器将每个平台线路事件规范化为一个 `MessageEvent`（`gateway/platforms/base.py`），并将其投递给网关。**入站数据通过网关的出站 `/relay` WebSocket 投递**（见下方传输说明）——连接器沿着网关已拨号的套接字推送一个 `inbound` 帧。网关通过嵌入的 `SessionSource` 使用 `build_session_key()` 来键控会话——因此填充正确的判别符是连接器最重大的正确性职责。

### 入站传输（WS 反向通道，而非 HTTP）

网关向外拨号连接连接器的 `/relay` WebSocket，用于握手 + 出站动作（§4）+ 网关自身的 `/stop` 出口（§5）。入站则沿**同一套接字**反方向传输：连接器沿着网关的出站 WS 推送一个 `inbound` 帧（以及 §5 的 `interrupt_inbound`）。**不存在网关侧的入站 HTTP 端点**——网关不需要（而且，当被托管时，也不能）暴露任何入站端口；一切数据流经它发起的连接。

**多实例路由。** 拥有某个平台套接字的连接器实例（因此产生入站事件）通常**不是**网关向其出站 WS 拨号的那个实例。因此，产生事件的实例将事件发布到连接器内部的**中继总线**（Redis 发布/订阅；`RelayBus` 位于 `src/core/relayBus.ts`）上，以租户为键。每个连接器实例都订阅，并将每条消息路由到该租户在**本地**的会话（`RelayServer.routeBusMessage`）；实际持有网关套接字的那个实例进行投递，而对租户没有本地会话的实例则不执行任何操作。因此，跨实例投递是集群内的 Redis 跳转，而非公共 HTTP 调用。

帧（连接器 → 网关，经 WS）：

- `{"type":"inbound", "event": <MessageEvent>, "bufferId"?}`
- `{"type":"interrupt_inbound", "session_key", "chat_id"}`（§5）
- `{"type":"passthrough_forward", "forward": <PassthroughForward>, "bufferId"?}`（§5.1）

**入站时的频道上下文（设计 relay-channel-context）。** 当源平台的描述符声明了 `supports_context`（§2）且聊天为多方（`chat_type` ∈ group/channel/thread/forum，永不为 `dm`）时，连接器可以（MAY）向入站 `MessageEvent` 附加两个可选、可加的字段：

- `context`：一组只读的周围消息（同一频道，从最旧→最新）——连接器获取（Model A）或缓冲（Model B）的附近非被寻址的杂谈。仅供引用：它从不触发智能体（触发决策已在连接器侧单独基于被寻址的事件做出了）。网关将其渲染为 `MessageEvent.channel_context`（与历史回填使用的只读注入路径相同）。
- `context_error`：布尔值，当平台支持上下文但获取/缓冲失败，且连接器失效开放为空的 `context` 时为 true（可观测性标记；连接器侧通过投递 span 暴露）。

两者都缺失 ⇒ 与当前字节完全相同。从不发送它们的连接器、`dm`、或不支持上下文的平台，均不产生 `channel_context`。

`PassthroughForward` 是转发的透传平面请求（Class-2/3 webhook——Discord 交互、Twilio）的线路形式：`{platform, botId, method, path, headers: [[k,v],…], bodyB64, profile?}`。`profile` 是可选的——当 NAS 为 Team-Gateway 交互解析目标配置档时，连接器会写入它；省略它（单配置档网关）则保留到默认 `agent:main` 会话命名空间的传统路由，与 `inbound` 帧的 `SessionSource` 已携带的 `profile` 字段相对应（#60586）。正文经过 base64 编码，使任意字节在换行分隔的 JSON 传输中得以保留；网关将其 base64 解码回连接器所转发的精确字节（连接器已在边缘验证了服务商标识并剥除了任何共享身份凭证——§6——因此网关重新处理的是一个已净化、无令牌的正文，并通过无令牌的 `follow_up` 路径对其执行操作）。参见 §3.1。

**信任。** WS 升级使用网关的每网关密钥（§6.1）进行认证，因此该通道端到端可信——入站帧无需单独进行 HMAC 签名（经过认证的套接字包含了旧 HTTP 路径所需的每次投递来源证明）。中继总线跳转位于连接器信任域内（与租约/缓冲/能力存储相同）。

> 本契约的早期草案通过一个已签名的 **HTTP POST** 将入站投递到 `gatewayEndpoint`（`HttpGatewayDelivery` + 网关侧的 `inbound_receiver`），使用每租户投递密钥进行 HMAC 签名。那要求每个网关都暴露一个可到达的入站 URL——这对托管网关来说是不可能的，因为它们没有公共 IP。上述 WS 反向通道取代了它；每租户投递密钥在开通时被保留以供前向兼容，但不再用于入站。**透传平面**（Class-2/3 webhook，如 Discord 交互 / Twilio）历史上仍使用 `gatewayEndpoint` 来进行其 ACK 后的转发；第 5 阶段 §5.1 将该转发也移到 WS 上（即上文的 `passthrough_forward` 帧），因此托管网关无需任何公共入站表面，一旦切换落地，`gatewayEndpoint` 即被弃用。

### 3.1 直通面转发（§5.1）

直通面在连接器 EDGE 处应答服务商的延迟敏感 ACK（例如 Discord 的延迟交互响应需在约 3 秒内完成），随后对真实请求向网关执行**即发即忘**（fire-and-forget）转发。该转发无需返回响应（服务商侧已得到满足），因此它通过 `passthrough_forward` 帧复用与 `inbound` 相同的出站 WS，而非使用 HTTP POST。网关通过其常规智能体路径处理解码后的请求（Discord 交互被解码为 `MessageEvent` 并像消息一样处理；回复经由出站 / `follow_up` 路径输出）。当该转发被缓冲时（Phase 5 §5.3 仅缓冲翻转）会携带 `bufferId`，网关在持久化交接完成后对其进行 ack。



### SessionSource 字段（线上传输面）

唯一事实来源：`gateway/session.py` 中的 `SessionSource.to_dict()`。这些是网关在线上接受的全部键。`platform`、`chat_id`、`chat_type`、`user_id`、`user_name`、`thread_id`、`chat_name` 和 `chat_topic` 始终存在（可能为 `null`）；其余字段仅在设置时包含。

| 字段 | 类型 | 始终发送 | 含义 |
| --- | --- | --- | --- |
| `platform` | string | 是 | 平台名称（与描述符的 `platform` 匹配）。 |
| `chat_id` | string | 是 | 主会话 id（频道/聊天）。会话键鉴别符。 |
| `chat_type` | string | 是 | `dm` / `group` / `channel` / `thread` / `forum`。 |
| `chat_name` | string\|null | 是 | 人类可读的聊天名称。 |
| `user_id` | string\|null | 是 | 消息作者 id。会话键鉴别符。 |
| `user_name` | string\|null | 是 | 作者显示名称。 |
| `thread_id` | string\|null | 是 | 处于线程中时的线程/论坛主题 id。会话键鉴别符。 |
| `chat_topic` | string\|null | 是 | 频道主题/描述（Discord、Slack）。 |
| `user_id_alt` | string | 否 | 平台特定的稳定备用 id（Signal UUID、Feishu union_id）。 |
| `chat_id_alt` | string | 否 | 备用聊天 id（例如 Signal 群组内部 id）。 |
| `scope_id` | string | 否 | 平台中立的 **scope** 鉴别符：Discord guild / Slack workspace / Matrix server。**Discord/Slack 作用域隔离所必需。** 会话键鉴别符。（D-Q2.5 线上迁移后的规范名称。） |
| `guild_id` | string | 否 | **旧版别名，连接器不再读取。** 自 D-Q2.5c 起，连接器只读取和写入 `scope_id`；网关智能体范围内的 `SessionSource.to_dict()` 仍会为非中继会话持久化发出 `guild_id`（镜像到 `scope_id`），因此它仍可能出现在线上，但连接器会忽略它。不要依赖它。 |
| `parent_chat_id` | string | 否 | 当 `chat_id` 指向线程时的父频道。 |
| `message_id` | string | 否 | 触发消息的 id（用于 pin/reply/react）。 |

> `is_bot`（作者是否为机器人/webhook 分类）存在于网关侧的数据类上，但在 v1 中**有意不上线**——它不是 `to_dict()` 的一部分。在该字段首先被添加到这里并添加至 `to_dict()`（增量升版）之前，不要将其加入连接器的 `SessionSource`。

### 各平台的 SessionSource 鉴别符

| 平台 | chat_id | chat_type | user_id | thread_id | scope_id |
| --- | --- | --- | --- | --- | --- |
| **Discord** | 频道 id | `dm`/`group`/`thread` | 作者 id | 线程频道 id（线程） | **guild id**（服务器隔离所必需） |
| **Telegram** | 聊天 id | `dm`/`group`/`forum` | 来自 id | 论坛主题 id（论坛） | — |

**把 Discord 的 `guild_id` 弄错，两个服务器就会碰撞进同一个会话。** 这是 #1 高严重度风险。网关的 `build_session_key()` 是一致性判定标准：对于给定的 `SessionSource`，连接器的归一化必须产生与 Python 适配器相同的键。（Phase-1 桩测试断言已知输入 → 已知键。）

### 机器人身份 vs 租户（单机器人整合，附录 A）

信封携带**发起机器人身份**，它作为与租户**不同**的字段。租户从事件自身的鉴别符解析（Discord 的 `guild_id`、Telegram 的 `chat_id`、webhook 路径/子域名）——**绝不**从是哪个 token/socket/进程投递它来解析。这使一个共享机器人无需重载现有字段即可服务多个租户（Phase 6）。

### 作者优先解析 + 账号关联（DM）路径（阶段 7）

阶段 7 为共享 bot 增加了**自助式、按用户的开户引导**，这改变了*由哪个*判别器来解析被路由的入站消息所对应的实例——并新增了一条供用户绑定自己账号的管理路径。

**作者优先解析（多租户公会规则，D-7.2）。** 一个 Discord 公会可以容纳**多个**租户——不同成员各自关联到自己的智能体。因此对于投递，连接器从**经过认证的作者绑定**（`user_instance_binding`，通过 `resolveByUser` 以 `(tenant, platform, platform_user_id)` 为键）来解析目标实例，而**不是**通过公会→实例路由。具体而言：

- 由**已关联**用户撰写的被路由消息只会到达**该用户自己的**实例——即使**同一公会**中的第二个已关联用户由不同的实例服务也是如此（每个只会到达自己的）。
- 由**未关联**用户撰写的消息解析不到**任何**实例，会被丢弃（**失效关闭**——绝不向该公会的其他租户广播）。
- 所使用的作者 id 是**观测事件上真实的 `user_id`**，即上文记录的同一个 `SessionSource.user_id`——绝不是由网关断言的或承载在管理帧中的值。

这就是连接器在 `WsGatewayDelivery` 中强制执行的按 `user_id` 的仅限所有者路由（网关侧多租户公会端到端驱动程序 `gateway_multitenant_guild_driver.py` 是跨仓库的判定基准）。

**账号关联（DM）路径。** 用户通过一次性代码将自己的账号绑定到实例，方法是向共享 bot 发送私信来兑换：

1. 所有者在 Portal（或自托管 CLI）中触发一次关联。连接器为**经过认证的**实例铸造一个短时效的**关联代码**（`POST /manage/link`；instanceId 来自调用方的主体——一个 NAS 签名的 `aud=agent:{instanceId}` 令牌，或该实例自身的按网关密钥——**绝不是**请求体）。
2. 用户从希望绑定的账号向共享 bot 发送 **直接消息** `/link <code>`。
3. 连接器的入站观察者**消费**该私信（它不会被路由到任何智能体），并使用观测到的私信事件上**真实的 `user_id`** 写入 `user_instance_binding`。此后，作者优先解析会将该用户的消息路由到绑定的实例。

**退出是连接器权威的。** 注销一个实例（`POST /manage/deprovision`）会丢弃其作者绑定（因此其用户不再解析到它），**并**吊销其按网关密钥（因此其套接字无法再通过认证——下一次 WS 升级会被以 **4401** 关闭）。一个在**此前握手成功之后看到 4401 关闭**的网关，会将其视为终态吊销：它停止重连，并将中继平台报告为**已禁用**（而非可重试的错误）。在任何成功握手*之前*的 4401 仍然可重试（这是冷启动／尚未注册的竞态，而非吊销）。

### 3.2 进入空闲／切换为缓冲的原语（§5.3）

一个缩容至零的原语（不是行为——此处没有任何东西决定休眠或挂起机器；后续工作流会消费这些帧）。它让网关能够进入排空／空闲转换，而不会丢失在其离开期间到达的入站消息，方法是让连接器为该实例进行缓冲，并在重连时重放。

三个帧（都以连接的**经过认证的**按实例 id 为键——在 WS 升级时从存储的密钥记录中读取，绝不在帧中断言）：

- `{"type":"going_idle"}`（网关 → 连接器）——作为网关**现有**排空转换的一部分发出（适配器在拆除套接字前发送它）。请求连接器将此实例切换为**仅缓冲**。
- `{"type":"going_idle_ack"}`（连接器 → 网关）——连接器已完成切换：实时投递已停止，该实例随后的入站消息会持久地缓冲。网关**在此 ack 之前会持续服务**（因此落在切换窗口内的事件会被实时投递，而不是丢失——与总线相同的先 SUBSCRIBE 后服务顺序纪律）。只有在此 ack 之后才能安全关闭。
- `{"type":"inbound_ack", "bufferId"}`（网关 → 连接器）——对重连时重放的缓冲 `inbound` 投递（其携带 `bufferId`）的持久回执。连接器只有在此之后才 ack 该缓冲条目，从而在**投递段**上实现无重复排空：一个在排空中途死掉的实例会恰好重投其未 ack 的尾部；已被 ack 的条目永不重投。

**缓冲 + 排空。** 在切换期间，连接器将入站消息追加到一个持久化的按实例投递段缓冲（`delivery:<instanceId>`），而不是实时推送。在网关**重连**时（一个全新的重连循环，在意外关闭后重新拨号 + 重新握手），新的握手会触发连接器通过新套接字排空该积压——**按顺序、以 ack 为门控**，然后清除切换以恢复实时投递。这复用了与 Discord→连接器摄取段相同的 `drainWithoutDup` 机制，应用于连接器→网关投递段。全程连接器权威：网关只能切换／排空**它自己的**实例。

> 不在范围内（延迟行为）：决定排空的自主空闲计时器、实际的机器挂起，以及 NAS 挂起健康模型。该原语是“当网关排空时，中继切换为缓冲 + 在重连时重放，无丢失／无重复”；**什么**触发了排空不在范围内。

### 3.3 唤醒提示（§5.2）

睡眠/唤醒循环的另一半：SUSPENDED 网关如何得知自己有缓冲的工作在等待。这是一个原语——这里没有任何东西会挂起机器；它只是接通了唤醒信号，以便未来的 scale-to-zero 行为层能够依赖“有缓冲 ⇒ 唤醒提示”。

- **注册。** 网关在 enroll/provision 时注册一个**唤醒 URL**——连接器可以 GET 以唤醒它的任意可达 URL（Fly autostart 主机名、仪表盘主机）。自托管：`hermes gateway enroll --wake-url <url>`（或 `GATEWAY_RELAY_WAKE_URL` / `gateway.relay_wake_url`）。托管/NAS：写入容器环境变量，与 `GATEWAY_RELAY_URL` 并列。在 `/relay/provision` 请求体中作为 `wakeUrl` 转发，并按实例存储在连接器的 secret record 上（由网关断言但安全限定作用域——与 `instanceId` 相同的姿态；org/tenant 仍由令牌验证，因此网关只能为其自己的实例注册唤醒目标）。与已废弃的 `gatewayEndpoint` **不同**：它是**提示目标**，不是投递目标。
- **提示。** 当仅缓冲（进入空闲）的目的地收到其第一个缓冲事件时，连接器向该实例注册的 `wakeUrl` 发起一个**无载荷、未签名的 GET**，**直接**发起（不经过 NAS 中介——relay 保持与 NAS 无关）。它不携带任何租户数据，也不含入站：它只是说“你有缓冲的工作，重新连接。”当网关重新拨号（经过认证的 WS 升级）时，租户权限会以常规方式重新建立，因此泄露/被猜到的唤醒 URL 最多只能导致其自己的实例发生一次虚假重连。按实例限流（每个冷却窗口一次提示，而非每个事件一次），并且是尽力而为——失败的提示会被吞掉；网关仍会在下次自行重新连接时排空。没有新帧：唤醒是一个带外 HTTP GET，不是 relay-WS 消息（socket 已断——这正是要点所在）。

> 不在范围内（延后的行为）：实际的机器挂起（Fly `autostop:"suspend"`）以及决定睡眠的自主空闲计时器。原语是“睡眠实例有缓冲事件 ⇒ 其 wakeUrl 被提示”；是什么让实例睡眠（以及唤醒后服务）是行为层的事。

### 3.4 未来 scale-to-zero 行为层的义务

§3.2 与 §3.3 交付的是**原语**；本节是**一个独立的 scale-to-zero 行为工作流为安全消费它们所必须遵守的契约。**它拥有挂起的*决策*、实际的机器挂起，以及平台/健康模型——这些都不在这里——但它必须持有这些保证，因为原语假定了它们：

1. **在实例可能被挂起之前注册 `wakeUrl`。** 一个没有注册 `wakeUrl` 的被挂起实例就是一个黑洞——缓冲的入站永远不会触发提示，于是它会一直睡过自己的流量，直到别的东西把它重新连接起来。行为层必须确保注册一个可达的唤醒目标（自托管：`--wake-url`；托管：写入），作为允许挂起的前提条件。一个在机器挂起期间不可达的唤醒 URL（例如，它指向被挂起的机器本身，而前面没有平台 autostart）等同于没有。
2. **通过 `going_idle` → 等待 `going_idle_ack` 排空，然后才拆除 socket 或挂起。**绝不要在有一个未确认的 flip 处于进行中时挂起。ack 是连接器的确认：此实例的投递现在仅为缓冲。一个在发送 `going_idle` 之后、得到 ack 之前就挂起的机器可能丢掉与 flip 竞争的入站。网关已经以该 ack（Q-5.3c）作为 socket 拆除的门控；挂起步骤必须位于干净排空完成*之后*，而不是与之竞争。
3. **保持新的（NET-NEW）重连循环存活，作为挂起的前提条件。**唤醒→排空契约是“提示 ⇒ 网关重新拨号 ⇒ 连接器在重连握手上排空。”如果重连循环被禁用，提示会落在一台永不重新拨号的机器上，缓冲区就会滞留。行为层不得挂起其 relay 传输不会在唤醒时重连的实例。
4. **在健康模型中把已挂起 ≠ 已宕机（Q-5.3b）。**已挂起的实例是健康睡眠，不是故障。健康/监控层必须区分二者（例如借助平台机器状态），这样已挂起实例就不会被重启、告警或被当作不健康而回收——那会破坏挂起，并且会与唤醒/排空竞争。
5. **唤醒提示是尽力而为且限流的——不要假定恰好一次或立即唤醒。**每个实例每个冷却窗口最多一次提示，失败的提示会被吞掉。行为层不得把提示当作有保证/及时的信号；正确性仍然建立在“网关会在下次重新连接时排空”之上。多重保险的唤醒（例如一个也会重连的定时任务）是行为层的选择，而非原语的。
6. **仅在真正空闲时挂起——而空闲是连接器可观测的，而非网关猜的。**什么算空闲（没有进行中的轮次 + N 分钟内没有入站）是行为层的策略，但它必须与现有排空机制（`gateway_state` running→draining）组合，而不是引入一条并行的仅 relay 空闲路径——这与 §3.2 对 `going_idle` 施加的是同一个集成约束。

这些是行为层欠原语的保证；原语欠行为层的只有 §3.2/§3.3 已然规定的那些（going_idle 上的 flip、按实例的持久缓冲 + 以 ack 门控的重连排空，以及已 flip 实例的首个缓冲事件上的提示）。

---

## 4. 出站：动作集

网关携带 action 字典调用 transport。权威来源：
`gateway/relay/transport.py` + `gateway/relay/adapter.py`。

| `op` | 字段 | 结果 |
| --- | --- | --- |
| `send` | `chat_id`、`content`、`reply_to?`、`metadata?` | `{success: bool, message_id?, error?}` |
| `edit` | `chat_id`、`message_id`、`content`、`metadata?` | `{success: bool, error?}` |
| `typing` | `chat_id`、`content?`、`metadata?` | `{success: bool}` |
| `follow_up` | `session_key`、`kind`、`content`、`metadata?` | `{success: bool, message_id?, error?}` |
| `send_media` | `chat_id`、`media_kind`、`source_url`、`content?`（caption）、`filename?`、`reply_to?`、`metadata?` | `{success: bool, message_id?, error?}` |
| `prompt` | `chat_id`、`prompt_kind`、`prompt_id`、`content`（问题文本）、`options[]{id,label,style?}`、`timeout_s?`、`reply_to?`、`metadata?` | `{success: bool, message_id?, error?}` |
| `react` | `chat_id`、`message_id`、`emoji`、`remove?`、`metadata?` | `{success: bool, error?}` |
| `thread_create` | `chat_id`（父级）、`thread_name`、`message_id?`（锚点）、`metadata?` | `{success: bool, thread_id?, error?}` |
| `thread_rename` | `chat_id`（父级）、`message_id`（线程 id）、`thread_name`、`only_if_current_name?`、`metadata?` | `{success: bool, error?}` |

`get_chat_info(chat_id)` 是一个独立的代理调用，至少返回 `{name, type}`。

**`send_media`（Phase 2 媒体出站）。** 媒体以引用方式过线：
`source_url` 可以是 (a) **连接器重新托管（re-host）** 的引用，网关此前已通过
`POST {connector}/relay/media` 上传（原始字节体，`Content-Type` + 可选的
`X-Media-Filename` 头，按网关的 HMAC bearer——与 WS 升级相同的令牌方案；响应
`{id, size}` → 引用 `{connector}/relay/media/{id}`），或者 (b) 一个**公开
http(s) URL**（例如 fal.media 的生成结果），连接器直接下载。`media_kind` 为
`image` / `voice` / `audio` / `video` / `document` 之一，用于选择平台原生的上传
通道（Telegram `sendPhoto`/`sendVoice`/…，Discord 多部分附件，Slack 外部上传，
WhatsApp 媒体上传 + 媒体消息）。字幕承载在 `content` 中并通过平台常规 markdown
通道渲染；不支持原生字幕的平台会收到一条后续文本发送（连接器侧）。这两条路由与
该 op 都以 `supported_ops` 声明 `send_media` 为门控条件——旧版连接器永远不会看到
该 op（网关的媒体发送退化为媒体功能之前的文本回退）。大小上限 25 MB（连接器
`mediaStore.ts` 中的 MEDIA_MAX_BYTES；超出则以上传 413 拒绝）。

**入站媒体（Phase 2 媒体入站）。** 入站事件的 `media_urls` 携带可获取的引用：
平台公开 URL 直接透传（Discord CDN）；需要鉴权/会过期的平台 URL（Telegram file
API、Slack `url_private`、WhatsApp Graph 媒体）由连接器侧用平台凭证下载，并重新
托管为 `{connector}/relay/media/{id}`——平台凭证永远不过线。重新托管的引用可被任意
已鉴权网关读取（能力 URL 语义：id 为 128 位随机值，且已投递给每个被接纳的接收方）；
网关用自己的按网关 bearer 下载每个引用，并将本地文件路径交给智能体，与原生适配器
一致。重新托管会过期（TTL 约 1 小时）——应在收到时下载，而非延迟下载。一个平行的
`media` 数组（顺序一致）补充 `kind`、`mime`、`size`、`filename`、`caption` 元数据；
`message_type` 反映第一个附件的 kind（`image`/`audio`/`document`）。

**`prompt`（Phase 3 交互）。** 单一的平台抽象 op 以原生控件渲染网关风险最高的
交互（执行审批、斜杠命令确认、澄清选择器）：Discord 按钮组件、Telegram inline
键盘、Slack Block Kit actions、WhatsApp 按钮消息（≤3 个选项）/列表消息（4–10 个；
>10 退化为编号文本回退）。`prompt_kind`（`approval`/`clarify`/`choice`）仅是样式
提示。`prompt_id` 由网关铸造，对连接器不透明；每个选项的回调载荷携带令牌
`hp1:<prompt_id>:<option_id>`（≤64 字节——Telegram 的 `callback_data` 上限约束着
每条通道；选项 id 为 `[A-Za-z0-9_.-]`，≤32 字符）。网关用同一字符集和预算将 prompt
id 铸造为 `<每进程 nonce>.<8 位十六进制>`：连接器会把透传转发（Discord 的按键）
扇出到该租户的每个在线网关会话，这点与消息不同——消息会收窄到已接纳的实例集合，
因此 nonce 是网关区分「自己」的 prompt 与「兄弟网关」的 prompt 的方式。`style`
按平台映射（primary/success/danger/secondary）。`timeout_s` 在线上是建议性的——
过期强制在网关侧进行（待处理 prompt 注册表会移除过期条目；拥有该 prompt 的网关
随后回复一条简短的「不再等待」通知）。

**`prompt_response`（Phase 3 入站）。** 用户的按键以普通入站 MessageEvent 原样
返回，携带 `prompt_response: {prompt_id, option_id, label?, prompt_message_id?}`
——绝非裸的平台 `custom_id`。该事件的 `text` 镜像 `/{option_id}` 且
`message_type: "command"`，以便不具备该字段的网关将按键作为打字回复路由，而不是
将其丢弃。而理解该字段的网关始终会改为消费该按键：一个不是它铸造的 prompt id 属于
同样被该扇出触达的兄弟网关，若放任 `/{option_id}` 文本进入聊天通道，会让每个兄弟
网关在拥有者的唯一 ack 下都回答「Unknown command」。来源是真实的点击用户
（连接器观测到：Telegram `callback_query.from`、Slack `block_actions.user`、
WhatsApp `messages[].from`、Discord interaction member/user），因此网关侧的鉴权
门控对按钮按压完全等同于对照打出的 `/approve` 生效。接入通道：Telegram
`callback_query`（轮询，`allowed_updates` 已拓放；尽力而为的
`answerCallbackQuery` 停止加载动画）、Slack `POST /slack/interactions`（原始字节
HMAC + 重放窗口，与 `/slack/commands` 姿态一致）、WhatsApp 交互式
`button_reply`/`list_reply`（webhook 规范化分支）、Discord 类型 3 组件交互
（透传 §5.1 净化后转发；类型 3 边界 ack 为 `DEFERRED_UPDATE`，因此不会出现可见的
「thinking…」回复）。外部回调载荷（其他集成的按钮）永远不会变成 prompt 事件：
Telegram/Slack/WhatsApp 在连接器处丢弃它们；Discord 类型 3 转发保留旧有的
custom_id 当作文本的形态。

**`react`（Phase 3 ack 生命周期）。** 对 `message_id` 添加/移除机器人自己的
`emoji` 反应——通过 relay 恢复原生适配器 👀→✅/❌ 的处理生命周期 ack。线上使用
Unicode emoji；Slack 发送方映射到 Slack 的名称词汇表（`eyes`、
`white_check_mark` 等），并把 `already_reacted`/`no_reaction` 视为成功（幂等）。
Telegram 使用 `setMessageReaction`（空集 = 移除；Telegram 的精选 emoji 限制可能
拒绝某些字形——失败是结构化的，网关将反应视为装饰性）。WhatsApp 发送一条反应消息
（emoji 为空 = 移除）。按约定反应是尽力而为：`react` 失败绝不能导致一个轮次失败。

**`thread_create` / `thread_rename`（Phase 4 线程生命周期）。** 一对平台抽象操作
覆盖交接线程、Telegram DM/forum 话题，以及 LLM 标题的语义重命名。`thread_create`：
Discord 在有 `message_id` 时发布一个频道线程（类型 11）或一个消息锚定线程；
Telegram `createForumTopic`（返回话题 id）；Slack 发布一条命名的种子根消息并返回
其 `ts`（那里线程是消息锚定的——显式传入的 `message_id` 锚点会原样回显）。创建的
id 承载在 `SendResult.thread_id` 上。`thread_rename`：Discord PATCH 线程频道；
Telegram `editForumTopic`。**`only_if_current_name` 不覆盖保护**即原生适配器「人类
重命名优先」的语义，在连接器侧强制执行：Discord 先读取当前名称，不匹配时不作处理
（结构化的 `success:false`）；Telegram 没有话题名读取，因此受保护的 rename 无法
满足并不惜失败（不加保护的 rename 照常进行）。Slack 不声明 `thread_rename`
（根消息的文本是内容，不是名称）。WhatsApp 两者都不声明（无线程）。

**自动线程标记 + 网关声明的命令清单（Phase 4 入站/握手）。** 当连接器的自动线程
出站策略创建一个 Discord 线程时，后续来自该线程的入站事件携带
`source.auto_thread_created: true` + `source.auto_thread_initial_name`——这是连接器
观测到的证据，用于点亮网关的语义重命名通道（LLM 会话标题通过受保护的
`thread_rename` 重命名线程；每实例记忆，因此在 N>1 的集群中遗漏只会导致该通道不
被点亮）。网关也可以在 Discord 的 `hello` 帧上声明其斜杠命令集
（`command_manifest: [{name, description, options?}]`）；连接器据此校正 Discord 的
全局应用命令注册（GET → diff → 批量 PUT 覆盖；幂等、去抖、尽力而为——注册失败绝
不影响握手）。命令仍和以前一样通过透传平面分发；清单只是用来让 Discord 的注册表与
网关调度器实际处理的内容保持同步。

**入站 `reply_to` 富化（Phase 4）。** 平台回复可能携带
`reply_to: {text?, author?, is_own?}` 连同 `reply_to_message_id`——即用户**引用**
的内容，仅在连接器手头已有这些数据时才填充（Discord 的 inline
`referenced_message`、Telegram 的 inline `reply_to_message`、WhatsApp 的
`context.from` + 一个有界的每实例入站文本缓存用于文本部分）。字段缺失意味着平台
没有携带该数据——绝不触发额外的平台 API 调用。`is_own` = 被引用的消息由前端的机器人
所写（与 `is_reply_to_bot` 相关性标记相同的证据）。网关把这些映射到原生适配器填充
的同一组 MessageEvent 回复上下文字段上。

**`typing` 的 `content?`（Slack 状态清除）。** `typing` 帧通常省略 `content`
——连接器渲染其平台的活跃指示器（Slack 上为「is typing…」Assistant 状态，其他
平台为一次性 typing）。**空字符串** `content` 是显式的*清除*请求：在 Slack 上，
连接器将 Assistant 线程状态置为 `""`，使其消失。网关仅为 Slack（持久状态）发出
清除；一次性平台从不会收到它。这在 `contract_version` 1 内是增量式的，但要注意
部署顺序：早于 gateway-gateway #154 的连接器会忽略 `content`，并会在清除帧上
*设置*「is typing…」——请先部署连接器。

**`follow_up`（A2 能力动作）。** 某些入站载荷携带作用于**共享**机器人身份的凭证
（例如 Discord interaction 后续令牌）。按 §6，连接器在边缘剥离它，并将其绑定到一个
以其会话为键的能力保险库中；它**永远不会到达网关**。要使用它，网关发出 `follow_up`
并指明**它已经处于的会话**（`session_key`）以及能力 `kind`（如
`discord.interaction_token`）——**绝不携带令牌**。连接器从其保险库解析出真实值，
强制租户匹配（租户 B 永远不能使用租户 A 的能力），然后出站。当能力不存在/已过期或
租户不匹配时返回 `success: false`——按设计，网关没有可用于重试的东西（一个泄露的
网关持有的能力材料为零）。权威来源：`gateway/relay/transport.py`
（`send_follow_up`）+ `gateway/relay/adapter.py`。

---

## 5. 中断（`/stop`）路由

- **网关 → 连接器：** `send_interrupt(session_key, reason?)` 通过出站 WS 发出回合中的 `/stop`。连接器必须将其转发到运行该 `session_key` 的网关实例（路由不变式）。
- **连接器 → 网关：** 针对某个 `session_key` 的入站中断被作为 `interrupt_inbound` 帧沿网关的出站 WS 下发（§3 传输说明）——经由 relay 总线跨实例路由到持有该 socket 的实例——并由适配器的 `on_interrupt(session_key, chat_id)` 桥接进现有的按会话中断机制，精确取消该回合（同级回合不受影响）。

两个方向都走网关的出站 WS：网关→连接器的 `/stop` 通过它发出，连接器→网关的中断作为规范化事件走同一条 `inbound` 反向通道。

---

## 6. 信任边界与签名正文处理（A2）

**连接器是唯一的加密/身份边界。网关不做任何再验证。**

Webhook 签名（Discord ed25519、Twilio HMAC、WeCom BizMsgCrypt）是基于精确的原始字节计算的，而部分负载是用共享密钥**加密**的。连接器为众多租户前置一个**共享**机器人，并持有每个租户的平台密钥，因此它会：

- **在边缘验证 / 解密**（密钥唯一存在的地方），
- **规范化**负载为租户作用域的 `MessageEvent`（§3），
- **从负载中剥离任何共享身份凭证**，并将其按会话为键绑定到自己的能力库中（见 §4 `follow_up`），
- **只转发已净化处理的 `MessageEvent`**——绝不转发原始的签名正文。

因此网关在 relay 路径上**不**执行任何平台签名/加密验证；它信任规范化后的事件。这是网关侧的一条强制不变式（`tests/gateway/relay/test_relay_sheds_crypto.py`：relay 包不导入/不调用任何平台加密）。

**为什么不采用“逐字节转发签名正文让网关再验证”？** 这种较早期的模式在不可信、一次性的租户网关下是站不住脚的：

- 再验证 Twilio HMAC / WeCom 加密需要把**共享签名密钥**交给网关——这本身就是泄露，而在共享机器人上它是*跨租户*泄露。
- WeCom 负载用共享密钥加密；连接器为了路由必须先在边缘解密，所以转发密文同样需要把密钥交给网关。
- Discord 的交互令牌存在于签名 JSON 正文**内部**——你无法既保留原始字节又剥离该凭证；它们是同一串字节。

因此字节保留被有意放弃：连接器重新序列化净化后的事件，网关信任它。这也统一了直通平面和 relay 平面——两者都是“在边缘验证 → 发出规范化事件”，只在传输方式上不同。完整 A2 理由及连接器侧密钥库见 `docs/capability-trust-boundary.md`（连接器仓库：`gateway-gateway`）。

### 6.1 通道认证（连接器⇄网关链路本身）

A2 让连接器成为平台密钥的唯一持有者，而网关可能是**客户自管理且暴露于互联网**的，因此连接器⇄网关通道本身需要认证。网关持有由注册或配置签发的**每网关密钥**（`hermes gateway enroll` → 连接器 `/relay/enroll`，或托管的自动配置 → `/relay/provision`），用于认证其出站 WS 升级。这是一套 HMAC-SHA256 方案，带有多密钥轮换验证列表（网关侧：`gateway/relay/auth.py`；连接器侧：`src/core/relayAuthToken.ts`）。

| 链路 | 凭证 | 机制 |
|-----|-----------|-----------|
| 网关 → 连接器 WS 升级 | 每网关密钥 | `/relay` 升级时携带的 `Authorization` bearer 头。令牌为 `base64url(payload:exp:sig)`，其中 `payload = gatewayId`，`sig = HMAC(payload:exp, secret)`。连接器验证并在不匹配/缺失/已吊销时拒绝升级（**close 4401**）。已认证租户来自连接器的存储，绝不来自 `hello` 帧。 |
| 连接器 → 网关入站（`inbound` / `interrupt_inbound` 帧） | —（走已认证的 WS） | 入站沿网关已认证的出站 socket 下发（§3），因此不需要逐条消息签名。注册/配置时仍会签发**每租户投递密钥**并为前向兼容而保留，但不再用于签名入站。 |

这是**通道**认证器——不同于平台加密，relay 路径仍完全卸载平台加密（§6）。网关不持有任何平台密钥；每网关密钥只认证连接器链路。完整威胁模型 + 注册/轮换/终止开关设计：`docs/connector-gateway-auth-design.md`（连接器仓库）。

---

## 7. 按实例投递与管理平面（第 6 阶段）

第 1–5 阶段将连接器视为单租户前端：针对某个租户的入站事件会扇出到该租户的网关套接字。**第 6 阶段让投递变为按实例进行** —— 共享机器人可以为同一租户中的多个用户/智能体提供前端服务（一个 Discord 服务器、一个 Telegram 机器人）而不会发生交叉投递 —— 并新增了一个小型**管理平面**，供智能体（或被托管的 Portal）用来声明谁可见什么、什么内容是相关的。所有这一切都位于**连接器侧**；网关唯一新增的职责是在启动时**声明其相关性策略**（§7.3）。

### 7.1 投递闸门（连接器侧，信息性）

对于每个入站事件，连接器通过组合三个与（AND）过滤条件来决定哪些实例接收它。网关并不实现这些 —— 它们运行在连接器中 —— 但它们定义了网关所依赖的投递语义：

| 层 | 问题 | 事实来源 |
| --- | --- | --- |
| **所有者 / 范围 ∧ 主体** | 此实例*可以*在此处看到该作者吗？ | 按用户的 `user_id → instance` 绑定（所有者下限）+ 按实例的 `(guild, channel)` 范围授权 + `owner-only` / `allow-list` / `any` 主体策略。 |
| **可见性下限** | 该实例绑定的所有者能否在 Discord 中实际 `VIEW_CHANNEL` 此项？ | 实时 Discord ACL（有效权限），失效关闭。将过于宽泛的范围授权向下收窄。 |
| **相关性** | *在*它可以看见的前提下，智能体是否应参与进来？ | §7.3 中声明的相关性策略（地址门控 / 自由响应 / 允许机器人）。 |

这个组合只会**收窄**投递范围（`deliver ⇔ authorized ∧ visible ∧ relevant`）；**所有者下限会绕过相关性层**（作者自己的消息总是会到达他们自己的实例 —— 你不会 @提到你自己的智能体）。由未绑定用户编写的消息不会到达任何实例（失效关闭）。完整设计与不变式位于连接器仓库中（`NousResearch/gateway-gateway`）；本节是面向网关的摘要。

### 7.2 管理路由（连接器侧，需认证）

连接器挂载了需要认证的管理路由。它们与 WS 升级共享**相同的双认证**：要么是受托管 NAS 签名的 `aud=agent:{instanceId}` RS256 JWT，**要么**是网关自己的每网关密钥 bearer（§6.1 `make_upgrade_token`）。在两种情况下，连接器都从其**存储的**记录中解析出权威的 `{tenant, instanceId}` —— 而**不是**从请求正文中解析（正文中声称的 `instanceId` 会被忽略）。

| 路由 | 用途 |
| --- | --- |
| `POST /manage/link` | 签发一个短期代码，将平台账户绑定到已认证实例（`/link <code>` 流程；连接器从入站事件中读取真实的 `user_id`）。 |
| `POST /manage/scope`、`/manage/scope/release` | 为已认证实例申领 / 释放一个 `(guild, channel)` 范围。一个频道最多由一个实例拥有（非重叠是 PK 约束）。 |
| `POST /manage/principal` | 设置实例的主体策略（`owner-only` \| `allow-list` \| `any`）。 |
| `POST /manage/dm-default` | 设置用户的 DM 默认实例（当用户绑定了不止一个时的 DM 决胜规则）。 |
| `POST /relay/policy` | 声明实例的**相关性策略**（§7.3）。 |

这些路由由连接器拥有（管理平面不属于网关的智能体路径）；网关仅调用 `POST /relay/policy`（§7.3）。其他路由由被托管的 Portal / `hermes` CLI 驱动。

### 7.3 相关性策略声明（网关的职责）

相关性层（§7.1）是网关自身行为开关（`require_mention`、`free_response_channels`、`{PLATFORM}_ALLOW_BOTS`）的按租户一致性对等物。因此，为了让**相同**的行为约束中继投递，网关会将这些开关投射为一个**与平台无关**的策略，并在启动时（在其每网关密钥被解析后）通过 `POST /relay/policy` POST 出去。

正文（`gateway/relay/__init__.py` 的 `relay_relevance_policy()` → `send_relay_policy()`）：

| 字段 | 类型 | 投射自 | 含义 |
| --- | --- | --- | --- |
| `platform` | string | 所前端的平台（`relay_platform_identity`） | 此策略适用于哪个平台。 |
| `requireAddress` | bool | `require_mention` | 非所有者消息必须 @提到 / 回复机器人，才算相关。 |
| `freeResponseScopes` | string[] | `free_response_channels` | 豁免 `requireAddress` 的范围（频道）id。与 §7.1 范围授权使用相同的范围词汇表。 |
| `allowOtherBots` | bool | `{PLATFORM}_ALLOW_BOTS ∈ {mentions, all}` | 接纳机器人编写的消息（默认关闭）。 |

认证使用每网关升级令牌（§6.1），因此连接器会将策略附加到已认证实例上。网关是**事实来源**，并且**每次启动**都会重新声明（全量替换，与预置阶段的 `routeKeys` 上插保持一致 —— 自我修复）。当投射出的策略全为默认值时，网关不发送任何内容（连接器的缺行默认值已与之匹配）。该 POST 是**失效柔和**的：失败只记录日志，启动照常进行 —— 相关性是叠加在授权闸门（§7.1）之上的一层优化，而从来不是启动依赖。这里**没有新的网关入站面**，也**没有新的凭证** —— 它复用了每网关密钥以及同 `/relay/provision` 相同的主机。

> 相关性丢弃发生在连接器唤醒缩容至零的智能体（第 5 阶段）**之前**，因此被排除的闲聊永远不会启用一个智能体 —— 相关性既是首要的缩容至零杠杆，也是正确性过滤器。

---

## 8. 网关侧平台行为控制（企业版）

企业部署在**网关**侧配置被前置平台的平台行为，位于 `platforms.relay.extra.<platform>` 下——即该平台原生选项的一个受支持子集。中继通道上不会读取原生的平台配置块（例如 `platforms.slack`）；连接器以帧元数据（§4）的形式接收这些控制的*结果*并机械地执行——它自身不持有任何平台行为策略。

```yaml
platforms:
  relay:
    extra:
      slack:
        reply_in_thread: true   # 默认值
```

解析顺序：嵌套的 `extra.<platform>` 对象优先 → 其次沿用 `extra` 上的遗留扁平键作为回退 → 最后使用默认值。权威来源：`RelayAdapter._effective_reply_in_thread`（`gateway/relay/adapter.py`）。值的强制转换与原生 Slack 适配器完全一致——`1/true/yes/on`（不区分大小写、去除空白）为开启，其余一切为关闭——因此 YAML 中带引号的 `"false"` 会���旋钮关闭，而不会被当作真值字符串来解读。

当前控制项（Slack）：

| 键 | 默认值 | 作用 |
| --- | --- | --- |
| `reply_in_thread` | `true` | `true`：每条消息一个线程——每个顶层私信消息各自锚定自己的线程（状态、进度、提示、最终回复都携带该 `metadata.thread_id`）。`false`：扁平滚动的私信流——发送通道帧不携带任何线程锚点（是剥离，而并非省略），每个私信共享一个会话。 |
| `dm_top_level_threads_as_sessions` | `true` | 原生对齐的逃生舱（对应 `platforms.slack.extra.dm_top_level_threads_as_sessions`）。`true`：在每条消息一个线程的模式下，每个顶层私信消息以其自身的会话为键，因此并发消息可并行运行。`false`：保留线程化回复的放置方式，但跳过会话标记——使用一个滚动的私信会话（采用遗留的转向/排队姿态）。在扁平模式下无效果，该模式始终保留单一的滚动会话。 |

当触发消息的时间戳（triggering-ts）已知时，键入/状态帧始终携带该锚点（活跃性提示是无条件的，两种模式皆然）：Slack 的状态行是线程作用域的，而在扁平模式下，发送侧的锚点剥离保证了状态锚点绝不会泄漏到回复放置中。原生键的语义参见 [Slack](/user-guide/messaging/slack)。

线程锚点解析适用于**每一条**发送通道——文本（`send`）与媒体（`send_media`）——都经由同一个汇聚点（`RelayAdapter._apply_slack_thread_anchor`）。媒体帧经由连接器侧相同的 Slack 发送器发出，该发送器仅在 `metadata.thread_id` 上进行线程化，因此附件的锚点解析与文本回复完全一致：在每条消息一个线程的模式下被提升进元数据，在扁平模式下被剥离。

更改在网关重启后生效；不涉及连接器。

---

## 9. 版本策略

- `contract_version` 是整数；在实验阶段**仅**针对增量式变更（新增可选字段、新增 `op`）递增。
- 破坏性变更（重命名/删除字段、变更语义）要求两个仓库协同更新并进行版本递增。
- 连接器的首个 PR 需引用它所实现的本文件的提交 SHA。
