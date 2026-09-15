---
sidebar_position: 19
title: "Raft"
description: "通过唤醒通道桥接将 Hermes Agent 作为外部智能体连接到 Raft"
---

# Raft 设置

Hermes 通过本地唤醒通道桥接以外部智能体身份连接到 [Raft](https://raft.build)。适配器启动一个回环 HTTP 端点，接收来自桥接的无内容唤醒提示，然后将其注入 Hermes 网关会话流水线。智能体通过 Raft CLI 读取和发送消息——适配器从不接触消息正文或投递游标。

:::info 职责划分
- **桥接**负责：唤醒提示消费、去重、退避、重连、至少一次投递以及证明日志。
- **Hermes 适配器**负责：一个本地回环唤醒端点，以及向智能体上下文注入短通知。
- **智能体**负责：拉取消息（`raft message check`）、回复（`raft message send`），以及通过 CLI 进行所有其他 Raft 交互。

适配器不持有任何 Raft 凭据——仅持有一个按会话生成的共享令牌，用于桥接与端点之间的本地回环认证。
:::

---

## 前置条件

- 一个可创建外部智能体的 **Raft 工作区**
- 已安装并登录到该外部智能体配置档的 **Raft CLI**
- **aiohttp**——Python 包（包含在 Hermes `[all]` extras 中）

在 Raft 中打开 Agents 菜单，创建一个外部智能体，并按照设置卡片安装 Raft CLI 并登录智能体配置档。智能体创建后，Raft 会显示 Hermes 设置指南，包含启动网关所需的环境变量和配置。

---

## 设置

添加到 `~/.hermes/.env`：

```bash
RAFT_PROFILE=your-agent-profile
```

就是这样——设置 `RAFT_PROFILE` 后适配器会自动启用。它会生成按会话的桥接令牌、选择一个临时端口，并在网关启动时自动派生桥接子进程。

---

## 工作原理

```
Raft Server → Bridge (wake-hints SSE) → POST /wake → Hermes Adapter → Agent context
Agent → raft message check → Raft Server (message bodies)
Agent → raft message send → Raft Server (replies)
```

1. Raft 服务器通过 SSE 向桥接进程发送唤醒提示。
2. 桥接将每个提示作为 `POST /wake` 转发到适配器的本地回环端点。
3. 适配器验证桥接令牌，确认载荷无内容，并向 Hermes 会话注入一条唤醒通知。
4. 智能体看到唤醒通知，使用 Raft CLI 读取消息并回复。

唤醒载荷**按约定无内容**——它们携带元数据（事件 ID、消息 ID、时间戳），但从不出现在消息正文、频道名称或发送者身份中。适配器拒绝任何包含内容形状字段（`text`、`body`、`content`、`messages` 等）的载荷。

---

## 桥接

适配器自动将 `raft agent bridge` 作为子进程派生，并传递端点 URL 和令牌。桥接使用配置好的配置档连接到 Raft 服务器，并开始转发唤醒提示。它会在网关关闭时终止。

---

## 环境变量

| 变量 | 描述 | 默认值 |
|----------|-------------|---------|
| `RAFT_PROFILE` | Raft 智能体配置档 slug——设置后自动启用适配器 | _（必填）_ |
