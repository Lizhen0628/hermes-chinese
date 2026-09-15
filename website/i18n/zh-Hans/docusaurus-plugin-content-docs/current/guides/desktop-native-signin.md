---
sidebar_position: 18
title: "桌面端原生登录（RFC 8252）"
description: "Hermes Desktop 应用如何使用系统浏览器和 PKCE 登录受控网关——无内嵌 webview，无会话 cookie"
---

# 桌面端原生登录（RFC 8252）

当 Hermes Desktop 应用连接到**受控网关**（位于 OAuth 服务商之后的托管或自托管仪表板）时，它可以通过两种方式登录：

1. **原生登录（RFC 8252）**——应用打开你的**真实系统浏览器**，在你已经信任的浏览器中完成授权，应用随后收到令牌，并将其以仅所有者可访问的文件形式存储在其用户数据目录中（可选使用操作系统钥匙串加密——设置 → 网关）。**无内嵌 webview，无浏览器会话 cookie。** 只要网关支持，这就是默认方式。
2. **内嵌登录（旧版回退）**——应用打开一个小的应用内浏览器窗口，并捕获网关的会话 cookie。当网关是未声明支持原生登录的旧版本时，会自动使用此方式。

你无需在这两者之间做选择——应用会检测网关支持什么，并选择最佳方案。本页解释其工作原理及原因。

## 为什么使用原生登录

在原生应用内嵌入浏览器进行 OAuth 存在众所周知的缺点：登录页面无法看到你现有的浏览器会话（因此你需要重新输入凭据并重新完成 MFA），密码管理器和通行密钥通常无法使用，而且应用依赖于从私有 webview 中读取会话 cookie。RFC 8252（"OAuth 2.0 for Native Apps"）是业界最佳实践，可避免所有这些问题：**在系统浏览器中完成授权，并将应用自己的令牌交给应用。**

具体到 Hermes，原生登录意味着：

- **无内嵌 webview。** 授权发生在 Safari / Chrome / Firefox / Edge——无论你使用哪个——你的登录状态、扩展和通行密钥都完好无损。
- **无会话 cookie。** 应用持有 OAuth **访问令牌**（短期）和**刷新令牌**，以仅所有者可访问的文件形式存储——当设置 → 网关中的可选钥匙串开关打开时，通过操作系统钥匙串（Electron `safeStorage`）进行静态加密。REST 调用和 WebSocket 票据使用 `Authorization: Bearer` 头进行认证，而非 cookie 罐。

## 工作原理

```
Desktop app                Gateway (/auth/native/*)          Nous Portal (IDP)
   │ 1. open loopback 127.0.0.1:<random port>
   │ 2. system browser ─►  /auth/native/authorize
   │    (PKCE challenge)    (starts the normal PKCE login) ─► /oauth/authorize
   │                        ◄──── code ──── /auth/callback ◄──┘
   │                        3. mint one-time gateway code
   │ ◄─ 302 127.0.0.1/cb?code=… ─┘
   │ 4. POST /auth/native/token (code + PKCE verifier)
   │ ◄─ 5. { access_token, refresh_token, expires_at } ───────┘
   │ 6. store in local token store; use Bearer for REST + WS tickets
```

网关**代理**了这个流程：它对*桌面应用*而言是授权服务器，对上游身份服务商（Nous Portal）而言是 OAuth 客户端。这是必需的，因为上游的 `client_id` 和允许的重定向 URI 绑定在网关自己的源上——桌面应用无法成为 Portal 的直接客户端。桌面端仍然获得完整的 RFC 8252 体验：它自己的 PKCE 对、它自己的环回重定向，以及它自己拥有的令牌。

**PKCE（RFC 7636）** 保护环回跳转：没有代码验证器，一次性网关代码就毫无用处，而代码验证器从不会离开应用。该代码是一次性且短时效的。

## 能力检测与回退

桌面端读取网关的公开 `/api/status` 端点，该端点声明一个 `auth_flows` 数组：

| `auth_flows` 值 | 含义 |
|--------------------|---------|
| `["cookie", "native_pkce"]` | 网关支持原生登录 → 应用使用它 |
| `["cookie"]` | 网关仅支持旧版流程 → 应用使用内嵌 webview |
| *（字段不存在）* | 较旧的网关 → 应用使用内嵌 webview |

如果声明了原生登录但因本地原因失败——例如安全工具阻止了环回监听器，或你关闭了浏览器标签页——应用会**自动回退到内嵌流程**，以便你仍然可以登录。

## 令牌生命周期

- **访问令牌**：短期（数分钟）。在每次 REST 调用以及签发 WebSocket 票据时作为 `Authorization: Bearer` 发送。
- **刷新令牌**：较长期、轮换式。当访问令牌接近过期时，应用调用 `/auth/native/refresh` 来轮换两个令牌，然后更新其令牌存储。
- **最终过期**：如果刷新令牌已失效（过期 / 被撤销 / 检测到重用），应用会清除其存储的令牌并提示重新登录。
- **退出登录**：清除该网关存储的原生令牌及任何旧版会话 cookie。

## 面向网关运维人员

原生登录在任何注册了交互式会话服务商的受控网关上自动可用。无需配置——`/auth/native/*` 路由和 `auth_flows` 声明是仪表板认证子系统的一部分。OAuth 服务商（例如内置的 **Nous** 服务商）代理上游 IDP 重定向；密码服务商（例如内置的 **basic-auth** 插件）则将系统浏览器引导到网关的 `/login` 凭据表单——这正是让操作系统密码管理器（macOS Passwords 等）能够自动填充表单的原因，这是任何内嵌桌面 webview 都无法提供的。仅令牌的凭据（例如 drain）不是交互式登录，不会声明 `native_pkce`。

相关端点（全部为公开、认证前的引导端点，与现有 `/auth/*` OAuth 路由相同）：

- `GET /auth/native/authorize` — 启动代理式 PKCE 登录
- `POST /auth/native/token` — 用环回代码 + 验证器换取令牌
- `POST /auth/native/refresh` — 使用应用的刷新令牌轮换令牌

## 另请参阅

- [通过 SSH / 远程主机使用 OAuth](./oauth-over-ssh.md) — 远程机器上服务商/MCP OAuth 的环回回调模式。
- [使用 Nous Portal 运行 Hermes](./run-hermes-with-nous-portal.md)
