---
title: "Cloudflare 临时部署 — 无需账户，通过 wrangler --temporary 实时部署 Worker"
sidebar_label: "Cloudflare 临时部署"
description: "无需账户，通过 wrangler --temporary 实时部署 Worker"
---

{/* 本页面由 website/scripts/generate-skill-docs.py 根据技能的 SKILL.md 自动生成。请编辑源文件 SKILL.md，而不是此页面。 */}

# Cloudflare 临时部署

无需账户，通过 wrangler --temporary 实时部署 Worker。

## 技能元数据

| | |
|---|---|
| 来源 | 可选 — 使用 `hermes skills install official/web-development/cloudflare-temporary-deploy` 安装 |
| 路径 | `optional-skills/web-development\cloudflare-temporary-deploy` |
| 版本 | `1.0.0` |
| 作者 | Hermes Agent |
| 许可证 | MIT |
| 平台 | linux, macos, windows |
| 标签 | `cloudflare`, `workers`, `wrangler`, `deploy`, `temporary`, `agent`, `serverless`, `web-development` |

## 参考：完整的 SKILL.md

:::info
以下是 Hermes 在触发此技能时加载的完整技能定义。这就是技能激活时智能体看到的指令内容。
:::

# Cloudflare 临时部署技能

使用 `wrangler deploy --temporary` 将一个 Cloudflare Worker 部署到实时的 `workers.dev` URL，无需任何账户设置。Cloudflare 会临时开通一个一次性账户，完成部署，并打印一个 60 分钟内有效的认领 URL；未认领的账户会自动删除。这让智能体拥有一个紧凑的「写入 → 部署 → 验证」循环，无需任何 OAuth、注册或手动复制粘贴 token。

本技能不涵盖生产部署（生产部署请使用 `wrangler login` + 永久账户），也不涵盖超出下述临时账户限制范围的非 Worker Cloudflare 产品。

## 何时使用

当用户希望以下操作时，加载此技能：

- **将智能体编写的代码发布到实时 URL**，而无需先创建 Cloudflare 账户 —— 「把这个部署一下并给我一个链接」
- **在后台/自主会话中迭代**，此时浏览器 OAuth 步骤会成为硬性阻碍
- **快速原型设计或评估 Workers**，使用一次性、可认领的目标
- **构建自验证的部署循环** —— 部署、`curl` 实时 URL、确认输出与代码一致、重新部署

## 何时不使用

- **生产环境或 CI/CD** → 使用永久账户（`wrangler login` 或 `CLOUDFLARE_API_TOKEN`）。若存在任何凭据，`--temporary` 会报错。
- **Wrangler 已经过认证** → `--temporary` 会按设计返回错误。仅当用户明确想要一次性部署时，才先运行 `wrangler logout`。
- **长期托管** → 临时部署在 60 分钟后会被删除，除非被认领。

## 先决条件

- **Wrangler 4.102.0 或更高版本。** 这是引入 `--temporary` 的版本。更早的版本没有该标志。使用 `npx wrangler@latest --version` 验证。
- **Node 18+ / npm**（或 `npx`、`yarn`、`pnpm`）。无需全局安装 —— `npx wrangler@latest` 即可使用。
- **不存在 Cloudflare 凭据。** `--temporary` 仅在 Wrangler 未认证时有效：没有 OAuth 登录、没有 `CLOUDFLARE_API_TOKEN` / `CLOUDFLARE_API_KEY` 环境变量、没有 `~/.wrangler` / `~/.config/.wrangler` 缓存的 OAuth。按原样使用 `terminal` 工具的环境；不要设置那些变量。
- 到 `cloudflare.com` 和 `workers.dev` 的网络出口。
- 使用 `--temporary` 即表示接受 Cloudflare 的服务条款和隐私政策。

## 如何运行

每一步都使用 `terminal` 工具。始终固定版本（`wrangler@latest` 或 `wrangler@4.102.0` 或更新），以免意外运行缺少该标志的旧版全局 wrangler。

1. **搭建一个最小 Worker**（如果项目已存在则跳过）。一个 Worker 需要 `wrangler.toml`（或 `wrangler.jsonc`）和一个入口脚本。最小 TypeScript 示例 —— 使用 `write_file` 编写这些文件：

   `wrangler.jsonc`：
   ```jsonc
   {
     "name": "hello-agent",
     "main": "src/index.ts",
     "compatibility_date": "2025-01-01"
   }
   ```

   `src/index.ts`：
   ```typescript
   export default {
     async fetch(): Promise<Response> {
       return new Response("hello cloudflare");
     },
   };
   ```

2. 从项目目录**使用 `--temporary` 部署**：
   ```
   npx wrangler@latest deploy --temporary
   ```
   工作量证明检查会带来短暂的自动延迟。成功后，Wrangler 会打印一行 `Account: <name> (created)`（或 `(reused)`）、一个 `Claim URL`，以及实时的 `https://<worker>.<account>.workers.dev` URL。

3. **从输出中解析 URL**。运行辅助脚本来可靠地提取它们，而不是靠肉眼：
   ```
   npx wrangler@latest deploy --temporary 2>&1 | python scripts/parse_deploy_output.py
   ```
   （将 `scripts/parse_deploy_output.py` 解析为此技能的绝对路径。）它会打印 JSON：`{"live_url", "claim_url", "account", "account_state", "expires_minutes", "deployed"}`。

4. **验证部署确实已上线** —— 不要只信任部署日志。`curl` 实时 URL 并确认返回体与代码返回的内容一致：
   ```
   curl -sS <live_url>
   ```

5. **迭代。** 编辑代码，使用相同的 `npx wrangler@latest deploy --temporary` 重新部署。在 60 分钟窗口内，Wrangler 会复用缓存的临时账户（`Account: <name> (reused)`），因此 URL 保持稳定。再次 `curl` 以确认更改。

6. **把认领 URL 交给用户。** 告诉他们：在 60 分钟内打开它，以保留部署及任何资源；如果不认领，所有内容会自动删除。将认领 URL 视为机密 —— 它授予账户的所有权。

## 快速参考

| 步骤 | 命令 |
|---|---|
| 检查版本（需要 4.102.0+） | `npx wrangler@latest --version` |
| 部署（无需账户） | `npx wrangler@latest deploy --temporary` |
| 部署 + 解析 URL | `npx wrangler@latest deploy --temporary 2>&1 \| python scripts/parse_deploy_output.py` |
| 验证在线 | `curl -sS <live_url>` |
| 清除缓存的临时账户 | `npx wrangler@latest logout` |

### 临时账户的产品限制

| 产品 | 临时账户的限制 |
|---|---|
| Workers | 部署到 `workers.dev` |
| Static Assets | 最多 1,000 个文件，每个 5 MiB |
| KV | 允许 |
| D1 | 1 个数据库，每个 DB 100 MB / 总计 100 MB |
| Durable Objects | 允许 |
| Hyperdrive | 2 个配置，10 个连接 |
| Queues | 最多 10 个 |
| SSL/TLS 证书 | 允许 |

## 常见陷阱

- **`--temporary` 不在 `wrangler deploy --help` 中，也不是全局标志。** 它被有意隐藏并动态显示：当未认证的 `wrangler deploy` 失败时，Wrangler 会打印「rerun with `--temporary`」。不要因为 `--help` 没有列出该标志就断定它不存在 —— 请改为检查版本。
- **旧版全局 wrangler。** 过时的全局安装的 `wrangler`（`< 4.102.0`）会静默地缺少该标志。始终调用 `npx wrangler@latest`（或固定 `>=4.102.0`），以便控制版本。
- **存在认证 → 硬错误。** 如果曾经运行过 `wrangler login`，或设置了 `CLOUDFLARE_API_TOKEN`/`CLOUDFLARE_API_KEY`，`--temporary` 会报错。要么为此 shell 取消设置该变量，要么 `wrangler logout`。绝不要在不告知用户的情况下移除他们真实的凭据。
- **速率限制。** 过快创建临时账户会失败。在 60 分钟窗口内复用缓存的账户（直接重新部署）而不是强制创建新账户；如果被速率限制，请等待或使用永久账户。
- **60 分钟硬性到期，不可延长。** 如果部署必须存活超过一小时，用户必须认领它。请清楚地说明这一点。
- **重新部署后，`curl` 可能短暂返回旧的响应体。** `workers.dev` 有短暂的边缘缓存；即使 `curl` 在数秒内显示过期内容，`(reused)` 这一行加上新的 `Current Version ID` 也能确认部署成功。在断定重新部署失败之前，请重新 curl，或添加一个破坏缓存的查询字符串。
- **不要把认领 URL 作为「仅仅是个链接」记录到共享记录中。** 它等同于凭据。

## 验证

- `npx wrangler@latest --version` 返回 `>= 4.102.0`。
- `npx wrangler@latest deploy --temporary` 打印一个 `workers.dev` 实时 URL 和一个 `claim-preview?claimToken=` 认领 URL。
- `curl -sS <live_url>` 返回 Worker 代码产生的精确响应体。
- 第二次部署报告 `Account: <name> (reused)`，且实时 URL 保持不变。
- 解析器脚本的自测通过：`python scripts/parse_deploy_output.py --selftest`。
