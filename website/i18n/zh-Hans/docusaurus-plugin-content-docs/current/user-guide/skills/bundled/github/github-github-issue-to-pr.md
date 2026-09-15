---
title: "Github Issue To Pr — 将 GitHub issue 推进为经验证的 PR，并如实呈现 CI 状态"
sidebar_label: "Github Issue To Pr"
description: "将 GitHub issue 推进为经验证的 PR，并如实呈现 CI 状态"
---

{/* 本页面由 website/scripts/generate-skill-docs.py 根据该技能的 SKILL.md 自动生成。请编辑源文件 SKILL.md，而非此页面。 */}

# Github Issue To Pr

将 GitHub issue 推进为经验证的 PR，并如实呈现 CI 状态。

## 技能元数据

| | |
|---|---|
| 来源 | 内置（默认安装） |
| 路径 | `skills/github/github-issue-to-pr` |
| 版本 | `0.1.0` |
| 作者 | Ben Barclay (benbarclay), Hermes Agent |
| 许可证 | MIT |
| 平台 | linux, macos, windows |
| 标签 | `GitHub`、`Issues`、`Coding`、`Pull-Requests`、`CI` |
| 相关技能 | [`github-issues`](/docs/user-guide/skills/bundled/github/github-github-issues)、[`github-pr-workflow`](/docs/user-guide/skills/bundled/github/github-github-pr-workflow)、[`systematic-debugging`](/docs/user-guide/skills/bundled/software-development/software-development-systematic-debugging)、[`test-driven-development`](/docs/user-guide/skills/bundled/software-development/software-development-test-driven-development)、[`requesting-code-review`](/docs/user-guide/skills/bundled/software-development/software-development-requesting-code-review) |

## 参考：完整 SKILL.md

:::info
以下是 Hermes 在此技能被触发时加载的完整技能定义。当技能处于激活状态时，这就是智能体看到的指令内容。
:::

# GitHub Issue to Pull Request

将 GitHub issue 转化为经过测试、经验证的 PR。此技能负责端到端的纪律——前提验证、重复项排查、同类级修复，以及如实汇报 CI；同类的 GitHub 技能和开发技能负责各自的机制。

## 何时使用

- “修复 issue #123 并开一个 PR。”
- “实现这个 GitHub 功能请求。”
- “把这个 bug 从 issue 一路带到绿色 CI。”

不适用：审查已有 PR，或回答一个不涉及任何变更请求的代码问题。

## 流程

### 1. 阅读实时 issue——正文和完整讨论串

使用 `terminal` 运行 `gh issue view <N> --comments`。正文是提交时的快照；最新的评论承载着实时状态：已合并的部分修复、新的根因分析、维护者的决定，或是指向你并会改变任务的提问。同时用 `read_file` 阅读仓库说明（`AGENTS.md`、贡献文档）。当当前被请求的行为、非目标，以及任何未答复的讨论串问题都已明确时，即告完成。

### 2. 排查已有工作和重复工作

在动手写任何东西之前，运行 `gh pr list --search "#<N>" --state all`，外加至少两种关键词/同义词变体对症状进行搜索（`gh pr list --search "<subsystem> <symptom>" --state open`）。热门 issue 会吸引多个各自独立的修复；构建重复工作是浪费精力和功劳。还要检查最近的提交是否已修复它：`git log --oneline -20 -- <relevant files>`。当你知道所有触及此 issue 的开放 PR 和近期提交，或确认一个都不存在时，即告完成。

### 3. 对照当前代码验证前提——同时对照设计意图

用失败的测试或 fixture，在当前默认分支上复现该 bug 或展示缺失的行为，并用 `search_files` 和 `read_file` 追踪所报告的路径。然后核对第二个问题：这个“bug”实际上是不是有意的设计？对 issue 想修改的代码运行 `git log -p -S "<symbol>"`，阅读原始提交的意图——一个缺失的链接或限制往往就是特性本身。要质疑陈旧或有缺陷的 issue 文字，而不是盲目实现它。当根因或功能缺口在当前代码中得到验证，且该变更不会与有意设计相抵触时，即告完成。

### 4. 定义验收标准与风险

列出验收标准、接口、迁移/状态变更、兼容性、安全/隐私、发布上线与回滚。把每一条标准映射到一项测试或明确的验证。当审查拥有了有限的约定时，即告完成。

### 5. 实现最小的完整变更——并修复整个同类

在隔离的分支或工作树上工作，当 bug 类型需要时，加载 `systematic-debugging` 或 `test-driven-development`。先添加回归测试，再实现。当你手上有修复时，用 `search_files` 在同级的调用点查找相同形态的 bug，并在本 PR 中修复整个同类——一个不完整的修复留下已知同类受损，比不修复更糟。每一行改动的代码都必须能溯源到该 issue；不要顺手清理。当针对性测试通过、原始失败不再复现，且同类位置已被修复或明确排除时，即告完成。

### 6. 证明回归测试确实有效（破坏性验证）

临时还原被测函数的旧行为，运行新测试，确认它失败；然后恢复修复并确认它通过。一个在有修复和没有修复时都能通过的回归测试什么也证明不了。当测试在修复前的代码上确凿地失败时，即告完成。

### 7. 运行仓库质量门禁，然后立即开启 PR

对受影响的区域运行格式化工具、lint、类型检查和仓库的规范测试入口；对 diff 使用 `requesting-code-review`。然后推送并立即开启 PR——PR 才是触发 CI 的东西，而 CI 的延迟是最大的瓶颈；不要扣着已完成的工作不发。加载 `github-pr-workflow` 了解 PR 机制：约定式分支/提交，正文链接该 issue，并说明问题、方法、测试、风险和排除项。回读 PR 并核验 head SHA、base、标题和文件。当 PR 存在且带着预期的 diff，CI 正在运行时，即告完成。

### 8. 诚实照看 CI 并闭环

通过 `gh pr checks` / `gh run view --log-failed` 检查实时检查项和失败日志。将你的 diff 引入的失败与既有基线失败或基础设施失败区分开——不确定时在默认分支上复现，只有真正的 infra 偶发失败才重跑一次且仅重跑一次。绝不要在缺少该确切状态实时证据的情况下说“绿灯”“已合并”或“已发布”。当 PR 落地时，在 issue 中评论 PR 链接和一行说明，让报告者获得可追溯的解决。当 CI 状态、剩余阻塞项和 issue 讨论串都反映现实时，即告完成。

## 陷阱

- 未读 issue 评论、未排查重复 PR，或未读当前代码就开始编码。
- “修复”原始提交表明是有意设计的行为。
- 只在一个调用点修复病症，而同类位置仍留有同样的 bug。
- 交付一个在无修复时也能通过的回归测试。
- 在未运行测试或夹带无关格式改动的情况下开启 PR。
- 仅因为存在一个 PR，就宣称该 issue 已交付。

## 验证

- [ ] 已阅读完整 issue 讨论串；最新评论的状态已反映在计划中。
- [ ] 已用 issue 编号 + 2 个关键词变体运行重复 PR 排查。
- [ ] 已在当前代码上复现前提；已通过 git 历史核对设计意图。
- [ ] 已证明回归测试在没有修复时失败。
- [ ] 同级调用点已修复或明确排除。
- [ ] 每一行改动均可溯源到该 issue。
- [ ] CI 状态仅依据实时证据汇报；已在 issue 中评论 PR 链接。
