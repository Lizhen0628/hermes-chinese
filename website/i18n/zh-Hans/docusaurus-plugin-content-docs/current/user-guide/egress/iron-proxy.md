# 出站凭证注入代理（iron-proxy）

当 Hermes 在 Docker 终端沙箱内运行你的智能体时，该沙箱通常会持有你真实的上游 API 密钥（`OPENROUTER_API_KEY`、`OPENAI_API_KEY` 等）。沙箱中被提示注入的智能体可以执行 `cat ~/.config/openrouter/auth.json` 或 `printenv | grep -i key` 并将其窃取外传。

出站代理解决了这个问题：沙箱持有的是不透明的**代理令牌**，而非真实的密钥。沙箱的所有出站流量都经由宿主机上的本地 [iron-proxy](https://github.com/ironsh/iron-proxy) 守护进程（Apache-2.0，Go），该进程终止 TLS，并在将请求转发到上游之前把代理令牌替换为真实凭证。即使沙箱被攻破，攻击者拿到的令牌也仅在**所配置的可信代理边界**内有效——CA 私钥与代理端点完整性同样属于这一边界的一部分。如果流量可被重定向到由攻击者掌控的代理基础设施（例如 CA 私钥被盗或代理端点被劫持），令牌保障就不再成立。

本版本仅将出站代理接入 Docker 后端。Modal、Daytona、SSH 和 Singularity **尚未**获得代理环境变量或 CA 挂载。

## 它是什么

- 一个托管在宿主机上的 `iron-proxy` 子进程，按需安装到 `~/.hermes/bin/iron-proxy`
- 一个位于 `~/.hermes/proxy/ca.crt` 的本地 CA，沙箱信任该 CA，从而使 iron-proxy 能够对 TLS 进行中间人攻击并重写头部
- 一个位于 `~/.hermes/proxy/proxy.yaml` 的 `proxy.yaml` 配置，列出你允许的上游主机以及 secrets-transform 映射
- 一个 `mappings.json`，记录哪个代理令牌对应哪个真实环境变量

沙箱获得 `HTTPS_PROXY=http://host.docker.internal:9090`、`HTTP_PROXY=http://host.docker.internal:9091`，以及将标准服务商环境变量（如 `OPENROUTER_API_KEY`）设置为不透明的代理令牌。相匹配的 `HERMES_PROXY_TOKEN_<ENV_NAME>` 别名也会导出，用于诊断。现有的服务商 SDK 读取常规的环境变量名，在 `Authorization` 中发送代理令牌，然后 iron-proxy 的 `secrets` 转换会从宿主机侧的守护进程环境中取来真实的值进行替换。

## 它不是什么

- 它**不是**入站的 `hermes proxy` 命令，那个命令是 OAuth 聚合反向代理。命令不同（`hermes egress`），方向也不同。
- 它**不**位于你本地终端和服务商之间——只介于沙箱和服务商之间。
- 它**不**为宿主机进程进行的进程内 LLM 调用重写凭证。那些调用继续直接使用你的 `.env` 密钥。威胁模型针对的是**沙箱**，而非宿主机。

## 快速开始

```bash
# 1. 安装 iron-proxy 二进制文件（固定版本，经过 SHA-256 校验）
hermes egress install

# 2. 运行向导：生成 CA，为你环境中的每个服务商密钥铸造代理令牌，
#    写入 proxy.yaml。
hermes egress setup

# 3. 启动代理守护进程
hermes egress start

# 4. 检查状态
hermes egress status
```

`hermes egress setup` 会从你的环境中发现服务商密钥。如果你的密钥仅存于 `~/.hermes/.env`（未导出到你的 shell），setup 会自动读取该文件——你无需先 `export` 它们。

当你之后重新运行 `setup` 时（新增允许列表主机、轮换令牌、切换凭证来源），它会停止正在运行的守护进程（因为其配置保存在内存中），然后**主动提出为你重启它**，使更改立即生效。在 tty 上它会询问；传入 `--restart` 总是重启，或传入 `--no-restart` 让其保持停止状态。要在其他任何时候应用更改，`hermes egress restart` 就是一条命令完成停止再启动。

一旦运行起来，Docker 终端后端会自动：

- 将 `~/.hermes/proxy/ca.crt` 挂载到沙箱内的 `/etc/ssl/certs/hermes-egress-ca.crt`
- 设置 `HTTPS_PROXY`、`HTTP_PROXY`、`REQUESTS_CA_BUNDLE`、`SSL_CERT_FILE`、`CURL_CA_BUNDLE`、`NODE_EXTRA_CA_CERTS`，使每一种常见的 HTTP 运行时都经由代理路由并信任该 CA
- 设置 `NODE_OPTIONS=--use-openssl-ca`（追加到你在 `docker_env.NODE_OPTIONS` 中已有的内容之后），使 Node.js 经由受其他 CA bundle 变量控制的 OpenSSL 存储进行路由——关于残留缺口，请参见下方的 [Node.js 非对称 CA 注意事项](#nodejs-asymmetric-ca-caveat)
- 添加 `--add-host=host.docker.internal:host-gateway`，使沙箱在 Linux 上能够访问宿主机侧的代理（Docker Desktop 在 macOS/Windows 上会自动处理此项）
- 以标准服务商环境变量名导出代理令牌（例如 `OPENROUTER_API_KEY`），并为每个铸造出的映射额外导出一个 `HERMES_PROXY_TOKEN_<ENV_NAME>` 诊断别名

## 配置

完整配置位于 `~/.hermes/config.yaml` 的 `proxy:` 段下。各项默认值均在行内注释中说明；所有配置项均为可选。

```yaml
proxy:
  # 总开关。为 false 时该功能完全无操作 —— 不下载
  # 二进制文件、不添加 docker 挂载、不启动子进程。
  enabled: false

  # 隧道监听端口。沙箱会访问 http://host.docker.internal:<port>。
  tunnel_port: 9090

  # 首次使用时自动下载固定版本的 iron-proxy 二进制文件。
  auto_install: true

  # iron-proxy 在出站时查找真实上游密钥的位置。
  #   env       — 进程环境变量（默认）。代理启动时你 ~/.hermes/.env
  #               中的内容即为事实来源。
  #   bitwarden — 每次代理重启时从 Bitwarden Secrets Manager 重新获取。
  #               在 BW Web 应用中的轮换会直接生效，无需改动 .env。
  #               需要 `secrets.bitwarden.enabled: true`。
  credential_source: env

  # 为 true（默认）时，如果代理已启用但未运行，Docker 后端会拒绝
  # 启动沙箱。设为 false 可在代理不可用时回退到旧的
  # “沙箱内使用真实凭据”姿态。
  enforce_on_docker: true

  # 当 `credential_source: bitwarden` 但缺少 BWS access token /
  # project_id，或者 bws 获取对已映射服务商未返回任何值时，
  # 守护进程默认会报错（符合“我要求轮换 —— 不要悄悄使用陈旧的
  # env 值”的精神）。设为 true 可重新启用旧的宿主机 env 回退
  # —— 适用于想开始切换到 BW 模式但尚未配置完成所有密钥的
  # 迁移场景。
  allow_env_fallback: false

  # 应用于出站流量的 SSRF 拒绝列表。省略 / 保持 null 则
  # 使用安全默认值：回环（v4 + v6）、link-local（含云
  # 元数据 IP 169.254.169.254）、RFC1918、IPv6 ULA、IPv4-mapped-v6、
  # CGNAT，以及 RFC2544 基准测试网段。设为显式的 `[]`
  # 可完全退出（仅在封闭测试中合理）。
  upstream_deny_cidrs: null

  # 在捆绑默认值之外额外允许的上游主机。
  # 支持通配符（`*.foo.com`）。默认覆盖 OpenRouter、
  # OpenAI、Anthropic、Google、xAI、Mistral、Groq、Together、DeepSeek、
  # 以及 Nous Research。
  extra_allowed_hosts: []
```

### 默认允许的上游主机

```
openrouter.ai           *.openrouter.ai
api.openai.com          api.anthropic.com
generativelanguage.googleapis.com
api.x.ai                api.mistral.ai
api.groq.com            api.together.xyz
api.deepseek.com        inference.nousresearch.com
```

如果你的智能体需要不在列表中的上游 —— 自托管推理端点、额外的云端 LLM、MCP 服务器 —— 将其添加到 `proxy.extra_allowed_hosts`。通配符按完整主机名匹配（`*.example.com` 匹配 `api.example.com` 与 `staging.example.com`，但不匹配 `example.com` 本身）。

### 默认 SSRF 拒绝 CIDR

无论允许列表如何都会应用。这些网段会在网络边界被 iron-proxy 拒绝，因此通过允许列表主机名进行的 DNS 重绑定攻击也无法触达 IMDS 或你的内部网络：

| CIDR | 用途 |
|---|---|
| `127.0.0.0/8`、`::1/128` | 回环（v4 + v6） |
| `169.254.0.0/16`、`fe80::/10` | Link-local —— **含位于 `169.254.169.254` 的 AWS / GCP / Azure IMDS** |
| `10.0.0.0/8`、`172.16.0.0/12`、`192.168.0.0/16` | RFC1918 |
| `fc00::/7` | IPv6 ULA |
| `::ffff:0:0/96` | IPv4-mapped IPv6 —— 封堵双栈 IMDS 绕过 |
| `100.64.0.0/10` | RFC6598 CGNAT（AWS VPC、K8s pod 网络使用） |
| `198.18.0.0/15` | RFC2544 基准测试网段 |

要覆盖：将 `proxy.upstream_deny_cidrs` 设为你自己的列表。要完全退出（例如需要访问回环上游的封闭测试）：将其设为空列表 `[]`。

### 绑定策略

代理从不绑定 `0.0.0.0`。默认绑定因平台而异，因为 iron-proxy v0.39 仅支持**每个守护进程单一绑定**：

- **Linux：**Docker 网桥网关（默认为 `172.17.0.1:<tunnel_port>`）。容器通过 `host.docker.internal` 访问代理，而 `--add-host=host.docker.internal:host-gateway` 会将其解析为该网桥网关 IP —— 仅回环绑定在沙箱内将不可达。网桥 IP 是宿主机 `docker0` 接口上的地址，因此不会暴露到局域网；它可被默认网桥网络上的其他容器访问，但请求仍需铸造过的代理 token 与允许列表中的上游。若未检测到 Docker 网桥（Docker 未安装 / 未运行），绑定将带着警告回退到回环。
- **macOS / Windows Docker Desktop：**回环（`127.0.0.1:<tunnel_port>`）。Desktop 的 VPNkit 将 `host.docker.internal` 路由到宿主机，因此回环在容器内可达，且暴露面最小。

持有泄露代理 token 的局域网对端也无法使用代理 —— 两种绑定都无法从外部网络访问。

我们还固定 `metrics.listen: 127.0.0.1:0`，使守护进程内置的 metrics 服务器获得一个临时回环端口，而不是其默认的 `:9090` —— 否则它会与 `tunnel_port: 9090` 争夺同一套接字，守护进程将以 “address already in use” 拒绝启动。注意 `:0` 临时端口每次启动都随机且不在任何地方公开，因此在

如果 PATH 中更靠前的恶意 `ip` 垫片曾能将非私有 IPv4 注入为网桥地址（`0.0.0.0`、公网地址、组播、link-local 等），回环回退仍然适用 —— 我们从不绑定任何未能通过 `ipaddress.IPv4Address` + `is_*` 校验的地址。

## 支持的认证方案

`secrets` 转换会在匹配位置出现代理令牌的任何地方将其替换——而且它能匹配的不止 `Authorization: Bearer`：

| 服务商 | 环境变量 | 替换位置 |
|---|---|---|
| OpenRouter、OpenAI、Groq、Together、DeepSeek、Mistral、xAI、Nous | `*_API_KEY` | `Authorization` 请求头 |
| Anthropic 原生 | `ANTHROPIC_API_KEY` | `x-api-key` + `Authorization` |
| Azure OpenAI | `AZURE_OPENAI_API_KEY` | `api-key` + `Authorization`（`*.openai.azure.com`、`*.cognitiveservices.azure.com`、`*.services.ai.azure.com`） |
| Google AI Studio (Gemini) | `GEMINI_API_KEY` / `GOOGLE_API_KEY` | `x-goog-api-key` 请求头或 `?key=` 查询参数 |

`GEMINI_API_KEY` 和 `GOOGLE_API_KEY` 被视为同一个凭据：只生成一个代理令牌，并以**两个**名称注入沙箱，而主机环境变量中任意一个名称都能满足发现逻辑。

## 未覆盖的服务商

涉及请求签名或由 SDK 生成 OAuth 的认证方案无法通过静态请求头替换来替换——如果这些服务商的环境变量存在，沙箱中会持有这些服务商的**真实凭据**，对于它们而言出口隔离保证是不完整的：

| 环境变量 | 服务商 | 原因 |
|---|---|---|
| `AWS_ACCESS_KEY_ID`、`AWS_SECRET_ACCESS_KEY` | AWS Bedrock / SageMaker | SigV4 签名请求 |
| `GOOGLE_APPLICATION_CREDENTIALS` | GCP Vertex AI | 从服务账号文件生成 OAuth |

这些环境变量在大多数开发者的笔记本上因无关工具（terraform、gcloud、aws CLI、ECR push）而存在。它们会在向导和 `hermes egress status` 中显示为警告，但从不阻止代理启动。如果你不在沙箱中使用这些服务商，请 `unset` 这些变量以清除警告。

## Bitwarden 集成

如果你已经通过 [`hermes secrets bitwarden setup`](../secrets/bitwarden) 使用 Bitwarden Secrets Manager，那么出口代理可以从那里拉取真实凭据，而不是从 `os.environ`：

```bash
hermes egress setup --from-bitwarden
```

这会设置 `proxy.credential_source: bitwarden` 并从你的 BW 项目中发现服务商环境变量名称。

### 轮换语义

当 `credential_source: bitwarden` 时，iron-proxy 守护进程**每次启动时**都会通过 `bws secret list <project_id>` 从 BWS 重新获取密钥。因此轮换流程为：

1. 在 Bitwarden Web 应用中轮换密钥。
2. 在主机上执行 `hermes egress stop && hermes egress start`。
3. 此后启动的沙箱会将代理令牌替换为新值。

无需编辑 `.env`。无需在主机上重启 Hermes。代理守护进程是唯一接触新值的东西——你的主机进程和 `os.environ` 不受影响。

### 启动时大声报错

当 `credential_source: bitwarden` 时，`hermes egress start` 在向导层进行预检查，并且 `_build_proxy_subprocess_env` 在守护进程层重新检查：

- BWS 访问令牌环境变量未设置 → 拒绝启动，并提示你 `unset` 后重新运行，或者使用 `hermes egress setup --no-bitwarden` 切回 env 模式
- `secrets.bitwarden.project_id` 为空 → 拒绝启动，并提示你运行 `hermes secrets bitwarden setup`
- `bws secret list` 对一个或多个已映射的服务商未返回任何值 → 拒绝启动，并列出缺失的名称

这是有意为之的。在 BW 模式下回退到主机环境变量会重新引入 BW 路径本就要击败的陈旧性 bug（运维选择 BW 是为了轮换保证；静默回退会破坏这一保证）。

`proxy.allow_env_fallback: true` 配置标志会重新启用旧行为——即“如果 BWS 不可达则静默回退到主机环境变量”——用于迁移场景。当你正在逐个将密钥迁入 BW，并希望守护进程以当前可获取的任意值启动时，可以使用它。

### 切换凭据来源

| 从 | 到 | 命令 |
|---|---|---|
| env | bitwarden | `hermes egress setup --from-bitwarden` |
| bitwarden | env | `hermes egress setup --no-bitwarden` |

**不使用任何标志重新运行 `hermes egress setup` 会保留现有的 `credential_source`**——向导拒绝静默将你降级回 env。这一点很重要，因为一旦你配置了 bitwarden 模式，轮换保证就是你所要的；你必须明确表示“我想再次使用 env”才能更改它。

## 斜杠命令

CLI 子命令树：

```
hermes egress install                  # 下载固定版本的 iron-proxy 二进制文件
hermes egress install --force          # 即使已存在受管副本也重新下载

hermes egress setup                    # 交互式向导
hermes egress setup --tunnel-port N    # 覆盖隧道监听端口
hermes egress setup --from-bitwarden   # 使用 BWS 作为凭据来源（失败时显式报错）
hermes egress setup --no-bitwarden     # 显式切回环境变量模式
hermes egress setup --rotate-tokens    # 为每个服务商生成全新令牌
                                       #   （默认保留现有令牌）

hermes egress start                    # 启动受管代理守护进程
hermes egress stop                     # SIGTERM（宽限 5 秒后 SIGKILL）
hermes egress restart                  # 先停止（若正在运行）再启动 — 当上游
                                       #   SECRETS 变更（轮换、新服务商）时需要
hermes egress reload                   # 通过管理 API 从 proxy.yaml 热重载规则集
                                       #   — 无需重启，不丢弃连接
                                       #   （allowlist / mapping 编辑）

hermes egress status                   # 二进制 + 配置 + pid + 监听状态 + 映射
hermes egress status --show-tokens     # 完整打印代理令牌
                                       #   （默认：仅显示脱敏前缀 + 后缀）

hermes egress disable                  # 将 proxy.enabled 置为 false
                                       #   （不会停止正在运行的代理）

hermes egress config                   # 打印 proxy.yaml 的路径以便调试
```

### 令牌轮换

默认情况下，`hermes egress setup` **保留**已拥有代理令牌的服务商的令牌。添加新服务商时仅为新服务商生成新令牌；现有令牌保持不变。这避免了在重新运行向导时导致正在运行的沙箱返回 401。

`--rotate-tokens` 会轮换所有令牌：

```bash
hermes egress setup --rotate-tokens
```

当存在现有令牌且 stdin 为 tty 时，向导会提示确认：

```
⚠  --rotate-tokens will invalidate proxy tokens in every running
   Hermes sandbox.  They will start 401-ing against upstreams until restarted.
Type 'rotate' to confirm:
```

非 tty 调用（CI、脚本）会跳过提示 — 该标志被视为有意指定。在任何覆盖之前，当前的 `mappings.json` 会被复制为一个带时间戳的同级文件，以便手动恢复：

```
backup: ~/.hermes/proxy/mappings.json.rotated-20260524T143012
```

`hermes egress setup` 在重写配置或令牌映射时会停止正在运行的守护进程，因为守护进程在内存中保留着旧的 YAML。在执行 `--rotate-tokens` 之后：

```bash
hermes egress start
```

已在运行的容器持有旧令牌，需要重启以获取新令牌。新的持久化 Docker 容器包含一个 egress-posture 标签，因此 Hermes 不会为新会话复用一个 egres 之前或轮换之前的容器。

## 状态目录布局

iron-proxy 维护的所有内容都位于 `~/.hermes/proxy/`：

| 路径 | 模式 | 用途 |
|---|---|---|
| `~/.hermes/proxy/`（目录） | `0o700` | 仅你持有并可遍历 |
| `ca.crt` | `0o644` | 分发到沙箱中的公共 CA 证书 |
| `ca.key` | `0o600` | CA 签名密钥 — 永不离开主机 |
| `proxy.yaml` | `0o600` | iron-proxy 配置；每次 `setup` 都重写 |
| `mappings.json` | `0o600` | 沙箱代理令牌 → 上游环境变量 |
| `mappings.json.rotated-*` | `0o600` | 由 `--rotate-tokens` 创建的备份 |
| `iron-proxy.pid` | `0o600` | 正在运行的守护进程的 PID |
| `iron-proxy.nonce` | `0o600` | 用于 PID 回收防御的每次启动 nonce |
| `iron-proxy.log` | `0o600` | 守护进程 stdout/stderr — **在 v0.39 上包含每请求记录** |
| `audit.log` | `0o600` | 留给未来二进制版本的专用每请求审计流；预先创建以便上游接入时隐私契约生效 |

CA 私钥是最敏感的文件。它从第一个字节起就以 `0o600` 创建（不存在 umask 窗口期的 TOCTOU）并使用 `O_NOFOLLOW`，因此同 uid 的攻击者无法通过植入符号链接来重定向它。pidfile、nonce 文件、守护进程日志和审计日志均采用相同处理方式。

### iron-proxy v0.39 上的日志记录

在当前锁定的二进制版本（**v0.39.0**）上，iron-proxy 会把所有输出——守护进程级诊断信息和每请求记录——都写入 **`~/.hermes/proxy/iron-proxy.log`**。v0.39 的 `config.Log` 结构体没有单独的 `audit_path` 字段，因此我们无法在该版本上把每请求记录路由到专用输出流。

我们仍然预创建 `~/.hermes/proxy/audit.log`，权限为 `0o600` 并使用 `O_NOFOLLOW`，原因如下：

1. 它为未来的版本升级预留路径：当锁定的版本切换为支持 `log.audit_path` 的版本后，每请求记录将自动开始流入该文件，无需运维侧重新配置。**在那之前，该文件保持为 0 字节——切勿将监控、告警或取证工具指向它。** 目前一切都使用 `iron-proxy.log`。
2. 从第一个字节起即保证 0o600 权限，可防范上游修复后的那一天——即当 v0.40+ 发现文件不存在时，会以默认 umask 创建该文件。

在该版本升级落地之前，请将 `iron-proxy.log` 视为两类读者的唯一事实来源：

- 守护进程级事件（启动横幅、绑定错误、关闭原因、转换错误）。运维与故障排查。
- 每请求记录（对允许列表内的上游发起 CONNECT、密钥替换触发、允许列表拒绝）。取证与合规。

两个文件在多次重启之间均为追加写入。如果你在意长期运行主机上的磁盘占用，可用 logrotate 对它们进行轮转。

## 工作原理

```
┌──────────────┐                ┌──────────────┐                ┌─────────────┐
│ Docker       │ CONNECT /     │ iron-proxy    │ HTTPS w/       │ OpenRouter  │
│ sandbox      ├──────────────▶│ (host:9090)   ├───────────────▶│ / OpenAI /  │
│              │ HTTP forward  │               │ real API key   │ Anthropic …  │
│ has:         │ w/ proxy tok  │ mints leaf    │                │             │
│ - proxy tok  │ in Auth hdr   │ cert from CA  │                │             │
│ - CA cert    │               │ matches token │                │             │
│ - HTTPS_PROXY│               │ swaps secret  │                │             │
└──────────────┘               └──────────────┘                └─────────────┘
                                       │
                                       │ daemon + per-request log (combined on v0.39)
                                       ▼
                              ~/.hermes/proxy/iron-proxy.log
                              (~/.hermes/proxy/audit.log reserved for v0.40+ split stream)
```

1. 沙箱发起 HTTPS 请求，例如 `POST https://openrouter.ai/v1/chat/completions`，并带有 `Authorization: Bearer hermes-proxy-openrouter-…`（这是代理令牌，不是真实密钥）。
2. 由于设置了 `HTTPS_PROXY`，请求以 CONNECT 隧道的形式发往 iron-proxy。
3. iron-proxy 检查允许列表。`openrouter.ai` 被允许。
4. iron-proxy 为 `openrouter.ai` 签发出由我们的 CA 签名的叶子证书，终止 TLS 连接，检查该请求。
5. `secrets` 转换会匹配 `Authorization` 头中的代理令牌字符串，并替换为来自 iron-proxy 自身环境的真实 `OPENROUTER_API_KEY` 值。
6. 请求被重新加密并转发给 OpenRouter。
7. 在 v0.39 上，该请求被记录到 `~/.hermes/proxy/iron-proxy.log`。当锁定的二进制版本支持分流输出（v0.40+）时，每请求记录将流入 `~/.hermes/proxy/audit.log`，而守护进程级诊断信息将保留在 `iron-proxy.log`。参见 [iron-proxy v0.39 上的日志记录](#logging-on-iron-proxy-v039)。

对不在允许列表中的主机的请求（例如 `https://attacker.example.com/leak?key=...`）将在任何字节离开主机之前以 HTTP 403 被拒绝。拒绝记录会连同上游主机和来源沙箱写入 `iron-proxy.log`。

### 向沙箱分发 CA

当 Docker 后端以 `proxy.enabled: true` 启动容器且守护进程正在监听时，它会向 `docker run` 添加以下参数：

| 参数 | 用途 |
|---|---|
| `-v ~/.hermes/proxy/ca.crt:/etc/ssl/certs/hermes-egress-ca.crt:ro` | 以只读方式挂载 CA |
| `-e HTTPS_PROXY=http://host.docker.internal:9090` | Python httpx / curl / go 默认传输 / Node fetch |
| `-e HTTP_PROXY=http://host.docker.internal:9091` | curl + wget 用于纯 HTTP——纯 HTTP 转发监听器位于 `tunnel_port + 1` |
| `-e NO_PROXY=127.0.0.1,localhost,::1` | 沙箱内的回环开发服务器绕过代理 |
| `-e REQUESTS_CA_BUNDLE=…ca.crt` | Python `requests` |
| `-e SSL_CERT_FILE=…ca.crt` | Python `ssl` 模块 / OpenSSL——**替换**系统存储 |
| `-e CURL_CA_BUNDLE=…ca.crt` | curl——**替换**系统存储 |
| `-e NODE_EXTRA_CA_CERTS=…ca.crt` | Node.js——**追加**到系统存储 |
| `-e NODE_OPTIONS="<your value> --use-openssl-ca"` | Node.js——通过 OpenSSL 存储路由（追加；你的 `--max-old-space-size` 等设置会被保留） |
| `-e HERMES_EGRESS_PROXY=1` | 哨兵值，智能体可读取以知晓自身具备代理感知能力 |
| `-e OPENROUTER_API_KEY=<proxy-token>` | 标准服务商环境变量名会收到代理令牌，从而使现有 SDK 继续可用 |
| `-e HERMES_PROXY_TOKEN_<NAME>=…` | 每个映射的诊断别名；值与标准服务商环境变量相同 |
| `--add-host=host.docker.internal:host-gateway` | 仅限 Linux；Docker Desktop 会自动映射它 |

#### Node.js 非对称 CA 的注意事项

`REQUESTS_CA_BUNDLE` / `SSL_CERT_FILE` / `CURL_CA_BUNDLE` 会**替换**沙箱内的系统 CA 存储。`NODE_EXTRA_CA_CERTS` 则是**追加**到其中。沙箱内的 Node.js 进程原则上可以通过打开原始 `net.Socket` 并自行发起 TLS 握手来绕过代理——系统 CA 存储仍然会信任真实的上游证书，因此该请求会成功，而 Python / curl 则会因验证失败而拒绝。

`NODE_OPTIONS=--use-openssl-ca` 会追加到你已有的 `docker_env.NODE_OPTIONS` 之后。这会强制 Node 使用由 `SSL_CERT_FILE` 控制的 OpenSSL 存储，从而缩小这一非对称性。它无法覆盖那些显式向 `tls.connect()` 或 `https.request()` 传入自有 `ca` 选项的代码，但能封堵住最容易被利用的情况。

这是 v1 的已知限制。请关注 [github.com/ironsh/iron-proxy/issues](https://github.com/ironsh/iron-proxy/issues) 以获取上游解决方案；在此之前，请勿在你依赖出口隔离的沙箱中运行会打开原始套接字的不可信 Node 代码。

### docker\_env 冲突

如果你在 `docker_env:` 配置块中设置了控制代理的环境变量（虽罕见但可能），当启用 `enforce_on_docker: true` 时，Hermes 会拒绝启动沙箱。这包括以下两类：

- 出口控制变量：`HTTPS_PROXY`、`HTTP_PROXY`、`NO_PROXY`、`REQUESTS_CA_BUNDLE`、`SSL_CERT_FILE`、`CURL_CA_BUNDLE`、`NODE_EXTRA_CA_CERTS`
- 真实服务商环境变量：`mappings.json` 中的每一个名称（例如 `OPENROUTER_API_KEY`、`OPENAI_API_KEY`）

错误示例：

```
docker_env in config.yaml overrides egress-proxy variables
['HTTPS_PROXY', 'OPENROUTER_API_KEY']; enforce_on_docker is enabled.
Remove these keys from docker_env or disable enforce_on_docker to
opt out of egress isolation.
```

当 `enforce_on_docker: false` 时，相同情况会以警告的形式呈现，且你的 `docker_env` 值会优先生效——这对迁移或测试很有用，但这意味着你明确选择退出隔离保证。

## PID 与 nonce 防护

守护进程的 pidfile 在写入时使用了 `O_EXCL` + `O_NOFOLLOW` + 所有权检查。并发的 `hermes egress start` 调用会产生以下两种结果之一：

- 现有 pidfile 指向一个存活中的 iron-proxy → 第二次启动会拒绝，提示 "another start in progress" 并附带运行 `hermes egress stop` 的提示
- 现有 pidfile 已失效（守护进程崩溃）→ 第二次启动会将其解除链接并重试一次

除此之外，每次 `start_proxy` 都会在两处植入新的随机 nonce：

- 守护进程环境中的 `HERMES_IRON_PROXY_NONCE=<nonce>`
- `~/.hermes/proxy/iron-proxy.nonce`（pidfile 的同级文件，权限 0o600）

当 `hermes egress stop`（或任何其他 `_pid_alive` 检查）想要确认某个 PID 仍然指向*我们的*守护进程——而非 iron-proxy 崩溃后恰好被分配到同一 PID 的不相关进程——它会读取 `/proc/<pid>/environ` 并查找 nonce。磁盘上的副本正是让这在跨 CLI 调用时依然可行的关键（内存中的 `_proxy_nonce` 是进程级的，每次调用 `hermes` 都会重置）。

如果 nonce 检查失败，代码会回退到将 `argv[0]` 的 basename 与 `iron-proxy` 进行匹配。`stop_proxy` 还会在发送 SIGTERM 之前捕获 `/proc/<pid>/stat` 的 starttime，并在 5 秒宽限期后再次验证——如果 starttime 发生了变化，说明该 PID 在等待期间被回收，此时会抑制 SIGKILL 并发出警告。

## 安全模型

**它能防护的情况：**

- 在 Docker 沙箱中被提示注入的智能体通过读取 `printenv` / 凭据文件并外泄真实密钥。
- 沙箱中受损的依赖向任意主机回传——默认拒绝的允许列表会封堵未知目的地。
- 智能体拨打云元数据端点（`169.254.169.254`）——iron-proxy 默认通过 `upstream_deny_cidrs` 拒绝这些地址，包括 IPv4 映射的 v6 形式 `::ffff:169.254.169.254`。
- 通过允许列表中的主机名对私有 IP 进行 DNS 重绑定——拒绝 CIDR 是在连接时检查的，而非在允许列表构建时。
- 同 uid 的本地进程读取 iron-proxy 守护进程的环境变量以窃取密钥——只有 mappings 引用的环境变量名会被转发，而不是完整的主机环境。
- 局域网对端盗用泄露的沙箱代理令牌消耗你的 API 配额——代理绑定的是 Docker 网桥网关（Linux）或回环（Docker Desktop），绝不会是 `0.0.0.0`，因此从外部网络无法访问它。

**它无法防护的情况：**

- 受损的主机进程。如果智能体进程本身已受损，主机 `~/.hermes/.env` 中的真实密钥无论如何都会暴露。这是一个针对*沙箱*受损的纵深防御特性，而非针对主机受损。
- **可信代理边界本身的失效。** 令牌交换保证基于一个前提：沙箱信任已挂载的 CA 证书（`/etc/ssl/certs/hermes-egress-ca.crt`），且流量确实抵达*我们的* iron-proxy。如果 CA 私钥被窃取，或沙箱出口被重定向至攻击者控制的代理基础设施，那么中间人攻击者就能出示有效的叶证书，代理令牌便不再是有效的边界（参见 [MITRE ATT&CK T1588.004](https://attack.mitre.org/techniques/T1588/004/) —— 获取 TLS 证书材料以实现 AiTM）。请相应地保护好 CA 密钥（权限为 `0600`，仅限主机）和代理端点。
- 通过使用原始套接字绕过 `HTTPS_PROXY` 的沙箱进程。代理无法拦截不经过它的流量。Node.js 通过 `NODE_OPTIONS=--use-openssl-ca` 得到了部分缓解（见上文注意事项）。
- 显式挂载进 Docker 的凭据文件（`terminal.credential_files` 或技能注册的挂载）。出口防护保护的是服务商环境变量；它不检查任意挂载的文件。请勿将真实的服务商凭据挂载进启用了出口隔离的沙箱。
- 允许列表主机上的数据外泄。如果 `api.openai.com` 被允许，智能体可以将外泄数据嵌入到发往该主机的请求体中。守护进程日志会记录下请求发生过，但无法阻止它。
- 未覆盖的服务商（AWS Bedrock SigV4、GCP Vertex 服务账号 OAuth）。它们的环境变量会留在沙箱中；如果你启用了它们，这些凭据会完全绕过代理。参见[未覆盖的服务商](#uncovered-providers)。
- iron-proxy 对内存中密钥的归零处理。Go 二进制文件在进程内存中持有替换进去的真实凭据；来自同 uid 攻击者的核心转储或 `/proc/<pid>/mem` 读取都会暴露它们。这超出本层的防护范围。

## 失败模式

- **二进制未安装，`auto_install: true`** — 首次运行 `hermes egress setup` 或 `hermes egress start` 时会自动下载。SHA-256 会与上游 `checksums.txt` 进行校验。
- **二进制未安装，`auto_install: false`** — `start` 会失败并给出指向手动安装的清晰提示信息。
- **`enabled: true` 但代理未运行** — 当 `enforce_on_docker: true`（默认值）时，Docker 沙箱创建将拒绝启动并给出说明性错误。当 `enforce_on_docker: false` 时，会回退为携带真实凭据的直接出站，并记录一条警告。
- **端口冲突** — iron-proxy 会立即退出；`hermes egress start` 会报告最后 20 行日志并以非零退出码失败。
- **上游主机被拒绝** — 沙箱会从代理收到 HTTP 403，响应体会解释哪个主机未被允许。智能体会看到该错误并报告。
- **请求云元数据 IP（169.254.169.254）** — 无论允许列表如何，均会被 `upstream_deny_cidrs` 拒绝。
- **`docker_env` 与某个代理控制变量冲突（强制开启时）** — 沙箱创建会拒绝，并列出冲突键的名称。
- **`docker_forward_env` 试图转发受保护的服务商密钥（强制开启时）** — 沙箱创建会拒绝；从 `docker_forward_env` 中移除该键，或用 `proxy.enforce_on_docker: false` 选择退出。
- **`docker_extra_args` 覆盖代理环境变量/网络控制（强制开启时）** — 沙箱创建会拒绝；用户提供的 `-e HTTPS_PROXY=...`、`--env-file` 或 `--network` 参数会运行在 Hermes 生成的参数之后，可能绕过出口代理。
- **`credential_source: bitwarden` 时缺少 BWS 访问令牌** — `hermes egress start` 会拒绝，并将 `--no-bitwarden` 作为恢复提示。
- **iron-proxy 在 5 秒内未绑定** — 进程被杀死，pidfile 被删除，错误中会指明端口及 `iron-proxy.log` 的末尾内容。
- **并发调用 `hermes egress start`** — 如果第一个守护进程正在运行，第二次调用会以 "another start in progress" 拒绝；否则第二次调用会删除过期的 pidfile 并继续。

## 故障排除

### "Refusing to start: BWS_ACCESS_TOKEN is not set"

你启用了 `credential_source: bitwarden`，但访问令牌环境变量不在你的 shell 中。可以：

```bash
export BWS_ACCESS_TOKEN=…   # 一次性
hermes egress start
```

或将其移入 `~/.hermes/.env`。也可切换回环境变量模式：

```bash
hermes egress setup --no-bitwarden
```

### "iron-proxy exited immediately"

查看 `~/.hermes/proxy/iron-proxy.log` 的最后 20 行。常见原因：

- 端口已被占用 → 更改 `proxy.tunnel_port`，或杀掉占用 9090 的其他进程
- `proxy.yaml` 无效 → 运行 `hermes egress setup` 重新生成
- CA 证书/密钥权限错误 → `chmod 0o600 ~/.hermes/proxy/ca.key`

### "iron-proxy did not bind \<bind-host\>:9090 within 5s"

守护进程已启动，但从未绑定监听器。通常意味着二进制卡住或启动时做了耗时操作。检查 `~/.hermes/proxy/iron-proxy.log`。孤儿进程会被自动杀死，pidfile 也会被清理，因此你可以直接重试 `hermes egress start`。

### 沙箱连接代理超时（Linux）

容器将 `host.docker.internal` 解析为 docker 网桥网关，且代理绑定在该处，但主机防火墙（通常是默认拒绝 INPUT 的 `ufw`）会丢弃 `docker0` 上容器到主机的流量。可从容器中验证：

```bash
docker run --rm --add-host host.docker.internal:host-gateway busybox \
  nc -zv -w 3 host.docker.internal 9090
```

如果该命令超时，而 `hermes egress status` 显示 `listening`，则在防火墙中允许网桥子网，例如对于 ufw：

```bash
sudo ufw allow in on docker0 to any port 9090 proto tcp
sudo ufw allow in on docker0 to any port 9091 proto tcp
```

（9091 = `tunnel_port + 1` 上的纯 HTTP 转发监听器。）

### 沙箱从代理收到 `HTTP 403`

沙箱内的智能体尝试访问不在 `proxy.extra_allowed_hosts` 中的主机。403 响应体会解释是哪一个主机。若想允许，则添加到配置中：

```yaml
proxy:
  extra_allowed_hosts:
    - api.example.com
    - "*.staging.example.com"
```

然后执行 `hermes egress setup`（以重新生成 `proxy.yaml`）以及 `hermes egress stop && hermes egress start`。

### 沙箱看到 SSL 验证错误

要么是 CA 没有挂载进沙箱（这种情况很罕见；当 `proxy.enabled: true` 时，docker 后端会自动处理），要么是你的镜像里的 HTTP 客户端从一个非标准的环境变量读取。

```bash
# 在沙箱内：
cat /etc/ssl/certs/hermes-egress-ca.crt | head -1
# 应当输出：-----BEGIN CERTIFICATE-----
env | grep -E "^(REQUESTS|CURL|SSL|NODE).*CA"
# 应当列出全部四个指向 /etc/ssl/certs/hermes-egress-ca.crt 的 CA 证书包环境变量
```

如果证书不在那里，检查 `proxy.enabled: true` 并且 `hermes egress status` 显示 `Listening yes`。如果环境变量缺失，可能是沙箱镜像的入口脚本把它们剥掉了——检查你的 `docker_env` 配置。

### 沙箱收到来自上游的 `HTTP 401`

两个常见原因：

1. **重新配置时的令牌覆盖。** 你运行了 `hermes egress setup --rotate-tokens`（或以其他方式轮换了令牌），但正在运行的沙箱仍持有旧令牌。重启沙箱。
2. **Bitwarden 刷新静默失败。** 在新的 fail-loud 行为下本不应发生，但如果你设置了 `proxy.allow_env_fallback: true`，守护进程可能带着过期的环境变量值启动了。检查守护进程的环境（`/proc/<iron-proxy-pid>/environ`）中是否存在预期的 `OPENROUTER_API_KEY` 等。

### 父进程死亡后出现“地址已被占用”

父 Hermes 进程在 `hermes egress start` 期间死亡（监听探测期间按了 Ctrl-C、OOM、panic）。新的修复逻辑会在 `Popen` 之后立即写入 pidfile，因此孤儿进程可被恢复：

```bash
hermes egress stop   # 通过 pidfile 找到孤儿进程并杀掉它
hermes egress start
```

如果 `hermes egress stop` 提示“iron-proxy 没有在运行”，但你在 `ps` 里仍能看到该守护进程，那说明 pidfile 不同步了。手动恢复：

```bash
pkill -TERM iron-proxy
rm -f ~/.hermes/proxy/iron-proxy.pid ~/.hermes/proxy/iron-proxy.nonce
hermes egress start
```

### 检查每次请求的行为

在固定版本二进制（**v0.39**）上，守护进程级别的事件和每次请求的记录都会写入 `~/.hermes/proxy/iron-proxy.log`。格式是行分隔 JSON。针对特定的上游进行检索：

```bash
grep '"upstream":"openrouter.ai"' ~/.hermes/proxy/iron-proxy.log | tail -20
```

或实时查看：

```bash
tail -f ~/.hermes/proxy/iron-proxy.log | jq
```

当固定版本升级到 v0.40+（其中增加了 `log.audit_path`）时，每次请求的记录会移到 `~/.hermes/proxy/audit.log`，而 `iron-proxy.log` 将只保存守护进程级别的事件。在那次版本提升之前，`audit.log` 是一个空的占位文件（预先以 `0o600` 创建，这样未来的守护进程会继承很严格的权限）——今天就把你的 logrotate / 监控工具指向 `iron-proxy.log`，并计划在版本提升后加入 `audit.log`。

## 限制（v1）

- 仅支持 Docker 后端。Modal、Daytona 和 SSH 接线将在单独的 PR 中跟进。
- 使用基于签名的认证的服务商（AWS SigV4、GCP 服务账号 OAuth）会完全绕过代理——见[未覆盖的服务商](#uncovered-providers)。基于标头令牌的服务商（bearer、`x-api-key`、`api-key`、`x-goog-api-key`）全都已覆盖。
- 上游没有原生 Windows 二进制。请运行在 Linux / macOS / WSL 上。
- CA 在首次生成时是一个有效期为 10 年的自签名证书。轮换需要手动执行 `openssl genrsa ...`（或等待后续添加 `hermes egress rotate-ca` 的版本）。
- 重新运行 setup 会在重写配置或映射后停止正在运行的守护进程；在令牌轮换后需重启（或者仅针对规则集变更使用 `hermes egress reload`）并将已在运行的沙箱一并重启。
- iron-proxy 的内存中密钥置零由上游控制。能够读取 `/proc/<pid>/mem` 的同 uid 攻击者可以从守护进程的内存中读出被换入的密钥。
- iron-proxy v0.39 仅支持**每个守护进程单个绑定**（在 Linux 上我们绑定 docker 网桥网关，在 Docker Desktop 上绑定回环），并把守护进程与每次请求的记录合并到单一日志流中。当上游新增 `proxy.http_listens`（复数形式）和 `log.audit_path` 时，一次版本提升即可接入多绑定和专用的审计流。

## 另请参阅

- 上游项目：[github.com/ironsh/iron-proxy](https://github.com/ironsh/iron-proxy)
- 上游文档：[docs.iron.sh](https://docs.iron.sh/)
- Bitwarden 集成：[`hermes secrets bitwarden`](../secrets/bitwarden)
- Hermes Docker 终端后端：[Docker](../docker)
- 开发者 / 贡献者参考：[Egress proxy 内部机制](../../developer-guide/egress-internals)
