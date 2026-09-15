---
sidebar_position: 2.5
title: "平台支持"
description: "Hermes Agent 支持哪些操作系统、分发方式与功能。"
---

# 平台支持

Hermes Agent 持续支持多种平台和分发方式，但我们无法支持所有可能的安装方式。

---

## 第一梯队

我们力求永不破坏这些平台的安装和更新。第一梯队中的问题与回归是我们的首要任务，会优先于其他平台处理。

| 操作系统 / 架构                                                               | 安装方式                                                                                                                       | 说明                                                                                                                                                       |
| ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **macOS**（Apple 芯片）                                                       | [Hermes Desktop](https://hermes-agent.nousresearch.com/)、[`install.sh`](./installation.md#linux--macos--wsl2--android-termux) |
| [**Windows 10 / 11**](../user-guide/windows-native.md)（x86_64、aarch64）     | [Hermes Desktop](https://hermes-agent.nousresearch.com/)、[`install.ps1`](./installation.md#windows-native)                    | 少数功能[尚不可用](../user-guide/windows-native.md#feature-matrix)。                                                                                      |
| **Linux / [WSL2](../user-guide/windows-wsl-quickstart.md)**（x86_64、aarch64） | [`install.sh`](./installation.md#linux--macos--wsl2--android-termux)                                                           | 我们在最新的 Ubuntu 和 WSL2 上进行测试。如果你的发行版具有 glibc、systemd，并遵循文件系统层级标准（FHS），那么很可能运行得相当不错。                     |
| [**Docker 容器**](../user-guide/docker.md#quick-start)（x86_64、aarch64）     | [`docker pull`](../user-guide/docker.md#quick-start)                                                                           | Docker 安装不支持 `hermes update`。更新通过运行新镜像来完成。                                                                                            |

---

## 第二梯队

这些平台仅在源码树中尽力维护。
新版本可能会破坏它们，我们也无法承诺在出现问题时及时修复。

接受修复这些问题相关问题的 PR，但这些 PR 的优先级低于修复第一梯队平台的问题。

| 操作系统 / 架构                | 安装方式                                                             | 说明                                                                        |
| ------------------------------ | -------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| **Android（Termux）**（aarch64） | [`install.sh`](./installation.md#linux--macos--wsl2--android-termux) | 少数功能[尚不可用](./termux.md#known-limitations-on-phones)。              |
| **Nix**（MacOS、Linux、NixOS）  | [`install.sh`](./nix-setup.md)                                       | 由于 node.js 打包问题，经常损坏。祝你好运~！ &lt;3                           |

## 不支持

以下平台和分发方式**不**受支持。
我们建议你迁移到受支持的分发方式或平台。
它们现在可能已经损坏，将来也可能进一步损坏。
修复它们的 PR 将_不会_被接受，保持与它们兼容的任何代码也可能随时被移除。

- 通过 AUR 安装（如果能帮上忙，我们可能会向上游提交补丁 &lt;3）
- 在 x86（Intel）处理器上的 macOS
- 通过 `pypi` 安装（例如 `uv tool install hermes-agent`、`pip install hermes-agent` 等）
- 通过 `brew` 安装（`brew install hermes-agent`）

如果你使用的是不受支持的分发方式，请阅读[安装指南](./installation.md)，了解如何切换到受支持的方式。
