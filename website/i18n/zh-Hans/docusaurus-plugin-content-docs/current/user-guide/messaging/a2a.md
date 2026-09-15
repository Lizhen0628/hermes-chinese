# A2A (Agent-to-Agent)

[A2A](https://a2a-protocol.org) 是开放的 Agent2Agent 协议（v1.0，由 Linux 基金会管理），用于相互独立的 AI 智能体之间的通信。Hermes A2A 插件支持**双向**工作：你的智能体可以把其他 A2A 智能体当作工具来调用，其他智能体也可以通过 HTTP 向你的 Hermes 发送任务。

它可以与任何符合 A2A 规范的通信方互操作——另一个 Hermes、LangChain、CrewAI、Google ADK 智能体，或任何基于官方 `a2a-sdk` 构建的实现。

## 何时使用 A2A

- **跨机器的 Hermes ↔ Hermes** ——让你的桌面智能体把任务交给服务器上的 Hermes，反之亦然，各自拥有独立的记忆、工具和凭据。
- **委派给專用智能体** ——某个通信方在其 Agent Card 中声明了 `web_search`/`research`/`coding` 技能，就可以在对话中途被发现并调用。
- **作为一个可被调用的服务** ——将你的 Hermes 暴露出去，让其他框架的智能体可以向它发送任务。

当你想要**同一台机器**上的多个智能体时，优先使用[委派](../features/delegation.md)（进程内子智能体）或[看板](../features/kanban.md)（持久化的多配置档工作队列）——A2A 是用于跨越进程/机器/框架边界的。

## 启用

```bash
hermes gateway setup      # pick A2A
```

或在 `~/.hermes/config.yaml` 中：

```yaml
gateway:
  platforms:
    a2a:
      enabled: true
      extra:
        port: 9900
```

出站客户端工具作为 `a2a` 工具集提供，**默认关闭**——按平台启用：

```bash
hermes tools enable a2a --platform cli        # CLI/TUI sessions
hermes tools enable a2a --platform telegram   # or any messaging platform
hermes tools enable a2a --platform a2a        # let inbound A2A tasks call peers (agent chaining)
```

这些工具在每种进程类型中都可使用——CLI、TUI、网关以及定时任务——无需先启用入站平台。

## 出站：调用其他智能体

启用 `a2a` 工具集后，智能体会获得：

| 工具 | 功能 |
|---|---|
| `a2a_discover(url)` | 获取并总结某个通信方的 Agent Card |
| `a2a_call(agent, message, context_id?)` | 发送任务，获取回复；通过 `context_id` 实现多轮对话 |
| `a2a_list()` | 已配置的通信方、已保存的会话、指标 |
| `a2a_history(context_id)` | 调取一段已持久化的 A2A 会话 |
| `a2a_orchestrate(capability, message, mode?)` | 将一个任务分发给所有声明了某能力的通信方（`all` / `first` / `best`） |

在 `config.yaml` 中配置已知的通信方：

```yaml
a2a_agents:
  researcher:
    url: "http://research-box.local:9900"
    auth: { type: bearer, token: "..." }
    timeout: 120
    capabilities: [web_search, research]
```

然后直接请求：*“让 researcher 智能体总结今天的 arXiv 帖子。”* 直接使用 URL 也可以——`a2a_call` 接受任何 A2A 端点。

## 入站：可被调用

启用该平台后，Hermes 会提供：

- **Agent Card**，位于 `GET /.well-known/agent-card.json`（规范的 v1.0 路径；旧版 `agent.json` 也会响应）——声明你的智能体的名称、技能（源自已启用的工具集）以及认证要求。
- **JSON-RPC 2.0**，位于 `POST /`——规范 v1.0 方法（`SendMessage`、`SendStreamingMessage`、`GetTask`、`ListTasks`、`CancelTask`、`SubscribeToTask`、推送通知配置 CRUD）以及 1.0 之前的路径式别名（`message/send` 等）。
- **SSE 流式传输**，用于 `SendStreamingMessage`，配有符合规范的 JSON-RPC 封装帧。
- **推送通知**（webhooks），用于长时间运行的任务，采用 HMAC-SHA256 签名。

入站任务会被注入到一个**存活的网关会话**中——即服务于你其他渠道的同一个智能体、记忆和工具——最终回复会作为任务结果返回给调用方。会话以 A2A 的 `contextId` 为键，因此通信方可以进行多轮交流。

互操作性已针对官方 Python `a2a-sdk` 得到验证（card 解析、`SendMessage`、流式传输）。

## 安全模型

默认安全；每一次放宽都是显式的：

- **无令牌 ⇒ 仅限 localhost。** 服务器绑定 `127.0.0.1`。远程暴露需要一个 bearer token **以及**显式的 `A2A_HOST`。
- **按通信方颁发的令牌** ——`A2A_PEER_TOKENS="alice:tok1,bob:tok2"` 为每个通信方分配各自的凭据；已认证的名称驱动速率限制、信任与审计。
- **提示词注入过滤** ——入站文本会被过滤，并被标记为不受信任的通信方输入。远程通信方无法调用操作员的斜杠命令。
- **出站脱敏** ——凭据形态的字符串（API keys、JWTs、tokens）会从回复中清除。
- **审计日志** ——每次交互都会追加到 `~/.hermes/a2a_audit.jsonl`。
- **防循环** ——按上下文的轮次上限阻止两个智能体无限地对打。

## 配置参考

| 环境变量 | 默认值 | 含义 |
|---|---|---|
| `A2A_PEER_TOKENS` | _（未设置）_ | 按通信方的凭据 `name:token,…`（首选） |
| `A2A_BEARER_TOKEN` | _（未设置）_ | 共享令牌；身份回退为调用方 IP |
| `A2A_HOST` | `127.0.0.1` | 绑定主机——仅在设置了令牌时才放宽 |
| `A2A_PORT` | `9900` | 入站端口 |
| `A2A_AGENT_NAME` | 根据主机名推导 | Agent Card 上的名称 |
| `A2A_PUBLIC_URL` | _（未设置）_ | 在 card 上声明的可路由 URL（反向代理 / k8s） |
| `A2A_TRUSTED_PEERS` | _（未设置）_ | 已认证身份的允许列表 |
| `A2A_ALLOW_ALL_USERS` | `false` | 允许任何已认证的通信方（仅限开发） |
| `A2A_RATE_LIMIT` | `60` | 每个身份每分钟的请求数 |
| `A2A_MAX_PINGPONG_TURNS` | `5` | 每个上下文的防循环轮次上限（最大 20） |
| `A2A_REPLY_TIMEOUT` | `300` | 等待智能体回复的秒数。孤儿任务清扫在该时间窗口结束前绝不会将任务判定为失败（下限 300 秒），也绝不会在仍有请求等待该任务时判定为失败 |
| `A2A_PUSH_SECRET` | bearer token | 用于推送通知签名的 HMAC 密钥 |
| `A2A_ADVERTISED_TOOLSETS` | 全部已注册 | 限制哪些技能出现在 Agent Card 上 |

在反向代理或 Kubernetes Service 之后，请设置 `A2A_PUBLIC_URL`（或依赖 `X-Forwarded-Host`/`X-Forwarded-Proto`），以便 Agent Card 声明的 URL 是通信方实际可以回调的。

## 快速测试

```bash
# From another machine / agent:
curl http://your-host:9900/.well-known/agent-card.json

curl -X POST http://your-host:9900/ \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer <token>' \
  -d '{"jsonrpc":"2.0","id":1,"method":"SendMessage",
       "params":{"message":{"messageId":"m1","role":"ROLE_USER",
                 "parts":[{"text":"What tools do you have?"}]}}}'
```

## 故障排除

- **通信方无法访问 card URL** ——card 声明的是你的绑定地址；请将 `A2A_PUBLIC_URL` 设置为对外可路由的 URL。
- **`401 Unauthorized`** ——令牌不匹配；请检查服务器上的 `A2A_PEER_TOKENS`/`A2A_BEARER_TOKEN` 以及通信方的 `auth:` 块。
- **服务器无法绑定非 localhost** ——这是有意设计的：请先设置 bearer token，然后设置 `A2A_HOST=0.0.0.0`。
- **长时间任务回复超时** ——提高 `A2A_REPLY_TIMEOUT`（孤儿任务清扫会跟随它，因此迟到的回复会被存储而非丢弃），或让调用方注册推送通知配置并轮询 `GetTask`。
