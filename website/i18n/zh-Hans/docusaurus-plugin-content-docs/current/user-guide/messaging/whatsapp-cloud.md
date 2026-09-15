---
sidebar_position: 6
title: "WhatsApp Business（Cloud API）"
description: "通过 Meta 官方 Business Cloud API 将 Hermes Agent 设置为 WhatsApp 机器人"
---

# WhatsApp Business Cloud API 设置

Hermes 可以通过 Meta 的**官方** WhatsApp Business Cloud API 连接到 WhatsApp。这是生产级方案：没有 Node.js 桥接子进程，没有二维码，也没有账号被封的风险。

相应的代价是：

- 你需要一个 **Meta Business 账号**（不是个人 WhatsApp）。
- 机器人运行在一个专用的业务电话号码上，而不是你的个人号码。
- Hermes 网关需要一个**公网 HTTPS URL**，这样 Meta 才能通过 webhook 投递入站消息。
- 在用户最后一条消息发出超过 24 小时后进行回复，需要预先审核通过的**模板**（这是 Meta 的“客服窗口”规则，不是 Hermes 的限制）。

如果这些约束不适用于你的使用场景，[Baileys 桥接集成](./whatsapp.md) 是替代方案——使用个人账号，不需要公网 URL，但属于非官方方案且容易被封号。

:::tip 我该用哪一个？
- **Cloud API（本指南）** —— 运行真正的业务机器人，追求稳定性，可以接受 Meta 验证与模板的繁琐流程
- **[Baileys 桥接](./whatsapp.md)** —— 个人项目、快速演示、单用户场景，愿意承担机器人手机号被封的风险
:::

---

## 快速开始

```bash
hermes whatsapp-cloud
```

向导会引导你完成每一项凭证的配置，在你粘贴时逐一校验（能捕获头号设置陷阱——把电话号码粘贴到 Phone Number ID 字段中），并针对需要在向导之外完成的步骤（启动 cloudflared、配置 Meta 的 webhook 面板）打印出精确的后续操作说明。

本页其余部分是手动操作参考。

---

## 前置条件

1. **一个 Meta Business 账号**。前往 [business.facebook.com](https://business.facebook.com/) 创建。
2. **一个启用了 WhatsApp 的 Meta 应用**。参见下文“创建 Meta 应用”。
3. **一种将本地端口通过 HTTPS 暴露到公网的方式**。推荐使用 Cloudflare Tunnel（`cloudflared`）——免费、无需端口转发、无需域名。ngrok、自有域名加反向代理 + TLS，或者将网关直接绑定到公网 IP 的 VPS 也都可以。
4. **可选但推荐**：`PATH` 中有 ffmpeg，这样出站语音消息会渲染为原生 WhatsApp 语音条气泡（绿色波形），而不是 MP3 音频附件。如果缺失，Hermes 会优雅降级。

---

## 创建 Meta 应用

1. 前往 [developers.facebook.com/apps](https://developers.facebook.com/apps) → **Create App**。
2. 选择用例：**“Connect with customers through WhatsApp”** → **Next**。
3. 选择或创建一个业务组合。查看发布要求。确认 → **Create app**。
4. 创建完成后，你会进入 **Customize use case → Connect on WhatsApp → Quickstart**。点击 **Start using the API** → 你现在位于 **API Setup** 页面。
5. 确认已关联一个 WhatsApp Business Account（WABA）。如果你在第 3 步创建了新的业务组合，系统会自动创建一个。在 API Setup 页面进行确认。

你需要从面板中获取以下值——向导会按此顺序提示输入：

| 值 | 面板中的位置 | 字段格式 | 备注 |
|---|---|---|---|
| **Phone Number ID** | App Dashboard → WhatsApp → API Setup → “From”下拉框下方 | 数字，15-17 位 | **不是**电话号码本身。头号设置错误就是把实际电话号码粘贴到这里。 |
| **Access Token** | App Dashboard → WhatsApp → API Setup → “Generate access token” | 以 `EAA` 开头，100+ 字符 | 临时令牌有效期 24 小时——生产环境请参见下文“永久令牌”。 |
| **App Secret** | App Dashboard → Settings → Basic → 点击 App secret 旁的“Show” | 32 位小写十六进制 | 用于验证入站 webhook 签名。没有它，入站投递会被拒绝并返回 503。 |
| **App ID**（可选） | App Dashboard → Settings → Basic | 数字，15-16 位 | 消息功能不需要，可用于分析。 |
| **WABA ID**（可选） | App Dashboard → WhatsApp → API Setup → 靠上的位置 | 数字，15+ 位 | 消息功能不需要，可用于分析。 |

---

## 永久令牌（生产环境）

临时访问令牌会在 **24 小时**后过期，这意味着今天生成的令牌到明天就无法使用了。对于生产部署，请使用 **System User 永久令牌**：

1. 前往 [business.facebook.com/latest/settings](https://business.facebook.com/latest/settings) → **System users**（左侧边栏）。
2. **Add** → 名称（例如 `hermes-bot`）→ 角色：**Admin**。
3. 选择新用户 → **Assign Assets**：
   - 选择你的应用 → 在 Full control 下切换 **Manage app**。
   - 选择你的 WhatsApp 账户 → 在 Full control 下切换 **Manage WhatsApp Business Accounts**。
   - 点击 **Assign assets**。
4. **Generate token**，并包含以下权限：
   - `business_management`
   - `whatsapp_business_messaging`
   - `whatsapp_business_management`
5. 设置 **token expiration: Never**。
6. 复制令牌 → 更新 `~/.hermes/.env` 中的 `WHATSAPP_CLOUD_ACCESS_TOKEN` → 重启网关。

System User 令牌不会过期，除非你主动撤销它们。

---

## 将 Hermes 暴露到互联网

Cloud API 通过 HTTPS POST 将入站消息投递到你的 webhook URL——这意味着 Hermes 网关必须能被 Meta 的服务器访问。三种常用方式：

### Cloudflare Tunnel（推荐）

免费、无需端口转发，支持 Windows / macOS / Linux。作为独立进程与网关一同运行。

**安装：**

```bash
# Windows
winget install Cloudflare.cloudflared

# macOS
brew install cloudflared

# Linux
# 从 https://github.com/cloudflare/cloudflared/releases 下载二进制文件
```

**运行快速隧道**（无需 Cloudflare 账户——会为你提供一个 `https://<random>.trycloudflare.com` URL）：

```bash
cloudflared tunnel --url http://localhost:8090
```

记下打印出的 URL——这就是你要提供给 Meta 的地址。

:::warning 快速隧道会轮换
免费的快速隧道 URL 每次重启 `cloudflared` 都会变化。如需稳定的 URL，请使用 `cloudflared tunnel login` 登录并创建一个命名隧道。免费 Cloudflare 账户可获得无限个命名隧道——命名隧道的工作流程请参阅 [Cloudflare 的文档](https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/)。
:::

### ngrok

```bash
ngrok http 8090
```

免费版每次重启都会显示不同的 URL。付费版会为你提供稳定的子域名。

### 自有域名 + 反向代理

如果你已经拥有一台带有 TLS 证书的服务器（Caddy、nginx 等），将某条路由指向 `localhost:8090` 即可。这是生产环境中最稳定的方案，但需要已有的基础设施。

---

## 在 Meta 侧配置 webhook

隧道运行后：

1. 记下隧道打印出的公开 URL——例如 `https://abc123.trycloudflare.com`。
2. 生成一个 **Verify Token**——向导会自动用 `secrets.token_urlsafe(32)` 为你生成；如果你手动配置，请运行：
   ```bash
   python -c "import secrets; print(secrets.token_urlsafe(32))"
   ```
   将其保存为 `~/.hermes/.env` 中的 `WHATSAPP_CLOUD_VERIFY_TOKEN`。
3. 启动 Hermes 网关：`hermes gateway`。
4. 在 Meta App Dashboard 中 → **WhatsApp → Configuration**（或根据 UI 版本为 **Use cases → Customize → Configuration**）→ 点击 Webhook 部分的 **Edit**。
5. 填写：
   - **Callback URL**：`https://abc123.trycloudflare.com/whatsapp/webhook`
   - **Verify Token**：第 2 步生成的字符串（必须完全一致）
6. 点击 **Verify and save**。Meta 会向你的 URL 发起 GET 请求，网关返回 challenge 响应，Meta 即将该 webhook 标记为已验证。
7. 在 **Webhook fields** 下，点击 **Manage** → 订阅 **messages** 字段。这一步是告诉 Meta 实际将入站消息投递到你的 webhook。

**手动验证整个链路**（在第三个终端中）：

```bash
TUNNEL="https://abc123.trycloudflare.com"
VERIFY="<your verify token>"

# 应打印 HTTP 200，响应体为 "hello"
curl -i "$TUNNEL/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=$VERIFY&hub.challenge=hello"

# 健康检查端点——应显示 verify_token_configured: true 和 app_secret_configured: true
curl "$TUNNEL/health"
```

---

## 收件人白名单（Meta 侧）

在开发模式下（应用通过 App Review 之前），Meta 会限制你的机器人可以向哪些号码发消息：

1. App Dashboard → WhatsApp → API Setup → **To** 下拉菜单。
2. 点击 **Manage phone number list**。
3. 添加你想发送消息的号码（你自己的、团队的、友好测试者的）。Meta 会通过短信或 WhatsApp 向每个号码发送一个 6 位验证码。

开发模式下最多 5 个号码。通过 App Review 后会取消此限制。

---

## 允许列表（Hermes 侧）

除了 Meta 的收件人白名单外，Hermes 还有自己的按平台划分的允许列表，用于控制**智能体处理哪些入站消息**。添加到 `~/.hermes/.env`：

```bash
# 逗号分隔的电话号码，带国家代码，不含 '+' / 空格 / 短横线
WHATSAPP_CLOUD_ALLOWED_USERS=15551234567,15557654321

# 或允许所有人（仅在配合 Meta 收件人白名单时安全）
# WHATSAPP_CLOUD_ALLOW_ALL_USERS=true
```

向导会在第 6 步设置此项。没有允许列表时，**所有入站消息都会被拒绝** —— 这是有意设计的，这样即使收件人白名单被放宽，机器人也不会被随机号码调用。

---

## 完善机器人的 WhatsApp 资料

WhatsApp 会在聊天标题和联系人列表中为你的机器人显示**名称和头像**。这些无法通过 Cloud API 设置 —— 它们位于 Meta 的 Business Manager 中。

机器人正常运行后，前往 **[business.facebook.com/wa/manage/phone-numbers](https://business.facebook.com/wa/manage/phone-numbers/)**，点击你的电话号码，你会发现：

| 项目 | 位置 | 说明 |
|---|---|---|
| **显示名称** | 电话号码页面顶部 | 变更需经过 Meta 的名称审核流程（约 24–48 小时）。 |
| **头像** | 电话号码页面顶部 | 建议方形图片，≥640×640px。立即更新。 |
| **关于 / 描述 / 网站 / 邮箱 / 营业时间 / 类别** | “Edit profile”按钮 | 当用户点击机器人名称时，这些会显示在信息面板中。纯装饰性。 |
| **认证徽章**（绿色对勾） | Business Manager → Security Center → Start Verification | 需要 Meta 单独的商家验证流程。 |

`hermes whatsapp-cloud` 向导会在设置结束时打印这些链接。这些都不是机器人正常运行所必需的 —— 只是为了完善机器人在用户面前的形象。

---

## 配置参考

所有设置都位于 `~/.hermes/.env`。必需值以**粗体**表示。

| 变量 | 默认值 | 描述 |
|---|---|---|
| **`WHATSAPP_CLOUD_PHONE_NUMBER_ID`** | — | 来自 API Setup 的 15-17 位 ID。**不是**电话号码。 |
| **`WHATSAPP_CLOUD_ACCESS_TOKEN`** | — | Meta 访问令牌（以 `EAA` 开头）。临时 24 小时或系统用户永久。 |
| **`WHATSAPP_CLOUD_APP_SECRET`** | — | 来自 Settings → Basic 的 32 位十六进制字符串。没有它，入站请求会以 503 被拒绝。 |
| **`WHATSAPP_CLOUD_VERIFY_TOKEN`** | — | 用于 GET 握手的共享密钥。由向导自动生成。 |
| **`WHATSAPP_CLOUD_ALLOWED_USERS`** | — | 逗号分隔的允许向机器人发送消息的 wa_id。 |
| `WHATSAPP_CLOUD_ALLOW_ALL_USERS` | `false` | 设为 `true` 以绕过允许列表。 |
| `WHATSAPP_CLOUD_APP_ID` | — | 可选，用于未来的分析集成。 |
| `WHATSAPP_CLOUD_WABA_ID` | — | 可选，用于未来的分析集成。 |
| `WHATSAPP_CLOUD_WEBHOOK_HOST` | 未设置（双栈：所有接口，IPv4+IPv6） | webhook 服务器绑定的接口。 |
| `WHATSAPP_CLOUD_WEBHOOK_PORT` | `8090` | webhook 服务器绑定的端口。必须与隧道转发的端口一致。 |
| `WHATSAPP_CLOUD_WEBHOOK_PATH` | `/whatsapp/webhook` | Meta 发送请求的 URL 路径。 |
| `WHATSAPP_CLOUD_API_VERSION` | `v20.0` | Meta Graph API 版本。仅在 Meta 文档推荐更新版本时才覆盖。 |
| `WHATSAPP_CLOUD_HOME_CHANNEL` | — | 用作机器人主频道的 wa_id（用于定时任务等）。 |

你可以**同时**启用 Baileys（`whatsapp`）和 Cloud（`whatsapp_cloud`）适配器，分别指向不同的电话号码。

---

## 功能

### 入站

- **文本消息** — 直接传递给智能体。
- **图片** — 自动下载并附加到智能体的输入中。原生支持视觉的模型（Claude、GPT-4o、Gemini 等）可直接读取图片；不支持视觉的模型会收到自动生成的文本描述。
- **语音消息** — 自动下载为 `.ogg`，通过你配置的 STT 服务商（本地 faster-whisper、OpenAI/Nous、Groq 等）转录，然后以文本形式交给智能体。
- **文档** — 自动下载。小型可读文本文件（`.txt`、`.md`、`.json`、`.py`、`.csv` 等）在 100KB 以内会被内联到智能体的输入中，使其无需工具调用即可读取。较大的文件会缓存到本地，供智能体的其他工具访问。
- **按钮点击** — 当用户点击机器人之前发送的按钮（澄清选项、命令审批、斜杠命令确认）时，点击会被直接路由到对应的处理器。过期的点击会被回退为普通文本输入处理。
- **回复上下文** — 当用户回复之前的某条消息时，智能体会看到原始文本作为上下文。引用图片、语音消息、视频或文档（无论是你发的还是机器人发的，比如定时任务推送的图表）时也会将该文件附加到本轮对话中，因此在引用的图片下说“这是什么？”也能正常工作。Meta 的 webhook 只携带被引用消息的 id，因此这依赖于近期发送/接收消息的本地索引（每个网关最近 1000 条消息）来解析；更早的引用到达时不会带有附件。

### 出站

- **文本** — markdown 会自动转换为 WhatsApp 风格的语法（`**bold**` → `*bold*`，`~~strike~~` → `~strike~`，标题 → 粗体，`[link](url)` → `link (url)`）。长消息按每段 4096 字符拆分。
- **图片** — 既支持智能体生成的图片，也支持本地图片文件，均以原生照片附件形式发送。
- **语音消息** — text-to-speech 输出会通过 ffmpeg 转换为原生 WhatsApp 语音消息气泡（绿色波形）。未安装 ffmpeg 时，回退为 MP3 音频附件。详见下文“语音消息”。
- **视频 / 文档** — 均支持，以原生附件形式发送。

### 交互式 UX

当智能体触发以下任一交互流程时，Hermes 会使用 WhatsApp 的原生交互式消息——即可点击回答的按钮，而不是“回复数字”这样的提示：

- **`clarify` 工具** — 多项选择题会渲染为快速回复按钮（1–3 个选项）或点击展开的列表（4 个以上选项）。选择“✏️ 其他”可让用户输入自由形式的答案，智能体将其作为最终回答接收。
- **危险命令审批** — 当智能体的终端/代码执行遇到受限制的命令时，用户会看到 `✅ Approve` / `❌ Deny` 按钮，而无需手动输入 `/approve` 或 `/deny`。
- **斜杠命令确认** — 如 `/reload-mcp` 之类的特权命令会显示 `✅ Approve Once` / `🔒 Always` / `❌ Cancel` 按钮。

如果按钮渲染失败（例如在旧版 WhatsApp 客户端上），所有交互式提示都会优雅降级为纯文本。

### 已读回执与正在输入指示器

Hermes 会立即确认收到的入站消息：

- 网关一收到你的消息，该消息就会显示**蓝色双勾**。
- 智能体正在准备回复时，你在 WhatsApp 聊天中看到的机器人名称会显示 **“正在输入…”**。
- 当机器人的第一条回复消息到达时，正在输入指示器会自动消失。

这样可以清楚地分辨机器人是已经看到了你的消息，还是仍在处理回复。

### 语音消息

WhatsApp 区分“语音消息”（绿色波形气泡）和普通音频文件附件。区别纯粹在于编解码器：语音消息需要是 `audio/ogg` 且采用 `opus` 编码。

Hermes TTS 生成的是 MP3。有两种处理路径：

- **ffmpeg 位于 PATH 中**（推荐） — 出站 TTS 会被转换，并以真正的语音消息形式到达。安装方式：
  - Windows：`winget install Gyan.FFmpeg`
  - macOS：`brew install ffmpeg`
  - Linux：使用包管理器
- **没有 ffmpeg** — 出站 TTS 会以 MP3 音频附件的形式到达。播放没问题，只是看起来不像语音消息。网关日志中会发出一次性警告告知你。

你可以通过 health 端点检查网关是否找到了 ffmpeg：

```bash
curl http://localhost:8090/health
# look for "ffmpeg_present": true
```

---

## 已知限制

### 24 小时会话窗口

Meta 仅在用户最后一条入站消息后的 24 小时窗口内容许**自由格式消息**。超出该窗口后，Meta 的 API 唯一接受的是预先批准的**消息模板**。

**实际影响：**

- 响应式聊天（用户私信 → 机器人在 24 小时内回复 → 用户回复 → ...）可以永久持续。这覆盖了超过 95% 的日常机器人使用场景。
- **定时任务在间隔超过 24 小时后向 WhatsApp 投递**会失败，Graph 错误码为 `131047`（“重新激活消息”）。
- **长时间运行的 `delegate_task` 异步结果**若耗时超过 24 小时，也会以同样方式失败。
- 用于将外部事件路由到 WhatsApp 的 **Webhook 订阅者**，在用户近期没有私信机器人时会失败。

Hermes 在系统提示中会就此窗口提醒智能体，因此模型在安排延迟消息时知道要提及这一点。

Hermes 尚未实现消息模板支持（窗口外发送的变通方案）。如果你需要该功能，请[提交 issue](https://github.com/NousResearch/hermes-agent/issues)——该功能已有计划，但在等待明确的需求信号。

### 群聊

Cloud API 的群组支持有限（由 Meta 按能力层级限定）。Hermes 的 `whatsapp_cloud` 适配器在 v1 中目前仅处理**私信**。如果你需要群聊，请使用 Baileys 桥接。

### 出站速率限制

Meta 的默认吞吐量为**每个业务电话号码每秒 80 条消息**，可升级。Hermes 目前在客户端不强制执行此限制——极高量发送可能会碰到 Meta 的限制。

---

## 故障排查

### Meta 控制台中设置验证失败（“URL couldn't be validated”）

几乎总是以下几种情况之一：

- **隧道 URL 错误或已失效** — cloudflared 快速隧道会轮换。获取新 URL，并同时更新 `.env` 和 Meta 控制台。
- **验证令牌不匹配** — `~/.hermes/.env` 中 `WHATSAPP_CLOUD_VERIFY_TOKEN` 的令牌必须与你在 Meta 控制台中输入的完全一致。先运行上方的 curl 探测，在本地确认网关的验证握手是否正常。
- **网关未运行** — 检查 `hermes gateway` 是否已启动。
- **未设置 App Secret** — 未设置时，Hermes 会以 503 拒绝入站 POST。Meta 将其解释为“无法验证”。

### `graph error 100`：Object with ID '...' does not exist

你把电话号码（10-11 位）粘贴到了 `WHATSAPP_CLOUD_PHONE_NUMBER_ID`，而不是电话号码 ID（Meta 的 15-17 位内部 ID）。重新查看 API Setup 页面——“From”下拉框*下方*显示的就是电话号码 ID。

向导现在会通过校验器捕获此问题，但如果你是手动配置，这一点值得注意。

### `graph error 190`：Authentication Error

你的访问令牌无效。子码：

- `subcode 463` — 令牌已过期。临时令牌有效期为 24 小时。请重新生成，或切换到 System User 永久令牌（见上文）。
- `subcode 467` — 令牌已失效（被撤销或密码已更改）。
- 其他 190 — 生成令牌时未包含必需的权限。确保已选择全部三项（`business_management`、`whatsapp_business_messaging`、`whatsapp_business_management`）。

### `graph error 131047`：Re-engagement message

24 小时会话窗口已过期（见“已知限制”）。要么：

- 请用户先私信机器人以重新开启窗口。
- 等待 Hermes 支持模板。

### 入站消息：`media metadata fetch failed (status=401)`

与出站（`graph error 190`）相同的 401 根因——访问令牌无效或已过期。修复令牌即可。

### 机器人回复显示为原始 JSON / 工具调用泄漏

常见原因：为 `whatsapp_cloud` 配置的工具集缺少智能体想要调用的工具。检查 `hermes tools list`，并确认该平台使用的是 `hermes-whatsapp`（默认的 Cloud 适配器工具集，与 Baileys 相同）。

如果模型输出形似工具调用的文本而非结构化调用，通常意味着工具集实际上是空的。请参阅 `hermes_cli/platforms.py` 中平台 → 默认工具集的映射。

### STT（语音消息转写）返回空 / “could not transcribe”

默认的 `stt.provider: local` 需要 `pip install faster-whisper`。如果你是 Nous 订阅用户，可以将 STT 改走托管网关——在 `hermes tools` 中为语音转文字选择 **Nous Subscription**，或直接设置：

```bash
hermes config set stt.provider nous
hermes gateway restart
```

这会使用你的 Nous Portal 访问令牌，而非需要单独的 OpenAI 密钥。（早期文档建议用 `stt.use_gateway true`——该标志已过时；现在仅通过 provider 选择来控制路由。）

---

## 安全说明

- **将 App Secret 视为密码** — 任何持有它的人都能伪造 Hermes 会当作真实请求接受的 webhook 负载。
- **验证令牌是共享密钥** — 泄露的危害较低（最坏情况是有人能将 Meta 的 webhook 重新订阅到他们自己的另一个 URL），但仍应避免将其提交到仓库。
- **访问令牌是你机器人的身份** — System User 令牌等同于长期有效的 API 密钥。如果部署遭到入侵，请立即轮换。
- **设置了 `WHATSAPP_CLOUD_APP_SECRET` 时，webhook 端点仅接受已签名请求** — 即使在开发环境也要保持设置。未设置时，网关会以 HTTP 503 拒绝入站投递。
- **`/health` 端点未做身份验证** — 暴露它是安全的，因为它只报告配置是否存在的布尔值，而非配置值本身。但如果你不希望暴露它，可在反向代理 / 隧道层限制访问。

---

## 与 Baileys 桥接的对比

| | Baileys（`hermes whatsapp`） | Cloud API（`hermes whatsapp-cloud`） |
|---|---|---|
| 账号类型 | 个人 | 企业 |
| 设置 | 扫描二维码 | Meta 应用 + WABA + 令牌 |
| 依赖 | Node.js + npm | 纯 Python（httpx + aiohttp） |
| 进程 | 托管的 Node 子进程 | aiohttp webhook 服务器 |
| 是否需要公网 URL？ | 否 | 是 |
| 账号封禁风险 | 有（非官方 API） | 无（官方支持） |
| 入站 | 轮询 Node 桥接 | 来自 Meta 的 Webhook POST |
| 出站 | 本地桥接 → Baileys | HTTPS 到 graph.facebook.com |
| 群组 | 完整支持 | 仅私信（v1） |
| 24 小时窗口 | 无限制 | 硬性规则——之后需要模板 |
| 语音消息（出站） | 原生支持 | 有 ffmpeg 时原生支持，否则回退 MP3 |
| 已读回执 | 无 | 有（蓝色双勾） |
| 输入中指示器 | 无 | 有（回复时自动消失） |
| 交互式按钮 | 仅文本回退 | 原生支持（澄清、审批、斜杠确认） |
| 生产使用 | 有风险（Meta 可封禁） | 专为此设计 |

大多数将 Hermes 用于个人项目的用户更倾向 Baileys。大多数运行面向客户机器人的用户更倾向 Cloud API。

---

## 另见

- [Meta 官方 WhatsApp Business Cloud API 文档](https://developers.facebook.com/documentation/business-messaging/whatsapp/) — 底层平台、定价、App Review 和 Meta 侧速率限制的权威参考。
- [WhatsApp（Baileys 桥接）设置](whatsapp.md) — 适用于个人项目的替代集成。
- [消息平台概览](index.md) — 一览所有消息集成。
