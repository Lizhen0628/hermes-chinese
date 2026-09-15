---
title: "Github —— 通过 gh CLI 使用 GitHub：PR、issue、评审、仓库、认证"
sidebar_label: "Github"
description: "通过 gh CLI 使用 GitHub：PR、issue、评审、仓库、认证"
---

{/* 本页由 website/scripts/generate-skill-docs.py 根据技能的 SKILL.md 自动生成。请编辑源文件 SKILL.md，而非本页。 */}

# Github

通过 gh CLI 使用 GitHub：PR、issue、评审、仓库、认证。

## 技能元数据

| | |
|---|---|
| 来源 | 内置（默认安装） |
| 路径 | `skills/software-development\github` |
| 版本 | `2.0.0` |
| 作者 | Ben Barclay (benbarclay), Hermes Agent |
| 许可证 | MIT |
| 平台 | linux, macos, windows |
| 标签 | `github`, `gh`, `git`, `pull-requests`, `issues`, `code-review`, `repos`, `auth`, `ci` |
| 相关技能 | [`codebase-inspection`](/docs/user-guide/skills/bundled/software-development/software-development-codebase-inspection), [`requesting-code-review`](/docs/user-guide/skills/bundled/software-development/software-development-requesting-code-review) |

## 参考：完整 SKILL.md

:::info
以下内容是 Hermes 在此技能触发时加载的完整技能定义。这就是智能体在技能激活时看到的指令内容。
:::

# GitHub

通过 `gh` CLI（在注明处回退到 REST）端到端地使用 GitHub：认证、issue、PR 生命周期、从 issue 到 PR 的交付、代码评审以及仓库管理。本技能合并了之前的六个技能；每个工作流程都完整地存在于其参考文件中 —— 在开始该工作流程之前，务必阅读对应的参考文件，下面的正文只负责导航。

## 路由

| 任务 | 首先阅读 |
|---|---|
| 认证失效 / 新机器 / token 或 SSH 设置 / gh 登录 | `references/auth.md` |
| 创建、分诊、打标签、分配、关闭 issue | `references/issues.md` |
| 建分支、提交、开 PR、观察 CI、合并 | `references/pr-workflow.md` |
| 将 ISSUE 推进到已验证的 PR（完整交付循环） | `references/issue-to-pr.md` |
| 评审他人的 PR：diff、行内评论、结论 | `references/code-review.md` |
| 克隆/创建/fork 仓库、远程、发布 | `references/repo-management.md` |

配套资源：`scripts/gh-env.sh` + `scripts/git-credential-token.py`（认证辅助工具）、`templates/`（PR 正文、bug 报告、功能请求）、`references/ci-troubleshooting.md`、`references/conventional-commits.md`、`references/github-api-cheatsheet.md`、`references/review-output-template.md`。

## 核心准则（适用于每个工作流程）

- 每个会话执行一次预检：`gh auth status` —— 如果失败，先转到 `references/auth.md`，再处理其他事情。
- 优先使用 `gh` 而非原始 REST；仅当瓷器命令（porcelain）缺少对应端点时，才降级到 `gh api`（速查表中列出了这些端点）。
- 未经自行检查 `gh pr checks`，绝不报告 CI 已通过；未经核实 `state,mergedAt`，绝不声称已合并。
- 写之前先阅读完整上下文：`gh issue view --comments` / `gh pr view --comments` —— 决策存在于讨论串中，而非标题里。
- 创建任何内容之前先排查重复：`gh pr list --search` / `gh issue list --search`。

## 验证

- 各工作流程自己的参考文件定义了该任务的完成标准。
- 跨领域要求：关于远程状态（CI、合并、发布、issue 状态）的每一项声明，都必须由新的 `gh` 读取结果支撑，绝不能凭记忆。
