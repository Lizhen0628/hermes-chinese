# 命令行助手密钥源

通过在启动时运行自己的命令行助手来解析凭据——任何带 CLI 的密钥存储都可以：`keepassxc-cli`、`secret-tool`（GNOME Keyring）、`pass`、`gpg`、Vaultwarden 的 CLI，或者一个直接读取 tmpfs 环境文件的脚本。助手在 stdout 上打印 `KEY=VALUE` 行；Hermes 通过与 [Bitwarden](./bitwarden) 和 [1Password](./onepassword) 相同的编排器应用它们，因此你可以同时启用任意来源的组合。

## 工作原理

1. 你在 `config.yaml` 中配置一个助手命令（绝不要写在 `.env` 中——命令属于配置，而 `.env` 存放的是值）。
2. 在启动时，`.env` 加载完毕之后，Hermes 会通过 `/bin/sh -c` 运行该助手一次，并将其 stdout 解析为 dotenv 数据块。
3. 解析出的键按照标准优先级阶梯流动：默认情况​​下 `.env`/shell 优先，除非设置 `override_existing: true`；在有争议的变量上，映射来源优先于此批量来源；先声明者获胜。

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
| `command` | `""` | 通过 `/bin/sh -c` 运行的助手命令；必须在 stdout 上打印 `KEY=VALUE` 行。 |
| `helper_timeout_seconds` | `3` | 单次助手运行的硬超时。故意设置得很紧凑——助手必须快速且非交互（无解锁提示，无触摸/PIN）。 |
| `override_existing` | `false` | 助手值覆盖 `.env`/shell 值。默认关闭（不同于 Bitwarden/1Password），因为本地助手不是中心化的轮换权威。 |

## 安全模型

- 助手命令字符串是你的配置——与你掌控的 `.env` 文件信任级别相同。
- 输出硬上限为 1 MiB；失控的助手无法阻塞启动（超时时终止进程组）。
- 助手的 **stderr 被丢弃**——vault CLI 的诊断信息可能携带密钥材料，因此它们永远不会到达 Hermes 的输出。失败时只记录结构化字段（退出码 / 信号 / errno），绝不记录命令字符串。
- 全空白值被视为“无值”——占位符条目永远不会流入 Authorization 头。
- 仅限 POSIX（需要 `/bin/sh`）。在 Windows 上，该来源会报告自身未配置，启动继续进行。

## 失败模式

启动永远不会被阻塞。错误会打印一行，外加一个 `→` 修复提示：

| 症状 | 原因 | 修复 |
|---|---|---|
| `secrets.command.command is empty` | 启用了但未设置命令 | 在 config.yaml 中设置 `secrets.command.command` |
| `helper command failed` | 非零退出、超时、spawn 失败 | 在 shell 中手动运行助手以查看其真实错误（Hermes 有意丢弃其 stderr） |
| `helper output was not a KEY=VALUE map` | 助手打印了裸值或垃圾内容 | 让助手输出 dotenv 格式的行 |

## 何时使用它 vs 插件

命令来源是用于没有捆绑集成的 vault 的逃生通道。如果你发现自己在长篇脚本中包装复杂的 CLI 操作，请考虑改用正式的[密钥来源插件](/developer-guide/secret-source-plugin)——插件具备缓存、来源标记和类型化配置。
