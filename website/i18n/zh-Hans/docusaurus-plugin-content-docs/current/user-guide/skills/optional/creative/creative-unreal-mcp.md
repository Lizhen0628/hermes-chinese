---
title: "Unreal Mcp — 自动化 Unreal Engine 编辑器场景、Actor 与渲染"
sidebar_label: "Unreal Mcp"
description: "自动化 Unreal Engine 编辑器场景、Actor 与渲染"
---

{/* 本页由 website/scripts/generate-skill-docs.py 从技能的 SKILL.md 自动生成。请编辑源文件 SKILL.md，而非本页。 */}

# Unreal Mcp

自动化 Unreal Engine 编辑器场景、Actor 与渲染。

## 技能元数据

| | |
|---|---|
| Source | 可选 — 使用 `hermes skills install official/creative/unreal-mcp` 安装 |
| Path | `optional-skills/creative\unreal-mcp` |
| Version | `1.0.0` |
| Author | Hermes Agent |
| License | MIT |
| Platforms | linux, macos, windows |
| Tags | `unreal`, `unreal-engine`, `ue5`, `3d`, `mcp`, `scenes`, `cinematics`, `lighting`, `gamedev` |

## 参考：完整 SKILL.md

:::info
以下是 Hermes 在触发此技能时加载的完整技能定义。技能激活时，智能体看到的就是这些指令。
:::

# Unreal Engine MCP 技能

Hermes MCP 目录中 `unreal-engine` 条目的配套技能。该 MCP 服务器（Epic 官方的实验性 “Unreal MCP” 插件，内部 id 为 `ModelContextProtocol`）运行在 Unreal 编辑器进程**内部**，将编辑器功能以类型化工具的形式暴露出来。本技能教你如何高效驱动它：发现实时工具集、安全地为调用排序、将日常英语需求转化为真正好看的场景，并以视觉方式验证工作成果。用户除了启动编辑器之外，不应需要接触编辑器。

## 何时使用

当用户希望在 Unreal Engine 中完成任何事情时使用：搭建或装饰关卡、生成/移动/删除 Actor、设置光照与氛围、创建或调整材质实例、取景相机镜头、截图或渲染、导入资产、检查场景或 UI、运行自动化测试，或为编辑器编写脚本。适用于单一操作（“把太阳调成黄金时刻”），也适用于完整的多步骤项目（“给我建一片有营火的阴森林间空地，并渲染一个镜头”）。

不适用于：DCC 式网格建模/雕刻（在 Blender 中建模并导入结果），或编辑 Unreal C++ 项目源码（那属于普通代码工作——使用终端；本技能针对的是实时编辑器）。

## 前提条件

分两半，按此顺序：必须先启动编辑器侧，然后 Hermes 才能连接。

### 一次性，编辑器侧

1. 已打开项目的 Unreal Editor **5.8+**。（macOS：必须安装完整 Xcode 并接受其许可协议——否则编辑器会在首次启动时退出；见“常见坑”。）
2. **Edit > Plugins**——启用 **Unreal MCP**（其 Toolset Registry 依赖项会自动启用）。在提示时重启编辑器。
3. 类型化工具集与服务器是分开随附的：还需在同一个 Plugins 浏览器中启用 **AllToolsets** 插件。Unreal MCP 本身不附带任何工具——AllToolsets 提供随附的工具集（SceneTools、ActorTools、MaterialInstanceTools、ObjectTools……）；跳过它，服务器虽能连接，但智能体没有任何可调用的工具。
4. **Edit > Editor Preferences > General > Model Context Protocol**——启用 **Auto Start Server**。默认绑定为 `http://127.0.0.1:8000/mcp`（端口/路径可在同一面板中配置；服务器名称为 `unreal-mcp`）。若要改为手动启动，在编辑器控制台中（按反引号键）运行 `ModelContextProtocol.StartServer`。

### 一次性，Hermes 侧

    hermes mcp install unreal-engine

这会写入 `mcp_servers.unreal-engine` HTTP 条目，指向 `http://127.0.0.1:8000/mcp`，并探测实时服务器以获取其工具。请在编辑器 + 服务器均已启动时运行它，以便探测能看到真实工具集。如果用户在 Editor Preferences 中更改了端口/路径，请编辑 `~/.hermes/config.yaml` 中 `mcp_servers.unreal-engine` 下的 `url` 以匹配。

请勿为 Hermes 使用 `ModelContextProtocol.GenerateClientConfig`——那是为 Claude Code/Cursor 等写入 `.mcp.json` 风格文件的。Hermes 通过目录条目从 `config.yaml` 连接。

### 每次会话

1. 启动 Unreal Editor，等待项目加载完成；确认服务器已启动（Output Log 会显示绑定地址，或手动运行 `ModelContextProtocol.StartServer`）。
2. 启动 Hermes 会话。工具会以 `mcp_unreal_engine_*` 注册。如果缺失：编辑器未先启动——启动它，然后新开一个 Hermes 会话。
3. 健全性检查：调用 `mcp_unreal_engine_list_toolsets`，确认工具集返回正常。

## 工具面：发现，而非固定列表

默认情况下，插件以**工具搜索模式**运行：`tools/list` 只返回三个元工具，每个真实工具都通过它们访问。通过 Hermes 呈现为：

| Hermes 工具 | 用途 |
|---|---|
| `mcp_unreal_engine_list_toolsets` | 每个已注册工具集的名称 + 描述 |
| `mcp_unreal_engine_describe_toolset` | 某个指定工具集工具的完整 JSON schema |
| `mcp_unreal_engine_call_tool` | 用参数调用指定工具并获取结果 |

发现流程始终按此顺序进行：

1. `list_toolsets` → 查看此项目实际拥有哪些能力组（工具面随项目而异：启用的插件、Game Feature Plugins 以及任何自定义工具集都会贡献内容）。返回的名称是全限定的（`editor_toolset.toolsets.scene.SceneTools`、`EditorToolset.EditorAppToolset`）——原样用作 `toolset_name`。
2. 对所需的组执行 `describe_toolset` → 阅读真实的参数 schema。绝不要猜测参数名——schema 就是契约。
3. 用全限定工具集名称、短工具名（`find_actors`，不是带点号的形式）以及与 schema 匹配的参数调用 `call_tool`。

把学到的内容在会话内缓存起来；仅在编辑器侧发生变化后（启用新插件、编写工具集、运行 `RefreshTools`）才重新列出。

另一种急切模式（在 Editor Preferences 中关闭 `Enable Tool Search`）会将每个工具作为独立的 `mcp_unreal_engine_<tool>` 条目来声明。此时发现在 `hermes mcp install`/`configure` 时进行。工具搜索模式是默认模式，也是本技能所假定的模式；它还能避免每次 API 调用都携带 schema token，因此优先使用它。

关于随附的工具集目录、编写自定义工具集以及完整的插件配置/控制台命令参考，参见 `references/tool-surface.md`。

## 操作循环

每个 Unreal 任务都遵循同一循环：

1. **先检查。** 先列工具集，再在动手前查询场景/关卡状态。绝不要假定关卡为空或为默认状态。在不熟悉的项目中，还要检查项目注册的 Agent Skills（`call_tool` → `AgentSkillToolset.ListSkills`）：匹配的项目技能的指令优先于本技能的通用默认值。
2. **以小型、单一用途的调用行动。** 每次 `call_tool` 只做一个逻辑步骤。服务器在游戏线程上**串行**执行工具——庞大的单体操作会冻结编辑器 UI 直到完成，并可能导致客户端超时。例外：对于超过 5 个同质操作的循环，一次 `ProgrammaticToolset.execute_tool_script` 调用会在服务器端批量执行它们，而不违反串行规则（见 `references/advanced-workflows.md`）。
3. **绝不要发起重叠调用。** 不要在一轮中批量执行多个 `mcp_unreal_engine_*` 调用——Hermes 会并发运行批量调用，而对游戏线程的并行调用会死锁或失败。严格地：一次调用，等待结果，再进行下一次。这优先于通用的并行工具调用指南。
4. **阅读每一个结果。** 许多工具（Blueprint 编译、材质编辑、控件创建）在响应体中以成功/失败形式报告，而没有协议级异常。任何不是明确成功的结果都是停下来诊断的信号，而不是不当回事。写属性之后，把值读回来——有几条写入路径会静默无效（见陷阱）。
5. **在视觉和结构上验证。** 每个里程碑之后，通过查询你更改过的 actor/属性来确认状态，当构图重要时截取视口截图（截图选项见 `references/tool-surface.md`；对图像做 `vision_analyze`——你是艺术总监，来评判它）。
6. **经常保存。** 编辑器编辑在包/关卡保存之前都在内存中；编辑器崩溃会丢失自上次保存以来的所有内容，而且 MCP 编辑并不能可靠地撤销。在任何批量更改前后都保存，并在每个里程碑之后保存。
7. **具体地报告。** Actor 标签、资源路径（`/Game/...`）、截图/渲染的文件位置。

工作时世界的基本规则：

- 单位是**厘米**；坐标轴是 **Z 轴向上**、X 轴向前；旋转是度数（Rotator：Roll 绕 X，Pitch 绕 Y，Yaw 绕 Z）。人眼高度 ≈ 165 厘米；一扇门 ≈ 210×90 厘米。完整表格在 `references/scene-craft.md` 中。
- 内容路径使用长包名：项目内容用 `/Game/Folder/Asset.Asset`，引擎primitive用 `/Engine/BasicShapes/Cube.Cube`。
- Actor **label**（你在 Outliner 中看到的内容，可设置，非唯一）不是 actor **name**（内部的，唯一的）。优先通过 label/class 查询解析 actor，然后持有工具返回的任何句柄。
- 优先使用物理合理的光照值（lux/candela/Kelvin），而不是任意的亮度数字——但要先读取现有太阳的强度，以了解场景的校准惯例；模板世界通常围绕 `intensity: 10` 校准，而物理值会把它们冲爆（数值在 `references/scene-craft.md` 中，校准规则在 `references/pitfalls.md` #12b 中）。

## 从自然语言到场景

用户给出的是意图，不是规格。先翻译再构建：

1. **提取需求简报。** 主体、氛围、时间、室内/室外、风格、交付物（截图？渲染？可玩关卡？）。最多进行一轮澄清提问，然后全力执行 —— 你是技术总监；不要把 Unreal 术语堆回用户脸上。
2. **规划构建顺序。** 有效的顺序是：关卡/环境外壳 → 粗排布（主要几何体/网格放置到位）→ 灯光 + 大气 → 材质 → 陈设/细节 → 摄像机 → 捕获/渲染。对于多步骤构建，将计划发布为待办列表。
3. **运用上述循环进行构建**，一次一个里程碑，每个里程碑截一张图。
4. **自我艺术指导。** 将每张截图与需求简报对照：剪影是否清晰可辨？光方向/强度是否可信？地平线是否不在画面正中？相对于人体高度参考，比例是否正确？修正后再继续推进。
5. **交付。** 以文件形式输出截图/渲染图（`MEDIA:` 路径），并附简短总结，说明关卡中有什么内容以及保存在哪里。

`references/recipes.md` 中有完整的实战构建案例（室外日光场景、氛围感室内、黄金时段电影感 + 渲染、资产导入与放置），包含精确的调用序列和参数值。

## 参考文件

按需加载；始终牢记 SKILL.md 级别的规则。

| 参考文件 | 内容 |
|---|---|
| `references/tool-surface.md` | 已发布的工具集目录、发现协议详情、插件控制台命令/CVar/标志、截图与捕获路径、MCP Inspector 调试、使用自定义 Python/C++ 工具集进行扩展 |
| `references/advanced-workflows.md` | 经过实机验证的复杂工作流：ProgrammaticToolset 批量处理、Blueprint DSL 编写循环（创建→DSL→编译→生成）、PIE 测试会话、Sequencer 导览（140 个工具）、LogsToolset 自调试、自动化测试、语义资产搜索、配置项、按场景决策表 |
| `references/scene-craft.md` | 数值速查表：物理光照强度、色温、曝光/EV100、雾浓度、氛围配方（正午/黄金时段/阴天/夜间/室内）、比例表、内容路径惯例 |
| `references/recipes.md` | 包含精确调用序列的端到端实战构建 |
| `references/pitfalls.md` | 安装、运行时和工作流方面的坑及修复办法 —— 在首次会话之前以及任何时候出现问题都应阅读 |

## 常见坑（重点提醒 —— 完整列表见 references/pitfalls.md）

- **启动顺序很重要。** 先启动编辑器和服务器，再启动 Hermes 会话。缺少 `mcp_unreal_engine_*` 工具 = 顺序不对。
- **一次只发一个调用。** 游戏线程是串行的；不能批量、不能重叠。
- **每次调用期间编辑器 UI 会冻结。** 这是设计使然（游戏线程执行）。长时间操作时提醒用户；保持调用简短。
- **模态对话框会阻塞一切。** 打开模态编辑器对话框（或与之冲突）的工具调用会一直停顿到有人关闭它。如果某个调用无限挂起，告诉用户检查编辑器是否有对话框。
- **长时间操作会超时。** Hermes 单次调用的默认超时是 120 秒；资产导入、大型关卡保存和渲染可能超过它。对于渲染/导入密集的会话，在 `~/.hermes/config.yaml` 中调大 `mcp_servers.unreal-engine.timeout`。
- **工具模式过期。** 在编写/热重载工具集或启用插件后，在编辑器控制台运行 `ModelContextProtocol.RefreshTools` 并重新 `list_toolsets`。新的 C++ `UFUNCTION` 需要完整重启编辑器 —— Live Coding 不会暴露它们。
- **实验性插件。** API 和工具形态可能因引擎版本而异；相信 `describe_toolset` 而非记忆，包括本技能的示例。当文档与实时模式不一致时，以实时模式为准。
- **不要让服务器暴露在 localhost 之外。** 仅限回环、无认证，这是设计使然。绝不要建议扩展到更宽的网络绑定。
- **许可说明。** 服务器启动时会记录日志：通过该插件传输到已连接 LLM 服务的数据属于 UE EULA 下的授权技术（§6(e)）—— 用户有责任确保其 LLM 服务商不会拿它做训练。如果用户问及数据处理，请说明这一点。

## 验证清单

- [ ] `list_toolsets` 在会话开始时返回工具集（连接健康）
- [ ] 首次编辑前先查询场景状态（绝不假设为空）
- [ ] 每个里程碑后：重新查询已变更的 actor/属性，并将截图与需求简报对照审查
- [ ] 每个里程碑后以及最后都要保存关卡/脏包
- [ ] 交付物存在于磁盘上（截图/渲染路径已确认），并以绝对路径报告给用户
- [ ] 编辑器保持干净状态：没有待处理的模态框、没有意外的未保存内容、用户被告知确切的创建/变更内容及位置
