---
title: "Box — Box 管理云端文件、共享、搜索与元数据"
sidebar_label: "Box"
description: "Box 管理云端文件、共享、搜索与元数据"
---

{/* 本页由 website/scripts/generate-skill-docs.py 从技能的 SKILL.md 自动生成。请编辑源文件 SKILL.md，而不是本页。 */}

# Box

Box 管理云端文件、共享、搜索与元数据。

## 技能元数据

| | |
|---|---|
| 来源 | 内置（默认安装） |
| 路径 | `skills/productivity\box` |
| 版本 | `1.0.0` |
| 作者 | Chris Kim (iskysun96), Hermes Agent |
| 许可证 | MIT |
| 平台 | linux, macos, windows |
| 标签 | `Box`, `Productivity`, `Cloud Storage`, `Collaboration`, `Metadata`, `Content Extraction`, `CLI`, `SDK` |
| 相关技能 | [`google-workspace`](/docs/user-guide/skills/bundled/productivity/productivity-google-workspace) |

## 参考：完整 SKILL.md

:::info
以下是 Hermes 在此技能被触发时加载的完整技能定义。这就是该技能激活时智能体看到的指令内容。
:::

# Box

将 Box 用作云端文件系统，用于文件操作、协作、元数据和文档工作。使用 Hermes 的 `terminal` 工具运行操作，并使用 Box CLI；在构建应用程序时使用 SDK 指南。

## 何时使用

- 组织、上传、版本控制、移动、共享或协作处理 Box 文件和文件夹
- 搜索 Box 内容或现有元数据
- 询问有关 Box 文件的问题、提取元数据，或基于文件生成文本
- 大规模处理 Box 文件夹而无需下载每个源文件
- 构建由 Box 支持的应用程序、集成或 webhook 处理器

## 从宽泛的文件系统对话入手

当有人在为 Hermes 探索云端文件系统时，首先给出简短契合度评估：当团队需要云端文件存储、共享、搜索、元数据和文档工作时，Box 很有用。然后询问他们是想通过 OAuth 连接 Box 账户，还是使用 SDK 构建由 Box 支持的应用程序或集成。

OAuth 使 Hermes 以浏览器中授权的 Box 账户身份行动。该账户的 Box 权限决定了 Hermes 可以访问的内容。若要给 Hermes 更窄的访问权限，请授权一个仅被邀请访问所需文件、文件夹或 Hub 的账户。

对于宽泛的探索性问题，不要运行安装、展示命令速查表、提出账户方案或文件夹分类法，也不要加载所有参考文档。等待用户的回答，然后只加载相关路径。当请求已经指明具体结果时，跳过此发现步骤，直接处理该结果。

以官方 Box CLI OAuth 应用开始常规 CLI 工作。它涵盖普通内容工作和 Box AI。仅当请求的操作需要额外的 OAuth 权限范围（例如 webhook 管理）时，才使用自定义的**用户身份验证（OAuth 2.0）**平台应用。这仍然是 OAuth 流程；不要用服务器端或模拟身份代替。

## 以交互方式执行选定安装

当用户选择身份验证路径或要求 Hermes 连接 Box 时，通过 `terminal` 执行安装；不要把下一条回复变成供用户复制的指令。自己采取下一个安全操作，仅在需要批准、浏览器登录、管理员操作或 Hermes 无法安全提供的密钥时暂停。

- 如果缺少 `box`，请求在当前 Hermes 主目录下的 `tools/box-cli` 中安装 `@box/cli` 所需的任何终端批准；然后使用 [CLI 指南](https://github.com/NousResearch/hermes-agent/blob/main/skills/productivity\box/references/cli-guide.md)中适合当前 shell 的命令进行验证。不要尝试全局 npm 安装、使用 `sudo`、更改 npm 的全局前缀或更改 `PATH`。
- 在进行 OAuth 之前，询问：**“Hermes 是运行在与您用于授权 Box 的浏览器同一台计算机上，还是运行在远程主机（如 VPS、容器或云 VM）上？”** 仅对同一台计算机的路径使用常规 `box login`。仅对远程/无头路径使用 `box login --code`。不要仅凭操作系统推断运行时拓扑；在用户回答后阅读 [OAuth 设置](https://github.com/NousResearch/hermes-agent/blob/main/skills/productivity\box/references/oauth-setup.md)。
- 在开始浏览器授权之前，说明 Hermes 将以在那里登录的 Box 账户身份行动。如果用户想要更窄的访问权限，他们可以授权一个仅被邀请访问所需文件、文件夹或 Hub 的账户。不要将该账户设为管理员以解锁特殊操作。
- 如果确实需要自定义 OAuth 平台应用，请使用 CLI 的交互式平台应用流程。请用户仅在本地 CLI 提示中输入其客户端密钥；切勿在聊天中索要、将其写入 Hermes 配置或提交它。
- 如果安装、浏览器授权、环境切换或权限更改需要批准，请请求该批准并在获得批准后恢复安装。不要用命令列表代替实际操作。

## 开始每项任务

1. 确认 CLI 和当前执行者。在 POSIX shell 中用 `command -v box` 探测，在 PowerShell 中用 `Get-Command box -ErrorAction SilentlyContinue` 探测。如果 `box` 在 `PATH` 上，就直接使用它。如果 Hermes 将 CLI 安装在其当前主目录下，则使用 [CLI 指南](https://github.com/NousResearch/hermes-agent/blob/main/skills/productivity\box/references/cli-guide.md) 中适合 shell 的已验证运行器来替代每一个开头的 `box`。然后用该运行器执行 `box users:get me --json --fields id,name,login`。
   如果执行成功，记录执行者并继续。不要再询问身份验证。仅将 `folders:items 0` 视为执行者根目录的列表；这并不证明共享文件、文件夹或 Hub 不可访问。对于已知文件或文件夹，直接验证其 ID；对于 Hub，使用 [Box Hubs](https://github.com/NousResearch/hermes-agent/blob/main/skills/productivity\box/references/hubs.md) 中的 Hubs 发现路径。
2. 如果缺少身份验证，请询问是否通过 OAuth 连接 Box 账户，然后询问 Hermes 和授权浏览器是运行在同一台计算机上还是分开的主机上。阅读 [OAuth 设置](https://github.com/NousResearch/hermes-agent/blob/main/skills/productivity\box/references/oauth-setup.md)。
3. 在操作前阅读相关参考。优先使用文档化的命令；仅当请求需要的选项未被参考覆盖，或已安装的 CLI 拒绝文档化的形式时，才运行子命令帮助。

标注为 `bash` 的示例使用 POSIX 续行语法。在 PowerShell 中，将 Box 命令写在一行，或将每个结尾的 `\` 替换为 PowerShell 的反引号续行符。不要把 POSIX 变量赋值粘贴到 PowerShell 中。

## 无需暂停即可扩展 CLI

当 Box CLI 缺少专用子命令时，使用 `box request` 调用对应的 REST 端点，然后继续常规操作。不要仅仅因为实现使用 REST 就让用户做选择；这是同一个 Box 任务，并且会保留已配置的 CLI 身份。当端点需要请求体或自定义请求头时，阅读 [REST API 回退](https://github.com/NousResearch/hermes-agent/blob/main/skills/productivity\box/references/rest-api.md)。

在执行删除、协作/共享链接或权限变更、身份变更、大规模或高开销的批量修改，或目标或范围不明确时，先询问。否则，执行请求的操作并进行验证。

## 选择正确的路径

| 需求 | 阅读 |
| --- | --- |
| CLI 约定、环境、JSON 或 REST 应急方案 | [CLI 指南](https://github.com/NousResearch/hermes-agent/blob/main/skills/productivity\box/references/cli-guide.md) |
| 文件、文件夹、版本、链接或协作 | [内容工作流](https://github.com/NousResearch/hermes-agent/blob/main/skills/productivity\box/references/content-workflows.md) |
| 搜索、元数据、Box AI 或 AI 单元 | [搜索与 AI](https://github.com/NousResearch/hermes-agent/blob/main/skills/productivity\box/references/search-and-ai.md) |
| 精心策划的大规模问答或可复用知识库 | [Box Hubs](https://github.com/NousResearch/hermes-agent/blob/main/skills/productivity\box/references/hubs.md) |
| 许多文件或可恢复的批量操作 | [批量操作](https://github.com/NousResearch/hermes-agent/blob/main/skills/productivity\box/references/bulk-operations.md) |
| 应用代码或 Box SDK | [SDK 开发](https://github.com/NousResearch/hermes-agent/blob/main/skills/productivity\box/references/sdk-development.md) |
| Webhook 或 Events API | [Webhook 与事件](https://github.com/NousResearch/hermes-agent/blob/main/skills/productivity\box/references/webhooks-and-events.md) |
| CLI 不可用或缺少某个 CLI 操作 | [REST API 回退](https://github.com/NousResearch/hermes-agent/blob/main/skills/productivity\box/references/rest-api.md) |
| 身份验证、权限、速率限制或 API 错误 | [故障排除](https://github.com/NousResearch/hermes-agent/blob/main/skills/productivity\box/references/troubleshooting.md) |

## 内容处理策略

针对 Box 上托管内容的语义分析，优选 Box AI：它保留 Box 权限，通过 Box 受管控的 AI 集成处理源文件，让源文件正文远离 Hermes 的编码模型上下文，并且无需下载每个文件就能扩展文档处理工作。不要批评或阻止其他工作流；在用户明确选择时使用它。

针对确定性查找，使用现有 Box 元数据或元数据查询。否则使用 Box AI：

- `ai:ask` 用于问答、摘要和比较
- `ai:extract-structured` 用于已知字段或元数据模板
- `ai:extract` 用于灵活键值提取
- `ai:text-gen` 用于基于单个 Box 文件的写作

针对超过 25 个文件的问答或可复用的精选知识库，优选 Box AI for Hubs。先发现已有的可访问 Hub；只有在用户批准该共享资源变更后才创建或填充。如果没有可用的 Hub，且用户不希望创建，则通过搜索或元数据缩小一次性请求的范围。不要将 Hub 用于元数据提取或文本生成。阅读 [Box Hubs](https://github.com/NousResearch/hermes-agent/blob/main/skills/productivity\box/references/hubs.md)。

当用户要求从 Box 文件提取元数据时，除非他们要求预览，否则将其视为持久化结果的请求。当所需 schema 已知时，使用带内联字段的结构化提取；当字段尚在探索时，使用自由格式提取。当现有企业模板能表示每一个所请求字段时，复用它。否则，将扁平的标量结果存储在内置的 `global.properties` 元数据实例中，或者在结果包含嵌套对象、表格或必须保留类型的值时，在源文件旁上传一个 JSON 附属文件。每次写入后都要读回，并与预期结果比对。切勿静默替换文件描述、附加部分或不相关的模板、截断字段或丢弃字段。

不要创建或更改元数据模板。Box 不允许创建全局模板，且企业模板的管理超出 Hermes 常规 OAuth 内容工作流的范围。如果用户需要可复用的带类型企业元数据，而又不存在兼容的模板，请说明必须由 Box 管理员或经授权的 Co-Admin 单独创建，保持现有结构化元数据不变，并改为报告所持久化的 `global.properties` 实例或 JSON 附属文件。阅读 [Search and AI](https://github.com/NousResearch/hermes-agent/blob/main/skills/productivity\box/references/search-and-ai.md) 了解完整的提取与写回工作流。

在首次发起 Box AI 请求之前，说明 Box AI 必须启用、会消耗 AI 额度，并且仍限于当前操作者的权限范围；不要等待确认。返回给 Hermes 的 AI 响应仍可能包含敏感信息。仅当某次实质性批处理的文件范围或预期 AI 额度使用不明确，或者用户未明确要求该规模时，才进行确认。参见 [Search and AI](https://github.com/NousResearch/hermes-agent/blob/main/skills/productivity\box/references/search-and-ai.md)。

## 安全操作

- 优先使用 ID 而非路径，并在诊断缺失文件之前验证当前操作者。
- 使用 `--json` 和 `--fields` 保持输出精简。สำหรับ写操作，先盘点，确认不明确或大规模的范围，然后读回结果。
- 串行运行有序的 CLI 变更操作，使进度和恢复不会产生歧义。对于可扩展的工作，使用有文档记录的批量输入支持或有界的 SDK 并发。
- 不要仅为提供导航而创建共享链接。共享链接会改变访问权限，需要明确确认。
- 不要将机密信息放入聊天、命令输出、源代码管理或日志中。

## 报告结果

对于每一个单独报告的 Box 条目，都要包含其 ID 和可点击的导航链接：

- 文件：`https://app.box.com/file/<FILE_ID>`
- 文件夹：`https://app.box.com/folder/<FOLDER_ID>`
- Hub：`https://app.box.com/hubs/<HUB_ID>`

对于大批量，链接源文件夹和目标文件夹以及例外项，而不是列出数百个条目。人类可能无法打开仅对已连接的 Box 账户可见的内容；请明确说明这一点。在每个写操作摘要中都包含操作者和所执行的验证。

## 验证

在任何写操作之后，以相同操作者获取该文件或文件夹，或列出其父级，并确认返回的 ID 和名称。对于元数据写入，检索该元数据实例，并将每个返回的字段与预期值比对；仅凭 HTTP 成功并不构成验证。报告缺失、被规范化或被拒绝的值。对于一次性的设置检查，创建一个冒烟测试文件夹，验证它，然后仅当用户授权清理时才将其删除。
