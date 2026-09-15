---
sidebar_position: 3
title: "托管作用域"
description: "通过系统级托管目录，由管理员固定、用户不可更改的配置与密钥"
---

# 托管作用域

**托管作用域**让管理员推送一份配置与密钥的基线，标准（非 root）用户**无法覆盖**。它适用于机群/组织级部署场景，例如 IT 需要在某台机器的所有用户上固定模型服务商、共享的 API base URL，或 `security.redact_secrets: true`。

当存在托管作用域时，它指定的值会胜过用户的 `~/.hermes/config.yaml`、`~/.hermes/.env`，甚至 shell 环境——但仅针对它固定的那些键。其他所有内容仍完全由用户控制。

:::note 与包管理器锁定的安装不同
由包管理器管理的安装（声明式发行版 / formula）会阻止*所有*配置变更，并提示你使用包管理器。托管作用域是另一套机制：它按单个键注入*特定的不可变值*，而不是锁定整个配置。两者相互独立，可以共存。
:::

## 它所在的位置

托管作用域从系统级目录读取，默认为 `/etc/hermes`：

```text
/etc/hermes/
├── config.yaml     # 托管配置层（胜过 ~/.hermes/config.yaml）
└── .env            # 托管环境变量层（胜过 ~/.hermes/.env + shell）
```

该目录及文件归 `root` 所有（目录权限 `0755`，文件权限 `0644`）：所有人可读，仅管理员可写。**该文件系统权限就是强制机制**——标准用户可读托管文件，但无法编辑。

两个文件均为可选。托管目录不存在或文件缺失，仅表示“无托管作用域”，配置解析与没有该功能时完全一致。

### 重新定位目录

可通过 `HERMES_MANAGED_DIR` 环境变量重新定位该位置（用于容器或非 `/etc` 部署）。这是一个部署/引导路径开关——类似 `HERMES_HOME`——由拥有托管文件的同一管理员设置。Hermes **绝不会**将其持久化到任何 `.env` 文件。

```bash
# 将托管作用域指向自定义目录（由 IT / 部署方设置，而非用户）
export HERMES_MANAGED_DIR=/opt/org/hermes-policy
```

:::warning
能够设置 `HERMES_MANAGED_DIR` 的用户可以将托管作用域重定向到他们控制的目录，从而使该机制失效。在实际部署中，此变量应由管理员固定（例如写入服务单元 / 容器镜像），而不是留给用户设置。`hermes doctor` 会报告*解析后*的托管目录，因此重定向是可见的。
:::

## 优先级

对于托管层指定的键，顺序如下（最高者胜出）：

| 层级 | config.yaml | .env |
|---|---|---|
| 1 | `/etc/hermes/config.yaml`（托管） | `/etc/hermes/.env`（托管） |
| 2 | `~/.hermes/config.yaml`（用户） | `~/.hermes/.env`（用户） |
| 3 | 内置默认值 | 既有的 shell 环境 |

合并是**叶子级**的：固定 `model.default` 不会冻结 `model.*` 的其余部分。一份如下所示的托管 `config.yaml`：

```yaml
model:
  default: org/standard-model
```

会为所有用户强制 `model.default`，同时将 `model.fallback`（以及其他所有键）留给用户控制。

:::note 优先级说明
对于它固定的键，托管作用域有意地也胜过 shell 环境——否则就算不上“托管”。这是唯一一处颠覆通常的“环境变量覆盖 config.yaml”规则的地方，且仅适用于托管层指定的那些具体键。
:::

## 查看哪些内容受托管

```bash
hermes config        # 显示一个标头，列出托管来源 + 被固定的键
hermes doctor        # 报告解析后的托管目录 + 被固定键的数量
```

如果你尝试更改受托管的值，Hermes 会拒绝并指出来源：

```bash
$ hermes config set model.default my/model
Cannot set 'model.default': it is managed by your administrator
(/etc/hermes/config.yaml) and cannot be changed.
```

托管密钥同理——对于被托管 `.env` 固定的环境变量键，`hermes config set` / setup 不会写入用户值。

## 设置托管作用域（管理员）

```bash
sudo mkdir -p /etc/hermes

# Pin some config values for every user on this machine
sudo tee /etc/hermes/config.yaml >/dev/null <<'YAML'
model:
  provider: nous
security:
  redact_secrets: true
YAML

# Optionally pin a shared, non-sensitive env value
sudo tee /etc/hermes/.env >/dev/null <<'ENV'
OPENAI_API_BASE=https://inference.example.com/v1
ENV

sudo chmod 0755 /etc/hermes
sudo chmod 0644 /etc/hermes/config.yaml /etc/hermes/.env
```

更改在 Hermes 下次启动时生效（格式错误的托管文件会被大声记录并忽略——绝不会阻止启动，但管理员应检查 `hermes doctor` 以确认策略正在生效）。

## 安全模型与局限（v1）

- **强制机制仅靠文件系统权限。** 如果用户对托管目录有写权限（或以 `root` 身份运行 Hermes），托管作用域就只是建议性的。
- **托管 `.env` 全局可读**（`0644`），因此任何本地用户都能读取通过它推送的密钥。请将其用于共享、非敏感的值（组织 API base URL、功能默认值），而非高敏感度密钥。
- **智能体自身的工具并未被硬性阻止读取托管的*环境变量*值。** 托管环境变量在启动时应用，但没有什么能阻止智能体在其自身的子进程 shell 中设置不同的值。v1 是针对普通用户的管理便利性边界，而非无法逃逸的沙箱。

以下内容有意**不在 v1 范围内**，可能后续提供：

- 连智能体自身也无法逃逸的硬边界。
- macOS 与 Windows 上的原生托管位置（v1 以 Linux/POSIX 为先）。
- 用于分层策略的 drop-in 片段目录（`managed.d/`）。
- 经签名 / 完整性校验的托管文件。
- 远程 / 设备管理（MDM）下发。
- 针对托管密钥的更严格（按组限定）权限。
