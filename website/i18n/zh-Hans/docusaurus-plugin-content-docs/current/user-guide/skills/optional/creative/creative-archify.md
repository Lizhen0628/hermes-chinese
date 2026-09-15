---
title: "Archify — 经过验证的交互式 HTML 图表，由上游维护"
sidebar_label: "Archify"
description: "经过验证的交互式 HTML 图表，由上游维护"
---

{/* This page is auto-generated from the skill's SKILL.md by website/scripts/generate-skill-docs.py. Edit the source SKILL.md, not this page. */}

# Archify

经过验证的交互式 HTML 图表，由上游维护。

## 技能元数据

| | |
|---|---|
| 来源 | 可选 — 使用 `hermes skills install official/creative/archify` 安装 |
| 路径 | `optional-skills/creative/archify` |
| 版本 | `2.17.0` |
| 作者 | tt-a1i |
| 许可证 | MIT |
| 平台 | linux, macos, windows |
| 标签 | `diagram`、`architecture`、`workflow`、`sequence`、`dataflow`、`state-machine`、`mermaid`、`html`、`svg` |
| 相关技能 | [`architecture-diagram`](/docs/user-guide/skills/bundled/creative/creative-architecture-diagram)、[`excalidraw`](/docs/user-guide/skills/optional/creative/creative-excalidraw)、[`concept-diagrams`](/docs/user-guide/skills/optional/creative/creative-concept-diagrams) |

## 参考：完整的 SKILL.md

:::info
以下是 Hermes 在触发此技能时加载的完整技能定义。这就是技能激活时智能体看到的指令内容。
:::

# Archify（上游维护）

> **目录存根。** 此条目在上游 [tt-a1i/archify](https://github.com/tt-a1i/archify) 维护：该项目发布了一个自包含的技能目录（`archify/`），其中包含 Node CLI、schema、渲染器、示例和参考文档。`hermes skills install official/creative/archify` 会从该仓库实时拉取当前目录树（与其他 hub 安装一样经过隔离和扫描）——此目录仅保存目录元数据，因此内置副本永远不会过时。

Archify 可将一个小型带类型的 JSON 规范转换为自包含、可探索的 HTML 图表：支持 `architecture`、`workflow`、`sequence`、`dataflow` 和 `lifecycle`（状态机）类型，深色/浅色主题，平移/缩放，搜索，关系追踪，可选的追踪动画，以及 PNG/JPEG/WebP/SVG/WebM 导出。它接受自然语言的需求描述或粘贴的 Mermaid（`flowchart`、`sequenceDiagram`、`stateDiagram`），并且当图表必须反映真实代码时可以读取仓库证据。每个候选项都要通过 9 项检查的 `validate` / `deliver` 回执，因此输出是可验证的，而非仅凭目测。

## 前置条件

- `PATH` 上有 Node.js 18+（`node bin/archify.mjs doctor` 可确认安装；技能的包内无需 `npm install`）。
- 安装会从 GitHub 拉取约 200 个文件（约 8 MB，主要是上游测试和示例）；拉取被固定到单一目录树 SHA，记录在包元数据中。
- 上游的“更新感知”步骤会运行 `scripts/check-update.mjs`，它从 GitHub 读取发布清单并只打印一条通知——它从不下载或安装任何内容。如果不希望进行出站调用，可以跳过此步骤。

安装后，内置的 `architecture-diagram` 技能仍作为零依赖回退方案（它移植了 archify 所源自的同一 Cocoon AI 血统）；当用户需要经过验证的回执、Mermaid 转换、sequence/lifecycle 类型，或需导出为单一 HTML 文件之外的格式时，应优先使用 archify。

完整文档：https://github.com/tt-a1i/archify#readme
