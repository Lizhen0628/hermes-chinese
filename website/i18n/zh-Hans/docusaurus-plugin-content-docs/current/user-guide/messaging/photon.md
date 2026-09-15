---
sidebar_position: 18
---

# Photon iMessage

通过 [Photon][photon] 将 Hermes 连接到 **iMessage**，这是一项托管服务，负责处理 Apple 线路分配与防滥用层，这样你就不必自己运行 Mac 中继。

免费套餐使用 Photon 的共享 iMessage 线路池 —— 不同的接收者可能看到不同的发送号码，但每个会话保持稳定。付费 Business 套餐为每个用户提供相同的专用号码；该插件同时支持两者，推荐从免费套餐开始。

:::info 免费起步
Photon 的共享线路池是免费的。从 Hermes 发送你的第一条 iMessage 无需订阅 —— 只需一个可以绑定到你账户的电话号码。
:::

## 架构

Photon 是**持久连接**类型的频道，类似于 Discord 或 Slack —— **没有 webhook，没有公网 URL，无需管理签名密钥。**

`spectrum-ts` SDK 与 Photon 保持一条长期存活的**双向 gRPC 流**。由于该 SDK 仅支持 TypeScript，Hermes 将其运行在一个小型受监管的 **Node 边车（sidecar）** 中，并通过回环地址与其通信：

- **入站** —— 边车消费 SDK 的 `app.messages` gRPC 流，并通过回环 `GET /inbound`（NDJSON）将每条消息转发给 Python 适配器。适配器对其进行去重后分派给智能体，若流中断则自动重连。
- **出站** —— 回复通过回环 POST 发送到边车，由边车调用 SDK 上的 `space.send(...)`。

Python 插件会自动启动、监管并关闭边车。

## 前置条件

- 一个 Photon 账户 —— 前往 [app.photon.codes][app] 注册
- PATH 中存在 **Node.js 18.17 或更高版本**（`node --version`）
- 一个可接收 iMessage 的电话号码（用于绑定你的账户）

就是这样 —— 无需配置公网 URL 或隧道。

## 首次设置

运行统一网关向导并选择 **Photon iMessage**：

```bash
hermes gateway setup
```

……或直接运行 Photon 设置（向导调用的是同一流程）：

```bash
# 设备码登录 + 项目 + 用户 + 边车依赖，一步完成
hermes photon setup --phone +15551234567
```

设置流程依次如下：

1. **设备登录**（`client_id=photon-cli`）—— 打开
   `https://app.photon.codes/` 进行授权，并保存 bearer token。
2. **查找或创建**你账户上的 `Hermes Agent` 项目。
3. **启用 Spectrum**，读取项目的 Spectrum id，并轮换项目密钥。
4. **将你的电话号码注册为** Spectrum 用户 —— 若该号码的用户已存在则跳过，因此重复运行是安全的。
5. **打印分配给你的 iMessage 线路** —— 即你用来联系智能体的号码。
6. **在插件的边车目录中运行 `npm install`**。在只读 / 不可变的安装树（托管 Docker 镜像、Podman、Nix）上，边车会自动回退到 `~/.hermes/photon/sidecar` 下的可写镜像目录；设置 `PHOTON_SIDECAR_DIR` 可固定一个明确的路径。

运行时凭据会写入 `~/.hermes/.env`
（`PHOTON_PROJECT_ID` = Spectrum 项目 id，`PHOTON_PROJECT_SECRET`），
与其他所有频道保存 token 的位置相同。管理元数据（设备 token、dashboard 项目 id）位于 `~/.hermes/auth.json` 中的
`credential_pool.photon` / `credential_pool.photon_project`。

## 授权用户

Photon 使用与其他所有 Hermes 频道相同的授权模型。选择一种方式：

**DM 配对（默认）。** 当未知号码向你的 Photon 线路发消息时，Hermes 会回复一个配对码。通过以下命令批准：

```bash
hermes pairing approve photon <CODE>
```

使用 `hermes pairing list` 查看待批准代码和已批准用户。

**预先授权特定号码**（在 `~/.hermes/.env` 中）：

```bash
PHOTON_ALLOWED_USERS=+15551234567,+15559876543
```

**开放访问**（仅限开发环境，在 `~/.hermes/.env` 中）：

```bash
PHOTON_ALLOW_ALL_USERS=true
```

当设置了 `PHOTON_ALLOWED_USERS` 时，未知发送者会被静默忽略，而不是收到配对码（该允许列表表明你有意限制了访问）。

### 在群聊中要求提及

默认情况下，Hermes 会回复每条已授权的 DM 和群消息。要让群聊变为按需触发，可启用提及门控（DM 仍然始终工作）：

```yaml
gateway:
  platforms:
    photon:
      enabled: true
      require_mention: true
```

设置 `require_mention: true` 后，除非群聊消息匹配唤醒词模式，否则会被忽略。默认匹配 `Hermes` 和
`@Hermes agent` 变体。如需自定义智能体名称，请设置正则表达式模式：

```yaml
gateway:
  platforms:
    photon:
      require_mention: true
      mention_patterns:
        - '(?<![\w@])@?amos\b[,:\-]?'
```

这两个键也接受环境变量（`PHOTON_REQUIRE_MENTION`、
`PHOTON_MENTION_PATTERNS`）。这与 BlueBubbles iMessage 频道使用的提及门控模型相同。

## 启动网关

```bash
hermes gateway start
```

你会看到类似如下内容：

```
[photon] connected — sidecar on 127.0.0.1:8789, streaming inbound over gRPC
```

向分配给你的号码发送一条 iMessage，Hermes 就会回复。

## 状态与故障排查

```bash
hermes photon status
```

打印已保存的凭据、边车健康状态、你的注册号码，以及 Hermes 使用的已分配 iMessage 线路。当 Photon token 和 dashboard 项目可用时，`status` 会从 dashboard 刷新缺失的号码记录，而不会配置新线路。

```
Photon iMessage status
──────────────────────
  device token        : ✓ stored
  dashboard project   : 3c90c3cc-0d44-4b50-...
  spectrum project id : sp-...
  project secret      : ✓ stored
  my number           : +15551234567
  assigned number     : +16282679185
  node binary         : /usr/bin/node
  sidecar deps        : ✓ installed
```

常见问题：

- **`sidecar deps : ✗ run hermes photon install-sidecar`** —— Node 已安装，但 `spectrum-ts` 未安装。运行建议的命令。
- **`device token : ✗ missing`** —— 运行 `hermes photon setup` 进行登录。
- **`No iMessage line assigned yet`** —— Spectrum 已启用但尚未配置线路；重新运行 `hermes photon setup` 或检查 [dashboard][app]。
- **边车无法启动** —— 确认 `node --version` 为 18.17+，且 `hermes photon install-sidecar` 已无错误完成。

## 当前限制

- **入站附件仅包含元数据。** 入站事件携带文件名 + MIME 类型；智能体看到的是一个标记，但尚不能读取字节内容。SDK 通过 `content.read()` 暴露附件字节，因此这是边车的一项后续工作。
- **支持出站附件。** Hermes 通过 spectrum-ts 的 `attachment()` /
  `voice()` 内容构建器，经由边车的 `/send-attachment`
  端点发送图片、语音消息、视频和文档。说明文字会作为媒体之后的单独 iMessage 气泡到达。
- **支持原生投票。** Hermes 通过
  spectrum-ts 的 `poll()` 构建器，经由边车的 `/send-poll` 端点发送投票内容。
- **支持已读回执。** 边车在将入站 iMessage 转发给 Hermes 后将其标记为已读，因此发送者无需等待模型/工具回合即可看到 `Read`。Hermes 已发送消息的入站回执会作为在线状态遥测被消费，绝不会创建智能体回合。设置
  `PHOTON_READ_RECEIPTS=false` 可使消息保持为 `Delivered`。
- **支持消息特效。** Hermes 通过 spectrum-ts 的 iMessage `effect()` 构建器，经由边车的 `/send-effect` 端点发送带原生 iMessage 气泡/屏幕特效的文本。
- **Photon 的免费配额：** 每服务器每天 5,000 条消息，
  每条共享线路每天 50 次新会话发起。可申请提升上限 —— 请发送邮件至 `help@photon.codes`。
- **定时任务和独立发送需要网关运行。** 进程外发送者（定时任务、`hermes send`、dashboard）复用网关启动的边车 —— 它们从
  `<hermes-home>/runtime/photon-sidecar.json` 读取其端口/token，该文件在边车通过健康检查后写入，并在其停止时删除。如果独立发送报告网关似乎已关闭，请先启动（或重启）网关。
- **共享/免费套餐线路无法主动与新目标发起对话。** Photon 侧策略：共享线路只能在某个号码先向该线路发过消息后才能向其发消息。即使 Hermes 配置正确，向全新接收者发送的定时任务/独立消息也会被 Photon 拒绝 —— 要么让接收者先向该线路发一次消息，要么迁移到专用线路。

## 环境变量

| 变量                      | 默认值             | 说明                                       |
|---------------------------|--------------------|--------------------------------------------|
| `PHOTON_PROJECT_ID`       | 来自 `.env`        | Spectrum 项目 id（SDK 的 `projectId`）；由设置流程写入 |
| `PHOTON_PROJECT_SECRET`   | 来自 `.env`        | 项目密钥；由设置流程写入               |
| `PHOTON_SIDECAR_PORT`     | `8789`             | 边车控制 + 入站通道的回环端口 |
| `PHOTON_SIDECAR_AUTOSTART`| `true`             | 适配器是否自动启动边车     |
| `PHOTON_NODE_BIN`         | `which node`       | 覆盖 Node 二进制路径              |
| `PHOTON_HOME_CHANNEL`     | （未设置）            | 用于定时任务 / 通知的默认 space id  |
| `PHOTON_HOME_CHANNEL_NAME`| （未设置）            | 主频道的人类可读标签           |
| `PHOTON_ALLOWED_USERS`    | （未设置）            | 逗号分隔的 E.164 允许列表            |
| `PHOTON_ALLOW_ALL_USERS`  | `false`            | 仅限开发环境 —— 接受任何发送者               |
| `PHOTON_REQUIRE_MENTION`  | `false`            | 在群组中回复前要求唤醒词 |
| `PHOTON_MENTION_PATTERNS` | Hermes 唤醒词  | 群提及的 JSON 列表 / 逗号 / 换行分隔正则模式 |
| `PHOTON_DASHBOARD_HOST`   | `app.photon.codes` | 覆盖 dashboard / 设备登录主机 |
| `PHOTON_SPECTRUM_HOST`    | `spectrum.photon.codes` | 覆盖 Spectrum API 主机 |

[photon]: https://photon.codes/
[app]: https://app.photon.codes/
