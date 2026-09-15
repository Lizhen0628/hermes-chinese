---
title: "Stripe Link Cli — 通过 Stripe Link 进行智能体支付 — 卡、SPT、审批"
sidebar_label: "Stripe Link Cli"
description: "通过 Stripe Link 进行智能体支付 — 卡、SPT、审批"
---

{/* 本页由 website/scripts/generate-skill-docs.py 根据技能的 SKILL.md 自动生成。请编辑源 SKILL.md，而非本页。 */}

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
| 平台 | linux, macos |
| 标签 | `Payments`, `Stripe`, `Link`, `Checkout`, `MPP` |
| 相关技能 | [`mpp-agent`](/docs/user-guide/skills/optional/payments/payments-mpp-agent)、[`stripe-projects`](/docs/user-guide/skills/optional/payments/payments-stripe-projects) |

## 参考：完整 SKILL.md

:::info
以下是 Hermes 在此技能被触发时加载的完整技能定义。这就是技能处于活动状态时智能体所看到的指令。
:::

# Stripe Link CLI 技能

封装 [@stripe/link-cli](https://github.com/stripe/link-cli)，让 Hermes 能够代用户使用一次性虚拟卡或共享支付令牌（SPT）完成购买。每一笔支出都需在 Link 移动端/网页应用中进行应用内审批 — Hermes 无法自行审批。

目前仅限美国（需要 Link 账户）。上游 CLI 不支持 Windows — 因此本技能限制为 `[linux, macos]`。

## 何时使用

触发短语：

- “buy X”、“pay for X”、“make a purchase”、“complete checkout”
- “get me a card”、“I need a payment method”
- “log in to Link”、“connect my Link wallet”
- 商户 API 返回 HTTP 402 响应，且带有 `www-authenticate: ... method="stripe"`

如果用户想要的是付费 API 调用（HTTP 402，无结账表单），那么 `card` 路径是错误的 — 应通过本技能使用 SPT，或转交给 `mpp-agent` 技能。

## 前置条件

- `PATH` 中可用 Node.js 20+（`node --version`）
- 位于美国（租户需 Link 账户）

在 Hermes 尝试支付之前，无需预先设置 Link 账户、支付方式和支出审批应用 — CLI 会在首次运行时引导用户完成：

- 位于 https://app.link.com 的 Link 账户 — 在首次 `link-cli` 认证时创建/关联
- 至少一个支付方式 — 首次运行时在 https://app.link.com/wallet 添加
- Link 移动端/网页应用 — 在发起首次支出请求时打开以进行审批

无需环境变量 — 认证状态由 CLI 存储在本地其自己的配置目录下。

## 安装

一次性全局安装：

```
npm install -g @stripe/link-cli
```

或通过 `npx @stripe/link-cli` 临时调用。以下技能使用已安装的 `link-cli` 形式。

## 如何运行

所有命令均通过 `terminal` 工具运行。CLI 会自动检测非 TTY 调用方，并默认输出紧凑的 `toon` 格式 — 对模型来说足够。如果某步骤需要结构化字段，请传入 `--format json`。

查看命令：`link-cli --llms-full`。
调用前获取命令的 schema：`link-cli <command> --schema`。

## 操作步骤

### 1. 检查/建立认证

```
link-cli auth status
```

如果尚未认证，请使用清晰的客户端名称登录（此标签会显示在用户的 Link 应用中）：

```
link-cli auth login --client-name "Hermes" --interval 5 --timeout 300
```

`--interval`/`--timeout` 形式会内联轮询，因此智能体无需管理 `_next` 步骤。将验证 URL 和短语打印给用户，然后等待 CLI 返回。

**在该步骤未通过 `auth status` 确认登录之前，请勿继续。**

### 2. 在创建支出请求前评估商户

确定凭证类型：

| 商户界面 | `--credential-type` |
|---|---|
| 标准 Web 结账表单 / Stripe Elements | `card`（默认） |
| 返回带 `www-authenticate` 中 `method="stripe"` 的 HTTP 402 | `shared_payment_token` |
| 返回不带 `method="stripe"` 的 HTTP 402 | 不支持 — 停止 |

对于 402 响应，请勿手动解码挑战。直接传入原始请求头：

```
link-cli mpp decode --challenge '<完整的 WWW-Authenticate 请求头>'
```

这会验证挑战并提取网络 ID + 解码后的请求体。

### 3. 列出支付方式 + 收货地址

```
link-cli payment-methods list
link-cli shipping-address list
```

除非用户另有指定，否则使用第一个条目。`payment-methods list` 中的 `id` 即为下一步中的 `--payment-method-id`。

### 4. 创建支出请求

在发出此命令前，与用户确认最终总额。金额单位为分。

```
link-cli spend-request create \
  --payment-method-id <pm_id> \
  --merchant-name "<name>" \
  --merchant-url "<url>" \
  --context "<一句话：讲述购买内容及原因>" \
  --amount <cents> \
  --line-item "name:<item>,unit_amount:<cents>,quantity:1" \
  --total "type:total,display_text:Total,amount:<cents>" \
  --request-approval
```

对于 MPP 商户，请添加 `--credential-type shared_payment_token`。

`--request-approval` 会向用户的 Link 应用发送通知并轮询，直到用户批准或拒绝。CLI 在拒绝/超时时会以非零退出码退出。

### 5. 安全检索凭证

**请勿将卡片详情打印到 stdout。** 使用 `--output-file`，使 PAN 永远不会进入智能体的对话记录或日志：

```
link-cli spend-request retrieve <lsrq_id> \
  --include card \
  --output-file /tmp/link-card.json \
  --format json
```

该文件以 `0600` 权限写入；stdout 仅显示脱敏字段（品牌、后四位、有效期）以及 `card_output_file` 路径。

### 6. 使用凭证

- 对于 Web 结账：将文件路径交给用户，或传给直接从磁盘填写表单的浏览器驱动工具。切勿将卡片文件 `read_file` 或 `cat` 到智能体的推理上下文中。
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

`@stripe/link-cli --mcp` 通过 stdio 将相同命令作为 MCP 工具暴露。要将其注册到 Hermes 的原生 MCP：

```
hermes mcp add stripe-link --command "npx" --args "@stripe/link-cli --mcp"
```

然后 `hermes mcp list` 应显示 `stripe-link`。相同的审批规则仍然适用 — MCP 无法绕过 Link 应用审批步骤。

## 注意事项

- **仅限美国。** 在美国以外，`auth login` 会失败。告知用户，不要反复重试。
- **卡 PAN 绝不能进入智能体上下文。** 每次都使用 `--output-file`。如果你已经未使用它就检索过，立即 `link-cli auth logout` 还不够 — 卡是一次性的，但卫生轮换很重要。
- **`--request-approval` 会阻塞，直到用户操作。** 如果用户在睡觉，CLI 将到达超时。设定好预期。
- **多步骤 `_next` 命令。** 某些命令会返回必须执行才能继续的 `_next.command`。如有疑问，优先使用内联轮询标志（`--interval`/`--timeout`）。
- **输出格式在非 TTY 模式下默认为 `toon`。** 对文本来说没问题，但如果下游步骤需要解析特定字段，请传入 `--format json`。
- **不要默认使用 `card`。** 存在商户评估步骤（第 2 节）是因为选择错误的凭证类型会导致购买静默失败或泄露超出所需的数据。

## 验证

```
link-cli --version && link-cli auth status
```

退出码 0 表示已安装并已登录。
