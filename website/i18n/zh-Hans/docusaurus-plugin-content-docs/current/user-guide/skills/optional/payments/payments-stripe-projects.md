---
title: "Stripe Projects — 通过 Stripe Projects 配置 SaaS 服务 + 同步凭证"
sidebar_label: "Stripe Projects"
description: "通过 Stripe Projects 配置 SaaS 服务 + 同步凭证"
---

{/* 此页面由 website/scripts/generate-skill-docs.py 根据该技能的 SKILL.md 自动生成。请编辑源文件 SKILL.md，而非此页面。 */}

# Stripe Projects

通过 Stripe Projects 配置 SaaS 服务 + 同步凭证。

## 技能元数据

| | |
|---|---|
| 来源 | 可选 — 使用 `hermes skills install official/payments/stripe-projects` 安装 |
| 路径 | `optional-skills/payments\stripe-projects` |
| 版本 | `0.1.0` |
| 作者 | Teknium (teknium1)、Hermes Agent |
| 许可证 | MIT |
| 平台 | linux、macos |
| 标签 | `Payments`、`Stripe`、`Projects`、`Provisioning`、`Infrastructure` |
| 相关技能 | [`stripe-link-cli`](/docs/user-guide/skills/optional/payments/payments-stripe-link-cli)、[`mpp-agent`](/docs/user-guide/skills/optional/payments/payments-mpp-agent) |

## 参考：完整 SKILL.md

:::info
以下是 Hermes 在触发此技能时加载的完整技能定义。当技能处于激活状态时，这就是智能体所看到的指令。
:::

# Stripe Projects Skill

封装了 [Stripe Projects](https://projects.dev) CLI 插件，使 Hermes 能够配置 SaaS 服务（Neon、Twilio、Vercel 等）、生成凭证并同步到用户的 `.env` 中，并在一处统一管理跨服务商的计费。

鉴于更广泛的 payments 技能群在 Windows 上尚不成熟，本技能以 `[linux, macos]` 作为门槛限制。Stripe CLI 本身是跨平台的；该门槛只是技能群的一种定位，而非硬性限制。

## 何时使用

触发短语：

- "set up &lt;provider>"、"provision &lt;Neon|Twilio|Vercel|...>"、"create a database"
- "give me a &lt;Postgres|Redis|Twilio number|...> for this project"
- "manage my stack credentials"、"rotate this key"、"upgrade my plan"
- "what providers can I add?"

如果用户已拥有某个服务商账户，本技能仍可通过 `stripe projects link <provider>` 将其连接。如果用户想使用现有的服务商资源（例如已有的数据库或 Vercel 项目），请先检查服务商的支持情况；目前许多服务商支持配置新资源，但不支持导入现有资源。

## 前置条件

- 已安装 Stripe CLI（macOS 上用 Homebrew，Linux 上用包管理器，或从 https://docs.stripe.com/stripe-cli/install 下载）
- 已安装 Stripe Projects 插件
- 一个 Stripe 账户。如果用户还没有账户，CLI 可在设置过程中引导其在浏览器中登录或创建账户。

## 安装

macOS：

```
brew install stripe/stripe-cli/stripe
stripe plugin install projects
```

Linux：按照 https://docs.stripe.com/stripe-cli/install 上进行特定平台的安装，然后：

```
stripe plugin install projects
```

## 如何运行

所有命令均通过 `terminal` 工具在用户的项目目录中运行（CLI 会将 `.env` 和 `.projects/vault/vault.json` 写入当前工作目录）。

## 操作步骤

### 1. 初始化项目

```
cd <project-root>
stripe projects init
```

这将创建 `.projects/vault/vault.json`（加密凭证存储），并使项目准备好接入服务商。

### 2. 查找可用的服务商

```
stripe projects catalog
```

列出 Stripe Projects 支持的所有服务商——数据库、托管、认证、AI、分析、消息等。

### 3. 添加服务

```
stripe projects add <provider>/<service>
```

示例：

- `stripe projects add neon/postgres`
- `stripe projects add twilio/sms`
- `stripe projects add runloop/sandbox`

CLI 会在用户自己的服务商账户中配置该服务、生成凭证、同步到 `.env` 中，并在 vault 中记录该资源。用户可能需要确认套餐选择或价格提示。

### 4. 验证

```
stripe projects list
```

应显示新添加的服务商及其 `.env` 键。

### 5. 管理 / 升级 / 移除

```
stripe projects upgrade <provider>     # 套餐变更
stripe projects remove <provider>      # 取消配置
stripe projects rotate <provider>      # 轮换凭证
```

## 注意事项

- **`.env` 写入是真实写入。** CLI 会追加到项目根目录下的 `.env` 文件。如果用户的 `.env` 已被 gitignore 忽略（这是正常做法），密钥可安全写入；若非如此，此技能可能成为凭证泄露的途径。务必先检查 `.gitignore`。
- **状态下属于各项目。** `.projects/vault/vault.json` 是按项目隔离的。在两个不同项目中配置同一服务会创建两个独立资源——以及两份账单。
- **计费发生在 Stripe 一侧。** 在 `add`/`upgrade` 过程中的套餐提示是真实扣费；在确认前请向用户明示。
- **服务商可用性会变化。** catalog 在不断扩展；如果用户指定的服务商未列出，先执行 `stripe projects catalog | grep <name>`，而不是直接让 `add` 调用失败。
- **vault 中的凭证是加密的，但 `.env` 是明文的。** 应遵循标准的 `.env` 规范——绝不将其提交到版本库。
- **移除服务并不总会销毁底层资源。** 部分服务商在被 `remove` 后会留下暂停/休眠状态的资源。对于高成本服务（尤其是托管数据库），请在 `remove` 后查看服务商自己的控制台。

## 验证

```
stripe projects --version && stripe projects list
```

在已初始化的项目中，退出码为 0 表示插件状态正常。
