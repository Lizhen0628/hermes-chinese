---
title: "看板多网关部署"
description: "在多个按配置档划分的网关上运行同一个看板：单一调度器，配置档自有的投递"
---

# 多网关部署

Hermes 支持多个网关进程并发运行——每个配置档一个
（default、writer、admin、coder、researcher）。每个网关打开自己到平台 API 的连接，
并为其配置档的订阅者投递消息。

任务订阅同样涵盖评审反馈。`changes_requested` 评审
事件会被投递为可操作的 review-BLOCK 通知。使用 `notify+wake` 的订阅
还会唤醒准确的原始聊天/线程/会话，
以便控制方检查现有卡片和当前运行；`notify` 保持仅被动，
`wake` 保持仅唤醒。评审反馈从不创建、
解除阻塞、重新排队或以其他方式变更任务。

## 单一调度器姿态

只有一个网关拥有看板调度器。拥有的网关保持
`kanban.dispatch_in_gateway: true`（默认值）；其他所有网关将其
设为 `false`。

**为什么这很重要：** 调度是单拥有者的，因此多个网关不会
争相启动同一项工作。通知投递则由配置档拥有：
每个网关只轮询其托管平台适配器的配置档的订阅。
原子事件认领可防止跨监听进程的重复投递。

## 配置

在拥有调度的网关上（通常是 `default` 配置档），无需更改。
在其他所有配置档网关上，向 `~/.hermes/config.yaml` 添加：

```yaml
kanban:
  dispatch_in_gateway: false
```

或设置环境变量：`HERMES_KANBAN_DISPATCH_IN_GATEWAY=false`

## 每个网关做什么

| 网关角色 | dispatch_in_gateway | 是否打开已订阅的看板数据库？ | 调度器 | 通知器 |
|---|---|---|---|---|
| default（已确认的调度锁拥有者） | true（默认） | 是 | 是 | 拥有的配置档 + 遗留无标记订阅 |
| writer、admin、coder 等 | false | 当配置档有订阅时为是 | 否 | 该网关拥有的配置档 |

非调度网关仍然为其自己的平台适配器投递消息
（Telegram、Discord 等）。它们不调度任务，并跳过
那些没有由其配置档拥有的订阅的看板。
