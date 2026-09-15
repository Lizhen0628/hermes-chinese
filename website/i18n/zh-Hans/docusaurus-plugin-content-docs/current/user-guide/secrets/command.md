# Command Helper Secret Source

在启动时运行你自己的 helper 命令来解析凭据——任何有 CLI 的密钥存储都可以:`keepassxc-cli`、`secret-tool`(GNOME Keyring)、`pass`、Vaultwarden 的 CLI,或者一个读取 tmpfs 环境文件的脚本。helper 在 stdout 上打印 `KEY=VALUE` 行;Hermes 通过与 [Bitwarden](./bitwarden) 和 [1Password](./onepassword) 相同的 orchestrator 应用它们,因此你可以同时启用任意组合的来源。

## 工作原理

1. 你在 `config.yaml` 中配置 helper 命令(永远不要放在 `.env` —— 命令是配置,`.env` 保存值)。
2. 启动时,在 `.env` 加载之后,Hermes 通过 `/bin/sh -c` 运行 helper 一次,并将其 stdout 作为 dotenv blob 解析。
3. 解析出的键沿用标准的优先级阶梯:除非 `override_existing: true`,否则 `.env`/shell 优先;对于有争议的变量,映射来源胜过此批量来源;先声明者获胜。

```yaml
secrets:
  command:
    enabled: true
    command: "cat /run/user/1000/hermes-secrets.env"
    # or any vault CLI that dumps KEY=VALUE lines:
    # command: "pass show hermes/env"
    # command: "secret-tool lookup service hermes-env"
```

## 配置

| 键 | 默认值 | 作用 |
|---|---|---|
| `enabled` | `false` | 总开关。 |
| `command` | `""` | 通过 `/bin/sh -c` 运行的 helper;必须在 stdout 上打印 `KEY=VALUE` 行。 |
| `helper_timeout_seconds` | `3` | 单次 helper 运行的硬超时。故意设得很紧 —— helper 必须快速且非交互(无解锁提示,无触摸/PIN)。 |
| `override_existing` | `false` | helper 值覆盖 `.env`/shell 值。默认关闭(不同于 Bitwarden/1Password),因为本地 helper 不是集中式轮换权威。 |

## 安全模型

- helper 命令字符串是你的配置 —— 与你自己控制的 `.env` 文件处于相同的信任级别。
- 输出被硬性限制在 1 MiB;失控的 helper 无法卡住启动(超时时杀死进程组)。
- helper 的 **stderr 会被丢弃** —— vault CLI 的诊断信息可能携带密钥材料,因此它们永远不会进入 Hermes 的输出。失败时只记录结构化字段(退出码 / 信号 / errno),绝不记录命令字符串。
- 仅含空白字符的值被视为"无值" —— 占位符条目永远不会流入 Authorization 请求头。
- 仅限 POSIX(需要 `/bin/sh`)。在 Windows 上,该来源会报告自身未配置,启动继续进行。

## 失败模式

启动永远不会被阻塞。错误会打印一行外加一个 `→` 修复提示:

| 症状 | 原因 | 修复 |
|---|---|---|
| `secrets.command.command is empty` | 已启用但没有命令 | 在 config.yaml 中设置 `secrets.command.command` |
| `helper command failed` | 非零退出、超时、启动失败 | 在 shell 中手动运行 helper 以查看其真实错误(Hermes 故意丢弃其 stderr) |
| `helper output was not a KEY=VALUE map` | helper 打印了裸值或垃圾内容 | 让 helper 输出 dotenv 格式的行 |

## 何时使用它而非插件

命令来源是没有内置集成的 vault 的逃生通道。如果你发现自己在一段长脚本中包装复杂的 CLI 操作,请考虑改用合适的[密钥来源插件](/developer-guide/secret-source-plugin)—— 插件能获得缓存、来源标签和类型化配置。
