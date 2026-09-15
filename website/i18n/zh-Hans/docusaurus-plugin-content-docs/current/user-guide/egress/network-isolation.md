---
title: "网络出口隔离（Docker）"
description: "划分 Docker 网络，使智能体沙箱只能访问允许列表中的主机"
---

# Docker 部署的网络出口隔离

在 Docker 中运行 Hermes 时，默认的 `network_mode: host` 会让智能体进程拥有不受限的外出网络访问权限。本指南介绍如何对流量进行分段，使智能体核心只能访问其所需的服务，同时阻止任意的外连连接。

这主要用于防御提示注入攻击——此类攻击会试图通过工具生成的 shell 命令中的 `curl`、`wget` 或原始 HTTP 请求来窃取数据。

## 威胁模型

Hermes [SECURITY.md](https://github.com/NousResearch/hermes-agent/blob/main/SECURITY.md) 第 2 节定义了信任模型。终端后端是主要的执行边界。然而，当以 `network_mode: host` 运行时，智能体执行的任何命令都可以访问网络上的任意端点，包括外部端点。

网络出口隔离增加了第二层防护：即使恶意命令在容器内执行，它也无法访问明确允许列表之外的任何端点。

## 架构

```
┌─────────────────────────────────────────────┐
│  Docker 网络：internal（无互联网）            │
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
│  Docker 网络：egress（可访问互联网）           │
│          │                                   │
│          ▼                                   │
│   ┌─────────────────┐                        │
│   │ egress-proxy     │──► 允许列表中的主机    │
│   │ (squid / envoy)  │                       │
│   └─────────────────┘                        │
└──────────────────────────────────────────────┘
```

两个 Docker 网络：

- **`internal`** — 无默认路由，无互联网访问。智能体、仪表盘和网关在此运行。
- **`egress`** — 可访问互联网。只有需要访问外部 API 的服务才连接到此网络。

网关服务是双宿主的（同时连接到两个网络），因此它可以接收来自 Telegram/Slack 等的入站消息，并将其转发给内部网络上的智能体。

## Compose 配置

用 `docker-compose.override.yml` 覆盖默认的 `docker-compose.yml`：

```yaml
# docker-compose.override.yml
# 生产部署的网络出口隔离。
#
# 用法：
#   HERMES_UID=$(id -u) HERMES_GID=$(id -g) docker compose up -d
#
# 此文件用隔离的 Docker 网络覆盖 network_mode: host。

networks:
  internal:
    driver: bridge
    internal: true          # 无默认路由，无互联网
  egress:
    driver: bridge

services:
  gateway:
    network_mode: ""        # 清除 host 模式默认值
    networks:
      - internal
      - egress              # 需要访问 Telegram、LLM API 的外连能力
    ports:
      - "127.0.0.1:9119:9119"   # 仪表盘代理，仅限 localhost

  dashboard:
    network_mode: ""
    networks:
      - internal            # 仅内部，无需出口
```

### 使用出口代理（推荐）

如需更严格的控制，可通过带有明确允许列表的 HTTP 代理路由所有外连流量：

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

`config/squid-allowlist.conf` 示例：

```
# 仅允许向这些主机发起 HTTPS CONNECT
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

请根据你的 LLM 服务商和消息平台调整允许列表。


## 验证配置

启动整栈后，验证隔离效果：

```bash
# 从智能体容器：应当失败（无出口）
docker compose exec gateway \
  curl -sf --max-time 5 https://example.com && echo "FAIL: egress not blocked" || echo "OK: egress blocked"

# 从智能体容器：应当成功（内部网络）
docker compose exec gateway \
  curl -sf --max-time 5 http://hermes-dashboard:9119/health && echo "OK: internal reachable" || echo "FAIL"

# 如使用出口代理：应当成功（已允许列表）
docker compose exec gateway \
  curl -sf --max-time 5 --proxy http://egress-proxy:3128 https://api.openai.com/v1/models && echo "OK" || echo "FAIL"
```

## 局限性

- **DNS 解析：** 除非你还运行一个会拦截外部查询的本地 DNS 解析器，否则 `internal` 网络仍可解析外部 DNS 名称。对大多数威胁模型来说这可以接受，因为仅靠 DNS 解析无法窃取有意义的数据。

- **不能替代沙箱后端：** 本指南隔离的是智能体*容器*的网络。如果你使用默认的本地终端后端，工具命令会在同一个容器内执行。如需更强的隔离，请将网络分段与沙箱化的终端后端（Docker、Modal、Daytona）结合使用。

- **平台适配器需要出口：** 网关服务需要外连能力才能访问消息平台的 API。如果你添加新的平台适配器，请将其 API 端点加入代理允许列表。

## 相关内容

- [SECURITY.md](https://github.com/NousResearch/hermes-agent/blob/main/SECURITY.md) — Hermes 信任模型与漏洞报告
- [Docker](/user-guide/docker) — 在容器中运行 Hermes
- [出口代理](iron-proxy.md) — 用于沙箱的凭据注入防火墙
- [docker-compose.yml](https://github.com/NousResearch/hermes-agent/blob/main/docker-compose.yml) — 默认 compose 配置
