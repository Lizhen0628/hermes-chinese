---
title: "Mpp Agent — 通过机器支付协议 (MPP) 支付 HTTP 402 API"
sidebar_label: "Mpp Agent"
description: "通过机器支付协议 (MPP) 支付 HTTP 402 API"
---

{/* 本页面由 website/scripts/generate-skill-docs.py 从该技能的 SKILL.md 自动生成。请编辑源文件 SKILL.md，而非此页面。 */}

# Mpp Agent

通过机器支付协议 (MPP) 支付 HTTP 402 API。

## 技能元数据

| | |
|---|---|
| 来源 | 可选 — 使用 `hermes skills install official/payments/mpp-agent` 安装 |
| 路径 | `optional-skills/payments\mpp-agent` |
| 版本 | `0.1.0` |
| 作者 | Teknium (teknium1), Hermes Agent |
| 许可证 | MIT |
| 平台 | linux, macos |
| 标签 | `Payments`、`MPP`、`HTTP-402`、`Tempo`、`Stripe` |
| 相关技能 | [`stripe-link-cli`](/docs/user-guide/skills/optional/payments/payments-stripe-link-cli)、[`stripe-projects`](/docs/user-guide/skills/optional/payments/payments-stripe-projects) |

## 参考：完整的 SKILL.md

:::info
以下是 Hermes 在此技能被触发时加载的完整技能定义。这就是技能激活时智能体所看到的指令。
:::

# MPP Agent 技能

封装机器支付协议 (MPP, https://mpp.dev) 客户端，使 Hermes 能够针对返回 `HTTP 402 Payment Required` 的服务器按请求支付 API 访问费用。

三种客户端选项，均通过 npm 分发。挑选能解决用户需求的最轻量方案。在更广泛的支付工具于 Windows 上成熟之前，暂限定为 `[linux, macos]`。

## 何时使用

- 某个商户 API 返回 `HTTP 402` 并附带 `www-authenticate` 头 — 而用户想要真正支付它，而不仅仅是记录该响应。
- 用户要求"按请求支付"、"设置智能体钱包"、"使用 Tempo / Privy / AgentCash"，或想要发现采用 MPP 定价的服务。
- 某笔 Stripe Link 支出已生成共享支付令牌 (SPT)，智能体需要将其附加到 402 挑战中 — 在该流程中，优先使用 `link-cli mpp pay`（参见 `stripe-link-cli` 技能）。

## 选择客户端

| 工具 | 使用时机 | 设置 |
|---|---|---|
| `link-cli` | 用户已设置好 Stripe Link，或 402 挑战宣告了 `method="stripe"` | 参见 `stripe-link-cli` 技能 |
| Tempo Wallet | 需要支出控制、服务发现的 MPP 服务 | `tempo wallet login` |
| Privy Agent CLI | 多链钱包、基于浏览器的资金充值 | `privy-agent-wallets login` |
| AgentCash | 通过单一 USDC.e 余额访问 300+ 个预定价 API | `npx agentcash onboard` |
| `mppx` | 开发 + 调试，依赖面最小 | `npm install -g mppx` 然后 `mppx account create` |

默认：如果用户已配置 Stripe Link 或 402 挑战指定了 `method="stripe"`，则使用 `link-cli mpp pay`（即 `stripe-link-cli` 技能）。否则，对于一次性付费调用和调试使用 `mppx`，当用户需要持久化支出控制时使用 Tempo Wallet。

## 前置条件

- `PATH` 上需有 Node.js 20+
- 一个已充值的钱包（Tempo / Privy / AgentCash）或一个 `mppx` 账户
- 对于 Tempo / Privy / AgentCash：请遵循它们各自的上手技能：
  - `https://tempo.xyz/SKILL.md`
  - `https://agents.privy.io/skill.md`
  - `https://agentcash.dev/skill.md`

如果用户选择其中之一，使用 `web_extract` 获取这些 SKILL.md 文件中的任何一个。

## 步骤（mppx，最快路径）

通过 `terminal` 工具运行所有命令。

### 1. 安装 + 创建账户

```
npm install -g mppx
mppx account create
```

将生成的账户凭证存储到 CLI 所指示的位置（CLI 会将其写入自己的配置目录下 — 不要将它们粘贴到智能体的对话记录中）。

### 2. 检查商户的 402 挑战

如果用户给你一个 URL，先探测它以确认它确实支持 MPP：

```
curl -i <url>
```

真正的 MPP 402 响应如下：

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

`mppx` 会自动处理 402 挑战/凭证交互，并在成功时打印商户的实际响应。

### 4. 验证收据

`mppx` 会自动附加收据头。如需查看：

```
mppx <url> -v
```

## 步骤（Tempo Wallet）

https://tempo.xyz/SKILL.md 处的 Tempo Wallet 技能是权威参考；用 `web_extract` 获取它并遵循它。主要内容：

```
tempo wallet login
tempo wallet pay <url>
```

支出控制和服务发现位于钱包 UI 中：https://wallet.tempo.xyz。

## 常见陷阱

- **没有 `method="stripe"` 的 `HTTP 402` 无法通过 Stripe Link 支付。** 如果挑战仅宣告 Tempo / 其他方法，请使用 `mppx`（或与之匹配的钱包）— Link 会拒绝它。反之，如果它宣告了 `method="stripe"`，则优先通过 `stripe-link-cli` 技能使用 Link，以便支出经由用户批准的卡片进行。
- **一个头中包含多个挑战。** `www-authenticate` 可能列出多种方法（例如 `tempo, stripe`）。Link CLI 的 `mpp decode` 会选取 Stripe 那个；`mppx` 会选取 Tempo。不存在唯一的"正确"客户端 — 取决于用户钱包中充值了哪个。
- **零金额挑战。** 某些 MPP 端点收费 `$0.00`，只是想要一个凭证证明。这些在有充值钱包的情况下可正常工作。不要将其拒绝为"坏了"。
- **钱包密钥绝不进入智能体上下文。** 所有四个客户端都将密钥存储在自己的配置目录下（或在 Privy 的情况下，生成每次会话的临时密钥对）。不要用 `cat`/`read_file` 读取它们。
- **服务端 MPP 是另一个技能。** 如果用户想要为自己的 API 添加 402，本技能不适用 — 请让他们参阅 https://mpp.dev/quickstart/server 以及 `mppx/nextjs` / `mppx/hono` / `mppx/express` / `mppx/elysia` 中间件。一个专门的 `mpp-server` 技能可能会在稍后推出。

## 验证

```
mppx --version && mppx account list
```

退出码为 0 表示已安装且账户存在。
