# 出口凭证注入代理（iron-proxy）

当 Hermes 在 Docker 终端沙箱中运行你的智能体时，该沙箱通常持有你真实的上游 API 密钥（`OPENROUTER_API_KEY`、`OPENAI_API_KEY` 等）。被提示注入的沙箱内智能体可以执行 `cat ~/.config/openrouter/auth.json` 或 `printenv | grep -i key` 来窃取它们。

出口代理解决了这个问题：沙箱只持有不透明的**代理令牌**，从不持有真实密钥。来自沙箱的所有出站流量都经过主机上的本地 [iron-proxy](https://github.com/ironsh/iron-proxy) 守护进程（Apache-2.0、Go 语言），该进程终止 TLS，并在将请求转发到上游之前，把代理令牌替换为真实凭证。即使沙箱被攻破，攻击者也只拿到仅在**已配置的可信代理边界**内有效的令牌——CA 私钥和代理端点完整性是该边界的一部分。如果流量可以被重定向到攻击者控制的代理基础设施（例如 CA 私钥被盗或代理端点被劫持），令牌保证将不再成立。

本次发布仅在 Docker 后端中将出口代理接入。Modal、Daytona、SSH 和 Singularity **尚未**接收代理环境变量或 CA 挂载。

## 它是什么

- 主机上一个受管理的 `iron-proxy` 子进程，懒安装到 `~/.hermes/bin/iron-proxy`
- 位于 `~/.hermes/proxy/ca.crt` 的本地 CA，沙箱信任该 CA，以便 iron-proxy 能够 MITM TLS 并重写请求头
- 位于 `~/.hermes/proxy/proxy.yaml` 的 `proxy.yaml` 配置，列出你允许的上游主机以及机密转换映射
- 一个 `mappings.json`，记录哪个代理令牌对应哪个真实环境变量

沙箱会获得 `HTTPS_PROXY=http://host.docker.internal:9090`、`HTTP_PROXY=http://host.docker.internal:9091`，以及诸如 `OPENROUTER_API_KEY` 之类的标准服务商环境变量设置为不透明的代理令牌。也会导出相应的 `HERMES_PROXY_TOKEN_<ENV_NAME>` 别名用于诊断。现有的服务商 SDK 读取通常的环境变量名，在 `Authorization` 中发送代理令牌，然后 iron-proxy 的 `secrets` 转换会从主机侧守护进程环境中取出真实值进行替换。

## 它不是什么

- 它**不是**入站的 `hermes proxy` 命令，后者是一个 OAuth 聚合反向代理。不同的命令（`hermes egress`），不同的方向。
- 它**不**位于本地终端和服务商之间——只位于沙箱和服务商之间。
- 它**不**为主机进程进行的进程内 LLM 调用重写凭证。这些调用继续直接使用你的 `.env` 密钥。威胁模型针对的是*沙箱*，而非主机。

## 快速开始

```bash
# 1. 安装 iron-proxy 二进制程序（版本固定，SHA-256 校验）
hermes egress install

# 2. 运行向导：生成 CA、为环境中每个服务商密钥铸造代理令牌、
#    写入 proxy.yaml。
hermes egress setup

# 3. 启动代理守护进程
hermes egress start

# 4. 检查状态
hermes egress status
```

`hermes egress setup` 会从你的环境中发现服务商密钥。如果你的密钥仅存在于 `~/.hermes/.env`（未导出到你的 shell），setup 会自动读取该文件——你无需先 `export` 它们。

当你稍后重新运行 `setup` 时（新增允许列表主机、令牌轮换、切换凭证源），它会先停止正在运行的守护进程（其配置保存在内存中），然后**主动提出为你重启它**，以便更改立即生效。在 tty 上它会询问；传入 `--restart` 则总是重启，传入 `--no-restart` 则保持停止。若要在其他任意时间应用更改，`hermes egress restart` 是停止后再启动的一站式命令。

一旦运行起来，Docker 终端后端会自动：

- 将 `~/.hermes/proxy/ca.crt` 挂载到沙箱内的 `/etc/ssl/certs/hermes-egress-ca.crt`
- 设置 `HTTPS_PROXY`、`HTTP_PROXY`、`REQUESTS_CA_BUNDLE`、`SSL_CERT_FILE`、`CURL_CA_BUNDLE`、`NODE_EXTRA_CA_CERTS`，让所有常见的 HTTP 运行时都通过代理路由并信任该 CA
- 设置 `NODE_OPTIONS=--use-openssl-ca`（追加到你在 `docker_env.NODE_OPTIONS` 中已有的内容之后），使 Node.js 通过其他 CA bundle 变量所控制的 OpenSSL 存储进行路由——有关残余缺口，请见下文的 [Node.js 非对称 CA 注意事项](#nodejs-asymmetric-ca-caveat)
- 添加 `--add-host=host.docker.internal:host-gateway`，使沙箱在 Linux 上能够访问主机侧的代理（Docker Desktop 在 macOS/Windows 上会自动处理）
- 在标准服务商环境变量名下（例如 `OPENROUTER_API_KEY`）导出代理令牌，并为每个铸造的映射额外导出一个 `HERMES_PROXY_TOKEN_<ENV_NAME>` 诊断别名

## 配置

完整配置位于 `~/.hermes/config.yaml` 的 `proxy:` 部分。默认值已在行内注释中说明；所有项都是可选的。

```yaml
proxy:
  # 总开关。为 false 时该特性完全是空操作 —— 不下载
  # 二进制、不添加 docker 挂载、不启动子进程。
  enabled: false

  # 隧道监听端口。沙箱会访问 http://host.docker.internal:<port>。
  tunnel_port: 9090

  # 首次使用时自动下载固定版本的 iron-proxy 二进制。
  auto_install: true

  # iron-proxy 在出口时到何处查找真正的上游密钥。
  #   env       — 进程环境变量（默认）。代理启动时 ~/.hermes/.env
  #               中的内容即为唯一可信来源。
  #   bitwarden — 每次代理重启时从 Bitwarden Secrets Manager 重新获取。
  #               在 BW Web 应用中轮换密钥无需改动 .env 即可生效。
  #               需要 `secrets.bitwarden.enabled: true`。
  credential_source: env

  # 为 true（默认）时，若代理已启用但未运行，Docker 后端会拒绝
  # 启动沙箱。设为 false 可在代理不可用时回退到旧式的
  # “沙箱内持有真实凭据”姿态。
  enforce_on_docker: true

  # 当 `credential_source: bitwarden` 但 BWS 访问令牌 /
  # project_id 缺失，或者 bws 拉取对已映射服务商返回空值时，
  # 守护进程默认会抛错（符合“我要求轮换 —— 不要静默使用过期
  # 环境变量值”的初衷）。设为 true 可退回旧式的宿主环境变量
  # 回退 —— 适用于你希望开始切换到 BW 模式但尚未接入全部密钥的
  # 迁移场景。
  allow_env_fallback: false

  # 应用于出站流量的 SSRF 拒绝列表。省略 / 置为 null 时
  # 使用安全默认值：回环（v4 + v6）、链路本地（含 169.254.169.254
  # 的云元数据 IP）、RFC1918、IPv6 ULA、IPv4 映射 v6、
  # CGNAT，以及 RFC2544 基准测试网段。设置为显式的 `[]`
  # 可完全退出（仅在封闭测试中才有意义）。
  upstream_deny_cidrs: null

  # 在捆绑默认值之外额外允许的上游主机。
  # 支持通配符（`*.foo.com`）。默认值覆盖 OpenRouter、
  # OpenAI、Anthropic、Google、xAI、Mistral、Groq、Together、DeepSeek
  # 和 Nous Research。
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

如果你的智能体需要某个不在列表中的上游 —— 自托管推理端点、额外的云端 LLM、MCP server —— 请将其加入 `proxy.extra_allowed_hosts`。通配符匹配的是完整主机名（`*.example.com` 会匹配 `api.example.com` 和 `staging.example.com`，但不匹配 `example.com` 本身）。

### 默认 SSRF 拒绝 CIDR

无论允许列表如何都会应用。这些网段会被 iron-proxy 在网络边界处拒绝，因此通过已允许主机名实施的 DNS 重绑定攻击无法触达 IMDS 或你的内部网络：

| CIDR | 用途 |
|---|---|
| `127.0.0.0/8`, `::1/128` | 回环（v4 + v6） |
| `169.254.0.0/16`, `fe80::/10` | 链路本地 —— **含 `169.254.169.254` 的 AWS / GCP / Azure IMDS** |
| `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16` | RFC1918 |
| `fc00::/7` | IPv6 ULA |
| `::ffff:0:0/96` | IPv4 映射 IPv6 —— 封堵双栈 IMDS 绕过通道 |
| `100.64.0.0/10` | RFC6598 CGNAT（AWS VPC、K8s pod 网络使用） |
| `198.18.0.0/15` | RFC2544 基准测试网段 |

如需覆盖：将 `proxy.upstream_deny_cidrs` 设为你自己的列表。如需完全退出（例如某个封闭测试需要访问回环上游）：将其设为空列表 `[]`。

### 绑定策略

代理绝不会绑定 `0.0.0.0`。默认绑定因平台而异，因为 iron-proxy v0.39 每个守护进程仅支持**单次绑定**：

- **Linux：** docker bridge 网关（默认 `172.17.0.1:<tunnel_port>`）。容器通过 `host.docker.internal` 访问代理，`--add-host=host.docker.internal:host-gateway` 会将其解析为恰好是这个 bridge 网关 IP —— 若仅绑定回环，从沙箱内部将无法访问。bridge IP 是宿主 `docker0` 接口上的地址，因此不会暴露到局域网；但默认 bridge 网络上的其他容器确实可以访问它，不过请求仍需有效的代理令牌以及已允许的上游。若未检测到 docker bridge（未安装/运行 docker），绑定会回退到回环并给出警告。
- **macOS / Windows Docker Desktop：** 回环（`127.0.0.1:<tunnel_port>`）。Desktop 的 VPNkit 将 `host.docker.internal` 路由到宿主，因此从容器内可访问回环，且这是暴露面最小的选择。

拿到泄露代理令牌的局域网同伴也无法使用代理 —— 两种绑定都无法从外部网络访问。

我们还固定 `metrics.listen: 127.0.0.1:0`，使守护进程内置的 metrics server 获得临时回环端口，而非其默认的 `:9090` —— 否则它会与 `tunnel_port: 9090` 争抢同一套接字，守护进程将因 “address already in use” 拒绝启动。注意 `:0` 临时端口每次启动都随机且不会在任何地方暴露，因此在此固定值下 metrics 实际上被禁用了。

即使 PATH 中靠前的恶意 `ip` 垫片设法注入了一个非私有的 IPv4 作为 bridge 地址（`0.0.0.0`、公网地址、组播、链路本地等），回环回退仍会生效 —— 我们绝不会绑定任何无法通过 `ipaddress.IPv4Address` + `is_*` 检查验证的地址。

## 覆盖的认证方案

`secrets` 转换会在匹配位置出现的任何地方替换代理令牌——而且它匹配的范围不只是 `Authorization: Bearer`：

| 服务商 | 环境变量 | 替换位置 |
|---|---|---|
| OpenRouter、OpenAI、Groq、Together、DeepSeek、Mistral、xAI、Nous | `*_API_KEY` | `Authorization` 请求头 |
| Anthropic 原生 | `ANTHROPIC_API_KEY` | `x-api-key` + `Authorization` |
| Azure OpenAI | `AZURE_OPENAI_API_KEY` | `api-key` + `Authorization`（`*.openai.azure.com`、`*.cognitiveservices.azure.com`、`*.services.ai.azure.com`）|
| Google AI Studio (Gemini) | `GEMINI_API_KEY` / `GOOGLE_API_KEY` | `x-goog-api-key` 请求头或 `?key=` 查询参数 |

`GEMINI_API_KEY` 和 `GOOGLE_API_KEY` 被视为同一个凭据：只生成一个代理令牌，并以**两个**名字注入沙箱，主机环境中任意一个名字都能满足发现逻辑。

## 未覆盖的服务商

涉及请求签名或 SDK 生成的 OAuth 的认证方案无法通过静态请求头替换来完成——如果这些服务商的环境变量存在，沙箱将持有那些服务商的**真实凭据**，而出口隔离保证对它们就不完整了：

| 环境变量 | 服务商 | 原因 |
|---|---|---|
| `AWS_ACCESS_KEY_ID`、`AWS_SECRET_ACCESS_KEY` | AWS Bedrock / SageMaker | 请求由 SigV4 签名 |
| `GOOGLE_APPLICATION_CREDENTIALS` | GCP Vertex AI | 由服务账号文件生成 OAuth |

这些环境变量存在于大多数开发者笔记本电脑上，用于无关的工具（terraform、gcloud、aws CLI、ECR push）。它们会在向导和 `hermes egress status` 中显示为警告，但绝不会阻止代理启动。如果你不在沙箱中使用这些服务商，`unset` 这些变量即可清除警告。

## Bitwarden 集成

如果你已经通过 [`hermes secrets bitwarden setup`](../secrets/bitwarden) 使用 Bitwarden Secrets Manager，那么出口代理可以从那里获取真实凭据，而不是从 `os.environ`：

```bash
hermes egress setup --from-bitwarden
```

这会设置 `proxy.credential_source: bitwarden`，并从你的 BW 项目中发现服务商环境变量名。

### 轮换语义

当 `credential_source: bitwarden` 时，iron-proxy 守护进程**每次启动都会**通过 `bws secret list <project_id>` 从 BWS 重新获取密钥。因此轮换流程是：

1. 在 Bitwarden Web 应用中轮换某个密钥。
2. 在主机上执行 `hermes egress stop && hermes egress start`。
3. 此后启动的沙箱会将代理令牌替换为新值。

无需编辑 `.env`。主机上无需重启 Hermes。代理守护进程是唯一触及新值的东西——你的主机进程和 `os.environ` 都不受影响。

### 启动时响亮失败

当 `credential_source: bitwarden` 时，`hermes egress start` 会在向导层预先检查，同时 `_build_proxy_subprocess_env` 会在守护进程层再次检查：

- BWS 访问令牌环境变量未设置 → 拒绝启动，并提示 `unset` 后重新运行，或使用 `hermes egress setup --no-bitwarden` 切回 env 模式
- `secrets.bitwarden.project_id` 为空 → 拒绝启动，并提示运行 `hermes secrets bitwarden setup`
- `bws secret list` 对一个或多个已映射的服务商未返回任何值 → 拒绝启动，并列出缺失的名称

这是有意为之。在 BW 模式下回退到主机环境重新引入了 BW 路径本意要击败的陈旧性缺陷（操作员选择 BW 就是为了轮换保证；悄悄回退会破坏这一保证）。

配置标志 `proxy.allow_env_fallback: true` 会重新开启面向迁移场景的旧有行为：“当 BWS 不可达时悄悄回退到主机环境”。当你正逐个将密钥迁入 BW，并且希望守护进程以当前可用的任何值启动时，可以使用它。

### 切换凭据来源

| 从 | 到 | 命令 |
|---|---|---|
| env | bitwarden | `hermes egress setup --from-bitwarden` |
| bitwarden | env | `hermes egress setup --no-bitwarden` |

**不带任何上述标志重新运行 `hermes egress setup` 会保留现有的 `credential_source`**——向导拒绝悄悄把你降级回 env。这很重要，因为一旦你配置了 bitwarden 模式，轮换保证就是你当初所选择的；你必须明确表示“我又想要 env 了”才能改变它。

## 斜杠命令

CLI 子命令树：

```
hermes egress install                  # 下载固定版本的 iron-proxy 二进制文件
hermes egress install --force          # 重新下载，即使已存在受管副本

hermes egress setup                    # 交互式向导
hermes egress setup --tunnel-port N    # 覆盖隧道监听端口
hermes egress setup --from-bitwarden   # 使用 BWS 作为凭据来源（失敗即报错）
hermes egress setup --no-bitwarden     # 显式切回环境变量模式
hermes egress setup --rotate-tokens    # 为每个服务商重新生成令牌
                                       #   （默认保留现有令牌）

hermes egress start                    # 启动受管代理守护进程
hermes egress stop                     # 发送 SIGTERM（5 秒宽限期后发送 SIGKILL）
hermes egress restart                  # 停止（如正在运行）然后启动 — 当上游
                                       #   SECRETS 发生变化（轮换、新增服务商）时需要
hermes egress reload                   # 通过管理 API 从 proxy.yaml 热重载规则集 —
                                       #   无需重启，不断开连接（白名单/映射编辑）

hermes egress status                   # 二进制文件 + 配置 + 进程 ID + 监听状态 + 映射
hermes egress status --show-tokens     # 完整打印代理令牌
                                       #   （默认仅显示掩码前缀 + 后缀）

hermes egress disable                  # 将 proxy.enabled 置为 false
                                       #   （不会停止正在运行的代理）

hermes egress config                   # 打印 proxy.yaml 路径，用于调试
```

### 令牌轮换

默认情况下，`hermes egress setup` 会**保留**已有令牌的服务商的代理令牌。新增服务商仅为新服务商生成新令牌；现有令牌保持不变。这避免了重新运行向导时导致正在运行的沙箱出现 401 错误。

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

非 tty 调用（CI、脚本）会跳过提示 — 该标志被视为有意操作。在任何覆盖操作之前，当前的 `mappings.json` 会被复制到带时间戳的同级文件，以便手动恢复：

```
backup: ~/.hermes/proxy/mappings.json.rotated-20260524T143012
```

`hermes egress setup` 在重写配置或令牌映射时会停止正在运行的守护进程，因为守护进程会将旧的 YAML 保留在内存中。执行 `--rotate-tokens` 之后：

```bash
hermes egress start
```

已在运行的容器持有旧令牌，需要重启才能获取新令牌。新的持久化 Docker 容器包含一个 egress-posture 标签，因此 Hermes 不会将未配置出口代理或未轮换令牌之前的容器复用于新会话。

## 状态目录布局

iron-proxy 维护的所有内容都存放在 `~/.hermes/proxy/` 中：

| 路径 | 权限模式 | 用途 |
|---|---|---|
| `~/.hermes/proxy/`（目录） | `0o700` | 仅归你所有且仅你可遍历 |
| `ca.crt` | `0o644` | 分发到沙箱中的公共 CA 证书 |
| `ca.key` | `0o600` | CA 签名密钥 — 永不离开主机 |
| `proxy.yaml` | `0o600` | iron-proxy 配置；每次 `setup` 时重写 |
| `mappings.json` | `0o600` | 沙箱代理令牌 → 上游环境变量 |
| `mappings.json.rotated-*` | `0o600` | 由 `--rotate-tokens` 创建的备份 |
| `iron-proxy.pid` | `0o600` | 运行中守护进程的 PID |
| `iron-proxy.nonce` | `0o600` | 每次启动的 nonce，用于 PID 回收防护 |
| `iron-proxy.log` | `0o600` | 守护进程 stdout/stderr — **v0.39 上包含逐请求记录** |
| `audit.log` | `0o600` | 保留给未来二进制版本中专门的逐请求审计流；预先创建以确保上游接入时隐私契约成立 |

CA 私钥是最敏感的文件。它从第一个字节起就以 `0o600` 创建（无 umask 窗口期 TOCTOU）并使用 `O_NOFOLLOW`，因此同 uid 的攻击者无法通过植入符号链接将其重定向。pidfile、nonce 文件、守护进程日志和审计日志也获得同等处理。

### iron-proxy v0.39 的日志

在目前锁定的二进制版本（**v0.39.0**）中，iron-proxy 将所有输出——守护进程级诊断信息和每请求记录——都写入 **`~/.hermes/proxy/iron-proxy.log`**。v0.39 的 `config.Log` 结构体没有单独的 `audit_path` 字段，因此我们无法在那里将每请求记录路由到专用流。

我们仍然会预先创建 `~/.hermes/proxy/audit.log`，权限为 `0o600` 并使用 `O_NOFOLLOW`，原因如下：

1. 它为未来的版本升级预留了路径：当锁定版本升级到支持 `log.audit_path` 的版本后，每请求记录将自动流向该文件，无需运维侧重新配置。**在此之前该文件将保持 0 字节——暂时不要将监控、告警或取证工具指向它。** 目前请将 `iron-proxy.log` 用于一切用途。
2. 从第一个字节起就保障 0o600 权限，可以防御上游修复上线当天 v0.40+ 在文件尚不存在时以默认 umask 创建该文件的情况。

在该版本升级到来之前，请将 `iron-proxy.log` 视为两类受众的唯一事实来源：

- 守护进程级事件（启动横幅、绑定错误、关闭原因、transform 错误）。用于运维和故障排查。
- 每请求记录（向白名单上游发起的 CONNECT、密钥替换触发、白名单拒绝）。用于取证和合规。

这两个文件在重启之间都是追加写入的。如果你关心长生命周期主机上的磁盘占用，可以使用 logrotate 进行轮转。

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

1. 沙箱发起一个 HTTPS 请求，例如 `POST https://openrouter.ai/v1/chat/completions`，携带 `Authorization: Bearer hermes-proxy-openrouter-…`（这是代理令牌，不是真实密钥）。
2. 由于设置了 `HTTPS_PROXY`，请求会作为 CONNECT 隧道发往 iron-proxy。
3. iron-proxy 检查白名单。`openrouter.ai` 被允许。
4. iron-proxy 为由我们 CA 签名的 `openrouter.ai` 签发叶子证书，终止 TLS 连接，并检查请求。
5. `secrets` transform 匹配 `Authorization` 头中的代理令牌字符串，并替换为来自 iron-proxy 自身环境的真实 `OPENROUTER_API_KEY` 值。
6. 请求被重新加密并转发到 OpenRouter。
7. 在 v0.39 上，该请求被记录到 `~/.hermes/proxy/iron-proxy.log`。当锁定的二进制版本支持分流（v0.40+）后，每请求记录将流向 `~/.hermes/proxy/audit.log`，而守护进程级诊断信息将保留在 `iron-proxy.log` 中。参见 [iron-proxy v0.39 的日志](#logging-on-iron-proxy-v039)。

对非白名单主机（例如 `https://attacker.example.com/leak?key=...`）的请求会在任何字节离开主机之前被以 HTTP 403 拒绝。该拒绝会连同上游主机和来源沙箱一起记录到 `iron-proxy.log` 中。

### 将 CA 分发到沙箱

当 Docker 后端以 `proxy.enabled: true` 启动容器且守护进程正在监听时，它会向 `docker run` 添加以下参数：

| 参数 | 用途 |
|---|---|
| `-v ~/.hermes/proxy/ca.crt:/etc/ssl/certs/hermes-egress-ca.crt:ro` | 以只读方式挂载 CA |
| `-e HTTPS_PROXY=http://host.docker.internal:9090` | Python httpx / curl / go 默认传输 / Node fetch |
| `-e HTTP_PROXY=http://host.docker.internal:9091` | 用于纯 HTTP 的 curl + wget —— 纯 HTTP 转发监听器位于 `tunnel_port + 1` |
| `-e NO_PROXY=127.0.0.1,localhost,::1` | 沙箱内的回环开发服务器绕过代理 |
| `-e REQUESTS_CA_BUNDLE=…ca.crt` | Python `requests` |
| `-e SSL_CERT_FILE=…ca.crt` | Python `ssl` 模块 / OpenSSL —— **替换**系统信任存储 |
| `-e CURL_CA_BUNDLE=…ca.crt` | curl —— **替换**系统信任存储 |
| `-e NODE_EXTRA_CA_CERTS=…ca.crt` | Node.js —— **追加**到系统信任存储 |
| `-e NODE_OPTIONS="<your value> --use-openssl-ca"` | Node.js —— 经由 OpenSSL 信任存储路由（追加；你的 `--max-old-space-size` 等设置会被保留） |
| `-e HERMES_EGRESS_PROXY=1` | 智能体可读取的哨兵变量，用于得知自身已代理感知 |
| `-e OPENROUTER_API_KEY=<proxy-token>` | 标准服务商环境变量名接收代理令牌，使现有 SDK 继续可用 |
| `-e HERMES_PROXY_TOKEN_<NAME>=…` | 每个映射的诊断别名；值与标准服务商环境变量相同 |
| `--add-host=host.docker.internal:host-gateway` | 仅 Linux；Docker Desktop 会自动映射 |

#### Node.js 非对称 CA 注意事项

`REQUESTS_CA_BUNDLE` / `SSL_CERT_FILE` / `CURL_CA_BUNDLE` 会**替换**沙箱内的系统 CA 存储。`NODE_EXTRA_CA_CERTS` 则是**追加**。沙箱内的 Node.js 进程原则上可以通过打开原始 `net.Socket` 并自行发起 TLS 握手来绕过代理——系统 CA 存储仍会信任真实的上游证书，因此凡是 Python / curl 会验证失败的地方，这些请求都能成功。

`NODE_OPTIONS=--use-openssl-ca` 会被追加到 `docker_env.NODE_OPTIONS` 中你已有的内容后面。这会强制 Node 走由 `SSL_CERT_FILE` 控制 OpenSSL 存储，从而缩小不对称性。它**并不**覆盖那些显式向 `tls.connect()` 或 `https.request()` 传入自己 `ca` 选项的代码，但它能堵住最容易的那种情况。

这是 v1 的已知限制。请关注 [github.com/ironsh/iron-proxy/issues](https://github.com/ironsh/iron-proxy/issues) 以获得上游的解决方案；在此期间，不要在你依赖出站隔离的沙箱中运行会打开原始 socket 的不可信 Node 代码。

### docker\_env 冲突

如果你在 `docker_env:` 配置块中设置了控制代理的环境变量（少见但有可能），当设置了 `enforce_on_docker: true` 时，Hermes 会拒绝启动沙箱。这包括以下两类：

- 出站控制变量：`HTTPS_PROXY`、`HTTP_PROXY`、`NO_PROXY`、`REQUESTS_CA_BUNDLE`、`SSL_CERT_FILE`、`CURL_CA_BUNDLE`、`NODE_EXTRA_CA_CERTS`
- 真实服务商环境变量：`mappings.json` 中的每一个名称（例如 `OPENROUTER_API_KEY`、`OPENAI_API_KEY`）

错误示例：

```
docker_env in config.yaml overrides egress-proxy variables
['HTTPS_PROXY', 'OPENROUTER_API_KEY']; enforce_on_docker is enabled.
Remove these keys from docker_env or disable enforce_on_docker to
opt out of egress isolation.
```

当 `enforce_on_docker: false` 时，同样的情况会以警告形式出现，并且你的 `docker_env` 值优先——这对迁移或测试有用，但你是在显式退出隔离保证。

## PID 与 nonce 防御

守护进程的 pidfile 以 `O_EXCL` + `O_NOFOLLOW` + 所有权检查方式写入。并发的 `hermes egress start` 调用会产生两种结果之一：

- 现有 pidfile 指向一个存活的 iron-proxy → 第二次启动会拒绝，并提示“another start in progress”以及运行 `hermes egress stop` 的建议
- 现有 pidfile 已过期（守护进程崩溃）→ 第二次启动会将其删除并重试一次

除此之外，每次 `start_proxy` 都会在两个地方植入一个新的随机 nonce：

- 守护进程环境中的 `HERMES_IRON_PROXY_NONCE=<nonce>`
- `~/.hermes/proxy/iron-proxy.nonce`（pidfile 的同级文件，权限 0o600）

当 `hermes egress stop`（或任何其他 `_pid_alive` 检查）想要确认某个 PID 仍然指向*我们的*守护进程——而不是 iron-proxy 崩溃后某个被分配到相同 PID 的无关联进程——它会读取 `/proc/<pid>/environ` 并查找 nonce。磁盘上的副本正是让这一机制能够跨 CLI 调用生效的原因（内存中的 `_proxy_nonce` 是每进程的，并且在每次 `hermes` 调用时都会重置）。

如果 nonce 检查失败，代码会回退到将 `argv[0]` 的 basename 与 `iron-proxy` 匹配。`stop_proxy` 额外会在 SIGTERM 之前捕获 `/proc/<pid>/stat` 的 starttime，并在 5 秒宽限期后重新验证——如果 starttime 发生了漂移，说明 PID 在等待期间被回收，SIGKILL 会被抑制并给出警告。

## 安全模型

**这能防御什么：**

- Docker 沙箱中一个被提示注入（prompt-injected）的智能体读取 `printenv` / 凭据文件并窃取真实密钥。
- 沙箱中被攻破的依赖向任意主机回连——默认拒绝的白名单会阻断未知目的地。
- 智能体连接云元数据端点（`169.254.169.254`）——iron-proxy 默认通过 `upstream_deny_cidrs` 拒绝这些，包括 IPv4 映射 v6 形式 `::ffff:169.254.169.254`。
- DNS 重绑定：白名单主机名指向私有 IP——deny CIDR 在连接时检查，而非在白名单时检查。
- 同 uid 的本地进程读取 iron-proxy 守护进程的环境来窃取机密——只有 mappings 中引用的环境变量名会被转发，而不是完整的宿主机环境。
- 局域网中已获得泄露的沙箱代理 token 的对端会消耗你的 API 配额——代理绑定 docker 网桥网关（Linux）或 loopback（Docker Desktop），从不绑定 `0.0.0.0`，因此无法从外部网络访问。

**它不能防御什么：**

- 被攻破的宿主机进程。如果智能体进程本身被攻破，无论隔离如何，宿主机 `~/.hermes/.env` 中的真实密钥都会泄露。这是一个针对*沙箱*被攻破的纵深防御特性，而非针对宿主机被攻破。
- **可信代理边界本身的丧失。** token 交换保证假设沙箱信任挂载的 CA 证书（`/etc/ssl/certs/hermes-egress-ca.crt`），并且流量确实到达*我们的* iron-proxy。如果 CA 私钥被盗，或者沙箱出站流量被重定向到攻击者控制的代理基础设施，那么中间人（adversary-in-the-middle）就可以出示有效的叶证书，而代理 token 就不再是有意义的边界了（参见 [MITRE ATT&CK T1588.004](https://attack.mitre.org/techniques/T1588/004/) ——获取 TLS 证书材料以实现 AiTM）。请相应地保护 CA 密钥（它是 `0600`，仅宿主机）和代理端点。
- 通过使用原始 socket 绕过 `HTTPS_PROXY` 的沙箱进程。代理无法拦截没有路由到它的流量。Node.js 通过 `NODE_OPTIONS=--use-openssl-ca` 得到部分缓解（见上述注意事项）。
- 显式挂载进 Docker 的凭据文件（`terminal.credential_files` 或技能注册的挂载）。出站保护的是服务商环境变量；它不会检查任意挂载的文件。不要把真实的服务商凭据挂载进启用强制出站的沙箱。
- 白名单主机的数据外泄。如果允许 `api.openai.com`，智能体可以把外泄数据嵌入到发送到该主机的请求体里。守护进程日志会记录请求发生过，但不会阻止它。
- 未覆盖的服务商（AWS Bedrock SigV4、GCP Vertex 服务账号 OAuth）。它们的环境变量保留在沙箱中；如果你启用它们，那些凭据会完全绕过代理。见 [未覆盖的服务商](#uncovered-providers)。
- iron-proxy 内存中机密的清零。这个 Go 二进制文件在进程内存中持有替换进来的真实凭据；来自同 uid 攻击者的 core dump 或 `/proc/<pid>/mem` 读取会暴露它们。这不属于此层的范围。

## 故障模式

- **未安装二进制文件，`auto_install: true`** — 首次执行 `hermes egress setup` 或 `hermes egress start` 时会下载它。会对照上游的 `checksums.txt` 进行 SHA-256 校验。
- **未安装二进制文件，`auto_install: false`** — `start` 会失败，并给出明确的错误信息指引你手动安装。
- **`enabled: true` 但代理未运行** — 当 `enforce_on_docker: true`（默认）时，Docker 沙箱创建会拒绝启动并给出解释性错误。当 `enforce_on_docker: false` 时，会回退为使用真实凭据直接出站，并记录一条警告。
- **端口冲突** — iron-proxy 会立即退出；`hermes egress start` 会报告最后 20 行日志，并以非零退出码失败。
- **上游主机被拒绝** — 沙箱会从代理收到 HTTP 403，响应体说明了哪个主机不被允许。智能体会看到这个错误并将其报告出来。
- **请求了云元数据 IP（169.254.169.254）** — 无论允许列表如何配置，都会被 `upstream_deny_cidrs` 拒绝。
- **`docker_env` 与某个代理控制变量冲突（强制执行开启）** — 沙箱创建会拒绝，并给出冲突键的名称。
- **`docker_forward_env` 试图转发某个受保护的提供商密钥（强制执行开启）** — 沙箱创建会拒绝；请从 `docker_forward_env` 中移除该键，或通过 `proxy.enforce_on_docker: false` 选择退出。
- **`docker_extra_args` 覆盖了代理环境变量/网络控制（强制执行开启）** — 沙箱创建会拒绝；用户提供的 `-e HTTPS_PROXY=...`、`--env-file` 或 `--network` 参数会在 Hermes 生成的参数之后运行，可能绕过出口限制。
- **`credential_source: bitwarden` 中缺少 BWS access 令牌** — `hermes egress start` 会拒绝，并给出 `--no-bitwarden` 作为恢复提示。
- **iron-proxy 未在 5 秒内绑定端口** — 进程会被杀掉，pidfile 会被删除，错误信息会指明端口号 + `iron-proxy.log` 的尾部内容。
- **并发调用 `hermes egress start`** — 如果第一个调用的守护进程已启动，第二次调用会以 "another start in progress" 拒绝；否则第二次调用会删除过期的 pidfile 并继续执行。

## 故障排查

### "Refusing to start: BWS_ACCESS_TOKEN is not set"

你启用了 `credential_source: bitwarden`，但令牌环境变量不在你的 shell 中。可以任选其一：

```bash
export BWS_ACCESS_TOKEN=…   # 一次性
hermes egress start
```

或者把它移入 `~/.hermes/.env`。或切回 env 模式：

```bash
hermes egress setup --no-bitwarden
```

### "iron-proxy exited immediately"

查看 `~/.hermes/proxy/iron-proxy.log` 的最后 20 行。常见原因：

- 端口已被占用 → 修改 `proxy.tunnel_port` 或杀掉占用 9090 的其他进程
- `proxy.yaml` 无效 → 运行 `hermes egress setup` 重新生成
- CA 证书/密钥权限错误 → `chmod 0o600 ~/.hermes/proxy/ca.key`

### "iron-proxy did not bind \<bind-host\>:9090 within 5s"

守护进程已启动但始终未绑定监听器。通常意味着二进制文件卡住，或在启动时正在做开销很大的事情。检查 `~/.hermes/proxy/iron-proxy.log`。孤立进程会被自动杀掉，pidfile 也会被清理，因此你只需重试 `hermes egress start` 即可。

### 沙箱连接代理时超时（Linux）

容器会把 `host.docker.internal` 解析为 docker 桥接网关，而代理也绑定在该网关上，但主机防火墙（通常是默认拒绝 INPUT 的 `ufw`）会丢弃 `docker0` 上从容器到主机的流量。可以这样从容器里验证：

```bash
docker run --rm --add-host host.docker.internal:host-gateway busybox \
  nc -zv -w 3 host.docker.internal 9090
```

如果在 `hermes egress status` 显示 `listening` 的情况下仍然超时，就在防火墙中放行桥接子网，例如对于 ufw：

```bash
sudo ufw allow in on docker0 to any port 9090 proto tcp
sudo ufw allow in on docker0 to any port 9091 proto tcp
```

（9091 = `tunnel_port + 1` 上的纯 HTTP 转发监听器。）

### 沙箱看到代理返回的 `HTTP 403`

沙箱内的智能体试图访问不在 `proxy.extra_allowed_hosts` 中的主机。403 的响应体会说明是哪个主机。如果你想允许它，就加入你的配置：

```yaml
proxy:
  extra_allowed_hosts:
    - api.example.com
    - "*.staging.example.com"
```

然后执行 `hermes egress setup`（重新生成 `proxy.yaml`）以及 `hermes egress stop && hermes egress start`。

### 沙箱遇到 SSL 验证错误

要么是 CA 没有挂载到沙箱中（少见；当 `proxy.enabled: true` 时 docker 后端会自动挂载），要么是你的镜像里的 HTTP 客户端读取了非标准的环境变量。

```bash
# 在沙箱内：
cat /etc/ssl/certs/hermes-egress-ca.crt | head -1
# 应该输出：-----BEGIN CERTIFICATE-----
env | grep -E "^(REQUESTS|CURL|SSL|NODE).*CA"
# 应该列出全部四个 CA 捆绑包环境变量，均指向 /etc/ssl/certs/hermes-egress-ca.crt
```

如果证书不存在，请检查 `proxy.enabled: true` 并且 `hermes egress status` 显示 `Listening yes`。如果环境变量缺失，有可能是沙箱镜像运行的入口脚本把这些变量剔除了——检查你的 `docker_env` 配置。

### 沙箱从上游收到 `HTTP 401`

两个常见原因：

1. **重新执行 setup 时令牌被覆盖。** 你运行了 `hermes egress setup --rotate-tokens`（或以其他方式轮换了令牌），而正在运行的沙箱仍持有旧令牌。请重启沙箱。
2. **Bitwarden 刷新静默失败。** 在新的“大声失败”行为下这不应发生，但如果你设置了 `proxy.allow_env_fallback: true`，守护进程可能是带着过期的环境变量值启动的。检查守护进程的环境变量（`/proc/<iron-proxy-pid>/environ`）中是否有预期的 `OPENROUTER_API_KEY` 等。

### 父进程死亡后出现“地址已被占用”

父 Hermes 进程在 `hermes egress start` 期间死亡（在监听探测时按下 Ctrl-C、OOM、panic）。新的修复逻辑会在 `Popen` 之后立即写入 pidfile，因此孤儿进程可被找回：

```bash
hermes egress stop   # 通过 pidfile 找到孤儿进程并终止它
hermes egress start
```

如果 `hermes egress stop` 提示“iron-proxy 未在运行”，但你在 `ps` 中仍能看到该守护进程，说明 pidfile 与实际情况不同步。手动恢复：

```bash
pkill -TERM iron-proxy
rm -f ~/.hermes/proxy/iron-proxy.pid ~/.hermes/proxy/iron-proxy.nonce
hermes egress start
```

### 检查单次请求的行为

在固定版本二进制（**v0.39**）上，守护进程级事件与单次请求记录都写入 `~/.hermes/proxy/iron-proxy.log`。格式为行分隔 JSON。用 grep 筛选特定的上游：

```bash
grep '"upstream":"openrouter.ai"' ~/.hermes/proxy/iron-proxy.log | tail -20
```

或者实时观察：

```bash
tail -f ~/.hermes/proxy/iron-proxy.log | jq
```

当固定版本升级到 v0.40+（新增 `log.audit_path`）后，单次请求记录将迁移到 `~/.hermes/proxy/audit.log`，而 `iron-proxy.log` 只保留守护进程级事件。在这次版本升级之前，`audit.log` 是空的占位文件（预先以 `0o600` 创建，以便将来的守护进程继承严格的权限）——今天就把你的 logrotate / 监控工具接到 `iron-proxy.log` 上，并计划在版本升级后再加上 `audit.log`。

## 局限性（v1）

- 仅支持 Docker 后端。Modal、Daytona 与 SSH 的接入将在单独的 PR 中跟进。
- 采用基于签名的认证的服务商（AWS SigV4、GCP 服务账号 OAuth）完全绕过代理——见[未覆盖的服务商](#uncovered-providers)。基于请求头令牌的服务商（bearer、`x-api-key`、`api-key`、`x-goog-api-key`）均已覆盖。
- 上游没有原生 Windows 二进制。请在 Linux / macOS / WSL 上运行。
- CA 在首次生成时是 10 年期的自签名证书。轮换需要手动执行 `openssl genrsa ...`（或者等待后续新增 `hermes egress rotate-ca` 的跟进版本）。
- 重新运行 setup 会在重写配置或映射后停止正在运行的守护进程；在令牌轮换后，请重启（或者只针对规则集变更使用 `hermes egress reload`），并重启已在运行的沙箱。
- iron-proxy 的内存中密钥清零由上游控制。拥有 `/proc/<pid>/mem` 读取权限的同 uid 攻击者可以从守护进程的内存中读取已换入的密钥。
- iron-proxy v0.39 仅支持**每个守护进程单一绑定**（在 Linux 上绑定 docker 网桥网关，在 Docker Desktop 上绑定回环）并把守护进程记录与单次请求记录合并到单一日志流。当上游新增 `proxy.http_listens`（复数）与 `log.audit_path` 后，一次版本升级即可接入多重绑定和专用审计流。

## 另见

- 上游项目：[github.com/ironsh/iron-proxy](https://github.com/ironsh/iron-proxy)
- 上游文档：[docs.iron.sh](https://docs.iron.sh/)
- Bitwarden 集成：[`hermes secrets bitwarden`](../secrets/bitwarden)
- Hermes Docker 终端后端：[Docker](../docker)
- 开发者 / 贡献者参考：[Egress 代理内部机制](../../developer-guide/egress-internals)
