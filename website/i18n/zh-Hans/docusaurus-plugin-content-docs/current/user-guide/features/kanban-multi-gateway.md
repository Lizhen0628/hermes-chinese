---
title: "看板多网关部署"
description: "在多个按配置档划分的网关上运行同一块看板:单一调度器,配置档自主投递"
---

# 多网关部署

Hermes 支持多个网关进程并发运行——每个配置档一个
(default、writer、admin、coder、researcher)。每个网关都会建立自己的
平台 API 连接,并为其配置档的订阅者投递消息。

任务订阅同样涵盖评审反馈。`changes_requested` 评审
事件会作为可操作的 review-BLOCK 通知投递。使用
`notify+wake` 的订阅还会额外唤醒确切的来源聊天/线程/会话,
以便控制器检查现有卡片和当前运行;`notify` 仍然
仅为被动通知,`wake` 仍然仅负责唤醒。评审反馈绝不会创建、
解除阻塞、重新入队或以其他方式修改任务。

## 单一调度器姿态

只有一个网关拥有看板调度器。拥有者网关保留
`kanban.dispatch_in_gateway: true`(默认值);其他所有网关将其设为
`false`。

**为什么这很重要:** 调度是单一所有者的,这样多个网关就不会
争抢着生成同一份工作。通知投递则改为配置档自主:每个
网关只轮询其承载平台适配器的那些配置档的
订阅。原子事件领取可防止跨多个 watcher
进程的重复投递。

## 配置

在拥有调度权的网关(通常是 `default` 配置档)上,无需
更改。在其他所有配置档网关上,在 `~/.hermes/config.yaml` 中添加:

```yaml
kanban:
  dispatch_in_gateway: false
```

或设置环境变量: `HERMES_KANBAN_DISPATCH_IN_GATEWAY=false`

## 每个网关的职责

| 网关角色 | dispatch_in_gateway | 是否打开已订阅的看板数据库? | 调度器 | 通知器 |
|---|---|---|---|---|
| default(已确认的调度锁所有者) | true(默认) | 是 | 是 | 其拥有的配置档 + 旧版未标记的订阅 |
| writer、admin、coder 等 | false | 是,当该配置档有订阅时 | 否 | 该网关拥有的配置档 |

非调度网关仍会为其自身的平台适配器投递消息
(Telegram、Discord 等)。它们不调度任务,并且会跳过
那些没有由其配置档拥有的订阅的看板。
