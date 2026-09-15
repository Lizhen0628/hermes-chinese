---
sidebar_position: 3
title: "托管作用域"
description: "管理员固定的、用户不可变更的配置与密钥，通过系统级托管目录实现"
---

# 托管作用域

**托管作用域**（Managed Scope）允许管理员推送一组基线配置与密钥，而标准（非 root）用户**无法覆盖**它们。它适用于组织/机群部署场景：IT 需要在一台机器的所有用户上固定某些配置，比如模型服务商、共享 API 基础 URL，或 `security.redact_secrets: true`。

当存在托管作用域时，它指定的值会优先于用户的 `~/.hermes/config.yaml`、`~/.hermes/.env`，甚至 shell 环境 —— 但仅限于它所固定的那些键。其余一切仍完全由用户控制。

:::note 与包管理器锁定的安装不同
由包管理器管理的安装（声明式发行版 / formula）会阻止*所有*配置变更，并提示你使用包管理器。托管作用域是另一套机制：它按每个键注入*特定的不可变值*，而不是锁定整个配置。二者相互独立，可以共存。
:::

## 它位于何处

托管作用域从一个系统级目录读取，默认是 `/etc/hermes`：

```text
/etc/hermes/
├── config.yaml     # 托管配置层（优先于 ~/.hermes/config.yaml）
└── .env            # 托管环境变量层（优先于 ~/.hermes/.env + shell）
```

该目录及文件归 `root` 所有（目录权限 `0755`，文件权限 `0644`）：所有人可读，仅管理员可写。**该文件系统权限就是执行机制** —— 标准用户可以读取托管文件，但无法编辑它们。

两个文件都是可选的。托管目录或文件缺失仅意味着"没有托管作用域"，此时配置的解析方式与未启用该功能时完全一致。

### 变更目录位置

可通过 `HERMES_MANAGED_DIR` 环境变量改变该位置（适用于容器或非 `/etc` 的部署场景）。这是一个部署/引导阶段使用的路径开关 —— 与 `HERMES_HOME` 类似 —— 由拥有托管文件的同一管理员设置。Hermes **绝不会**将其持久化到任何 `.env` 中。

```bash
# 将托管作用域指向自定义目录（由 IT / 部署方设置，而非用户）
export HERMES_MANAGED_DIR=/opt/org/hermes-policy
```

:::warning
能够设置 `HERMES_MANAGED_DIR` 的用户可以将托管作用域重定向到自己控制的目录，从而绕开该机制。在实际部署中，此变量应由管理员固定（例如写入服务单元 / 容器镜像），而非留给用户自行设置。`hermes doctor` 会报告*解析后*的托管目录，使重定向一目了然。
:::

## 优先级

对于托管层所指定的键，优先级顺序为（最高者胜出）：

| 层级 | config.yaml | .env |
|---|---|---|
| 1 | `/etc/hermes/config.yaml`（托管） | `/etc/hermes/.env`（托管） |
| 2 | `~/.hermes/config.yaml`（用户） | `~/.hermes/.env`（用户） |
| 3 | 内置默认值 | 预先存在的 shell 环境 |

合并是**叶子级**的：固定 `model.default` 并不会冻结 `model.*` 的其余部分。一份如下的托管 `config.yaml`：

```yaml
model:
  default: org/standard-model
```

会为所有用户强制设定 `model.default`，而 `model.fallback`（以及所有其他键）仍由用户控制。

:::note 关于优先级的说明
对于它所固定的键，托管作用域有意也优先于 shell 环境 —— 否则它就不是"托管"了。这是唯一一处逆转了通常的"环境变量覆盖 config.yaml"规则的地方，且仅适用于托管层所指定的那些特定键。
:::

## 查看托管内容

```bash
hermes config        # 显示一个头部，标明托管来源 + 已固定的键
hermes doctor        # 报告解析后的托管目录 + 已固定的键数量
```

如果你尝试修改某个托管的值，Hermes 会拒绝并指明来源：

```bash
$ hermes config set model.default my/model
Cannot set 'model.default': it is managed by your administrator
(/etc/hermes/config.yaml) and cannot be changed.
```

托管密钥亦然 —— 对于被托管 `.env` 固定的环境变量键，`hermes config set` / 设置流程不会写入用户提供的值。

## 设置托管作用域（管理员操作）

```bash
sudo mkdir -p /etc/hermes

# 为本机上的每个用户固定一些配置值
sudo tee /etc/hermes/config.yaml >/dev/null <<'YAML'
model:
  provider: nous
security:
  redact_secrets: true
YAML

# 可选：固定一个共享的、非敏感的环境变量值
sudo tee /etc/hermes/.env >/dev/null <<'ENV'
OPENAI_API_BASE=https://inference.example.com/v1
ENV

sudo chmod 0755 /etc/hermes
sudo chmod 0644 /etc/hermes/config.yaml /etc/hermes/.env
```

变更在下次启动 Hermes 时生效（格式错误的托管文件会被醒目地记录并忽略 —— 它绝不会阻止启动，但管理员应检查 `hermes doctor` 以确认策略正在生效）。

## 安全模型与局限性 (v1)

- **执行机制仅依赖文件系统权限。** 如果用户可以写入托管目录（或以 `root` 运行 Hermes），托管作用域就只是建议性的。
- **托管的 `.env` 是全局可读的**（`0644`），因此任何本地用户都能读取通过它推送的密钥。请将其用于共享的、非敏感的值（组织的 API 基础 URL、功能默认值），而非高敏感度的密钥。
- **智能体自身的工具不会被硬性阻止修改托管的*环境变量*值。** 托管的环境变量会在启动时应用，但没有什么能阻止智能体在其自身的子进程 shell 中设置不同的值。v1 是一道面向普通用户的管理便利性边界，而非不可逃逸的沙箱。

以下内容有意**不在 v1 范围内**，可能在未来加入：

- 智能体自身无法逃逸的硬性边界。
- macOS 和 Windows 上的原生托管位置（v1 优先支持 Linux/POSIX）。
- 用于分层策略的即插即用片段目录（`managed.d/`）。
- 经过签名 / 完整性校验的托管文件。
- 远程 / 设备管理（MDM）下发。
- 针对托管密钥的更严格（按组限定）权限。
