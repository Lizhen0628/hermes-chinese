---
sidebar_position: 9
title: "Secret Source 插件"
description: "如何为 Hermes Agent 构建一个密钥管理器后端插件"
---

# 构建 Secret Source 插件

Secret source 会在进程启动时，从外部密钥管理器（vault、密码管理器、操作系统密钥库、自定义脚本）中解析服务商凭据并注入环境变量——时机在 `~/.hermes/.env` 加载之后、Hermes 读取凭据之前。Bitwarden、1Password 以及一个通用的命令助手来源已内置于代码库中；**其他任何后端都是插件**。本指南介绍如何构建一个。

:::tip
内置集合是刻意不开放的，与[记忆服务商](/developer-guide/memory-provider-plugin)的策略相同：向 `agent/secret_sources/` 下新增 vault 后端的 PR 会被关闭，并附上本指南的链接。请将你的后端作为独立的插件仓库发布，并在 Nous Research Discord 的 `#plugins-skills-and-skins` 频道中分享。
:::

## 首进程引导时机

`load_hermes_dotenv()` 通常在**插件注册之前**的导入阶段运行。
当任何已**启用**的插件 secret source 被配置时，Hermes 会在插件发现之后重新拉取密钥。启用判定使用来源的 `is_enabled(cfg)` 契约；标准形式为 `secrets.<name>.enabled: true`，同时自定义激活方式仍受支持。
这就弥补了“用我的 vault 替换 Bitwarden”在首进程中的缺口（#64177）。

- 重新拉取是幂等的且采用故障放行（永不阻塞启动）。
- 来源只能通过编排器提供环境变量；**不存在**可供插件导出其他插件、或用户整个密钥库的插件 API，只有你自己的来源配置允许提供的范围。
- 任何进程内代码在加载后都可以读取 `os.environ`——信任边界依然是“已启用的插件以智能体权限运行”。

## 框架负责什么，你负责什么

编排器（`agent.secret_sources.registry.apply_all`）负责一切与安全和优先级相关的事务，因此后端无法把它们弄错：

| 框架负责 | 你负责 |
|---|---|
| 来源排序、映射式与批量式优先级 | 从你的后端获取值 |
| 先声明先胜的冲突处理 + 警告 | 校验你的引用格式 |
| `override_existing` 语义（永不跨来源） | 与你的 CLI/SDK/API 通信 |
| 受保护的引导令牌 | 声明哪个环境变量是你的引导令牌 |
| 每来源的墙钟超时 | 保持 `fetch()` 足够快 |
| 每变量来源信息 + `(from X)` 标签 | 一个人类可读的 `label` |
| `os.environ` 写入 | 无——你永不触碰环境变量 |

## 目录结构

```
~/.hermes/plugins/my-vault/
├── plugin.yaml      # 名称、描述
└── __init__.py      # SecretSource 子类 + register(ctx)
```

## SecretSource 抽象基类

实现 `agent.secret_sources.base.SecretSource`。必须实现一个方法：

```python
from pathlib import Path

from agent.secret_sources.base import (
    ErrorKind,
    FetchResult,
    SecretSource,
    run_secret_cli,
)


class MyVaultSource(SecretSource):
    name = "myvault"          # 配置节键名：secrets.myvault
    label = "My Vault"        # 用于启动行 + 来源标签
    shape = "mapped"          # "mapped"（显式的 VAR→ref 映射）或 "bulk"（项目导出）
    scheme = "mv"             # 可选：你拥有的唯一 URI scheme（mv://...）

    def fetch(self, cfg: dict, home_path: Path) -> FetchResult:
        """解析密钥。绝不抛出异常。绝不提示输入。"""
        result = FetchResult()
        token = os.environ.get("MYVAULT_TOKEN", "").strip()
        if not token:
            result.error = "secrets.myvault.enabled is true but MYVAULT_TOKEN is not set."
            result.error_kind = ErrorKind.NOT_CONFIGURED
            return result

        try:
            proc = run_secret_cli(
                ["myvault-cli", "export", "--json"],
                allow_env=["MYVAULT_TOKEN"],   # 仅你的认证变量——绝不用完整的 os.environ
                timeout=30,
            )
        except RuntimeError as exc:           # 启动失败 / 超时
            result.error = str(exc)
            result.error_kind = ErrorKind.BINARY_MISSING
            return result

        if proc.returncode != 0:
            result.error = f"myvault-cli exited {proc.returncode}: {proc.stderr[:200]}"
            result.error_kind = ErrorKind.AUTH_FAILED
            return result

        result.secrets = parse_your_output(proc.stdout)  # {ENV_VAR: value}
        return result

    def protected_env_vars(self, cfg: dict):
        # 你的引导令牌——任何来源（包括你自己）都不得覆盖它。
        return frozenset({"MYVAULT_TOKEN"})
```

### 契约规则（强制而非建议）

- **`fetch()` 绝不抛出异常。** 错误写入 `result.error` + `result.error_kind`。抛异常的 fetch 会被编排器包含并报告为 `INTERNAL`——这是契约违反，而非特性。
- **`fetch()` 绝不提示输入。** 启动运行于非 TTY 上下文（网关、定时任务、Docker）。`run_secret_cli()` 会关闭 stdin，使要求输入的助手快速失败。交互式认证属于你的 CLI 设置流程，绝不在启动路径上。
- **同步，且预算之内。** 编排器强制执行墙钟超时（默认 120 秒，用户可通过 `secrets.<name>.timeout_seconds` 调整）。超时会报告 `TIMEOUT`，你的结果被丢弃。
- **你获取，编排器应用。** 返回你*本应*贡献的映射。切勿自己写入 `os.environ`——你会绕过优先级、冲突检测和来源信息。
- **API 版本化。** `SecretSource.api_version` 默认等于当前的 `SECRET_SOURCE_API_VERSION`。注册表会跳过（并警告）针对不同版本构建的来源，而不是让启动崩溃。

### 选择你的 `shape`

- `mapped` —— 用户在配置中显式将环境变量名绑定到引用（类似 1Password 的 `env:` 映射）。意图最强：映射式声明在争用变量上胜过批量式声明。
- `bulk` —— 你隐式注入整个项目/文件夹的密钥（类似 Bitwarden BSM）。让位于映射式来源。

### 可选钩子

| 方法 | 默认值 | 在以下情况覆写 |
|---|---|---|
| `is_enabled(cfg)` | `cfg.get("enabled")` | 自定义激活逻辑 |
| `override_existing(cfg)` | `cfg.get("override_existing", False)` | 你希望有不同默认值（两个内置来源为轮换而默认为 `True`） |
| `protected_env_vars(cfg)` | 空 | 你有引导令牌（你几乎肯定有） |
| `fetch_timeout_seconds(cfg)` | 120 秒 | 你的后端需要不同预算 |
| `config_schema()` | `{}` | 为设置界面声明配置键 |
| `remediation(kind, cfg)` | 按 `ErrorKind` 的通用提示 | 你希望失败警告指向你自己的修复命令（例如内置来源为 `AUTH_FAILED` 返回 `Run hermes secrets <name> token…`）。必须是纯的 kind→字符串映射：无 I/O，绝不抛异常。返回 `""` 以抑制提示。 |

## 子进程安全：使用 `run_secret_cli()`

如果你的后端调用 CLI，请使用共享助手而非直接使用 `subprocess.run`。它免费为你提供经过审计的姿态：仅 argv（无 `shell=True`）、**最小化白名单子进程环境**（在来源运行时，`os.environ` 持有 Hermes 知道的所有凭据——绝不要把它交给子进程）、`NO_COLOR` + 清洗 ANSI 的 stderr、关闭 stdin、超时 → 干净的 `RuntimeError`。将用户提供的引用字符串放在 argv 的 `--` 终止符之后，使它们永远不会被解析为标志。

## 注册

```python
# __init__.py
def register(ctx):
    ctx.register_secret_source(MyVaultSource())
```

以下情况会被拒绝注册（仅记录日志警告，绝不崩溃）：非 `SecretSource` 实例、无效/重复的名称、另一个来源已拥有的 `scheme`、错误的 `api_version`，或超出 `mapped`/`bulk` 的 `shape`。

:::note 时机
插件发现运行的时机晚于第一次 `load_hermes_dotenv()` 调用。紧随发现之后，Hermes 会重新拉取已启用的插件 secret source（`reset_secret_source_cache()` + `load_hermes_dotenv()`），因此执行发现的进程*确实*会拾取它们——见上文[首进程引导时机](#first-process-bootstrap-timing)（#64177）。重新拉取是故障放行的，且当没有插件来源被启用时会被跳过。任何在插件模块导入或 `register(ctx)` 期间读取 `os.environ` 的代码仍会在重新拉取之前运行，不能依赖同一来源提供的凭据；请将凭据相关的工作放在 `fetch()` 内。网关、定时任务和子智能体进程会执行同样的发现/重新拉取序列。重新拉取（以及每次触发的定时任务重新拉取）只重置解析主目录的缓存，因此在多路复用网关下，兄弟配置档会保留其已水合的快照；如果一个重新拉取的键已经存在于进程环境中（`skipped_existing`，例如上一次应用自身的写回），它仍会记录该主目录的有效值，因此 `override_existing` 永远不是仅仅为了在一次重新拉取中存活所必需的。
:::

## 用户的配置方式与其他来源相同

```yaml
secrets:
  sources: [myvault, bitwarden]   # 可选的排序
  myvault:
    enabled: true
    # ... 你的 config_schema 键
```

多来源优先级、冲突警告和 `(from My Vault)` 来源标签都会自动工作——见[面向用户的密钥文档](/user-guide/secrets/)了解优先级阶梯。

## 用一致性套件验证

在你的插件测试中子类化 Hermes 仓库中的套件（`tests/secret_sources/conformance.py`）：

```python
import pytest
from tests.secret_sources.conformance import SecretSourceConformance

class TestMyVaultConformance(SecretSourceConformance):
    @pytest.fixture
    def source(self):
        return MyVaultSource()
```

它检查那些一旦违反就会殃及他人的规则：对畸形配置绝不抛出异常、机器可读的错误类型、默认禁用、正超时值、有效的受保护变量名，以及完整的 `apply_all()` 往返。通过一致性测试是将后端称为契约合规的审查门槛。

## ErrorKind 参考

| 类型 | 含义 |
|---|---|
| `NOT_CONFIGURED` | 已启用但缺少令牌 / 项目 / 映射 |
| `BINARY_MISSING` | 助手 CLI 未找到或不可执行 |
| `AUTH_FAILED` / `AUTH_EXPIRED` | 错误 / 过期凭据 |
| `REF_INVALID` | 某个密钥引用未通过校验 |
| `NETWORK` | 传输层故障 |
| `EMPTY_VALUE` | 后端对某个引用返回空——切勿用 `""` 覆盖一个良好凭据 |
| `TIMEOUT` | Fetch 超出预算 |
| `INTERNAL` | 其他任何情况（bug、意外结构） |
