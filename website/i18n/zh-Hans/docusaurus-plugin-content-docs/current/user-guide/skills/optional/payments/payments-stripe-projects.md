---
title: "Stripe Projects — 通过 Stripe Projects 配置 SaaS 服务并同步凭证"
sidebar_label: "Stripe Projects"
description: "通过 Stripe Projects 配置 SaaS 服务并同步凭证"
---

{/* This page is auto-generated from the skill's SKILL.md by website/scripts/generate-skill-docs.py. Edit the source SKILL.md, not this page. */}

# Stripe Projects

通过 Stripe Projects 配置 SaaS 服务并同步凭证。

## 技能元数据

| | |
|---|---|
| 来源 | 可选 — 使用 `hermes skills install official/payments/stripe-projects` 安装 |
| 路径 | `optional-skills/payments\stripe-projects` |
| 版本 | `0.1.0` |
| 作者 | Teknium (teknium1)、Hermes Agent |
| 许可证 | MIT |
| 平台 | linux, macos |
| 标签 | `Payments`、`Stripe`、`Projects`、`Provisioning`、`Infrastructure` |
| 相关技能 | [`stripe-link-cli`](/docs/user-guide/skills/optional/payments/payments-stripe-link-cli)、[`mpp-agent`](/docs/user-guide/skills/optional/payments/payments-mpp-agent) |

## 参考：完整 SKILL.md

:::info
以下是 Hermes 在此技能被触发时加载的完整技能定义。这就是技能激活时智能体所见到的指令内容。
:::

# Stripe Projects 技能

封装 [Stripe Projects](https://projects.dev) CLI 插件，使 Hermes 能够配置 SaaS 服务（Neon、Twilio、Vercel 等）、生成凭证并同步到用户的 `.env`，还能在一处集中管理各服务商的账单。

在更广泛的 payments 集群在 Windows 上成熟期间，受 `[linux, macos]` 门控限制。Stripe CLI 本身是跨平台的；此门控是该集群的姿态设定，并非硬性限制。

## 何时使用

触发短语：

- "set up &lt;provider>"、"provision &lt;Neon|Twilio|Vercel|...>"、"create a database"
- "give me a &lt;Postgres|Redis|Twilio number|...> for this project"
- "manage my stack credentials"、"rotate this key"、"upgrade my plan"
- "what providers can I add?"

如果用户已经拥有服务商账户，此技能仍可通过 `stripe projects link <provider>` 将其连接。如果用户想使用现有的服务商资源，例如已有的数据库或 Vercel 项目，请先检查服务商支持情况；目前许多服务商支持配置新资源，但不支持导入现有资源。

## 前置条件

- 已安装 Stripe CLI（macOS 上用 Homebrew，Linux 上用包管理器，或从 https://docs.stripe.com/stripe-cli/install 下载）
- 已安装 Stripe Projects 插件
- 拥有 Stripe 账户。如果用户还没有，CLI 可在设置期间引导他们通过浏览器登录或创建账户。

## 安装

macOS：

```
brew install stripe/stripe-cli/stripe
stripe plugin install projects
```

Linux：按照 https://docs.stripe.com/stripe-cli/install 中针对特定平台的说明进行安装，然后执行：

```
stripe plugin install projects
```

## 如何运行

所有命令均通过 `terminal` 工具在用户的项目目录内执行（CLI 会将 `.env` 和 `.projects/vault/vault.json` 写入当前工作目录）。

## 操作步骤

### 1. 初始化项目

```
cd <project-root>
stripe projects init
```

这会创建 `.projects/vault/vault.json`（加密凭证存储），并让项目准备好接收服务商。

### 2. 发现可用的服务商

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

CLI 会在用户自己的服务商账户中配置该服务，生成凭证，同步到 `.env`，并将资源记录到 vault 中。用户可能需要确认套餐选择或价格提示。

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

- **写入 `.env` 是真实写入。** CLI 会追加到项目根目录下的 `.env`。如果用户的 `.env` 已被 gitignore（常规做法），则这些键会安全存入；若并未被忽略，此技能可能成为凭证泄漏途径。始终先检查 `.gitignore`。
- **按项目隔离的状态。** `.projects/vault/vault.json` 是按项目独立的。在两个不同项目中配置同一服务会创建两个独立资源——以及两份账单。
- **账单由 Stripe 侧结算。** `add`/`upgrade` 期间的套餐提示是真实收费；在确认前须向用户明示。
- **服务商可用性会变化。** 目录会增长；如果用户提及的服务商未列出，先用 `stripe projects catalog | grep <name>` 查询，而不是让 `add` 调用失败。
- **vault 中的凭证是加密的，但 `.env` 是明文。** 遵循标准的 `.env` 卫生规范——切勿提交到版本库。
- **移除服务不一定销毁底层资源。** 某些服务商会留下已暂停/休眠的资源。对于高成本服务（尤其是托管数据库），`remove` 后请到服务商自己的控制台检查一遍。

## 验证

```
stripe projects --version && stripe projects list
```

在已初始化的项目内退出码为 0 表示插件工作正常。
