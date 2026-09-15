---
title: "计费生命周期（TUI）"
description: "将每一种计费/订阅状态和类型化拒绝映射到终端界面中确切的 TUI 文案与恢复操作"
---

# 计费生命周期：客户端状态、错误与恢复

本文梳理了从网关（来自 NAS）提供的每一种 `billing.*`/`subscription.*` 状态形态到终端实际渲染内容的映射，以及每一种类型化拒绝/错误码到其确切的面向用户文案与恢复操作的映射。其保证是：没有任何 NAS 计费状态、也没有任何类型化拒绝会落入通用提示框——下面每一种情况都是 `ui-tui/src/app/slash/commands/topup.ts`、`ui-tui/src/components/billingOverlay.tsx` 或 `ui-tui/src/components/subscriptionOverlay.tsx` 中一个显式的分支。**未知**代码也会优雅降级：它会走到 `default` 分支（从服务端 payload 中取得的一条通用但真实的提示，绝不是空白提示框），而不是崩溃或默默丢弃该拒绝。

## 1. `billing.state` 形态 → 渲染

来源：`ui-tui/src/components/billingOverlay.tsx`（`OverviewScreen`、`BuyScreen`、`AutoReloadScreen`）、`ui-tui/src/app/slash/commands/topup.ts`（`/topup` 运行）。

| 状态形态 | 渲染 |
|---|---|
| 已登出（`s.logged_in === false`） | 覆盖层从不打开。`sys`：`💳 Not logged into Nous Portal — run /portal to log in, then /topup.` |
| `billing.state` RPC 拉取失败（传输/超时） | **故障关闭**：`.catch(ctx.guardedErr)`——覆盖层从不打开，不做任何状态假设。`sys`：`error: <message or "request failed">`。绝不会渲染“无卡”或任何其他猜测状态；用户必须重试 `/topup`。 |
| `card: null`（无已保存卡），完整菜单（`is_admin && cli_billing_enabled`） | 概览显示 `No saved card on file — "Add funds" walks you through adding one.` “Add funds”打开**添加卡路径**：`Add a card on the portal` / `I've added it — check again` / `Back`（绝不是金额选择器，那会 403 `no_payment_method`）。 |
| 存在 `card`，设置了 `resolved_via` | `Card: {display}`（例如 `Visa ····4242 — the card on your subscription`），使用感知来源的 `display` 字段。 |
| 存在 `card`，未设置 `resolved_via`（较旧的 NAS） | 回退到通用的 `Card: {masked}`；确认界面追加 `Your card saved on the portal will be charged.` |
| `auto_reload: null` | 完全没有自动充值行（`autoReloadLine` 返回 `null`）——该功能不予展示。 |
| `auto_reload.card.kind: 'canonical'` | 无区隔卡警告；卡片行回退到档案卡。 |
| `auto_reload.card.kind: 'distinct'` | 自动充值界面显示 `⚠ Auto-refill is charging {brand} ••{last4} — not your card on file.`（分歧提示）。 |
| `auto_reload.card.kind: 'none'` | 渲染同 `canonical`——不显示区隔卡警告。 |
| 存在 `monthly_cap`，`limit_usd != null` | `{spent_display} of {limit_display} used this month`（当且仅当 `is_default_ceiling` 时加 ` (default ceiling)`）。 |
| `monthly_cap` 缺失或 `limit_usd == null` | `No monthly cap visible (managed on the portal).` |
| 无计费能力的角色（`!is_admin`，菜单收拢） | 附注：`Billing actions need someone with billing permissions (owner, admin, or finance admin).` 菜单收拢为 `Manage on portal` / `Cancel`。 |
| 组织一键开关关闭（`is_admin` 但 `!cli_billing_enabled`） | 附注：`Remote spending is off for this org — a billing admin can turn it on from the portal's Hermes Agent page.` 同样的收拢菜单。 |

注意：`full = s.is_admin && s.cli_billing_enabled` 控制的是**组织级**开关，而非每终端的 `billing:manage` 作用域——后者以响应式方式发现（一次扣费会 403 `insufficient_scope`），并路由到可恢复的阶梯验证界面，而不是预检检查。

## 2. 拒绝代码（`renderBillingError`，按代码顺序）

来源：`renderBillingError`，位于 `ui-tui/src/app/slash/commands/topup.ts:37-149`。“Portal”列 = 只要 `portal_url` 存在，就会对每个代码（包括 default）追加 `sys('Portal: {portal_url}')`。

| `error` 代码 | 文案 | Portal URL | `retry_after` |
|---|---|:-:|:-:|
| `insufficient_scope` | `This needs Remote Spending allowed. Start a top-up to allow it, then retry.` | 若存在 | — |
| `remote_spending_revoked`（CF-4） | `{An admin stopped remote spending for this terminal. \| You stopped remote spending for this terminal.}`（按 `actor`）`Reconnect to restore — run /portal to re-authorize this terminal.` 同时立即清除 `billing` 覆盖层状态（不等待令牌刷新）。 | 若存在 | — |
| `session_revoked` | `Your session was logged out. Run /portal to log in again.` 同时清除 `billing` 覆盖层状态。 | 若存在 | — |
| `cli_billing_disabled` / `remote_spending_disabled`（双发） | `Remote spending is off for this account — a billing admin can turn it on from the portal's Hermes Agent page.` | 若存在 | — |
| `role_required` | `Adding funds needs someone with billing permissions (owner, admin, or finance admin), or manage this on the portal.` | 若存在 | — |
| `consent_required` | `This action needs a one-time card confirmation and consent step on the portal before it can proceed.` | 若存在 | — |
| `org_access_denied` | `This token isn't bound to an org you can manage. Sign in with the right org, or manage this on the portal.` | 若存在 | — |
| `upgrade_cap_exceeded` | `🔴 Daily plan-change limit reached (5 per org) — try again tomorrow, or manage this on the portal.` | 若存在 | — |
| `auto_top_up_disabled_failures` | `Auto-reload was turned off after repeated charge failures. Fix the card issue, then re-enable it from /topup → Auto-reload.` | 若存在 | — |
| `idempotency_conflict` | `🔴 That charge key was already used for a different amount. Start a fresh top-up.` | 若存在 | — |
| `no_payment_method` | `💳 No saved card for terminal charges yet. Set one up on the portal (one-time credit buys don't save a reusable card).` | 若存在 | — |
| `monthly_cap_exceeded` | `🔴 Monthly spend cap reached — ${remainingUsd} headroom left.`（若存在 `payload.remainingUsd`），否则 `🔴 Monthly spend cap reached.` | 若存在 | — |
| `rate_limited` / `temporarily_unavailable` | `🟡 Too many charges right now{ (try again in ~N min)}. This isn't a payment failure.` | 若存在 | **是**——分钟数按 `max(1, round(retry_after/60))` 计算 |
| `stripe_unavailable` | `🟡 Stripe is having trouble right now — try again shortly{ (try again in ~N min)}.` | 若存在 | **是**（同样的公式） |
| *default（未知/其他）* | `🔴 {message \|\| error \|\| 'Billing request failed.'}`——仍然呈现服务端所说的内容，绝不是空白提示框。 | 若存在 | — |

## 3. 扣费结算结果（`pollCharge` / `renderChargeFailed`）

来源：`pollCharge`（`ui-tui/src/app/slash/commands/topup.ts:170-258`）与
`renderChargeFailed`（`:260-290`）。轮询节奏：间隔 2 秒，上限 5 分钟
（`POLL_INTERVAL_MS=2000`、`POLL_CAP_MS=5*60*1000`），对**每一条**非终态路径
（无论 pending 还是被节流）都会应用，因此持续性的 429/503 无法让轮询永远持续下去。

| 结果 | 文案 | 备注 |
|---|---|---|
| `status: 'settled'` | `✅ ${amount_usd} added.`（无金额时为 `✅ Credits added.`） | 终态成功。 |
| `status: 'failed'`, `reason: 'authentication_required'` | `🔴 Your bank requires verification (3DS). Complete it on the portal to finish this purchase.` | 若有 `portalUrl`，会附加 `Portal:` 行。 |
| `status: 'failed'`, `reason: 'payment_method_expired'` | `🔴 Your card has expired. Update it on the portal.` | 附 `Portal:` 行。 |
| `status: 'failed'`, `reason: 'card_declined'` | `🔴 Your card was declined. Try another card on the portal.` | 附 `Portal:` 行。 |
| `status: 'failed'`, `reason: 'processing_error'` | `🔴 The charge didn't go through (processing_error).` | 附 `Portal:` 行。 |
| `status: 'failed'`，`reason` 无法识别或缺失 | `🔴 The charge didn't go through ({reason \|\| 'processing_error'}).` | 同一套 portal 引导——与 `cli.py` 的 `_billing_portal_hint` 保持一致。 |
| 轮询超时（超过 5 分钟上限仍为 `pending`） | `🟡 Still processing after 5 minutes — this is a timeout, not a failure. Check /topup or the portal shortly.` | 若有 `portalUrl`，会附加 `Portal:` 行。明确**不**称作失败。 |
| 轮询中途被撤销（轮询过程中收到 `remote_spending_revoked` / `session_revoked`） | 渲染第 2 节中对应的文案，**随后**追加：`🟡 Your last charge's outcome is unconfirmed — check your balance/history before retrying.` | CF-7 规则 4：撤销之后在轮询中收到 403 是语义不明的（这笔扣费可能已经结算完成）——绝不能说它"失败"。 |
| 轮询中遇到 429/503（`rate_limited`/`temporarily_unavailable`/`stripe_unavailable`） | 不显示错误；按 `retry_after`（默认 5 秒，上限 30 秒）退避并持续轮询直到 5 分钟上限，随后按超时处理。 | 不是支付失败。 |
| 其他 `!ok` 状态查询错误 | `🔴 Could not check the charge: {message \|\| error \|\| 'error'}` | |
| 传输中断（轮询 RPC 抛错/拒绝） | `🟡 Your last charge's outcome is unconfirmed — check your balance/history before retrying.`（`UNCONFIRMED_CHARGE_MESSAGE`） | 与轮询中途被撤销采用同一"结果未确认，请检查余额"的说法——连接中断绝不能解读为"失败"。 |

## 4. 订阅预览 / 待生效变更 / 升级结果

来源：`ui-tui/src/components/subscriptionOverlay.tsx` 中的 `previewAndRoute`、`applyPendingAndRoute`、`upgradeResult`、`stepUpDenialResult`。

**预览 `effect` 取值**（驱动确认界面）：

| `effect` | 确认界面文案 | 主要操作 |
|---|---|---|
| `charge_now` | `Upgrade to {target}. You will be charged {amount} now (prorated).`（另加每月额度差额；若解析器有把握还会计入使用哪张卡） | `Pay {amount} & upgrade now` |
| `scheduled` | `Change to {target} — takes effect {date}. No charge now; you keep your current plan until then.` | `Schedule change to {target}` |
| `no_op` | `You are already on {target} — nothing to change.` | 无（仅返回） |
| `blocked` | `{preview.reason}`，或回退为 `That change cannot be made here — manage it on the portal.` | `Manage on portal` |
| 预览 RPC 返回 `null`/传输失败 | 直接跳转到结果界面：`Could not preview that change.` | — |
| 预览 `!ok`、`insufficient_scope` | 跳转到 `stepup` 界面（`{kind:'preview', tierId}`） | — |
| 预览 `!ok`、其他错误 | 跳转到结果界面并使用 `errorResult(p)`（`message \|\| error \|\| 'Something went wrong. Try again, or manage on the portal.'`） | — |

**待生效变更的应用结果**（`applyPendingAndRoute`）：

| `pending.kind` | 成功文案 |
|---|---|
| `cancellation` | `Scheduled — your plan stays active until the end of the billing period, then it cancels. Nothing changes today.` |
| `tier_change`（降级/排期） | `Scheduled — your plan doesn't change today. You keep your current plan until the end of the billing period, then it switches.` |
| `upgrade` | 经过 `upgradeResult` 处理（见下） |
| 任意类型，变更操作 `insufficient_scope` | 跳转到 stepup（`{kind:'apply'}`） |

**升级 `status` × `reason` 矩阵**（`upgradeResult`，按此顺序检查——先检查 `reason` *再*检查 `status`）：

| 条件 | 结果 |
|---|---|
| `r === null`（扣费路由的传输失败） | `Couldn't confirm the upgrade — your card may or may not have been charged. Re-run /subscription to check your plan before trying again.`——语义不明，绝不盲目重试。 |
| `reason: 'authentication_required'` **或** `reason: 'subscription_payment_intent_requires_action'` | `Please verify your card in the portal to finish this upgrade.` → `recovery_url`。**两种 reason 都映射到同一段 SCA 文案**——客户端基于 `reason` 而非 `status` 分支，正是为了让 #711 之前 NAS 可能错误标注为 `status: 'payment_failed'`（尚无区分性 reason）的 SCA 情形，仍能正确指向"验证你的卡片"文案，而不是被读作硬性拒付。 |
| `reason: 'card_declined'` | `Your card was declined — try a different card on the portal.` → `recovery_url`。 |
| `ok && status: 'already_on_tier'` | `You are already on {target_tier_name}.`（成功） |
| `ok && status: 'upgraded'` | `Upgraded to {target_tier_name}. Your new monthly credits land in a moment.`——启动下面的最终一致性 apply 轮询。 |
| `status: 'requires_action'`（无区分性 reason） | `This upgrade needs extra verification (3DS). Finish it on the portal.` → `recovery_url`。 |
| `status: 'payment_failed'`（无区分性 reason） | `Your card was declined. Update your payment method on the portal and try again.` → `recovery_url`。 |
| 其他任何情况 | `errorResult(r)`：`message \|\| error \|\| 'Something went wrong. Try again, or manage on the portal.'` |

**最终一致性 apply 轮询**（`ResultScreen`，仅在 `status: 'upgraded'` 之后）：每 2 秒
（`UPGRADE_CONFIRM_INTERVAL_MS`）轮询一次 `billing`/订阅状态，最多 15 次尝试
（`UPGRADE_CONFIRM_ATTEMPTS`，即约 30 秒），直到 `current.tier_id` 翻转为目标值。等待期间界面显示
`Applying…`；若在预算内始终未翻转，则显示 `Still applying` /
`Your upgrade succeeded and is still applying — refresh in a moment.`——绝不会仅因为 NAS 尚未同步完成，就重新把升级报告为失败。

**Step-up 被拒时的文案**（`stepUpDenialResult`，订阅流程）：

| `error` | 文案 |
|---|---|
| `session_revoked` | `Your session expired — run /portal to log in again, then retry the change.` |
| `remote_spending_revoked` | `{message}`，或 `Remote spending was stopped for this terminal — reconnect from the portal, then retry.` |
| `rate_limited` | `Too many attempts — wait a moment, then try again.` |
| 其他/未知 | `{message}`，或 `Remote Spending was not allowed — someone with billing permissions (owner, admin, or finance admin) must approve it. You can also make this change on the portal.` |

在一次授权后重放期间，若再次遇到**重复**作用域拒绝，绝不会重新进入 step-up
界面（此时已挂载在该界面——再次打补丁会让其卡死）；`allowStepUp=false`
转而抛出一个终止性结果：`Remote Spending still isn’t active for this terminal — the authorization didn’t take. Retry, or make this change on the portal.`

## 文本模式（CLI）与 TUI 一致

`cli.py` 的 `_show_billing` / `_billing_overview` 和 `_show_subscription` / `_subscription_overview` 渲染相同的状态结构（余额标题、双横条美元用量、"自动充值"行、"卡片"行、"每月上限"），并遵循同样的"登录登出/Portal 出问题时就放行（fail-open），绝不崩溃"的设计纪律。CLI 的 `/subscription` 在交互式环境下为付费的 admin/owner 提供 完整的**终端内变更流程**（档位选择器 → 预览 → 确认 → 应用，与 TUI 覆盖层的能力对等）；成员和非交互式环境则回退到 `_billing_portal_hint` 中跳转 `subscription_manage_url` 的深链接。`/topup` 的交互式模态框（prompt_toolkit）以相同方式对应 TUI 覆盖层，而非交互式场景则回退到相同的文本 + portal 链接渲染，绝不主动发起提示。

| CLI 表面 / 状态 | 行为（与 TUI / desktop 一致） |
| --- | --- |
| `/subscription` 在 **Free** 档 + admin/owner + 交互式 | `_subscription_free_catalog` 从与 TUI 使用的同一份 `tiers[]` 数据打印套餐目录 —— 每个已启用的付费档一行，最便宜的在前，格式为 `name · $/mo · $credits/mo`（月度 credits 以美元计 → 写作 `$22 credits/mo`，绝不写裸露的数字）。选择某一编号会打开 `/manage-subscription` 深链接，并追加 `plan=<tier_id>`，使 portal 预选中该档位。开启新订阅需要新卡片，因此唯一的操作是跳转 portal（终端不在此处收款）。 |
| 任意由 CLI 构造的 manage/subscribe URL | `subscription_manage_url(state, tier_id=…)` **仅在选择了档位时**才追加 `plan=<tier_id>`（使用稳定的 `tiers[]` id，绝不使用名称/slug）。Portal 会在服务端校验它，并忽略未知档位，因此 CLI 在用户选择时不加条件地追加该参数，与 TUI 的 `?plan=` 保持一致。`org_id` 排在前，`plan` 排在后。 |
| CLI 中的**降级** | 常规变更仍然在**本地 / 应用内**处理（通过 `put_subscription_pending_change` 免费调度）。被阻断的降级仍可能打印通用管理 URL，但绝不会携带 `plan=<tier_id>` —— 选中档位的深链接只保留给新订阅和升级。 |
| `/topup` 概览的操作文案 | 把一次性充值同自动补充区分，第一句就点出各自的差异：`Add funds now — a single charge, added to your balance today.`（立即充值 —— 一次性支付，今天加入到你的余额）对 `Refill when low — charges $X automatically when your balance falls below $Y.`（余额不足时补充 —— 当余额低于 $Y 时自动扣除 $X）。"(credits" 一词不出现在仅用美元的 `/topup` 表面 —— "Add funds now" 在不使用该词的情况下表达了一次性的含义）。当自动补充关闭时，自动补充那一行不写具体金额。 |

## 后向兼容

任何不在上表中的 `error`/`status`/`reason` 代码都会命中 `renderBillingError`（§2）或 `errorResult` / `upgradeResult` 的兜底分支（§4）：它们仍会渲染服务器自身给的 `message`（绝不为空，绝不崩溃），只是没有定制文案和带类型的恢复操作入口。NAS W3 引入的卡片健康状态码（`card_paused`、`card_expired`、`card_mismatch`）此处尚未强化类型化处理 —— 在客户端更新添加显式分支之前，它们会以未知代码返回，走这条默认路径。
