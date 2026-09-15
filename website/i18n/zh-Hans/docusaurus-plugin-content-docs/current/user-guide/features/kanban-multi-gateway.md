---
title: "Kanban 多网关部署"
description: "在多个按配置档划分的网关上运行同一块看板：单一调度器，配置档自有投递"
---

# 多网关部署

Hermes 支持多个网关进程并发运行——每个配置档一个（default、writer、admin、coder、researcher）。每个网关都建立自己到平台 API 的连接，并为其配置档的订阅者投递消息。

任务订阅也涵盖评审反馈。`changes_requested` 评审事件会作为可执行的 review-BLOCK 通知投递。使用 `notify+wake` 的订阅还会额外唤醒确切的原始聊天/话题/会话，以便控制器检查已有的卡片和当前运行；`notify` 仍然仅被动，`wake` 仍然仅唤醒。评审反馈绝不会创建、解除阻塞、重新排队或以其他方式改动任务。

## 单一调度器姿态

只有一个网关拥有 kanban 调度器。拥有方网关保持 `kanban.dispatch_in_gateway: true`（默认值）；其他每个网关都将其设为 `false`。

**为什么这很重要：** 调度是单属主的，这样多个网关就不会竞相启动同一份工作。通知投递则由配置档自有：每个网关只轮询它所承载平台适配器的配置档的订阅。原子事件认领可防止跨 watcher 进程的重复投递。

## 配置

在拥有调度权的网关上（通常是 `default` 配置档），无需改动。在其他每个配置档网关上，向 `~/.hermes/config.yaml` 添加：

```yaml
kanban:
  dispatch_in_gateway: false
```

或设置环境变量：`HERMES_KANBAN_DISPATCH_IN_GATEWAY=false`

## 每个网关做什么

| 网关角色 | dispatch_in_gateway | 是否打开已订阅的看板数据库？ | 调度器 | 通知器 |
|---|---|---|---|---|
| default（已确认的调度锁拥有者） | true（默认） | 是 | 是 | 自有配置档 + 旧的未标记订阅 |
| writer、admin、coder 等 | false | 是，当该配置档有订阅时 | 否 | 该网关自有的配置档 |

非调度网关仍会为其自己的平台适配器（Telegram、Discord 等）投递消息。它们不调度任务，并且会跳过那些没有由其配置档拥有的订阅的看板。
