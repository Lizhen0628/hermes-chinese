---
sidebar_position: 18
---

# Photon iMessage

通过 [Photon][photon] 将 Hermes 连接到 **iMessage**。Photon 是一项托管服务，负责 Apple 线路分配和防滥用层，因此你无需自行运行 Mac 中继。

免费版使用 Photon 的共享 iMessage 线路池——不同收件人可能会看到不同的发送号码，但每个会话保持稳定。付费 Business 版为每个用户提供同一个专用号码；插件同时支持两者，推荐从免费版开始。

:::info 免费起步
Photon 的共享线路池是免费的。从 Hermes 发送你的第一条 iMessage 无需订阅——只需要一个能绑定到账户的手机号。
:::

## 架构

Photon 是一个**持久连接**通道，就像 Discord 或 Slack 一样——**没有 webhook，没有公共 URL，没有需要管理的签名密钥。**

`spectrum-ts` SDK 与 Photon 之间维持一条长期存活的**gRPC 流**，用于双向通信。由于该 SDK 仅支持 TypeScript，Hermes 将其运行在一个受监管的小型 **Node sidecar** 中，并通过回环地址与之通信：

- **入站** — sidecar 消费 SDK 的 `app.messages` gRPC 流，并通过回环 `GET /inbound`（NDJSON）将每条消息转发给 Python 适配器。适配器对其去重并分发给智能体，若流中断则自动重连。
- **出站** — 回复以回环 POST 发送到 sidecar，再由 sidecar 调用 SDK 上的 `space.send(...)`。

Python 插件会自动启动、监管并关闭 sidecar。

## 前提条件

- 一个 Photon 账户——在 [app.photon.codes][app] 注册
- PATH 中安装 **Node.js 18.17 或更高版本**（`node --version`）
- 一个可接收 iMessage 的手机号（用于绑定账户）

就这些——无需设置公共 URL 或隧道。

## 首次设置

可以运行统一网关向导并选择 **Photon iMessage**：

```bash
hermes gateway setup
```

……或直接运行 Photon 设置（向导调用的也是同一套流程）：

```bash
# Device-code login + project + user + sidecar deps, all in one
hermes photon setup --phone +15551234567
```

设置流程依次如下：

1. **设备登录**（`client_id=photon-cli`）——打开
   `https://app.photon.codes/` 进行授权，并存储 bearer token。
2. 在你的账户上**查找或创建** `Hermes Agent` 项目。
3. **启用 Spectrum**，读取项目的 Spectrum id，并轮换项目密钥。
4. **注册你的手机号**为 Spectrum 用户——若该号码的用户已存在则跳过，因此可安全重复运行。
5. **打印分配给你的 iMessage 线路**——即你发短信联系智能体的号码。
6. 在插件的 sidecar 目录内**运行 `npm install`**。在只读 / 不可变安装树（托管的 Docker 镜像、Podman、Nix）上，sidecar 会自动回退到 `~/.hermes/photon/sidecar` 下的可写镜像；设置 `PHOTON_SIDECAR_DIR` 可固定到指定位置。

运行时凭据写入 `~/.hermes/.env`
（`PHOTON_PROJECT_ID` = Spectrum 项目 id，`PHOTON_PROJECT_SECRET`），与其他所有通道存放 token 的位置相同。管理元数据（设备 token、dashboard 项目 id）位于 `~/.hermes/auth.json` 中的 `credential_pool.photon` / `credential_pool.photon_project` 下。

## 授权用户

Photon 使用与其他所有 Hermes 通道相同的授权模型。选择以下一种方式：

**私信配对（默认）。** 当未知号码向你的 Photon 线路发送消息时，Hermes 会回复一个配对码。使用以下命令批准：

```bash
hermes pairing approve photon <CODE>
```

使用 `hermes pairing list` 查看待处理的配对码和已批准的用户。

**预先授权特定号码**（在 `~/.hermes/.env` 中）：

```bash
PHOTON_ALLOWED_USERS=+15551234567,+15559876543
```

**开放访问**（仅供开发，在 `~/.hermes/.env` 中）：

```bash
PHOTON_ALLOW_ALL_USERS=true
```

当设置了 `PHOTON_ALLOWED_USERS` 时，未知发件人会被静默忽略，而不是收到配对码（该允许列表表明你刻意限制了访问）。

### 在群聊中要求提及

默认情况下，Hermes 会响应所有已授权的私信和群消息。
要让群聊变为选择性响应，请启用提及门控（私信仍然始终有效）：

```yaml
gateway:
  platforms:
    photon:
      enabled: true
      require_mention: true
```

设置 `require_mention: true` 后，群聊消息会被忽略，除非匹配唤醒词模式。默认匹配 `Hermes` 和 `@Hermes agent` 的各种变体。若要使用自定义智能体名称，请设置正则模式：

```yaml
gateway:
  platforms:
    photon:
      require_mention: true
      mention_patterns:
        - '(?<![\w@])@?amos\b[,:\-]?'
```

这两个键也接受环境变量（`PHOTON_REQUIRE_MENTION`、
`PHOTON_MENTION_PATTERNS`）。这与 BlueBubbles iMessage 通道使用的提及门控模型相同。

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

打印已保存的凭据、sidecar 健康状态、你注册的号码，以及 Hermes 使用的已分配 iMessage 线路。当有 Photon token 和 dashboard 项目可用时，`status` 会从 dashboard 刷新缺失的号码行，但不会预置新线路。

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

- **`sidecar deps : ✗ run hermes photon install-sidecar`** — Node 已安装，但 `spectrum-ts` 没有。运行建议的命令。
- **`device token : ✗ missing`** — 运行 `hermes photon setup` 登录。
- **`No iMessage line assigned yet`** — Spectrum 已启用但尚未预置线路；重新运行 `hermes photon setup` 或查看 [dashboard][app]。
- **Sidecar 无法启动** — 确认 `node --version` 为 18.17+，且 `hermes photon install-sidecar` 已无错误完成。

## 当前限制

- **入站附件仅有元数据。** 入站事件携带文件名 + MIME 类型；智能体看到标记但尚无法读取字节。SDK 通过 `content.read()` 暴露附件字节，因此这是 sidecar 的后续工作。
- **出站附件受支持。** Hermes 通过 sidecar 的 `/send-attachment` 端点，使用 spectrum-ts 的 `attachment()` / `voice()` 内容构建器发送图片、语音消息、视频和文档。说明文字作为媒体之后的一条独立 iMessage 气泡到达。
- **原生投票受支持。** Hermes 通过 sidecar 的 `/send-poll` 端点，使用 spectrum-ts 的 `poll()` 构建器发送投票内容。
- **已读回执受支持。** sidecar 在将入站 iMessage 转发给 Hermes 后将其标记为已读，因此发件人无需等待模型/工具回合即可看到 `Read`。针对 Hermes 已发送消息的入站回执被消费为在线状态遥测数据，绝不创建智能体回合。设置 `PHOTON_READ_RECEIPTS=false` 可将消息保持在 `Delivered`。
- **消息特效受支持。** Hermes 通过 sidecar 的 `/send-effect` 端点，使用 spectrum-ts 的 iMessage `effect()` 构建器发送带原生 iMessage 气泡/屏幕特效的文本。
- **Photon 的免费配额：** 每个服务器每天 5,000 条消息，每条共享线路每天 50 次新会话发起。可申请提升——发送邮件至 `help@photon.codes`。
- **定时任务和独立发送需要网关处于运行状态。** 进程外发送方（定时任务、`hermes send`、dashboard）复用网关生成的 sidecar——它们从 `<hermes-home>/runtime/photon-sidecar.json` 读取其端口/token，该文件在 sidecar 通过健康检查后写入，停止时移除。如果独立发送报告网关似乎已关闭，请先启动（或重启）网关。
- **共享 / 免费层线路无法向新目标发起会话。** Photon 侧策略：共享线路只能给先向该线路发过短信的号码发送消息。即使 Hermes 配置正确，向全新收件人执行定时任务/独立发送也会被 Photon 拒绝——要么让收件人先向该线路发一次消息，要么改用专用线路。

## 环境变量

| 变量                      | 默认值             | 说明                                       |
|---------------------------|--------------------|--------------------------------------------|
| `PHOTON_PROJECT_ID`       | 来自 `.env`        | Spectrum 项目 id（SDK 的 `projectId`）；由设置写入 |
| `PHOTON_PROJECT_SECRET`   | 来自 `.env`        | 项目密钥；由设置写入                       |
| `PHOTON_SIDECAR_PORT`     | `8789`             | sidecar 控制 + 入站通道的回环端口 |
| `PHOTON_SIDECAR_AUTOSTART`| `true`             | 适配器是否生成 sidecar                     |
| `PHOTON_NODE_BIN`         | `which node`       | 覆盖 Node 二进制路径                       |
| `PHOTON_HOME_CHANNEL`     |（未设置）          | 定时任务 / 通知的默认空间 id               |
| `PHOTON_HOME_CHANNEL_NAME`|（未设置）          | 主通道的可读标签                           |
| `PHOTON_ALLOWED_USERS`    |（未设置）          | 逗号分隔的 E.164 允许列表                  |
| `PHOTON_ALLOW_ALL_USERS`  | `false`            | 仅供开发——接受任意发件人                   |
| `PHOTON_REQUIRE_MENTION`  | `false`            | 在群聊中响应前要求唤醒词                   |
| `PHOTON_MENTION_PATTERNS` | Hermes 唤醒词      | 群聊提及的 JSON 列表 / 逗号 / 换行正则模式 |
| `PHOTON_DASHBOARD_HOST`   | `app.photon.codes` | 覆盖 dashboard / 设备登录主机              |
| `PHOTON_SPECTRUM_HOST`    | `spectrum.photon.codes` | 覆盖 Spectrum API 主机                |

[photon]: https://photon.codes/
[app]: https://app.photon.codes/
