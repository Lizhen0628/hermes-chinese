---
sidebar_position: 13
sidebar_label: "插件目录"
title: "插件目录"
description: "浏览并安装来自精选目录中经过审核、以 SHA 固定版本的 Hermes 插件"
---

# 插件目录

插件目录是一个经过人工审核的精选 Hermes 插件名录，你可以通过一条命令按名称安装：

```bash
hermes plugins install <name>
```

在 **[/docs/plugins](/plugins)** 中可以可视化浏览 —— 条目按类别陈列（记忆、桌面、平台、Web 与浏览器、工具、语音、自动化、模型），支持搜索、层级筛选（官方 / 社区）、能力标签，以及每个条目的可复制安装命令。

插件目录是对现有[插件系统](plugins.md)的补充——而非替代。你可以从目录安装的任何内容在底层都是普通插件；目录只是在上面增加了一层发现与审核机制。

## 条目包含什么

每个目录条目都是
[`plugin-catalog/`](https://github.com/NousResearch/hermes-agent/tree/main/plugin-catalog)
目录（位于 hermes-agent 仓库中）里的一个小型 YAML 文件，它声明了：

| 字段 | 含义 |
|---|---|
| `name` | 传递给 `hermes plugins install` 的目录键 |
| `repo` | 插件的公开 git 仓库 |
| `sha` | 经过审核的 **精确 40 位十六进制提交** —— 安装时检出此固定版本，而非分支尖端 |
| `tier` | `official`（由 NousResearch 维护）或 `community` |
| `category` | 浏览陈列分区：`desktop`（默认）、`memory`、`platform`、`web`、`tools`、`voice`、`automation`、`models` 或 `general` |
| `maintainer` | 插件的所有者 |
| `capabilities` | 声明的工具、钩子、中间件，以及所需的环境变量 |
| `requires_hermes` | 最低 Hermes 版本，例如 `>=0.19`（可选） |
| `platforms` | 操作系统限制，空表示全部（可选） |
| `docs_url` | 外部文档链接（可选） |

## 信任模型

插件目录的设计目的是让你确切知道自己安装的是什么：

- **人工合并准入。** 每个条目（以及每次固定版本更新）都通过维护者审核的
  pull request 合入。任何内容都不会自动进入目录。
- **精确 SHA 固定。** 条目固定的是特定提交，而非分支。插件作者向仓库推送新代码
  **不会** 改变目录安装的内容 —— 更新固定版本需要另一次经过审核的 PR。
- **能力声明。** 条目会预先说明插件提供的工具、钩子和
  中间件，以及它需要哪些环境变量（API 密钥
  等），让你在安装前判断其影响范围。
- **移除列表。** 从目录中撤下的插件（例如发生
  安全事件后）会记录在 `plugin-catalog/removed.yaml` 中，附带原因和
  日期。安装程序拒绝安装移除列表上的任何内容。
- **已安装 ≠ 已启用。** 安装目录插件会将其放到磁盘上；与
  任何插件一样，它仍必须被启用后才会加载。参见
  [插件 → 启用与禁用](plugins.md)。

:::warning 目录审核是时间点的审核
目录条目意味着固定的提交经过人工查看、能力
声明经过核对、仓库达到了提交标准。它不是
安全审计，也不代表同一仓库中的其他提交没有问题。
任何你赋予凭据的代码，请自行审阅。
:::

## 从目录安装

```bash
# 按名称安装经过审核的目录条目（检出固定的 SHA）
hermes plugins install <name>

# 然后像其他插件一样启用它
hermes plugins enable <name>
```

安装提示会在克隆任何内容之前显示条目的能力摘要 —— 声明的工具、
钩子和所需环境变量。

目录名称与插件自身 manifest 中的名称可能不同；`hermes
plugins install` 会打印安装后的名称，而 `enable` 使用的是那个名称。例如
`touchdesigner` 条目（一个可移植的 Agent Plugins v1 包，将
twozero MCP 服务器与 `touchdesigner-mcp` 技能打包在一起）安装后名称为
`td`，保持简短是为了让其生成的 MCP 工具名称不超出服务商的
函数名长度限制：

```bash
hermes plugins install touchdesigner
hermes plugins enable td
```

可移植包也可以携带一个 stdio MCP 服务器。`snyk` 条目固定了
Snyk CLI（`npx -y snyk@<version> mcp`）并打包了 `snyk-security-scan`
技能，因此一次安装就能为 Hermes 带来代码、依赖、容器和 IaC 扫描
以及使用它的工作流；目录名称与 manifest 名称一致：

```bash
hermes plugins install snyk
hermes plugins enable snyk
```

### 更新目录安装

对于目录安装，`hermes plugins update <name>` 绝不会运行 `git pull` ——
它比较你已安装的固定版本与当前目录中的固定版本，当
目录发生变动时（通过经过审核的 PR），在新 SHA 处强制重新安装。你的
启用/禁用状态会被保留。`hermes plugins list` 会将目录安装显示为 `catalog:<tier>@<sha>`，让你
一眼看清来源。

### 不在目录中的名称

不属于目录条目的裸名称会报错：不存在第二个
未经审核的名称索引。请改为通过 `owner/repo` 或 Git URL 安装此类插件
（自定义源，见下文），或将它们提交到目录。

### 实时刷新

文档构建会将目录发布为一份 JSON 文档
（`https://hermes-agent.nousresearch.com/docs/api/plugin-catalog.json`）。
`search`/`install`/`update` 最多每六小时拉取一次并缓存到
`~/.hermes/cache/`，因此新条目和移除内容无需更新 Hermes
即可到达已安装的客户端。离线时，使用随你的检出一起提供的副本。树内
列表和实时列表中的移除项始终同时强制执行。

### 自定义 git URL 是不同的

`hermes plugins install <git-url>` 对任何仓库仍然有效，但它
完全绕过目录：

- **无审核** —— 你得到的是分支尖端的内容，而非经过审核的固定版本。
- **会显示警告横幅**，以明确代码未经审查。
- 仍会查询移除列表（已知有问题的仓库会按 URL 被拒绝）。

对于你自己的插件和你已经信任的仓库，使用 git URL 路径；
对于发现新插件，使用目录。

## 向目录提交插件

提交是指添加一个 `plugin-catalog/<name>.yaml` 文件的 pull request。
完整的检查清单位于
[plugin-catalog README](https://github.com/NousResearch/hermes-agent/tree/main/plugin-catalog)；
简而言之，一个条目必须：

1. **由所有者提交** —— PR 作者拥有或维护该插件仓库。
2. **是公开仓库** —— `repo` URL 可公开克隆。
3. **已发布** —— 仓库有真实的 release/tag，而不只是默认分支。
4. **通过验证** —— 目录验证 GitHub Action 在
   该 PR 上为绿色（schema、SHA 格式、可达性）。
5. **非自更新** —— 目录构建不得下载并替换
   自身文件；固定的 SHA 是唯一的更新路径（通过 SHA 升级 PR 加上
   `hermes plugins update <name>`）。

固定版本更新（将 `sha` 升级到更新的提交）遵循同样的 PR + 审核
流程。

## 另见

- [插件](plugins.md) —— 插件系统本身：manifest 格式、启用、
  配置
- [内置插件](built-in-plugins.md) —— 随 Hermes 一起提供的插件
- [构建 Hermes 插件](/developer-guide/plugins) —— 编写你自己的插件
- [插件目录页面](/plugins) —— 可浏览的目录
