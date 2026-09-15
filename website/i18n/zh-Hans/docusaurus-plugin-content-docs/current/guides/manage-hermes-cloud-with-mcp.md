---
sidebar_position: 16
title: "使用 MCP 管理 Hermes Cloud"
description: "将 Hermes Agent 连接到 Nous Portal MCP 服务器，让本地智能体可以通过对话方式列出、启动、停止和管理你的 Hermes Cloud 实例"
---

# 使用 MCP 管理 Hermes Cloud

[Hermes Cloud](https://portal.nousresearch.com/cloud) 为你运行托管的 Hermes Agent 实例。通常你会在 [Nous Portal](/integrations/nous-portal) 的 `/agents` 页面管理它们。本指南将你的**本地** Hermes Agent 连接到 Portal 的 MCP 服务器，让你只需开口询问就能管理这些云端实例——"列出我的云端智能体"、"重启那个已停止的"、"它现在花了我多少钱"——无需离开终端。

这是由 Nous Research 托管的标准 [MCP](/user-guide/features/mcp) 服务器，使用与 Portal 相同的 OAuth 登录进行鉴权。连接后，Hermes 将获得两个可代你调用的工具。

## 你能用它做什么

连接后，模型可以对你的 Hermes Cloud 组织调用以下操作：

| 你可以说…… | 底层调用 |
|----------|----------------|
| "列出我的云端智能体" | `agents`（列表） |
| "`<name>` 的状态如何？" | `agents`（获取/状态） |
| "这个实例大致花费多少？" | `agents`（cost_estimate） |
| "启动 / 停止 / 重启 `<name>`" | `agent`（start / stop / restart） |
| "创建一个名为 `<name>` 的新实例" | `agent`（create） |
| "销毁 `<name>`" | `agent`（destroy） |
| "更新 `<name>` 的环境变量 / 镜像" | `agent`（update_env / update_image） |

每次调用都以**你的**组织身份和 Portal 身份运行，并且每次调用都会重新校验成员资格——该连接只能操作你原本就能在 Web UI 中控制的实例。

## 前置条件

- 一个拥有 [Hermes Cloud](https://portal.nousresearch.com/cloud) 访问权限的 [Nous Portal](/integrations/nous-portal) 账户（至少有一个实例，或具备创建实例的权限）。
- 已安装 MCP 支持。如果你使用了标准安装脚本，它已经内置；否则：

  ```bash
  cd ~/.hermes/hermes-agent
  uv pip install -e ".[mcp]"
  ```

你**不需要**单独的 API 密钥或客户端密钥——该服务器使用 PKCE 方式的 OAuth，登录是一次浏览器往返流程。

## 第 1 步：添加服务器

```bash
hermes mcp add --url https://portal.nousresearch.com/mcp --auth oauth hermes-cloud
```

`--auth oauth` 告诉 Hermes 这是一个受 OAuth 保护的 HTTP 服务器。首次连接时 Hermes 会：

1. 自动发现服务器的 OAuth 端点（RFC 9728 / 8414 元数据）。
2. 将自己注册为客户端（RFC 7591 动态客户端注册）——无需复制任何密钥。
3. 打开浏览器跳转到 Portal 进行登录和授权。
4. 将得到的令牌存储在 `~/.hermes/mcp-tokens/` 下并复用（自动刷新）。

### 选择组织

如果你的 Portal 账户属于**多个组织**，浏览器会在授权期间显示**组织选择器**——选择此连接要管理的组织。该选择在浏览器中一次性完成；无需在命令行上传递任何参数。单组织账户会跳过此步骤并自动绑定。

如果你需要将连接指向另一个组织，移除并重新添加该服务器（`hermes mcp remove hermes-cloud`，然后再次执行 `add` 命令），并在浏览器中选择另一个组织。

## 第 2 步：验证连接

```bash
hermes mcp test hermes-cloud
```

然后启动（或重新加载）一个会话：

```bash
hermes chat
```

```text
/reload-mcp
```

问一个只读问题以确认工具已生效：

```text
列出我的 Hermes Cloud 智能体及其当前状态。
```

你应该会得到与 Portal `/agents` 页面相同的实例列表。

## 第 3 步：使用它

只读问题始终是安全的：

```text
我的哪些云端智能体正在运行，它们各自大致花费多少？
```

生命周期操作直接对应普通请求：

```text
重启名为 research-bot 的实例。
```

```text
创建一个名为 scratch 的新 Hermes Cloud 实例，然后在它就绪时告诉我。
```

Hermes 会报告每个工具返回的内容——实例列表、新状态、已创建实例的详细信息——以便你确认操作已生效。

## 配置

执行 `hermes mcp add` 之后，该服务器会出现在 `~/.hermes/config.yaml` 中：

```yaml
mcp_servers:
  hermes-cloud:
    url: "https://portal.nousresearch.com/mcp"
    auth: oauth
```

`config.yaml` 中不会包含任何凭据——OAuth 令牌单独保存在 `~/.hermes/mcp-tokens/` 下，就像 Portal 的刷新令牌不会写入你的配置一样。

### 限制工具范围

该服务器同时暴露读操作（`agents`）和修改操作（`agent`）工具。如果你希望该连接是**只读**的——只能列出和查看，绝不启动/停止/创建/销毁——可以将它限制为 `agents` 工具：

```yaml
mcp_servers:
  hermes-cloud:
    url: "https://portal.nousresearch.com/mcp"
    auth: oauth
    tools:
      include: [agents]
```

更改配置后运行 `/reload-mcp`。完整过滤模型（`include`/`exclude`、`prompts`、`resources`）参见[在 Hermes 中使用 MCP](/guides/use-mcp-with-hermes)。

## 故障排除

### 浏览器显示组织选择器，我不确定该选哪个

你属于多个 Portal 组织。选择你希望此连接管理的 Hermes Cloud 实例所属的组织。如果不确定，就是拥有你在 Portal `/agents` 页面看到的那些实例的组织。你可以稍后通过移除并重新添加服务器来重新选择。

### 连接时出现 "invalid_client" 或 "unknown client"

已存储的客户端注册不再匹配服务器（例如，你之前连接的是不同的环境）。清除该服务器缓存的 OAuth 状态并重新添加：

```bash
hermes mcp remove hermes-cloud
rm -f ~/.hermes/mcp-tokens/hermes-cloud.*
hermes mcp add --url https://portal.nousresearch.com/mcp --auth oauth hermes-cloud
```

### 添加服务器后工具没有出现

在会话中重新加载 MCP 并重新检查：

```text
/reload-mcp
```

```text
告诉我当前有哪些由 MCP 支持的工具可用。
```

如果仍然缺失，运行 `hermes mcp test hermes-cloud` 直接查看连接错误。

### 它要求我再次登录

OAuth 令牌会自动刷新，但如果 Portal 使你的会话失效（密码更改、撤销、过期），下一次调用会要求你重新授权。重新运行 `hermes mcp add` 命令——浏览器流程会重新生成一个令牌。

### 无头环境 / SSH / 远程主机

OAuth 浏览器回调运行在 Hermes 所在的机器上。在远程主机上，通过 SSH 转发回环端口——与其他任何 OAuth 登录的模式相同。参见 [SSH / 远程主机上的 OAuth](/guides/oauth-over-ssh)。

## 另请参阅

- **[Nous Portal](/integrations/nous-portal)** —— 使用同一登录的订阅、模型和 Tool Gateway
- **[在 Hermes 中使用 MCP](/guides/use-mcp-with-hermes)** —— 连接和过滤 MCP 服务器的通用方法
- **[MCP 功能概览](/user-guide/features/mcp)** —— MCP 是什么以及 Hermes 如何使用它
- **[MCP 配置参考](/reference/mcp-config-reference)** —— 每个 `mcp_servers` 字段，包括 `auth: oauth`
- **[SSH 上的 OAuth](/guides/oauth-over-ssh)** —— 从远程或仅浏览器环境登录
