# A2A (Agent-to-Agent)

[A2A](https://a2a-protocol.org) 是开放的 Agent2Agent 协议（v1.0，由 Linux 基金会托管），用于独立的 AI 智能体之间的通信。Hermes A2A 插件支持**双向**工作：你的智能体可以像调用工具一样调用其他 A2A 智能体，其他智能体也可以通过 HTTP 向你的 Hermes 发送任务。

它可与任何符合 A2A 规范的对接方互操作——另一个 Hermes、LangChain、CrewAI、Google ADK 智能体，或任何基于官方 `a2a-sdk` 构建的东西。

## 何时使用 A2A

- **跨机器的 Hermes ↔ Hermes** — 让你的桌面智能体把任务交给服务器上的 Hermes，反之亦然，各自拥有自己的记忆、工具和凭据。
- **委派给专用智能体** — 在其 Agent Card 上声明了 `web_search`/`research`/`coding` 技能的对接方，可在对话过程中被发现并调用。
- **作为可调用的服务** — 暴露你的 Hermes，让其他框架的智能体可以给它发送任务。

当你想要**同一机器**上的多个智能体时，请优先使用[委派](../features/delegation.md)（进程内子智能体）或[看板](../features/kanban.md)（持久化的多配置档工作队列）——A2A 用于跨越进程/机器/框架边界。

## 启用

```bash
hermes gateway setup      # 选择 A2A
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
hermes tools enable a2a --platform cli        # CLI/TUI 会话
hermes tools enable a2a --platform telegram   # 或任何消息平台
hermes tools enable a2a --platform a2a        # 让入站 A2A 任务可以调用对接方（智能体链式调用）
```

这些工具在所有进程类型中均可用——CLI、TUI、网关和定时任务——无需启用入站平台。

## 出站：调用其他智能体

启用 `a2a` 工具集后，智能体将获得：

| 工具 | 作用 |
|---|---|
| `a2a_discover(url)` | 获取并总结对接方的 Agent Card |
| `a2a_call(agent, message, context_id?)` | 发送任务并获取回复；通过 `context_id` 进行多轮交互 |
| `a2a_list()` | 已配置的对接方、已保存的对话、指标 |
| `a2a_history(context_id)` | 召回持久化的 A2A 对话 |
| `a2a_orchestrate(capability, message, mode?)` | 将任务分发到每个声明了某项能力的对接方（`all` / `first` / `best`） |

在 `config.yaml` 中配置已知对接方：

```yaml
a2a_agents:
  researcher:
    url: "http://research-box.local:9900"
    auth: { type: bearer, token: "..." }
    timeout: 120
    capabilities: [web_search, research]
```

然后直接问：*“让 researcher 智能体总结今天 arXiv 上的帖子。”* 也可以直接使用 URL——`a2a_call` 接受任何 A2A 端点。

## 入站：可被调用

启用该平台后，Hermes 会提供：

- **Agent Card**，位于 `GET /.well-known/agent-card.json`（v1.0 规范路径；旧版的 `agent.json` 也可响应）——声明你的智能体名称、技能（从已启用的工具集推导）和认证要求。
- **JSON-RPC 2.0**，位于 `POST /` ——规范的 v1.0 方法（`SendMessage`、`SendStreamingMessage`、`GetTask`、`ListTasks`、`CancelTask`、`SubscribeToTask`、推送通知配置的增删改查）以及 1.0 之前的路径式别名（`message/send` 等）。
- 针对 `SendStreamingMessage` 的 **SSE 流式传输**，帧格式为符合规范的 JSON-RPC 封装。
- 针对长时间运行任务的**推送通知**（webhook），使用 HMAC-SHA256 签名。

入站任务会注入到**运行中的网关会话**——即服务于你其他渠道的同一个智能体、记忆和工具——最终回复会作为任务结果返回给调用方。对话以 A2A 的 `contextId` 为键，因此对接方可以进行多轮交流。

互操作性已针对官方 Python `a2a-sdk`（卡片解析、`SendMessage`、流式传输）验证通过。

## 安全模型

默认安全；每一次放宽都是显式操作：

- **无令牌 ⇒ 仅限 localhost。** 服务器绑定 `127.0.0.1`。远程暴露需要 bearer 令牌**并**显式设置 `A2A_HOST`。
- **每个对接方独立令牌** — `A2A_PEER_TOKENS="alice:tok1,bob:tok2"` 给每个对接方单独的凭据；认证得到的名称驱动速率限制、信任和审计。
- **提示注入过滤** — 入站文本会被过滤，并被框定为不受信任的对接方输入。远程对接方无法调用操作员的斜杠命令。
- **出站脱敏** — 形如凭据的字符串（API 密钥、JWT、令牌）会从回复中抹除。
- **审计日志** — 每次交互都会追加到 `~/.hermes/a2a_audit.jsonl`。
- **防循环** — 按上下文的轮次上限阻止两个智能体无限乒乓交互。

## 配置参考

| 环境变量 | 默认值 | 含义 |
|---|---|---|
| `A2A_PEER_TOKENS` | _（未设置）_ | 每个对接方的凭据 `name:token,…`（推荐） |
| `A2A_BEARER_TOKEN` | _（未设置）_ | 共享令牌；身份回退到调用方 IP |
| `A2A_HOST` | `127.0.0.1` | 绑定主机——仅当设置了令牌时才会放宽 |
| `A2A_PORT` | `9900` | 入站端口 |
| `A2A_AGENT_NAME` | 由主机名推导 | Agent Card 上的名称 |
| `A2A_PUBLIC_URL` | _（未设置）_ | 在卡片上声明的可路由 URL（反向代理 / k8s） |
| `A2A_TRUSTED_PEERS` | _（未设置）_ | 已认证身份的允许列表 |
| `A2A_ALLOW_ALL_USERS` | `false` | 允许任何已认证的对接方（仅用于开发） |
| `A2A_RATE_LIMIT` | `60` | 每个身份每分钟的请求数 |
| `A2A_MAX_PINGPONG_TURNS` | `5` | 每个上下文的防循环轮次上限（最大 20） |
| `A2A_REPLY_TIMEOUT` | `300` | 等待智能体回复的秒数。孤儿任务清扫永远不会在这个窗口结束前判定任务失败（下限 300 秒），也永远不会在仍有请求在等待该任务时判定失败 |
| `A2A_PUSH_SECRET` | bearer 令牌 | 用于推送通知签名的 HMAC 密钥 |
| `A2A_ADVERTISED_TOOLSETS` | 所有已注册的 | 限制出现在 Agent Card 上的技能 |

在反向代理或 Kubernetes Service 后面，设置 `A2A_PUBLIC_URL`（或依赖 `X-Forwarded-Host`/`X-Forwarded-Proto`），以便 Agent Card 声明的 URL 是对接方真正可以回调的。

## 快速测试

```bash
# 从另一台机器 / 另一个智能体：
curl http://your-host:9900/.well-known/agent-card.json

curl -X POST http://your-host:9900/ \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer <token>' \
  -d '{"jsonrpc":"2.0","id":1,"method":"SendMessage",
       "params":{"message":{"messageId":"m1","role":"ROLE_USER",
                 "parts":[{"text":"What tools do you have?"}]}}}'
```

## 故障排查

- **对接方无法访问卡片 URL** — 卡片声明的是你的绑定地址；将 `A2A_PUBLIC_URL` 设为对外可路由的 URL。
- **`401 Unauthorized`** — 令牌不匹配；检查服务器上的 `A2A_PEER_TOKENS`/`A2A_BEARER_TOKEN` 以及对接方的 `auth:` 块。
- **服务器无法绑定非 localhost** — 这是设计使然：先设置 bearer 令牌，然后设置 `A2A_HOST=0.0.0.0`。
- **长时间任务的回复超时** — 调高 `A2A_REPLY_TIMEOUT`（孤儿清扫会随之调整，因此迟到的回复会被存储而非丢弃），或让调用方注册推送通知配置并轮询 `GetTask`。
