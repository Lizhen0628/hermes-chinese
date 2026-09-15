---
title: "Simple English — 将文本改写为 ASD-STE100 简化技术英语"
sidebar_label: "Simple English"
description: "将文本改写为 ASD-STE100 简化技术英语"
---

{/* 本页由 website/scripts/generate-skill-docs.py 从技能的 SKILL.md 自动生成。请编辑源 SKILL.md，而非本页。 */}

# Simple English

将文本改写为 ASD-STE100 简化技术英语。

## 技能元数据

| | |
|---|---|
| Source | Optional — 使用 `hermes skills install official/creative/simple-english` 安装 |
| Path | `optional-skills/creative\simple-english` |
| Version | `1.2.0` |
| Author | AminBlg (https://github.com/AminBlg/SimpleEnglish)，由 Hermes Agent 移植 |
| License | MIT |
| Platforms | linux, macos, windows |
| Tags | `writing`, `documentation`, `ste`, `asd-ste100`, `technical-writing`, `editing`, `anti-ai-slop` |
| Related skills | [`humanizer`](/docs/user-guide/skills/bundled/creative/creative-humanizer) |

## 参考：完整 SKILL.md

:::info
以下是 Hermes 在触发此技能时加载的完整技能定义。当技能激活时，这就是智能体看到的指令内容。
:::

# Simple English：像航天手册一样写作

使用 ASD-STE100 简化技术英语的规则来撰写技术文本。STE 是航空航天与国防制造商用于维护文档的受控语言。这些规则的存在，是为了让一位疲惫的、母语非英语的读者不会误读某条指令。它们还能顺带消除 AI 生成文本的常见特征：长句、同义词轮换、含糊措辞、填充词和装饰性从句。

为那位疲惫的读者写作。每个句子必须经得起一次阅读。

## 如何在 Hermes 中使用

文本通常通过以下三种方式之一传入：

1. **内联。** 用户将文本粘贴到消息中。就地改写并回复结果。
2. **文件。** 用户指向某个文件（README、runbook、文档页面）。使用 `read_file` 加载它，然后用 `patch` 对特定章节进行改写，或用 `write_file` 进行整体改写。绝不要触碰代码块、标识符或引用的错误信息（见“不可触碰的内容”）。
3. **检查模式。** 用户要求你审计文本是否符合 STE，而非改写它。使用 `references/checklist.md`，将每处违规报告为：规则编号 + 违规文本 + 合规改写。

此技能与 `humanizer` 不同：humanizer 恢复自然的人类语气；simple-english 为技术指令强制执行受控语言。对于文档、runbook 和错误消息，使用此技能。对于博客文章、散文和个人写作，使用 humanizer。不要将两者应用于同一文本。

## 你的任务

当被要求撰写或改写技术文本时：

1. **选择模式**（下面的务实或严格模式）。
2. **将每个段落分类**为程序性（procedural）或描述性（descriptive）。其余所有规则都取决于此。
3. **在起草前纠正你的词汇。** 在严格模式下，对 check/verify/confirm/ensure 这一概念使用 `make sure that`——词典拒绝将这四个词作为动词。在务实模式下，选定其中一个并保持不变。为 config/settings 选定一个名词（它们都是有效的技术名词——选定一个并保持不变）。在整个文档中，对这些概念不要使用其他词。
4. **应用**下述规则目录中的**规则**。
5. **在交付前进行自检**。此步骤不可省略。
6. **绝不要触碰代码**、标识符、命令或引用的错误信息（见“不可触碰的内容”）。

当被要求检查文本而非撰写时，将每处违规报告为：规则编号、违规文本、合规改写。只能引用本文件中存在的规则编号。不要凭记忆引用规则编号：编号并不直观，模型会编造（已测试——一个没有本文件的智能体引用了“规则 3.1：短句”；而真正的规则 3.1 是关于动词形式的）。

## 两种模式

| 模式 | 何时使用 | 你应用什么 |
|---|---|---|
| **务实**（默认） | 文档、README、错误消息——用户想要清晰的文本 | 所有结构性规则。领域词汇保留（“idempotent”、“webhook”）。 |
| **严格** | 用户明确提到 STE、ASD-STE100 或合规性 | 结构性规则 + 完整词汇纪律，并告知用户完全合规需要官方词典（在 asd-ste100.org 免费获取）。 |

## 步骤 1：对文本分级

| | 程序性（操作说明） | 描述性（解释说明） |
|---|---|---|
| 目的 | 告诉读者要做什么 | 解释某个事物是什么或做什么 |
| 动词形式 | 祈使句：“Install the pump.” | 一般现在时/过去时/将来时 |
| 句子长度限制 | **20 词**（规则 5.1） | **25 词**（规则 6.3） |
| 单位规则 | 一句一条指令（5.2） | 一段一个主题（6.5），每段最多六句（6.6） |

不要在同一段里混用两种类型。“Getting started”这一节是程序性的。“Architecture”这一节是描述性的。程序中的说明性注释属于描述性文本（25 词限制，不用祈使句）。

## 规则目录

53 条规则、分为 9 节，根据 ASD-STE100 第 9 版改写而成并配有软件示例。正式表述见 asd-ste100.org 上的免费标准原文。

### 第 1 节 — 词汇（规则 1.1-1.14）

| 规则 | 说明 |
|---|---|
| 1.1 | 只使用获准词、技术名词或技术动词。 |
| 1.2 | 只能将获准词用作其列出的词性。 |
| 1.3 | 只能将获准词用于其获准的含义。 |
| 1.4 | 只能使用动词和形容词的获准形式。 |
| 1.5 | 你可以将领域词汇用作技术名词（“webhook”、“commit”、“endpoint”）。 |
| 1.6 | 只有在充当技术名词或其一部分时，才可以使用未获准词。 |
| 1.7 | 不要将技术名词用作动词。 |
| 1.8 | 使用你所在项目或行业的技术名词。 |
| 1.9 | 当你选定一个技术名词时，要选一个简短且清晰的名词。 |
| 1.10 | 不要将地区性词汇、俚语或行话作为技术名词。 |
| 1.11 | 一项事物，一个名称。不要此处叫“config”而彼处叫“settings”。 |
| 1.12 | 你可以将领域词汇用作技术动词（“deploy”、“compile”、“merge”）。 |
| 1.13 | 不要将技术动词用作名词。 |
| 1.14 | 使用美式英语拼写。 |

在实用模式下，规则 1.5、1.8 和 1.12 承担了关键作用：你的领域词汇是合法的。智能体常常违反的是 1.7、1.11 和 1.13。

**原文：** You can webhook the event, then do a deploy.
**改写：** Send the event to the webhook. Then deploy the service.

### 第 2 节 — 多词名词（规则 2.1-2.2）

| 规则 | 说明 |
|---|---|
| 2.1 | 多词名词应写作三个词或更少。 |
| 2.2 | 当技术名词需要超过三个词时，先完整写一遍，然后给出其缩写形式或用连字符连接各单位。 |

用介词（of、on、in、for）拆开长名词链：

**原文：** the connection pool timeout configuration value
**改写：** the timeout value for the connection pool

### 第 3 节 — 动词（规则 3.1-3.7）

| 规则 | 说明 |
|---|---|
| 3.1 | 只能使用词典中给出的动词形式。 |
| 3.2 | 只能使用：不定式、祈使式、一般现在时、一般过去时、一般将来时、用作形容词的过去分词。 |
| 3.3 | 过去分词只能用作形容词（“the cached response”）。 |
| 3.4 | 不要用助动词构成复杂结构。不要用现在完成时，不要用“is to be installed”。 |
| 3.5 | “-ing”形式只能用作技术名词或其中一部分（“logging”、“the mounting bracket”）——绝不充当动词。 |
| 3.6 | 使用主动语态。在描述性文本中，只有当执行者未知时，被动语态才合法。 |
| 3.7 | 用动词而非名词描述动作（用“compress the file”，而非“perform compression of the file”）。 |

**获准的情态动词：can、will、must。禁用：should、would、may、might、could（规则 3.2）。**
该标准连表示可能性的“could”也拒绝使用：要写“an explosion can occur”，绝不写“could occur”。至于“should”：需求应改为“must”；建议则直接陈述为事实或删除。这一点对给智能体的指令来说尤其重要——模型会把“should”读作可选。

**原文：** The migration has completed and the table is being rebuilt.
**改写：** The migration is complete. The database rebuilds the table.

**原文：** The flag can be set in the config file, making restarts unnecessary.
**改写：** You can set the flag in the config file. Then a restart is not necessary.

**原文：** The temperature must be adjusted.
**改写：** Adjust the temperature.

### 第 4 节 — 句子（规则 4.1-4.5）

| 规则 | 说明 |
|---|---|
| 4.1 | 写简短清晰的句子。 |
| 4.2 | 不要省略词或使用缩写来缩短句子。保留冠词，保留 "that"。 |
| 4.3 | 对于复杂文本使用纵向列表。 |
| 4.4 | 在相关主题的句子之间使用连接词（"Then"、"As a result"）。 |
| 4.5 | 在适用的情况下，在名词前放置冠词（the、a、an）或指示形容词（this、these）。 |

规则 4.2 是反简洁规则。STE 是语法完整的短句，而非电报风格：

**错误的缩短：** Ensure file exists before running.
**STE：** Make sure that the file exists before you run the command.

### 第 5 节 — 程序性写作（规则 5.1-5.5）

| 规则 | 说明 |
|---|---|
| 5.1 | 每句最多 20 个词。警告和注意事项也包括在内。 |
| 5.2 | 每句一条指令，除非两个动作同时发生。 |
| 5.3 | 以祈使句写指令："Run the migration." |
| 5.4 | 将必需的条件放在命令之前，用逗号分隔："If the build fails, read the log." |
| 5.5 | 注释提供信息，永远不是指令。注释有 25 个词的限制。 |

**之前：** You'll want to grab the API key from the dashboard before configuring the client, which you can do under Settings.
**之后：** Get the API key from the dashboard, under Settings. Then configure the client with this key.

### 第 6 节 — 描述性写作（规则 6.1-6.6）

| 规则 | 说明 |
|---|---|
| 6.1 | 逐步给出信息：每句一个新事实。 |
| 6.2 | 使用关键词和短语给文本一个逻辑结构。 |
| 6.3 | 每句最多 25 个词。 |
| 6.4 | 将相关信息分组到段落中。 |
| 6.5 | 每段一个主题。 |
| 6.6 | 每段最多六句话。 |

描述性文本中不使用祈使句。描述作解释；程序作指示。

### 第 7 节 — 安全说明（规则 7.1-7.3）

| 规则 | 说明 |
|---|---|
| 7.1 | 使用能显示风险级别的词（"WARNING" = 伤害，"CAUTION" = 损坏）。 |
| 7.2 | 以清晰的命令或条件开头。 |
| 7.3 | 然后给出风险或可能的结果。 |

永远不要把指令埋没在解释之后。该模式直接适用于破坏性 CLI 标志、不可逆迁移和危险的 API 选项。

**之前：** Note that data loss may occur in some circumstances if the destructive flag happens to be enabled when running against production.
**之后：** CAUTION: Do not use the `--force` flag against production. The flag deletes rows that do not match the source.

### 第 8 节 — 标点与词数（规则 8.1-8.7）

| 规则 | 说明 |
|---|---|
| 8.1 | 除分号外，所有标准标点都是合法的。改为写两个句子。 |
| 8.2 | 使用连字符连接作为一个整体起作用的词。 |
| 8.3 | 括号在引用、项目编号、缩写、复数形式、解释、替代项中是合法的。 |
| 8.4 | 在纵向列表中，引导冒号在词数计算上终止一个句子。 |
| 8.5 | 括号内的文本算作一个词。 |
| 8.6 | 以下各算一个词：数字、带单位的数字、缩写、字母数字标识符、引用的文本、标题、标签、专有名词。 |
| 8.7 | 用连字符连接的词算作一个词。 |

规则 8.6 对软件文本很重要：反引号中的 `sqlpipe run --config sqlpipe.yaml` 是引用的文本，算作一个词。长标识符不会耗尽你的句子词数预算。

### 第 9 节 — 写作实践（规则 9.1-9.4，GR-1 至 GR-8）

| 规则 | 说明 |
|---|---|
| 9.1 | 当逐词替换不可行时，重构句子。 |
| 9.2 | 正确使用每个已批准的词：已批准的含义、已批准的词性。 |
| 9.3 | 不要构造短语动词（"go down" → "decrease"，"set up" → "install" 或 "configure"）。 |
| 9.4 | 在整个文档中保持一致的风格和术语。 |

通用建议 GR-1 至 GR-8：保留连词 "that"、小心使用 "with"、给代词清晰的指代对象、优先使用 "this + 名词" 而非单独的 "this"、避免假朋友、避免拉丁缩写、使用包容性语言，以及仅在你确定正确时才使用所有格撇号形式（GR-8：如果不确定，就不要使用——非母语读者觉得它很难）。

GR-6 针对软件文档："e.g." → "for example"，"i.e." → "that is"，并删除 "etc."——列举各项或写 "and more"。

## 词汇纪律

官方词典（约 900 个认可词、约 1,200 个禁用词及其替代词）的版权归 ASD 所有，此处不予转载。其机制在无需词典的情况下同样适用：**一词、一义、一词性。**

已知的词性裁定，可作为模式参考：

| 词 | 裁定 |
|---|---|
| test, check, work | 仅作名词。"Do a test"，而非 "test the pump"。"Check that X" 改为 "make sure that X"。 |
| oil | 仅作技术名词（TN）。动词形式，词典给出 "lubricate"："Lubricate the linkage with oil." |
| help | 仅作动词。名词形式，词典给出 "aid"："with the aid of"。 |
| fall（名词） | 不采纳。表示数值减少用 "decrease"。FALL（动词）仅用于受重力向下移动的物理运动："Make sure that the tools do not fall into the engine." |
| follow | 仅表示 "to come after"，绝不表示 "obey"。写作 "obey the instructions"。 |
| above, below | 仅指物理位置。表示限值写作 "more than"、"less than"。 |

### 情态动词阶梯

| 你写的 | STE 写法 |
|---|---|
| should（要求） | must |
| should（建议） | 删除，或作为事实陈述："X is better because Y." |
| may / might / could（可能性） | can |
| may（许可） | can |
| would（假设） | 重构："If X occurs, Y occurs." |

### 废话替换为简单说法

本表由我们编写，并非 ASD 词典。它将 AI 生成文档中过度使用的词映射为朴素的替换词。如果该词不承载事实，直接删除而非替换。

| 废话 | 改写为 |
|---|---|
| leverage, utilize | use |
| in order to | to |
| prior to | before |
| ensure | make sure that（严格模式；在实用模式下，如果你只选一个检查动词，ensure 是可接受的选项） |
| it is worth noting that | （删除） |
| it's important to, crucially | （删除——陈述事实） |
| simply, just, easily, seamlessly, effortlessly | （删除） |
| robust, powerful, comprehensive, performant | （删除，或给出可度量的属性） |
| functionality | function, feature |
| enables you to, allows you to | you can |
| is designed to, aims to | （删除——说明它做了什么） |
| facilitate | help, make possible |
| dive into, delve into | read, examine |
| when it comes to | for |
| in the event that | if |
| due to the fact that | because |
| as needed, as necessary | （说明条件） |
| and/or | 二选一，或写 "X, or Y, or both" |
| e.g. / i.e. / etc. | for example / that is /（列出具体项） |
| gracefully handles | （说明它做了什么："retries three times, then stops"） |
| out of the box | by default |
| under the hood | internally |
| blazingly fast, state-of-the-art | fast（给出数字）/（删除） |
| streamline | make simpler, make faster |
| plethora, myriad | many |
| addresses the issue, tackles | corrects the fault, removes the error |

### 一致性检查

将同义词轮换收敛为每项各用一词（规则 1.11、9.4）。以下两个清单的处理方式不同。

**技术名词——不在词典中。选定一个并保持一致（两种模式均适用）：**

- config / configuration / settings / options → 选一个

**词典裁定——标准已经选定。使用认可词（严格模式）；选定一个并保持一致（实用模式）：**

| 你写的 | 词典状态 | 改用 |
|---|---|---|
| check（动词）/ verify / confirm / ensure | 作为动词均不采纳 | `make sure that`（严格）；选一个（实用） |
| validate | 不在词典中 | 作为技术动词使用（规则 1.12），或替换为 `make sure that` |
| delete / drop（动词）/ destroy | 均不采纳 | `erase`（数据）、`remove`（物理实体）；避免 `drop` 和 `destroy` |
| remove | 认可的动词 | 保留 |
| run / execute | 均不采纳 | 表示 run 用 `operate`，表示 execute 用 `do`（严格）；选一个（实用） |
| invoke / launch | 不在词典中 | 作为技术动词使用（规则 1.12） |
| display（动词）/ render / present（动词） | 均不采纳 | `show`（认可的动词） |
| issue | 不在词典中 | 作为技术名词使用，或替换为 `problem`（认可） |
| failure | 一般用法中不采纳；作为表示性能损失的技术名词认可 | 仅当表示性能错误时使用："a failure of the pump" |
| error | 认可的名词 | 保留 |
| problem | 认可的名词 | 保留 |

## 不可改动的内容

这些是技术名称（规则 1.5、8.6）。即使它们违反了词汇规则，也要保持原样：

- 代码块、行内代码、标识符、CLI 命令、命令行标志、文件路径
- 引用的错误信息与日志行
- 产品名称、API 端点名称、配置键
- 带单位的数字——在句子长度限制中，每个只算作一个词

## 文档以外的场景

规则相同，目标不同。`references/use-cases.md` 中有完整的适配版本：

- **错误信息**：用一般过去时说明发生了什么，如已知则说明原因，最后以祈使句给出修复方法。不要用 “Oops”，不要用 “Please ensure”，不要用道歉性的填充词。
- **运行手册**：STE 的主场。祈使句步骤，条件在前，警告置于步骤之前。
- **事故报告**：只用一般过去时。把 “We have identified an issue that may have impacted” 改为 “Between 14:02 and 14:31 UTC, 12% of requests failed.”
- **发布说明**：破坏性变更遵循警告模式——命令在前，风险在后。
- **智能体指令（提示词、AGENTS.md）**：系统提示词是为一个无法提问的读者编写的流程说明。每句一条指令，不要用 “should”，条件在前。
- **翻译准备**：STE 最初的工作。一词一义加上完整的语法，可消除大部分翻译歧义。

## 交付前的自检

这一步不是可选的。对草稿执行以下四项检查：

1. 统计最长三个句子的词数。超过 20/25 的限制 → 拆分它们。
2. 在草稿中搜索：`'ll`、`'re`、`'s`（缩写）、`has been`、`have been`、`should`、逗号后的 `-ing` 动词、分号。
3. 搜索每一个 `if` 和 `when`。每一个都应位于其句子的开头，在命令之前。“Increase the timeout if the network is slow” → “If the network is slow, increase the timeout.”
4. 搜索你在「你的任务」第 3 步中没有选用的那些动词（即 check/verify/confirm 这一组）。把每一处都替换为你选定的动词。

修正你发现的问题，然后交付。如需完整审查，运行 `references/checklist.md`。

## 完整示例

**修改前（真实的未经编辑的 AI 输出）：**

> **Connection timeouts.** If sqlpipe hangs or fails with `dial tcp: i/o timeout`, check that the host running sqlpipe can reach the Postgres port (usually 5432) — this is often a security group or firewall rule blocking the connection. If you're connecting to a managed database (RDS, Cloud SQL, etc.), confirm the instance allows connections from sqlpipe's IP. You can also try increasing `source.connect_timeout_seconds` in your config, since a slow network path can trip the default timeout even when the connection eventually succeeds.

**修改后（分类为流程性内容，动词 = "make sure"，条件在前，每句一条指令）：**

> **Connection timeouts.** sqlpipe stops with `dial tcp: i/o timeout` when it cannot reach the Postgres port (5432 by default).
>
> 1. Make sure that the host that runs sqlpipe can reach the Postgres port. A firewall or security group usually blocks it.
> 2. If the database is managed (RDS, Cloud SQL), make sure that the instance accepts connections from the IP of sqlpipe.
> 3. If the network is slow, increase `source.connect_timeout_seconds` in the configuration.

变化之处：40 词的句子拆分为 20 词以下；“you're” 展开；“check/confirm” 归并为 “make sure that”；每个条件都移到其命令之前；删除了 “etc.”；代码与错误字符串未作改动。

## 限制

STE 用于技术事实与指令。不要将其应用于营销文案、博客语气或品牌写作——它按设计就会消除说服力。当用户要求在营销文本上使用 STE 时，要说明这一点，并改为提议将其用于文档。

本技能是一项非官方辅助工具。它与 ASD 或 STEMG 无关联，也未获得其认可，且没有任何工具能保证符合 STE。ASD-STE100 是 ASD 的注册商标。官方标准可在 asd-ste100.org 免费下载。

## 参考

- `references/checklist.md` —— 带可搜索模式的完整验证流程，用于检查模式和最终审查
- `references/use-cases.md` —— 长文适配：错误信息、运行手册、事故报告、提交信息、UI 文案、国际化
