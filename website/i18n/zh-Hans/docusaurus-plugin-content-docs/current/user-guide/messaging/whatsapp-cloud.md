---
sidebar_position: 6
title: "WhatsApp Business (Cloud API)"
description: "通过 Meta 官方的 Business Cloud API 将 Hermes Agent 设置为 WhatsApp 机器人"
---

# WhatsApp Business Cloud API 设置

Hermes 可以通过 Meta 的**官方** WhatsApp Business Cloud API 连接到 WhatsApp。这是生产级方案：无需 Node.js 桥接子进程、无需二维码、无账号被封风险。

作为交换，你需要满足以下条件：

- 你需要一个 **Meta Business 账号**（不是个人 WhatsApp 账号）。
- 机器人运行在一个专用的商业电话号码上，而不是你的个人号码。
- Hermes 网关需要一个**公网 HTTPS URL**，以便 Meta 通过 webhook 投递入站消息。
- 在用户最后一条消息发出超过 24 小时后的回复需要预先批准的**模板**（这是 Meta 的"客服窗口"规则，不是 Hermes 的限制）。

如果这些约束不适合你的使用场景，可以选择 [Baileys 桥接集成](./whatsapp.md) 作为替代方案——使用个人账号，无需公网 URL，但属于非官方途径，容易被封。

:::tip 我应该用哪一个？
- **Cloud API（本指南）** — 运行真正的商业机器人，追求稳定性，可以接受 Meta 的验证和模板流程
- **[Baileys 桥接](./whatsapp.md)** — 个人项目、快速演示、单用户场景，愿意承担机器人手机号被封的风险
:::

---

## 快速开始

```bash
hermes whatsapp-cloud
```

向导会引导你填写每一项凭证，并在粘贴时逐一验证（能捕捉头号配置陷阱——把电话号码粘贴到 Phone Number ID 字段），还会为向导之外需要完成的步骤（启动 cloudflared、配置 Meta webhook 面板）打印准确的操作指引。

本页后续内容是手动配置参考。

---

## 前置条件

1. **一个 Meta Business 账号**。在 [business.facebook.com](https://business.facebook.com/) 创建。
2. **一个启用了 WhatsApp 的 Meta 应用**。参见下方"创建 Meta 应用"。
3. **一种将本地端口通过 HTTPS 暴露到公网的方式**。推荐 Cloudflare Tunnel（`cloudflared`）——免费、无需端口转发、无需域名。ngrok、自有域名配合反向代理 + TLS，或将网关直接绑定到公网 IP 的 VPS 也都可以。
4. **可选但推荐**：`PATH` 中有 ffmpeg，这样出站语音消息会渲染为原生 WhatsApp 语音气泡（绿色波形），而不是 MP3 音频附件。如果没有，Hermes 也能优雅降级。

---

## 创建 Meta 应用

1. 前往 [developers.facebook.com/apps](https://developers.facebook.com/apps) → **Create App**。
2. 选择用例：**"Connect with customers through WhatsApp"** → **Next**。
3. 选择或创建一个 business portfolio。查看发布要求。确认 → **Create app**。
4. 创建完成后会进入 **Customize use case → Connect on WhatsApp → Quickstart**。点击 **Start using the API** → 你就在 **API Setup** 页面了。
5. 确保已关联一个 WhatsApp Business Account（WABA）。如果你在第 3 步创建了新 portfolio，WABA 会自动创建。在 API Setup 页面确认。

你需要从面板中获取以下值——向导会按此顺序提示：

| 值 | 面板中的位置 | 字段形态 | 备注 |
|---|---|---|---|
| **Phone Number ID** | App Dashboard → WhatsApp → API Setup → "From" 下拉框下方 | 纯数字，15-17 位 | **不是**电话号码本身。头号配置错误就是把实际电话号码粘贴在这里。 |
| **Access Token** | App Dashboard → WhatsApp → API Setup → "Generate access token" | 以 `EAA` 开头，100 多个字符 | 临时 token 有效期 24 小时——生产环境请参见下方"永久 token"。 |
| **App Secret** | App Dashboard → Settings → Basic → 在 App secret 旁点击 "Show" | 32 位小写十六进制 | 用于验证入站 webhook 签名。没有它，入站消息投递会被拒绝并返回 503。 |
| **App ID**（可选） | App Dashboard → Settings → Basic | 纯数字，15-16 位 | 消息收发不需要，对分析有用。 |
| **WABA ID**（可选） | App Dashboard → WhatsApp → API Setup → 靠近顶部 | 纯数字，15 位以上 | 消息收发不需要，对分析有用。 |

---

## 永久令牌（生产环境）

临时访问令牌在 **24 小时**后过期，这意味着今天生成的令牌明天就会失效。对于生产环境部署，请使用 **系统用户永久令牌**：

1. 访问 [business.facebook.com/latest/settings](https://business.facebook.com/latest/settings) → **系统用户**（左侧边栏）。
2. **添加** → 用户名（例如 `hermes-bot`）→ 角色：**管理员**。
3. 选择新用户 → **分配资产**：
   - 选择你的应用 → 在完全控制下切换 **管理应用**。
   - 选择你的 WhatsApp 账户 → 在完全控制下切换 **管理 WhatsApp 商业账户**。
   - 点击 **分配资产**。
4. **生成令牌**，并赋予以下权限：
   - `business_management`
   - `whatsapp_business_messaging`
   - `whatsapp_business_management`
5. 设置 **令牌有效期：永不过期**。
6. 复制令牌 → 更新 `~/.hermes/.env` 中的 `WHATSAPP_CLOUD_ACCESS_TOKEN` → 重启网关。

系统用户令牌不会过期，除非你显式撤销它们。

---

## 将 Hermes 暴露到公网

Cloud API 通过 HTTPS POST 将入站消息投递到你的 webhook URL——这意味着 Hermes 网关必须能够被 Meta 的服务器访问。三种常见方式：

### Cloudflare Tunnel（推荐）

免费、无需端口转发、在 Windows / macOS / Linux 上均可运行。作为独立进程与网关一起运行。

**安装：**

```bash
# Windows
winget install Cloudflare.cloudflared

# macOS
brew install cloudflared

# Linux
# 从 https://github.com/cloudflare/cloudflared/releases 下载二进制文件
```

**运行快速隧道**（无需 Cloudflare 账户——会给你一个 `https://<random>.trycloudflare.com` URL）：

```bash
cloudflared tunnel --url http://localhost:8090
```

记下打印出的 URL——这就是你要提供给 Meta 的地址。

:::warning 快速隧道会轮换
免费的快速隧道 URL 每次重启 `cloudflared` 都会变化。如需稳定的 URL，请使用 `cloudflared tunnel login` 登录并创建一个命名隧道。免费的 Cloudflare 账户可获得无限个命名隧道——有关命名隧道工作流程，请参阅 [Cloudflare 的文档](https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/)。
:::

### ngrok

```bash
ngrok http 8090
```

免费版每次重启都会显示不同的 URL。付费版会给你一个稳定的子域名。

### 你自己的域名 + 反向代理

如果你已经有一台配置了 TLS 证书的服务器（Caddy、nginx 等），将一条路由指向 `localhost:8090` 即可。这是生产环境中最稳定的选项，但需要现有基础设施。

---

## 在 Meta 侧配置 webhook

隧道运行起来后：

1. 记下隧道打印出的公共 URL——假设是 `https://abc123.trycloudflare.com`。
2. 生成一个 **验证令牌**——向导会用 `secrets.token_urlsafe(32)` 为你生成；如果你在手动配置，请运行：
   ```bash
   python -c "import secrets; print(secrets.token_urlsafe(32))"
   ```
   将其保存为 `~/.hermes/.env` 中的 `WHATSAPP_CLOUD_VERIFY_TOKEN`。
3. 启动 Hermes 网关：`hermes gateway`。
4. 在 Meta 应用仪表板中 → **WhatsApp → 配置**（或者根据 UI 版本，为 **用例 → 自定义 → 配置**）→ 在 Webhook 部分点击 **编辑**。
5. 填写：
   - **回调 URL**：`https://abc123.trycloudflare.com/whatsapp/webhook`
   - **验证令牌**：第 2 步中获得的字符串（必须完全匹配）
6. 点击 **验证并保存**。Meta 会向你的 URL 发起一个 GET 请求，网关回显 challenge，Meta 随后将 webhook 标记为已验证。
7. 在 **Webhook 字段**下，点击 **管理** → 订阅 **messages** 字段。这告诉 Meta 真正将入站消息投递到你的 webhook。

**手动验证回路**（在第三个终端中）：

```bash
TUNNEL="https://abc123.trycloudflare.com"
VERIFY="<your verify token>"

# 应打印 HTTP 200，正文为 "hello"
curl -i "$TUNNEL/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=$VERIFY&hub.challenge=hello"

# 健康检查端点 — 应显示 verify_token_configured: true 和 app_secret_configured: true
curl "$TUNNEL/health"
```

---

## 收件人白名单（Meta 侧）

在开发模式下（你的应用通过 App Review 审核之前），Meta 会限制你的机器人可以向哪些号码发送消息：

1. App Dashboard → WhatsApp → API Setup → **To** 下拉菜单。
2. 点击 **Manage phone number list**。
3. 添加你要发送消息的号码（你自己的、你团队的、友好测试者的）。Meta 会通过 SMS 或 WhatsApp 向每个号码发送一个 6 位验证码。

开发模式下最多 5 个号码。通过 App Review 后会解除此限制。

---

## 允许列表（Hermes 侧）

除了 Meta 的收件人白名单，Hermes 还有自己的按平台允许列表，用于控制**智能体处理哪些传入消息**。添加到 `~/.hermes/.env`：

```bash
# 逗号分隔的号码，含国家代码，不要 '+'、空格或短横线
WHATSAPP_CLOUD_ALLOWED_USERS=15551234567,15557654321

# 或允许所有人（只有结合 Meta 的收件人白名单才安全）
# WHATSAPP_CLOUD_ALLOW_ALL_USERS=true
```

向导在第 6 步会设置此项。没有允许列表时，**所有传入消息都会被拒绝**——这是有意为之，这样即使收件人白名单某天被放宽，机器人也不会被随机号码调用。

---

## 完善你机器人的 WhatsApp 资料

WhatsApp 会在聊天标题和联系人列表中显示你机器人的**名称和头像**。这些无法通过 Cloud API 设置——它们存放在 Meta 的 Business Manager 里。

一旦你的机器人正常运行，前往 **[business.facebook.com/wa/manage/phone-numbers](https://business.facebook.com/wa/manage/phone-numbers/)**，点击你的号码，你会找到：

| 内容 | 位置 | 备注 |
|---|---|---|
| **显示名称** | 号码页面顶部 | 变更需经 Meta 的名称审核流程（约 24–48 小时）。 |
| **头像** | 号码页面顶部 | 方形图片，建议 ≥640×640px。立即更新生效。 |
| **简介 / 描述 / 网站 / 电子邮件 / 营业时间 / 类别** | "Edit profile" 按钮 | 当用户点击机器人名称时会出现在信息面板中。属于装饰性内容。 |
| **认证徽章**（绿色对勾） | Business Manager → Security Center → Start Verification | 需要 Meta 单独的商家验证流程。 |

`hermes whatsapp-cloud` 向导会在设置结束时打印这些链接。这些都不是机器人运行所必需的——纯粹是为了让机器人对用户呈现得更完善。

---

## 配置参考

所有设置都放在 `~/.hermes/.env`。必填项以**粗体**显示。

| 变量 | 默认值 | 说明 |
|---|---|---|
| **`WHATSAPP_CLOUD_PHONE_NUMBER_ID`** | — | 来自 API Setup 的 15-17 位 ID。**不是**号码。 |
| **`WHATSAPP_CLOUD_ACCESS_TOKEN`** | — | Meta 访问令牌（以 `EAA` 开头）。临时 24 小时或 System User 永久。 |
| **`WHATSAPP_CLOUD_APP_SECRET`** | — | 来自 Settings → Basic 的 32 字符十六进制值。没有它，传入消息会以 503 被拒绝。 |
| **`WHATSAPP_CLOUD_VERIFY_TOKEN`** | — | 用于 GET 握手的共享密钥。由向导自动生成。 |
| **`WHATSAPP_CLOUD_ALLOWED_USERS`** | — | 逗号分隔的允许向机器人发送消息的 wa_id。 |
| `WHATSAPP_CLOUD_ALLOW_ALL_USERS` | `false` | 设为 `true` 可绕过允许列表。 |
| `WHATSAPP_CLOUD_APP_ID` | — | 可选，用于未来的分析集成。 |
| `WHATSAPP_CLOUD_WABA_ID` | — | 可选，用于未来的分析集成。 |
| `WHATSAPP_CLOUD_WEBHOOK_HOST` | 未设置（双栈：所有接口，IPv4+IPv6） | webhook 服务器绑定的接口。 |
| `WHATSAPP_CLOUD_WEBHOOK_PORT` | `8090` | webhook 服务器绑定的端口。必须与你的隧道转发的端口一致。 |
| `WHATSAPP_CLOUD_WEBHOOK_PATH` | `/whatsapp/webhook` | Meta 向其发送 POST 请求的 URL 路径。 |
| `WHATSAPP_CLOUD_API_VERSION` | `v20.0` | Meta Graph API 版本。仅在 Meta 文档推荐更新版本时才覆盖。 |
| `WHATSAPP_CLOUD_HOME_CHANNEL` | — | 用作机器人主页频道的 wa_id（用于定时任务等）。 |

你可以**同时**启用 Baileys（`whatsapp`）和 Cloud（`whatsapp_cloud`）两个适配器，面向不同的号码。

---

## 特性

### 入站

- **文本消息** —— 直接传递给智能体。
- **图片** —— 自动下载并附加到智能体的输入中。具备原生视觉能力的模型（Claude、GPT-4o、Gemini 等）直接读取图片；非视觉模型则接收自动生成的文字描述。
- **语音留言** —— 自动下载为 `.ogg`，通过你配置的 STT 服务商（本地 faster-whisper、OpenAI/Nous、Groq 等）转录，然后以文本形式交给智能体。
- **文档** —— 自动下载。最大 100KB 的小型文本可读文件（`.txt`、`.md`、`.json`、`.py`、`.csv` 等）会被内联到智能体的输入中，使其无需调用工具即可读取。更大的文件会缓存在本地，供智能体的其他工具访问。
- **按钮点击** —— 当用户点击机器人之前发送的按钮（澄清选项、命令审批、斜杠命令确认）时，该点击会直接路由到正确的处理器。过期的点击会回退为按普通文本输入处理。
- **回复上下文** —— 当用户回复先前的消息时，智能体会将原始文本视为上下文。引用图片、语音留言、视频或文档（无论是你的，还是机器人发送的，例如定时任务投递的图表）也会将该文件附加到本轮对话中，因此在引用图片下问“这是什么？”也能正常工作。Meta 的 webhook 只携带被引用消息的 id，因此该项会从最近的收发本地索引（每个网关最近 1000 条消息）中解析；更早的引用在到达时不含附件。

### 出站

- **文本** —— markdown 会自动转换为 WhatsApp 风格语法（`**bold**` → `*bold*`、`~~strike~~` → `~strike~`、标题 → 粗体、`[link](url)` → `link (url)`）。长消息按每段 4096 字符切分。
- **图片** —— 同时支持智能体生成的图片和本地图片文件，以原生照片附件形式投递。
- **语音消息** —— 文本转语音输出通过 ffmpeg 转换为原生 WhatsApp 语音留言气泡（绿色波形）。未安装 ffmpeg 时，回退为 MP3 音频附件。见下文“语音消息”。
- **视频 / 文档** —— 均受支持，以原生附件形式发送。

### 交互式 UX

当智能体调用这些流程中的任意一个时，Hermes 会使用 WhatsApp 的原生交互式消息 —— 用点击作答按钮代替“回复数字”的提示：

- **`clarify` 工具** —— 多选题会渲染为快捷回复按钮（1–3 个选项）或点击打开的列表面板（4 个以上选项）。选择“✏️ 其他”允许用户输入自由形式的答案，智能体会将其作为结果接收。
- **危险命令审批** —— 当智能体的终端/代码执行遇到受限命令时，用户会看到 `✅ 批准` / `❌ 拒绝` 按钮，无需输入 `/approve` 或 `/deny`。
- **斜杠命令确认** —— 像 `/reload-mcp` 这样的特权命令会显示 `✅ 批准一次` / `🔒 始终允许` / `❌ 取消` 按钮。

如果按钮渲染失败（例如在旧版 WhatsApp 客户端上），所有交互式提示都会优雅降级为纯文本。

### 已读回执与输入指示器

Hermes 会立即确认入站消息：

- 网关一收到你的消息，它就会显示**蓝色双勾标记**。
- 当智能体正在准备回复时，你的 WhatsApp 聊天中机器人名称会显示**“正在输入…”**。
- 当机器人的第一条回复消息到达时，输入指示器会自动消失。

这样可以清楚地看出机器人是已经看过你的消息，还是仍在处理回复。

### 语音消息

WhatsApp 区分“语音留言”（绿色波形气泡）和普通音频文件附件。区别纯粹在于编解码器：语音留言需要是带 `opus` 编码的 `audio/ogg`。

Hermes TTS 生成 MP3。有两条路径：

- **PATH 中有 ffmpeg**（推荐） —— 出站 TTS 会被转换，并以正式的语音留言形式到达。安装：
  - Windows：`winget install Gyan.FFmpeg`
  - macOS：`brew install ffmpeg`
  - Linux：包管理器
- **没有 ffmpeg** —— 出站 TTS 会以 MP3 音频附件形式到达。播放正常，只是看起来不像语音留言。网关日志中会触发一次一次性警告，让你知晓。

你可以通过健康检查端点查看网关是否找到了 ffmpeg：

```bash
curl http://localhost:8090/health
# look for "ffmpeg_present": true
```

---

## 已知限制

### 24 小时会话窗口

Meta 仅允许在用户最后一条入站消息后的 24 小时窗口内发送**自由格式消息**。超出该窗口后，Meta API 唯一接受的是预先审核通过的**消息模板**。

**实际影响：**

- 响应式聊天（用户发私信 → 机器人 24 小时内回复 → 用户回复 → ……）可以永久运作。这覆盖了 95% 以上的正常机器人使用场景。
- **间隔超过 24h 后向 WhatsApp 投递的定时任务** 将失败，返回 Graph 错误码 `131047`（“Re-engagement message”）。
- **耗时超过 24h 的 `delegate_task` 异步结果** 同样会失败。
- **Webhook 订阅者** 在用户近期未向机器人发私信时，向 WhatsApp 路由外部事件也会失败。

Hermes 在其系统提示中会就此窗口向智能体发出警告，因此模型在安排延迟消息时知道要提及这一点。

消息模板支持（窗口外发送的变通方案）目前尚未在 Hermes 中实现。如果你需要它，请[提交一个 issue](https://github.com/NousResearch/hermes-agent/issues) —— 这已在计划中，但还在等待明确的需求信号。

### 群聊

Cloud API 对群聊的支持有限（受 Meta 的能力层级限制）。Hermes 的 `whatsapp_cloud` 适配器在 v1 中目前仅处理**私聊消息**。如果你需要群聊，请使用 Baileys 桥接。

### 出站速率限制

Meta 的默认吞吐量为**每个商业电话号码每秒 80 条消息**，并可申请升级。Hermes 目前在客户端未强制执行此限制 —— 极高量的发送可能会触及 Meta 的上限。

---

## 故障排查

### Meta 仪表盘中的设置验证失败（“URL couldn't be validated”）

几乎总是以下原因之一：

- **隧道 URL 错误或已失效** —— cloudflared 快速隧道会轮换。获取新 URL 并更新 `.env` 与 Meta 仪表盘。
- **验证令牌不匹配** —— `~/.hermes/.env` 中的 `WHATSAPP_CLOUD_VERIFY_TOKEN` 必须与你在 Meta 仪表盘输入的内容完全一致。先在本地运行上面的 curl 探测，确认网关的 verify 握手正常。
- **网关未运行** —— 检查 `hermes gateway` 是否已启动。
- **App Secret 未设置** —— 没有它，Hermes 会用 503 拒绝入站 POST。Meta 会将其解读为“无法验证”。

### `graph error 100`: Object with ID '...' does not exist

你把电话号码（10-11 位数字）粘贴到了 `WHATSAPP_CLOUD_PHONE_NUMBER_ID`，而不是 Phone Number ID（Meta 内部的 15-17 位 ID）。请重新检查 API Setup 页面 —— Phone Number ID 显示在 “From” 下拉菜单*下方*。

向导现在会通过校验器捕获此问题，但如果你手动配置，还是有必要了解这一点。

### `graph error 190`: Authentication Error

你的访问令牌无效。子码：

- `subcode 463` —— 令牌已过期。临时令牌有效期为 24h。请重新生成，或改用 System User 永久令牌（见上文）。
- `subcode 467` —— 令牌已失效（被撤销或密码已更改）。
- 其他 190 —— 生成令牌时未包含所需权限。确保三项权限（`business_management`、`whatsapp_business_messaging`、`whatsapp_business_management`）均已选中。

### `graph error 131047`: Re-engagement message

24 小时会话窗口已过期（见“已知限制”）。可采取以下任一措施：

- 让用户先向机器人发私信以重新开启窗口。
- 等待 Hermes 中的模板支持上线。

### 入站消息：`media metadata fetch failed (status=401)`

与出站（`graph error 190`）的 401 根因相同 —— 访问令牌无效或已过期。请修复令牌。

### 机器人回复显示为原始 JSON / 工具调用泄漏

常见原因：为 `whatsapp_cloud` 配置的工具集缺少智能体想要调用的工具。检查 `hermes tools list`，并确认该平台使用的是 `hermes-whatsapp`（默认的 Cloud 适配器工具集，与 Baileys 相同）。

如果模型输出工具调用格式的文本，而不是结构化的调用，通常意味着工具集实际上为空。平台 → 默认工具集的映射请参见 `hermes_cli/platforms.py`。

### STT（语音消息转录）返回空 / “could not transcribe”

默认的 `stt.provider: local` 需要 `pip install faster-whisper`。如果你是 Nous 订阅用户，可以通过托管网关来路由 STT —— 在 `hermes tools` 中为语音转文字选择 **Nous Subscription**，或直接设置：

```bash
hermes config set stt.provider nous
hermes gateway restart
```

这会使用你的 Nous Portal 访问令牌，而无需单独的 OpenAI 密钥。（旧文档建议 `stt.use_gateway true` —— 该标志已弃用；现在仅由服务商选择来控制路由。）

---

## 安全注意事项

- **将 App Secret 视为密码** —— 任何持有它的人都可以伪造 Hermes 将视作真实的 webhook 载荷。
- **验证令牌是共享密钥** —— 泄漏的后果较轻（最坏情况下有人可以将 Meta 的 webhook 重新订阅到自己的其他 URL），但仍应避免将其提交到仓库。
- **访问令牌是你机器人的身份** —— System User 令牌等同于长期有效的 API 密钥。若某次部署被入侵，请立即轮换。
- **当 `WHATSAPP_CLOUD_APP_SECRET` 设置后，webhook 端点仅接受签名的请求** —— 即使在开发环境也请保持其设置。没有它，网关会以 HTTP 503 拒绝入站投递。
- **`/health` 端点未做鉴权** —— 暴露它是安全的，因为它仅报告配置是否存在的布尔值，而非值本身。但如果你不愿暴露它，可在反向代理 / 隧道层限制访问。

---

## 与 Baileys 桥接的对比

| | Baileys (`hermes whatsapp`) | Cloud API (`hermes whatsapp-cloud`) |
|---|---|---|
| 账户类型 | 个人 | 商业 |
| 设置 | 扫描二维码 | Meta 应用 + WABA + 令牌 |
| 依赖 | Node.js + npm | 纯 Python（httpx + aiohttp） |
| 进程 | 受管理的 Node 子进程 | aiohttp webhook 服务器 |
| 是否需要公开 URL？ | 否 | 是 |
| 账户封禁风险 | 是（非官方 API） | 否（官方支持） |
| 入站 | 轮询 Node 桥接 | 来自 Meta 的 Webhook POST |
| 出站 | 本地桥接 → Baileys | HTTPS 到 graph.facebook.com |
| 群聊 | 完整支持 | 仅私信（v1） |
| 24h 窗口 | 无限制 | 硬性规则 —— 之后需要模板 |
| 语音消息（出站） | 原生 | 有 ffmpeg 时原生，否则回退到 MP3 |
| 已读回执 | 否 | 是（蓝色双钩） |
| 输入中提示 | 否 | 是（回复时自动消失） |
| 交互式按钮 | 仅文本回退 | 原生（clarify、approval、slash-confirm） |
| 生产使用 | 有风险（Meta 可封禁） | 专为此设计 |

大多数个人项目用户更偏好 Baileys。大多数面向客户的机器人用户更偏好 Cloud API。

---

## 参见

- [Meta 官方 WhatsApp Business Cloud API 文档](https://developers.facebook.com/documentation/business-messaging/whatsapp/) —— 底层平台、定价、App Review 及 Meta 侧速率限制的权威参考。
- [WhatsApp（Baileys 桥接）设置](whatsapp.md) —— 面向个人项目的替代集成。
- [消息平台概览](index.md) —— 一览所有消息集成。
