---
title: "有据引用 — 将答案和文档建立在可引用的、可验证的来源之上"
sidebar_label: "有据引用"
description: "将答案和文档建立在可引用的、可验证的来源之上"
---

{/* This page is auto-generated from the skill's SKILL.md by website/scripts/generate-skill-docs.py. Edit the source SKILL.md, not this page. */}

# 有据引用（Grounded Citations）

将答案和文档建立在可引用的、可验证的来源之上。

## 技能元数据

| | |
|---|---|
| 来源 | 内置（默认安装） |
| 路径 | `skills/research/grounded-citations` |
| 版本 | `1.2.0` |
| 作者 | Hermes Agent + Teknium |
| 许可证 | MIT |
| 平台 | linux, macos, windows |
| 标签 | `Research`, `Citations`, `Grounding`, `Sources`, `Web`, `Reports` |
| 相关技能 | [`arxiv`](/docs/user-guide/skills/bundled/research/research-arxiv), [`pdf`](/docs/user-guide/skills/bundled/productivity/productivity-pdf), [`reddit-reading`](/docs/user-guide/skills/optional/social-media/social-media-reddit-reading), [`rss-feeds`](/docs/user-guide/skills/optional/research/research-rss-feeds), [`youtube-content`](/docs/user-guide/skills/bundled/media/media-youtube-content) |

## 参考：完整 SKILL.md

:::info
以下是 Hermes 在触发此技能时加载的完整技能定义。这是技能激活时智能体所看到的指令。
:::

# 有据引用（Grounded Citations）

每一个来自外部来源的论断都会获得一个行内编号引用，以及一个
`Sources:` 列表，Perplexity 风格。一个账本脚本掌管 `url → [n]` 的映射关系，
使得编号和 URL 来自检索，而非来自记忆——模型只会输出它所收到的那些小整数。

对于高风险的工作，同一个账本兼作事实核查链：逐字引文会被附加到每个来源上
（除非它字面出现在抓取的页面文本中，否则被拒绝），来自模型知识的论断会被标记
为 `[unverified]`，而 `verify --evidence` 会让任何所引用来源不携带证据的草案
检查失败。

此技能涵盖聊天中的回答、书面文档（markdown、PDF、docx、slides）以及研究报告。
它不涵盖学术 BibTeX 流程——对于会议论文请使用 `arxiv` 技能，本技能为其提供输入
（见 `references/citation-formats.md`）。

## 何时使用

每当一个回答或产物依赖于你抓取而非你所知道的信息时即可使用：

- 研究、对比、新闻摘要、“X 的当前状态是什么”
- 任何你写到磁盘的交付物，它引用、转述或报告外部事实——报告、简报、文档、演示文稿、wiki 页面
- 用户可能希望亲自核查你工作的事实调查
- 多个来源相互冲突、必须明确归属的跨来源综合

当检索对另一项任务只是附带时，跳过行内引用——例如编码过程中快速的语法/版本查阅、
随意交谈、创意写作。仅当用户有可能想要该链接时才提及 URL。

## 前置条件

除了标准工具集外无其他要求。`scripts/sources.py` 是仅用标准库的 Python 3。
检索来自所配置的任何方式：`web_search`、`web_extract`、
`browser_navigate` 或 `terminal`（curl、各类 CLI）。

账本位置：`$HERMES_HOME/cache/citations/ledger.json`（按配置档而定）。
可用 `--ledger <path>` 或 `HERMES_CITATION_LEDGER` 按任务覆盖。

## 如何运行

```bash
S=~/.hermes/skills/research/grounded-citations/scripts/sources.py

python "$S" reset                                  # 开启一个干净的账本
python "$S" add https://example.com/a --title "A"  # 输出: [1]
python "$S" add https://example.com/b --title "B"  # 输出: [2]
python "$S" list                                   # 账本表格
python "$S" render                                 # Sources: 区块
python "$S" verify draft.md                        # 捕捉错误的引用
```

`add` 是幂等的且会规范化 URL：同一个页面在同一个账本中总是返回相同的
id，因此在许多轮搜索/抓取中 id 保持稳定。

## 快速参考

| 操作 | 命令 |
|---|---|
| 为一项新任务开启全新账本 | `sources.py reset` |
| 注册一个来源，获取其 id | `sources.py add <url> [--title T]` |
| 一次注册多个 | `sources.py add <url1> <url2> ...` |
| 从 JSON 工具输出注册 | `sources.py ingest results.json` |
| 为来源附加逐字证据 | `sources.py quote <id> --text "exact wording" --from page.txt` |
| 显示账本 | `sources.py list [--json]` |
| 渲染 Sources 区块 | `sources.py render [--style markdown\|plain\|footnotes\|bibtex\|evidence] [--only 1,3]` |
| 仅渲染草案所引用的内容 | `sources.py render --cited-in draft.md` |
| 就地改写草案的 Sources 区块 | `sources.py render --replace-in draft.md` |
| 检查草案的引用 | `sources.py verify draft.md [--strict] [--min-coverage 0.6] [--evidence]` |

## 流程

① **在开始一项将产出有依据的答复或文档的任务时，重置台账（ledger）。** 当继续处理草稿中已含有 id 的工作时，跳过重置——复用台账可保持编号稳定。

② **在检索时登记每一个来源。** 每次 `web_search` / `web_extract` / `browser_navigate` / fetch 之后，把 URL 传递给 `sources.py add`（或将原始 JSON 通过管道传给 `sources.py ingest`）。务必在撰写正文*之前*完成这一步。事后再凭记忆登记，正是本技能存在的意义所在——防止这种失败模式。

③ **边起草边引用（cite-while-drafting）。** 把方括号里的 id 紧跟在每个有来源支撑的句子之后：

```
Ice floats because it is less dense than liquid water.[1][2]
```

- 方括号前不留空格；每个 id 各占一对方括号。
- 每个句子最多 3 个 id。逐句引用，不要结尾一次性堆砌。
- 只使用台账返回的 id。绝不杜撰 id 或 URL。
- 来自你自身知识的主张不引用。
- 来源相互冲突时：并列呈现两种说法，各自附上自己的 id。
- 引用确切的数字、日期和人名时须与来源陈述一致；明确标出缺口（"no source found for X" / "未找到关于 X 的来源"）而不是加以粉饰。

④ **追加 Sources 块**，使用 `sources.py render --cited-in <draft>`，让 id → URL 的映射由台账机械生成，而非手工重打。对于非 markdown 目标，选择匹配的 `--style`，并遵循 `references/citation-formats.md` 关于摆放位置的规定（docx 用脚注、PDF/LaTeX 用尾注、幻灯片的 Sources 页、wiki 输出的按页来源清单）。

⑤ **交付前验证** —— `sources.py verify <draft>` 在以下情况会以非零值退出：id 未知、Sources 块与台账不符，或（配合 `--min-coverage` 时）正文引用过于稀疏。修复后重跑。

⑥ **聊天答复**遵循同样的步骤，草稿即在你的回复中：登记来源、行内引用，结尾附上渲染好的 `Sources:` 列表。对于简短答复，可用 `sources.py render --only <ids>` 渲染该块，而不必写入文件。

## 多平台扫描

"人们对 X 有哪些看法" / "跨网络研究 X" 不只是一次 `web_search`。要跨来源类型铺开，并行收集，再综合，并将每个主张归到它来自的平台：

| 来源类型 | 途径 | 增添的价值 |
|---|---|---|
| 开放网络 | `web_search` → `web_extract` | 官方文档、文章、公告 |
| 社区讨论 | `reddit-reading`（`search`、`thread`） | 真实用户体验、抱怨、变通办法 |
| 博客 / 发布 / 变更日志 | `rss-feeds`（`read`、`discover`） | 带日期的原始帖文、版本历史 |
| 视频 | `youtube-content` | 操作演示、demo、演讲 |
| 代码 | 用 `terminal` 执行 `gh search repos` / `gh search issues` | 实现、未修复的 bug |
| X/Twitter | `xurl`（需要 API 权限） | 公告、开发者讨论 |

`reddit-reading` 和 `rss-feeds` 技能为可选。若缺失，使用前先安装：`hermes skills install official/social-media/reddit-reading` 或 `hermes skills install official/research/rss-feeds`。

每个途径的每个 URL 一到达就登记进台账（见步骤 ②）。把意见与实测区分开：一个 Reddit 帖子是用户*报告*某事的证据，而非该事为真的证据；要么给它配一个一手来源，要么标注为情绪。报告逐平台的覆盖缺口（"Reddit search returned nothing newer than March" / "Reddit 搜索未见 3 月之后的新内容"），而不要默不作声地缩窄到恰好能用的部分。

## 核查模式

对于读者必须能够核对链条的工作——医疗、法律、金融、安全、有争议的主张，或用户要求核查时——从引用升级为证据：

① **每个来源附上一段逐字引文。** 提取完页面后，把其文本保存到文件，并附上承载每条主张的句子：

```bash
python "$S" quote 1 --text "Ice is about 9% less dense than liquid water." --from page1.txt
```

引文只有在证据文本中逐字出现时才会被接受（对空白、大小写和 markdown 标记不敏感——提取文本中的行内链接如 `_[ERAP1](https://…)_` 能匹配读者所见到的纯正文），因此改写或记错的数字无法假冒为证据。从抓取的文本中复制粘贴；绝不重打。按读者所见引用该句——匹配器会替你透过提取器的标记看穿，因此你无需在引文中复现链接语法或转义的星号。

② **用 `[unverified]` 标记模型知识产出的主张。** 一条你无法找到来源的承重主张，给一个显式标记而非引用：

```
The refactor likely predates the 2.0 release.[unverified]
```

`verify --min-coverage` 会把 `[unverified]` 句子计入已覆盖——目标是每条主张都有已声明的出处，而非每句都有引用。若关键主张可核查，就核查它；`[unverified]` 留给你真正无法核查的内容，而一份被 `[unverified]` 标记主导的核查交付物，应在其摘要中说明这一点。

③ **对有争议的事实与第二个独立来源交叉核对。** 当两个来源不一致时，并列引用两种说法，各自附上 id 和引文，并说明你更采信哪个及其原因。一个来源是报道；两个独立来源才是佐证。

④ **用证据门控进行验证，并渲染证据块：**

```bash
python "$S" verify report.md --evidence --min-coverage 0.5
python "$S" render --style evidence --replace-in report.md
```

`--evidence` 在任何被引来源没有附加引文时判定草稿失败。`evidence` 渲染样式会在每个来源的 URL 之下打印其引文，于是交付物呈现出 主张 → 来源 → 确切支撑文本，无一需要凭空相信。用 `--replace-in <draft>` 就地重写已有的 Sources 块（幂等——在附加更多引文后可比重复跑）；`--cited-in` 则改为打印到 stdout。两者都会输出标题 `## Sources`（`--style plain` 输出 `Sources:`）。

**`--min-coverage` 计入什么。** 覆盖率 = `sentences with declared provenance / prose sentences`（已声明出处的句子 / 正文章句）。正文句子指 Sources 块之后、字数 4 以上的非空行片段；标题（`#`）、表格行（`|`）和围栏代码会被剔除；blockquote 标记会被剥离。出处由 `[n]` 引用或 `[unverified]` 标记声明，故同时带两者的句子只计一次。先不设阈值跑一次 `verify`，读 `info: stats:` 行查看各项计数，再据此选一个数。

## 注意事项

- **写完后再登记。** 账本必须由工具输出填充，而不是从草稿中重建——否则会重新引入乱编号本想消除的那种臆造 URL 风险。
- **任务中途重新编号。** 永远不要手动编辑草稿中的 id。id 是账本身份；如果草稿引用了 `[4]`，那么 `[4]` 必须始终保持为那个来源。只在任务之间运行 `reset`。
- **把 URL 重新手打进 Sources 块。** 始终使用 `render`。手打的 URL 是未经核验的断言。
- **把搜索摘要当作读过页面来引用。** `web_search` 的描述只能支撑它字面上说的内容。当论断需要正文时，要引用提取出的页面——先对它执行 `web_extract`。
- **过度引用。** 一句话最多挂三个 id；每个从句都加引用会让文字难以阅读，也掩盖了究竟哪个来源在承担支撑作用。
- **在代码／配置产物中引用账本。** 来源注释属于散文式交付物和文档头部，不应出现在生成的代码里。
- **并行子智能体。** 每个子智能体都有自己的工作目录；如果它们的输出会被合并，要用 `--ledger`（或 `HERMES_CITATION_LEDGER`）让它们都指向同一个账本，否则它们的 id 会冲突。
- **从摘要而非页面中引用。** 证据引文必须来自提取出的页面文本，而不是搜索结果描述——先 `web_extract`，保存文本，再用 `quote --from` 指向那个文件。
- **把改写放进 `quote --text`。** 逐字校验会拒绝它；正确的做法是找到真正的原句，而不是反复改写直到某个版本匹配。
- **把 `[unverified]` 当作逃生出口。** 它标记的是确实无法找到来源的罕见论断；如果大多数句子都带着它，说明任务需要的是更多检索，而不是更多标记。
- **手动编辑 Sources 块。** 使用 `render --replace-in <draft>`；自己切分文件可能会出现陈旧或重复的块，随后被 `verify` 标记出来。

## 验证

```bash
python "$S" verify report.md --strict --min-coverage 0.5
```

通过意味着：草稿中的每个 `[n]` 都存在于账本中，Sources 块列出的恰好是被引用的 id 及其在账本中的 URL，并且承载来源的句子中被引用的比例达到阈值。即使退出码为 0，也要阅读警告——已登记但未被引用的来源通常意味着某条论断在编辑过程中失去了归属。
