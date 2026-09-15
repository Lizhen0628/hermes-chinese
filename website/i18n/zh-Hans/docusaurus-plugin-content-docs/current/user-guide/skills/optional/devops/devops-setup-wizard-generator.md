---
title: "安装向导生成器 — 生成 bash 向导，引导用户完成手动设置"
sidebar_label: "安装向导生成器"
description: "生成 bash 向导，引导用户完成手动设置"
---

{/* 本页面由 website/scripts/generate-skill-docs.py 基于技能自身的 SKILL.md 自动生成。请编辑源文件 SKILL.md，而非本页面。 */}

# 安装向导生成器

生成 bash 向导，引导用户完成手动设置。

## 技能元数据

| | |
|---|---|
| Source | 可选 — 使用 `hermes skills install official/devops/setup-wizard-generator` 安装 |
| Path | `optional-skills/devops\setup-wizard-generator` |
| Version | `1.0.0` |
| Author | Matt Pocock (mattpocock/skills, wizard) + Hermes Agent |
| License | MIT |
| Platforms | linux, macos |
| Tags | `wizard`, `setup`, `onboarding`, `credentials`, `secrets`, `migration`, `bash`, `human-in-the-loop` |

## 参考：完整 SKILL.md

:::info
以下是 Hermes 在此技能被触发时加载的完整技能定义。这便是智能体在技能激活时看到的指令内容。
:::

# 安装向导生成器

生成一个交互式 bash **向导**：一段脚本，逐步引导用户完成一套手动流程——这种流程手工操作很繁琐，每次重新讲解也同样繁琐。它会打开每个 URL，明确说明该点击和复制什么，捕获各个值，把它们写入应在的位置（`.env`、GitHub secrets），在每个阶段进行确认，并显示还剩多少阶段。

移植自 mattpocock/skills 中 MIT 许可的 `wizard` 技能。

## 何时使用

- 准备基础设施或第三方服务（Stripe、Supabase、DNS、OAuth 应用），且只有用户才能通过控制台点击完成
- 设置凭据、CI secrets 或仓库变量
- 带有不可逆、需人工把关步骤的一次性迁移或切换
- 用户要交给队友运行的各种流程

请勿用于智能体自身可以完成的步骤——那些直接做即可。

## 前置条件

- `bash`；仅当阶段要写入 GitHub secrets/变量时才需要 `gh` CLI
- 库模板：本技能目录下的 `templates/template.sh`

## 操作步骤

### 1. 界定流程范围

梳理出用户必须采取的每一个手动步骤，以及沿途捕获的每一个值。先阅读仓库，不要凭空发问：

- 安装配置：`.env`、`.env.example`、`README`、`docker-compose*`、框架配置，以及 `.github/workflows/*`（每一处 `secrets.*` / `vars.*` 引用都是向导必须产出的值）。
- 迁移/切换：当前状态、目标状态，以及两者之间的不可逆操作。

向用户展示有序的阶段列表，以及每个阶段产出的值；他们可能会增删或重排。完成标准是：每个阶段都按顺序命名，且对于每个捕获的值，你都知道 (a) 用户从何处获取，(b) 它写入何处（`.env`、GitHub secret、两者皆有，还是仅捕获不写入），以及 (c) 它是私密（隐藏输入）还是公开。

### 2. 梳理每个阶段的路径

对于每个阶段，写出用户遵循的精确路径：打开哪个 URL，在那里做什么，值显示在哪里——例如“控制台 → Developers → API keys → Reveal test key → 复制”。在不了解当前 UI 或确切命令时，说明这一点并查阅文档或询问——绝不要编造可能不存在的步骤。

### 3. 编写向导

将 `templates/template.sh`（来自本技能目录）复制到目标路径。用每个步骤一个 `stage` 替换示例阶段，按依赖顺序排列。把 `TOTAL_STAGES` 设为你编写的阶段数。

库辅助函数：`stage`、`say`/`step`/`note`/`warn`、`open_url`、`ask`/`ask_secret`、`write_env`、`set_secret`/`set_var`、`pause`/`confirm`、`banner`、`finish`。位于 `STAGES` 标记之上的库在每个向导中都完全相同——切勿手动编辑；这种一致性正是关键所在。

坚持模板设定的标准：在询问其值之前先打开 URL，任何保密内容都用 `ask_secret`，每个要持久化的值都用 `write_env` 写入，仅供 CI 实际需要的才用 `set_secret`，任何不可逆操作前都要 `confirm`。每个 `stage` 都会清屏——每阶段保持一个聚焦任务，这样用户需要的内容就不会滚动消失。

向导默认是临时的：把它保存到临时目录或 `scripts/` 路径下，任務完成即删除。仅当用户希望让一套可重复的设置路径留存于仓库之中时，才提交它。

### 4. 校验并交付

- `bash -n <script>`；如可用则运行 `shellcheck`；`chmod +x <script>`。
- 不要自己端到端运行它：它会打开浏览器并阻塞等待用户输入。改为静态追踪：步骤 1 中的每个值都被捕获，并落在步骤 1 所指明的位置，且每个 `set_secret` 名称都精确匹配 CI 中的一处 `secrets.*` 引用。
- 告诉用户如何运行它。如果它是可重复的，就提交它，并在 README 中链接。

## 常见陷阱

1. **编辑库区段。** `STAGES` 标记之上的所有内容都是向导库；只在它之下编写。
2. **编造控制台路径。** 第三方 UI 时常变化。若不确定点击路径，请对照最新文档核实，或将其标记为近似。
3. **为 CI 用不到的值使用 `set_secret`。** 只推送工作流实际引用的内容到 GitHub secrets。
4. **自己运行向导。** 它会阻塞等待用户输入；静态追踪加 `bash -n` 才是校验手段。
5. **单一巨型阶段。** 每阶段清屏意味着过长的阶段会把关键说明滚走；应拆分它。

## 校验

- [ ] 编写前已与用户确认阶段列表
- [ ] `bash -n` 通过；脚本可执行
- [ ] 每个捕获的值都已追踪到其声明的位置
- [ ] 每个 `set_secret` 名称都匹配一处 CI `secrets.*` 引用
- [ ] 库区段与模板保持原样未改
