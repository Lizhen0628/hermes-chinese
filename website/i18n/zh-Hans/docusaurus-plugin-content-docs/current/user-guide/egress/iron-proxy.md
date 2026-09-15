# 出站凭证注入代理（iron-proxy）

当 Hermes 在 Docker 终端沙箱中运行你的智能体时，该沙箱通常会持有你真实的上游 API 密钥（`OPENROUTER_API_KEY`、`OPENAI_API_KEY` 等）。一旦沙箱内的智能体被提示注入攻击控制，它就可以执行 `cat ~/.config/openrouter/auth.json` 或 `printenv | grep -i key` 并将其窃取外传。

出站代理解决了这个问题：沙箱只持有不透明的**代理令牌**，而绝不持有真实密钥。来自沙箱的所有出站流量都会经由宿主机上的本地 [iron-proxy](https://github.com/ironsh/iron-proxy) 守护进程（Apache-2.0，Go 编写）路由，该进程终止 TLS，并在将请求转发到上游之前，把代理令牌替换为真实凭证。即使沙箱被攻破，攻击者拿到的令牌也只能在**已配置的可信代理边界**内使用——CA 私钥和代理端点的完整性都属于该边界的一部分。如果流量可以被重定向到攻击者控制的代理基础设施（例如 CA 私钥被盗或代理端点被劫持），令牌保障就不再成立。

本版本仅将出站代理接入 Docker 后端。Modal、Daytona、SSH 和 Singularity 目前**尚不**会接收代理环境变量或 CA 挂载。

## 它是什么

- 宿主机上一个受管理的 `iron-proxy` 子进程，懒安装到 `~/.hermes/bin/iron-proxy`
- 沙箱所信任的本地 CA，位于 `~/.hermes/proxy/ca.crt`，以便 iron-proxy 能够对 TLS 进行中间人解密并重写头部
- 位于 `~/.hermes/proxy/proxy.yaml` 的 `proxy.yaml` 配置，列出你允许的上游主机以及密钥转换映射
- 一个 `mappings.json`，记录哪个代理令牌对应哪个真实环境变量

沙箱会获得 `HTTPS_PROXY=http://host.docker.internal:9090`、`HTTP_PROXY=http://host.docker.internal:9091`，以及诸如 `OPENROUTER_API_KEY` 这类标准服务商环境变量，其值被设置为不透明的代理令牌。同时还会导出与之匹配的 `HERMES_PROXY_TOKEN_<ENV_NAME>` 别名以供诊断使用。现有的服务商 SDK 会读取常规的环境变量名，在 `Authorization` 中发送代理令牌，然后由 iron-proxy 的 `secrets` 转换替换为来自宿主机侧守护进程环境的真实值。

## 它不是什么

- 它**不是**入站的 `hermes proxy` 命令，后者是一个 OAuth 聚合反向代理。不同的命令（`hermes egress`），不同的方向。
- 它**不**位于你本地终端与服务商之间——仅位于沙箱与服务商之间。
- 它**不**为宿主机进程发起的进程内 LLM 调用重写凭证。这些调用继续直接使用你的 `.env` 密钥。威胁模型针对的是*沙箱*，而非宿主机。

## 快速开始

```bash
# 1. Install the iron-proxy binary (pinned version, SHA-256 verified)
hermes egress install

# 2. Run the wizard: generates CA, mints proxy tokens for every provider key
#    in your env, writes proxy.yaml.
hermes egress setup

# 3. Start the proxy daemon
hermes egress start

# 4. Check status
hermes egress status
```

`hermes egress setup` 会从你的环境中发现服务商密钥。如果你的密钥仅存在于 `~/.hermes/.env` 中（未导出到 shell 环境），setup 会自动读取该文件——你无需事先 `export` 它们。

当你之后重新运行 `setup` 时（新增允许列表主机、轮换令牌、切换凭证来源），它会停止正在运行的守护进程，因为其配置保存在内存中，然后**主动提出为你重启它**，以便变更立即生效。在 tty 环境下它会询问；传入 `--restart` 则总是重启，传入 `--no-restart` 则保持其停止状态。要在其他任何时间应用变更，`hermes egress restart` 是停止再启动的一条命令。

一旦运行起来，Docker 终端后端会自动：

- 将 `~/.hermes/proxy/ca.crt` 挂载到沙箱中的 `/etc/ssl/certs/hermes-egress-ca.crt`
- 设置 `HTTPS_PROXY`、`HTTP_PROXY`、`REQUESTS_CA_BUNDLE`、`SSL_CERT_FILE`、`CURL_CA_BUNDLE`、`NODE_EXTRA_CA_CERTS`，使所有常见 HTTP 运行时都经由代理路由并信任该 CA
- 设置 `NODE_OPTIONS=--use-openssl-ca`（追加到你在 `docker_env.NODE_OPTIONS` 中已有的内容之后），以便 Node.js 经由其他 CA bundle 变量所控制的 OpenSSL 存储进行路由——关于剩余的缺口，请参见下方的 [Node.js 非对称 CA 注意事项](#nodejs-asymmetric-ca-caveat)
- 添加 `--add-host=host.docker.internal:host-gateway`，以便沙箱在 Linux 上能访问宿主机侧的代理（Docker Desktop 在 macOS/Windows 上会自动处理这一点）
- 以标准服务商环境变量名导出代理令牌（例如 `OPENROUTER_API_KEY`），并为每个已生成的映射导出一个 `HERMES_PROXY_TOKEN_<ENV_NAME>` 诊断别名

## 配置

完整的配置位于 `~/.hermes/config.yaml` 中的 `proxy:` 部分。默认值均已在行内文档中说明；所有配置项都是可选的。

```yaml
proxy:
  # 主开关。为 false 时该功能完全是空操作 —— 不下载二进制文件、
  # 不添加 docker 挂载、不启动子进程。
  enabled: false

  # 隧道监听端口。沙箱通过 http://host.docker.internal:<port> 访问。
  tunnel_port: 9090

  # 首次使用时自动下载已固定版本的 iron-proxy 二进制文件。
  auto_install: true

  # iron-proxy 在出站时查找真实上游密钥的位置。
  #   env       — 进程环境变量（默认）。代理启动时 ~/.hermes/.env
  #               中的内容即为权威来源。
  #   bitwarden — 每次代理重启时从 Bitwarden Secrets Manager 重新获取。
  #               在 BW 网页应用中的轮换无需改动 .env 即可传播。
  #               需要 `secrets.bitwarden.enabled: true`。
  credential_source: env

  # 为 true（默认）时，若代理已启用但未运行，Docker 后端拒绝启动沙箱。
  # 设为 false 可在代理解不可用时回退到传统的
  #"沙箱内使用真实密钥" 姿态。
  enforce_on_docker: true

  # 当 `credential_source: bitwarden` 但缺少 BWS 访问令牌 /
  # project_id，或 bws 获取的映射服务商无任何返回值时，守护进程默认
  # 抛出异常（符合 "我要求轮换 —— 不要悄悄使用过期的环境变量值" 的精神）。
  # 设为 true 可重新启用旧的主机环境变量回退 —— 适用于你想开始
  # 切换到 BW 模式但尚未接好所有密钥的迁移场景。
  allow_env_fallback: false

  # 应用于出站流量的 SSRF 拒绝列表。省略 / 置为 null 时
  # 使用安全默认值：环回（v4 + v6）、链路本地（含位于
  # 169.254.169.254 的云元数据 IP）、RFC1918、IPv6 ULA、
  # IPv4 映射的 v6、CGNAT，以及 RFC2544 基准测试范围。
  # 设为显式的 `[]` 可完全退出（仅在封闭测试中才合理）。
  upstream_deny_cidrs: null

  # 除内置默认值外额外允许的上游主机。
  # 支持通配符（`*.foo.com`）。默认值覆盖 OpenRouter、
  # OpenAI、Anthropic、Google、xAI、Mistral、Groq、Together、DeepSeek
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

如果你的智能体需要不在列表中的上游 —— 自托管推理端点、额外的云端 LLM、MCP 服务器 —— 将其添加到 `proxy.extra_allowed_hosts`。通配符匹配的是完整主机名（`*.example.com` 匹配 `api.example.com` 和 `staging.example.com`，但不匹配 `example.com` 本身）。

### 默认 SSRF 拒绝 CIDR

无论允许列表如何都会应用。这些范围由 iron-proxy 在网络边界拒绝，因此通过允许列表主机名进行的 DNS 重绑定攻击无法触及 IMDS 或你的内部网络：

| CIDR | 用途 |
|---|---|
| `127.0.0.0/8`、`::1/128` | 环回（v4 + v6） |
| `169.254.0.0/16`、`fe80::/10` | 链路本地 —— **含位于 `169.254.169.254` 的 AWS / GCP / Azure IMDS** |
| `10.0.0.0/8`、`172.16.0.0/12`、`192.168.0.0/16` | RFC1918 |
| `fc00::/7` | IPv6 ULA |
| `::ffff:0:0/96` | IPv4 映射的 IPv6 —— 堵住双栈 IMDS 绕过 |
| `100.64.0.0/10` | RFC6598 CGNAT（AWS VPC、K8s pod 网络使用） |
| `198.18.0.0/15` | RFC2544 基准测试范围 |

如需覆盖：将 `proxy.upstream_deny_cidrs` 设为你自己的列表。如需完全退出（例如需要访问环回上游的封闭测试）：将其设为空列表 `[]`。

### 绑定策略

代理绝不绑定 `0.0.0.0`。默认绑定因平台而异，因为 iron-proxy v0.39 仅支持**每个守护进程单次绑定**：

- **Linux：** docker 网桥网关（默认 `172.17.0.1:<tunnel_port>`）。容器通过 `host.docker.internal` 访问代理，而 `--add-host=host.docker.internal:host-gateway` 会将其恰好解析为此网桥网关 IP —— 仅环回的绑定从沙箱内部无法访问。网桥 IP 是主机 `docker0` 接口上的地址，因此不会暴露到局域网；默认 bridge 网络上的其他容器**可以**访问它，但请求仍需一枚签发的代理令牌和一个已允许的上游。如果未检测到 docker 网桥（docker 未安装/未运行），则绑定回退到环回并给出警告。
- **macOS / Windows Docker Desktop：** 环回（`127.0.0.1:<tunnel_port>`）。Desktop 的 VPNkit 将 `host.docker.internal` 路由到主机，因此环回从容器可访问，并且是暴露最少的选择。

即使局域网中的对端泄露了代理令牌，也无法使用该代理 —— 两种绑定都无法从外部网络访问。

我们还固定设置 `metrics.listen: 127.0.0.1:0`，好让守护进程内置的指标服务器获得一个临时环回端口，而不是其默认的 `:9090` —— 否则它会与 `tunnel_port: 9090` 争夺同一个套接字，守护进程会以 "address already in use" 拒绝启动。注意 `:0` 临时端口每次启动都是随机的，且不会在任何地方显示，因此在此固定设置下指标实际上被禁用了。

如果 PATH 上更靠前位置的恶意 `ip` 垫片成功将非私有 IPv4 注入为网桥地址（`0.0.0.0`、公网地址、组播、链路本地等），环回回退仍会生效 —— 我们绝不绑定任何无法通过 `ipaddress.IPv4Address` + `is_*` 检查验证的内容。

## 覆盖的认证方案

`secrets` 转换会在匹配位置出现代理令牌的任何地方将其替换 —— 而且它匹配的范围不止 `Authorization: Bearer`：

| 服务商 | 环境变量 | 替换位置 |
|---|---|---|
| OpenRouter、OpenAI、Groq、Together、DeepSeek、Mistral、xAI、Nous | `*_API_KEY` | `Authorization` 请求头 |
| Anthropic 原生 | `ANTHROPIC_API_KEY` | `x-api-key` + `Authorization` |
| Azure OpenAI | `AZURE_OPENAI_API_KEY` | `api-key` + `Authorization`（`*.openai.azure.com`、`*.cognitiveservices.azure.com`、`*.services.ai.azure.com`） |
| Google AI Studio (Gemini) | `GEMINI_API_KEY` / `GOOGLE_API_KEY` | `x-goog-api-key` 请求头或 `?key=` 查询参数 |

`GEMINI_API_KEY` 与 `GOOGLE_API_KEY` 被视为同一份凭证：只会铸造一个代理令牌，以**两个**名称同时注入沙箱，而主机的环境变量中出现其中任一名称即可满足发现要求。

## 未覆盖的服务商

涉及请求签名或由 SDK 铸造 OAuth 的认证方案无法通过静态请求头替换来交换 —— 如果这些服务商的环境变量存在，沙箱中就会持有其**真实凭证**，对这些服务商而言出口隔离保证是不完整的：

| 环境变量 | 服务商 | 原因 |
|---|---|---|
| `AWS_ACCESS_KEY_ID`、`AWS_SECRET_ACCESS_KEY` | AWS Bedrock / SageMaker | 经过 SigV4 签名的请求 |
| `GOOGLE_APPLICATION_CREDENTIALS` | GCP Vertex AI | 由服务账号文件铸造的 OAuth |

这些环境变量在大多数开发者笔记本上都因为无关工具（terraform、gcloud、aws CLI、ECR push）而存在。它们会在向导和 `hermes egress status` 中显示为警告，但永远不会阻止代理启动。如果你不在沙箱中使用这些服务商，请 `unset` 这些变量以清除警告。

## Bitwarden 集成

如果你已经通过 [`hermes secrets bitwarden setup`](../secrets/bitwarden) 使用了 Bitwarden Secrets Manager，那么出口代理可以从那里而非 `os.environ` 拉取真实凭证：

```bash
hermes egress setup --from-bitwarden
```

这会设置 `proxy.credential_source: bitwarden`，并从你的 BW 项目中发现服务商环境变量名称。

### 轮换语义

当 `credential_source: bitwarden` 时，iron-proxy 守护进程**每次启动时**都会通过 `bws secret list <project_id>` 从 BWS 重新获取密钥。因此轮换流程是：

1. 在 Bitwarden 网页应用中轮换密钥。
2. 在主机上执行 `hermes egress stop && hermes egress start`。
3. 此后启动的沙箱就会把代理令牌替换为新值。

无需编辑 `.env`。无需在主机上重启 Hermes。只有代理守护进程会接触新值 —— 你的主机进程和 `os.environ` 不受影响。

### 启动时失败即报错

当 `credential_source: bitwarden` 时，`hermes egress start` 既会在向导层进行预检查，`_build_proxy_subprocess_env` 也会在守护进程层进行复核：

- BWS 访问令牌环境变量未设置 → 拒绝启动，并提示你 `unset` 后重新运行，或执行 `hermes egress setup --no-bitwarden` 切回环境变量模式
- `secrets.bitwarden.project_id` 为空 → 拒绝启动，并提示你运行 `hermes secrets bitwarden setup`
- 一个或多个已映射服务商的 `bws secret list` 未返回任何值 → 拒绝启动，并列出缺失的名称

这是有意为之。在 BW 模式下回退到主机环境变量，恰恰会重新引入 BW 路径本要击败的那类陈旧数据缺陷（运维人员选择 BW 正是为了获得轮换保证；静默回退会破坏该保证）。

`proxy.allow_env_fallback: true` 配置标志出于迁移场景的考虑，重新启用了旧有的“若 BWS 不可达则静默回退到主机环境变量”行为。当你正在将密钥一条条迁入 BW、并希望守护进程在可用的值下启动时，可以使用它。

### 切换凭证来源

| 从 | 到 | 命令 |
|---|---|---|
| env | bitwarden | `hermes egress setup --from-bitwarden` |
| bitwarden | env | `hermes egress setup --no-bitwarden` |

**在不带任一标志的情况下重新运行 `hermes egress setup` 会保留现有的 `credential_source`** —— 向导拒绝悄无声息地把你降级回 env。这一点很重要，因为一旦你配置了 bitwarden 模式，轮换保证就是你所选择的；你必须明确表示“我又想用 env 了”才能更改它。

## Slash commands

CLI 子命令树：

```
hermes egress install                  # 下载已固定版本的 iron-proxy 二进制文件
hermes egress install --force          # 即使已存在托管副本也重新下载

hermes egress setup                    # 交互式向导
hermes egress setup --tunnel-port N    # 覆盖隧道监听端口
hermes egress setup --from-bitwarden   # 使用 BWS 作为凭据来源（失败即报错）
hermes egress setup --no-bitwarden     # 显式切回 env 模式
hermes egress setup --rotate-tokens    # 为每个 provider 重新铸造新令牌
                                       #   （默认保留已有令牌）

hermes egress start                    # 启动托管的代理守护进程
hermes egress stop                     # SIGTERM（5 秒宽限期后 SIGKILL）
hermes egress restart                  # 停止（若正在运行）后启动 — 当上游
                                       #   SECRETS 变更（轮换、新增 provider）时需要
hermes egress reload                   # 通过管理 API 从 proxy.yaml 热重载规则集 —
                                       #   无需重启，不丢弃连接（allowlist / mapping 编辑）

hermes egress status                   # 二进制 + 配置 + pid + 监听状态 + mappings
hermes egress status --show-tokens     # 完整打印代理令牌
                                       #   （默认：仅脱敏前缀 + 后缀）

hermes egress disable                  # 将 proxy.enabled 置为 false
                                       #   （不会停止正在运行的代理）

hermes egress config                   # 打印 proxy.yaml 的路径以供调试
```

### 令牌轮换

默认情况下，`hermes egress setup` 对已有代理令牌的 provider **保留**其令牌。添加新 provider 时只为新 provider 铸造新令牌；现有令牌保持不变。这样可避免在重新运行向导时导致运行中的沙箱出现 401 错误。

`--rotate-tokens` 会轮换所有令牌：

```bash
hermes egress setup --rotate-tokens
```

当存在现有令牌且 stdin 是 tty 时，向导会提示确认：

```
⚠  --rotate-tokens will invalidate proxy tokens in every running
   Hermes sandbox.  They will start 401-ing against upstreams until restarted.
Type 'rotate' to confirm:
```

非 tty 调用（CI、脚本）会跳过此提示 — 该标志被视为有意为之。在任何覆盖之前，当前的 `mappings.json` 会被复制为带时间戳的同级文件，以便手动恢复：

```
backup: ~/.hermes/proxy/mappings.json.rotated-20260524T143012
```

`hermes egress setup` 在重写配置或令牌映射时会停止正在运行的守护进程，因为守护进程会在内存中保留旧的 YAML。执行 `--rotate-tokens` 后：

```bash
hermes egress start
```

已在运行的容器持有旧令牌，需要重启才能获取新令牌。新的持久化 Docker 容器包含一个 egress-posture 标签，因此 Hermes 不会为新会话复用 pre-egress 或 pre-rotation 的容器。

## 状态目录布局

iron-proxy 维护的所有内容都位于 `~/.hermes/proxy/`：

| 路径 | 权限 | 用途 |
|---|---|---|
| `~/.hermes/proxy/`（目录） | `0o700` | 归你所有且仅你可遍历 |
| `ca.crt` | `0o644` | 分发到沙箱中的公共 CA 证书 |
| `ca.key` | `0o600` | CA 签名密钥 — 绝不离开主机 |
| `proxy.yaml` | `0o600` | iron-proxy 配置；每次 `setup` 时重写 |
| `mappings.json` | `0o600` | 沙箱代理令牌 → 上游环境变量 |
| `mappings.json.rotated-*` | `0o600` | 由 `--rotate-tokens` 创建的备份 |
| `iron-proxy.pid` | `0o600` | 正在运行的守护进程的 PID |
| `iron-proxy.nonce` | `0o600` | 用于防御 PID 回收的每次启动 nonce |
| `iron-proxy.log` | `0o600` | 守护进程 stdout/stderr — **在 v0.39 上包含每个请求的记录** |
| `audit.log` | `0o600` | 为未来二进制版本中专用的逐请求审计流预留；预先创建以便在上游接入时隐私契约得以维持 |

CA 私钥是最敏感的文件。它从第一个字节起就以 `0o600` 创建（没有 umask 时间窗 TOCTOU 问题）并使用 `O_NOFOLLOW`，因此同一 uid 的攻击者无法通过植入的符号链接重定向它。pidfile、nonce 文件、守护进程日志和审计日志也采用同样的处理方式。

### iron-proxy v0.39 上的日志

在当前固定的二进制版本（**v0.39.0**）上，iron-proxy 会将所有输出 —— 守护进程级诊断信息以及逐请求记录 —— 全部写入 **`~/.hermes/proxy/iron-proxy.log`**。v0.39 的 `config.Log` 结构体没有单独的 `audit_path` 字段，因此我们无法在那里将逐请求记录路由到专用流。

我们仍然在 `0o600` 权限下以 `O_NOFOLLOW` 预先创建 `~/.hermes/proxy/audit.log`，原因如下：

1. 它为该路径预留，以便将来版本升级：当固定版本升级到支持 `log.audit_path` 的版本时，逐请求记录将无需运维侧重新配置便会流入该文件。**在那之前，该文件将保持 0 字节 —— 不要把监控、告警或取证工具指向它。** 目前所有内容都使用 `iron-proxy.log`。
2. 从第一个字节起就保持 0o600 的保障，可以在上游修复落地那天起到防御作用 —— 届时 v0.40+ 若发现文件尚不存在，会在其默认 umask 下创建该文件。

在版本升级落地之前，请将 `iron-proxy.log` 视作两类受众共同的事实来源：

- 守护进程级事件（启动横幅、绑定错误、关闭原因、转换错误）。运维 + 故障排查。
- 逐请求记录（向允许列表中的上游发起 CONNECT、密钥替换触发、允许列表拒绝）。取证 + 合规。

这两个文件在多次重启之间均为追加写入。如果你在意长生命周期主机上的磁盘占用，请用 logrotate 对它们做轮转。

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

1. 沙箱发起 HTTPS 请求，例如 `POST https://openrouter.ai/v1/chat/completions`，并带上 `Authorization: Bearer hermes-proxy-openrouter-…`（这是代理令牌，而不是真实密钥）。
2. 由于设置了 `HTTPS_PROXY`，请求会以 CONNECT 隧道的形式发往 iron-proxy。
3. iron-proxy 检查允许列表。`openrouter.ai` 被允许。
4. iron-proxy 为 `openrouter.ai` 签发一张由我们的 CA 签名的叶子证书，终止 TLS 连接，检查请求。
5. `secrets` 转换会匹配 `Authorization` 头中的代理令牌字符串，并替换为真实的 `OPENROUTER_API_KEY` 值，该值来源于是 iron-proxy 自身的环境变量。
6. 请求被重新加密并转发到 OpenRouter。
7. 在 v0.39 上，请求会被记录到 `~/.hermes/proxy/iron-proxy.log`。当固定的二进制版本支持拆分流（v0.40+）后，逐请求记录将流向 `~/.hermes/proxy/audit.log`，而守护进程级诊断信息则留在 `iron-proxy.log`。参见 [iron-proxy v0.39 上的日志](#logging-on-iron-proxy-v039)。

对不在允许列表中的主机（例如 `https://attacker.example.com/leak?key=...`）的请求会在任何字节离开主机之前被以 HTTP 403 拒绝。该拒绝会连同上游主机和来源沙箱记录在 `iron-proxy.log` 中。

### 向沙箱分发 CA

当 Docker 后端在 `proxy.enabled: true` 且守护进程正在监听的情况下启动容器时，它会向 `docker run` 添加以下参数：

| 参数 | 用途 |
|---|---|
| `-v ~/.hermes/proxy/ca.crt:/etc/ssl/certs/hermes-egress-ca.crt:ro` | 以只读方式挂载 CA |
| `-e HTTPS_PROXY=http://host.docker.internal:9090` | Python httpx / curl / go 默认传输 / Node fetch |
| `-e HTTP_PROXY=http://host.docker.internal:9091` | curl + wget 用于纯 HTTP —— 纯 HTTP 转发监听器位于 `tunnel_port + 1` |
| `-e NO_PROXY=127.0.0.1,localhost,::1` | 沙箱内的回环开发服务器绕过代理 |
| `-e REQUESTS_CA_BUNDLE=…ca.crt` | Python `requests` |
| `-e SSL_CERT_FILE=…ca.crt` | Python `ssl` 模块 / OpenSSL —— **替换**系统存储 |
| `-e CURL_CA_BUNDLE=…ca.crt` | curl —— **替换**系统存储 |
| `-e NODE_EXTRA_CA_CERTS=…ca.crt` | Node.js —— **追加到**系统存储 |
| `-e NODE_OPTIONS="<your value> --use-openssl-ca"` | Node.js —— 经由 OpenSSL 存储路由（追加；你的 `--max-old-space-size` 等设置会被保留） |
| `-e HERMES_EGRESS_PROXY=1` | 智能体可读取的哨兵变量，用于得知自身具备代理感知 |
| `-e OPENROUTER_API_KEY=<proxy-token>` | 标准服务商环境变量名接收代理令牌，使现有 SDK 继续工作 |
| `-e HERMES_PROXY_TOKEN_<NAME>=…` | 每个映射的诊断别名；与标准服务商环境变量值相同 |
| `--add-host=host.docker.internal:host-gateway` | 仅限 Linux；Docker Desktop 会自动映射 |

#### Node.js 非对称 CA 注意事项

`REQUESTS_CA_BUNDLE` / `SSL_CERT_FILE` / `CURL_CA_BUNDLE` 会**替换**沙箱内的系统 CA 存储，而 `NODE_EXTRA_CA_CERTS` 则是**追加**到其中。沙箱内的 Node.js 进程原则上可以通过打开原始 `net.Socket` 并启动自己的 TLS 握手来绕过代理 —— 系统 CA 存储仍然信任真实的上游证书，因此该请求会成功，而 Python / curl 会校验失败。

`NODE_OPTIONS=--use-openssl-ca` 会被追加到你已有的 `docker_env.NODE_OPTIONS` 之后。这会强制 Node 走由 `SSL_CERT_FILE` 控制的 OpenSSL 存储，从而缩小这种非对称性。它并不覆盖那些显式向 `tls.connect()` 或 `https.request()` 传入自身 `ca` 选项的代码，但能堵住简单的情形。

这是 v1 已知的限制。请关注 [github.com/ironsh/iron-proxy/issues](https://github.com/ironsh/iron-proxy/issues) 以获取上游的解决方案；在此期间，不要在你依赖出站隔离的沙箱中运行会打开原始套接字的不可信 Node 代码。

### docker\_env 冲突

如果你在 `docker_env:` 配置块中设置了控制代理的环境变量（虽少见但可行），当设置了 `enforce_on_docker: true` 时，Hermes 会拒绝启动沙箱。这包括两类：

- 出站控制类变量：`HTTPS_PROXY`、`HTTP_PROXY`、`NO_PROXY`、`REQUESTS_CA_BUNDLE`、`SSL_CERT_FILE`、`CURL_CA_BUNDLE`、`NODE_EXTRA_CA_CERTS`
- 真实服务商的环境变量：`mappings.json` 中的每一个名称（例如 `OPENROUTER_API_KEY`、`OPENAI_API_KEY`）

错误示例：

```
docker_env in config.yaml overrides egress-proxy variables
['HTTPS_PROXY', 'OPENROUTER_API_KEY']; enforce_on_docker is enabled.
Remove these keys from docker_env or disable enforce_on_docker to
opt out of egress isolation.
```

当 `enforce_on_docker: false` 时，同样的情形会以警告形式出现，且你的 `docker_env` 值优先生效 —— 这对迁移或测试很有用，但你是在明确选择**不**使用隔离保障。

## PID 与 nonce 防护

守护进程的 pidfile 采用 `O_EXCL` + `O_NOFOLLOW` + 属主检查来写入。并发的 `hermes egress start` 调用会产生两种结果之一：

- 现有 pidfile 指向仍然存活的金刚代理 → 第二次启动会以“已有另一个启动正在进行中”并附带运行 `hermes egress stop` 的提示而拒绝
- 现有 pidfile 已失效（守护进程崩溃）→ 第二次启动会将其删除并重试一次

除此之外，每一次 `start_proxy` 都会在两个位置植入一个全新的随机 nonce：

- 守护进程的环境变量中的 `HERMES_IRON_PROXY_NONCE=<nonce>`
- `~/.hermes/proxy/iron-proxy.nonce`（pidfile 的同级文件，权限 0o600）

当 `hermes egress stop`（或任何其他 `_pid_alive` 检查）需要确认某个 PID 仍指向**我们的**守护进程 —— 而不是在 iron-proxy 崩溃后被分配了相同 PID 的无关进程 —— 它会读取 `/proc/<pid>/environ` 并查找该 nonce。让这一机制能在多次 CLI 调用之间起作用的关键在于磁盘上的副本（内存中的 `_proxy_nonce` 是每进程的，每次 `hermes` 调用时都会重置）。

如果 nonce 检查失败，代码会退回到将 `argv[0]` 的 basename 与 `iron-proxy` 进行匹配。`stop_proxy` 还会在 SIGTERM 之前捕获 `/proc/<pid>/stat` 的 starttime，并在 5 秒宽限期后再次核验 —— 如果 starttime 发生了漂移，说明该 PID 在等待期间被复用，此时会抑制 SIGKILL 并发出警告。

## 安全模型

**此机制防范的对象：**

- Docker 沙箱中受提示注入影响的智能体读取 `printenv` / 凭据文件并外传真实密钥。
- 沙箱中受损的依赖向任意主机回连 —— 默认拒绝的允许列表会阻止未知目标。
- 智能体访问云元数据端点（`169.254.169.254`）—— iron-proxy 会通过 `upstream_deny_cidrs` 默认拒绝这些，包括 IPv4 映射 IPv6 形式 `::ffff:169.254.169.254`。
- 通过允许列表中的主机名进行 DNS 重绑定到私有 IP —— 拒绝 CIDR 是在连接时检查，而非在允许列表时检查。
- 同 uid 的本地进程读取 iron-proxy 守护进程的环境变量以窃取机密 —— 只有映射所引用的环境变量名称会被转发，而非完整的主机环境。
- 拥有泄漏沙箱代理令牌的局域网对等方消耗你的 API 配额 —— 代理绑定 Docker 网桥网关（Linux）或回环地址（Docker Desktop），绝非 `0.0.0.0`，因此无法从外部网络访问。

**此机制不能防范的对象：**

- 受损的主机进程。如果智能体进程本身被攻破，主机 `~/.hermes/.env` 中的真实密钥无论如何都会暴露。这是一项针对**沙箱**被攻破的纵深防御功能，而非针对主机被攻破。
- **信任代理边界的丧失本身。** 令牌交换保障的前提是沙箱信任已挂载的 CA 证书（`/etc/ssl/certs/hermes-egress-ca.crt`），并且流量确实到达**我们的** iron-proxy。如果 CA 私钥被盗，或沙箱出站流量被重定向到攻击者控制的代理基础设施，中间人攻击者就能提供有效的叶子证书，此时代理令牌就不再是有意义的边界（参见 [MITRE ATT&CK T1588.004](https://attack.mitre.org/techniques/T1588/004/) —— 获取 TLS 证书材料以实施 AiTM）。请相应地保护好 CA 密钥（其权限为 `0600`，仅限主机）和代理端点。
- 通过使用原始套接字绕过 `HTTPS_PROXY` 的沙箱进程。代理解析无法拦截不经过它的流量。Node.js 已通过 `NODE_OPTIONS=--use-openssl-ca` 得到部分缓解（见上文注意事项）。
- 显式挂载进 Docker 的凭据文件（`terminal.credential_files` 或技能注册的挂载）。出站隔离保护的是服务商环境变量；它不会检查任意挂载的文件。不要将真实的服务商凭据挂载进启用了强制出站隔离的沙箱。
- 允许列表主机的数据外传。如果允许 `api.openai.com`，智能体可以将外传数据嵌入发往该主机的请求体中。守护进程日志会记录发生了该请求，但无法阻止它。
- 未覆盖的服务商（AWS Bedrock SigV4、GCP Vertex 服务账号 OAuth）。它们的环境变量仍留在沙箱中；如果你启用它们，这些凭据会完全绕过代理。参见[未覆盖的服务商](#uncovered-providers)。
- iron-proxy 内存中机密的清零。Go 二进制文件会将交换进来的真实凭据保存在进程内存中；同 uid 攻击者进行核心转储或读取 `/proc/<pid>/mem` 就会暴露它们。这不在本层的范围内。

## 故障模式

- **二进制未安装，`auto_install: true`** — 首次执行 `hermes egress setup` 或 `hermes egress start` 时会下载它。通过上游 `checksums.txt` 进行 SHA-256 校验。
- **二进制未安装，`auto_install: false`** — `start` 会失败，并给出指引手动安装的清晰提示。
- **`enabled: true` 但代理未运行** — 当 `enforce_on_docker: true`（默认值）时，Docker 沙箱创建会拒绝启动并给出解释性错误。当 `enforce_on_docker: false` 时，会回退到使用真实凭据直接出站并记录一条警告。
- **端口冲突** — iron-proxy 会立即退出；`hermes egress start` 会报告最后 20 行日志并以非零退出码失败。
- **上游主机被拒绝** — 沙箱会收到代理返回的 HTTP 403，其响应体说明哪个主机未被允许。智能体会看到该错误并将其上报。
- **请求云元数据 IP（169.254.169.254）** — 无论允许列表如何，都会被 `upstream_deny_cidrs` 拒绝。
- **`docker_env` 与某个控制代理的变量冲突（开启强制执行时）** — 沙箱创建会拒绝并给出冲突的键名。
- **`docker_forward_env` 试图转发受保护的服务商密钥（开启强制执行时）** — 沙箱创建会拒绝；请从 `docker_forward_env` 中移除该键，或将 `proxy.enforce_on_docker: false` 设为退出。
- **`docker_extra_args` 覆盖代理环境/网络控制（开启强制执行时）** — 沙箱创建会拒绝；用户提供的 `-e HTTPS_PROXY=...`、`--env-file` 或 `--network` 参数会在 Hermes 生成的参数之后运行，可能绕过出站控制（egress）。
- **`credential_source: bitwarden` 时缺少 BWS 访问令牌** — `hermes egress start` 会拒绝执行，并给出 `--no-bitwarden` 作为恢复提示。
- **iron-proxy 未能在 5 秒内绑定** — 进程被终止，pidfile 被取消链接，错误信息中包含端口号以及 `iron-proxy.log` 的尾部内容。
- **并发调用 `hermes egress start`** — 若第一个调用的守护进程已启动，第二个调用会以 “another start in progress” 拒绝；否则第二个调用会取消链接陈旧的 pidfile 并继续执行。

## 故障排查

### “Refusing to start: BWS_ACCESS_TOKEN is not set”

你启用了 `credential_source: bitwarden`，但访问令牌的环境变量不在你的 shell 中。可以：

```bash
export BWS_ACCESS_TOKEN=…   # 一次性
hermes egress start
```

或将其移入 `~/.hermes/.env`。或切换回 env 模式：

```bash
hermes egress setup --no-bitwarden
```

### “iron-proxy exited immediately”

查看 `~/.hermes/proxy/iron-proxy.log` 的最后 20 行。常见原因：

- 端口已被占用 → 修改 `proxy.tunnel_port`，或终止占用 9090 的其他进程
- `proxy.yaml` 无效 → 运行 `hermes egress setup` 重新生成
- CA 证书 / 密钥权限错误 → `chmod 0o600 ~/.hermes/proxy/ca.key`

### “iron-proxy did not bind \<bind-host\>:9090 within 5s”

守护进程已启动，但从未绑定监听器。通常意味着二进制卡住了，或在启动时做了开销很大的事情。检查 `~/.hermes/proxy/iron-proxy.log`。孤儿进程会被自动终止，pidfile 也已清理，所以你只需重试 `hermes egress start` 即可。

### 沙箱连接代理超时（Linux）

容器将 `host.docker.internal` 解析为 docker 桥接网关，而代理就绑定在该处，但主机防火墙（通常是使用默认拒绝 INPUT 策略的 `ufw`）会在 `docker0` 上丢弃容器→主机的流量。从一个容器中进行验证：

```bash
docker run --rm --add-host host.docker.internal:host-gateway busybox \
  nc -zv -w 3 host.docker.internal 9090
```

如果在 `hermes egress status` 显示 `listening` 的情况下该命令仍然超时，请在防火墙中允许桥接子网，例如 ufw：

```bash
sudo ufw allow in on docker0 to any port 9090 proto tcp
sudo ufw allow in on docker0 to any port 9091 proto tcp
```

（9091 = `tunnel_port + 1` 上以转发目的运行的纯 HTTP 明文监听器。）

### 沙箱从代理处看到 `HTTP 403`

沙箱内的智能体试图访问一个不在 `proxy.extra_allowed_hosts` 中的主机。403 响应体会说明是哪个主机。如果你想允许它，请添加到配置中：

```yaml
proxy:
  extra_allowed_hosts:
    - api.example.com
    - "*.staging.example.com"
```

然后 `hermes egress setup`（以重新生成 `proxy.yaml`）和 `hermes egress stop && hermes egress start`。

### 沙箱遇到 SSL 验证错误

要么是 CA 没有挂载进沙箱（少见；当 `proxy.enabled: true` 时 docker 后端会自动挂载），要么是你镜像中的 HTTP 客户端从一个非标准的环境变量读取配置。

```bash
# 在沙箱内执行：
cat /etc/ssl/certs/hermes-egress-ca.crt | head -1
# 应输出：-----BEGIN CERTIFICATE-----
env | grep -E "^(REQUESTS|CURL|SSL|NODE).*CA"
# 应列出四个 CA-bundle 环境变量，均指向 /etc/ssl/certs/hermes-egress-ca.crt
```

如果证书不在那里，请检查 `proxy.enabled: true` 且 `hermes egress status` 显示 `Listening yes`。如果环境变量缺失，沙箱镜像可能运行了一个会清除它们的 entrypoint —— 请检查你的 `docker_env` 配置。

### 沙箱收到来自上游的 `HTTP 401`

两个常见原因：

1. **重新 setup 时令牌被覆盖。** 你运行了 `hermes egress setup --rotate-tokens`（或以其他方式轮换了令牌），而正在运行的沙箱仍然持有旧令牌。请重启沙箱。
2. **Bitwarden 刷新静默失败。** 在启用新的 fail-loud 行为后本不应发生，但如果你设置了 `proxy.allow_env_fallback: true`，守护进程可能带着过期的环境变量值启动了。请检查守护进程的环境变量（`/proc/<iron-proxy-pid>/environ`）中预期的 `OPENROUTER_API_KEY` 等是否就位。

### 父进程消亡后出现 "Address in use"

父 Hermes 进程在 `hermes egress start` 期间消亡（在监听探测期间按了 Ctrl-C、OOM、panic）。新的修复逻辑会在 `Popen` 之后立即写入 pidfile，因此孤儿进程可以被恢复：

```bash
hermes egress stop   # 通过 pidfile 找到孤儿进程并终止它
hermes egress start
```

如果 `hermes egress stop` 提示 "iron-proxy was not running"，但你仍然能在 `ps` 中看到该守护进程，说明 pidfile 已失同步。手动恢复：

```bash
pkill -TERM iron-proxy
rm -f ~/.hermes/proxy/iron-proxy.pid ~/.hermes/proxy/iron-proxy.nonce
hermes egress start
```

### 检查单次请求行为

在固定版本二进制（**v0.39**）上，守护进程级事件和单次请求记录都写入 `~/.hermes/proxy/iron-proxy.log`。格式为按行分隔的 JSON。用 grep 查特定上游：

```bash
grep '"upstream":"openrouter.ai"' ~/.hermes/proxy/iron-proxy.log | tail -20
```

或实时观察：

```bash
tail -f ~/.hermes/proxy/iron-proxy.log | jq
```

当固定版本升到 v0.40+（新增 `log.audit_path`）时，单次请求记录将移到 `~/.hermes/proxy/audit.log`，而 `iron-proxy.log` 只保留守护进程级事件。在这次升级之前，`audit.log` 是一个空的占位文件（预先创建为 `0o600`，以便未来的守护进程继承严格的权限）—— 现在就把你的 logrotate / 监控工具对接 `iron-proxy.log`，并在版本升级后再计划添加 `audit.log`。

## 局限性（v1）

- 仅支持 Docker 后端。Modal、Daytona 和 SSH 的接入将在单独的 PR 中跟进。
- 使用基于签名认证的服务商（AWS SigV4、GCP service-account OAuth）会完全绕过代理 —— 参见 [未覆盖的服务商](#uncovered-providers)。使用头部令牌的服务商（bearer、`x-api-key`、`api-key`、`x-goog-api-key`）均已覆盖。
- 上游没有原生 Windows 二进制。请在 Linux / macOS / WSL 上运行。
- CA 在首次生成时是 10 年自签证书。轮换需要手动执行 `openssl genrsa ...`（或等待后续添加 `hermes egress rotate-ca` 的版本）。
- 重新运行 setup 会在重写配置或映射后停掉正在运行的守护进程；请在令牌轮换后重启（仅规则集变更可用 `hermes egress reload`）已运行的沙箱。
- iron-proxy 的内存中密钥零化由上游控制。具有 `/proc/<pid>/mem` 读取权限的同 uid 攻击者可以从守护进程的内存中读取已换入的密钥。
- iron-proxy v0.39 每个守护进程仅支持**单一绑定**（在 Linux 上我们绑定 docker 网桥网关，在 Docker Desktop 上绑定 loopback），并将守护进程记录和单次请求记录合并到单一日志流中。当上游添加 `proxy.http_listens`（复数）和 `log.audit_path` 后，可通过一次版本升级接入多绑定和专用审计流。

## 另见

- 上游项目：[github.com/ironsh/iron-proxy](https://github.com/ironsh/iron-proxy)
- 上游文档：[docs.iron.sh](https://docs.iron.sh/)
- Bitwarden 集成：[`hermes secrets bitwarden`](../secrets/bitwarden)
- Hermes Docker 终端后端：[Docker](../docker)
- 开发者 / 贡献者参考：[Egress proxy 内部机制](../../developer-guide/egress-internals)
