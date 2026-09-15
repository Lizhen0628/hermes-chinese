---
title: "网络出口隔离（Docker）"
description: "对 Docker 网络进行分段，使智能体沙箱只能访问允许列表中的主机"
---

# Docker 部署的网络出口隔离

在 Docker 中运行 Hermes 时，默认的 `network_mode: host` 会为智能体进程提供不受限的出站网络访问权限。本指南展示如何对流量进行分段，使智能体核心只能访问其所需的服务，同时阻止任意的出站连接。

这主要是针对提示注入攻击的防御措施，此类攻击会尝试通过工具生成的 shell 命令中的 `curl`、`wget` 或原始 HTTP 来窃取数据。

## 威胁模型

Hermes 的 [SECURITY.md](https://github.com/NousResearch/hermes-agent/blob/main/SECURITY.md) §2 定义了信任模型。终端后端是主要的执行边界。然而，当使用 `network_mode: host` 运行时，智能体执行的任何命令都可以访问网络上的任何端点，包括外部端点。

网络出口隔离增加了第二层防护：即使恶意命令在容器内执行，它也无法访问明确允许列表之外的目标点。

## 架构

```
┌─────────────────────────────────────────────┐
│  Docker 网络：internal（无互联网）           │
│                                             │
│   ┌──────────────┐   ┌──────────────────┐   │
│   │ hermes-agent │   │ hermes-dashboard │   │
│   └──────┬───────┘   └────────┬─────────┘   │
│          │                    │              │
│          ▼                    │              │
│   ┌──────────────┐            │              │
│   │ hermes-gtw   │◄───────────┘              │
│   └──────┬───────┘                           │
│          │                                   │
└──────────┼───────────────────────────────────┘
           │
┌──────────┼───────────────────────────────────┐
│  Docker 网络：egress（可访问互联网）          │
│          │                                   │
│          ▼                                   │
│   ┌─────────────────┐                        │
│   │ egress-proxy     │──► 允许列表主机        │
│   │ (squid / envoy)  │                       │
│   └─────────────────┘                        │
└──────────────────────────────────────────────┘
```

两个 Docker 网络：

- **`internal`** —— 无默认路由，无互联网访问。智能体、dashboard 和网关在此运行。
- **`egress`** —— 可访问互联网。只有需要访问外部 API 的服务才连接到该网络。

网关服务是双宿主（同时连接到两个网络）的，以便它可以接收来自 Telegram/Slack 等的入站消息，并将其转发到内部网络上的智能体。

## Compose 配置

使用 `docker-compose.override.yml` 覆盖默认的 `docker-compose.yml`：

```yaml
# docker-compose.override.yml
# 用于生产部署的网络出口隔离。
#
# 用法：
#   HERMES_UID=$(id -u) HERMES_GID=$(id -g) docker compose up -d
#
# 这将用隔离的 Docker 网络覆盖 network_mode: host。

networks:
  internal:
    driver: bridge
    internal: true          # 无默认路由，无互联网
  egress:
    driver: bridge

services:
  gateway:
    network_mode: ""        # 清除 host 模式的默认设置
    networks:
      - internal
      - egress              # 需要用于 Telegram、LLM API 的出站访问
    ports:
      - "127.0.0.1:9119:9119"   # dashboard 代理，仅限本地

  dashboard:
    network_mode: ""
    networks:
      - internal            # 仅内部，无需出口
```

### 使用出口代理（推荐）

为了更严格的控制，通过具有显式允许列表的 HTTP 代理路由所有出站流量：

```yaml
# docker-compose.override.yml（带出口代理）

networks:
  internal:
    driver: bridge
    internal: true
  egress:
    driver: bridge

services:
  gateway:
    network_mode: ""
    networks:
      - internal
      - egress
    environment:
      - HTTP_PROXY=http://egress-proxy:3128
      - HTTPS_PROXY=http://egress-proxy:3128
      - NO_PROXY=hermes,hermes-dashboard,localhost

  dashboard:
    network_mode: ""
    networks:
      - internal

  egress-proxy:
    image: ubuntu/squid:6.10-24.04_edge
    networks:
      - egress
    volumes:
      - ./config/squid-allowlist.conf:/etc/squid/conf.d/allowlist.conf:ro
    restart: unless-stopped
```

示例 `config/squid-allowlist.conf`：

```
# 仅允许对这些主机进行 HTTPS CONNECT
acl allowed_hosts dstdomain api.openai.com
acl allowed_hosts dstdomain api.anthropic.com
acl allowed_hosts dstdomain openrouter.ai
acl allowed_hosts dstdomain generativelanguage.googleapis.com
acl allowed_hosts dstdomain api.telegram.org
acl allowed_hosts dstdomain api.github.com
acl allowed_hosts dstdomain discord.com

http_access allow CONNECT allowed_hosts
http_access deny all
```

根据你的 LLM 服务商和消息平台调整允许列表。

## 验证设置

启动技术栈后，验证隔离：

```bash
# 从智能体容器：这应当失败（无出口）
docker compose exec gateway \
  curl -sf --max-time 5 https://example.com && echo "FAIL: 出口未被阻止" || echo "OK: 出口已阻止"

# 从智能体容器：这应当成功（内部网络）
docker compose exec gateway \
  curl -sf --max-time 5 http://hermes-dashboard:9119/health && echo "OK: 内部可达" || echo "FAIL"

# 如果使用出口代理：这应当成功（在允许列表中）
docker compose exec gateway \
  curl -sf --max-time 5 --proxy http://egress-proxy:3128 https://api.openai.com/v1/models && echo "OK" || echo "FAIL"
```

## 限制

- **DNS 解析：** 除非你同时运行一个阻止外部查询的本地 DNS 解析器，否则 `internal` 网络仍能解析外部 DNS 名称。对大多数威胁模型而言这是可接受的，因为仅 DNS 解析本身并不会窃取有意义的数据。

- **不能替代沙箱后端：** 本指南隔离的是智能体*容器*的网络。如果你使用默认的本地终端后端，工具命令会在同一容器内执行。为了更强的隔离，请将网络分段与沙箱终端后端（Docker、Modal、Daytona）结合使用。

- **平台适配器需要出口：** 网关服务需要出站访问权限才能访问消息平台 API。如果你添加新的平台适配器，请将其 API 端点添加到代理允许列表中。

## 相关

- [SECURITY.md](https://github.com/NousResearch/hermes-agent/blob/main/SECURITY.md) —— Hermes 信任模型与漏洞报告
- [Docker](/user-guide/docker) —— 在容器中运行 Hermes
- [出口代理](iron-proxy.md) —— 用于沙箱的凭据注入防火墙
- [docker-compose.yml](https://github.com/NousResearch/hermes-agent/blob/main/docker-compose.yml) —— 默认 compose 配置
