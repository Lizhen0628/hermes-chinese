---
sidebar_position: 2.5
title: "平台支持"
description: "Hermes Agent 支持哪些操作系统、分发方式以及功能。"
---

# 平台支持

Hermes Agent 支持众多平台与分发方式，但我们无法兼顾所有可能的安装方式。

---

## 第一梯队

我们力求绝不破坏这些平台的安装与更新。第一梯队的问题与回归是我们的首要任务，其优先级高于其他平台。

| 操作系统 / 架构                                                              | 安装方式                                                                                                                       | 说明                                                                                                                                                  |
| ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **macOS**（Apple Silicon）                                                    | [Hermes Desktop](https://hermes-agent.nousresearch.com/)、[`install.sh`](./installation.md#linux--macos--wsl2--android-termux) |
| [**Windows 10 / 11**](../user-guide/windows-native.md)（x86_64、aarch64）      | [Hermes Desktop](https://hermes-agent.nousresearch.com/)、[`install.ps1`](./installation.md#windows-native)                    | 有少数功能[不可用](../user-guide/windows-native.md#feature-matrix)。                                                                                 |
| **Linux / [WSL2](../user-guide/windows-wsl-quickstart.md)**（x86_64、aarch64） | [`install.sh`](./installation.md#linux--macos--wsl2--android-termux)                                                           | 我们在最新的 Ubuntu 和 WSL2 上测试。如果你的发行版带有 glibc、systemd，并遵循文件系统层次结构标准，通常都能很好地运行。 |
| [**Docker 容器**](../user-guide/docker.md#quick-start)（x86_64、aarch64）      | [`docker pull`](../user-guide/docker.md#quick-start)                                                                           | Docker 安装不支持 `hermes update`。更新需通过运行新镜像来完成。                                                                  |

---

## 第二梯队

这些平台仅以尽力而为的方式在仓库内维护。
新版本可能会导致它们出问题，并且我们无法承诺在出问题时及时修复。

我们会接受修复这些平台问题的 PR，但它们的优先级低于修复第一梯队平台的问题。

| 操作系统 / 架构                | 安装方式                                                             | 说明                                                                         |
| ------------------------------ | -------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| **Android (Termux)**（aarch64） | [`install.sh`](./installation.md#linux--macos--wsl2--android-termux) | 有少数功能[不可用](./termux.md#known-limitations-on-phones)。 |
| **Nix**（MacOS、Linux、NixOS）  | [`install.sh`](./nix-setup.md)                                       | 常因 node.js 打包问题而出故障。祝你好运~！&lt;3             |

## 不支持

以下平台和分发方式**不受**支持。
我们建议你迁移到受支持的分发方式或平台。
它们现在可能已经无法使用，未来可能问题更多。
修复它们的 PR 将_不会_被接受，任何保持与之兼容的代码都可能随时被移除。

- 通过 AUR 安装（如果能有帮助，我们可能会向上游提交补丁 &lt;3）
- 运行在 x86（Intel）处理器上的 macOS
- 通过 `pypi` 安装（例如 `uv tool install hermes-agent`、`pip install hermes-agent` 等）
- 通过 `brew` 安装（`brew install hermes-agent`）

如果你正在使用不受支持的分发方式，请阅读[安装指南](./installation.md)了解如何切换到受支持的方式。
