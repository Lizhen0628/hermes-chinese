---
title: "Chronos 托管定时任务契约"
description: "Chronos 定时任务服务商的智能体 ↔ NAS 通信契约"
---

# Chronos 托管定时任务 — 智能体 ↔ NAS 通信契约

**状态：** Chronos 定时任务服务商的权威通信规范。
**受众：** `agent-cron` 接口（`nous-account-service`）的 NAS 侧实现者，以及任何调试托管定时任务链路的开发者。

Chronos 让托管的 Hermes 网关在空闲时**缩容至零**，同时仍能触发定时任务。智能体不再使用进程内的 60 秒轮询器，而是要求 NAS 针对每个任务在其**真实的下次触发时间**仅布置**一个外部一次性任务**。NAS 在触发时通过经过认证的 webhook 回调智能体；智能体运行任务并重新布置下一个一次性任务。两次触发之间，智能体进程可以完全停止——它只会在真正触发时被唤醒。

NAS 用于实现这些一次性任务所依赖的外部调度器是 **NAS 内部的实现细节**。智能体从不与它通信，从不持有它的凭据，也从不提及它的名称。智能体只知晓以下三个 NAS 接口。

```
创建/更新/暂停/恢复/删除定时任务（智能体侧）
  │
  ▼
ChronosCronScheduler.reconcile()        ── 智能体计算 next_run_at
  │  POST {portal}/api/agent-cron/provision   （认证：智能体的 Nous 访问令牌）
  ▼
NAS 为 fire_at 布置一次性任务          ── NAS 拥有调度器及其凭据
  │
  ⏰ 到达 fire_at
  ▼
调度器 → POST {portal}/api/agent-cron/relay   （认证：调度器签名，由 NAS 验证）
  │
  ▼
NAS 签发一个短时效的智能体受众 JWT（purpose=cron_fire）
  │  POST {agent_callback_url}/api/cron/fire        （认证：该 JWT）
  ▼
智能体验证 NAS JWT → 存储 CAS 占用 → run_one_job → 重新布置下一个一次性任务
```

## 信任模型（请先阅读）

| 跳 | 谁调用谁 | 认证机制 | 由谁验证 |
|---|---|---|---|
| 1 | 智能体 → NAS（`provision`/`cancel`/`list`） | 智能体既有的 **Nous Portal 访问令牌**（Bearer）——对于托管智能体，这是 NAS 植入在 `auth.json` 中的**引导会话令牌**（客户端 `hermes-cli-vps`），而不是 `agent:*` 客户端令牌 | NAS（其常规智能体令牌路径） |
| 2 | 调度器 → NAS（`relay`） | 调度器的请求**签名** | NAS（其已有的签名路径） |
| 3 | NAS → 智能体（`/api/cron/fire`） | 一个**短时效的由 NAS 签发的 JWT**（`aud=agent:{instance_id}`，`purpose=cron_fire`） | 智能体（使用 PyJWT 对照 NAS JWKS 验证） |

> **具体是哪个令牌（第 1 跳）。** 托管智能体从不持有 `agent:{instance_id}`
> OAuth 客户端凭据——这种形态仅由交互式仪表盘授权码授予流程（浏览器用户）签发。
> 对于其自身所有外向 portal 调用，智能体使用**引导会话访问令牌**
> （`resolve_nous_access_token`），它由仅用于引导的客户端 `hermes-cli-vps` 签发，
> 并在首次启动时植入容器。因此 NAS 必须从以下任一来源解析调用方智能体的实例 id：
> 一个 `agent:{id}` 客户端（自托管/仪表盘调用方），或者——对于引导令牌——从
> `AgentInstance.bootstrapSessionId` 与令牌的会话 id（`sid`）匹配，且限定在组织范围内。
> 第 3 跳签发的触发 JWT 无论如何仍携带 `aud=agent:{instance_id}`。（若第 1 跳仅以
> `agent:*` 客户端为前提做门控，会让每一个真实的托管智能体 provision 都返回 403
> ——参见 `src/server/agent-cron/instance-auth.ts`。）

为什么采用 NAS 中转而非调度器直接 → 智能体：调度器使用 **NAS 的**密钥签名，而智能体不（也不应）持有这些密钥。智能体只能验证一个**由 NAS 签发**的令牌——这是它已经具备的信任路径。这使所有调度器凭据都留在 NAS 内部。（完整理由：本计划的 DQ-4。）

智能体侧未引入任何新密钥：第 1 跳复用智能体已用于 portal 的令牌，第 3 跳复用智能体已执行的 NAS-JWT 验证。

---

## 接口 1 — `POST /api/agent-cron/provision`（智能体 → NAS）

为某个任务布置（或幂等地重新布置）恰好一个一次性任务。

- **认证：** `Authorization: Bearer <智能体 Nous 访问令牌>`。NAS 通过其常规智能体令牌路径进行验证，并将该行限定到调用方智能体/组织。
- **请求体：**
  ```json
  {
    "job_id": "ab12cd34",
    "fire_at": "2026-06-18T12:34:56+00:00",
    "agent_callback_url": "https://agent-xyz.fly.dev",
    "dedup_key": "ab12cd34:2026-06-18T12:34:56+00:00"
  }
  ```
  - `fire_at` — ISO 8601，**由智能体计算**。可以是在不到一分钟后的将来；NAS 必须支持秒级粒度（时间由智能体掌控，因此不存在 1 分钟的调度器下限）。
  - `agent_callback_url` — 智能体自身可公开访问的基础 URL。NAS 会在触发时 POST `{agent_callback_url}/api/cron/fire`。
  - `dedup_key` — `"{job_id}:{fire_at}"`。NAS 按 **`(agent_id, job_id)` 执行 upsert**，因此对同一次触发的重新布置是幂等的（不会产生重复的一次性任务）。同一 `job_id` 的新 `fire_at` 会替换先前的布置。
- **动作：** 布置一个一次性任务在 `fire_at` 触发，指向 NAS 的 **relay** 路由（接口 3）——而非直接指向智能体，以便 NAS 留在链路中以签发智能体 JWT。持久化 `(agent_id, job_id, schedule_id, agent_callback_url)`。
- **响应：** `200 {"schedule_id": "<opaque>"}`。

## 接口 2 — `POST /api/agent-cron/cancel`（智能体 → NAS）

- **认证：** 同接口 1。
- **请求体：** `{"job_id": "ab12cd34"}`。
- **动作：** 取消 `(agent_id, job_id)` 已布置的一次性任务并删除该行。幂等——取消一个未知任务是 200 空操作。
- **响应：** `200 {"ok": true}`。

## 接口 3 — `POST /api/agent-cron/relay`（调度器 → NAS，触发中转）

- **认证：** 调度器的请求**签名**，由 NAS 用其已有的签名路径验证。这是触发的信任边界——伪造的 relay 调用必须在此处被拒绝。
- **动作：**
  1. 从持久化的行中查找 `(agent_id, job_id) → agent_callback_url`。
  2. 签发一个**短时效** JWT：`aud = "agent:{instance_id}"`，
     `iss = {portal_url}`，`purpose = "cron_fire"`，较小的 `exp`（约 60–120 秒），
     使用 NAS 常规的非对称签名密钥签名（通过 JWKS 发布）。
  3. `POST {agent_callback_url}/api/cron/fire`，携带
     `Authorization: Bearer <该 JWT>` 和请求体 `{"job_id": "...", "fire_at": "..."}`。
  4. 将智能体的非 2xx 响应视为**可重试**失败（让调度器重试 relay）。智能体存储的 CAS 会对重复触发去重，因此重试是安全的。
- **向调度器的响应：** 一旦智能体的 POST 被接受（202），即返回 2xx，这样调度器不会重试已投递的触发。

---

## 入站 `POST /api/cron/fire`（NAS → 智能体）——智能体侧，已实现

这是 NAS 在接口 3 第 3 步调用的智能体接口。托管部署上有两跳：

1. **仪表盘应用**（`hermes_cli/web_server.py`）——智能体唯一的公共 HTTP 入口（Fly 代理只暴露一个端口，即仪表盘的端口）。它位于 `PUBLIC_API_PATHS` 中，因此仪表盘 cookie 门控会让 bearer-JWT 回调通过并交给验证器。仪表盘验证 JWT、解析任务所属的配置档，然后携带保留的 NAS bearer 在回环地址上将该触发**转发**到第 2 跳——它本身不执行任务。
2. **网关 `APIServerAdapter`**（`gateway/platforms/api_server.py`，回环绑定，默认端口 8642）——重新验证 JWT（纵深防御），并使用网关的**实时平台适配器**运行任务，这正是让 relay 前置的逻辑平台和 E2EE 房间的投递得以运作的关键（独立发送路径无法服务二者）。直接暴露 api_server 的自托管 API 服务器部署会跳过第 1 跳，直接命中第 2 跳。

第 1 跳无法访问网关（缩容至零后的唤醒仍在启动、重启窗口、api_server 被禁用）→ 仪表盘返回 **503**，NAS 进行重试（非 2xx = 可重试，见下文）；存储 CAS 会对最终发生的重复触发去重。此处刻意不设仪表盘内执行的回退。验证器是 `plugins/cron/chronos/verify.py`。

- **认证：** `Authorization: Bearer <由 NAS 签发的 JWT>`。智能体验证：
  - 对照 NAS JWKS（`cron.chronos.nas_jwks_url`）签名，
  - `aud` == `cron.chronos.expected_audience`（本智能体的
    `agent:{instance_id}`），
  - `iss` == `cron.chronos.portal_url`，
  - `exp` / `nbf`（30 秒宽限），
  - `purpose == "cron_fire"`——一个通用智能体 JWT（无 purpose 或其它 purpose）
    会被拒绝，使其无法针对该接口重放。
- **请求体：** `{"job_id": "ab12cd34", "fire_at": "..."}`（仅使用 `job_id`）。
- **行为：**
  - 无效/缺失/伪造/过期/受众错误/purpose 错误的令牌 → **401**，不执行。
  - 缺失 `job_id` → **400**。
  - 有效 → 立即返回 **202 `{"status": "accepted", "job_id": "..."}`**，任务在后台运行。先于运行返回 202 意味着再长的智能体轮次也不会触发 relay 的 HTTP 超时。
- **至多一次：** 智能体在运行前通过存储级比较并交换（`claim_job_for_fire`）占用该任务。在首次触发在途期间（或之后）到达的 relay/调度器重试将占用失败，不会重复运行。

---

## 至多一次与重新布置语义

- **重复型（cron/interval）：** 触发时，智能体（在其存储锁下）作为占用的一部分推进 `next_run_at`，运行任务，然后为新的 `next_run_at` 重新布置一个一次性任务。针对旧 `fire_at` 的重复 relay 会发现占用已被取得/时间已推进而被丢弃。
- **一次性（`30m`、`+90s` 等）：** 触发一次；`mark_job_run` 将其标记为已完成。不再重新布置。
- **`repeat.times = N`：** `mark_job_run` 在达到上限时删除该任务，因此最后一次触发后 `get_job` 返回 `None` → 智能体**不**重新布置 → 计划干净地停止，没有遗留的一次性任务。
- **多副本智能体：** 存储 CAS 使触发在共享同一个 `HERMES_HOME` 的 N 个网关副本之间保持至多一次——每次触发恰好一个副本运行。

## Reconcile（自愈）

智能体在以下时机调谐期望状态（`jobs.json`）与已布置状态：
- `start()`（网关启动/唤醒），
- 每次成功的任务变更后（`on_jobs_changed`），
- 每次触发后顺带执行（重新布置）。

Reconcile 会布置缺失的/时间已变更的任务，并取消孤儿。一次遗漏的 provision（NAS 瞬时错误）会在下次 reconcile 时自愈。对于休眠的智能体**没有周期性的唤醒**——那会抵消缩容至零的效果。

## 配置（智能体侧）

全部为非机密（`config.yaml` 中的 `cron.chronos.*`）；智能体不持有任何调度器凭据。对于托管智能体，NAS 在 provision 时设置这些值：

| 键 | 含义 |
|---|---|
| `cron.provider` | 设为 `"chronos"` 以激活（空 = 内置轮询器） |
| `cron.chronos.portal_url` | NAS 基础 URL（也是期望的 JWT `iss`） |
| `cron.chronos.callback_url` | 智能体自身的公共基础 URL，用于 NAS→智能体的触发 |
| `cron.chronos.expected_audience` | 本智能体的 JWT `aud`（`agent:{instance_id}`） |
| `cron.chronos.nas_jwks_url` | 用于验证触发 JWT 的 NAS JWKS |

如果 `callback_url` / `portal_url` 为空，或智能体没有 Nous 登录，则 `is_available()` 返回 False，解析器回退到内置的进程内轮询器——定时任务永远不会失去其触发器。

## 逃生舱（非默认）

入站 `/api/cron/fire` 的验证器是可插拔的（`get_fire_verifier()`）。如果通过 NAS 的 relay 流量终有一天饱和，一种调度器直接 → 智能体、使用按任务由 NAS 签发的 cron 密钥的模式，可以在**不修改 webhook 处理器**的情况下替换 NAS-JWT 验证器。以 NAS 中转（本契约）为默认。
