# 1Password

在进程启动时从 [1Password](https://1password.com/) 解析服务商 API 密钥，而不是以明文形式将它们存储在 `~/.hermes/.env` 中。你可以将密钥保留为 1Password 条目，并通过 `op://vault/item/field` 引用它们；轮换凭证只需在 1Password 中更改一次。

## 工作原理

1. 你安装官方 [1Password CLI](https://developer.1password.com/docs/cli/get-started/)（`op`）并进行身份认证——可以是通过**服务账户令牌**（无头服务器），也可以是通过**交互式/桌面会话**（笔记本电脑）。
2. 你在 `~/.hermes/config.yaml` 中将环境变量名称映射到 `op://` 引用。
3. 每次 `hermes`（或网关，或定时任务）启动时，在 `~/.hermes/.env` 加载之后，Hermes 会对每个引用运行 `op read`，并将解析出的值设置到 `os.environ` 中。
4. 默认情况下，Hermes 会**覆盖**环境中已有的值，因此 1Password 是唯一事实来源——轮换一次凭证，每个 Hermes 进程都会在下次启动时获取到新值。如果你希望 `.env` 优先，可将 `override_existing` 设为 `false`。

Hermes 绝不会代表你进行身份认证，也绝不会下载 `op`：它只是调用你已安装、已信任的 CLI。如果 `op` 缺失、你的会话已锁定，或者某个引用有误，Hermes 会打印一行警告，并继续使用 `.env` 中已有的凭证——它绝不会阻止启动。

## 身份认证

`op` 支持两种对非交互式友好的模式；Hermes 对二者均适用：

- **服务账户**（推荐用于服务器/CI）：在 1Password 中创建服务账户，授予其对相关保险库的读取权限，并将其令牌作为 `OP_SERVICE_ACCOUNT_TOKEN` 导出到 `~/.hermes/.env`。令牌本身就是凭证——请像对待任何其他 bearer 令牌一样对待它。
- **桌面/交互式会话**（笔记本电脑）：运行 `op signin`（或在 1Password 应用中启用 CLI 集成）。Hermes 会将你的 `OP_SESSION_*` 变量传递给 `op` 子进程。1Password 缓存键包含这些会话变量，因此登录到不同账户时绝不会返回以先前身份缓存的任何值。

## 引导令牌

当你使用**服务账户令牌**进行身份认证时，该令牌本身就是 Hermes 在能够解析任何 `op://` 引用*之前*所需的引导凭证。它必须存在于每个解析密钥的进程的 `os.environ` 中——包括定时任务（`kanban.dispatch_in_gateway: false`）、子进程调用、CLI 运行、macOS launchd 代理以及 Docker 容器——而不仅仅是交互式网关。有三种方式使其可用，按优先级排序：

1. **在 `~/.hermes/.env` 中（推荐）。** `hermes secrets onepassword setup --token <token>` 会将令牌写入 `~/.hermes/.env`，与 Bitwarden 的 `BWS_ACCESS_TOKEN` 完全相同。由于 `load_hermes_dotenv()` 始终会加载 `.env`，令牌随处可见，无需任何额外设置。这是最简单可靠的选择。

2. **在 `~/.hermes/.op.env` 中（已在 gitignore 中）。** 如果你更希望将服务账户令牌放在 `.env` 之外——例如为了让 `.env` 可以签入私有 dotfiles 仓库，而令牌不进入版本控制——请将其放在 `~/.hermes/.op.env` 中：

   ```bash
   echo 'OP_SERVICE_ACCOUNT_TOKEN=ops_...' > ~/.hermes/.op.env
   chmod 600 ~/.hermes/.op.env
   ```

   Hermes 会在启动时自动加载 `.op.env`，**在** `.env` **之后**，并且**绝不会**覆盖环境中已有的令牌。`.op.env` 已在 gitignore 中，因此令牌永远不会进入提交的文件。

3. **通过 systemd `EnvironmentFile`（Linux 网关）。** 如果你在 systemd 下运行网关，可以将令牌直接注入到服务环境中：

   ```ini
   [Service]
   EnvironmentFile=-/home/youruser/.hermes/.op.env
   ```

   以这种方式注入的令牌优先级更高——Hermes 会检测到 `OP_SERVICE_ACCOUNT_TOKEN` 已设置，从而完全跳过加载 `.op.env`。

如果令牌只能通过交互式 shell 获取（`op signin`、`.bashrc` 中的 `OP_SESSION_*` 导出等），它将**不会**被定时任务或新生成的子进程继承，这些上下文将记录一条警告，并回退到 `.env` 中已有的凭证。对于任何非交互式工作负载，请使用上述三种方式之一。

## 设置

### 1. 安装并登录 `op`

遵循 [1Password CLI 入门指南](https://developer.1password.com/docs/cli/get-started/)。验证其是否正常工作：

```bash
op whoami
```

### 2. 启用该集成

```bash
hermes secrets onepassword setup
```

这会验证 `op` 在 `PATH` 上（或使用 `--binary-path`）、记录你的账户/令牌设置、检查是否有活跃会话，并将 `secrets.onepassword.enabled: true`。

```bash
hermes secrets onepassword setup \
  --account my.1password.com \
  --token-env OP_SERVICE_ACCOUNT_TOKEN \
  --token "$OP_SERVICE_ACCOUNT_TOKEN"
```

### 3. 映射你的凭证

引用格式为 `op://<vault>/<item>/<field>`：

```bash
hermes secrets onepassword set OPENAI_API_KEY    "op://Private/OpenAI/api key"
hermes secrets onepassword set ANTHROPIC_API_KEY "op://Private/Anthropic/credential"
```

### 4. 预览并确认

```bash
hermes secrets onepassword sync     # 试运行：立即解析，显示将要应用的内容
hermes secrets onepassword status   # 配置 + 二进制 + 引用 + 认证
```

从现在起，每次 `hermes` 调用都会在启动时解析这些引用。当某个进程中首次应用密钥时，你会在 stderr 中看到一行摘要。

## CLI

| 命令 | 作用 |
|---|---|
| `hermes secrets onepassword setup` | 验证 `op`、设置账户/令牌环境变量、启用 |
| `hermes secrets onepassword status` | 显示配置、二进制、认证以及已配置的引用 |
| `hermes secrets onepassword token` | 轮换服务账户令牌：用 `op whoami` 验证，然后将其存储到 `.env` 中 |
| `hermes secrets onepassword set ENV_VAR "op://…"` | 将环境变量映射到引用（存储时去除空白并验证） |
| `hermes secrets onepassword remove ENV_VAR` | 删除映射 |
| `hermes secrets onepassword sync` | 试运行：立即解析引用并显示将要应用的内容 |
| `hermes secrets onepassword sync --apply` | 解析并导出到当前 shell 的环境中 |
| `hermes secrets onepassword disable` | 将 `enabled` 设为 `false`；保留映射 |

`op` 和 `1password` 均可作为 `onepassword` 的别名使用。

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
| `enabled` | `false` | 主开关。当为 false 时，绝不会调用 `op`。 |
| `env` | `{}` | 环境变量名称 → `op://vault/item/field` 引用的映射。名称不是有效环境变量名称、或值不是 `op://` 引用的条目会被跳过并给出警告。 |
| `account` | `""` | 作为 `op read --account` 传入的账户简写/登录地址。为空则使用 `op` 的默认账户。 |
| `service_account_token_env` | `OP_SERVICE_ACCOUNT_TOKEN` | Hermes 从中读取服务账户令牌的环境变量。其值会以 `OP_SERVICE_ACCOUNT_TOKEN`（`op` 期望的名称）导出给 `op` 子进程。将该变量留空则使用桌面/交互式会话。 |
| `binary_path` | `""` | `op` 的绝对路径。设置后，将按此路径执行而**不会**参考 `PATH`——请固定此路径，以避免信任在 `PATH` 上首先出现的任意 `op`。 |
| `cache_ttl_seconds` | `300` | 解析后的值被复用的时长（进程内和磁盘上）。设为 `0` 将同时禁用**两层**缓存——根本不会向磁盘写入任何值。 |
| `override_existing` | `true` | 为 true 时，解析出的值会覆盖环境中已有的任何值（从而使轮换生效）。设为 `false` 则让 `.env`/shell 导出优先；这些引用随后会在调用 `op` **之前**被跳过。 |

## 故障模式

1Password 绝不会阻止 Hermes 启动。如果出现任何问题，你会在 stderr 中看到一行警告，Hermes 会继续运行：

| 症状 | 原因 | 修复 |
|---|---|---|
| `the op CLI was not found on PATH` | `op` 未安装/不在 PATH 上 | 安装 CLI，或设置 `secrets.onepassword.binary_path` |
| `op read failed for 'op://…': …` | 会话已锁定、令牌过期或无保险库访问权限 | `op signin`、运行 `hermes secrets onepassword token` 轮换服务账户令牌，或授予服务账户访问权限 |
| `op read returned an empty value for 'op://…'` | 引用的字段存在但为空 | 在 1Password 中修复该条目/字段（空值绝不会被应用——你现有的环境变量保持不变） |
| `… is not an op:// secret reference` | 映射值不是 `op://` 引用 | 使用正确的 `op://vault/item/field` 形式重新设置 |
| `op read timed out` | 网络被阻止或 1Password 太慢 | 检查连接/桌面应用集成 |

启动警告现在会包含一行 `→` 补救提示，准确告诉你用哪个命令可以修复该故障。

## 缓存

成功且完整的拉取会缓存到进程内以及磁盘上的 `<hermes_home>/cache/op_cache.json`（以原子方式写入，权限模式 `0600`），因此连续多次短生命周期的 `hermes` 调用不会为每个引用都重新调用 `op`。缓存：

- 仅存储解析后的密钥**值**——绝不存储服务账户令牌或任何原始认证材料（认证信息会以指纹形式纳入缓存键）；
- 当令牌、账户、`OP_SESSION_*` 变量或引用集合发生变化时会失效；
- 若某次拉取存在任何针对单个引用的错误，则**不会**写入缓存，因此暂时的认证故障不会在 TTL 内被冻结；
- 当 `cache_ttl_seconds: 0` 时，读取*和*写入均被完全禁用。

## 安全注意事项

- 1Password 服务账户令牌可以读取该账户有权访问的每一个密钥。请将其存储在 `~/.hermes/.env` 中（而不是 `config.yaml`），并在泄漏时从 1Password 撤销并重新生成。
- 即使设置了 `override_existing: true`，Hermes 也拒绝让解析出的值覆盖令牌环境变量本身。
- `op` 子进程获得的是一个最小化的白名单环境（认证/会话变量 + `PATH`/`HOME`），而不是完整 `os.environ` 的副本，因此 dotenv 加载之后的服务商凭证不会全部被子进程继承。
- 引用经验证必须以 `op://` 开头，且引用在 `--` 选项终止符之后传递，因此精心构造的值无法被解析为 `op` 标志。

## 何时不要使用此功能

- **单机个人设置**，且 `~/.hermes/.env` 已足够。
- **无法访问 1Password** 的气隙环境。
- **CI/CD**，且已有现成的密钥注入机制——只选择一条路径，而不是两条。

此功能适用于多机集群、共享开发机、网关 VPS，或任何你希望在多个 Hermes 安装之间进行集中式轮换和撤销的场景。
