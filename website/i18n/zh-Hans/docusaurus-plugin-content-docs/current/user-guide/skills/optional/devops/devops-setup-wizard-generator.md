---
title: "Setup Wizard 生成器 — 生成一个 bash 向导，引导用户完成手动设置"
sidebar_label: "Setup Wizard 生成器"
description: "生成一个 bash 向导，引导用户完成手动设置"
---

{/* 此页面由 website/scripts/generate-skill-docs.py 从技能的 SKILL.md 自动生成。请编辑源 SKILL.md，而非此页面。 */}

# Setup Wizard 生成器

生成一个 bash 向导，引导用户完成手动设置。

## 技能元数据

| | |
|---|---|
| Source | 可选 — 使用 `hermes skills install official/devops/setup-wizard-generator` 安装 |
| Path | `optional-skills/devops\setup-wizard-generator` |
| Version | `1.0.0` |
| Author | Matt Pocock (mattpocock/skills, wizard) + Hermes Agent |
| License | MIT |
| Platforms | linux, macos |
| Tags | `wizard`、`setup`、`onboarding`、`credentials`、`secrets`、`migration`、`bash`、`human-in-the-loop` |

## 参考：完整 SKILL.md

:::info
以下是 Hermes 在触发此技能时加载的完整技能定义。这就是技能激活时智能体所看到的指令。
:::

# Setup Wizard 生成器

生成一个交互式 bash **向导**：一个脚本，逐步骤引导用户完成一个手动程序——这种程序手动操作繁琐，每次重新解释也很繁琐。它会打开每个 URL，明确说明点击什么、复制什么，捕获这些值，将它们写入应在之处（`.env`、GitHub secrets），在每个阶段进行确认，并显示还剩多少阶段。

移植自 mattpocock/skills 的 MIT 许可 `wizard` 技能。

## 何时使用

- 开通基础设施或第三方服务（Stripe、Supabase、DNS、OAuth 应用），其中只有人类才能通过仪表板点击完成
- 设置凭据、CI secrets 或仓库变量
- 带有不可逆人工把关步骤的一次性迁移或切换
- 用户将交给队友运行的任何程序

不要用于智能体自己能执行的步骤——直接执行那些即可。

## 前置条件

- `bash`；仅当阶段会写入 GitHub secrets/variables 时才需要 `gh` CLI
- 库模板：本技能目录中的 `templates/template.sh`

## 流程

### 1. 界定程序范围

梳理出人类必须采取的每一个手动步骤，以及沿途捕获的每一个值。先阅读仓库，不要冷启动就提问：

- 设置：`.env`、`.env.example`、`README`、`docker-compose*`、框架配置，以及 `.github/workflows/*`（每个 `secrets.*` / `vars.*` 引用都是向导必须产出的一个值）。
- 迁移/切换：当前状态、目标状态，以及两者之间不可逆的操作。

向用户展示有序的阶段列表以及每个阶段产出的值；他们可能会增加、删除或重新排序。当每个阶段都按顺序命名，并且对于每个捕获的值，你都知道 (a) 人类从哪里获取它、(b) 它写到哪里（`.env`、GitHub secret、两者皆是，或不写）以及 (c) 它是保密的（隐藏输入）还是公开的时，即算完成。

### 2. 绘制每个阶段的路径

对于每个阶段，写出人类遵循的精确路径：打开哪个 URL、在那里做什么、值显示在哪里——例如“Dashboard → Developers → API keys → Reveal test key → 复制”。如果你不知道当前的 UI 或确切命令，请如实说明并查阅文档或提问——绝不要凭空编造可能不存在的步骤。

### 3. 编写向导

将 `templates/template.sh`（来自本技能目录）复制到目标路径。将示例阶段替换为每个步骤一个 `stage`，按依赖顺序排列。将 `TOTAL_STAGES` 设置为你所写的阶段数量。

库辅助函数：`stage`、`say`/`step`/`note`/`warn`、`open_url`、`ask`/`ask_secret`、`write_env`、`set_secret`/`set_var`、`pause`/`confirm`、`banner`、`finish`。`STAGES` 标记以上的库在每个向导中都完全相同——绝不要手动编辑它；这种一致性正是关键所在。

坚守模板设定的标准：在询问某个值之前先打开其 URL，任何保密内容都使用 `ask_secret`，每个需要持久化的值都使用 `write_env`，仅对 CI 实际需要的内容使用 `set_secret`，任何不可逆操作之前都使用 `confirm`。每个 `stage` 都会清屏——每个阶段保持一项聚焦任务，这样人类需要的内容就不会滚出屏幕。

向导默认是临时的：将其保存到临时目录或 `scripts/` 路径，任务完成后就删除它。只有当用户希望在仓库中保留可重复的设置路径时，才提交它。

### 4. 验证并移交

- `bash -n <script>`；如可用则运行 `shellcheck`；`chmod +x <script>`。
- 不要自己端到端运行它：它会打开浏览器并阻塞于用户输入。以静态方式追踪它：第 1 步中的每个值都被捕获并落到第 1 步所述之处，并且每个 `set_secret` 名称都与 CI 中的 `secrets.*` 引用完全匹配。
- 告诉用户如何运行它。如果它是可重复的，提交它并在 README 中链接它。

## 陷阱

1. **编辑库部分。** `STAGES` 标记以上的所有内容都是向导库；仅在其下方编写内容。
2. **凭空编造仪表板路径。** 第三方 UI 会变化。如果不确定点击路径，请对照当前文档验证或将其标记为近似。
3. **为 CI 不使用的值使用 `set_secret`。** 只将由工作流实际引用的内容推送到 GitHub secrets。
4. **自己运行向导。** 它会阻塞于用户输入；静态追踪加 `bash -n` 就是验证方式。
5. **一个巨型阶段。** 每个阶段清屏意味着过长的阶段会把关键指令滚出屏幕；请拆分它。

## 验证

- [ ] 在编写前已与用户确认阶段列表
- [ ] `bash -n` 通过；脚本可执行
- [ ] 每个捕获的值都追踪到其声明的目的地
- [ ] 每个 `set_secret` 名称都与某个 CI `secrets.*` 引用匹配
- [ ] 库部分与模板保持一致，未作改动
