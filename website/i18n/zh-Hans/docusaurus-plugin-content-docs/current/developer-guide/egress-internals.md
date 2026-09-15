---
sidebar_position: 14
title: "Egress 代理内部机制"
description: "iron-proxy egress 防火墙如何与 Hermes 集成——模块布局、生命周期、安全不变量与扩展点"
---

# Egress 代理内部机制

本页从贡献者 / 插件作者的角度介绍 egress 凭证注入防火墙（`hermes egress` / iron-proxy）的架构。面向最终用户的安装与使用文档位于 [Egress 代理](../user-guide/egress/iron-proxy.md)。

威胁模型与高层设计已在用户页面中概述；本页讲述的是它*如何*连接、与安全相关的代码位于何处，以及如果你要改动它，必须维护哪些不变量。

## 模块布局

```text
agent/proxy_sources/iron_proxy.py     核心：二进制安装、CA 生成、配置构建、
                                       子进程生命周期、映射 I/O、PID/nonce
                                       防御。尽可能采用纯函数接口。

hermes_cli/proxy_cli.py               向导 + 斜杠命令处理器。
                                       `hermes egress {install,setup,start,stop,
                                       status,disable,config}`。将核心模块
                                       接入 argparse。

hermes_cli/subcommands/egress.py:_dispatch_egress
                                       顶层子解析器分发器。
                                       dest='egress_command'（有意与入站 OAuth
                                       的 `hermes proxy` 子解析器隔离，后者使用
                                       dest='proxy_command'）。

hermes_cli/config.py: proxy schema    DEFAULT_CONFIG 中的 `proxy:` 块。
                                       新增一个开关意味着：在此处添加它，在
                                       proxy_cli.cmd_setup 中添加向导提示或
                                       `setdefault`，并在用户指南页面中
                                       编写文档。

tools/environments/docker.py
  _egress_proxy_args_for_docker()     构建 Docker 后端在
                                       `proxy.enabled: true` 时注入的
                                       volume_args / env_overrides /
                                       host_args 三元组。

  DockerEnvironment.__init__          Docker 侧合并逻辑：针对关键 egress 变量
                                       的冲突检测、通过
                                       _HERMES_EGRESS_NODE_OPTIONS_APPEND
                                       哨兵进行的 NODE_OPTIONS 追加合并、
                                       enforce_on_docker 优先级。

tests/agent/test_iron_proxy.py              密封测试（约 70 个）。二进制安装
                                       路径、配置构建、映射 I/O、
                                       子进程生命周期、docker 参数构建器、
                                       deny CIDR 默认值、绑定策略、CA
                                       TOCTOU、ensure_audit_log 行为等。
                                       tests/hermes_cli/test_iron_proxy_cli.py          CLI 处理器单元测试（约 20 个）。

                                       Argparse
                                       接线、fail-loud 路径、BWS 刷新
                                       接线、dest='egress_command'
                                       回归防护。

tests/agent/test_iron_proxy_e2e.py          实时 E2E（由 HERMES_RUN_E2E=1 门控）。
                                       真实 iron-proxy 二进制、真实 curl、
                                       端到端令牌交换验证。
```

## 生命周期

```text
hermes egress install
  -> agent.proxy_sources.iron_proxy.install_iron_proxy(force=...)
       从 GitHub Releases 下载锁定的 tarball + checksums.txt。
       解压前进行 SHA-256 校验。
       在 Python 3.12+ 上使用 tarfile.extract(..., filter="data")（PEP 706）；
         在旧版 Python 上回退为普通 extract，并通过 _pick_tar_member 
         对成员名进行清理。
       暂存到 ~/.hermes/bin/.iron-proxy_XXXX，chmod 755，os.replace
         到 ~/.hermes/bin/iron-proxy（原子操作）。
       _VERSION_CACHE.pop(target)，以便强制重新安装后在下次调用时
         重新探测 --version。

hermes egress setup [--from-bitwarden | --no-bitwarden] [--rotate-tokens]
  -> proxy_cli.cmd_setup
       步骤 1。find_iron_proxy(install_if_missing=False) -> 若不存在则安装。
       步骤 2。ensure_ca_cert()
                 通过子进程运行 openssl genrsa + req。
                 通过 os.open(O_WRONLY|O_CREAT|O_TRUNC|O_NOFOLLOW, 0o600)
                   写入 CA 密钥 + os.replace。在默认 umask 下绝不会以明文留存在磁盘上。
                 以 0o644（公开）写入 CA 证书。
       步骤 3。discover_provider_mappings()，或在 --from-bitwarden 时
                 通过 fetch_bitwarden_secrets() 从 BWS 拉取名称。
                 merge_mappings(existing=load_mappings(), discovered,
                                rotate=args.rotate_tokens) 保留先前的
                 令牌，除非传入 --rotate-tokens。
                 discover_uncovered_providers() 并发出警告。
       步骤 4。ensure_audit_log(audit_log_path)   # 遇 OSError 抛出异常
               build_proxy_config(...)，并由调用点应用默认值
                 （deny CIDR 默认、绑定策略来自 _default_http_listen）。
               write_proxy_config(cfg)            # 通过 .tmp + os.replace 原子操作，0o600
               write_mappings(mappings)           # 原子操作，0o600
       步骤 5。proxy_cfg["enabled"] = True；credential_source 保留逻辑
               （重新运行时不要静默降级 bitwarden -> env）；
               save_config(cfg)。

hermes egress start
  -> proxy_cli.cmd_start
       预检（拒绝启动路径）：
         - credential_source=bitwarden？-> 预先校验 access_token_env + project_id
       -> iron_proxy.start_proxy(
            refresh_secrets_from_bitwarden=...,
            bitwarden_config=...,
          )
            existing=_read_pid()；若存活，幂等返回。
            _build_proxy_subprocess_env(...)： 白名单 + 映射的 real_env_names、
              剥离 HTTPS_PROXY 等以避免递归、可选的 BWS 刷新
              （值缺失时抛出异常，除非 allow_env_fallback=true）。
            植入 nonce：_proxy_nonce = sha256(urandom(16))；env[NONCE_ENV] = ...
            通过 O_NOFOLLOW + 0o600 + st_uid 检查打开 log_path。
            以 stdin=DEVNULL、stdout=log_fd、stderr=STDOUT、
              start_new_session=True（POSIX）调用 Popen。
            在 finally 中关闭父进程的 log_fd。
            _write_pidfile_safely(pidfile, proc.pid)
              O_EXCL + O_NOFOLLOW + uid 检查 + 持久化 nonce sidecar。
              遇到 FileExistsError -> 区分存活与过期，过期则重试一次。
            安装 SIGINT/SIGTERM 处理器（仅主线程）。
            轮询循环（do-while 形态）：
              while True:
                if proc.poll() is not None: 读取日志尾部 + unlink pidfile + 抛出异常
                if _port_listening(probe_host, tunnel_port): break  # probe_host = 配置的绑定主机
                if time.time() >= deadline: break  （do-while：在首次探测之后检查）
                time.sleep(0.1)
            若退出时未在监听：_kill_and_wait(proc) + unlink pidfile + 抛出异常。

hermes egress stop
  -> iron_proxy.stop_proxy
       _read_pid + _pid_alive 守卫。
       starttime_before = _pid_proc_starttime(pid)   # 仅 Linux；其他平台为 None
       os.kill(pid, SIGTERM)
       最多等待 5 秒以优雅退出。
       宽限期后：重新检查 starttime + _pid_alive。
         若已回收（starttime 漂移或 _pid_alive 为 False），则不要 SIGKILL。
         否则执行 os.kill(pid, _KILL_SIGNAL)。
       _cleanup_state_files: unlink pidfile + 同名 nonce 辅助文件。
```

## 安全不变量

这些是承重属性。如果你改动了该模块，就必须保持它们不变。凡是存在回归测试的地方，都已标明测试名称。

### 文件系统权限

| 路径 | 模式 | 测试 |
|---|---|---|
| `~/.hermes/proxy/`（目录） | `0o700` | `test_proxy_state_dir_is_0o700` |
| `ca.key` | `0o600` | `test_ca_key_created_with_0o600` |
| `ca.crt` | `0o644` | （隐式；`ensure_ca_cert` 中的 chmod 调用） |
| `proxy.yaml` | `0o600` | （`write_proxy_config` 中原子重命名后的 chmod） |
| `mappings.json` | `0o600` | （`write_mappings` 中原子重命名后的 chmod） |
| `iron-proxy.pid` | `0o600` | （`_write_pidfile_safely` 中的 `os.open(..., 0o600)` 模式） |
| `iron-proxy.nonce` | `0o600` | （`_write_pidfile_safely` 中的 `os.open(..., 0o600)` 模式） |
| `audit.log` | `0o600` | `test_ensure_audit_log_creates_with_0o600` |
| `iron-proxy.log` | `0o600` | （`os.open(..., 0o600)` + `fchmod`） |

所有写入路径都使用 `os.open(O_WRONLY | O_CREAT | O_NOFOLLOW, 0o600)` + `os.fstat().st_uid` 检查。禁止使用 `shutil.copy2` + `os.chmod`，因为它会泄露一个默认 umask 窗口。

### 子进程环境变量最小化

`_build_proxy_subprocess_env` 绝不能使用 `os.environ.copy()`。允许列表是 `_PROXY_SUBPROCESS_ENV_ALLOWLIST`（PATH、HOME、locale 等）再加上 `load_mappings()` 引用的环境变量名。其他一切内容都留在宿主机上。

回归测试：`test_subprocess_env_strips_unrelated_secrets`、`test_subprocess_env_strips_proxy_recursion_vars`、`test_subprocess_env_keeps_infrastructure_vars`。

### 绑定策略

`_default_http_listen` 返回单元素列表：在 Linux 上是 docker bridge 网关 IP（容器通过 `host.docker.internal:host-gateway` 访问代理，该地址解析为 bridge 网关——在那里从容器内部无法访问回环绑定）；在 macOS/Windows Docker Desktop 上则用回环（VPNkit 将 `host.docker.internal` 路由到宿主机）。Linux 上如果探测不到 docker0 bridge，则回退到回环并发出警告。绝不使用 `0.0.0.0`，绝不使用 `:PORT`（INADDR_ANY）。

`_detect_docker_bridge_ip` 通过 `ipaddress.IPv4Address` 进行校验，并拒绝 `is_unspecified` / `is_loopback` / `is_multicast` / `is_reserved` / `is_link_local` / `is_global`。PATH 上恶意的 `ip` shim 无法注入 `0.0.0.0`。

**v0.39 schema 约束与监听器角色（已对照二进制实测验证）：** 该二进制的 `config.Proxy` 结构体只有单数形式的监听器字段——不存在 `http_listens`（复数）列表。`tunnel_listen` 是 CONNECT + MITM 监听器（`HTTPS_PROXY` 流量命中的就是它）；`http_listen` 只处理绝对形式的纯 HTTP 转发（发给它的 CONNECT 会作为普通请求被转发到上游并返回 400）。因此 `build_proxy_config` 将 `tunnel_listen` 绑定到 `tunnel_port`，将 `http_listen` 绑定到 `tunnel_port + 1`，两者都绑定在平台绑定主机上。Docker 后端将 `HTTPS_PROXY` 设为 `tunnel_port`，将 `HTTP_PROXY` 设为 `tunnel_port + 1`。

存活探针（`start_proxy` 轮询循环、`get_status`）通过 `_read_http_listen_from_config()` 读取所配置的绑定主机，并探测该主机——硬编码的回环探测会将一个健康的 bridge 绑定守护进程报告为已死。

回归测试：`test_default_bind_is_loopback_not_zero_zero`（断言不存在 INADDR_ANY，并且渲染出的 yaml 中不含 `http_listens`）、`test_default_bind_uses_docker_bridge_on_linux`、`test_default_bind_falls_back_to_loopback_without_bridge`、`test_default_bind_is_loopback_on_macos`、`test_detect_docker_bridge_ip_rejects_dangerous`（针对 8 个攻击输入参数化）。

### 指标端口冲突

在 iron-proxy v0.39 中，`metrics.listen` 默认是 `:9090`——与 Hermes 默认的 `tunnel_port: 9090` 是同一个端口。`build_proxy_config` 必须显式固定 `metrics.listen: 127.0.0.1:0`，使指标绑定获得一个临时回环端口，无论运维人员如何选择 `tunnel_port`，都绝不可能与代理监听器冲突。

回归测试：`test_metrics_listener_pinned_to_loopback_ephemeral`。

### 默认拒绝 CIDR

`_DEFAULT_UPSTREAM_DENY_CIDRS` 覆盖回环（v4 + v6）、链路本地（包括 169.254.169.254 的 IMDS 及 IPv4 映射 v6 形式）、RFC1918、IPv6 ULA、CGNAT 以及 RFC2544 基准测试范围。`build_proxy_config(..., upstream_deny_cidrs=None)` 必须输出默认值；只有显式传入空列表才选择退出。

回归测试：`test_default_deny_cidrs_present_when_unspecified`、`test_default_deny_includes_ipv4_mapped_v6`。

### 审计日志 fail-loud

`ensure_audit_log` 在遇到任何 `OSError` 时都会抛出 `RuntimeError`。在固定的 v0.39 上，守护进程从不写这个文件（没有 `log.audit_path` 字段），因此 `cmd_setup` 将该失败视为 WARNING（在版本升级之前该文件非承载性）并在成功行上标注"reserved"。当锁定版本移动到带有 `log.audit_path` 的版本时，需重新审视：预创建将成为"首字节即 0o600"保证的承载环节，向导应再次 fail loud。

**v0.39 schema 约束：** `log.audit_path` 不是 iron-proxy v0.39 的 `config.Log` 结构体中的字段，因此 `build_proxy_config` 接受 `audit_log` 关键字参数，但不会将其写入渲染后的 yaml。在 v0.39 上，逐请求记录与守护进程级事件一起落在 `iron-proxy.log` 中。`audit.log` 文件仍会被预创建为 `0o600` 且带 `O_NOFOLLOW`，这样当锁定版本升级到支持独立流的版本时，隐私约定依然成立。

回归测试：`test_ensure_audit_log_raises_on_immutable_parent`、`test_audit_log_kwarg_does_not_inject_audit_path_v039`。

### Bitwarden 模式 fail-loud

当 `credential_source: bitwarden` 且 `proxy.allow_env_fallback: false`（默认值）时：
- 缺少访问令牌环境变量 -> `cmd_start` 拒绝。
- 缺少 `project_id` -> `cmd_start` 拒绝。
- `bws secret list` 对一个或多个已映射的服务商没有返回任何值 -> `_build_proxy_subprocess_env` 抛出。

在 BW 模式下回退到主机环境变量，恰恰会重新引入 BW 路径本意要避免的陈旧性 bug。

回归测试：`test_cmd_start_refuses_when_bitwarden_token_missing`（CLI 层）；`_build_proxy_subprocess_env` 中的 strict-mode 断言（守护进程层）。

### docker_env 冲突检测

当 `enforce_on_docker: true` 时，`docker_env` 对任何管控外联的变量（HTTPS_PROXY、SSL_CERT_FILE、NODE_EXTRA_CA_CERTS 等）或任何已映射的 `real_env_name`（OPENROUTER_API_KEY 等）的覆盖，都会在容器启动之前触发 `RuntimeError`。

回归测试：`test_docker_env_collision_with_proxy_raises_when_enforce`。

### PID 复用防御

`_pid_alive` 在信任 `argv[0]` 的 basename 匹配之前，必须查询进程内的 `_proxy_nonce`（同进程场景）或磁盘上的 `iron-proxy.nonce`（跨 CLI 场景）。`stop_proxy` 在 SIGKILL 之前必须重新检查 `/proc/<pid>/stat` 的 starttime，并在 starttime 发生偏移时抑制该信号。

回归测试：`test_stop_proxy_suppresses_sigkill_on_pid_recycle`、`test_pid_proc_starttime_parses_comm_with_parens`、`test_persisted_nonce_roundtrip`。

### 重新 setup 时的令牌保留

`merge_mappings(existing, discovered, rotate=False)` 对重叠的服务商必须返回之前的令牌。重新运行 `hermes egress setup` 不得静默地让运行中的沙箱遭遇 401。`--rotate-tokens` 是显式的选择加入方式。

回归测试：`test_merge_mappings_preserves_existing_tokens`、`test_merge_mappings_rotate_mints_fresh_tokens`。

### `credential_source` 保留

在重新运行时，若无显式的 `--no-bitwarden` 标志，`cmd_setup` 不得将 `credential_source: bitwarden` 降级为 `env`。运行 `hermes egress setup`（不带标志）会保留先前所配置的任何值。

通过 CLI 测试中的 `cmd_setup` 流程进行测试（当 `--from-bitwarden` 之后跟一次普通的 `setup` 重新运行时，会走 bitwarden 保留路径）。

## 扩展点

### 添加新的 bearer-token 服务商

`iron_proxy.py` 中的 `_BEARER_PROVIDERS` 将环境变量名映射到上游主机元组。添加一个条目即可被 `discover_provider_mappings()` 发现；当该环境变量存在时，向导会自动为其铸造令牌。

```python
_BEARER_PROVIDERS: Dict[str, Tuple[str, ...]] = {
    ...,
    "MY_PROVIDER_API_KEY": ("api.myprovider.com",),
}
```

同时更新 `_DEFAULT_ALLOWED_HOSTS`，让代理默认允许该上游。运行 `test_discover_provider_mappings_*` 进行确认。

### 添加新的 header-token 服务商（x-api-key 家族）

如果服务商使用静态的非 Authorization 头进行认证（比如 Anthropic 的 `x-api-key`、Azure 的 `api-key`，或 Gemini 的 `x-goog-api-key`），将其加入 `_HEADER_AUTH_PROVIDERS`——iron-proxy 的 `secrets.replace.match_headers`  以任意头名为目标，因此这些是一等公民式的可替换服务商：

```python
_HEADER_AUTH_PROVIDERS: Dict[str, Dict[str, Tuple[str, ...]]] = {
    ...,
    "MY_PROVIDER_API_KEY": {
        "hosts": ("api.myprovider.com",),
        "match_headers": ("x-my-auth-header", "Authorization"),
        "aliases": (),
    },
}
```

`aliases` 仅用于**同一**凭证的可互换环境变量名（例如用 `GOOGLE_API_KEY` 代表 `GEMINI_API_KEY`）——带别名的名字会折叠为单一映射，因为同一主机上的两条 `require: true` 规则会互相拒绝对方请求。同时更新 `_DEFAULT_ALLOWED_HOSTS`。

### 添加一个新的签名认证服务商（未覆盖）

如果该服务商使用 SigV4 / SDK 签发的 OAuth / 请求签名，那么静态头替换无法覆盖它。将该环境变量添加到 `_NON_BEARER_PROVIDERS`，这样向导和 `hermes egress status` 就会对其发出警告：

```python
_NON_BEARER_PROVIDERS: Tuple[str, ...] = (
    ...,
    "MY_SIGNED_PROVIDER_ACCESS_KEY",
)
```

### 将 iron-proxy 接入非 Docker 后端

`_egress_proxy_args_for_docker` 是 Docker 专用的。希望进行类似接入的后端需要自己的对应实现，它应：

1. 读取 `load_config().get("proxy", {})`；如果 `enabled` 为 false，则返回空参数。
2. 调用 `iron_proxy.get_status()`；在 `configured` / `pid` / `listening` / `ca_cert_path` 失败路径上体现 `enforce` 语义。
3. 调用 `iron_proxy.load_mappings()`；如果映射为空且 `enforce_on_docker: true`，则拒绝挂载。
4. 设置这七个环境变量（HTTPS_PROXY、NO_PROXY、REQUESTS_CA_BUNDLE、SSL_CERT_FILE、CURL_CA_BUNDLE、NODE_EXTRA_CA_CERTS、HERMES_EGRESS_PROXY）以及每个映射对应的 `HERMES_PROXY_TOKEN_<NAME>` 变量。
5. 将 CA 证书分发到沙箱中运行时将会信任的路径（通常为 `/etc/ssl/certs/hermes-egress-ca.crt`）。
6. 实现针对用户后端特定环境配置的冲突检测。

Docker 实现大约 150 行；预计 Modal / Daytona / SSH 也需要类似的体量。

### 订阅逐请求审计事件

在当前固定的 v0.39 上，iron-proxy 会将行分隔 JSON 写入 `~/.hermes/proxy/iron-proxy.log`（守护进程记录与逐请求记录合并；参见用户指南中的 "Logging on iron-proxy v0.39"）。插件 / 外部监听程序可以 tail 该文件，并对允许列表拒绝、密钥替换或上游错误做出反应。当固定的版本被升级到支持 `log.audit_path` 的版本时，逐请求流会迁移到 `audit.log`，接入该路径的监听程序无需运维操作即可生效。该 schema 记录在 [docs.iron.sh/audit](https://docs.iron.sh/audit)（链接）。

## 测试

```bash
# Hermetic suite (no network, no real binary)
scripts/run_tests.sh tests/agent/test_iron_proxy.py tests/hermes_cli/test_iron_proxy_cli.py

# Live E2E (real binary, real curl, real CONNECT tunnel)
HERMES_RUN_E2E=1 scripts/run_tests.sh tests/agent/test_iron_proxy_e2e.py

# Live PTY smoke against `hermes egress`
HERMES_HOME=/tmp/hermes-egress-test python3 -m hermes_cli.main egress --help
HERMES_HOME=/tmp/hermes-egress-test python3 -m hermes_cli.main egress setup --help
```

CLI 使用 argparse，所以 `--help` 是探测“我的新标志是否正确注册”的一个很好的首选手段。

## 另请参阅

- 面向用户的设置 + 故障排查：[Egress proxy](https://hermes-agent.nousresearch.com/docs/user-guide/egress/iron-proxy)
- Docker 后端内部原理：[Docker](https://hermes-agent.nousresearch.com/docs/user-guide/docker)
- Bitwarden Secrets Manager 集成：[`hermes secrets bitwarden`](https://hermes-agent.nousresearch.com/docs/user-guide/secrets/bitwarden)
- CLI 命令参考：[`hermes egress`](https://hermes-agent.nousresearch.com/docs/reference/cli-commands#hermes-egress)
- 沙箱注入的环境变量：[Egress proxy (sandbox-injected)](https://hermes-agent.nousresearch.com/docs/reference/environment-variables#egress-proxy-sandbox-injected)
