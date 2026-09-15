---
title: "Mpp Agent — 通过机器支付协议 (MPP) 支付 HTTP 402 API"
sidebar_label: "Mpp Agent"
description: "通过机器支付协议 (MPP) 支付 HTTP 402 API"
---

{/* 本页由 website/scripts/generate-skill-docs.py 从技能的 SKILL.md 自动生成。请编辑源文件 SKILL.md，而非此页面。 */}

# Mpp Agent

通过机器支付协议 (MPP) 支付 HTTP 402 API。

## 技能元数据

| | |
|---|---|
| 源 | 可选 — 使用 `hermes skills install official/payments/mpp-agent` 安装 |
| 路径 | `optional-skills/payments\mpp-agent` |
| 版本 | `0.1.0` |
| 作者 | Teknium (teknium1), Hermes Agent |
| 许可证 | MIT |
| 平台 | linux, macos |
| 标签 | `Payments`、`MPP`、`HTTP-402`、`Tempo`、`Stripe` |
| 相关技能 | [`stripe-link-cli`](/docs/user-guide/skills/optional/payments/payments-stripe-link-cli)、[`stripe-projects`](/docs/user-guide/skills/optional/payments/payments-stripe-projects) |

## 参考：完整的 SKILL.md

:::info
以下是 Hermes 在此技能被触发时加载的完整技能定义。这就是技能激活时智能体所看到的指令内容。
:::

# MPP Agent 技能

封装机器支付协议 (MPP，https://mpp.dev) 客户端，使 Hermes 能够为针对返回 `HTTP 402 Payment Required` 的服务器的按请求 API 访问付费。

三种客户端选项，均通过 npm 分发。选择能满足用户需求的最轻量方案。在更广泛的支付工具在 Windows 上成熟之前，暂时限制为 `[linux, macos]`。

## 何时使用

- 商户 API 返回带有 `www-authenticate` 头的 `HTTP 402` —— 且用户希望实际完成支付，而不仅仅是记录响应。
- 用户要求“按请求付费”、“设置智能体钱包”、“使用 Tempo / Privy / AgentCash”，或者希望发现 MPP 定价的服务。
- Stripe Link 支出已生成共享支付令牌 (SPT)，智能体需要将其附加到 402 挑战中 —— 该流程中优先使用 `link-cli mpp pay`（参见 `stripe-link-cli` 技能）。

## 选择客户端

| 工具 | 何时使用 | 设置 |
|---|---|---|
| `link-cli` | 用户已设置好 Stripe Link，或 402 挑战声明了 `method="stripe"` | 参见 `stripe-link-cli` 技能 |
| Tempo Wallet | 具有支出控制、服务发现的 MPP 服务 | `tempo wallet login` |
| Privy Agent CLI | 多链钱包，基于浏览器的资金注入 | `privy-agent-wallets login` |
| AgentCash | 通过单一 USDC.e 余额使用 300+ 预定价 API | `npx agentcash onboard` |
| `mppx` | 开发 + 调试，最小依赖面 | `npm install -g mppx` 然后 `mppx account create` |

默认：如果用户已配置 Stripe Link，或 402 挑战指定了 `method="stripe"`，则使用 `link-cli mpp pay`（`stripe-link-cli` 技能）。否则，对于一次性付费调用和调试使用 `mppx`，当用户需要持续性的支出控制时使用 Tempo Wallet。

## 前提条件

- `PATH` 上有 Node.js 20+
- 一个已注资的钱包（Tempo / Privy / AgentCash）或一个 `mppx` 账户
- 对于 Tempo / Privy / AgentCash：请遵循各自的上手技能：
  - `https://tempo.xyz/SKILL.md`
  - `https://agents.privy.io/skill.md`
  - `https://agentcash.dev/skill.md`

如果用户选择了其中一个，使用 `web_extract` 获取相应的 SKILL.md 文件。

## 流程 (mppx，最快路径)

通过 `terminal` 工具运行所有命令。

### 1. 安装并创建账户

```
npm install -g mppx
mppx account create
```

将生成的账户凭据存储到 CLI 指定的位置（CLI 会将其写入自己的配置下 —— 不要将它们粘贴到智能体转录记录中）。

### 2. 检查商户的 402 挑战

如果用户给了你一个 URL，请先探测它以确认其确实支持 MPP：

```
curl -i <url>
```

真正的 MPP 402 如下所示：

```
HTTP/1.1 402 Payment Required
www-authenticate: tempo amount=0.1 currency=...
```

### 3. 支付请求

```
mppx <url>
```

对于非 GET 方法或请求体：

```
mppx <url> --method POST --data '<json>'
```

`mppx` 会自动处理 402 挑战/凭据流程，并在成功时打印商户的实际响应。

### 4. 验证收据

`mppx` 会自动附加收据头。如需检查：

```
mppx <url> -v
```

## 流程 (Tempo Wallet)

位于 https://tempo.xyz/SKILL.md 的 Tempo Wallet 技能是权威参考；使用 `web_extract` 获取它并遵循它。核心内容：

```
tempo wallet login
tempo wallet pay <url>
```

支出控制和服务发现位于钱包 UI：https://wallet.tempo.xyz。

## 陷阱

- **没有 `method="stripe"` 的 `HTTP 402` 无法通过 Stripe Link 支付。** 如果挑战仅声明了 Tempo / 其他方式，请使用 `mppx`（或匹配的钱包）—— Link 会拒绝它。反之，如果它声明了 `method="stripe"`，请优先通过 `stripe-link-cli` 技能使用 Link，以便支出通过用户已批准的卡进行。
- **单个头中包含多个挑战。** `www-authenticate` 可能会列出多种方法（例如 `tempo, stripe`）。Link CLI 的 `mpp decode` 会选择 Stripe 那个；`mppx` 会选择 Tempo。并不存在唯一“正确”的客户端 —— 根据用户注资了哪个钱包来选择。
- **零金额挑战。** 某些 MPP 端点收费 `$0.00` 且只想要一个证明凭据。这些无需已注资的钱包也能使用。不要将它们拒绝为“损坏”。
- **钱包密钥绝不能进入智能体上下文。** 所有四个客户端都将密钥存储在自己的配置目录下（或者在 Privy 的情况下，生成每会话临时密钥对）。不要 `cat`/`read_file` 它们。
- **服务端 MPP 是另一个技能。** 如果用户想为他们的 API 添加 402，此技能不适用 —— 请将他们指向 https://mpp.dev/quickstart/server 以及 `mppx/nextjs` / `mppx/hono` / `mppx/express` / `mppx/elysia` 中间件。专用的 `mpp-server` 技能可能会在未来推出。

## 验证

```
mppx --version && mppx account list
```

退出代码 0 表示已安装且账户存在。
