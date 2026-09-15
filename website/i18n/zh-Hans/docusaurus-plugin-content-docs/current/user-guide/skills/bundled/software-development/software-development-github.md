---
title: "Github — 通过 gh CLI 使用 GitHub：PR、issue、评审、仓库、认证"
sidebar_label: "Github"
description: "通过 gh CLI 使用 GitHub：PR、issue、评审、仓库、认证"
---

{/* 本页面由 website/scripts/generate-skill-docs.py 根据该技能的 SKILL.md 自动生成。请编辑源文件 SKILL.md，而非本页面。 */}

# Github

通过 gh CLI 使用 GitHub：PR、issue、评审、仓库、认证。

## 技能元数据

| | |
|---|---|
| 来源 | 内置（默认安装） |
| 路径 | `skills/software-development\github` |
| 版本 | `2.0.0` |
| 作者 | Ben Barclay (benbarclay)、Hermes Agent |
| 许可证 | MIT |
| 平台 | linux、macos、windows |
| 标签 | `github`、`gh`、`git`、`pull-requests`、`issues`、`code-review`、`repos`、`auth`、`ci` |
| 相关技能 | [`codebase-inspection`](/docs/user-guide/skills/bundled/software-development/software-development-codebase-inspection)、[`requesting-code-review`](/docs/user-guide/skills/bundled/software-development/software-development-requesting-code-review) |

## 参考：完整 SKILL.md

:::info
以下是 Hermes 在此技能被触发时加载的完整技能定义。当技能处于激活状态时，这就是智能体看到的指令内容。
:::

# GitHub

使用 `gh` CLI 端到端地处理 GitHub 工作（在注明处回退到 REST）：认证、issue、PR 生命周期、从 issue 到 PR 的交付、代码评审以及仓库管理。本技能整合了此前的六个技能；每个工作流在其参考文件中都是完整的——在开始该工作流之前务必阅读对应的参考文件，以下正文仅作导航。

## 路由

| 任务 | 首先阅读 |
|---|---|
| 认证异常 / 新机器 / token 或 SSH 配置 / gh 登录 | `references/auth.md` |
| 创建、分类、加标签、指派、关闭 issue | `references/issues.md` |
| 分支、提交、发起 PR、观察 CI、合并 | `references/pr-workflow.md` |
| 将一个 ISSUE 推进为经验证的 PR（完整交付循环） | `references/issue-to-pr.md` |
| 评审他人的 PR：diff、行内评论、结论 | `references/code-review.md` |
| 克隆/创建/fork 仓库、远端、发布 | `references/repo-management.md` |

配套资源：`scripts/gh-env.sh` + `scripts/git-credential-token.py`（认证辅助脚本）、`templates/`（PR 正文、bug 报告、功能请求）、`references/ci-troubleshooting.md`、`references/conventional-commits.md`、`references/github-api-cheatsheet.md`、`references/review-output-template.md`。

## 核心准则（适用于每个工作流）

- 每个会话进行一次预检：`gh auth status` —— 若失败，先前往 `references/auth.md`，再做其他任何事。
- 优先使用 `gh` 而非原始 REST；仅对 porcelain 缺失的端点才使用 `gh api`（速查表中已列出这些端点）。
- 在自行检查 `gh pr checks` 之前，绝不要报告 CI 通过；在核实 `state,mergedAt` 之前，绝不要声称已合并。
- 在撰写前阅读完整上下文：`gh issue view --comments` / `gh pr view --comments` —— 决策存在于讨论线索中，而非标题里。
- 在创建任何内容之前先排查重复：`gh pr list --search` / `gh issue list --search`。

## 验证

- 各工作流的参考文件定义了该任务的完成标准。
- 横切要求：关于远端状态（CI、合并、发布、issue 状态）的每一处论断，都由一次新鲜的 `gh` 读取作为依据，绝不凭记忆。
