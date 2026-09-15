---
title: "有据引用 — 让答案与文档立足于可引证、可验证的来源"
sidebar_label: "有据引用"
description: "让答案与文档立足于可引证、可验证的来源"
---

{/* 本页面由 website/scripts/generate-skill-docs.py 从该技能的 SKILL.md 自动生成。请编辑源 SKILL.md，而非此页面。 */}

# 有据引用

让答案与文档立足于可引证、可验证的来源。

## 技能元数据

| | |
|---|---|
| 来源 | 内置（默认安装） |
| 路径 | `skills/research/grounded-citations` |
| 版本 | `1.2.0` |
| 作者 | Hermes Agent + Teknium |
| 许可证 | MIT |
| 平台 | linux, macos, windows |
| 标签 | `Research`、`Citations`、`Grounding`、`Sources`、`Web`、`Reports` |
| 相关技能 | [`arxiv`](/docs/user-guide/skills/bundled/research/research-arxiv)、[`pdf`](/docs/user-guide/skills/bundled/productivity/productivity-pdf)、[`reddit-reading`](/docs/user-guide/skills/optional/social-media/social-media-reddit-reading)、[`rss-feeds`](/docs/user-guide/skills/optional/research/research-rss-feeds)、[`youtube-content`](/docs/user-guide/skills/bundled/media/media-youtube-content) |

## 参考：完整 SKILL.md

:::info
以下是 Hermes 在本技能被触发时加载的完整技能定义。这就是技能激活时智能体看到的指令内容。
:::

# 有据引用

每一条来自外部来源的论断都会获得一个行内编号引用和一个
`Sources:` 列表，风格类似 Perplexity。一个台账脚本掌管 `url → [n]` 的映射，
因此编号和 URL 来自检索结果，绝不来自记忆——模型只会输出它被赋予的小整数。

对于高风险工作，同一份台账还可兼作事实核查链：逐字引用会附到每个来源上
（除非它们在抓取的页面文本中逐字出现，否则将被拒绝），来自模型知识的论断会被标记
`[unverified]`，而 `verify --evidence` 会让任何所引来源未附带证据的草稿不通过。

本技能涵盖聊天中的回答、书面文档（markdown、PDF、docx、幻灯片）以及研究报告。
它不涵盖学术 BibTeX 流程——会议论文请使用 `arxiv` 技能，本技能
为其提供来源（参见 `references/citation-formats.md`）。

## 何时使用

只要答案或产出物立足于你抓取到的信息而非你已知的信息，就使用本技能：

- 研究、对比、新闻摘要、"X 的当前状态如何"
- 你写入磁盘的任何引述、转述或报告外部事实的交付物——报告、简报、文档、演示文稿、wiki 页面
- 用户会想要核查你工作的事实调查
- 需要归属相互冲突来源的多源综合

当检索只是另一项任务的附带行为时，跳过行内引用——编码过程中的快速语法/版本查询、
闲谈、创意写作。只有当用户有理由想要链接时才提及 URL。

## 前置条件

除标准工具集外无需其他条件。`scripts/sources.py` 是仅用标准库的 Python 3。
检索来自任何已配置的方式：`web_search`、`web_extract`、
`browser_navigate` 或 `terminal`（curl、各类 CLI）。

台账位置：`$HERMES_HOME/cache/citations/ledger.json`（按配置档区分）。
可用 `--ledger <path>` 或 `HERMES_CITATION_LEDGER` 按任务覆盖。

## 如何运行

```bash
S=~/.hermes/skills/research/grounded-citations/scripts/sources.py

python "$S" reset                                  # 开始一份干净的台账
python "$S" add https://example.com/a --title "A"  # 输出：[1]
python "$S" add https://example.com/b --title "B"  # 输出：[2]
python "$S" list                                   # 台账表格
python "$S" render                                 # Sources: 块
python "$S" verify draft.md                        # 捕获不良引用
```

`add` 是幂等的且会规范化 URL：同一页面在同一份台账中始终返回相同的
id，因此 id 在多轮搜索/抽取之间保持稳定。

## 快速参考

| 操作 | 命令 |
|---|---|
| 为新任务建立全新台账 | `sources.py reset` |
| 注册一个来源，获取其 id | `sources.py add <url> [--title T]` |
| 一次注册多个 | `sources.py add <url1> <url2> ...` |
| 从 JSON 工具输出注册 | `sources.py ingest results.json` |
| 为来源附上逐字证据 | `sources.py quote <id> --text "exact wording" --from page.txt` |
| 显示台账 | `sources.py list [--json]` |
| 渲染 Sources 块 | `sources.py render [--style markdown\|plain\|footnotes\|bibtex\|evidence] [--only 1,3]` |
| 仅渲染草稿所引用的 | `sources.py render --cited-in draft.md` |
| 就地为草稿重写 Sources 块 | `sources.py render --replace-in draft.md` |
| 检查草稿的引用 | `sources.py verify draft.md [--strict] [--min-coverage 0.6] [--evidence]` |

## 流程

① **在任务开始时重置账本**，如果该任务将产出有依据的答案或文档。当继续处理 id 已在草稿中的工作时，跳过重置——复用账本可保持编号稳定。

② **在检索时登记每个来源。** 每次 `web_search` / `web_extract` / `browser_navigate` / fetch 之后，将 URL 传给 `sources.py add`（或将原始 JSON 通过管道传给 `sources.py ingest`）。在撰写正文*之前*完成此操作。事后凭记忆登记，正是本技能旨在防止的失败模式。

③ **边写边引用。** 在每个来源支持的句子后面紧跟带括号的 id：

```
Ice floats because it is less dense than liquid water.[1][2]
```

- 括号前不留空格；每个 id 各用一对括号。
- 每句最多 3 个 id。逐句引用，不要结尾一次性堆砌。
- 只使用账本返回的 id。绝不编造 id 或 URL。
- 来自你自己知识的论断不加引用。
- 来源冲突时：呈现两种说法，各附各自的 id。
- 引述精确的数字、日期和名称，与来源所述一致；明确指出空白处（"未找到关于 X 的来源"），而不要粉饰掩盖。

④ **追加 Sources 块**，用 `sources.py render --cited-in <draft>` 让 id → URL 的映射由账本机械生成，而非手动重打。对于非 markdown 目标，选择匹配的 `--style`，并遵循 `references/citation-formats.md` 中的放置方式（docx 用脚注，PDF/LaTeX 用尾注，演示文稿用 Sources 幻灯片，wiki 输出用每页来源列表）。

⑤ **交付前验证**——`sources.py verify <draft>` 在以下情况以非零值退出：出现未知 id、Sources 块与账本不一致，或（带 `--min-coverage` 时）正文引用过于稀疏。修复后重新运行。

⑥ **聊天答复**遵循相同步骤，草稿即在你的回复中：登记来源、行内引用、以渲染出的 `Sources:` 列表结尾。对于简短答复，你可以用 `sources.py render --only <ids>` 渲染该块，而不必写入文件。

## 多平台扫描

"大家是怎么说 X 的" / "在网络上调研 X" 并不是一次 `web_search`。要跨来源类型铺开、并行收集，然后在综合时让每个论断都归属到其来源平台：

| 来源类型 | 路线 | 增添的内容 |
|---|---|---|
| 开放网络 | `web_search` → `web_extract` | 官方文档、文章、公告 |
| 社区讨论 | `reddit-reading`（`search`、`thread`） | 真实用户体验、抱怨、变通办法 |
| 博客 / 发布 / 变更日志 | `rss-feeds`（`read`、`discover`） | 带日期的一手帖文、版本历史 |
| 视频 | `youtube-content` | 讲解、演示、演讲 |
| 代码 | `terminal` 配合 `gh search repos` / `gh search issues` | 实现、未解决的 bug |
| X/Twitter | `xurl`（需要 API 访问） | 公告、开发者闲聊 |

`reddit-reading` 和 `rss-feeds` 技能是可选的。若缺失，使用前用 `hermes skills install official/social-media/reddit-reading` 或 `hermes skills install official/research/rss-feeds` 安装。

每条路线的每个 URL 到达时都要在账本中登记（第 ② 步）。把观点与测量分开：一个 Reddit 帖子是用户*反映*某事的证据，而非该事为真的证据；要配上一手来源或标注为情绪倾向。报告各平台覆盖缺口（"Reddit 搜索没有返回比三月更新的内容"），而不要悄悄缩小到奏效的部分。

## 事实核查模式

对于读者必须能够核查证据链的工作——医疗、法律、金融、安全、有争议的论断，或用户要求事实核查时——从引用升级为证据：

① **为每个来源附上一段逐字引文。** 提取页面后，将其文本保存到文件，并附上承载每个论断的句子：

```bash
python "$S" quote 1 --text "Ice is about 9% less dense than liquid water." --from page1.txt
```

除非引文在证据文本中逐字出现（对空白、大小写和 markdown 标记不敏感——提取文本中的行内链接如 `_[ERAP1](https://…)_` 能匹配读者看到的纯文本散文），否则引文会被拒绝，因此释义或记错的数字无法冒充证据。从获取的文本复制粘贴；绝不重打。引述读者看到的那句话——匹配器已为你透过提取器的标记识别，因此你不必在引文中重现链接语法或转义星号。

② **用 `[unverified]` 标记模型知识论断。** 一个你无法找到来源的关键论断，应给出明确标记而非引用：

```
The refactor likely predates the 2.0 release.[unverified]
```

`verify --min-coverage` 将带 `[unverified]` 的句子计为已覆盖——目标是每个论断都声明出处，而非每句都有引用。若关键论断可核查，就核查它；`[unverified]` 是留给真正无法核查之事的，而以 `[unverified]` 标记为主的事实核查交付物应在摘要中说明这一点。

③ **对有争议的事实，用第二个独立来源交叉核查。** 当两个来源不一致时，用各自的 id 和引文引用两种说法，并说明你采信哪一个及原因。一个来源是报道；两个独立来源是佐证。

④ **用证据门槛验证并渲染证据块：**

```bash
python "$S" verify report.md --evidence --min-coverage 0.5
python "$S" render --style evidence --replace-in report.md
```

`--evidence` 在任何被引用的来源没有附引文时判定草稿失败。`evidence` 渲染样式会在每个来源的 URL 下方打印其引文，使交付物展示 论断 → 来源 → 精确支撑文本 的链路，无一处凭信任。用 `--replace-in <draft>` 就地重写已有的 Sources 块（幂等——附加更多引文后重新运行是安全的）；`--cited-in` 则打印到 stdout。两者都会输出标题 `## Sources`（`--style plain` 输出 `Sources:`）。

**`--min-coverage` 统计的是什么。** 覆盖率是 `有声明出处的句子数 / 正文句子数`。正文句子是 Sources 块之后 4 个词及以上的非空行片段，其中标题（`#`）、表格行（`|`）和围栏代码被剔除，块引用标记被剥离。出处由 `[n]` 引用或 `[unverified]` 标记声明，因此同时携带两者的句子只计一次。先不带阈值运行 `verify`，读取 `info: stats:` 行查看计数，再选定一个数值。

## 常见陷阱

- **先写作后登记。** 台账必须由工具输出填充，而不是从草稿反向重建——那会重新引入编号本已消除的、幻觉 URL 风险。
- **任务中途重新编号。** 永远不要手动编辑草稿中的 id。id 是台账身份；如果草稿引用 `[4]`，`[4]` 就必须保持为那条来源。只在任务之间运行 `reset`。
- **把 URL 重新键入 Sources 块。** 始终使用 `render`。手动键入的 URL 是未经验证的声称。
- **把搜索摘要当作读过页面来引用。** `web_search` 的 description 只支持它字面上写的内容。当声称需要正文时引用提取出的页面——先 `web_extract` 它。
- **过度引用。** 一句话最多三个 id；每个分句都加引用会让文本难以阅读，并掩盖哪个来源承载了主要依据。
- **在代码/配置产物中引用台账。** 来源注释属于散文式交付物和文档头部，不属于生成的代码内部。
- **并行子智能体。** 每个子智能体都有自己的工作目录；如果它们的输出会被合并，就都用 `--ledger`（或 `HERMES_CITATION_LEDGER`）指向同一个台账，否则它们的 id 会冲突。
- **从摘要而非页面引用。** 证据引语必须来自提取出的页面文本，而不是搜索结果 description——先 `web_extract`，保存文本，然后对那个文件执行 `quote --from`。
- **改写成 `quote --text`。** 逐字检查会拒绝它；正确的做法是找到实际的句子，而不是反复改写直到有东西匹配。
- **把 `[unverified]` 当作逃生通道。** 它标记的是确实无法找到来源的少数声称；如果大多数句子都带着它，那说明任务需要更多检索，而不是更多标记。
- **手动编辑 Sources 块。** 使用 `render --replace-in <draft>`；自己切割文件可能会产生过期或重复的块，随后会被 `verify` 标记出来。

## 验证

```bash
python "$S" verify report.md --strict --min-coverage 0.5
```

通过意味着：草稿中的每个 `[n]` 都存在于台账中，Sources 块列出的正是被引用的 id 及其台账 URL，且带来源句子中被引用的比例达到阈值。即使退出码为 0 也要阅读警告——未引用的已登记来源通常意味着某条声称在编辑过程中丢失了归属。
