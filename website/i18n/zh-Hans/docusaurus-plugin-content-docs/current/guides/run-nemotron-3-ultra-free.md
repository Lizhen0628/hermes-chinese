---
sidebar_position: 0
title: "在 Hermes Agent 中免费运行 Nemotron 3 Ultra"
description: "在 Nous Portal 上试用 NVIDIA Nemotron 3 Ultra —— 6 月 4 日至 18 日免费 —— Hermes Agent 提供第 0 天支持"
---

# 在 Hermes Agent 中免费运行 Nemotron 3 Ultra

Nous Research 已加入 **Nemotron Coalition**，与领先 AI 实验室携手 **NVIDIA** 共同推进开放前沿基础模型的发展。为此，我们与 **Nebius** 合作，在 [Nous Portal](https://portal.nousresearch.com) 上提供为期两周（**6 月 4 日至 6 月 18 日**）的 **Nemotron 3 Ultra** 免费使用。按照以下说明，立即在你的 Hermes Agent 中试用该模型。

:::info 限时优惠
`nvidia/nemotron-3-ultra:free` 层级有效期从 **6 月 4 日到 6 月 18 日**。`:free` 标签是让它保持在免费方案上的关键 —— 请选择该确切变体。
:::

选择适合你的安装方式。**桌面应用**最为简单 —— 无需终端。如果你习惯使用终端，**命令行**安装就在它下面。

## 方案 A —— 桌面应用（推荐）

最简便的路径：一键安装程序，带引导式的点击配置。无需终端。

### 1. 下载并安装

下载适用于 macOS 或 Windows 的 [Hermes Desktop 安装程序](https://hermes-agent.nousresearch.com/)，然后打开它。首次启动时它会完成自我设置（通常不到一分钟）。

### 2. 连接 Nous Portal

应用打开后，你会看到一个"让我们为你完成设置"界面。点击 **Nous Portal**（标注为 **推荐**）。浏览器会打开 —— 创建一个 [Nous Portal](https://portal.nousresearch.com) 账户（或登录），选择 **Free** 方案，并授权 Hermes。应用会自动连接。

### 3. 选择免费的 Nemotron 3 Ultra 模型

连接后，应用会显示一个 **Default model（默认模型）** 卡片。点击 **Change（更改）**，搜索 **nemotron 3 ultra**，然后选择标注为 **Free tier（免费层级）** 的变体：

```
nvidia/nemotron-3-ultra:free
```

`:free` 标签是让它保持在免费层级上的关键 —— 请选择该变体。

### 4. 开始聊天

点击 **Start chatting（开始聊天）**。就这样 —— 你已经在免费使用 Nemotron 3 Ultra 了。

## 方案 B —— 命令行

更喜欢终端？

### 1. 安装 Hermes Agent

在 macOS/Linux/WSL2/Android 上，运行

```bash
curl -fsSL https://hermes-agent.nousresearch.com/install.sh | bash
```

在 Windows 上，运行

```powershell
iex (irm https://hermes-agent.nousresearch.com/install.ps1)
```

想先审查一下？下载 [`install.sh`](https://hermes-agent.nousresearch.com/install.sh)，检查内容，然后运行它。

安装完成后，重新加载你的 shell：

```bash
source ~/.bashrc   # 或 source ~/.zshrc
```

### 2. 运行快速设置

```bash
hermes setup
```

选择 **Quick Setup（快速设置）**。Hermes 会打开一个浏览器标签页，并等待你完成接下来的步骤。

### 3. 创建 Nous Portal 账户

在浏览器中，创建一个 [Nous Portal](https://portal.nousresearch.com) 账户（或登录），并选择 **Free** 方案。

### 4. 连接你的账户

当提示你将账户连接到 Hermes Agent 时，点击 **Connect（连接）**。连接成功后你会看到确认信息。

### 5. 选择免费的 Nemotron 3 Ultra 模型

返回你的终端。从模型列表中，选择：

```
nvidia/nemotron-3-ultra:free
```

`:free` 标签是让它保持在免费层级上的关键，所以务必选择该变体。

### 6. 开始聊天

完成剩余的快速设置提示，然后运行：

```bash
hermes
```

就这样 —— 你已经在免费使用 Nemotron 3 Ultra 了。

## 稍后切换到该模型

已经设置过其他模型？

- **桌面应用：** 打开模型选择器，搜索 **nemotron 3 ultra**，选择 **Free tier（免费层级）** 变体。
- **CLI / TUI：** 随时在会话中使用 `/model nvidia/nemotron-3-ultra:free` 切换，或运行 `/model` 打开选择器并从列表中选择。

## 故障排查

- **列表里看不到该模型？** 确认你已完成 Nous Portal 连接，并且使用的是 **Free** 方案。在 CLI 中，`hermes portal info` 可以确认你已登录并通过 Nous 路由。
- **选错了变体？** 重新选择 `nvidia/nemotron-3-ultra:free` —— 需要 `:free` 后缀才能保持在免费层级上。
- **浏览器没打开 / 你在远程主机上（CLI）？** 参见 [SSH / 远程主机上的 OAuth](/guides/oauth-over-ssh) 了解端口转发解决方法。

## 另请参阅

- **[桌面应用](/user-guide/desktop)** —— 原生一键应用（macOS、Windows、Linux）
- **[使用 Nous Portal 运行 Hermes Agent](/guides/run-hermes-with-nous-portal)** —— 完整的 Portal 操作指南：模型、Tool Gateway 和验证
- **[Nous Portal 集成](/integrations/nous-portal)** —— 订阅中包含的内容
- **[快速开始](/getting-started/quickstart)** —— 5 分钟内从安装到聊天
