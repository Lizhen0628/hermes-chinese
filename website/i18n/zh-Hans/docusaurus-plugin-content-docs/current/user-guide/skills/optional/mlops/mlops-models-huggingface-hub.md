---
title: "Huggingface Hub — HuggingFace hf CLI：搜索/下载/上传模型、数据集"
sidebar_label: "Huggingface Hub"
description: "HuggingFace hf CLI：搜索/下载/上传模型、数据集"
---

{/* 此页面由 website/scripts/generate-skill-docs.py 根据技能的 SKILL.md 自动生成。请编辑源文件 SKILL.md，而不是本页面。 */}

# Huggingface Hub

HuggingFace hf CLI：搜索/下载/上传模型、数据集。

## 技能元数据

| | |
|---|---|
| 来源 | 可选 — 使用 `hermes skills install official/mlops/huggingface-hub` 安装 |
| 路径 | `optional-skills/mlops\models\huggingface-hub` |
| 版本 | `1.0.1` |
| 作者 | Hugging Face |
| 许可证 | MIT |
| 平台 | linux, macos, windows |

## 参考：完整 SKILL.md

:::info
以下是 Hermes 在此技能被触发时加载的完整技能定义。这就是技能启用时智能体看到的指令内容。
:::

# Hugging Face CLI（`hf`）参考指南

`hf` 命令是用于与 Hugging Face Hub 交互的现代命令行界面，提供管理仓库、模型、数据集和 Spaces 的工具。

> **重要：** `hf` 命令取代了现已弃用的 `huggingface-cli` 命令。

## 快速开始
*   **安装：** `curl -LsSf https://hf.co/cli/install.sh | bash -s`
*   **帮助：** 使用 `hf --help` 查看所有可用函数和实际示例。
*   **身份验证：** 推荐通过 `HF_TOKEN` 环境变量或 `--token` 参数。

---

## 核心命令

### 常规操作
*   `hf download REPO_ID`：从 Hub 下载文件。
*   `hf upload REPO_ID`：上传文件/文件夹（推荐用于单次提交；也支持大型目录的断点续传上传）。
*   `hf upload-large-folder REPO_ID LOCAL_PATH`：**[已弃用]** — 请改用 `hf upload`。
*   `hf sync`：在本地目录与桶（bucket）之间同步文件。
*   `hf env` / `hf version`：查看环境和版本详情。

### 身份验证（`hf auth`）
*   `login` / `logout`：使用来自 [huggingface.co/settings/tokens](https://huggingface.co/settings/tokens) 的 token 管理会话。
*   `list` / `switch`：管理并在多个已存储的访问 token 之间切换。
*   `whoami`：识别当前登录的账户。

### 仓库管理（`hf repos`）
*   `create` / `delete`：创建或永久删除仓库。
*   `duplicate`：将模型、数据集或 Space 克隆到新的 ID。
*   `move`：在命名空间之间转移仓库。
*   `branch` / `tag`：管理类似 Git 的引用。
*   `delete-files`：使用模式移除特定文件。

---

## 专门的 Hub 交互

### 数据集与模型
*   **数据集：** `hf datasets list`、`info` 和 `parquet`（列出 parquet URL）。
*   **SQL 查询：** `hf datasets sql SQL` — 通过 DuckDB 针对数据集 parquet URL 执行原始 SQL。
*   **模型：** `hf models list` 和 `info`。
*   **论文：** `hf papers ls` — 查看每日论文。

### 讨论与拉取请求（`hf discussions`）
*   管理 Hub 贡献的生命周期：`list`、`create`、`info`、`comment`、`close`、`reopen` 和 `rename`。
*   `diff`：查看 PR 中的变更。
*   `merge`：完成拉取请求。

### 基础设施与计算
*   **端点（Endpoints）：** 部署和管理推理端点（`deploy`、`pause`、`resume`、`scale-to-zero`、`catalog`）。
*   **任务（Jobs）：** 在 HF 基础设施上运行计算任务。包括用于运行内联依赖的 Python 脚本的 `hf jobs uv` 以及用于资源监控的 `stats`。
*   **Spaces：** 管理交互式应用。包括 `dev-mode` 和 `hot-reload`，无需完全重启即可更新 Python 文件。

### 存储与自动化
*   **桶（Buckets）：** 完整的类 S3 桶管理（`create`、`cp`、`mv`、`rm`、`sync`）。
*   **缓存（Cache）：** 使用 `list`、`prune`（移除分离的版本）和 `verify`（校验和检查）管理本地存储。
*   **Webhooks：** 通过管理 Hub webhook 实现工作流自动化（`create`、`watch`、`enable`/`disable`）。
*   **集合（Collections）：** 将 Hub 项目组织到集合中（`add-item`、`update`、`list`）。

---

## 高级用法与提示

### 全局参数
*   `--format json`：生成供自动化使用的机器可读输出。
*   `-q` / `--quiet`：仅输出 ID。

### 扩展与技能
*   **扩展（Extensions）：** 通过 GitHub 仓库使用 `hf extensions install REPO_ID` 扩展 CLI 功能。
*   **技能（Skills）：** 使用 `hf skills add` 管理 AI 助手技能。
