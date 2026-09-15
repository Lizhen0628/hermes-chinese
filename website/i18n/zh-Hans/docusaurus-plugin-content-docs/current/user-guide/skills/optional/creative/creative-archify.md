---
title: "Archify — 经验证的可交互 HTML 图表，上游维护"
sidebar_label: "Archify"
description: "经验证的可交互 HTML 图表，上游维护"
---

{/* 本页面由 website/scripts/generate-skill-docs.py 根据技能的 SKILL.md 自动生成。请编辑源文件 SKILL.md，而非此页面。 */}

# Archify

经验证的可交互 HTML 图表，上游维护。

## 技能元数据

| | |
|---|---|
| 来源 | 可选 — 使用 `hermes skills install official/creative/archify` 安装 |
| 路径 | `optional-skills/creative/archify` |
| 版本 | `2.17.0` |
| 作者 | tt-a1i |
| 许可证 | MIT |
| 平台 | linux, macos, windows |
| 标签 | `diagram`, `architecture`, `workflow`, `sequence`, `dataflow`, `state-machine`, `mermaid`, `html`, `svg` |
| 相关技能 | [`architecture-diagram`](/docs/user-guide/skills/bundled/creative/creative-architecture-diagram), [`excalidraw`](/docs/user-guide/skills/optional/creative/creative-excalidraw), [`concept-diagrams`](/docs/user-guide/skills/optional/creative/creative-concept-diagrams) |

## 参考：完整的 SKILL.md

:::info
以下是 Hermes 在此技能被触发时加载的完整技能定义。这就是技能激活时智能体所看到的指令内容。
:::

# Archify（上游维护）

> **Catalog 占位条目。** 本条目在上游 [tt-a1i/archify](https://github.com/tt-a1i/archify) 维护：该项目提供一个自包含的技能目录（`archify/`），其中包含 Node CLI、schema、渲染器、示例和参考资料。`hermes skills install official/creative/archify` 会直接从该仓库实时拉取当前目录树（与任何 hub 安装一样经过隔离和扫描）——此目录仅保存 catalog 元数据，因此内置副本永远不会过时。

Archify 可将一份小型的带类型 JSON 规范转换为一个自包含、可探索的 HTML 图表：支持 `architecture`、`workflow`、`sequence`、`dataflow` 和 `lifecycle`（状态机）类型，深色/浅色主题，平移/缩放，搜索，关系追踪，可选的轨迹动画，以及 PNG/JPEG/WebP/SVG/WebM 导出。它接受自然语言需求或粘贴的 Mermaid（`flowchart`、`sequenceDiagram`、`stateDiagram`），当图表必须反映真实代码时，还能读取仓库证据。每一个候选结果都经过 9 项检查的 `validate` / `deliver` 回执，因此输出是可验证的，而非凭肉眼判断。

## 前置条件

- `PATH` 上有 Node.js 18+（`node bin/archify.mjs doctor` 可确认安装；技能包内无需 `npm install`）。
- 安装会从 GitHub 拉取约 200 个文件（约 8 MB，主要是上游测试和示例）；拉取被固定到某一目录树 SHA，并记录在 bundle 元数据中。
- 上游的“更新感知”步骤会运行 `scripts/check-update.mjs`，它从 GitHub 读取发布清单，仅打印通知——它从不下载或安装任何内容。如果不希望有对外调用，可跳过它。

安装后，内置的 `architecture-diagram` 技能仍是零依赖的兜底方案（它移植了 archify 所衍生的同一 Cocoon AI 血统）；当用户需要经验证的回执、Mermaid 转换、sequence/lifecycle 类型，或超出单个 HTML 文件的导出时，优先使用 archify。

完整文档：https://github.com/tt-a1i/archify#readme
