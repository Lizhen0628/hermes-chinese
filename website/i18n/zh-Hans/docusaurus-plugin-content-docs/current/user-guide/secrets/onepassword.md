# 1Password

在进程启动时解析服务商的 API 密钥，从 [1Password](https://1password.com/) 读取，而不是将其以明文形式存储在 `~/.hermes/.env` 中。你把密钥保留为 1Password 条目，并通过 `op://vault/item/field` 引用它们；轮换凭据只需在 1Password 中改动一次。

## 工作原理

1. 安装官方 [1Password CLI](https://developer.1password.com/docs/cli/get-started/)（`op`）并通过认证——可以使用**服务账号令牌**（无头服务器）或**交互式/桌面会话**（你的笔记本电脑）。
2. 在 `~/.hermes/config.yaml` 中将环境变量名映射到 `op://` 引用。
3. 每次 `hermes`（或网关，或定时任务）启动时，在 `~/.hermes/.env` 加载之后，Hermes 会为每个引用运行 `op read`，并将解析出的值设置到 `os.environ`。
4. 默认情况下，Hermes 会**覆盖**环境中已有的值，因此 1Password 是唯一可信来源——轮换一次凭据，每个 Hermes 进程在下次启动时都会采用新值。若希望 `.env` 优先，可将 `override_existing` 设为 `false`。

Hermes 从不代替你进行认证，也从不下 载 `op`：它只是调用你已经安装好、已经信任的 CLI。如果 `op` 缺失、你的会话被锁定，或某个引用错误，Hermes 会打印一行警告，并以 `.env` 中已有的任何凭据继续运行——它从不阻塞启动。

## 认证

`op` 支持两种便于非交互式使用的模式；Hermes 对二者均适用：

- **服务账号**（推荐用于服务器/CI）：在 1Password 中创建一个服务账号，授予其相关保险库的读取权限，并将其令牌作为 `OP_SERVICE_ACCOUNT_TOKEN` 导出到 `~/.hermes/.env`。该令牌就是凭据——像对待任何 bearer 令牌一样对待它。
- **桌面/交互式会话**（笔记本电脑）：运行 `op signin`（或在 1Password 应用中启用 CLI 集成）。Hermes 会将你的 `OP_SESSION_*` 变量传递给 `op` 子进程。1Password 缓存键包含这些会话变量，因此登录到不同账号时绝不会返回在上一个身份下缓存的值。

## 引导令牌

当你使用**服务账号令牌**认证时，该令牌本身就是 Hermes 在能够解析任何 `op://` 引用*之前*所需的引导凭据。它必须存在于每个解析密钥的进程的 `os.environ` 中——包括定时任务（`kanban.dispatch_in_gateway: false`）、子进程调用、CLI 运行、macOS launchd 代理和 Docker 容器——而不仅仅是交互式网关。有三种方式使其可用，按优先级顺序：

1. **在 `~/.hermes/.env` 中（推荐）。** `hermes secrets onepassword setup --token <token>` 会把令牌写入 `~/.hermes/.env`，与 Bitwarden 的 `BWS_ACCESS_TOKEN` 完全一致。由于 `load_hermes_dotenv()` 总是加载 `.env`，令牌在任何地方都可用，无需额外设置。这是最简单可靠的选项。

2. **在 `~/.hermes/.op.env` 中（已被 git 忽略）。** 如果你希望将服务账号令牌排除在 `.env` 之外——例如让 `.env` 能够被检入私有 dotfiles 仓库，同时令牌不进入版本控制——可将它放入 `~/.hermes/.op.env`：

   ```bash
   echo 'OP_SERVICE_ACCOUNT_TOKEN=ops_...' > ~/.hermes/.op.env
   chmod 600 ~/.hermes/.op.env
   ```

   Hermes 会在启动时自动加载 `.op.env`，在 `.env` **之后**，且**绝不**覆盖环境中已存在的令牌。`.op.env` 已被 git 忽略，因此令牌绝不会进入提交文件。

3. **通过 systemd 的 `EnvironmentFile`（Linux 网关）。** 如果你在 systemd 下运行网关，可以将令牌直接注入到服务环境中：

   ```ini
   [Service]
   EnvironmentFile=-/home/youruser/.hermes/.op.env
   ```

   以此方式注入的令牌优先——Hermes 检测到 `OP_SERVICE_ACCOUNT_TOKEN` 已设置，便会完全跳过加载 `.op.env`。

如果令牌只能通过交互式 shell（`op signin`、在 `.bashrc` 中导出的 `OP_SESSION_*` 等）访问，它**不会**被定时任务或新派生的子进程继承，这些上下文会记录一条警告，并回退到 `.env` 中已有的任何凭据。对于任何非交互式工作负载，请使用上述三种方式之一。

## 设置

### 1. 安装并登录 `op`

按照 [1Password CLI 入门指南](https://developer.1password.com/docs/cli/get-started/) 操作。验证其可用性：

```bash
op whoami
```

### 2. 启用该集成

```bash
hermes secrets onepassword setup
```

这会验证 `op` 位于 `PATH` 上（或使用 `--binary-path`），记录你的账号/令牌设置，检查会话是否活跃，并将 `secrets.onepassword.enabled` 置为 `true`。非交互式标志：

```bash
hermes secrets onepassword setup \
  --account my.1password.com \
  --token-env OP_SERVICE_ACCOUNT_TOKEN \
  --token "$OP_SERVICE_ACCOUNT_TOKEN"
```

### 3. 映射你的凭据

引用格式为 `op://<vault>/<item>/<field>`：

```bash
hermes secrets onepassword set OPENAI_API_KEY    "op://Private/OpenAI/api key"
hermes secrets onepassword set ANTHROPIC_API_KEY "op://Private/Anthropic/credential"
```

### 4. 预览并确认

```bash
hermes secrets onepassword sync     # 试运行：立即解析，显示将应用的内容
hermes secrets onepassword status   # 配置 + 二进制程序 + 引用 + 认证
```

从现在起，每次调用 `hermes` 都会在启动时解析这些引用。一个进程中首次应用密钥时，你会在 stderr 中看到一行摘要。

## CLI

| 命令 | 作用 |
|---|---|
| `hermes secrets onepassword setup` | 验证 `op`，设置账号/令牌环境变量，启用 |
| `hermes secrets onepassword status` | 显示配置、二进制程序、认证及已配置的引用 |
| `hermes secrets onepassword token` | 轮换服务账号令牌：用 `op whoami` 验证，然后存入 `.env` |
| `hermes secrets onepassword set ENV_VAR "op://…"` | 将环境变量映射到一个引用（存储前去空白 + 已验证） |
| `hermes secrets onepassword remove ENV_VAR` | 删除一个映射 |
| `hermes secrets onepassword sync` | 试运行：立即解析引用并显示将应用的内容 |
| `hermes secrets onepassword sync --apply` | 解析并导出到当前 shell 的环境中 |
| `hermes secrets onepassword disable` | 将 `enabled` 置为 `false`；保留映射不变 |

`op` 与 `1password` 均可作为 `onepassword` 的别名。

## 配置

`~/.hermes/config.yaml` 中的默认值：

```yaml
secrets:
  onepassword:
    enabled: false
    env:
      OPENAI_API_KEY: "op://Private/OpenAI/api key"
      ANTHROPIC_API_KEY: "op://Private/Anthropic/credential"
    account: ""
    service_account_token_env: OP_SERVICE_ACCOUNT_TOKEN
    binary_path: ""
    cache_ttl_seconds: 300
    override_existing: true
```

| 键 | 默认值 | 作用 |
|---|---|---|
| `enabled` | `false` | 总开关。为 false 时，绝不调用 `op`。 |
| `env` | `{}` | 环境变量名 → `op://vault/item/field` 引用的映射。名称不是合法环境变量名，或值不是 `op://` 引用的条目会被跳过并产生警告。 |
| `account` | `""` | 作为 `op read --account` 传入的账号简称/登录地址。留空则使用 `op` 的默认账号。 |
| `service_account_token_env` | `OP_SERVICE_ACCOUNT_TOKEN` | Hermes 读取服务账号令牌所用环境变量。其值会作为 `OP_SERVICE_ACCOUNT_TOKEN`（`op` 期望的名称）导出给 `op` 子进程。若要使用桌面/交互式会话，则不设置该变量。 |
| `binary_path` | `""` | `op` 的绝对路径。设置后原样使用，且**不**参考 `PATH`——固定此路径可避免信任 `PATH` 上最先出现的任意 `op`。 |
| `cache_ttl_seconds` | `300` | 已解析值的复用时长（进程内和磁盘上）。设为 `0` 可禁用**两层**缓存——完全不会将任何值写入磁盘。 |
| `override_existing` | `true` | 为 true 时，已解析的值会覆盖环境中已有的任何值（从而使轮换生效）。改为 `false` 则让 `.env` / shell 导出优先；这些引用会在调用 `op` *之前*被跳过。 |

## 故障模式

1Password 从不阻塞 Hermes 启动。若出现任何问题，你会在 stderr 中看到一行警告，Hermes 则继续运行：

| 症状 | 原因 | 修复 |
|---|---|---|
| `the op CLI was not found on PATH` | `op` 未安装/不在 PATH 上 | 安装 CLI，或设置 `secrets.onepassword.binary_path` |
| `op read failed for 'op://…': …` | 会话锁定、令牌过期或无权访问保险库 | `op signin`，运行 `hermes secrets onepassword token` 轮换服务账号令牌，或授予服务账号访问权限 |
| `op read returned an empty value for 'op://…'` | 被引用的字段存在但为空 | 在 1Password 中修正该条目/字段（空值绝不会被应用——你现有的环境变量保持原样） |
| `… is not an op:// secret reference` | 某个映射值不是 `op://` 引用 | 用正确的 `op://vault/item/field` 形式重新设置 |
| `op read timed out` | 网络被阻断或 1Password 响应缓慢 | 检查连接 / 桌面应用集成 |

启动警告现在会包含一条 `→` 修复提示，精确告诉你哪个命令可以修复该故障。

## 缓存

成功且完整的拉取会被缓存在进程内以及磁盘上的 `<hermes_home>/cache/op_cache.json`（原子写入，权限 `0600`），这样接二连三的短命 `hermes` 调用无需为每个引用重新调用 `op`。该缓存：

- 仅存储已解析的密钥**值**——从不存储服务账号令牌或任何原始认证材料（认证信息会被指纹化到缓存键中）；
- 在令牌、账号、`OP_SESSION_*` 变量或引用集合发生变化时失效；
- 当某次拉取存在任何针对个别引用的错误时**不**写入，因此临时的认证失败不会在 TTL 内被冻结；
- 当 `cache_ttl_seconds: 0` 时完全禁用——读取*和*写入。

## 安全说明

- 1Password 服务账号令牌可以读取该账号有权访问的每一个密钥。请将其存储在 `~/.hermes/.env` 中（而非 `config.yaml`），并在泄漏时从 1Password 撤销并重新生成。
- 即使设置 `override_existing: true`，Hermes 也拒绝让已解析的值覆盖令牌环境变量本身。
- `op` 子进程获得一个最小化的白名单环境（认证/会话变量 + `PATH`/`HOME`），而不是完整的 `os.environ` 副本，因此 dotenv 加载后的服务商凭据不会全部被子进程继承。
- 引用被验证必须以 `op://` 开头，且引用是在 `--` 选项终止符之后传入的，因此精心构造的值不会被解析为 `op` 标志。

## 何时不应使用此项

- **单机个人设置**，使用 `~/.hermes/.env` 即可。
- **空气隔离环境**，无法访问 1Password。
- **CI/CD**，已接入现有的密钥注入机制——只选一条路径，别用两条。

它的理想适用场景是多机器集群、共享开发机、网关 VPS，或任何你希望跨多个 Hermes 安装进行集中轮换和撤销的地方。
