---
title: "Mcp Oauth Remote Gateway — 无头网关上的远程 MCP 服务器手动 OAuth"
sidebar_label: "Mcp Oauth Remote Gateway"
description: "无头网关上的远程 MCP 服务器手动 OAuth"
---

{/* 本页面由 website/scripts/generate-skill-docs.py 从技能的 SKILL.md 自动生成。请编辑源文件 SKILL.md，而非此页面。 */}

# Mcp Oauth Remote Gateway

无头网关上的远程 MCP 服务器手动 OAuth。

## 技能元数据

| | |
|---|---|
| Source | 可选 — 使用 `hermes skills install official/mcp/mcp-oauth-remote-gateway` 安装 |
| Path | `optional-skills/mcp\mcp-oauth-remote-gateway` |
| Version | `1.0.0` |
| Author | Ben Barclay (benbarclay)、Hermes Agent |
| License | MIT |
| Platforms | linux、macos |
| Tags | `MCP`、`OAuth`、`PKCE`、`Remote-Deployment` |
| Related skills | [`hermes-agent`](/docs/user-guide/skills/bundled/autonomous-ai-agents/autonomous-ai-agents-hermes-agent)、[`mcporter`](/docs/user-guide/skills/optional/mcp/mcp-mcporter)、[`fastmcp`](/docs/user-guide/skills/optional/mcp/mcp-fastmcp) |

## 参考：完整的 SKILL.md

:::info
以下是 Hermes 在触发此技能时加载的完整技能定义。这就是技能激活时智能体所看到的指令。
:::

# 远程 Hermes 网关上的 MCP OAuth

## 概述

Hermes 内置的 MCP OAuth 客户端会在 Hermes 进程内的 `127.0.0.1:<port>` 上运行一次性
HTTP 监听器，并将该回环地址注册为 OAuth `redirect_uri`。对于用户自己机器上的
本地 CLI，这完全没问题。但当 Hermes 以远程网关（容器、VPS、消息机器人）运行时，
它就会彻底失效，因为用户的浏览器会将 `127.0.0.1` 解析到用户自己的笔记本电脑，
而不是远程容器——因此授权码永远无法送达 Hermes。

本技能手动完成 OAuth 流程，并将生成的令牌写入 Hermes 令牌存储所期望的确切文件中，
这样后续的 `/reload-mcp` 就能找到缓存的令牌，从而完全跳过浏览器流程。

## 何时使用

当**以下所有**条件均成立时，使用此技能：

1. 用户想要添加一个需要 OAuth（而非静态 Bearer 令牌）的远程 HTTP MCP 服务器。
2. Hermes 正作为**远程网关**（容器、VPS、Docker、托管服务）运行——而不是用户笔记本电脑上的本地 CLI。
3. 该服务器支持 OAuth 2.1（含 PKCE）以及 RFC 7591 动态客户端注册（DCR）（大多数现代 MCP 服务器都支持——Better Stack、Linear、Cloudflare、Datadog 等）。如果它不支持 DCR（GitHub 是著名的例外），则此技能不适用——请改用在 OAuth 应用中预先注册或使用个人访问令牌。

请勿在以下情况使用此技能：
- **本地 CLI Hermes**——只需在 `mcp_servers.<name>` 中设置 `auth: oauth` 并执行 `/reload-mcp` 即可。内置流程会打开浏览器并在 localhost 上捕获回调。完全没问题。
- **接受静态 Bearer 令牌（API 密钥）的服务器**——只要用户愿意，应始终首选 `headers.Authorization: "Bearer <token>"`。更简单，无需刷新流程。
- **GitHub Copilot MCP**（`api.githubcopilot.com/mcp/`）——GitHub 不公开 DCR。请使用 PAT 或预先注册的 OAuth 应用（参见第 12 个陷阱）。

## 为何内置 OAuth 流程在远程网关上会失败

Hermes 原生的 MCP OAuth 客户端（`tools/mcp_oauth.py`）：

1. 选取一个空闲的本地端口 `P`。
2. 向 AS 注册一个动态 OAuth 客户端，发送 `redirect_uri = http://127.0.0.1:P/callback`。
3. **在 Hermes 进程内部**启动一个位于 `127.0.0.1:P` 的 HTTP 服务器。
4. 打印授权 URL，并在其本地端点上等待授权码。

当 Hermes 远程运行时，`redirect_uri` 中的 `127.0.0.1` 是远程容器的回环地址，而不是
用户的。授权后，用户的浏览器会 302 重定向到 `http://127.0.0.1:P/callback?code=...`，
这会解析到用户自己的笔记本电脑并连接失败。回调永远无法到达 Hermes 进程，流程超时，
且 `/reload-mcp` 会返回 "No MCP tools available"，没有任何细节。

需要识别的症状：hermes 用户下出现 `[xdg-open] <defunct>` 进程、空的或缺失的令牌目录
（`$HERMES_HOME/mcp-tokens/`）、以及重新加载后响应中 `change_detail` 里没有任何
"Added/Reconnected: X" 行。

## 廉价的首要回退方案：内置流程自身的逃生通道

在进行任何手动令牌操作之前，先检查内置流程的回退机制是否已覆盖该部署场景。当 Hermes 检测到远程会话时，它会在授权 URL 旁边打印两个选项（`tools/mcp_oauth.py`）：

1. **粘贴回传（Paste-back）** —— 在交互式 TTY 上，stdin 读取器与 HTTP 监听器竞速。用户完成授权后，浏览器无法连接到 `127.0.0.1:<port>`，于是他们把地址栏中的完整 URL（`?code=...&state=...`）粘贴回提示符处。适用于通过 SSH 接入的 CLI 会话。
2. **SSH 端口转发（SSH port-forward）** —— `ssh -N -L <port>:127.0.0.1:<port> <user>@<host>` 使重定向能够正常到达远程监听器。

两者都要求存在一个通往 Hermes 主机的交互式终端。本技能的其余部分适用于没有交互式 TTY 的场景 —— 即 Hermes 纯以消息网关/机器人形式运行的场景，此时 `/reload-mcp` 会触发该流程，但提示符处无人值守。

## 首选入口：Hermes 仪表盘（在手动令牌操作之前先尝试此方案）

远程 Hermes 网关通常还会将 **仪表盘（dashboard）** Web UI 作为独立进程运行（例如 `hermes dashboard --host 0.0.0.0 --port <port>`；用 `ps aux | grep 'hermes dashboard'` 检查）。它提供了一个连接器/MCP 控制台 —— 端点如 `/api/mcp/servers`、`/api/mcp/status` 和 `/connectors`（均受登录保护；无 cookie 的 curl 返回 401/302 即可确认它们存在）。

**为什么仪表盘能解决核心问题：** 当用户在*自己的浏览器中*通过仪表盘驱动 OAuth 时，重定向会落到仪表盘能够捕获的上下文中 —— 从而绕过了破坏 CLI/手动流程的 `127.0.0.1` 回调失败问题。因此，对于"在远程网关上添加或重新认证 OAuth MCP 服务"，正确的升级顺序是：

1. **在用户浏览器中使用仪表盘** —— 这是预期的入口。添加服务、运行 OAuth、重新加载，全部以该用户身份认证。无需复制粘贴回调的繁琐流程，无需手写令牌文件。
2. **手动令牌操作（本技能的其余部分）** —— 当没有通向仪表盘的浏览器会话时（纯聊天/无头场景）作为回退方案。

**找到仪表盘的公开 URL。** 仪表盘在内部绑定到 `0.0.0.0:<port>`，但用户需要的是外部可访问的 URL。大多数部署平台会将其注入环境变量 —— 用 grep 查找而不要让用户自己去搜寻：

```bash
env | grep -iE "HERMES_DASHBOARD_PUBLIC_URL|RAILWAY_PUBLIC_DOMAIN|RAILWAY_STATIC_URL|RAILWAY_SERVICE_.*_URL|PUBLIC_URL|BASE_URL|DOMAIN" \
  | sed -E 's/(TOKEN|SECRET|KEY|PASSWORD)=.*/\1=***REDACTED***/I'
```

`HERMES_DASHBOARD_PUBLIC_URL` 在存在时是权威来源。在 Railway 上还应检查 `RAILWAY_PUBLIC_DOMAIN` / `RAILWAY_STATIC_URL`（即 `*.up.railway.app` 主机）以及 `RAILWAY_SERVICE_*_URL` 变量，它们有时会携带更友好的自定义域名。把完整的 `https://` URL 交给用户，并指引他们前往 Connectors/MCP 部分。务必通过上面的 `sed` 脱敏管道处理 —— 这些环境变量 grep 会紧挨着 `*_TOKEN`/`*_SECRET` 变量。

**仪表盘无法修复的内容（仍属主机侧/shell）：** 需要 shell 认证状态（一个 CLI `login` 命令，其凭据可能无法跨重启持久化）的 stdio 服务，以及任何从 `$HERMES_HOME/.env` 读取凭据的内容。无论何种情况，这些都超出了仪表盘的范围。

## 变通方案

手动执行 OAuth 流程，然后将生成的令牌写入 Hermes 的 `HermesTokenStorage` 原本会写入的确切文件中，这样在 `/reload-mcp` 时 Hermes 就能找到缓存的令牌，从而完全跳过浏览器流程。

在网关主机上通过 `terminal` 工具运行下面的 shell 命令，并通过 `execute_code` 或 `terminal` 中的 python3 调用来完成 Python 步骤（PKCE 生成、令牌交换、文件写入）—— 文件写入必须与令牌交换在同一个代码块中进行（见陷阱 16）。

### 1. 确认这是一个远程网关

```bash
env | grep -iE "HERMES|RAILWAY|CONTAINER"
echo "$DISPLAY $WAYLAND_DISPLAY $SSH_CLIENT"
```

无显示 + 存在远程标识 = 远程网关。`tools/mcp_oauth.py::_can_open_browser()` 使用这些相同的环境变量，因此如果 Hermes 自身的自动检测判定为"无头"，内置流程就不会起作用。

### 2. 找到 HERMES_HOME 和配置路径

```bash
HERMES_HOME=$(python3 -c 'from hermes_constants import get_hermes_home; print(get_hermes_home())')
echo "config: $HERMES_HOME/config.yaml"
echo "tokens: $HERMES_HOME/mcp-tokens/"
```

### 3. 从 MCP 服务器发现 OAuth 元数据

MCP 服务器通过 RFC 9728（OAuth 2.0 受保护资源元数据）来公布其 OAuth 配置。401 响应中的 `WWW-Authenticate` 头会告诉你从哪里查找：

```bash
curl -sI https://mcp.example.com | grep -i www-authenticate
# → Bearer realm="mcp", resource_metadata="https://mcp.example.com/.well-known/oauth-protected-resource"
```

**并非每个服务器都会返回 `WWW-Authenticate`。** 有些服务器返回一个只有 `{"errors":["Unauthorized"]}` 的裸 401，没有任何认证发现提示。遇到这种情况时，直接探测 well-known 路径：

```bash
for p in \
  /.well-known/oauth-protected-resource \
  /.well-known/oauth-authorization-server \
  /.well-known/openid-configuration ; do
  echo "=== $p ==="
  curl -s -A "python-httpx/0.27" "https://mcp.example.com$p" | head -c 400; echo
done
```

获取资源元数据以得到 `authorization_servers`，然后获取 AS 的 `/.well-known/oauth-authorization-server` 以得到 `authorization_endpoint`、`token_endpoint` 和 `registration_endpoint`。

坑点：许多服务器位于 Cloudflare 之后，会对裸 `urllib` user agent 返回 403。在此流程中的所有请求中，务必设置 `User-Agent: python-httpx/0.27`（或类似值）。

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

如果 AS 的 `scopes_supported` 为空，则完全省略 `scope` —— 参见第 5 步的坑点。使用端口 `8765`（或任意端口 —— 不会有什么在监听）。`token_endpoint_auth_method: none` 标记这是一个公共 PKCE 客户端。保存返回的 `client_id`。

### 5. 使用 PKCE 构建授权 URL

生成：
- `code_verifier`：`secrets.token_urlsafe(64)[:128]`
- `code_challenge`：`base64url(sha256(code_verifier))`（无填充）
- `state`：`secrets.token_urlsafe(24)`

查询参数：`response_type=code`、`client_id`、`redirect_uri`、`code_challenge`、`code_challenge_method=S256`、`state`，加上 `resource=<mcp_server_url>`（RFC 8707 —— 许多服务器要求此项以将令牌绑定到特定的 MCP 资源）。仅在 AS 元数据的 `scopes_supported` 是非空数组，且/或资源元数据声明了特定 scope 时，才包含 `scope=<空格分隔>`。如果 `scopes_supported: []`，则省略 `scope` 参数 —— 服务器会自行授予其完整的默认集合。在 `scopes_supported` 为空的情况下，伪造 scope 字符串可能导致某些 AS 报 `invalid_scope` 错误。

**将 `code_verifier` 和 `state` 暂存到磁盘**（例如 `/tmp/.mcp-oauth-work/<server>.json`，权限 0600）。第 7 步需要用到它们，可能跨越多个聊天轮次。

### 6. 将授权 URL 交给用户

```
在浏览器中打开此 URL：
<authorize_url>

批准后，你的浏览器会尝试加载 http://127.0.0.1:8765/callback
并且连接失败 —— 这是预期行为。只需从地址栏中复制完整 URL
（它将包含 ?code=...&state=...），然后粘贴回这里。
```

### 7. 用授权码换取令牌

当用户粘贴回调 URL 时：

1. 从查询字符串中解析 `code` 和 `state`。
2. **验证 `state` 与暂存的值匹配**（CSRF 检查 —— 不要跳过）。
3. 向 `token_endpoint` 发送 `application/x-www-form-urlencoded` 类型的 POST：
   - `grant_type=authorization_code`
   - `code=<from callback>`
   - `redirect_uri=<same as step 4>`
   - `client_id=<from step 4>`
   - `code_verifier=<stashed>`
   - `resource=<mcp_server_url>`（如果第 5 步中 AS 要求此项，这里也要包含）
4. 响应包含 `access_token`、`refresh_token`、`token_type`、`expires_in`、`scope`。

### 8. 以 Hermes 的确切 schema 写入令牌

`tools/mcp_oauth.py::HermesTokenStorage` 期望 `$HERMES_HOME/mcp-tokens/` 下有两个文件（目录权限 `0o700`，文件权限 `0o600`）：

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

### 10. 在要求用户重新加载之前，先对 token 做冒烟测试

手动 POST 一个 MCP 的 `initialize` 请求，以端到端地确认 token 可正常工作 —— 这能在用户又一次被 "No MCP tools available" 的重新加载搞得困惑之前，抢先捕获 scope 配置错误、错误的 `resource` 值以及 CF 拦截：

```python
body = json.dumps({
    "jsonrpc": "2.0", "id": 1, "method": "initialize",
    "params": {
        "protocolVersion": "2025-06-18",
        "capabilities": {},
        "clientInfo": {"name": "hermes-debug", "version": "1.0"},
    },
}).encode()
# POST 到 MCP URL，并带上：
#   Authorization: Bearer <access_token>
#   Accept: application/json, text/event-stream
#   Content-Type: application/json
#   MCP-Protocol-Version: 2025-06-18
#   User-Agent: python-httpx/0.27
```

预期返回 HTTP 200，`Content-Type: text/event-stream`，以及一个包含 `serverInfo` 和 `capabilities` 的 JSON-RPC 结果。**不要使用带默认 UA 的 `urllib`** —— Cloudflare 会对你返回 403，即使 Hermes（使用 httpx）能够成功。`scripts/diagnose-oauth-mcp.py` 会自动化这个冒烟测试。

### 11. 告知用户运行 `/reload-mcp`

重新加载时，Hermes 会看到 `auth: oauth`，调用 `HermesTokenStorage.get_tokens()`，找到你缓存的 token，跳过浏览器流程，并注册 `mcp_<name>_*` 工具。刷新会在 `expires_in` 流逝之前自动进行。

## 陷阱与经验教训

1. **不要以为 “headless” 就意味着 “OAuth 不可能”。** 内置流程对于本地 CLI 完全没问题；问题严格局限于远程部署场景，即用户的浏览器与 Hermes 进程位于不同机器上。在声称 OAuth 不是可选项之前，先检查执行环境。

2. **读源码，而不只是读技能文档。** `tools/mcp_oauth.py` 以及 `website/docs/` 中的 MCP 配置参考才是权威依据。在告诉用户某个特性 “不存在” 之前，先 grep 一下代码树。

3. **Cloudflare UA 过滤。** 许多 MCP/OAuth 服务商的基础设施前端都部署了 Cloudflare，它会对 `python-urllib/*` 的 user agent 在 metadata 端点上返回 403，尽管这些端点其实是公开的。请在此流程的每个请求上设置 `User-Agent: python-httpx/0.27`（或任何类似浏览器的字符串）。Hermes 自身使用 httpx，因此在真实连接路径中从不存在这个问题。

4. **在 authorize 和 token 请求中都包含 `resource`。** 对于大多数现代 MCP 服务器而言，RFC 8707 资源指示符并非可选项 —— 它们会把签发的 token 绑定到特定的 MCP 资源 URL。省略它有时仍能工作，但可能会得到一个后续在 MCP 服务器上因 scope/audience 错误而失败的 token。

5. **末尾斜杠很重要。** 有些服务器会把资源宣告为 `https://mcp.example.com/`（带末尾斜杠），并拒绝针对无斜杠变体签发的 token。请从 `.well-known/oauth-protected-resource` 响应中逐字复制 `resource` 值。

6. **`/reload-mcp` 在失败时是静默的。** 如果重新加载显示 "No MCP tools available" 且没有 `change_detail` 行，说明某个服务器在配置中但连接失败，且没有任何错误冒泡出来。追踪 error 日志，用一次手动的 `initialize` POST 直接对 token 做冒烟测试，然后 —— 如果一切看起来正常 —— 请求完整重启进程。

7. **断路器可能会在 `/reload-mcp` 之后仍然存在。** `tools/mcp_tool.py` 维护着一个模块级的错误计数字典，阈值很小。一旦触发（例如 token 过期后产生多次连续失败），工具处理器就可能在调用服务器之前短路，因此没有成功的调用可以把计数器重置。症状：重新加载显示 “Reconnected: X”，但同一对话中后续调用仍失败并报 “server unreachable”。恢复顺序：**首先**尝试 `/reload-mcp`（成本低，不会导致聊天进程抖动）—— 在当前版本上它可以清除计数器；只有在重新加载后实时调用**仍然**短路时，才升级为完整重启网关进程。不要一上来就说 “你必须重启”。

8. **在 access_token 已过期 + 断路器已触发时执行刷新会死锁。** 自动刷新逻辑运行在 MCP 调用路径内，而一旦断路器触发，这条路径就被短路了。仅在磁盘上手动刷新 token 本身没有帮助 —— 应该把手动刷新 token 与完整重启搭配，而不是与 `/reload-mcp` 搭配。

9. **手动刷新时报 `invalid_grant` 意味着 refresh token 已死 —— 重新认证是唯一的解决办法，不要循环重试。** 当 access_token 过期时间足够长时，refresh_token 也可能在服务器端被撤销/过期。此时一次 `grant_type=refresh_token` 的 POST 会返回 HTTP 400 `{"error":"invalid_grant",...}`（措辞各异："Grant not found"、"Token expired"、"refresh token is invalid"）。从网关这一侧是**无法**恢复的。应交回用户并给出两个选项：(a) 重跑完整的手动 OAuth 流程（第 3–10 步），或 (b) 如果服务商提供静态个人 API key，就切换到它 —— 没有刷新/过期循环，对于无人值守的远程网关更耐用。提前检测：在对某个 OAuth MCP 执行任何 create/update 操作之前，先检查 `expires_at` 与 `time.time()`；如果已经过期，就先尝试刷新并立即把 `invalid_grant` 上报出来，而不是等任务执行到一半才失败。

10. **刷新成功但 token 仍被拒绝 = 服务器端 SESSION 被撤销；只有重跑一次全新的 authorization_code 流程才能修复。** 这一点与陷阱 9 不同。已存储的 token 文件可能看起来健康（`expires_at` 还很远、refresh_token 存在），但实时的 `initialize` POST 却返回 `401 invalid_token`，并带有 JSON-RPC 响应体如 `{"error":{"code":-32002,"message":"Session expired. Please re-authenticate."}}`。`grant_type=refresh_token` 的 POST 可能**成功**（HTTP 200，新的 access_token）—— 但崭新的 token 仍然得到同样的 `-32002`。说明服务商在服务器端撤销了底层的 MCP *会话*；OAuth 刷新链会重新签发凭据，但无法重建一个已被撤销的会话。当某个 OAuth MCP 报告 “not connected” 时的决策规则：(1) 用一次手动的 `initialize` POST 对存储的 access_token 做冒烟测试；(2) 如果返回 `401 invalid_token`，就尝试刷新并对**新** token 做冒烟测试；(3a) 新 token 可用 → 写入它 + 重启以清除断路器；(3b) 新 token **仍然**得到 `-32002`/"Session expired" → 停下，这是会话撤销，把 authorize URL 交给用户以进行完整重新认证。`scripts/diagnose-oauth-mcp.py` 会自动化第 1–2 步，并打印出你处在哪个分支。对于会话不断被撤销的无人值守网关，优先使用静态 Personal API key。关于某个每周都执行撤销的服务商的完整示例，参见 `references/stripe-mcp-oauth-revocation.md`。

11. **客户端信息文件不是可选项。** Hermes 需要 `<server>.client.json` 才能知道用于刷新授权的 `client_id`。跳过它意味着首次刷新会失败，用户不得不重新认证 —— 同时写入这两个文件正是本技能的全部要点。

12. **绝不要手敲 redirect URL 给用户打开。** 请用 `urllib.parse.urlencode()` 以编程方式生成 authorize URL。scope 中的空格和 `state` 中的特殊字符会破坏字符串拼接出来的 URL。

13. **安全：stash 文件里含有 `code_verifier`。** 在 token 交换成功后，立即删除 `/tmp/.mcp-oauth-work/<server>.json`。一旦身份证明密钥被使用过，就没有理由再保留它。

14. **写入 token 端点实际返回的内容。** 授权服务器可能授予比请求更窄（或更宽）的 scope。请把 token 交换响应中的 `scope` 写入 `<server>.json`，而不是你在第 5 步中请求的那个。当 `scopes_supported: []` 时，你发送的显式 scope 列表**双向**都是权威的：有些服务器会恰好授予你所列出的内容（若追求最小权限就传窄 scope，若用户需要全部就枚举完整集合），而有些则不会在注册时把授予的 scope 回显回来 —— 只有 token 交换响应才是权威的。

15. **OAuth token 常常可兼作对该服务商公开 REST API 的 Bearer token。** `<server>.json` 中的 access_token 往往并不只是“仅限 MCP”—— 只要授予了对应的资源 scope，用 `Authorization: Bearer <token>` 调用服务商有文档的 REST API 就能成功。这是 OAuth 2.0 规范，而非服务商的特殊行为。当 MCP 服务器是只读的而你却需要写操作时，在建议单独使用 API key 之前，先检查一下该 OAuth token 能否直接访问服务商的 REST API。

16. **Secret redaction 可能会在工具输出中遮蔽 token。** 如果启用了 secret redaction，token 和长的不透明字符串在工具结果输出中会渲染为 `***`，因此你无法通过 `print(response)` 让 access_token 跨轮次保持可见。结合 authorization_code 授权中一次性使用的 `code`：如果你打印 token 交换响应，可能会既丢了 token，又消耗了 code，从而不得不带着全新的 authorize URL 重启。**始终在完成 token 交换的同一个代码块中，将 access_token 直接写入其最终目标文件。** 如果必须为调试而打印，只打印 `len(access_token)`、`token_type`、`scope`、`expires_in` —— 绝不打印密钥本身。

17. **GitHub MCP（`api.githubcopilot.com/mcp/`）使用的是预注册的机密 OAuth App，而非 DCR + PKCE-public。** 它的客户端信息自带真实的 `client_secret` 和 `token_endpoint_auth_method: client_secret_post`。向 `https://github.com/login/oauth/access_token` 发起的 token 交换 POST 必须在表单中把 `client_secret` 与 `client_id`、`code`、`code_verifier`、`redirect_uri` 一并包含。redirect URI 在 OAuth App 配置中是**固定的** —— 你无法修改它，所以手动监听端口的技巧在这里不适用；用户只需让浏览器在该端口连接失败，然后把地址栏中的 URL 贴回来即可。

## 不应做的事

- **不要把 `mcp-remote` 当作后备方案。** 它会运行一个 npx 子进程，其 OAuth 回调服务器同样位于远程容器的 localhost 上——同样的问题。只有当 MCP 客户端完全不支持远程 HTTP 时，`mcp-remote` 才有用（Hermes 原生支持远程 HTTP）。
- **如果用户明确要求使用 OAuth，不要一味推销“粘贴你的 API token，我来加请求头”的方案。** 只有先解释清楚为什么原生 OAuth 流程在远程部署中会失败，才应该提供静态令牌的捷径。要尊重用户选择多花功夫来换取无需轮换、作用域受限的访问方式。
- **不要在未阅读源码的情况下声称 Hermes 不支持某项功能。** 在做出能力相关的判断之前，先 grep 源码树。

## 快速参考文件

- `scripts/diagnose-oauth-mcp.py` — 可重复运行、默认只读的诊断脚本。给定服务器名称后，它会冒烟测试已存储的 access_token、尝试刷新、冒烟测试新令牌，并明确打印出你当前处于哪个恢复分支（`TOKEN_OK` = 熔断/重启，`REFRESH_FIXED` = 持久化+重启，`SESSION_REVOKED` = 完整重新认证，`REFRESH_DEAD` = 完整重新认证/API key）。传入 `--write` 可原子性地持久化一个可用的刷新后令牌。绝不打印密钥值。**当 OAuth MCP 服务器报告“未连接”时，应首先运行此脚本**——它编码了陷阱 7/9/10 的决策树。
- `references/stripe-mcp-oauth-revocation.md` — 一个真实案例（Stripe），某服务商会定期撤销其 OAuth 会话，以及持久的修复方案：改用静态受限 API key。

## 相关

- `native-mcp` — 在 Hermes 中配置 MCP 的通用指南。权威配置参考位于该文档中。
- `mcporter` — 外部 CLI 桥接工具，用于在 Hermes 配置之外进行临时 MCP 调用。
