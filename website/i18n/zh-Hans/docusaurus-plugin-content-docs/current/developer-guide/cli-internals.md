---
sidebar_position: 15
title: "CLI 内部机制"
description: "hermes_cli 的组织方式：斜杠命令分发、配置加载器、皮肤引擎、事务性更新流水线，以及进程身份识别规则"
---

# CLI 内部机制

本页是 `hermes_cli/AGENTS.md`（规则部分）的配套文档 —— 这里存放更详细的解释。

## 更新流水线

逐阶段的契约（`plan → snapshot → apply → restart-per-kind → verify → report`）以及每个阶段所防范的
具体故障类型，记录在 `hermes_cli/AGENTS.md` 中；面向用户的行为
（回执、`--plan`、快照模式）见[更新](../getting-started/updating.md)。

systemd 粗粒度重启兜底方案会等待该单元的 `TimeoutStopUSec` 加上
`TimeoutStartUSec`，并额外留出 15 秒的客户端余量。它在与重启相同的
manager 作用域内读取目标单元；无论是初次尝试还是重试，都使用这套
预算，包括中断更新后的补重启。
优雅排空之后的重启只用启动预算加上余量。
某个阶段的限制缺失、无法解析或为无限时，该阶段回退到 90 秒，
从而让无人值守的更新有界。`systemctl` 客户端超时**并不**
取消 manager 的事务。自定义的多命令停止链或 `EXTEND_TIMEOUT_USEC` 仍可能超出这一估计；
真正的超时仍属于未完成的重启，命令成功也仍需要现有的
服务健康检查和机群版本校验。原始数值 `*USec` 单位是微秒，而格式化值使用 systemd 的固定单位，
包括天、周、月、年。组合超时被限制在原生有符号 32 位毫秒轮询上限
之下（并留有舍入余量），因此超长的单元限制不会让子进程轮询溢出。零/未知/无限的阶段
限制使用有界兜底。这不会改变活动轮次的排空设置。

## 进程身份：绝不从 argv 子串推断

背后约 10 个机群更新问题（#90778、#87594、#78089、#76129、#91964 等）的错误类型：
用 `"serve" in cmdline` 之类的方式给进程分类。`kanban --preserve-cache` 里包含
"serve"；某个标志的取值可能等于子命令本身（`-m dashboard serve`）；截断的 cmdline 会隐藏真正的
子命令。规则如下：

- 使用规范匹配器：`gateway.status.looks_like_gateway_command_line`（gateway run）、
  `hermes_cli.update_cmd._hermes_holder_subcommand`（任意 Hermes argv 的顶层子命令）。绝不
  手写 token 扫描。
- 标志集合必须从解析器派生（`_holder_value_flags()` 内省
  `build_top_level_parser()`），绝不手写列表 —— 它们会产生偏差。
- 绝不要在进程扫描中一刀切排除祖先进程：当 `/update` 作为网关的子进程运行时，
  网关祖先必须对暂停机制保持可见（#87594）。排除交互式祖先，
  但保留网关形态的祖先。
- 使用完整 cmdline 匹配；只在展示时截断（#78089）。
- 在添加任何新的扫描启发式之前，读一读 #92091 —— 网关控制套接字正在取代扫描，
  成为主要的协调机制；扫描是针对老旧或崩溃进程的兜底层。

## 皮肤引擎 —— 皮肤能定制什么

| 元素 | 皮肤键 | 使用者 |
|---|---|---|
| 横幅面板边框 / 标题 / 分区标题 / 暗色 / 正文 | `colors.banner_border`、`banner_title`、`banner_accent`、`banner_dim`、`banner_text` | `banner.py` |
| 回复框边框 | `colors.response_border` | `cli.py` |
| 转轮表情（等待 / 思考） | `spinner.waiting_faces`、`spinner.thinking_faces` | `display.py` |
| 转轮动词 / 翅膀（可选） | `spinner.thinking_verbs`、`spinner.wings` | `display.py` |
| 工具输出前缀 / 各工具 emoji | `tool_prefix`、`tool_emojis` | `display.py` → `get_tool_emoji()` |
| 智能体名称 / 欢迎语 / 回复标签 / 提示符 | `branding.agent_name`、`welcome`、`response_label`、`prompt_symbol` | `banner.py`、`cli.py` |

内置皮肤（`hermes_cli/skin_engine.py` 中的 `_BUILTIN_SKINS`）：`default`（经典金色/日系萌感）、
`ares`（深红/古铜，带自定义转轮翅膀）、`mono`（灰度）、`slate`（冷蓝）。要添加内置皮肤，添加一个
字典条目 `{"name", "description", "colors", "spinner", "branding", "tool_prefix"}`。
用户皮肤是 `~/.hermes/skins/<name>.yaml`，使用相同的键，通过 `/skin <name>` 或
`display.skin: <name>` 激活；完整的 YAML 模板在
[皮肤与主题](../user-guide/features/skins.md)用户指南中。

## 配置档：多实例支持

Hermes 支持配置档 —— 完全隔离的实例，每个都有自己的 `HERMES_HOME`（配置、API
密钥、记忆、会话、技能、网关）。`hermes_cli/main.py` 中的 `_apply_profile_override()` 在任何
模块导入之前设置 `HERMES_HOME`，因此每个对 `get_hermes_home()` 的引用都会作用域到当前
配置档。配置档操作以 HOME 为锚点（`_get_profiles_root()` 返回
`Path.home() / ".hermes" / "profiles"`，而非 `get_hermes_home() / "profiles"`），这样
`hermes -p coder profile list` 无论当前激活哪个配置档都能看到全部配置档 —— 这是有意为之。
配置档安全的编码规则在根目录的 `AGENTS.md`；多路复用密钥作用域规则在
`gateway/AGENTS.md`。
