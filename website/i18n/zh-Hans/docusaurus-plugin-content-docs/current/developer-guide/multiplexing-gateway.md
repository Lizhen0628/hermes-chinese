---
title: "多路复用网关内部机制"
description: "全配置档单网关模式的设计：作用域组合、密钥作用域、入站路由、持久化"
---

# 多路复用网关

一个网关进程可以服务安装中的每一个配置档。该模式需要主动开启
(`gateway.multiplex_profiles`，默认 `false`)，且它所改变的一切都会在标志关闭的瞬间
恢复原状。本文档是 `agent/secret_scope.py`（“工作流 A”）所引用的设计依据：哪些内容按
配置档隔离、隔离它的机制是什么，以及哪些内容有意保持进程全局。

## 概览

在未启用多路复用的情况下，一个网关进程只服务一个配置档——它自己的 `.env`、会话、技能和平台适配器——多配置档安装则为每个配置档运行一个进程。多路复用将这一切折叠进单个进程：默认配置档以及每个被服务的具名配置档都拥有各自的适配器、密钥、会话和定时任务节拍，同时共享一个事件循环、一个 HTTP 监听器、一个进程锁和一个状态界面。

塑造下文一切内容的设计约束：**配置档 A 的回合绝不能观察到配置档 B 的状态**。密钥、主目录、会话和适配器通道都按配置档隔离；任何尚无法隔离的内容要么以失败关闭（fail closed）的方式处理，要么在本文档末尾记为一个已知限制。

## 模式标志

- 配置：`gateway.multiplex_profiles: true`（顶层同样接受）。在
  `gateway/config.py` 中解析，优先级为环境变量 > 配置 > 默认值。
- 环境变量覆盖：`GATEWAY_MULTIPLEX_PROFILES` 只接受明确的真/假标记；空白或
  无法识别的值会返回“无覆盖”，因此一个空的部署密钥无法遮蔽配置中的主动开启。
- 启动时，`GatewayRunner.__init__` 调用一次
  `agent.secret_scope.set_multiplex_active(...)`。`_MULTIPLEX_ACTIVE` 是一个
  普通模块全局变量，而非 contextvar：它描述的是部署模式，不是某个任务级的值。它唯一的
  职责就是在 `get_secret()` 中武装失败关闭行为。

## 作用域组合

在任何配置档所属代码运行之前，每个入站事件都会组合相同的两个上下文局部作用域：

```
platform event
   │
   ▼
profile_routes match ──► served-set check ──► SessionSource.profile stamped
   │                                           (gateway/profile_routing.py)
   ▼
_profile_runtime_scope(profile_home)           (gateway/run.py)
   ├── set_hermes_home_override(home)          config / state.db / skills /
   │                                           memory / sessions resolve here
   └── set_secret_scope(profile .env + secret sources)
   │                                           provider keys, platform tokens
   ▼
agent turn (worker thread via copy_context())
   │
   ▼
scope unwound in finally
```

`_profile_runtime_scope` 包裹配置档所属代码执行的每一个接缝：辅助适配器启动、连接与重连、主平台事件处理器、入站预处理、`/model` 与会话信息解析、后台任务，以及智能体回合本身。配置重载在默认配置档的作用域下运行，以便全局网关设置（`#64674`）一致地解析。

两个作用域都是 `contextvars`，因此它们通过 `copy_context()` 传播到执行器工作线程，并确定性地解绕——绝不向 `os.environ` 写入任何内容。

## 工作流 A：上下文局部密钥作用域

`agent/secret_scope.py` 的存在，是因为那个显而易见的实现——把所有配置档的 `.env` 合并进 `os.environ`——会将配置档 A 的密钥泄漏进配置档 B 的回合，以及每一个以 `env=dict(os.environ)` 派生的子进程。

- `build_profile_secret_scope(home)` 合并配置档的 `.env` 与其配置的密钥来源，
  跳过全局项。
- `set_secret_scope(mapping)` 为当前任务安装它。
- `get_secret(name)` 按以下顺序解析：全局允许列表 → 活动作用域 → 回退。
  回退部分是承载重任的一环：
  - 多路复用**关闭**：读取 `os.environ`，因此单配置档网关和所有非网关调用方
    的行为与之前完全一致；
  - 多路复用**开启**、未安装作用域：**抛出 `UnscopedSecretError`**，而不是悄悄
    读取进程环境。未迁移的调用点会在那一行大声失败，而不是泄漏另一个配置档的值。
- 一个小的允许列表（`HERMES_HOME`、`HERMES_PROFILE`、代理设置、
  `API_SERVER_*` 监听器设置——但有意不包括 `API_SERVER_KEY`）保持全局，因为
  它们描述的是进程，而非某个配置档。

由于在启用多路复用的情况下，每回合的 `.env` 重载是一个空操作，轮换后的凭据会在下一个回合通过配置档作用域被拾取——绝不通过 `os.environ`。这一点在加载器边界成立，而不仅是网关的重载辅助函数：只要多路复用处于活动状态*且*已安装配置档主目录覆盖，`hermes_cli.env_loader.load_hermes_dotenv` 就会跳过进程全局加载（导入时和定时任务调用方会在回合中途命中它），同时仍将该配置档的外部密钥来源注入其私有快照（`#77562`）。无作用域的启动加载保持不变。

同一条作用域权威规则覆盖了路由回合可达的其他 `os.environ` 接缝：配置档 `config.yaml` 中的 `${VAR}` / `${env:VAR}` 引用在已安装作用域时通过 `get_secret` 解析（`#84079`），而在作用域下进行的 `.env` 写入（`save_env_value`，例如一个 `/pair` 授权镜像）更新的是已安装的作用域映射，而不是进程环境（`#88441`）。

## HERMES_HOME 覆盖

`hermes_constants.py` 保存了一个上下文局部覆盖，由 `get_hermes_home()` 在 `HERMES_HOME` 环境变量之前查询。所有通过它解析路径的内容——配置、`state.db`、技能、记忆、SOUL、会话、看板、目标、插件发现、MCP 启动——都会自动跟随活动配置档。`get_process_hermes_home()` 是为少数不得跟随覆盖的机器级资产而存在的。`hermes_home_key()` 为各主目录注册表提供稳定的作用域键。如果配置档所属代码在本应存在覆盖的地方却未带覆盖运行，会触发一次性警告（`#18594`）。

## 入站路由

`gateway.profile_routes` 将 `(platform, guild_id, chat_id, thread_id)` 映射到一个配置档；匹配是合取的、最具体优先，并对线程使用父链聊天匹配。仅当多路复用处于活动状态时才运行路由，命中某条路由但目标在服务集之外的事件会被拒绝（该事件被丢弃，而不是误投）。完整 schema 与匹配规则见：[将共享机器人聊天路由到配置档](../user-guide/multi-profile-gateways.md#routing-shared-bot-chats-to-profiles-profile_routes)。

## 服务选定的配置档

`hermes_cli/profiles.py` 中的 `profiles_to_serve(multiplex, profile_allowlist)` 是多路复用器服务哪些配置档的唯一收窄点：默认配置档加上每个有效配置档目录，可选地由允许列表过滤。格式错误的允许列表安全失败为仅默认配置档。服务集控制适配器启动、定时任务节拍（`#69377`）、`/p/<profile>/` HTTP 准入、路由资格和运行时状态界面。被排除的配置档保持已安装，仍可运行自己独立的网关。

## 按配置档持久化

`SessionStore` 在构造时不绑定任何数据库句柄（`#88532`）。会话 DB 句柄在调用时通过活动的 HERMES_HOME 覆盖解析——每个已解析的 `profiles/<name>/state.db` 一个缓存句柄——因此即使存储对象本身是共享的，会话也会落到拥有它的配置档的存储中。配对存储按每个被服务的配置档构造。

## 按机器人会话通道

会话键按配置档命名空间化（默认配置档为 `agent:main`，具名配置档为 `agent:<name>`）。适配器携带 `_owner_profile`（在适配器配置时安装，早于任何入站事件），因为适配器入口运行在 `SessionSource.profile` 被打戳之前；`_session_key_profile` 按来源戳 → 拥有者配置档 → 存储解析器的顺序解析。文本/媒体批处理、活动会话跟踪和忙碌会话守卫都按通道加键，因此共享同一聊天的两个机器人不共享同一会话通道。

## 控制平面

桌面插件只能通过 ws JSON-RPC 门面访问网关，因此配置档枚举和配置位于
`tui_gateway/methods_profiles.py`：`profiles.list`、`profiles.create`、
`profiles.describe`、`profiles.configure`、`profiles.set_asset`、
`profiles.get_asset`。读写都在目标配置档的 HERMES_HOME 覆盖下运行。资产写入是原子性的、受类型和大小上限约束。

## 失败模式

- 启动即致命：多路复用配置错误，以及辅助配置档启用了绑定端口的平台
  （`MultiplexConfigError`、`SecondaryPortBindingConfigError`）——一个共享的 HTTP
  监听器归默认配置档所有。
- 跳过而非致命：单个配置错误的辅助适配器会被跳过并给出警告，而不会拖垮
  多路复用器。
- 失败关闭：多路复用下无作用域的 `get_secret()` 会抛出；针对未服务配置档的
  路由事件会被丢弃；无作用域的 `/p/` 请求会进入默认配置档的作用域（`#61276`），
  而非未定义的作用域。
- 回退：外部 `cron.provider` 不支持多路复用，会带着警告回退到内置节拍器。

## 已知限制

尚未按配置档隔离的进程全局状态：

| 表面 | 撰写时的状态 |
| --- | --- |
| MCP 发现与工具注册 | 进程全局；首个构建智能体的配置档赢得发现槽位。完整的按配置档 MCP 注册表在 `#67605` 中跟踪。 |
| 终端 / 沙箱环境（`TERMINAL_*`） | 按允许列表全局；工具从进程环境读取它。 |
| 内置工具注册表 | 内置工具是进程全局的；插件注册的工具通过 `hermes_home_key()` 按配置档叠加。 |
| 服务商/能力注册表 | 相同的混合叠加模式（浏览器、图像生成、TTS、转录、视频生成、网页搜索、密钥来源）。 |
| HTTP 监听器、中继入口、进程锁 | 每进程一个，归默认/活动配置档所有。按配置档的 `runtime_status.json` 仍会写入。 |

## 非目标

多路复用隔离的是*配置档*；它不认证也不授权*最终用户*。配置档是一种配置，不是一个人：网关信任其传输层和路由表来决定一个事件属于哪个配置档。配置档层之上的请求级身份与按用户授权不在本文档范围内。

## 相关

- [多配置档网关](../user-guide/multi-profile-gateways.md) —— 面向用户的指南，包括 `profile_routes` 以及独立的每配置档单网关替代方案。
- `agent/secret_scope.py`、`hermes_constants.py`、`gateway/profile_routing.py`、
  `gateway/run.py`（`_profile_runtime_scope`）、`hermes_cli/profiles.py`
  （`profiles_to_serve`）、`gateway/session.py`、`tui_gateway/methods_profiles.py`。
