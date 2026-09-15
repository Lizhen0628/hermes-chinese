---
title: "Unreal Mcp — 自动化 Unreal Engine 编辑器场景、Actor 与渲染"
sidebar_label: "Unreal Mcp"
description: "自动化 Unreal Engine 编辑器场景、Actor 与渲染"
---

{/* 本页面由 website/scripts/generate-skill-docs.py 根据该技能的 SKILL.md 自动生成。请编辑源文件 SKILL.md，而不是本页面。 */}

# Unreal Mcp

自动化 Unreal Engine 编辑器场景、Actor 与渲染。

## 技能元数据

| | |
|---|---|
| 来源 | 可选 — 使用 `hermes skills install official/creative/unreal-mcp` 安装 |
| 路径 | `optional-skills/creative\unreal-mcp` |
| 版本 | `1.0.0` |
| 作者 | Hermes Agent |
| 许可证 | MIT |
| 平台 | linux, macos, windows |
| 标签 | `unreal`, `unreal-engine`, `ue5`, `3d`, `mcp`, `scenes`, `cinematics`, `lighting`, `gamedev` |

## 参考：完整的 SKILL.md

:::info
以下是 Hermes 在该技能被触发时加载的完整技能定义。这就是智能体在技能激活时看到的指令内容。
:::

# Unreal Engine MCP 技能

Hermes MCP 目录中 `unreal-engine` 条目的配套技能。该 MCP 服务器（Epic 官方的实验性 "Unreal MCP" 插件，内部 id 为 `ModelContextProtocol`）运行在 Unreal Editor 进程内部，将编辑器功能以类型化工具的形式暴露出来。本技能教你如何用好它：发现实时工具集合、安全地编排调用顺序、把大白话需求转化为真正好看的场景，并对工作进行可视化验证。除了启动编辑器之外，用户不应该需要碰编辑器。

## 何时使用

当用户希望在 Unreal Engine 中做任何事时使用：构建或布置关卡、生成/移动/删除 Actor、设置光照与大气效果、创建或调整材质实例、架设摄像机镜头、截屏或渲染、导入资源、检查场景或 UI、运行自动化测试，或为编辑器编写脚本。既适用于单个操作（"把太阳调成黄金时刻"），也适用于完整的多步骤项目（"给我搭一个阴郁的林间空地和一堆营火，并渲染一张它的画面"）。

不适用于：DCC 风格的网格建模/雕刻（在 Blender 中建模再导入结果），或编辑 Unreal C++ 项目源代码（那属于普通代码工作——使用终端；本技能关注的是实时编辑器）。

## 前置条件

两部分，按此顺序：必须先启动编辑器那一端，Hermes 才能连接。

### 编辑器端的一次性配置

1. Unreal Editor **5.8+** 并打开一个项目。（macOS：必须安装完整 Xcode 并接受其许可协议——否则首次启动时编辑器会退出；参见常见陷阱。）
2. **Edit > Plugins** —— 启用 **Unreal MCP**（其 Toolset Registry 依赖会自动启用）。按提示重启编辑器。
3. 类型化工具集与服务器分开提供：在同一个 Plugins 浏览器中还要启用 **AllToolsets** 插件。Unreal MCP 本身不提供任何工具——AllToolsets 提供随附的工具集（SceneTools、ActorTools、MaterialInstanceTools、ObjectTools……）；跳过它，服务器虽然能连接，但智能体无工具可调。
4. **Edit > Editor Preferences > General > Model Context Protocol** —— 启用 **Auto Start Server**。默认绑定为 `http://127.0.0.1:8000/mcp`（端口/路径可在同一面板中配置；服务器名称为 `unreal-mcp`）。若要改为手动启动，请在编辑器控制台（反引号键）中运行 `ModelContextProtocol.StartServer`。

### Hermes 端的一次性配置

    hermes mcp install unreal-engine

这会写入指向 `http://127.0.0.1:8000/mcp` 的 `mcp_servers.unreal-engine` HTTP 条目，并探测实时服务器以获取其工具。请在编辑器 + 服务器已启动时运行，以便探测能看到真实的工具集合。如果用户在 Editor Preferences 中更改了端口/路径，请编辑 `~/.hermes/config.yaml` 中 `mcp_servers.unreal-engine` 下的 `url` 以匹配。

不要对 Hermes 使用 `ModelContextProtocol.GenerateClientConfig`——那是为 Claude Code/Cursor 等生成 `.mcp.json` 风格文件的。Hermes 是通过目录条目从 `config.yaml` 连接的。

### 每次会话

1. 启动 Unreal Editor，等待项目加载完成；确认服务器已启动（Output Log 会显示绑定地址，或手动运行 `ModelContextProtocol.StartServer`）。
2. 启动 Hermes 会话。工具注册为 `mcp_unreal_engine_*`。如果它们缺失：说明编辑器没有先启动——先启动编辑器，然后打开一个新的 Hermes 会话。
3. 健全性检查：调用 `mcp_unreal_engine_list_toolsets` 确认能返回工具集。

## 工具面：靠发现，而非固定清单

默认情况下，插件以**工具搜索模式**运行：`tools/list` 只返回三个元工具，所有真实工具都要经由它们访问。通过 Hermes 访问时，它们表现为：

| Hermes tool | 用途 |
|---|---|
| `mcp_unreal_engine_list_toolsets` | 每个已注册工具集的名称与描述 |
| `mcp_unreal_engine_describe_toolset` | 某个具名工具集下工具的完整 JSON schema |
| `mcp_unreal_engine_call_tool` | 用参数调用具名工具并获取结果 |

发现流程，务必按此顺序：

1. `list_toolsets` → 了解这个项目实际拥有哪些能力分组（工具面取决于项目：已启用插件、Game Feature Plugins 以及任何自定义工具集都会贡献内容）。返回的名称是**完全限定名**
（`editor_toolset.toolsets.scene.SceneTools`、
`EditorToolset.EditorAppToolset`）——原样用作 `toolset_name`。
2. 对所需的组调用 `describe_toolset` → 阅读真实的参数
schema。绝不要猜参数名——schema 就是契约。
3. 用限定的工具集名、**短**工具名（`find_actors`，而不是带点的形式）以及与 schema 匹配的参数调用 `call_tool`。

把会话中学到的内容缓存起来；只在编辑器端发生变化后（启用新插件、编写了工具集、运行了 `RefreshTools`）才重新列举。

备选的急切模式（在 Editor Preferences 中关闭 `Enable Tool Search`）会把每个工具作为独立的 `mcp_unreal_engine_<tool>` 条目列出。此时发现过程改为在 `hermes mcp install`/`configure` 时发生。工具搜索模式是默认模式，也是本技能所假设的模式；它还能让 schema 的 token 不出现在每次 API 调用中，因此优先使用它。

已随附的工具集目录、自定义工具集编写，以及完整的插件配置/控制台命令参考，见 `references/tool-surface.md`。

## 操作循环

每个 Unreal 任务都遵循同一个循环：

1. **先检查。** 列出工具集，然后在动手之前查询场景/关卡状态。绝不要假设关卡是空的或默认的。在陌生项目中，还要检查项目注册的 Agent Skills
（`call_tool` → `AgentSkillToolset.ListSkills`）：匹配的项目技能的指令会覆盖本技能的通用默认值。
2. **以小型、单一用途的调用行动。** 每次 `call_tool` 做一步逻辑操作。
服务器**在游戏线程上串行**执行工具——一个庞大的单体操作会让编辑器 UI 冻结到它结束，并有客户端超时风险。例外：对于 5 次以上的同构操作循环，
一次 `ProgrammaticToolset.execute_tool_script` 调用会在服务端将它们批处理，同时不违反串行规则
（`references/advanced-workflows.md`）。
3. **绝不发出重叠调用。** 不要在同一轮中批处理多个
`mcp_unreal_engine_*` 调用——Hermes 会并发运行被批处理的调用，而针对游戏线程的并行调用会死锁或
失败。严格做到一次调用，等待结果，再下一次调用。此规则优先于
一般的并行工具调用指导。
4. **阅读每一个结果。** 许多工具（蓝图编译、材质编辑、
控件创建）会在响应体中报告成功/失败，protocol 层不会抛出异常。任何不是明确成功的情况都应当停下并诊断，而不是耸耸肩。写入属性后，要把值
读回来——有几条写入路径会静默空操作（见坑点）。
5. **从视觉和结构上验证。** 每到一个里程碑后，通过查询你改过的 actor/属性来确认状态，并且在构图
重要时截取视口截图（截取选项见 `references/tool-surface.md`；
对图像执行 `vision_analyze`——你就是艺术总监，去评判它）。
6. **经常保存。** 编辑器编辑在包/关卡保存前都只存在于内存中；编辑器崩溃会丢失上次保存以来的所有内容，而 MCP 的编辑并不能可靠地撤销。在任何大批量更改之前和之后都要保存，
并且在每个里程碑后也要保存。
7. **具体地汇报。** actor 标签、资产路径（`/Game/...`）、捕获/渲染的文件
位置。

工作时这个世界的规则：

- 单位是**厘米**；坐标轴是**Z 轴向上**、X 轴向前；旋转以度为单位（Rotator：Roll 绕 X 轴，Pitch 绕 Y 轴，Yaw 绕 Z 轴）。人眼
高度 ≈ 165 cm；一扇门 ≈ 210×90 cm。完整表格见
`references/scene-craft.md`。
- 内容路径使用长包名：项目内容用 `/Game/Folder/Asset.Asset`，
引擎基础体用 `/Engine/BasicShapes/Cube.Cube`。
- actor 的**标签**（你在 Outliner 中看到的东西，可设置、不唯一）不是 actor 的**名称**（内部、唯一）。优先通过标签/类查询来解析 actor，然后抓住工具返回的任意句柄。
- 优先使用符合物理直觉的光照值（lux/candela/Kelvin），而不是
任意亮度数字——但首先要读取现有太阳的
强度，以了解场景的校准约定；模板世界
常常是以 `intensity: 10` 左右校准的，物理值会把它们
打爆（数值见 `references/scene-craft.md`，
校准规则见 `references/pitfalls.md` #12b）。

## 从自然语言到场景

用户给出的是意图，而非规格。开工之前先翻译：

1. **提取需求简报。** 主题、氛围、时段、室内/室外、风格、交付物（截图？渲染？可玩关卡？）。最多只问一轮澄清问题，然后直接定案——你是技术总监；不要拿 Unreal 术语去反问用户。
2. **规划搭建顺序。** 行之有效的顺序：关卡/环境外壳 → 体块搭建（主要几何体/网格就位）→ 光照 + 大气 → 材质 → 陈设/细节 → 摄像机 → 捕获/渲染。对于多步骤构建，把计划作为待办列表发出来。
3. **用上面的循环构建**，一次一个里程碑，每个里程碑截一次图。
4. **自我美术指导。** 把每张截图与需求简报对比：剪影是否清晰可读？光的方向/强度是否可信？地平线是否没有死居中？相对于人体高度的参考，比例是否正确？先修好再继续。
5. **交付。** 截图/渲染以文件形式给出（`MEDIA:` 路径），外加一份简短说明：关卡里有什么、保存在哪里。

`references/recipes.md` 中有完整的实战构建范例（室外日间场景、氛围室内、黄金时刻电影感 + 渲染、资产导入与摆放），包含精确的调用序列和取值。

## 参考文件

按需加载；全程牢记 SKILL.md 层级的规则。

| 参考文件 | 内容 |
|---|---|
| `references/tool-surface.md` | 随包发布的工具集目录、发现协议细节、插件控制台命令/CVar/标志、截图与捕获路径、MCP Inspector 调试、用自定义 Python/C++ 工具集扩展 |
| `references/advanced-workflows.md` | 高级工作流，经实机验证：ProgrammaticToolset 批处理、Blueprint DSL 编写循环（create→DSL→compile→spawn）、PIE 测试会话、Sequencer 概览（140 个工具）、LogsToolset 自调试、自动化测试、语义资产搜索、配置设置、分场景决策表 |
| `references/scene-craft.md` | 数值速查表：物理光强、色温、曝光/EV100、雾密度、氛围配方（正午/黄金时刻/阴天/夜晚/室内）、尺度表、内容路径约定 |
| `references/recipes.md` | 端到端实战构建，含精确调用序列 |
| `references/pitfalls.md` | 安装配置、运行时与工作流中的坑及其修复——首次会话之前阅读，出问题时随时查阅 |

## 常见坑（供随时留意——完整列表见 references/pitfalls.md）

- **启动顺序很重要。** 先开编辑器和服务器，再开 Hermes 会话。找不到 `mcp_unreal_engine_*` 工具 = 顺序错了。
- **一次只调一个。** 游戏线程是串行的；不要批量、不要重叠。
- **每次调用期间编辑器 UI 会冻结。** 这是设计如此（在游戏线程执行）。长时间操作时提醒用户；尽量让单次调用保持轻小。
- **模态对话框会卡住一切。** 某次工具调用若打开（或撞上）了编辑器的模态对话框，会一直挂起直到有人关闭它。如果某个调用无限期卡住，让用户检查编辑器里是否有对话框。
- **长时间操作会超时。** Hermes 每次调用的默认超时是 120 s；资产导入、大型关卡保存和渲染都可能超过它。对于渲染/导入密集的会话，在 `~/.hermes/config.yaml` 里调高 `mcp_servers.unreal-engine.timeout`。
- **工具 schema 过期。** 编写/热重载工具集或启用插件之后，在编辑器控制台运行 `ModelContextProtocol.RefreshTools` 并重新 `list_toolsets`。新增的 C++ `UFUNCTION` 需要完整重启编辑器——Live Coding 不会让它们显现。
- **实验性插件。** 不同引擎版本之间，API 和工具形态可能变化；以 `describe_toolset` 为准，而不是凭记忆，包括本技能中的示例。文档与实时 schema 冲突时，以实时 schema 为准。
- **不要把服务器暴露到 localhost 之外。** 仅限回环、无鉴权，这是刻意设计。绝不要建议把它绑定到更广的范围。
- **许可提示。** 该服务器在启动时会记录：通过插件传输到所连接 LLM 服务的数据，属于 UE EULA（§6(e)）下的 Licensed Technology——用户有责任确保其 LLM 服务商不会拿这些数据做训练。如果用户问起数据处理，要把这一点说出来。

## 验证清单

- [ ] 会话开始时 `list_toolsets` 返回了工具集（连接正常）
- [ ] 首次编辑之前先查询了场景状态（绝不假设为空）
- [ ] 每个里程碑之后：重新查询变更过的 actor/属性，并对照需求简报审阅一张截图
- [ ] 每个里程碑之后以及结束时，保存了关卡/脏包
- [ ] 交付物存在于磁盘上（截图/渲染路径已确认），并以绝对路径报告给用户
- [ ] 编辑器留在干净状态：没有待处理的模态框、没有意外的未保存内容，且已明确告知用户具体创建/更改了什么、在哪里
