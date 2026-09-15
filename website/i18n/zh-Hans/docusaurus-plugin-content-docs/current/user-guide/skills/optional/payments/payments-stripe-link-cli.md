---
title: "Stripe Link Cli — 通过 Stripe Link 进行智能体支付 — 卡、SPT、审批"
sidebar_label: "Stripe Link Cli"
description: "通过 Stripe Link 进行智能体支付 — 卡、SPT、审批"
---

{/* 本页面由 website/scripts/generate-skill-docs.py 从技能的 SKILL.md 自动生成。请编辑源 SKILL.md，而非本页面。 */}

# Stripe Link Cli

通过 Stripe Link 进行智能体支付 — 卡、SPT、审批。

## 技能元数据

| | |
|---|---|
| 来源 | 可选 — 使用 `hermes skills install official/payments/stripe-link-cli` 安装 |
| 路径 | `optional-skills/payments\stripe-link-cli` |
| 版本 | `0.1.0` |
| 作者 | Teknium (teknium1)、Hermes Agent |
| 许可证 | MIT |
| 平台 | linux、macos |
| 标签 | `Payments`、`Stripe`、`Link`、`Checkout`、`MPP` |
| 相关技能 | [`mpp-agent`](/docs/user-guide/skills/optional/payments/payments-mpp-agent)、[`stripe-projects`](/docs/user-guide/skills/optional/payments/payments-stripe-projects) |

## 参考：完整的 SKILL.md

:::info
以下是 Hermes 在此技能被触发时加载的完整技能定义。这就是智能体在技能激活时看到的指令内容。
:::

# Stripe Link CLI 技能

封装 [@stripe/link-cli](https://github.com/stripe/link-cli)，使 Hermes 能够使用一次性虚拟卡或共享支付令牌（SPT）代用户完成购买。每一笔支出都需通过 Link 移动端/网页应用内的应用内审批进行把关 — Hermes 无法自行批准。

目前仅限美国（需要 Link 账户）。上游 CLI 不支持 Windows — 本技能限定为 `[linux, macos]`。

## 何时使用

触发短语：

- "buy X"、"pay for X"、"make a purchase"、"complete checkout"
- "get me a card"、"I need a payment method"
- "log in to Link"、"connect my Link wallet"
- 商户 API 返回 HTTP 402，且带有 `www-authenticate: ... method="stripe"`

如果用户希望进行付费 API 调用（HTTP 402，无结账表单），则 `card` 路径是错误的 — 请通过本技能使用 SPT，或移交至 `mpp-agent` 技能处理。

## 前提条件

- `PATH` 上有 Node.js 20+（`node --version`）
- 位于美国境内（Link 账户要求）

在 Hermes 尝试付款之前，无需预先设置好 Link 账户、支付方式和支出审批应用 — CLI 会在首次运行时引导用户逐步完成：

- 在 https://app.link.com 上的 Link 账户 — 在首次 `link-cli` 认证期间创建/关联
- 至少一种支付方式 — 在首次运行时于 https://app.link.com/wallet 添加
- Link 移动端/网页应用 — 在发起首次支出请求时打开以进行审批

无需环境变量 — 认证状态由 CLI 存储在其自身的配置目录下的本地位置。

## 安装

全局安装一次即可：

```
npm install -g @stripe/link-cli
```

或通过 `npx @stripe/link-cli` 临时调用。下文技能使用已安装的 `link-cli` 形式。

## 如何运行

所有命令均通过 `terminal` 工具运行。CLI 会自动检测非 TTY 调用方，并默认输出紧凑的 `toon` 格式 — 对模型来说足够。如果某一步骤需要结构化字段，请传入 `--format json`。

发现命令：`link-cli --llms-full`。
在调用某命令前获取其架构：`link-cli <command> --schema`。

## 操作流程

### 1. 检查/建立认证

```
link-cli auth status
```

如果尚未认证，请使用清晰的客户端名称登录（该标签会显示在用户的 Link 应用中）：

```
link-cli auth login --client-name "Hermes" --interval 5 --timeout 300
```

`--interval`/`--timeout` 形式会内联轮询，因此智能体无需管理 `_next` 步骤。向用户打印验证 URL + 短语，并等待 CLI 返回。

**在 `auth status` 确认登录之前，不要越过此步骤。**

### 2. 在创建支出请求之前评估商户

确定凭据类型：

| 商户界面 | `--credential-type` |
|---|---|
| 标准网页结账表单 / Stripe Elements | `card`（默认） |
| 返回 HTTP 402，且 `www-authenticate` 中含 `method="stripe"` | `shared_payment_token` |
| 返回 HTTP 402，但不含 `method="stripe"` | 不支持 — 停止 |

对于 402 响应，请勿手动解码挑战。直接传入原始头：

```
link-cli mpp decode --challenge '<full WWW-Authenticate header>'
```

这会验证挑战并提取网络 ID + 解码后的请求体。

### 3. 列出支付方式 + 收货地址

```
link-cli payment-methods list
link-cli shipping-address list
```

除非用户另有指定，否则使用第一个条目。`payment-methods list` 中的 `id` 即为下一步中的 `--payment-method-id`。

### 4. 创建支出请求

在发出此命令之前，先与用户确认最终总额。金额以分为单位。

```
link-cli spend-request create \
  --payment-method-id <pm_id> \
  --merchant-name "<name>" \
  --merchant-url "<url>" \
  --context "<one sentence: what is being purchased and why>" \
  --amount <cents> \
  --line-item "name:<item>,unit_amount:<cents>,quantity:1" \
  --total "type:total,display_text:Total,amount:<cents>" \
  --request-approval
```

对于 MPP 商户，添加 `--credential-type shared_payment_token`。

`--request-approval` 会向用户的 Link 应用发送通知，并轮询直到用户批准或拒绝。CLI 在拒绝/超时时以非零退出。

### 5. 检索凭据 — 安全地

**请勿将卡片详细信息打印到 stdout。** 使用 `--output-file`，这样 PAN 绝不会进入智能体的记录或日志：

```
link-cli spend-request retrieve <lsrq_id> \
  --include card \
  --output-file /tmp/link-card.json \
  --format json
```

该文件以 `0600` 权限写入；stdout 仅显示脱敏字段（品牌、后四位、有效期）以及一个 `card_output_file` 路径。

### 6. 使用凭据

- 对于网页结账：将文件路径交给用户，或将其传给直接从磁盘填写表单的浏览器驱动工具。切勿将卡片文件 `read_file` 或 `cat` 到智能体的推理上下文中。
- 对于 MPP 商户：

  ```
  link-cli mpp pay <merchant-url> \
    --spend-request-id <lsrq_id> \
    --method POST \
    --data '<json body>'
  ```

### 7. 清理

购买完成后立即删除卡片文件：

```
rm -f /tmp/link-card.json
```

## 可选：改为作为 MCP 服务器运行

`@stripe/link-cli --mcp` 通过 stdio 将相同的命令作为 MCP 工具暴露。要将其注册到 Hermes 的原生 MCP：

```
hermes mcp add stripe-link --command "npx" --args "@stripe/link-cli --mcp"
```

然后 `hermes mcp list` 应显示 `stripe-link`。同样的审批规则适用 — MCP 不会绕过 Link 应用的审批步骤。

## 坑点

- **仅限美国。** 在美国境外，`auth login` 会失败。告知用户，不要反复重试。
- **卡 PAN 绝不能进入智能体上下文。** 每次都要使用 `--output-file`。如果你已经在未使用它的情况下检索过，那么立即执行 `link-cli auth logout` 也是不够的 — 该卡虽是一次性使用，但轮换卫生很重要。
- **`--request-approval` 会阻塞直到用户操作。** 如果用户睡着了，CLI 会达到其超时。请设定好预期。
- **多步骤 `_next` 命令。** 某些命令会返回 `_next.command`，必须执行才能继续。如有疑虑，优先使用内联轮询标志（`--interval`/`--timeout`）。
- **输出格式在非 TTY 模式下默认为 `toon`。** 对散文式输出没问题，但如果下游步骤需要解析特定字段，请传入 `--format json`。
- **不要默认使用 `card`。** 商户评估步骤（第 2 节）的存在，是因为选择错误的凭据类型会导致购买静默失败或泄露超出必要的数据。

## 验证

```
link-cli --version && link-cli auth status
```

退出码 0 表示已安装并已登录。
