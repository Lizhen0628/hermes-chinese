---
title: "System Atlas — 以 HTML 构建可探索的等距架构图集"
sidebar_label: "System Atlas"
description: "以 HTML 构建可探索的等距架构图集"
---

{/* 本页由 website/scripts/generate-skill-docs.py 根据该技能的 SKILL.md 自动生成。请编辑源 SKILL.md，而不是本页。 */}

# System Atlas

以 HTML 构建可探索的等距架构图集。

## 技能元数据

| | |
|---|---|
| Source | 可选 — 使用 `hermes skills install official/creative/system-atlas` 安装 |
| Path | `optional-skills/creative/system-atlas` |
| Version | `1.0.0` |
| Author | Harshyt Goel（由 Nous Research 改编） |
| License | MIT |
| Platforms | linux, macos |
| Tags | `architecture`, `diagrams`, `isometric`, `documentation` |
| Related skills | [`architecture-diagram`](/docs/user-guide/skills/bundled/creative/creative-architecture-diagram), [`excalidraw`](/docs/user-guide/skills/optional/creative/creative-excalidraw) |

## 参考：完整的 SKILL.md

:::info
以下是 Hermes 在触发该技能时加载的完整技能定义。这就是技能激活时智能体所看到的指令。
:::

# System Atlas 技能

一个图集就是一个数据文件（`data.mjs`），它渲染两种视图：一个**交互式等距地图**（一个自包含的 `atlas.html` —— 悬停可阅读，点击可钉住，进入内部查看步骤，可检查的移动数据包，以及逐批揭示系统结构的章节），以及一个**生成的文本镜像**（`SYSTEM.md`），其中包含决策表、每个结构、流程以及按 ID 排列的待解决问题。数据文件是唯一需要任何人编辑的内容；两种视图都由它重新构建。它放在手写的术语表（`CONTEXT.md`）和 ADR 旁边。

**能做：** 具备渐进式披露的交互式架构图、跨反馈轮次的问题跟踪、生成的文本镜像，以及可重复的更新循环。
**不能做：** 静态的一次性图表（使用 architecture-diagram 或 excalidraw 技能）、只需一份 README 的已完成系统，或针对 PR 的单张图表。

## 何时使用

当有人想以可视化方式讨论、设计、评审或解释架构时使用——"做一个图集"、"为系统绘制地图"、"让架构可探索"、"将代码库/智能体/流水线可视化，以便我们讨论它"、"一个我可以点来点去的图表"、"带我了解一下它是如何组合在一起的"——或者当架构讨论产生了一堆需要跨反馈轮次跟踪的待解决问题时。也可在决策变更后用于更新现有图集。当系统足够新、词汇、决策和问题仍在变动，且会有不止一轮反馈时，效果最佳。

## 前提条件

- Node.js（任意近期版本；构建仅使用 `node:fs`、`node:path`、`node:url` —— 无需 npm install）。
- 用于验证的静态服务器（`npx serve` 或 `python3 -m http.server`）。

## 如何运行

```bash
mkdir -p <atlas home>/atlas
cp <skill>/assets/{template.html,build.mjs} <atlas home>/atlas/
cp <skill>/assets/data.example.mjs <atlas home>/atlas/data.mjs   # 然后填写它
node <atlas home>/atlas/build.mjs   # 写入 ../SYSTEM.md 和 ../atlas.html
```

数据文件的每个字段都在 `assets/data.example.mjs` 中有文档说明。

## 快速参考

| 文件 | 作用 | 是否编辑？ |
|---|---|---|
| `atlas/data.mjs` | 单一事实来源：结构、流程、章节、决策、问题、散文 | 是 |
| `atlas/template.html` + `atlas/build.mjs` | 渲染器 + 生成器 | 仅表现层 |
| `atlas.html` | 构建出的图集；每次重新构建后在同一 URL 重新发布 | 否（生成） |
| `SYSTEM.md` | 构建出的文本镜像 | 否（生成） |
| `CONTEXT.md` | 术语表，每个名词一行 | 手动 |
| `adr/` | 难以逆转的决策 | 手动 |
| `research/` | 深入调研的证据 | 仅追加 |

## 流程

遵循此顺序——每一步都是首轮中经过一次纠正才换来的。

1. **绘图前先阅读输入。** 愿景文档、仓库现有的界面，以及用户允许的任何先前资料（先询问——他们可能禁止某个分支或某个来源）。如果你要基于某个框架构建，先阅读其文档；将要交给子智能体，通过 `delegate_task`，附带你具体的设计问题，让它返回一份包含陷阱和"它没有提供什么"列表的入门材料。在此之前绘图只会产生与现实无关的方框。
2. **绘图前先讨论。** 在聊天中提出结构，映射到运行时的真实原语，只问那些你无法从仓库推导出的问题。其余采用默认值，并说明采用哪些。
3. **第一版图集——整个系统。** 将 `assets/` 复制到图集主目录（将 `data.example.mjs` 重命名为 `data.mjs`），填写数据，用 `node` 构建，发布。**图集主目录的位置取决于仓库的文档策略**——在提交任何内容前先询问。对文档友好的仓库：树内的 `docs/<system>/atlas/`。仅提交 ADR 和 `CONTEXT.md` 的仓库：将图集、`SYSTEM.md` 和 `research/` 放在 git 忽略的临时目录中，并在发布时将 `SYSTEM.md` + 调研附加到规范议题。（一次性提交整个集合产生了 3,900 行的文档 PR，以及四轮评审来调和同一个设计的三份不同表述。）如有需要，通过 skill_view 加载 design-md 或 architecture-diagram 技能以获取 HTML 工件指导；无论哪种方式，都请阅读 `references/design-language.md` 获取视觉规则。
4. **渐进式披露。** 一次性展示整个系统读起来像噪音。约十个章节；每个章节最多添加三个结构，并运行一个只涉及已揭示结构的小流程；最后一章通过流程选择器展示全部内容。未揭示的结构保留在索引中，变暗，并标注其章节号。面板以摘要为先：一句话，然后是折叠的 *Read more* 和 *Steps*。
5. **形状和标签。** 方框上的字母是不够的。为每个角色赋予一种形状，并在画布上每个结构下方放置可读的名称标签——参见 design-language。
6. **文本镜像。** `CONTEXT.md` 是一份术语表，仅此而已（名词，每个一行）；ADR 仅用于那些难以逆转、无上下文时令人意外、且是真实权衡结果 的决策——这两者是树内部件。`SYSTEM.md` 是生成的，`research/` 存放证据；两者都与图集放在一起（临时目录或 `docs/`，见第 3 步）。除非被要求，否则不要开议题。
7. **按问题 ID 收集反馈。** 每个问题都是 `Q-<code><n>`，带有一个状态：open（一个字符串）、resolved `{q, r}`（答案 + 日期）或 routed `{q, to}`（交给指定的下一步）。记录用户的原话。如果他们称某事"不是一个问题"，就删除它；如果他们说"我不明白这个"，在被解析*之前*用一个具体例子解释。每一轮之后：重建、重新发布、更新记忆。
8. **深入调研会反哺。** 用子智能体（`delegate_task`）针对一份共享简报进行调研（我们拥有的接口、区分候选方案的 要求、成本的用量模型、固定的交付物形态）。撰写一份带有归一化成本/契合度网格的综合报告。将解析结果以 `{q, r: '…(来自深入调研，日期)'}` 的形式折入数据。如果用户拒绝某个提案，扫*遍每一个*文件并重写——在过时章节顶部加一条横幅是不够的。
9. **保持更新。** 单一来源，每次变更后重建并重新发布，绝不用手编辑生成的文件，并在 docs 文件夹中留下一个 `README.md` 解释这一组文件（表见 `references/process-and-lessons.md`）。

## 发布

`atlas.html` 是一个自包含文件——无需构建步骤，除 Google Fonts 样式表外无外部资源。用任意静态服务器提供该文件夹（`npx serve`、`python3 -m http.server`）并交出 URL，或让仓库的 pages 主机提供已提交的文件。一个 URL，每次数据变更后重新发布，绝不出现第二份副本。如果你维护一个稳定的已发布 URL，请将其放入 `META.artifactUrl`，以便 `SYSTEM.md` 链接到它。

## 陷阱

- 将 `<!doctype html>` 放在最前，紧接着 `<meta charset="utf-8">`——否则会出现怪异模式和乱码箭头。
- 渲染器在每次绘制时重建其整个场景：在悬停处理器中一个多余的 `render()` 会分离光标下的元素，浏览器便停止合成点击——地图在截图中看起来完美，却毫无响应。
- 某些应用内浏览器将 `file://` 渲染为静态快照；请通过静态服务器验证，而不是从磁盘。
- 绝不删除问题——解析或将其标记为已丢弃，以便 ID 保持稳定。
- 每次决策后，在输出中 grep 过时的词（`pending`、旧模型名称、被拒绝的设计）——那个人会阅读一切。
- 通过 shell heredoc 处理大型 HTML/JS 很脆弱；使用 `write_file` 并保持数据块可 JSON 序列化。

## 验证

- `node <atlas home>/atlas/build.mjs` 以 0 退出并写入 `SYSTEM.md` 和 `atlas.html` 两者。
- 对构建出的脚本进行语法检查（`new Function(js)`），然后在真实浏览器中以约 1280×800 打开所服务的页面；检查第一个章节、中间章节、最后章节、内部视图和浅色主题。
- 点击一个结构并确认面板显示 **pinned** 并提供 *Go inside*；点击一个数据包点并确认载荷打开。
- 每个结构都有 `one`、`what`、`how`、一个 `short` 标签、一个角色 `kind` 及其问题；幽灵已标记；存在带有每章节流程的章节；最后一章是完整系统。
- `SYSTEM.md` 包含决策表、带有 ID 和状态的问题索引，以及"本文件如何维护"的页脚。
- 项目记忆记录图集 URL、docs 路径、带日期的锁定决策、用户拒绝的内容及原因，以及下一步。
