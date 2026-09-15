---
sidebar_position: 4
title: "哪个文件负责什么？"
description: "SOUL.md vs USER.md vs MEMORY.md vs AGENTS.md——一页看懂智能体的各类文件，每份由谁撰写，以及智能体何时真正看到它们"
---

# 哪个文件负责什么？

“我跟智能体说了一件事，结果它忘了。” “哪个文件才是智能体的大脑？” “我编辑了 SOUL.md——为什么它还是不知道我的名字？” 这些问题归根结底都是同一件事：Hermes Agent 由若干个 markdown 文件塑造，每个文件承担不同的职责。本页将它们汇于一处。若需深入了解其中任何一个，请点击链接查看[持久记忆](/user-guide/features/memory)、[个性与 SOUL.md](/user-guide/features/personality)和[上下文文件](/user-guide/features/context-files)。

## 总览表

| 文件 | 存放内容 | 由谁撰写 | 智能体何时看到它 | 所在位置 |
|------|---------------|---------------|------------------------|----------------|
| **SOUL.md** | 智能体的主要身份——个性、语气、沟通风格、在文风上应避免什么 | 你。若文件不存在，Hermes 会自动播种一个初始文件；已存在的文件绝不会被覆盖 | 会话开始时，系统提示词的第 1 槽位 | `~/.hermes/SOUL.md`（或使用自定义 home 时的 `$HERMES_HOME/SOUL.md`）——绝不会是工作目录 |
| **USER.md** | 用户配置档——你的姓名、角色、偏好、沟通风格、期望 | 智能体，通过 `memory` 工具（你可以用 `write_approval` 控制保存，或通过 `hermes journey edit` 编辑条目） | 会话开始时，作为冻结快照注入系统提示词 | `~/.hermes/memories/` |
| **MEMORY.md** | 智能体的个人笔记——环境事实、项目约定、工具怪癖、学到的东西 | 智能体，通过 `memory` 工具（与 USER.md 相同的控制和编辑选项） | 会话开始时，作为冻结快照注入系统提示词 | `~/.hermes/memories/` |
| **AGENTS.md** | 项目说明、约定、架构——命令、端口、路径、特定于仓库的工作流 | 你（或项目的作者） | 启动时从你的工作目录加载进系统提示词；当智能体浏览子目录时，会逐步发现嵌套的副本 | 项目工作目录及子目录 |
| **.hermes.md** / **HERMES.md** | 项目说明，类似 AGENTS.md，但为 Hermes 专属，优先级最高 | 你 | 启动时加载进系统提示词（第一个匹配项优先于 AGENTS.md） | 你的项目——发现过程会向上查找到 git 根目录 |

:::info 每个会话仅加载一个项目上下文文件
每个会话只加载**一种**项目上下文类型，第一个匹配项胜出：`.hermes.md` → `AGENTS.md` → `CLAUDE.md` → `.cursorrules`。`SOUL.md` 始终作为智能体身份独立加载——它不属于该优先级链。完整列表（包括 `CLAUDE.md` 和 `.cursorrules` 兼容性）见[上下文文件](/user-guide/features/context-files)。
:::

一个有用的速记：

- **SOUL.md** 是智能体是*谁*——如果某个内容应该处处伴随你，它就归属这里。
- **USER.md** 是*你*是谁——智能体为你维护它。
- **MEMORY.md** 是智能体*学到*了什么——它也自行维护这个文件。
- **AGENTS.md**（或 `.hermes.md`）是*项目*需要什么——如果某个内容属于某个项目，它就归属这里。

## “为什么它忘了我刚刚说的话？”

记忆（MEMORY.md 和 USER.md）是在会话开始时一次性捕获的**冻结快照**，被注入到系统提示词中——当智能体在会话中途保存某个内容时，改动会立即持久化到磁盘，但在下一个会话开始之前不会出现在系统提示词中。这是有意为之：它为提升性能而保留了 LLM 的前缀缓存，而且工具响应始终显示实时状态，所以什么都不会丢失——开启新会话，更新后的记忆就在那里。完整细节见[记忆如何出现在系统提示词中](/user-guide/features/memory#how-memory-appears-in-the-system-prompt)。

## 常见混淆

### “我把关于我自己的事实放进了 SOUL.md，但 USER.md 还是空的”

`SOUL.md` 和 `USER.md` 是两套互不馈送的系统。`SOUL.md` 是一个**由你**直接编辑的个性文件——它塑造语气和身份，其内容原样注入为提示词的第 1 槽位。`USER.md` 是持久记忆的一部分，由**智能体**通过 `memory` 工具撰写。如果你想把关于你自己的事实放进 USER.md，告诉智能体（“记住我偏好简洁的回答”），它便会保存——编辑 SOUL.md 不会填充记忆，记忆条目也不会改变人设。用 SOUL.md 承载持久的语音与个性指引；把偏好和配置档事实留给记忆。见[SOUL.md 里应该放什么？](/user-guide/features/personality#what-should-go-in-soulmd)和[两个目标详解](/user-guide/features/memory#two-targets-explained)。

### “我在会话中途告诉了它我的名字，它却一副从没听过的样子”

如果智能体把你的名字保存进了记忆，那保存就是成功的——用 `memory` 工具的响应或 `hermes journey list` 来查看。你所看到的是上面的冻结快照规则：系统提示词不会在会话中途刷新，所以*注入的*记忆块仍显示会话开始时的状态。智能体在当次对话中仍能使用你告诉它的内容（它就在上下文中），而保存的条目会从下一个会话起出现在系统提示词中。对你在会话运行期间对 `SOUL.md` 或 `AGENTS.md` 所做的编辑也是如此：上下文在会话开始时组装，所以要重启会话才能采纳更改。

:::tip 快捷决策指南
- 想改变智能体**说话的方式**？编辑 `~/.hermes/SOUL.md`——[个性与 SOUL.md](/user-guide/features/personality)。
- 想让智能体**记住一个事实**？直接告诉它就行——它会自行保存到记忆。[持久记忆](/user-guide/features/memory)。
- 想设置**项目规则**？在项目里放一个 `AGENTS.md`（或 `.hermes.md`）——[上下文文件](/user-guide/features/context-files)。
- 需要**临时**改变个性？使用 `/personality`——它是会话级叠加，无需编辑文件。
:::

## 相关文档

- [持久记忆](/user-guide/features/memory) —— MEMORY.md、USER.md、`memory` 工具、容量限制、`write_approval`
- [个性与 SOUL.md](/user-guide/features/personality) —— SOUL.md 内容指引、`/personality` 预设、提示词堆栈
- [上下文文件](/user-guide/features/context-files) —— AGENTS.md、`.hermes.md`、渐进式发现、安全扫描
