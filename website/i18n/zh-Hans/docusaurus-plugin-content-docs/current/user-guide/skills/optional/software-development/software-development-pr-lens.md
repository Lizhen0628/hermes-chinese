---
title: "Pr Lens — 将代码变更绘制为动画式架构/数据流 SVG"
sidebar_label: "Pr Lens"
description: "将代码变更绘制为动画式架构/数据流 SVG"
---

{/* 本页由 website/scripts/generate-skill-docs.py 根据该技能的 SKILL.md 自动生成。请编辑源文件 SKILL.md，而非本页。 */}

# Pr Lens

将代码变更绘制为动画式架构/数据流 SVG。

## 技能元数据

| | |
|---|---|
| 来源 | 可选 — 使用 `hermes skills install official/software-development/pr-lens` 安装 |
| 路径 | `optional-skills/software-development/pr-lens` |
| 版本 | `1.0.0` |
| 作者 | Coldtea AI（由 Nous Research 改编） |
| 许可证 | MIT |
| 平台 | linux, macos |
| 标签 | `diagrams`, `pull-requests`, `code-review`, `svg` |

## 参考：完整 SKILL.md

:::info
以下是 Hermes 在触发该技能时加载的完整技能定义。当技能处于激活状态时，这就是智能体看到的指令内容。
:::

# PR Lens 技能

PR Lens 将代码绘制为视觉丰富的动画图表：diff、架构、数据流。你要用一个 JSON 文档（泳道、节点、边、有序流程）描述 diff 或代码库，CLI 会将其渲染为动画式 SVG。这里没有发现透镜（findings lens）——PR Lens 是一个理解层，而非审查机器人。这里没有用于 bug、风险或安全说明的字段，若文档凭空编造了这样的字段，会被拒绝。

## 何时使用

- 被要求以图表形式呈现、可视化或解释某个代码变更或某个系统。
- 某个拉取请求应当附带架构图或数据流图。
- 关键词：PR Lens、diagram、architecture、data flow、visualise、pull request。

## 前提条件

- 带有 `npx` 的 Node.js（CLI 通过 `npx @coldtea/pr-lens-cli@latest` 运行，无需安装步骤）。
- `gh`（GitHub CLI）——可选，仅用于将图表附加到 PR 上。
- 可选的画布发布功能会调用第三方服务 prlens.dev（参见步骤 4b）。

## 如何运行

使用终端工具从仓库根目录运行所有命令。

1. **读取 diff。** 当要表示某个代码变更时：`git diff --find-renames <base>...<head>`。base 是合并基准（merge base），而非 base 分支的末端。若不表示 diff，则读取要可视化的代码。

2. **编写文档**到 `.pr-lens/graph.json`，遵循 `references/graph-document.md`。`references/example.graph.json` 是一个有效的参考示例，包含三条泳道、全部四种 delta 状态、一条 hero 边、一个七步流程、一个嵌套的深入展开树以及一个六步走读（walkthrough）。在编写你的第一个文档之前先读它——比读参考文档更快。

3. **验证并修复。**

   ```bash
   npx @coldtea/pr-lens-cli@latest validate .pr-lens/graph.json
   ```

   修复每一处失败并再次运行。不要渲染无效文档；不要通过删除失败所指向的元素来"绕过"失败。

4. **渲染。**

   ```bash
   npx @coldtea/pr-lens-cli@latest render .pr-lens/graph.json --theme light
   ```

   默认渲染 light 主题，除非用户要求其他主题。SVG、清单文件和 `drawn.graph.json` 都会输出到 `.pr-lens/`，CLI 会将其添加到仓库的 .gitignore 中。不要提交其中任何内容——这些文件是根据 diff 按需重建的。每个 SVG 以其视图、主题和内容哈希命名；`manifest.json` 按 lens 和 view 列出它们。

4b. **画布推送——可选，需主动选择。** 仅当用户明确要求可分享链接时。此操作会将 `.pr-lens/drawn.graph.json` 发布到第三方服务 prlens.dev：

   ```bash
   npx @coldtea/pr-lens-cli@latest canvas push
   ```

   它会打印三个链接。将**查看链接**（`https://prlens.dev/c/{id}`）提供给用户：该链接展示全屏图表，一页呈现所有视图，无需登录。**编辑链接**（以 `#w=…` 结尾）允许其持有者覆盖画布——它是机密：除非被要求，否则不要在回复中给出，切勿将其粘贴到任何公开场合。嵌入链接将顶部视图作为 SVG 供 README 使用。再次推送同一文件会更新同一画布，因此"重命名那个节点"的流程是：编辑、验证、渲染、推送——链接保持不变。若推送失败，请如实说明，并告知用户本地 SVG 的位置以及哪个是顶部视图。

5. **在存在 PR 时附加到 PR 上。** 官方文档记载了 `gh pr create/edit/comment --attach <path>`，但 `--attach` 在 GitHub CLI 2.99 才引入——先检查 `gh --version`（例如 gh 2.97 并没有它）。若 gh ≥ 2.99：用 Markdown 图片编写正文 `![alt](https://github.com/NousResearch/hermes-agent/blob/main/optional-skills/software-development/pr-lens/.pr-lens/<view>.svg)`（HTML `<img>` 会按原样保留，文件则附加在底部；alt 文本是给无法显示图片的读者看的一行式说明），然后为每个被引用的图表重复 `--attach <path>`：

   ```bash
   gh pr create --title "…" --body-file .pr-lens/body.md --attach .pr-lens/overview-light-<hash>.svg
   ```

   若不使用 `--attach`，可用无需提交的路径：
   - 将 SVG 上传到 gist：`gh gist create .pr-lens/<view>.svg`，然后在 PR 正文/评论中引用该 gist 的 raw URL，或
   - 通过画布链接发布（步骤 4b，需征得用户同意）并链接查看 URL，或
   - 在 PR 正文中注明本地 `.pr-lens/` 路径，以便审查者自行重建。

   一旦发布到某个持久化位置，就让 CLI 来撰写评论 markdown：

   ```bash
   npx @coldtea/pr-lens-cli@latest comment \
     --graph .pr-lens/drawn.graph.json \
     --manifest .pr-lens/manifest.json \
     --asset-base-url <where you published the SVGs>
   ```

   `--graph` 接收的是 `drawn.graph.json`，而不是你所写的文档——CLI 会拒绝其清单未描述的文档。省略 `--asset-base-url` 的话，生成的 markdown 会指向读者无法获取的本地路径。markdown 会输出到 stdout；发布它是你自己的事。

   附加审查者需要的视图，剩下的留在 `.pr-lens/` 中：先是顶部架构视图，若变更中包含值得追溯的时序，再加一个数据流。通常两张图胜于四张。

6. **可选自动化：** `npx @coldtea/pr-lens-cli@latest analyze --base <ref>` 使用你自己的密钥，通过向某个服务商（Gemini、OpenAI 或任意 `/chat/completions` 端点）发起请求来完成步骤 1–2。这是这里唯一需要密钥的路径；通常你应自己撰写文档。

## 什么样的文档值得一读

- **包含未变更的内容。** 变更所触及的未变更相邻部分即是上下文；将它们标记为 `delta: "unchanged"`。
- **泳道是读者的心智模型**（某个运行时、某个层级、某个边界），而非文件夹树。
- **一条 hero 边**，最多两条：即变更真正关乎的那个连接。
- **仅当存在值得动画化的时序时才添加流程。** 一个好的流程胜过三个单薄的流程。
- **附加文件引用**：它们会成为审查者点击的永久链接。
- 架构视图是一个受 C4 启发的决策树：系统上下文 → 容器 → 组件，每个子级都实质性地更窄。跳过空泛或重复的层级；将数据流视图保持为单独的根；在最有用的架构视图上设置 `defaultOpen: true`。
- **走读（Walkthroughs）**（2–12 步，目标 3–7 步）：为任何非平凡的内容写一个。每一步 = 一个变更（added/removed/moved），标题式变更在前，概述在最后。标题 ≤48 个字符，用变更词汇构建；正文 ≤140 个字符，描述行为，必需。为聪明的十二岁孩子写作；不要用"leverages"/"orchestrates"。让连续步骤保持在同一阶段。walkthrough 字段需要 CLI ≥ 0.4.0（contract 0.1.1）。
- **修正错误的地图：** 切勿编辑生成的文档——将更正写入 `.github/pr-lens.yml`（参见 `references/config.md`），然后验证它：`npx @coldtea/pr-lens-cli@latest validate .github/pr-lens.yml`。优先使用路径 glob 而非 `id:` 匹配。

## 快速参考

| 命令 | 用途 |
| --- | --- |
| `npx @coldtea/pr-lens-cli@latest validate .pr-lens/graph.json` | 验证文档（也会验证 `.github/pr-lens.yml`） |
| `npx @coldtea/pr-lens-cli@latest render .pr-lens/graph.json --theme light` | 渲染 SVG + 清单到 `.pr-lens/` |
| `npx @coldtea/pr-lens-cli@latest canvas push` | 可选：发布到 prlens.dev（仅限主动选择） |
| `npx @coldtea/pr-lens-cli@latest comment --graph … --manifest … --asset-base-url …` | 撰写 PR 评论 markdown 到 stdout |
| `npx @coldtea/pr-lens-cli@latest analyze --base <ref>` | 通过 LLM 服务商自动撰写文档（需要 API 密钥） |

验证器失败代码：

| 代码 | 你做了什么 |
| --- | --- |
| `BROKEN_REFERENCE` | 某条边、流程步骤、视图或走读步骤引用了一个你从未声明的 id |
| `INVALID_DOCUMENT` | 一个凭空编造的字段；schema 是严格的，未知键会被拒绝 |
| `DUPLICATE_ID` | 两个节点、边或视图共享同一个 id |
| `UNSUPPORTED_SCHEMA_VERSION` | `schemaVersion` 不是已安装的 contract 版本 |

## 陷阱

- 有六条规则仅存在于解析器中，而不在 JSON Schema 里（引用完整性、反转的行范围、不一致的 `self` 端点、相同的 patch 提交、视图数量超出清单、流程步骤聚焦在错误的阶段）——务必运行 `validate`，仅有结构化输出是不够的。
- 不要提交 `.pr-lens/` 中的任何内容；它会被重新生成，并由 CLI 加入 gitignore。
- `--attach` gh 参数需要 gh ≥ 2.99；较旧的 gh 会悄无声息地不支持它——在围绕它编写正文前先检查。
- 画布编辑链接（`#w=…`）是一个写入凭据——切勿未经请求就分享，也不要公开粘贴。
- 存储的地图从不携带走读；走读讲述的是某一次变更的故事。
- `pr-lens render` 会报告 `.github/pr-lens.yml` 中未匹配到任何内容的更正——那是值得修复的漂移（drift），而非错误。

## 验证

冒烟测试（2026-09-12 在 Linux 上通过 npx 使用 `@coldtea/pr-lens-cli`、node 进行实测验证）：

```bash
cp references/example.graph.json /tmp/prlens-smoke/ && cd /tmp/prlens-smoke
npx -y @coldtea/pr-lens-cli@latest validate example.graph.json
# ✓ example.graph.json — graph document · 3 lanes, 10 nodes, 13 edges, 1 flow · 6 walkthrough steps
npx -y @coldtea/pr-lens-cli@latest render example.graph.json --theme light
# ✓ .pr-lens/manifest.json — 4 SVGs across 4 diagrams
```

预期两者都以退出码 0 结束，并在 `.pr-lens/` 中生成四个 `*-light-<hash>.svg` 文件以及 `manifest.json` 和 `drawn.graph.json`。

---

改编自 [coldteadotai/pr-lens](https://github.com/coldteadotai/pr-lens)（packages/agent-skill，固定于 0993b4d），MIT 许可证，版权所有 (c) 2026 Coldtea AI。参见 LICENSE.txt。
