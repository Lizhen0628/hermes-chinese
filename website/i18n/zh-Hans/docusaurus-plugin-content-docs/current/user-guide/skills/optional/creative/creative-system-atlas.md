---
title: "System Atlas — 将可探索的等距架构图集构建为 HTML"
sidebar_label: "System Atlas"
description: "将可探索的等距架构图集构建为 HTML"
---

{/* 本页由 website/scripts/generate-skill-docs.py 根据技能的 SKILL.md 自动生成。请编辑源 SKILL.md，而非本页。 */}

# System Atlas

将可探索的等距架构图集构建为 HTML。

## 技能元数据

| | |
|---|---|
| 来源 | 可选 — 使用 `hermes skills install official/creative/system-atlas` 安装 |
| 路径 | `optional-skills/creative/system-atlas` |
| 版本 | `1.0.0` |
| 作者 | Harshyt Goel（由 Nous Research 改编） |
| 许可证 | MIT |
| 平台 | linux, macos |
| 标签 | `architecture`, `diagrams`, `isometric`, `documentation` |
| 相关技能 | [`architecture-diagram`](/docs/user-guide/skills/bundled/creative/creative-architecture-diagram)、[`excalidraw`](/docs/user-guide/skills/optional/creative/creative-excalidraw) |

## 参考：完整的 SKILL.md

:::info
以下是 Hermes 在此技能被触发时加载的完整技能定义。这就是技能激活时智能体看到的指令内容。
:::

# System Atlas 技能

图集就是一个数据文件（`data.mjs`），它渲染两个视图：一个**交互式等距地图**（一个自包含的 `atlas.html` — 悬停即可阅读，点击即可固定，进入内部查看步骤，有可检查的移动数据包，以及一次揭示少量结构逐步呈现系统的章节），还有一个**生成的文本孪生**（`SYSTEM.md`），包含决策表、每个结构、流程，以及按 ID 组织的开放问题。数据文件是唯一需要任何人编辑的东西；两个视图都由它重新构建。它与手写的术语表（`CONTEXT.md`）和 ADR 放在一起。

**做：**带渐进披露的交互式架构地图、跨反馈轮次的问题跟踪、生成的文本孪生，以及可重复的更新循环。
**不做：**静态的一次性图表（改用 architecture-diagram 或 excalidraw 技能）、只需要 README 的已完工系统，或用于 PR 的单一图表。

## 何时使用

当有人想要可视化地讨论、设计、审查或解释某个架构时使用 —「做一个图集」、「描绘这个系统」、「让架构变得可探索」、「把代码库/智能体/流水线可视化以便我们讨论它」、「一个可以点来点去的图表」、「带我过一遍它是如何拼合在一起的」— 或者当一个架构讨论正在产生一堆需要在多轮反馈中跟踪的开放问题时。做出决策改变后要更新现有图集时也使用它。当系统足够新、词汇、决策和问题仍在变动且会有不止一轮反馈时，效果最佳。

## 前置条件

- Node.js（任何较新版本；构建仅使用 `node:fs`、`node:path`、`node:url` — 无需 npm install）。
- 一个用于验证的静态服务器（`npx serve` 或 `python3 -m http.server`）。

## 如何运行

```bash
mkdir -p <atlas home>/atlas
cp <skill>/assets/{template.html,build.mjs} <atlas home>/atlas/
cp <skill>/assets/data.example.mjs <atlas home>/atlas/data.mjs   # 然后填写它
node <atlas home>/atlas/build.mjs   # 写入 ../SYSTEM.md 和 ../atlas.html
```

数据文件的每个字段都在 `assets/data.example.mjs` 中有文档说明。

## 快速参考

| 文件 | 作用 | 要编辑它吗？ |
|---|---|---|
| `atlas/data.mjs` | 单一事实来源：结构、流程、章节、决策、问题、散文 | 是 |
| `atlas/template.html` + `atlas/build.mjs` | 渲染器 + 生成器 | 仅表现层 |
| `atlas.html` | 构建出的图集；每次重新构建后在同一 URL 重新发布 | 否（生成的） |
| `SYSTEM.md` | 构建出的文本孪生 | 否（生成的） |
| `CONTEXT.md` | 术语表，每个名词一行 | 手动 |
| `adr/` | 难以逆转的决策 | 手动 |
| `research/` | 深入调研的证据 | 只追加 |

## 步骤

按顺序执行 — 每一步在第一次时都因某次纠正而被确定下来。

1. **绘图前先阅读输入。**愿景文档、仓库现有界面，以及用户允许的任何先前工作（询问 — 他们可能禁止某个分支或某个来源）。如果你要基于某个框架构建，先阅读其文档；把长文档交给子智能体，通过 `delegate_task` 并附上你具体的设计问题，让它返回一份包含陷阱和「它没有提供给我们什么」清单的入门指南。在这之前绘图会产生与现实无关的方框。
2. **绘图前先讨论。**在聊天中提出结构，映射到运行时的真实原语，只问那些你无法从仓库中推导出的问题。其余采用默认值，并说明你采用了哪些。
3. **第一个图集 — 整个系统。**将 `assets/` 复制到图集主目录（把 `data.example.mjs` 重命名为 `data.mjs`），填写数据，用 `node` 构建，发布。**图集主目录在哪里取决于仓库的文档政策** — 在提交任何内容之前先问。对文档友好的仓库：树内 `docs/<system>/atlas/`。只提交 ADR 和 `CONTEXT.md` 的仓库：把图集、`SYSTEM.md` 和 `research/` 放在一个被 git 忽略的临时目录中，发布时把 `SYSTEM.md` + 调研附加到 spec issue 上。（一次性提交整套内容产生了一个 3,900 行的文档 PR 和四轮审查来调和同一设计的三种重述。）如有帮助，通过 skill_view 加载 design-md 或 architecture-diagram 技能以获取 HTML 产物的指导；无论哪种方式都阅读 `references/design-language.md` 了解视觉规则。
4. **渐进披露。**一次性展示整个系统读起来就是一锅粥。大约十章；每章最多添加三个结构，并运行一个只触及已揭示结构的小流程；最后一章用流程选择器展示全部内容。未揭示的结构保留在索引中，暗淡显示，并带有其章节编号。面板是摘要优先：一句话，然后折叠（*Read more*）和（*Steps*）。
5. **形状和标签。**方框上的字母不够。为每个角色赋予一个形状，并在画布上每个结构下方放置一个可读的名称标签 — 参见 design-language。
6. **文本孪生。**`CONTEXT.md` 是术语表，仅此而已（名词，每行一个）；ADR 仅用于那些难以逆转、脱离上下文令人惊讶，并且是真实取舍结果的决策 — 这两者是树内的部分。`SYSTEM.md` 是生成的，`research/` 保存证据；两者都与图集放在一起（按步骤 3，在临时目录或 `docs/` 中）。除非被要求，否则不要开 issue。
7. **按问题 ID 反馈。**每个问题都是 `Q-<code><n>`，带有一个状态：open（一个字符串）、resolved `{q, r}`（答案 + 日期）或 routed `{q, to}`（移交给指定的下一步）。记录用户的原话。如果他们说某个东西「不是问题」，就删除它；如果他们说「我不理解这个」，先用具体例子解释，*然后*才解决。每轮之后：重新构建、重新发布、更新记忆。
8. **深入调研反馈回来。**用子智能体（`delegate_task`）针对一份共享简报做调研（我们拥有的接口、区分候选者的需求、成本的使用模型、固定的交付物形状）。撰写一份带标准化成本/匹配网格的综合报告。将解决结果作为 `{q, r: '…（来自深入调研，日期）'}` 折入数据中。如果用户拒绝某个提案，全面梳理*每一个*文件并重写 — 在一个过时的部分顶部加个横幅是不够的。
9. **保持最新。**单一来源，每次改动后重新构建并重新发布，绝不用手编辑生成的文件，并在 docs 文件夹中留下一个 `README.md` 解释整套内容（表格在 `references/process-and-lessons.md` 中）。

## 发布

`atlas.html` 是一个自包含文件 — 除了一份 Google Fonts 样式表外，没有构建步骤，没有外部资源。用任何静态服务器提供该文件夹（`npx serve`、`python3 -m http.server`）并交出 URL，或者让仓库的 pages 托管服务已提交的文件。一个 URL，每次数据改动后重新发布，绝不出现第二份副本。如果你保留一个稳定的发布 URL，将其放入 `META.artifactUrl`，以便 `SYSTEM.md` 链接到它。

## 陷阱

- 将 `<!doctype html>` 保留在最前面，并让 `<meta charset="utf-8">` 紧随其后 — 否则会出现怪异模式和乱码箭头。
- 渲染器在每次绘制时重建其整个场景：在悬停处理器中一个多余的 `render()` 会分离光标下的元素，浏览器会停止合成点击事件 — 地图在截图中看起来完美无缺，但什么都不响应。
- 某些应用内浏览器将 `file://` 渲染为静态快照；通过静态服务器验证，而不是从磁盘打开。
- 绝不删除问题 — 解决它或将其标记为丢弃，以保持 ID 稳定。
- 每次决策后，在输出中 grep 过时的词（`pending`、旧模型名称、被拒绝的设计）— 这个人会读到所有内容。
- 通过 shell heredoc 处理大型 HTML/JS 很脆弱；使用 `write_file`，并保持数据块可 JSON 序列化。

## 验证

- `node <atlas home>/atlas/build.mjs` 以 0 退出，并写出 `SYSTEM.md` 和 `atlas.html`。
- 对构建出的脚本做语法检查（`new Function(js)`），然后在真实浏览器中以约 1280×800 打开所服务的页面；检查第一章、中间章节、最后一章、一个内部视图和浅色主题。
- 单击一个结构，确认面板显示 **pinned** 并提供 *Go inside*；单击一个数据包圆点，确认有效载荷打开。
- 每个结构都拥有 `one`、`what`、`how`、一个 `short` 标签、一个角色 `kind`，以及它的问题；幽灵被标记；章节存在并带有每章流程；最后一章是整个系统。
- `SYSTEM.md` 带有决策表、带 ID 和状态的问题索引，以及「此文件如何维护」的页脚。
- 项目记忆记录图集 URL、docs 路径、带日期的已锁定决策、用户拒绝的内容及原因，以及下一步。
