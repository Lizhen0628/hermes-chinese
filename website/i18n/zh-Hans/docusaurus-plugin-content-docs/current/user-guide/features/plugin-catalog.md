---
sidebar_position: 13
sidebar_label: "插件目录"
title: "插件目录"
description: "浏览并安装来自精选目录的、经过审核且以 SHA 固定版本的 Hermes 插件"
---

# 插件目录

插件目录是一个经过人工审核、精心策划的 Hermes 插件名录，你可以通过一条命令按名称安装插件：

```bash
hermes plugins install <name>
```

在 **[/docs/plugins](/plugins)** 中可视化浏览 —— 条目按类别（记忆、桌面、平台、Web 与浏览器、工具、语音、自动化、模型）分区陈列，带有搜索、层级筛选（官方 / 社区）、能力标签，以及每个条目的可复制安装命令。

插件目录是对现有[插件系统](plugins.md)的补充 —— 而非替代。从目录中安装的任何东西本质上都是普通插件；目录只是在之上增加了发现和审核层。

## 条目包含的内容

每个目录条目都是 hermes-agent 仓库 [`plugin-catalog/`](https://github.com/NousResearch/hermes-agent/tree/main/plugin-catalog) 目录下的一个小型 YAML 文件，声明以下内容：

| 字段 | 含义 |
|---|---|
| `name` | 你传给 `hermes plugins install` 的目录键名 |
| `repo` | 插件的公开 git 仓库 |
| `sha` | 经过审核的**精确 40 位十六进制提交** —— 安装时会检出这个固定版本，而非分支顶端 |
| `tier` | `official`（由 NousResearch 维护）或 `community` |
| `category` | 浏览分区：`desktop`（默认）、`memory`、`platform`、`web`、`tools`、`voice`、`automation`、`models` 或 `general` |
| `maintainer` | 插件的所有者 |
| `capabilities` | 声明的工具、hook、中间件以及所需的环境变量 |
| `requires_hermes` | 最低 Hermes 版本，例如 `>=0.19`（可选） |
| `platforms` | 操作系统限制，留空 = 全部（可选） |
| `docs_url` | 外部文档链接（可选） |

## 信任模型

插件目录的设计目标是让你确切知道自己安装的是什么：

- **人工合并准入。** 每个条目（以及每次固定版本的更新）都通过由维护者审核的 pull request 合并。没有任何东西会自动进入目录。
- **精确 SHA 固定。** 条目固定的是特定提交，而非分支。插件作者向自己的仓库推送新代码**不会**改变目录安装的内容 —— 更新固定版本需要另一个经过审核的 PR。
- **能力声明。** 条目会预先说明插件提供哪些工具、hook 和中间件，以及需要哪些环境变量（API 密钥等），让你可以在安装前判断其影响范围。
- **移除列表。** 从目录中撤下的插件（例如在安全事件后）会记录在 `plugin-catalog/removed.yaml` 中，附上原因和日期。安装器会拒绝安装移除列表上的任何内容。
- **已安装 ≠ 已启用。** 安装目录插件只是把它放到磁盘上；与任何插件一样，它必须被启用后才能加载。参见[插件 → 启用与禁用](plugins.md)。

:::warning 目录审核是时间点审核
目录条目意味着固定的提交被人工查看过，能力声明经过了核对，仓库满足了提交门槛。它不是安全审计，也不代表同一仓库中的其他提交。请审阅你要授予凭据的任何代码。
:::

## 从目录安装

```bash
# 按名称安装经过审核的目录条目（会检出固定的 SHA）
hermes plugins install <name>

# 然后像任何插件一样启用它
hermes plugins enable <name>
```

安装提示会在克隆任何内容之前显示条目的能力摘要 —— 声明的工具、hook 和所需的环境变量。

目录名称和插件自身的清单名称可能不同；`hermes plugins install` 会打印安装后的名称，`enable` 使用那个名称。例如 `touchdesigner` 条目（一个可移植的 Agent Plugins v1 包，将 twozero MCP 服务器与 `touchdesigner-mcp` 技能打包在一起）安装为 `td`，保持简短以使其生成的 MCP 工具名称不超过服务商的函数名限制：

```bash
hermes plugins install touchdesigner
hermes plugins enable td
```

可移植包还可以携带 stdio MCP 服务器。`snyk` 条目固定了 Snyk CLI（`npx -y snyk@<version> mcp`）并打包了 `snyk-security-scan` 技能，因此一次安装就能为 Hermes 提供代码、依赖、容器和 IaC 扫描以及使用它的工作流；目录名称与清单名称一致：

```bash
hermes plugins install snyk
hermes plugins enable snyk
```

### 更新目录安装的插件

对于目录安装的插件，`hermes plugins update <name>` 从不运行 `git pull` —— 它会将你已安装的固定版本与当前目录固定版本进行比较，当目录发生变动时（通过经过审核的 PR），强制在新 SHA 上重新安装。你的启用/禁用状态会被保留。`hermes plugins list` 会将目录安装的插件显示为 `catalog:<tier>@<sha>`，让你一眼看出其来源。

### 不在目录中的名称

不是目录条目的裸名称会报错：不存在第二个未经审核的名称索引。请改用 `owner/repo` 或 Git URL 安装这类插件（自定义来源，见下文），或者将它们提交到目录。

### 实时刷新

文档构建会将目录发布为一个 JSON 文档（`https://hermes-agent.nousresearch.com/docs/api/plugin-catalog.json`）。`search`/`install`/`update` 最多每六小时获取一次并缓存在 `~/.hermes/cache/` 下，因此新条目和移除条目无需更新 Hermes 就能到达已安装的客户端。离线时，使用随你的检出版本一起提供的那份副本。树内列表和实时列表中的移除条目始终都会被强制执行。

### 自定义 git URL 有所不同

`hermes plugins install <git-url>` 对任何仓库仍然可用，但它完全绕过了目录：

- **无审核** —— 你得到的是分支顶端的内容，而非经过审核的固定版本。
- 会显示**警告横幅**，以明确代码未经审核。
- 移除列表仍会被查询（已知有问题的仓库会按 URL 被拒绝）。

用于你自己的插件和你已经信任的仓库时，使用 git URL 方式；用于发现插件时，使用目录。

## 向目录提交插件

提交就是添加一个 `plugin-catalog/<name>.yaml` 文件的 pull request。完整清单位于[插件目录 README](https://github.com/NousResearch/hermes-agent/tree/main/plugin-catalog)；简而言之，一个条目必须：

1. **由所有者提交** —— PR 作者拥有或维护该插件仓库。
2. **公开仓库** —— `repo` URL 可公开克隆。
3. **已发布** —— 仓库有真实的 release/tag，而不仅仅是一个默认分支。
4. **通过验证** —— 目录验证 GitHub Action 在该 PR 上通过（schema、SHA 格式、可访问性）。
5. **非自我更新** —— 目录构建不得下载并替换自己的文件；固定 SHA 是唯一的更新路径（SHA 升级 PR 加上 `hermes plugins update <name>`）。

固定版本更新（将 `sha` 升级到更新的提交）遵循相同的 PR + 审核流程。

## 另见

- [插件](plugins.md) —— 插件系统本身：清单格式、启用、配置
- [内置插件](built-in-plugins.md) —— 随 Hermes 一起提供的插件
- [构建 Hermes 插件](/developer-guide/plugins) —— 编写你自己的插件
- [插件目录页面](/plugins) —— 可浏览的目录
