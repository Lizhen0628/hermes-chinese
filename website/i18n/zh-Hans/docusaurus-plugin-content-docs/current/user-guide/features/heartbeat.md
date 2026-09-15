---
sidebar_position: 17
title: "会话心跳"
description: "一条循环提示，每当当前会话空闲时便会重新进入 —— /heartbeat every 10m Check the deployment."
---

# 会话心跳（`/heartbeat`）

`/heartbeat` 为**当前会话**设定一条循环指令。每当会话空闲且间隔时间已过，该提示便会作为一条普通用户消息触发 —— 同一对话、同一上下文、同一提示缓存。

```
/heartbeat every 10m Check the deployment and report meaningful changes
```

灵感来自 Prime-Agent 的 `/heartbeat`。Hermes 的改编版保持了严格的消息流不变量：心跳仅在轮次之间注入（绝不在运行中途），且以普通的用户角色消息形式注入。

## 心跳 vs 定时任务：我该用哪个？

它们看起来相似，但用于不同的场景：

| | `/heartbeat` | [`hermes cron`](./cron) |
|---|---|---|
| 运行于 | **此对话** —— 完整上下文、对讨论的记忆 | 每次触发都使用全新的隔离会话 |
| 进程重启后是否存活 | 状态存活（SessionDB）；网关接管的会话在重启后自动恢复 | 是 —— 完全持久化的调度器 |
| 数量 | 每个会话一个 | 任务数无限制 |
| 最适合 | “我们在干活时*在这个对话里*盯着 X” | 常驻任务、报告、看门狗、投递 |

经验法则：如果这条循环提示需要对话的上下文，使用 `/heartbeat`。如果是自成一体的任务，使用 cron。

## 命令

| 命令 | 作用 |
|---|---|
| `/heartbeat every <interval> <prompt>` | 设置（或替换）会话的心跳。间隔：`90s`、`10m`、`2h`、`1d`（最小 60s）。 |
| `/heartbeat` 或 `/heartbeat status` | 显示心跳、其间隔以及距下次触发的时间。 |
| `/heartbeat pause` | 停止触发而不清除。 |
| `/heartbeat resume` | 恢复（重新锚定计时器 —— 不会立刻触发过期的心跳）。 |
| `/heartbeat clear` | 移除心跳。 |

`/hb` 是别名。可用于 CLI、TUI / Desktop 应用，以及网关平台（在 Slack 上，使用 `/hermes heartbeat …`）。

## 行为细节

- **仅在空闲时触发。** 心跳绝不会打断正在进行的轮次。如果触发时机到来时代理忙碌，它会在下一次空闲轮询时触发。在网关中，被接管的空闲会话会主动唤醒；无需新的入站消息。
- **错过的触发会合并。** 如果会话在若干个间隔期间一直忙碌（或进程未运行），你只会收到**一次**心跳轮次，而非积压的一堆。计时器在每次触发时都会重新锚定。
- **用户消息优先。** 排队的用户消息始终优先；心跳会等待输入队列排空。
- **缓存安全。** 注入的提示是一条普通的用户消息。不改动系统提示，不改变工具集。
- **网关恢复。** 启动时使用当前持久化的对话和会话线程路由，在所属配置档中恢复活跃的心跳。每次轮询都会在临时存储故障或适配器停机后重试恢复；已暂停和已清除的心跳以及已挂起的对话不会重新启动。无需新的聊天消息。
- **持久化与对话边界。** 状态存储于 `SessionDB.state_meta`，以 `heartbeat:<session_id>` 为键，并跟随上下文压缩的会话轮换。在消息网关中，通过重置、切换或挂起离开对话会清除其心跳；恢复该已归档的对话不会使其复活。触发需要所属进程（CLI 会话或网关）正在运行。一个已被放行的网关触发会在会话解析后、代理执行前再次检查：它可以跟随压缩产生的子会话，但不能将其旧指令带入已重置或已切换的对话。
- **执行计数。** 网关在适配器放行时为到期的触发预留次数。如果该确切的尝试在进入代理运行器之前结束（包括取消，或路由、授权、紧急停止或准备阶段的拒绝），则会退还该触发次数，除非此后调度已发生变化。一旦进入代理运行器，即使执行失败或被中断，该次触发仍计为已触发。此计数**并不**证明模型响应成功或外部投递成功；进程突然死亡可能会阻止退还回调。
- **防凭空造活护栏。** 注入的提示会告诉代理，当没有实质性变化时简短回复并停止，因此空闲的心跳不会生成无谓的忙活。

## 示例

```
You: /heartbeat every 15m Check whether the CI run for PR #1234 finished; summarize the result when it does

  ♥ Heartbeat set (every 15m): Check whether the CI run for PR #1234 finished; ...

[15 minutes of you working on other things in the same session]

Hermes: [Heartbeat — recurring instruction, fires every 15m]
  💻 gh pr checks 1234   (1.2s)
  CI is still running (14/37 checks complete). Nothing to report yet.
```

当答案不再变化时，用 `/heartbeat clear` 清除它 —— 或者让它继续守望。
