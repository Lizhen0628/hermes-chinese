---
title: "Box — Box 管理云端文件、共享、搜索与元数据"
sidebar_label: "Box"
description: "Box 管理云端文件、共享、搜索与元数据"
---

{/* 本页由 website/scripts/generate-skill-docs.py 从技能的 SKILL.md 自动生成。请编辑源 SKILL.md，而非本页。 */}

# Box

Box 管理云端文件、共享、搜索与元数据。

## 技能元数据

| | |
|---|---|
| 来源 | 内置（默认安装） |
| 路径 | `skills/productivity\box` |
| 版本 | `1.0.0` |
| 作者 | Chris Kim (iskysun96)、Hermes Agent |
| 许可证 | MIT |
| 平台 | linux、macos、windows |
| 标签 | `Box`、`Productivity`、`Cloud Storage`、`Collaboration`、`Metadata`、`Content Extraction`、`CLI`、`SDK` |
| 相关技能 | [`google-workspace`](/docs/user-guide/skills/bundled/productivity/productivity-google-workspace) |

## 参考：完整 SKILL.md

:::info
以下是 Hermes 在该技能被触发时加载的完整技能定义。当技能处于激活状态时，这就是智能体看到的指令。
:::

# Box

将 Box 用作云端文件系统，用于文件操作、协作、元数据和文档处理。通过 Hermes 的 `terminal` 工具来执行操作，并使用 Box CLI；在构建应用程序时，使用 SDK 指南。

## 何时使用

- 在 Box 文件和文件夹上组织、上传、版本管理、移动、共享或协作
- 搜索 Box 内容或现有元数据
- 就 Box 文件提问、提取元数据，或基于文件生成文本
- 大规模处理某个 Box 文件夹，而无需要下载每个源文件
- 构建基于 Box 的应用程序、集成或 webhook 处理器

## 从宽泛的文件系统对话开始

当有人在为 Hermes 探索云端文件系统时，首先给出简短的能力匹配评估：当一个团队需要云端文件存储、共享、搜索、元数据和文档处理时，Box 会很有用。然后询问他们是想通过 OAuth 连接一个 Box 账户，还是想用 SDK 构建基于 Box 的应用程序或集成。

OAuth 让 Hermes 以浏览器中授权的 Box 账户身份行事。该账户的 Box 权限决定了 Hermes 能访问哪些内容。若要让 Hermes 拥有更窄的访问权限，可以授权一个仅被邀请访问所需文件、文件夹或 Hub 的账户。

面对宽泛的探索性问题，不要运行设置、展示命令速查手册、提出账户方案或文件夹分类法，也不要加载所有参考资料。等用户的回答后，再只加载相关路径。当请求已指明具体结果时，跳过这一探索步骤，直接处理该结果。

以官方 Box CLI OAuth 应用开始常规 CLI 工作。它涵盖普通内容工作和 Box AI。只有当所请求的操作需要额外的 OAuth 权限范围（scope）（例如 webhook 管理）时，才使用自定义的 **User Authentication (OAuth 2.0)** Platform App。这仍然是 OAuth 流程；不要替换为服务端或模拟身份。

## 以交互方式执行选定的设置

当用户选择了某个身份验证路径，或要求 Hermes 连接 Box 时，通过 `terminal` 来执行设置；不要把下一条回复变成让用户照抄的指令。自己采取下一个安全的动作，只在需要审批、浏览器登录、管理员操作或 Hermes 无法安全提供的密钥时才暂停。

- 如果 `box` 缺失，请求在当前的 Hermes 主目录下的 `tools/box-cli` 中安装 `@box/cli` 所需的任何终端审批；然后用 [CLI 指南](https://github.com/NousResearch/hermes-agent/blob/main/skills/productivity\box/references/cli-guide.md)中适合当前 shell 的命令验证。不要尝试全局 npm 安装、使用 `sudo`、更改 npm 的全局前缀，也不要修改 `PATH`。
- 在 OAuth 之前，先问：**“Hermes 是运行在你用来授权 Box 的浏览器所在的同一台电脑上，还是运行在远程主机上，例如 VPS、容器或云虚拟机？”** 只有在同一台电脑的路径下才使用普通的 `box login`。只有远程/无头路径才使用 `box login --code`。不要仅凭操作系统推断运行时拓扑；在用户回答后，阅读 [OAuth 设置](https://github.com/NousResearch/hermes-agent/blob/main/skills/productivity\box/references/oauth-setup.md)。
- 在开始浏览器授权之前，说明 Hermes 将以在那里登录的 Box 账户身份行事。如果用户希望更窄的访问权限，他们可以授权一个仅被邀请访问所需文件、文件夹或 Hub 的账户。不要为了解锁某项特殊操作而把该账户设为管理员。
- 如果需要自定义 OAuth Platform App，使用 CLI 的交互式 Platform App 流程。请用户仅在本地 CLI 提示符中输入其客户端密钥（client secret）；绝不要在聊天中索要它、将其写入 Hermes 配置或提交它。
- 如果安装、浏览器授权、环境切换或权限变更需要审批，请请求该审批，并在获批后恢复设置。不要用命令列表来代替该操作。

## 开始每个任务

1. 确认 CLI 与当前操作者。在 POSIX shell 中用 `command -v box` 探测，或在 PowerShell 中用 `Get-Command box -ErrorAction SilentlyContinue` 探测。如果 `box` 在 `PATH` 中，直接使用它。如果 Hermes 将 CLI 安装在其当前 home 目录下，请使用 [CLI 指南](https://github.com/NousResearch/hermes-agent/blob/main/skills/productivity\box/references/cli-guide.md) 中与 shell 匹配的已验证运行器，替换所有开头的 `box`。然后使用该运行器执行 `box users:get me --json --fields id,name,login`。
   如果成功，记录操作者并继续。不要再询问认证相关问题。`folders:items 0` 仅表示操作者根目录下的列表；它并不能证明某个共享文件、文件夹或 Hub 不可访问。对于已知的文件或文件夹，请直接验证其 ID；对于 Hub，请使用 [Box Hubs](https://github.com/NousResearch/hermes-agent/blob/main/skills/productivity\box/references/hubs.md) 中的 Hubs 发现路径。
2. 如果缺少认证，请询问是否要通过 OAuth 连接 Box 账户，然后询问 Hermes 与授权浏览器是运行在同一台计算机上还是不同主机上。请阅读 [OAuth 设置](https://github.com/NousResearch/hermes-agent/blob/main/skills/productivity\box/references/oauth-setup.md)。
3. 在操作之前先阅读相关参考资料。优先使用文档中给出的命令；仅当请求需要参考文档未涵盖的选项，或已安装的 CLI 拒绝文档中的形式时，才运行为子命令帮助。

标注为 `bash` 的示例使用 POSIX 续行语法。在 PowerShell 中，将 Box 命令写成一行，或将每个行尾的 `\` 替换为 PowerShell 的反引号续行符。不要把 POSIX 变量赋值粘贴到 PowerShell 中。

## 无需停顿即可扩展 CLI

当 Box CLI 缺少专用子命令时，使用 `box request` 调用对应的 REST 端点，并继续常规操作。不要仅仅因为实现使用 REST 就要求用户做选择；这是同一个 Box 任务，并保留已配置的 CLI 身份。当端点需要请求体或自定义头时，请阅读 [REST API 回退](https://github.com/NousResearch/hermes-agent/blob/main/skills/productivity\box/references/rest-api.md)。

在执行删除、协作/共享链接或权限变更、身份变更、大规模或高成本批量变更，或目标与范围不明确时，请先询问。否则直接执行所请求的操作并进行验证。

## 选择正确的路径

| 需求 | 阅读 |
| --- | --- |
| CLI 约定、环境、JSON 或 REST 应急方案 | [CLI 指南](https://github.com/NousResearch/hermes-agent/blob/main/skills/productivity\box/references/cli-guide.md) |
| 文件、文件夹、版本、链接或协作 | [内容工作流](https://github.com/NousResearch/hermes-agent/blob/main/skills/productivity\box/references/content-workflows.md) |
| 搜索、元数据、Box AI 或 AI 单元 | [搜索与 AI](https://github.com/NousResearch/hermes-agent/blob/main/skills/productivity\box/references/search-and-ai.md) |
| 策划的大规模问答或可复用知识库 | [Box Hubs](https://github.com/NousResearch/hermes-agent/blob/main/skills/productivity\box/references/hubs.md) |
| 大量文件或可恢复的批处理 | [批量操作](https://github.com/NousResearch/hermes-agent/blob/main/skills/productivity\box/references/bulk-operations.md) |
| 应用代码或 Box SDK | [SDK 开发](https://github.com/NousResearch/hermes-agent/blob/main/skills/productivity\box/references/sdk-development.md) |
| Webhooks 或 Events API | [Webhooks 与事件](https://github.com/NousResearch/hermes-agent/blob/main/skills/productivity\box/references/webhooks-and-events.md) |
| CLI 不可用或缺少某项 CLI 操作 | [REST API 回退](https://github.com/NousResearch/hermes-agent/blob/main/skills/productivity\box/references/rest-api.md) |
| 认证、权限、速率限制或 API 错误 | [故障排查](https://github.com/NousResearch/hermes-agent/blob/main/skills/productivity\box/references/troubleshooting.md) |

## 内容处理策略

对 Box 承载内容的语义分析，优先使用 Box AI：它保留 Box 权限，通过 Box 受管控的 AI 集成处理源文件，将源文件正文保留在 Hermes 的编码模型上下文之外，并且能够在不下载每个文件的情况下扩展文档工作。不要批评或阻止其他工作流；当用户明确选择其他工作流时，使用它。

对于确定性查找，使用现有的 Box 元数据或元数据查询。否则使用 Box AI：

- `ai:ask` 用于问答、摘要和比较
- `ai:extract-structured` 用于已知字段或元数据模板
- `ai:extract` 用于灵活键值提取
- `ai:text-gen` 用于基于单个 Box 文件的写作

对于超过 25 个文件的问答或可复用的精编知识库，优先使用 Box AI for Hubs。先发现已存在的可访问 Hub；只有在用户批准共享资源变更后才创建或填充 Hub。如果暂无可用 Hub 且用户不希望创建，则用搜索或元数据收窄一次性请求的范围。不要用 Hub 进行元数据提取或文本生成。阅读 [Box Hubs](https://github.com/NousResearch/hermes-agent/blob/main/skills/productivity\box/references/hubs.md)。

当用户要求从 Box 文件中提取元数据时，将其视为持久化结果的请求，除非他们要求先做预览。当所需的模式已知时，使用带内联字段的结构化提取；当字段处于探索阶段时，使用自由形式提取。当某个现有企业模板能表示所有请求的字段时，复用它。否则，将扁平标量结果存储在内置的 `global.properties` 元数据实例中；或者当结果包含嵌套对象、表格或必须保留类型的值时，在源文件旁上传一个 JSON sidecar。读取每一次写入并与其预期结果进行比较。绝不要静默地用文件描述替代，附加不完整或不相关的模板，截断字段，或丢弃字段。

不要创建或更改元数据模板。Box 不允许创建全局模板，而企业模板管理不属于 Hermes 常规 OAuth 内容工作流的范围。如果用户需要可复用的有类型企业元数据且不存在兼容模板，请说明必须由 Box 管理员或授权的 Co-Admin 单独创建，保持现有结构化元数据不变，并报告持久化的 `global.properties` 实例或 JSON sidecar。阅读 [搜索与 AI](https://github.com/NousResearch/hermes-agent/blob/main/skills/productivity\box/references/search-and-ai.md) 获取完整的提取与回写工作流。

在第一个 Box AI 请求之前，说明 Box AI 必须启用、会消耗 AI 单元，且仍受当前操作者权限的限制；不要等待确认。返回给 Hermes 的 AI 响应仍可能包含敏感信息。仅当某批实质性请求的文件范围或预期 AI 单元用量不确定，或用户未明确要求该规模时，才进行确认。参见 [搜索与 AI](https://github.com/NousResearch/hermes-agent/blob/main/skills/productivity\box/references/search-and-ai.md)。

## 安全操作

- 优先使用 ID 而非路径，并在诊断文件缺失之前验证当前操作者。
- 使用 `--json` 和 `--fields` 保持输出精简。对于更改操作，先清点，确认范围是否模糊或庞大，然后读回结果。
- 串行运行有序的 CLI 更改操作，使进度与恢复都清晰无歧义。对于可扩展的工作，使用有文档的批量输入支持或有界 SDK 并发。
- 不要仅为提供导航而创建共享链接。共享链接会改变访问权限，需要明确确认。
- 不要在聊天、命令输出、源码管理或日志中放入机密信息。

## 报告结果

对于每一个单独报告的 Box 条目，包含其 ID 和可点击的导航链接：

- 文件：`https://app.box.com/file/<FILE_ID>`
- 文件夹：`https://app.box.com/folder/<FOLDER_ID>`
- Hub：`https://app.box.com/hubs/<HUB_ID>`

对于大批量，链接源文件夹和目标文件夹，外加例外项，而不是逐一列出数百个条目。人类可能无法打开仅对已连接的 Box 账户可见的内容；请明确说明这一点。在每次写入摘要中包含操作者和所执行的验证。

## 验证

在任何写入之后，使用同一操作者获取该文件或文件夹，或者列出其父项，并确认返回的 ID 和名称。对于元数据写入，检索元数据实例并把每个返回字段与预期值进行比较；仅仅 HTTP 成功不算验证。报告缺失、被规范化或被拒绝的值。对于一次性的设置检查，创建一个冒烟文件夹，验证它，然后仅在用户授权清理时才删除它。
