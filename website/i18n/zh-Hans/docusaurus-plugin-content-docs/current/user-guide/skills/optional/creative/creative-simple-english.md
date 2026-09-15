---
title: "Simple English — 将文本重写为 ASD-STE100 简化技术英语"
sidebar_label: "Simple English"
description: "将文本重写为 ASD-STE100 简化技术英语"
---

{/* 本页面由 website/scripts/generate-skill-docs.py 根据技能的 SKILL.md 自动生成。请修改源文件 SKILL.md，而非本页。 */}

# Simple English

将文本重写为 ASD-STE100 简化技术英语。

## 技能元数据

| | |
|---|---|
| 来源 | 可选 — 使用 `hermes skills install official/creative/simple-english` 安装 |
| 路径 | `optional-skills/creative\simple-english` |
| 版本 | `1.2.0` |
| 作者 | AminBlg (https://github.com/AminBlg/SimpleEnglish)，由 Hermes Agent 移植 |
| 许可证 | MIT |
| 平台 | linux、macos、windows |
| 标签 | `writing`、`documentation`、`ste`、`asd-ste100`、`technical-writing`、`editing`、`anti-ai-slop` |
| 相关技能 | [`humanizer`](/docs/user-guide/skills/bundled/creative/creative-humanizer) |

## 参考：完整 SKILL.md

:::info
以下 Hermes 在此技能被触发时加载的完整技能定义。这就是技能激活时智能体看到的指令内容。
:::

# Simple English：像航空航天手册一样写作

使用 ASD-STE100 简化技术英语的规则书写技术文本。STE 是航空航天和国防制造商用于维护文档的受控语言。这些规则的存在，是为了让一位疲惫且母语不是英语的读者不会误读指令。它们同时有一个副作用：消除了 AI 生成文本的常见特征——冗长句子、同义替换、模糊措辞、填充词和装饰性从句。

为那位疲惫的读者写作。每个句子必须一遍就能读懂。

## 如何在 Hermes 中使用

文本通常通过以下三种方式之一到达：

1. **内联。** 用户将文本粘贴到消息中。就地重写并回复结果。
2. **文件。** 用户指向某个文件（README、运维手册、文档页面）。使用 `read_file` 加载它，然后用 `patch` 对特定章节进行定向重写，或用 `write_file` 进行完整重写。切勿改动代码块、标识符或被引用的错误信息（参见“不可改动项”）。
3. **检查模式。** 用户要求你审查文本的 STE 合规性，而非重写。使用 `references/checklist.md`，将每处违规报告为：规则编号 + 违规文本 + 合规重写。

本技能与 `humanizer` 不同：humanizer 恢复自然的人类语气；simple-english 则强制技术指令使用受控语言。对于文档、运维手册和错误信息，使用本技能。对于博客文章、随笔和个人写作，使用 humanizer。不要对同一文本同时应用两者。

## 你的任务

当被要求编写或重写技术文本时：

1. **选择模式**（下述“实用”或“严格”）。
2. **将每一段归类**为程序性（procedural）或描述性（descriptive）。其余所有规则都取决于此。
3. **在起草前修正你的用词。** 在严格模式下，对 check/verify/confirm/ensure 这一概念统一使用 `make sure that` —— 词典拒绝将这四个词作为动词。在实用模式下，选定其中一个并始终使用。对 config/settings 选定一个名词（它们都是合法的技术名词——选定一个并始终使用）。在整个文档中，这些概念不得使用其他任何词。
4. **应用**下述规则目录中的规则。
5. **交付前执行自检。** 此步骤不是可选的。
6. **切勿改动代码**、标识符、命令或被引用的错误信息（参见“不可改动项”）。

当被要求检查文本而非编写文本时，将每处违规报告为：规则编号、违规文本、合规重写。只引用本文件中存在的规则编号。不要凭记忆引用规则编号：其编号方式不直观，且模型会凭空编造（经测试——一个没有此文件的智能体引用了“规则 3.1：短句”；而真实的规则 3.1 是关于动词形式的）。

## 两种模式

| 模式 | 使用时机 | 你应用的内容 |
|---|---|---|
| **实用**（默认） | 文档、README、错误信息——用户想要清晰的文本 | 所有结构性规则。领域词汇保留（“idempotent”、“webhook”）。 |
| **严格** | 用户点明 STE、ASD-STE100 或合规性 | 结构性规则 + 完整的用词规范，并告知用户：完全合规需要官方词典（可在 asd-ste100.org 免费获取）。 |

## 步骤 1：对文本进行分类

| | 程序性文本（指令） | 描述性文本（解释） |
|---|---|---|
| 目的 | 告诉读者该做什么 | 解释某个事物是什么或有什么作用 |
| 动词形式 | 祈使句：“Install the pump.” | 一般现在时/过去时/将来时 |
| 句子长度限制 | **20 个词**（规则 5.1） | **25 个词**（规则 6.3） |
| 单位规则 | 每句一条指令（5.2） | 每段一个主题（6.5），每段最多六句（6.6） |

不要在同一段落中混用这两者。“Getting started”（快速上手）小节属于程序性文本。“Architecture”（架构）小节属于描述性文本。程序中的注释属于描述性文本（25 词限制，不使用祈使句）。

## 规则目录

共 9 个部分、53 条规则，依据 ASD-STE100 第 9 版改写并配以软件示例。正式措辞见 asd-ste100.org 上的免费标准。

### 第 1 部分 — 词汇（规则 1.1-1.14）

| 规则 | 说明 |
|---|---|
| 1.1 | 只使用已批准的词汇、技术名词或技术动词。 |
| 1.2 | 已批准的词汇只能按其列明的词性使用。 |
| 1.3 | 已批准的词汇只能按其已批准的含义使用。 |
| 1.4 | 只使用动词和形容词的已批准形式。 |
| 1.5 | 可以将领域词用作技术名词（“webhook”、“commit”、“endpoint”）。 |
| 1.6 | 只有在未批准词属于技术名词或技术名词的一部分时，才可使用该词。 |
| 1.7 | 不要将技术名词用作动词。 |
| 1.8 | 使用你所在项目或行业的技术名词。 |
| 1.9 | 挑选技术名词时，挑选简短、清晰的名词。 |
| 1.10 | 技术名词不得使用地区性词汇、俚语或行话。 |
| 1.11 | 一个事物，一个名称。不要这里叫 “config”，那里又叫 “settings”。 |
| 1.12 | 可以将领域动词用作技术动词（“deploy”、“compile”、“merge”）。 |
| 1.13 | 不要将技术动词用作名词。 |
| 1.14 | 使用美式英语拼写。 |

在实用模式下，规则 1.5、1.8 和 1.12 最为关键：你的领域词汇是合规的。智能体经常违反的是 1.7、1.11 和 1.13。

**改前：** You can webhook the event, then do a deploy.
**改后：** Send the event to the webhook. Then deploy the service.

### 第 2 部分 — 多词名词（规则 2.1-2.2）

| 规则 | 说明 |
|---|---|
| 2.1 | 多词名词用三个词或更少的词书写。 |
| 2.2 | 当一个技术名词需要超过三个词时，先完整写一次，然后给出简称或用连字符连接其组成单位。 |

用介词（of、on、in、for）拆分长名词链：

**改前：** the connection pool timeout configuration value
**改后：** the timeout value for the connection pool

### 第 3 部分 — 动词（规则 3.1-3.7）

| 规则 | 说明 |
|---|---|
| 3.1 | 只使用词典给出的动词形式。 |
| 3.2 | 只使用：不定式、祈使式、一般现在时、一般过去时、一般将来时、作形容词的过去分词。 |
| 3.3 | 过去分词只用作形容词（“the cached response”）。 |
| 3.4 | 不使用助动词构成复杂结构。不用现在完成时，不用 “is to be installed”。 |
| 3.5 | “-ing” 形式只用作物技术名词或其一部分（“logging”、“the mounting bracket”）——绝不用作动词。 |
| 3.6 | 使用主动语态。在描述性文本中，只有当施动者未知时才可用被动语态。 |
| 3.7 | 用动词而非名词描述动作（写 “compress the file”，而不是 “perform compression of the file”）。 |

**已批准的情态动词：can、will、must。禁用：should、would、may、might、could（规则 3.2）。**
该标准甚至拒绝用 “could” 表示可能性：写 “an explosion can occur”，绝不写 “could occur”。对于 “should”：需求改写为 “must”；建议则陈述为事实或删除。这对智能体指令尤为重要——模型会把 “should” 读作可选。

**改前：** The migration has completed and the table is being rebuilt.
**改后：** The migration is complete. The database rebuilds the table.

**改前：** The flag can be set in the config file, making restarts unnecessary.
**改后：** You can set the flag in the config file. Then a restart is not necessary.

**改前：** The temperature must be adjusted.
**改后：** Adjust the temperature.

### 第 4 节 — 句子（规则 4.1-4.5）

| 规则 | 说明 |
|---|---|
| 4.1 | 写简短清晰的句子。 |
| 4.2 | 不要省略词语或使用缩略形式来缩短句子。保留冠词，保留“that”。 |
| 4.3 | 复杂文本使用垂直列表。 |
| 4.4 | 在相关主题的句子之间使用连接词（“然后”、“因此”）。 |
| 4.5 | 在适用的情况下，在名词前加上冠词（the、a、an）或指示形容词（this、these）。 |

规则 4.2 是反简陋规则。STE 是语法完整、简洁直白的句子，而非电报体：

**错误的省略：** 运行前确保 File 存在。
**STE：** 在运行命令之前，请确认该 File 存在。

### 第 5 节 — 流程性写作（规则 5.1-5.5）

| 规则 | 说明 |
|---|---|
| 5.1 | 每个句子最多 20 个词。警告和注意事项也包括在内。 |
| 5.2 | 每个句子写一条指令，除非有两个同时发生的动作。 |
| 5.3 | 用祈使句写指令：“运行迁移。” |
| 5.4 | 将必需的条件置于命令之前，用逗号分开：“如果构建失败，请阅读日志。” |
| 5.5 | 注释只给出 Information，绝不给出指令。注释适用 25 词限制。 |

**修改前：** 你需要在配置客户端之前从仪表板获取 API 密钥，这可以在“设置”中完成。
**修改后：** 从“设置”下的仪表板获取 API 密钥。然后使用此密钥配置客户端。

### 第 6 节 — 描述性写作（规则 6.1-6.6）

| 规则 | 说明 |
|---|---|
| 6.1 | 逐步给出信息：每句一个新的事实。 |
| 6.2 | 使用关键词和短语为文本赋予逻辑结构。 |
| 6.3 | 每个句子最多 25 个词。 |
| 6.4 | 将相关信息分组到段落中。 |
| 6.5 | 每个段落一个主题。 |
| 6.6 | 每个段落最多六个句子。 |

描述性文本中不使用祈使句。描述用于解释；流程用于指导。

### 第 7 节 — 安全说明（规则 7.1-7.3）

| 规则 | 说明 |
|---|---|
| 7.1 | 使用表明风险等级的词语（“警告”= 人身伤害，“注意”= 损坏）。 |
| 7.2 | 以清晰的命令或条件开头。 |
| 7.3 | 然后给出风险或可能的结果。 |

绝不要将指令埋没在解释之后。该模式可直接迁移到破坏性 CLI 标志、不可逆迁移和危险的 API 选项。

**修改前：** 请注意，在某些情况下，如果在针对生产环境运行时碰巧启用了此破坏性标志，可能会发生数据丢失。
**修改后：** 注意：请勿对生产环境使用 `--force` 标志。该标志会删除与源不匹配的行。

### 第 8 节 — 标点与词数（规则 8.1-8.7）

| 规则 | 说明 |
|---|---|
| 8.1 | 除分号外，所有标准标点均可使用。请改写成两个句子。 |
| 8.2 | 使用连字符连接作为一个整体单位使用的词语。 |
| 8.3 | 括号可用于引用、条目编号、缩写、复数形式、解释、替代项。 |
| 8.4 | 在垂直列表中，导入性冒号视为句子的词数统计终点。 |
| 8.5 | 括号内的文字计为一个词。 |
| 8.6 | 以下各项各计为一个词：数字、带单位的数字、缩写、字母数字标识符、引用的文本、标题、标签、专有名词。 |
| 8.7 | 带连字符的词计为一个词。 |

规则 8.6 对软件文本很重要：反引号中的 `sqlpipe run --config sqlpipe.yaml` 是引用的文本，计为一个词。较长的标识符不会击穿你的句子预算。

### 第 9 节 — 写作实践（规则 9.1-9.4，GR-1 至 GR-8）

| 规则 | 说明 |
|---|---|
| 9.1 | 当逐词替换不可行时，请重构句子。 |
| 9.2 | 正确使用每个获准词：获准的词义、获准的词性。 |
| 9.3 | 不要构建短语动词（“go down” → “decrease”，“set up” → “install”或“configure”）。 |
| 9.4 | 在整个文档中保持统一的风格和术语。 |

一般性建议 GR-1 至 GR-8：保留连词“that”，谨慎使用“with”，让代词有明确的指代对象，优先使用“this + 名词”而非单独使用“this”，避免假朋友（false friends），避免拉丁语缩写，使用包容性语言，并且仅在你确定正确时才使用所有格撇号形式（GR-8：如果不确定，就不要使用 —— 非母语读者很难理解）。

软件文档的 GR-6：“e.g.” → “for example”，“i.e.” → “that is”，并且删除“etc.” —— 要么列出具体的条目，要么写“and more”。

## 词汇规范

官方词典（约 900 个核准词，约 1,200 个禁用词及其替代词）的版权归 ASD 所有，此处不再复现。其机制即便脱离词典也同样适用：**一词、一义、一词性。**

已知的词性裁定，可作为模式参考：

| 词 | 裁定 |
|---|---|
| test、check、work | 仅作名词。"Do a test"，而非 "test the pump"。"Check that X" 改为 "make sure that X"。 |
| oil | 仅作技术名词（TN）。作动词时，词典给出 "lubricate"："Lubricate the linkage with oil." |
| help | 仅作动词。作名词时，词典给出 "aid"："with the aid of"。 |
| fall（名词） | 拒用。数值减少用 "decrease"。FALL（动词）仅用于重力作用下的物理性下落："Make sure that the tools do not fall into the engine." |
| follow | 仅表示"跟在后面"，绝不表示"obey"。应写 "obey the instructions"。 |
| above、below | 仅表示物理位置。表示限值时写 "more than"、"less than"。 |

### 情态动词阶梯

| 你写的 | STE 写 |
|---|---|
| should（要求） | must |
| should（建议） | 删除，或陈述为事实："X is better because Y." |
| may / might / could（可能性） | can |
| may（许可） | can |
| would（假设） | 重组句式："If X occurs, Y occurs." |

### 冗词到简明表达的替换

此表为本指南自有，并非 ASD 词典。它将 AI 生成文档过度使用的词映射为直白替换词。若该词不承载任何事实，直接删除而非替换。

| 冗词 | 改为 |
|---|---|
| leverage、utilize | use |
| in order to | to |
| prior to | before |
| ensure | make sure that（严格模式；务实模式下，若 ensure 是你唯一选定的核查动词，则允许使用） |
| it is worth noting that | （删除） |
| it's important to、crucially | （删除——直接陈述事实） |
| simply、just、easily、seamlessly、effortlessly | （删除） |
| robust、powerful、comprehensive、performant | （删除，或给出可测量的属性） |
| functionality | function、feature |
| enables you to、allows you to | you can |
| is designed to、aims to | （删除——直接说明它做什么） |
| facilitate | help、make possible |
| dive into、delve into | read、examine |
| when it comes to | for |
| in the event that | if |
| due to the fact that | because |
| as needed、as necessary | （说明条件） |
| and/or | 择其一，或写 "X, or Y, or both" |
| e.g. / i.e. / etc. | for example / that is /（列出各项名称） |
| gracefully handles | （说明具体行为："retries three times, then stops"） |
| out of the box | by default |
| under the hood | internally |
| blazingly fast、state-of-the-art | fast（给出数字）/（删除） |
| streamline | make simpler、make faster |
| plethora、myriad | many |
| addresses the issue、tackles | corrects the fault、removes the error |

### 一致性核查

将同义词轮换合并为每义一词（规则 1.11、9.4）。下面两份清单的处理方式不同。

**技术名词——不在词典中。择一并保持一致（两种模式皆是）：**

- config / configuration / settings / options → 择其一

**词典裁定——标准已作出选择。使用核准词（严格模式）；择一并保持一致（务实模式）：**

| 你写的 | 词典状态 | 改为 |
|---|---|---|
| check（动词）/ verify / confirm / ensure | 作动词均被拒 | `make sure that`（严格）；择其一（务实） |
| validate | 不在词典中 | 作为技术动词使用（规则 1.12），或替换为 `make sure that` |
| delete / drop（动词）/ destroy | 均被拒 | `erase`（数据）、`remove`（物理对象）；避免 `drop` 与 `destroy` |
| remove | 核准动词 | 保留 |
| run / execute | 均被拒 | run 用 `operate`，execute 用 `do`（严格）；择其一（务实） |
| invoke / launch | 不在词典中 | 作为技术动词使用（规则 1.12） |
| issue | 不在词典中 | 作为技术名词使用，或替换为 `problem`（核准词） |
| failure | 一般用法中拒用；作性能损失的技术名词时核准 | 仅在表示性能错误时使用："a failure of the pump" |
| error | 核准名词 | 保留 |
| problem | 核准名词 | 保留 |

## 不可改动项

以下是技术名称（规则 1.5、8.6）。即使它们违反词汇规则，也必须保持原样：

- 代码块、行内代码、标识符、CLI 命令、命令行标志、文件路径
- 引用的错误信息和日志行
- 产品名称、API 端点名称、配置键
- 带单位的数字 —— 每个在句子长度限制中算作一个单词

## 文档之外的用法

规则相同，目标不同。完整适配方案见 `references/use-cases.md`：

- **错误信息**：说明发生了什么（一般过去时），已知原因，然后将修复方法写成祈使句。不要 "Oops"，不要 "Please ensure"，不要道歉性填充词。
- **运行手册**：STE 的主场。祈使步骤，条件在前，警告放在步骤之前。
- **事故报告**：只用一般过去时。"We have identified an issue that may have impacted" 改为 "Between 14:02 and 14:31 UTC, 12% of requests failed."
- **发布说明**：破坏性变更遵循警告模式 —— 命令在前，风险在后。
- **智能体指令（提示词、AGENTS.md）**：系统提示词是写给无法提问的读者的操作流程。每句一条指令，不用 "should"，条件在前。
- **翻译准备**：STE 的初衷。一词一义加上完整的语法消除了大部分翻译歧义。

## 交付前自检

此步骤不可跳过。对草稿运行以下四项检查：

1. 数出你最长三句的单词数。超过 20/25 的限制 → 拆分。
2. 在草稿中搜索：`'ll`、`'re`、`'s`（缩略形式）、`has been`、`have been`、`should`、逗号后的 `-ing` 动词、分号。
3. 搜索每一个 `if` 和 `when`。每一个都必须位于其句子的开头，在命令之前。"Increase the timeout if the network is slow" → "If the network is slow, increase the timeout."
4. 搜索你在「你的任务」第 3 步中没有选用的动词（check/verify/confirm 那一组）。将每一处替换为你选定的动词。

修正发现的问题，然后交付。如需完整审查，运行 `references/checklist.md`。

## 完整示例

**改前（真实未编辑的 AI 输出）：**

> **Connection timeouts.** If sqlpipe hangs or fails with `dial tcp: i/o timeout`, check that the host running sqlpipe can reach the Postgres port (usually 5432) — this is often a security group or firewall rule blocking the connection. If you're connecting to a managed database (RDS, Cloud SQL, etc.), confirm the instance allows connections from sqlpipe's IP. You can also try increasing `source.connect_timeout_seconds` in your config, since a slow network path can trip the default timeout even when the connection eventually succeeds.

**改后（分类流程文，动词 = "make sure"，条件在前，每句一条指令）：**

> **Connection timeouts.** sqlpipe stops with `dial tcp: i/o timeout` when it cannot reach the Postgres port (5432 by default).
>
> 1. Make sure that the host that runs sqlpipe can reach the Postgres port. A firewall or security group usually blocks it.
> 2. If the database is managed (RDS, Cloud SQL), make sure that the instance accepts connections from the IP of sqlpipe.
> 3. If the network is slow, increase `source.connect_timeout_seconds` in the configuration.

变化之处：40 词的句子拆分到 20 词以下；"you're" 展开；"check/confirm" 统一为 "make sure that"；每个条件都移到了对应命令之前；删除了 "etc."；代码和错误字符串未改动。

## 局限

STE 适用于技术事实和指令。不要将其应用于营销文案、博客语调或品牌写作 —— 它按设计消除了说服力。当用户要求对营销文本使用 STE 时，说明这一点，并改为建议将其用于文档。

本技能是非官方辅助工具。它与 ASD 或 STEMG 无关联，也未获得其认可，且没有任何工具能保证符合 STE。ASD-STE100 是 ASD 的注册商标。官方标准可在 asd-ste100.org 免费下载。

## 参考

- `references/checklist.md` —— 带可搜索模式的完整验证流程，用于检查模式和最终审查
- `references/use-cases.md` —— 长文档适配：错误信息、运行手册、事故报告、提交信息、UI 文案、国际化
