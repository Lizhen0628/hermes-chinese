---
title: "Mcp Oauth Remote Gateway — 无头网关上的远程 MCP 服务器手动 OAuth"
sidebar_label: "Mcp Oauth Remote Gateway"
description: "无头网关上的远程 MCP 服务器手动 OAuth"
---

{/* 本页面由 website/scripts/generate-skill-docs.py 从技能的 SKILL.md 自动生成。请编辑源 SKILL.md，而不是此页面。 */}

# Mcp Oauth Remote Gateway

无头网关上的远程 MCP 服务器手动 OAuth。

## 技能元数据

| | |
|---|---|
| 来源 | 可选 — 使用 `hermes skills install official/mcp/mcp-oauth-remote-gateway` 安装 |
| 路径 | `optional-skills/mcp\mcp-oauth-remote-gateway` |
| 版本 | `1.0.0` |
| 作者 | Ben Barclay (benbarclay), Hermes Agent |
| 许可证 | MIT |
| 平台 | linux, macos |
| 标签 | `MCP`、`OAuth`、`PKCE`、`Remote-Deployment` |
| 相关技能 | [`hermes-agent`](/docs/user-guide/skills/bundled/autonomous-ai-agents/autonomous-ai-agents-hermes-agent)、[`mcporter`](/docs/user-guide/skills/optional/mcp/mcp-mcporter)、[`fastmcp`](/docs/user-guide/skills/optional/mcp/mcp-fastmcp) |

## 参考：完整 SKILL.md

:::info
以下是 Hermes 在此技能被触发时加载的完整技能定义。这就是技能激活时智能体作为指令看到的内容。
:::

# 远程 Hermes 网关上的 MCP OAuth

## 概述

Hermes 内置的 MCP OAuth 客户端会在 Hermes 进程内于 `127.0.0.1:<port>`
上运行一次性 HTTP 监听器，并将该回环地址注册为 OAuth
`redirect_uri`。对于用户本机上的本地 CLI，这完全可行。
但当 Hermes 作为远程网关（容器、VPS、消息机器人）运行时，这就完全失效了，
因为用户的浏览器会将 `127.0.0.1` 解析为用户自己的
笔记本电脑，而不是远程容器 — 因此授权码永远无法到达 Hermes。

此技能手动完成 OAuth 流程，并将生成的令牌写入 Hermes
令牌存储所期望的确切文件中，这样后续的 `/reload-mcp` 就会找到
缓存的令牌，从而完全跳过浏览器流程。

## 何时使用

当**以下所有**条件都为真时，使用此技能：

1. 用户想要添加一个需要 OAuth（而不是静态 Bearer 令牌）的远程 HTTP MCP 服务器。
2. Hermes 作为**远程网关**运行（容器、VPS、Docker、托管服务）— 而不是用户笔记本电脑上的本地 CLI。
3. 服务器支持 OAuth 2.1 配合 PKCE 以及 RFC 7591 动态客户端注册（大多数现代 MCP 服务器都支持 — Better Stack、Linear、Cloudflare、Datadog 等）。如果不支持 DCR（GitHub 是显著的例外），则此技能不适用 — 请改用预注册的 OAuth App 或个人访问令牌。

不要将其用于：
- **本地 CLI Hermes** — 只需在 `mcp_servers.<name>` 中设置 `auth: oauth` 并执行 `/reload-mcp`。内置流程会打开浏览器并在 localhost 上捕获回调。完全可行。
- **接受静态 Bearer 令牌（API 密钥）的服务器** — 当用户愿意时，始终优先使用 `headers.Authorization: "Bearer <token>"`。更简单，无需刷新流程。
- **GitHub Copilot MCP**（`api.githubcopilot.com/mcp/`） — GitHub 不开放 DCR。请使用 PAT 或预注册的 OAuth App（参见陷阱 12）。

## 为什么内置 OAuth 流程在远程网关上会失败

Hermes 原生的 MCP OAuth 客户端（`tools/mcp_oauth.py`）：

1. 选择一个空闲的本地端口 `P`。
2. 向 AS 注册一个动态 OAuth 客户端，发送 `redirect_uri = http://127.0.0.1:P/callback`。
3. 在 **Hermes 进程内部**的 `127.0.0.1:P` 上启动一个 HTTP 服务器。
4. 打印授权 URL 并在其本地端点等待授权码。

当 Hermes 远程运行时，`redirect_uri` 中的 `127.0.0.1` 是远程
容器的回环地址，而不是用户本机的。授权后，用户的浏览器 302
重定向到 `http://127.0.0.1:P/callback?code=...`，该地址会解析到用户自己的
笔记本电脑并连接失败。回调永远无法到达 Hermes 进程，
流程超时，`/reload-mcp` 返回 "No MCP tools available" 且不含任何细节。

需要识别的症状：hermes 用户下的 `[xdg-open] <defunct>` 进程、
空的或缺失的令牌目录（`$HERMES_HOME/mcp-tokens/`），以及
重新加载后在 `change_detail` 中没有出现任何 "Added/Reconnected: X" 行的响应。

## 廉价的首选回退：内置流程自带的逃生舱

在做任何手动令牌操作之前，先检查内置流程的回退是否已经覆盖了该部署场景。当 Hermes 检测到远程会话时，它会在授权 URL 旁边打印两个选项（`tools/mcp_oauth.py`）：

1. **粘贴回传（Paste-back）** — 在交互式 TTY 上，stdin 读取器与 HTTP 监听器竞争。用户授权后，浏览器无法连接到 `127.0.0.1:<port>`，于是他们把地址栏的完整 URL（`?code=...&state=...`）粘贴回提示符。适用于通过 SSH 登入的 CLI 会话。
2. **SSH 端口转发** — `ssh -N -L <port>:127.0.0.1:<port> <user>@<host>` 可让重定向正常到达远程监听器。

两者都要求有通向 Hermes 主机的交互式终端。本技能接下来的内容是针对**没有交互式 TTY** 的场景——即 Hermes 纯以消息网关/机器人形式运行，`/reload-mcp` 触发该流程时提示符前无人。

## 首选的前门：Hermes 仪表盘（在做手动令牌操作**之前**先试这个）

远程 Hermes 网关通常还会作为**独立**进程运行 **dashboard** Web UI（例如 `hermes dashboard --host 0.0.0.0 --port <port>`；可用 `ps aux | grep 'hermes dashboard'` 检查）。它提供一个连接器/MCP 控制台——诸如 `/api/mcp/servers`、`/api/mcp/status` 和 `/connectors` 之类的端点（均需登录；无 cookie 的 curl 返回 401/302 即可确认它们存在）。

**为什么仪表盘能解决核心问题：** 当用户*在自己浏览器里*通过仪表盘驱动 OAuth 时，重定向会落到仪表盘能够捕获的上下文中——从而绕过了破坏 CLI/手动流程的 `127.0.0.1` 回调失败。因此，“在远程网关上添加或重新认证 OAuth MCP server”的正确升级顺序是：

1. **在用户浏览器中使用仪表盘** —— 这是预期的前门。添加 server、执行 OAuth、重载，全程以用户身份认证。无需复制粘贴回调的繁琐流程，无需手写令牌文件。
2. **手动令牌操作（本技能的其余内容）** —— 当没有通向仪表盘的浏览器会话（纯聊天/无头环境）时的回退方案。

**找到仪表盘的公网 URL。** 仪表盘内部绑定到 `0.0.0.0:<port>`，但用户需要的是可外部访问的 URL。大多数部署平台会将其注入环境变量——直接 grep 出来，而不是让用户自己去翻找：

```bash
env | grep -iE "HERMES_DASHBOARD_PUBLIC_URL|RAILWAY_PUBLIC_DOMAIN|RAILWAY_STATIC_URL|RAILWAY_SERVICE_.*_URL|PUBLIC_URL|BASE_URL|DOMAIN" \
  | sed -E 's/(TOKEN|SECRET|KEY|PASSWORD)=.*/\1=***REDACTED***/I'
```

当 `HERMES_DASHBOARD_PUBLIC_URL` 存在时，以其为准。在 Railway 上还要检查 `RAILWAY_PUBLIC_DOMAIN` / `RAILWAY_STATIC_URL`（即 `*.up.railway.app` 主机）以及 `RAILWAY_SERVICE_*_URL` 变量，后者有时带有更友好的自定义域名。把完整的 `https://` URL 交给用户，并引导他们到 Connectors/MCP 区域。**务必** 通过上面的 `sed` 做脱敏处理——这些环境变量 grep 与 `*_TOKEN`/`*_SECRET` 变量挨在一起。

**仪表盘**不**能修复的内容（仍需主机侧 / shell）：** 需要 shell 认证状态的 stdio server（例如某个 CLI `login` 命令，其凭据可能无法在重启后持久化），以及任何从 `$HERMES_HOME/.env` 读取凭据的情况。无论怎样，这些都不在仪表盘的能力范围内。

## 变通方案

手动完成 OAuth 流程，然后把得到的令牌写入 Hermes 的 `HermesTokenStorage` 本会写入的确切文件中，这样 `/reload-mcp` 时 Hermes 就能找到缓存的令牌并完全跳过浏览器流程。

在网关主机上通过 `terminal` 工具运行下面的 shell 命令，并通过 `execute_code` 或一次 `terminal` 的 python3 调用执行 Python 步骤（PKCE 生成、令牌交换、文件写入）——文件写入必须与令牌交换在**同一个**代码块中完成（见陷阱 16）。

### 1. 确认这是远程网关

```bash
env | grep -iE "HERMES|RAILWAY|CONTAINER"
echo "$DISPLAY $WAYLAND_DISPLAY $SSH_CLIENT"
```

无显示 + 有远程标识 = 远程网关。`tools/mcp_oauth.py::_can_open_browser()` 使用相同的这些环境变量，所以如果 Hermes 自己的自动检测判定为“无头”，那么内置流程就不会生效。

### 2. 找到 HERMES_HOME 与配置路径

```bash
HERMES_HOME=$(python3 -c 'from hermes_constants import get_hermes_home; print(get_hermes_home())')
echo "config: $HERMES_HOME/config.yaml"
echo "tokens: $HERMES_HOME/mcp-tokens/"
```

### 3. 从 MCP 服务器发现 OAuth 元数据

MCP 服务器通过 RFC 9728（OAuth 2.0 受保护资源元数据）通告其 OAuth 设置。401 响应中的 `WWW-Authenticate` 头会告诉你去哪里查找：

```bash
curl -sI https://mcp.example.com | grep -i www-authenticate
# → Bearer realm="mcp", resource_metadata="https://mcp.example.com/.well-known/oauth-protected-resource"
```

**并非每个服务器都会返回 `WWW-Authenticate`。** 有些会直接返回一个裸的 `{"errors":["Unauthorized"]}` 401，不带任何认证发现提示。遇到这种情况时，直接探测 well-known 路径：

```bash
for p in \
  /.well-known/oauth-protected-resource \
  /.well-known/oauth-authorization-server \
  /.well-known/openid-configuration ; do
  echo "=== $p ==="
  curl -s -A "python-httpx/0.27" "https://mcp.example.com$p" | head -c 400; echo
done
```

获取资源元数据以获得 `authorization_servers`，然后获取 AS 的 `/.well-known/oauth-authorization-server` 以获得 `authorization_endpoint`、`token_endpoint` 和 `registration_endpoint`。

陷阱：许多服务器位于 Cloudflare 之后，会对裸 `urllib` 用户代理返回 403。在此流程中的所有请求上，始终设置 `User-Agent: python-httpx/0.27`（或类似值）。

### 4. 动态客户端注册（RFC 7591）

向 `registration_endpoint` 发送 POST 请求，内容为：

```json
{
  "client_name": "Hermes Agent (manual OAuth)",
  "redirect_uris": ["http://127.0.0.1:8765/callback"],
  "grant_types": ["authorization_code", "refresh_token"],
  "response_types": ["code"],
  "token_endpoint_auth_method": "none",
  "scope": "<scopes_from_resource_metadata>"
}
```

如果 AS 的 `scopes_supported` 为空，则完全省略 `scope` —— 参见步骤 5 的陷阱。使用端口 `8765`（或任意端口 —— 不会有任何程序监听它）。`token_endpoint_auth_method: none` 标识这是一个公共 PKCE 客户端。保存返回的 `client_id`。

### 5. 使用 PKCE 构建 authorize URL

生成：
- `code_verifier`：`secrets.token_urlsafe(64)[:128]`
- `code_challenge`：`base64url(sha256(code_verifier))`（无填充）
- `state`：`secrets.token_urlsafe(24)`

查询参数：`response_type=code`、`client_id`、`redirect_uri`、`code_challenge`、`code_challenge_method=S256`、`state`，外加 `resource=<mcp_server_url>`（RFC 8707 —— 许多服务器要求此项，用于将令牌绑定到特定的 MCP 资源）。仅当 AS 元数据的 `scopes_supported` 是非空数组，且/或资源元数据声明了特定 scope 时，才包含 `scope=<以空格分隔>`。如果 `scopes_supported: []`，则省略 `scope` 参数 —— 服务器会自行授予其完整的默认集合。在 `scopes_supported` 为空时凭空编造 scope 字符串，可能在某些 AS 上导致 `invalid_scope` 错误。

**将 `code_verifier` 和 `state` 暂存到磁盘**（例如 `/tmp/.mcp-oauth-work/<server>.json`，权限 0600）。你在步骤 7 中需要它们，可能跨越多个对话轮次。

### 6. 将 authorize URL 交给用户

```
Open this URL in your browser:
<authorize_url>

After approving, your browser will try to load http://127.0.0.1:8765/callback
and fail to connect — THAT'S EXPECTED. Just copy the entire URL from the
address bar (it will contain ?code=...&state=...) and paste it back here.
```

### 7. 用授权码换取令牌

当用户粘贴回调 URL 时：

1. 从查询字符串中解析出 `code` 和 `state`。
2. **验证 `state` 与暂存值匹配**（CSRF 检查 —— 不要跳过）。
3. 向 `token_endpoint` POST `application/x-www-form-urlencoded`：
   - `grant_type=authorization_code`
   - `code=<from callback>`
   - `redirect_uri=<same as step 4>`
   - `client_id=<from step 4>`
   - `code_verifier=<stashed>`
   - `resource=<mcp_server_url>`（如果 AS 在步骤 5 中要求此项，这里也要包含）
4. 响应包含 `access_token`、`refresh_token`、`token_type`、`expires_in`、`scope`。

### 8. 按 Hermes 的精确 schema 写入令牌

`tools/mcp_oauth.py::HermesTokenStorage` 期望在 `$HERMES_HOME/mcp-tokens/` 下有两个文件（创建目录时权限为 `0o700`，创建文件时权限为 `0o600`）：

**`<server_name>.json`** —— `OAuthToken` pydantic 模型：
```json
{
  "access_token": "...",
  "token_type": "Bearer",
  "expires_in": 7200,
  "refresh_token": "...",
  "scope": "read write"
}
```

**`<server_name>.client.json`** —— `OAuthClientInformationFull` 模型：
```json
{
  "client_id": "...",
  "redirect_uris": ["http://127.0.0.1:8765/callback"],
  "grant_types": ["authorization_code", "refresh_token"],
  "response_types": ["code"],
  "token_endpoint_auth_method": "none",
  "scope": "read write",
  "client_name": "..."
}
```

通过 `json.dumps(..., indent=2)` 写入每个文件。使用 `re.sub(r'[^\w\-]', '_', server_name)[:128]` 清理文件名 —— 这与 Hermes 令牌存储中的 `_safe_filename()` 一致。

### 9. 将服务器添加到 config.yaml

```yaml
mcp_servers:
  <name>:
    url: "https://mcp.example.com"
    auth: oauth
    timeout: 180
    connect_timeout: 60
```

### 10. 在要求用户重新加载之前，先对 token 进行冒烟测试

手动 POST 一个 MCP `initialize` 请求，以确认 token 端到端可用 ——
这能在用户又一次被“No MCP tools available”的重新加载搞糊涂之前，
捕获 scope 配置错误、错误的 `resource` 值以及 Cloudflare 拦截：

```python
body = json.dumps({
    "jsonrpc": "2.0", "id": 1, "method": "initialize",
    "params": {
        "protocolVersion": "2025-06-18",
        "capabilities": {},
        "clientInfo": {"name": "hermes-debug", "version": "1.0"},
    },
}).encode()
# POST 到 MCP URL，附带：
#   Authorization: Bearer <access_token>
#   Accept: application/json, text/event-stream
#   Content-Type: application/json
#   MCP-Protocol-Version: 2025-06-18
#   User-Agent: python-httpx/0.27
```

预期返回 HTTP 200，`Content-Type: text/event-stream`，以及一个包含
`serverInfo` 和 `capabilities` 的 JSON-RPC 结果。**不要使用 `urllib` 及其默认
UA** —— 即使用户使用的 Hermes（内部使用 httpx）能够成功，Cloudflare 也会对你返回 403。
`scripts/diagnose-oauth-mcp.py` 可自动化此冒烟测试。

### 11. 告诉用户运行 `/reload-mcp`

重新加载时，Hermes 会看到 `auth: oauth`，调用 `HermesTokenStorage.get_tokens()`，
找到缓存的 token，跳过浏览器流程，并注册 `mcp_<name>_*`
工具。在 `expires_in` 流逝之前会自动刷新。

## 陷阱与经验教训

1. **不要假设“headless”就意味着“不可能使用 OAuth”。** 内置流程在本地 CLI 中运行良好；该问题严格限于远程部署，即用户的浏览器和 Hermes 进程运行在不同机器上。在声称 OAuth 不是选项之前，先检查执行环境。

2. **阅读源码，而不仅仅是技能文档。** `tools/mcp_oauth.py` 以及 `website/docs/` 中的 MCP 配置参考才是权威参考。在告诉用户某个功能“不存在”之前，先在代码树中 grep。

3. **Cloudflare UA 过滤。** 许多 MCP/OAuth 服务商的底层基础设施由 Cloudflare 作为前端，它会对元数据端点上的 `python-urllib/*` 用户代理返回 403，即使这些端点是公开的。在此流程的每个请求上设置 `User-Agent: python-httpx/0.27`（或任何类浏览器字符串）。Hermes 本身使用 httpx，因此在真实连接路径中这从来不是问题。

4. **在 authorize 和 token 请求中都包含 `resource`。** 对大多数现代 MCP 服务器而言，RFC 8707 resource indicators 不是可选项 —— 它们将签发的 token 绑定到特定的 MCP 资源 URL。有时省略它仍然有效，但可能会产生一个稍后在 MCP 服务器上因 scope/audience 错误而失败的 token。

5. **尾部斜杠很重要。** 有些服务器将资源广告为带尾部斜杠的 `https://mcp.example.com/`，并拒绝针对无斜杠变体签发的 token。从 `.well-known/oauth-protected-resource` 响应中逐字复制 `resource` 值。

6. **`/reload-mcp` 在失败时是静默的。** 如果重新加载显示“No MCP tools available”且没有 `change_detail` 行，则说明服务器在配置中但连接失败，且没有错误冒泡出来。跟踪错误日志，用一次手动 `initialize` POST 直接对 token 进行冒烟测试，并且 —— 如果一切看起来都正常 —— 请用户完整重启进程。

7. **断路器的状态可以在 `/reload-mcp` 后继续存在。** `tools/mcp_tool.py` 维护一个模块级错误计数字典，阈值很小。一旦跳闸（例如在 token 过期产生若干次连续失败之后），工具处理器可以在调用服务器之前直接短路，因此没有成功的调用能重置计数器。症状：重新加载说“Reconnected: X”，但同一对话中后续调用仍以“server unreachable”失败。恢复顺序：首先尝试 `/reload-mcp`（成本低，不会影响聊天进程）—— 在当前构建中它可以清除计数器；只有在重新加载后实时调用仍然短路时，才升级为完整重启网关进程。不要一上来就说“你必须重启”。

8. **在 access_token 已过期且断路器已跳闸的情况下刷新是一个死锁。** 自动刷新逻辑运行在 MCP 调用路径内，而断路器一旦跳闸就会短路该路径。仅在磁盘上手动刷新 token 本身无济于事 —— 需将手动 token 刷新与完整重启搭配，而不是 `/reload-mcp`。

9. **手动刷新时出现 `invalid_grant` 意味着 refresh token 已失效 —— 重新认证是唯一的解决办法，不要循环重试。** 当 access_token 过期时间足够长时，refresh_token 也可能被服务器端撤销/过期。此时 `grant_type=refresh_token` POST 会返回 HTTP 400 `{"error":"invalid_grant",...}`（措辞各异：“Grant not found”、“Token expired”、“refresh token is invalid”）。网关侧没有任何恢复手段。把两个选项交还给用户：(a) 重新运行完整的手动 OAuth 流程（步骤 3–10），或 (b) 如果服务商提供静态个人 API key，则改用该 key —— 没有刷新/过期周期，对无人值守的远程网关更持久。提前检测：在对 OAuth MCP 执行任何 create/update 操作之前，检查 `expires_at` 与 `time.time()`；如果已经过期，先尝试刷新并立即暴露 `invalid_grant`，而不是在任务中途失败。

10. **刷新成功但 token 仍被拒绝 = 服务器端 SESSION 撤销；只有全新的 authorization_code 流程才能修复。** 与陷阱 9 不同。已存储的 token 文件看起来可能是健康的（`expires_at` 远未到达，refresh_token 存在），但实时的 `initialize` POST 返回 `401 invalid_token`，并带有形如 `{"error":{"code":-32002,"message":"Session expired. Please re-authenticate."}}` 的 JSON-RPC 正文。`grant_type=refresh_token` POST 可能**成功**（HTTP 200，新的 access_token）—— 然而全新的 token 仍得到相同的 `-32002`。服务商在服务器端撤销了底层的 MCP *会话*；OAuth 刷新链重新铸造了凭证，但无法重建已撤销的会话。当 OAuth MCP 报告“未连接”时的决策规则：(1) 用一次手动 `initialize` POST 对存储的 access_token 进行冒烟测试；(2) 如果返回 `401 invalid_token`，尝试刷新并对新 token 进行冒烟测试；(3a) 新 token 可用 → 写入它 + 重启以清除断路器；(3b) 新 token 仍得到 `-32002`/“Session expired” → 停手，这是会话撤销，把 authorize URL 交给用户以进行完整重新认证。`scripts/diagnose-oauth-mcp.py` 可自动化步骤 1–2，并打印出你所处分支。对于会话不断被撤销的无人值守网关，优先使用静态 Personal API key。参见 `references/stripe-mcp-oauth-revocation.md` 中关于每周都会撤销凭证的服务商的完整示例。

11. **client info 文件不是可选项。** Hermes 需要 `<server>.client.json` 才能知道用于刷新授权的 `client_id`。跳过它意味着首次刷新会失败，用户不得不重新认证 —— 写入两个文件是本技能的全部意义所在。

12. **绝不要手动拼写 redirect URL 让用户打开。** 使用 `urllib.parse.urlencode()` 以编程方式生成 authorize URL。作用域中的空格和 `state` 中的特殊字符会破坏字符串拼接而成的 URL。

13. **安全：stash 文件包含 `code_verifier`。** token 交换成功后立即删除 `/tmp/.mcp-oauth-work/<server>.json`。一旦使用完毕，没有任何理由继续保留一个身份证明机密。

14. **写入 token 端点实际返回的内容。** AS 可能授予比请求更窄（或更宽）的 scope。将 token 交换响应中的 `scope` 写入 `<server>.json`，而不是你在步骤 5 中请求的内容。当 `scopes_supported: []` 时，你发送的显式 scope 列表在两个方向上都是权威的：有些服务器恰好授予你列出的内容（为最小权限传递窄 scope，或者在用户需要所有权限时枚举完整集合），而有些服务器在注册时不会回显授予的 scope —— 只有 token 交换响应是权威的。

15. **OAuth token 往往在服务商的公开 REST API 上兼作 Bearer token。** `<server>.json` 中的 access_token 时常不是“MCP 专用”—— 只要已授予相应的资源 scope，对服务商文档化的 REST API 使用 `Authorization: Bearer <token>` 就会成功。这是 OAuth 2.0 规范，而非服务商的怪癖。当 MCP 服务器为只读而你却需要写操作时，在建议单独使用 API key 之前，先检查 OAuth token 是否可以直接打到服务商的 REST API。

16. **密钥脱敏可能会在工具输出中遮蔽 token。** 如果启用了密钥脱敏，token 和长的不透明字符串在工具结果输出中会渲染为 `***`，因此你无法用 `print(response)` 让 access_token 在多个回合中保持可见。结合 authorization_code 授权中一次性使用的 `code` 值：如果你打印 token 交换响应，可能会既丢失 token 又消耗掉 code，迫使用新的 authorize URL 重新开始。**始终在同一个执行 token 交换的代码块中，将 access_token 直接写入其最终目标文件。** 如果必须为调试而打印，只打印 `len(access_token)`、`token_type`、`scope`、`expires_in` —— 绝不打印密钥本身。

17. **GitHub MCP（`api.githubcopilot.com/mcp/`）使用预注册的机密（confidential）OAuth App，而不是 DCR + PKCE-public。** 其 client info 带有一个真实的 `client_secret` 和 `token_endpoint_auth_method: client_secret_post`。向 `https://github.com/login/oauth/access_token` 的 token 交换 POST 必须将 `client_secret` 作为表单字段，与 `client_id`、`code`、`code_verifier` 和 `redirect_uri` 并列（PKCE 仍然在 secret 之上被接受）。redirect URI 在 OAuth App 配置中是**固定**的 —— 你无法更改它，因此手动使用监听端口的技巧不适用；用户只需让浏览器在该端口创建连接失败，再把地址栏 URL 粘贴回来即可。

## 不要做什么

- **不要用 `mcp-remote` 作为回退方案。** 它会运行一个 npx 子进程，其 OAuth 回调服务器同样位于远程容器的 localhost 上——问题相同。`mcp-remote` 只在 MCP 客户端完全不支持远程 HTTP 时才有用（Hermes 原生就支持）。
- **不要主动建议“粘贴你的 API token，我帮你加请求头”**，如果用户明确要求使用 OAuth 的话。只有在解释清楚为什么原生 OAuth 流程在远程部署中会失败之后，才可以提供静态 token 的捷径。尊重用户选择额外折腾以换取无需轮换、范围受限的访问方式。
- **不要在未阅读源码的情况下声称 Hermes 不支持某个功能。** 在做出能力断言之前，请先在源码树中 grep 搜索。

## 快速参考文件

- `scripts/diagnose-oauth-mcp.py` — 可反复运行、默认只读的诊断脚本。给定一个服务器名，它会对你存储的 access_token 做冒烟测试，尝试刷新，再对新 token 做冒烟测试，并明确打印出你处于哪个恢复分支（`TOKEN_OK` = 熔断/重启，`REFRESH_FIXED` = 持久化+重启，`SESSION_REVOKED` = 完整重新认证，`REFRESH_DEAD` = 完整重新认证/API key）。传入 `--write` 可以原子化地持久化一个可用的刷新后 token。绝不打印敏感值。**当某个 OAuth MCP 服务器报告“未连接”时，请首先运行这个脚本**——它编码了陷阱 7/9/10 的决策树。
- `references/stripe-mcp-oauth-revocation.md` — 一个（Stripe 的）完整示例，说明某服务商会周期性地吊销其 OAuth 会话，以及持久化的修复方案：改为使用受限的静态 API key。

## 相关

- `native-mcp` — 在 Hermes 中配置 MCP 的通用指南。权威配置参考位于此处。
- `mcporter` — 外部 CLI 桥接，用于在 Hermes 配置之外进行临时 MCP 调用。
