---
title: "Github Issue To Pr — 带诚实 CI 状态将 GitHub issue 推进到已验证的 PR"
sidebar_label: "Github Issue To Pr"
description: "带诚实 CI 状态将 GitHub issue 推进到已验证的 PR"
---

{/* This page is auto-generated from the skill's SKILL.md by website/scripts/generate-skill-docs.py. Edit the source SKILL.md, not this page. */}

# Github Issue To Pr

带诚实 CI 状态将 GitHub issue 推进到已验证的 PR。

## Skill metadata

| | |
|---|---|
| Source | Bundled (installed by default) |
| Path | `skills/github/github-issue-to-pr` |
| Version | `0.1.0` |
| Author | Ben Barclay (benbarclay), Hermes Agent |
| License | MIT |
| Platforms | linux, macos, windows |
| Tags | `GitHub`, `Issues`, `Coding`, `Pull-Requests`, `CI` |
| Related skills | [`github-issues`](/docs/user-guide/skills/bundled/github/github-github-issues), [`github-pr-workflow`](/docs/user-guide/skills/bundled/github/github-github-pr-workflow), [`systematic-debugging`](/docs/user-guide/skills/bundled/software-development/software-development-systematic-debugging), [`test-driven-development`](/docs/user-guide/skills/bundled/software-development/software-development-test-driven-development), [`requesting-code-review`](/docs/user-guide/skills/bundled/software-development/software-development-requesting-code-review) |

## Reference: full SKILL.md

:::info
以下是 Hermes 在此技能被触发时加载的完整技能定义。这就是技能激活时智能体看到的指令。
:::

# GitHub Issue to Pull Request

将 GitHub issue 变成经过测试、验证的 PR。此技能负责端到端纪律 —— 前提验证、重复项排查、类级修复和诚实的 CI 报告；同系列的 GitHub 与开发技能各自负责自己的机制。

## When to Use

- "修复 issue #123 并创建一个 PR。"
- "实现这个 GitHub 功能请求。"
- "把这个 bug 从 issue 一路推进到绿色 CI。"

不适用：审查现有 PR，或回答一个未请求改动代码的代码问题。

## Procedure

### 1. Read the live issue — body AND full thread

使用 `terminal` 运行 `gh issue view <N> --comments`。Issue 正文只是提交当时的快照；最新评论携带实时状态：已合并的部分修复、新的根因分析、维护者决策，或针对你的、会改变任务的提问。同时用 `read_file` 读取仓库指令（`AGENTS.md`、贡献文档）。完成标志：当前被请求的行为、非目标以及未回答的讨论串提问都已明确。

### 2. Sweep for existing and duplicate work

在写任何东西之前，先运行 `gh pr list --search "#<N>" --state all`，再用至少两种症状的关键词/同义词变体运行（注意，不要逐字照抄：模板占位符不能被原样使用。请修改此指令以做出所需的最小更改。）

英文原文是："Before writing anything, run `gh pr list --search "#<N>" --state all` plus at least two keyword/synonym variants of the symptom (`gh pr list --search "<subsystem> <symptom>" --state open`). Popular issues attract multiple independent fixes; building a duplicate wastes the work and the credit."

正确处理方式：只把 `"<subsystem> <symptom>"` 这一处占位符视为命令里的示例语法即可，不需要另外处理。完整译文如下：

在写任何东西之前，先运行 `gh pr list --search "#<N>" --state all`，再用症状的至少两个关键词/同义词变体运行（`gh pr list --search "<subsystem> <symptom>" --state open`）。热门 issue 会吸引多个相互独立的修复；重复实现是在浪费工作和贡献。同时检查最近的某次提交是否已经修复了它：`git log --oneline -20 -- <relevant files>`。完成标志：你知道每个涉及此 issue 的未关闭 PR 和近期提交，或者确认不存在这样的 PR 与提交。

### 3. Validate the premise against current code — and against design intent

在当前的默认分支上，使用 `search_files` 和 `read_file` 追踪上报路径，用失败的测试或 fixture 复现 bug 或演示缺失的行为。然后检查第二个问题："bug"是否其实是刻意的设计？对 issue 想要修改的代码运行 `git log -p -S "<symbol>"`，阅读最初那次提交的意图 —— 缺失的链接或限制往往正是该功能。给过时或有缺陷的 issue 措辞时应提出质疑，而不是盲目实现。完成标志：根因或功能缺口已在当前代码中得到演示，并且该变更不会违背刻意设计。

### 4. Define acceptance and risk

列出验收标准、接口、迁移/状态变更、兼容性、安全/隐私、发布和回滚。将每条验收标准映射到一个测试或明确的验证。完成标志：评审有一个有限的契约。

### 5. Implement the smallest complete change — and fix the class

在隔离分支或 worktree 上工作，当 bug 类别需要时加载 `systematic-debugging` 或 `test-driven-development`。先添加回归测试，再实现。当修复已就位时，用 `search_files` 在同一 bug 形态的兄弟调用点再检查一遍，并在同一个 PR 中修复整个类别 —— 留下已知兄弟问题仍然损坏的不完整修复比不修更糟。每一行变更都必须能追溯到该 issue；不要顺手做无关清理。完成标志：针对性测试通过，原始失败不再复现，兄弟调用点已修复或已明确排除。

### 6. Prove the regression test bites (sabotage run)

临时恢复被测确切函数的旧行为，运行新测试，并确认它失败；然后恢复修复并确认它通过。一个无论有没有修复都会通过的回归测试什么都证明不了。完成标志：该测试在修复前代码上明显失败。

### 7. Run repository quality gates, then open the PR immediately

对受影响区域运行格式化、lint、类型检查和仓库的规范测试入口；对 diff 使用 `requesting-code-review`。推Push后立即打开 PR —— PR 才是触发 CI 的东西，而 CI 延迟才是关键路径；不要在手握已完成的工作上停滞。加载 `github-pr-workflow` 以了解 PR 机制：符合约定的分支/提交、正文链接 issue 并包含问题、方案、测试、风险和排除项。把 PR 读取回来，验证 head SHA、base、标题和文件。完成标志：带有预期 diff 的 PR 已存在且 CI 正在运行。

### 8. Shepherd CI honestly and close the loop

通过 `gh pr checks` / `gh run view --log-failed` 检查实时状态和失败日志。区分为你的 diff 引入的失败与预先存在的基线或基础设施失败 —— 不确定时在默认分支上复现，并且只对真正的基础设施偶發执行一次重跑。没有与所述状态相匹配的实时证据，绝不说"绿色"、"已合并"或"已发布"。当 PR 合并后，在 issue 中留下 PR 链接和一行说明作为评论，让报告者得到可追踪的解决。完成标志：CI 状态、剩余阻塞项和 issue 讨论串都符合事实。

## Pitfalls

- 还没读 issue 评论、排查重复 PR 或阅读当前代码就开始写代码。
- 将原始提交表明属故意设计的行为"修复"掉。
- 只修一个调用点的症状，而兄弟调用点仍保留同一 bug。
- 交付一个不含有修复也能通过的回归测试。
- 在测试没跑或存在无关格式化噪声的情况下打开 PR。
- 因为存在 PR 就宣称 issue 已完成交付。

## Verification

- [ ] 已读完整 issue 讨论串；计划体现了最新评论状态。
- [ ] 已用 issue 编号 + 2 个关键词变体执行重复 PR 排查。
- [ ] 前提已在当前代码上复现；设计意图已从 git 历史中核查。
- [ ] 回归测试已被证明在没有修复时会失败。
- [ ] 兄弟调用点已修复或已明确排除。
- [ ] 每一行变更都能追溯到该 issue。
- [ ] CI 状态只从确凿的实时证据中报告；已在 issue 中用 PR 链接留言。
