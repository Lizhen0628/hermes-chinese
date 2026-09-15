---
title: "网关会话生命周期"
description: "网关中的 SessionSource、SessionEntry、SessionStore、会话键规则与多用户隔离"
---

# 会话生命周期

> **受众：** 网关开发者与维护者
> **源文件：** `gateway/session.py`（约 1200 行 + `session_*.py` 同级文件），`gateway/run.py`（约 5500 行门面 + `run_*.py` 各阶段），`gateway/config.py`
> **最后更新：** 2026-06-16

## 概述

一个**会话**（session）代表智能体与消息平台上一位或多位用户之间的持续对话。会话生命周期管理着对话何时持久化、何时重置、如何在网关重启后存续，以及并发操作期间消息如何排队。

会话系统主要位于两个模块中：

- `gateway/session.py` — 数据模型（`SessionSource`、`SessionEntry`、`SessionContext`）、键生成（`build_session_key`）以及主存储（`SessionStore`）。
- `gateway/run.py` — 网关运行器（`GatewayRunner`）门面，将会话接入消息处理管线；各阶段位于 `run_*.py` 同级文件中：会话维护（`run_watchers.py`）、智能体缓存（`run_agent_cache.py`）、重启恢复（`session_recovery.py`），以及消息排队（`run_busy.py`）。

---

## 1. SessionSource — 消息来源描述符

`SessionSource` 是一条记录了*消息来自何处*的冻结（frozen）记录。它附加到每一个传入的 `MessageEvent` 上，用于路由、隔离与上下文注入。

### 字段

| 字段 | 类型 | 默认值 | 描述 |
|---|---|---|---|
| `platform` | `Platform` | *（必填）* | 标识消息平台的枚举（telegram、discord、slack、signal、whatsapp、matrix、local 等）。 |
| `chat_id` | `str` | *（必填）* | 平台级的聊天/群组/频道标识符。经由适配器的 `chat_id_key` 转换进行路由。 |
| `chat_name` | `Optional[str]` | `None` | 聊天或群组的人类可读名称。 |
| `chat_type` | `str` | `"dm"` | 取值之一：`"dm"`、`"group"`、`"channel"`、`"thread"`。控制会话键的生成与隔离。 |
| `user_id` | `Optional[str]` | `None` | 特定平台的用户标识符。用于授权及按用户进行会话隔离。 |
| `user_name` | `Optional[str]` | `None` | 消息作者的显示名称。注入到系统提示词中。 |
| `thread_id` | `Optional[str]` | `None` | 论坛话题 / Discord 线程 / Slack 线程标识符。用于区分线索化对话。 |
| `chat_topic` | `Optional[str]` | `None` | 频道主题或描述（Discord 频道主题、Slack 频道用途）。 |
| `user_id_alt` | `Optional[str]` | `None` | 特定平台的稳定备用 ID（Signal UUID、Feishu union_id）。当 `user_id` 为临时值时使用。 |
| `chat_id_alt` | `Optional[str]` | `None` | Signal 群组内部 ID——将 Signal 群组 V2 标识符映射到其规范形式。 |
| `is_bot` | `bool` | `False` | 当消息作者是机器人或 webhook（Discord 机器人）时为 True。 |
| `guild_id` | `Optional[str]` | `None` | Discord 公会 / Slack 工作区 / Matrix 服务器范围标识符。 |
| `parent_chat_id` | `Optional[str]` | `None` | 当 `chat_id` 指向一个线程时的父频道。 |
| `message_id` | `Optional[str]` | `None` | 触发消息的 ID。用于置顶/回复/反应操作及 Discord ID 注入。 |
| `role_authorized` | `bool` | `False` | 当适配器通过平台角色（而非个人用户 ID）授予访问权限时为 True。 |

### 关键方法

- **`description`**（属性：`str`）— 人类可读的摘要，例如 `"DM with Alice"`、`"group: My Group, thread: 12345"`。
- **`to_dict()` / `from_dict()`** — 用于在 `sessions.json` 中持久化的序列化往返方法。

---

## 2. SessionEntry — 活动会话记录

`SessionEntry` 是每个会话的元数据记录，存储在内存中并持久化到 `{sessions_dir}/sessions.json`。每个条目将一个 `session_key` 映射到其当前的 `session_id`。

### 字段

| 字段 | 类型 | 默认值 | 描述 |
|---|---|---|---|
| `session_key` | `str` | *（必填）* | 标识对话通道的确定性键（见 §4）。 |
| `session_id` | `str` | *（必填）* | 此特定对话实例的唯一标识符。格式：`YYYYMMDD_HHMMSS_<8hex>`。 |
| `created_at` | `datetime` | *（必填）* | 此会话实例的创建时间。 |
| `updated_at` | `datetime` | *（必填）* | 用于资源维护的最后活动时间戳。 |
| `origin` | `Optional[SessionSource]` | `None` | 创建此会话的来源，用于投递路由。 |
| `display_name` | `Optional[str]` | `None` | 聊天显示名称（来源于 `SessionSource.chat_name`）。 |
| `platform` | `Optional[Platform]` | `None` | 持久化的平台枚举，用于跨重启路由。 |
| `chat_type` | `str` | `"dm"` | 聊天类型，同样持久化用于策略查找。 |
| `input_tokens` | `int` | `0` | 累计消耗的 LLM 输入（提示词）token 数。 |
| `output_tokens` | `int` | `0` | 累计消耗的 LLM 输出（补全）token 数。 |
| `cache_read_tokens` | `int` | `0` | 累计的提示词缓存读取 token 数。 |
| `cache_write_tokens` | `int` | `0` | 累计的提示词缓存写入 token 数。 |
| `total_tokens` | `int` | `0` | 所有轮次的总 token 数。 |
| `estimated_cost_usd` | `float` | `0.0` | 估算的累计美元成本。 |
| `cost_status` | `str` | `"unknown"` | 成本跟踪状态标签。 |
| `last_prompt_tokens` | `int` | `0` | 最后一次 API 报告的提示词 token 数。用于精确的压缩预检。 |

### 布尔标志（状态机）

SessionEntry 拥有若干布尔标志，它们构成一个简单状态机，用于决定会话在下次访问时的行为。


|标志|类型|默认值|说明|
|---|---|---|---|
|`was_auto_reset`|`bool`|`False`|当显式暂停导致会话被替换时置位。同时也为历史记录保留。|
|`auto_reset_reason`|`Optional[str]`|`None`|显式暂停时为 `"suspended"`；较旧的行可能保留历史重置原因。|
|`reset_had_activity`|`bool`|`False`|被替换的会话此前是否有活动。|
|`is_fresh_reset`|`bool`|`False`|由显式的 `/new` 或 `/reset` 置位。在首条消息时触发主题/频道技能重新注入。与 `was_auto_reset` 区分开来，以避免产生误导性的“会话已过期”通知。|
|`expiry_finalized`|`bool`|`False`|为恢复而保留的历史终止屏障；没有定时器会写入它。|
|`suspended`|`bool`|`False`|硬性强力清扫信号。由 `/stop` 或卡死循环升级（连续 3 次及以上重启失败）置位。在下次 `get_or_create_session()` 时，无论 `resume_pending` 如何，都会强制使用一个新的 `session_id`。|
|`resume_pending`|`bool`|`False`|软恢复标记。由 `suspend_recently_active()`（崩溃恢复）或排空超时置位。在下次访问时，保留现有的 `session_id`——用户在同一份对话记录上继续。在下一个回合成功完成后清除。|
|`resume_reason`|`Optional[str]`|`None`|标记恢复的原因：`"restart_timeout"`、`"shutdown_timeout"`、`"restart_interrupted"`。|
|`last_resume_marked_at`|`Optional[datetime]`|`None`|最后一次标记待恢复时的时间戳。|

### 状态转换逻辑（get_or_create_session）

```
                    ┌──────────┐
                    │  收到的   │
                    │  消息     │
                    └────┬─────┘
                         │
                         ▼
              ┌──────────────────────┐
              │  session_key 存在    │──── 否 ──► 创建全新的 SessionEntry
              │  且 !force_new       │
              └──────────┬───────────┘
                         │ 是
                         ▼
              ┌──────────────────────┐
              │  entry.suspended?    │──── 是 ──► 自动重置：新的 session_id
              └──────────┬───────────┘           （reason="suspended"）
                         │ 否
                         ▼
              ┌──────────────────────┐
              │ entry.resume_pending?│──── 是 ──► 返回现有条目
              └──────────┬───────────┘           （保留 session_id）
                         │ 否                     在下一个成功回合后清除标志
                         ▼
              ┌──────────────────────┐
              │   策略要求重置？      │──── 是 ──► 自动重置：新的 session_id
              └──────────┬───────────┘           （reason="idle"/"daily"）
                         │ 否
                         ▼
              ┌──────────────────────┐
              │  返回现有条目，       │
              │  更新 updated_at     │
              └──────────────────────┘
```

**`get_or_create_session()` 中的优先级顺序：**
1. `suspended=True` → 始终强制重置（硬性清扫）
2. `resume_pending=True` → 保留 session_id（软恢复）
3. 无触发器 → 返回现有条目（更新 `updated_at`）

---

## 3. SessionStore——存储与操作

`SessionStore` 是主要的存储层。它维护一个内存字典（`_entries`），持久化到 `sessions.json`，并以 SQLite（`SessionDB`）作为会话元数据和消息对话记录的标准存储。

### 构造函数

```python
SessionStore(sessions_dir: Path, config: GatewayConfig, has_active_processes_fn=None)
```

- `sessions_dir` —— `sessions.json` 所在的目录。
- `config` —— 用于路由与后台维护设置的 `GatewayConfig` 实例。
- `has_active_processes_fn` —— 可选回调，以 `session_key` 为键，用于检查是否有正在运行的后台进程。带有活动进程的会话会受到保护，免于路由条目清理。

### 操作（方法）

| 方法 | 说明 |
|---|---|
| `get_or_create_session(source, force_new=False)` | 核心入口点。返回现有或创建新的 `SessionEntry`。评估显式挂起和重启恢复状态。创建/结束 SQLite 记录。 |
| `update_session(session_key, last_prompt_tokens=None)` | 交互后的轻量级元数据更新。递增 `updated_at`，可选地记录 `last_prompt_tokens`。 |
| `reset_session(session_key, display_name=None)` | 显式重置（来自 `/new` 或 `/reset`）。创建新的 `session_id`，设置 `is_fresh_reset=True`。结束旧 SQLite 会话，创建新会话。 |
| `switch_session(session_key, target_session_id)` | 切换到不同的现有会话 ID（来自 `/resume`）。结束当前 SQLite 会话，重新打开目标会话。 |
| `suspend_session(session_key)` | 将会话标记为 `suspended=True`（来自 `/stop`）。强制在下次访问时自动重置。 |
| `mark_resume_pending(session_key, reason)` | 将会话标记为 `resume_pending=True`（来自排空超时）。在下次访问时保留 session_id。不会覆盖 `suspended=True`。 |
| `clear_resume_pending(session_key)` | 在成功恢复回合后清除 `resume_pending`。由网关在 `run_conversation()` 返回后调用。 |
| `suspend_recently_active(max_age_seconds=120)` | 崩溃恢复：将最近活跃的会话标记为 `resume_pending=True`。跳过已挂起和已暂停的条目。在不干净关闭后的启动时调用。 |
| `prune_old_entries(max_age_days)` | 删除超过 `max_age_days` 的条目（基于 `updated_at`）。跳过 `suspended` 条目和有活跃进程的会话。 |
| `list_sessions(active_minutes=None)` | 返回所有会话，可选地按最近活动过滤。按 `updated_at` 降序排序。 |
| `lookup_by_session_id(session_id)` | 查找持久化会话 ID 对应的活跃 `SessionEntry`。 |
| `has_any_sessions()` | 检查是否曾经创建过任何会话（使用 SQLite 查询历史，而不仅仅是内存字典）。 |
| `append_to_transcript(session_id, message, skip_db=False)` | 将消息追加到 SQLite 转录记录。`skip_db=True` 防止智能体已持久化时的重复写入。 |
| `rewrite_transcript(session_id, messages)` | 完全替换会话转录记录（由 `/retry`、`/undo`、`/compress` 使用）。 |
| `load_transcript(session_id)` | 从会话的 SQLite 转录记录中加载所有消息。 |
| `rewind_session(session_id, n=1)` | 通过软删除回退 `n` 个用户回合（保留审计追踪）；是对 `SessionDB.rewind_user_turn`（`hermes_state_rewind.py`）的轻量封装，是与 CLI `/undo`/`/retry` 及 TUI 共享的唯一回退实现。返回 `{rewound_count, turns_undone, target_text}`。 |

### 内部辅助函数

- `_ensure_loaded()` / `_ensure_loaded_locked()` — 将 `sessions.json` 加载到 `_entries` 字典。
- `_save()` — 通过临时文件 + `atomic_replace` 原子写入 `sessions.json`。
- `_generate_session_key(source)` — 使用配置参数委托给 `build_session_key()`。

### 存储布局

```
{sessions_dir}/
  sessions.json          # 内存中的 _entries 字典，以 JSON 持久化
                           # 映射 session_key → SessionEntry（仅元数据）
  {session_id}.jsonl     #（旧版，在 spec 002 中移除）
```

规范的转录记录存储是通过 `SessionDB`（来自 `hermes_state`）的 SQLite。`sessions.json` 文件持久化 `session_key → session_id` 映射和条目元数据（标志、时间戳、令牌计数）。如果 SQLite 不可用，存储回退到 JSONL，但这是一条降级路径。

---

## 4. SessionKey 生成规则

会话键是标识对话通道的确定性字符串。它们由 `build_session_key(source, group_sessions_per_user, thread_sessions_per_user)` 生成。

### 键格式

```
agent:main:{platform}:{chat_type}[:{chat_id}][:{thread_id}][:{participant_id}]
```

### 私聊规则

| 场景 | 键 |
|---|---|
| 带 chat_id 的私聊 | `agent:main:telegram:dm:12345` |
| 带 chat_id + thread 的私聊 | `agent:main:telegram:dm:12345:thread_678` |
| 无 chat_id，有 participant_id 的私聊 | `agent:main:signal:dm:user_abc` |
| 无 chat_id 或 participant_id 的私聊 | `agent:main:telegram:dm` |
| WhatsApp 私聊（规范化后） | `agent:main:whatsapp:dm:{canonical_number}` |

- 私聊始终在存在时包含 `chat_id`，隔离每个私人对话。
- `thread_id` 进一步区分同一私聊会话中的话题私聊。
- 没有 `chat_id` 时，回退到 `user_id_alt` 或 `user_id` 作为 participant_id。
- 没有任何标识符时，该平台上的所有私聊折叠为一个共享会话。

### 群组/频道规则

| 场景 | 键 |
|---|---|
| 群聊 | `agent:main:telegram:group:-10012345` |
| 群聊，按用户隔离 | `agent:main:telegram:group:-10012345:user_abc` |
| 群组中的话题，共享 | `agent:main:discord:group:12345:thread_678` |
| 群组中的话题，按用户 | `agent:main:discord:group:12345:thread_678:user_abc` |
| 频道 | `agent:main:slack:channel:C12345` |
| WhatsApp 群组（规范化后） | `agent:main:whatsapp:group:{canonical_id}:{participant}` |

- `chat_id` 标识父群组/频道。
- `thread_id` 区分该父级内的话题。
- **按用户隔离**（追加 `participant_id`）由以下配置控制：
  - `group_sessions_per_user`（默认：`True`）——群组/频道会话相互隔离。
  - `thread_sessions_per_user`（默认：`False`）——话题默认**共享**
    （Telegram 论坛主题、Discord 话题串、Slack 话题串均按话题共享同一会话）。
- `participant_id` = `user_id_alt` 或 `user_id`（按此优先级）。
- WhatsApp 标识符会被规范化，以处理 JID/LID 别名翻转。

### 特殊情况：WhatsApp

WhatsApp 电话号码会经过 `canonical_whatsapp_identifier()` 处理，该函数会去除
`@s.whatsapp.net` 后缀并规范为 E.164 格式。这可以防止桥接在返回同一电话号码
的不同别名形式时导致会话碎片化。

---

## 5. 多用户隔离策略

多用户隔离决定同一聊天中的多个用户是共享一段对话，还是各自拥有私密会话。

### 决策逻辑（`is_shared_multi_user_session`）

```python
def is_shared_multi_user_session(source, *, group_sessions_per_user, thread_sessions_per_user):
    if source.chat_type == "dm":
        return False  # 私聊始终私有
    if source.thread_id:
        return not thread_sessions_per_user  # 话题：除非按用户，否则共享
    return not group_sessions_per_user       # 群组：除非共享，否则隔离
```

### 总结

| 聊天类型 | 默认 | 配置控制 |
|---|---|---|
| 私聊 | 私有（从不共享） | 不适用 |
| 群组/频道 | 按用户隔离 | `group_sessions_per_user`（默认：True） |
| 话题（论坛、discord） | 共享（所有参与者看到相同上下文） | `thread_sessions_per_user`（默认：False） |

### 对系统提示词的影响

当 `shared_multi_user_session=True` 时，系统提示词会省略固定的用户名，转而声明：
*"多用户 \{thread|session\} —— 消息以 [发送者名字] 为前缀。可能有多个用户参与。"*
单个发送者名字在运行时由网关为每条用户消息加上前缀，从而保留提示词缓存
（系统提示词不会随轮次变化）。

---

## 6. 显式对话边界

非活跃状态和墙钟时间从不会轮换对话。`/new` 和 `/reset` 会创建显式边界；
上下文压缩会继续管理长历史记录。旧版定时器配置会被忽略。现有的
`SessionResetPolicy` 数据类型是惰性兼容数据，而非运行时策略。

显式挂起仍会在下一个入站轮次创建边界。恢复过程会尊重显式和历史最终化的
边界，而不会重新打开它们。仅资源驱逐和 WebSocket 孤儿清理会让对话保持
可恢复。

---

## 7. 重启恢复流程

重启恢复系统确保进行中的会话在网关重启、崩溃和 drain 超时期间得以保留。
这是 issue #7536 的解决方案。

### 启动恢复序列

```
Gateway starts
       │
       ▼
┌───────────────────────────────┐
│ Check for .clean_shutdown     │── Exists? ──► Skip suspension (clean exit)
│ marker                        │
└───────────────────────────────┘
       │ Missing
       ▼
┌───────────────────────────────┐
│ session_store                 │── Marks sessions updated within
│ .suspend_recently_active()    │   last 120 seconds as resume_pending
└───────────────────────────────┘
       │
       ▼
┌───────────────────────────────┐
│ _suspend_stuck_loop_sessions()│── Suspends sessions that have been
│                               │   active across 3+ restarts
└───────────────────────────────┘
       │
       ▼
┌───────────────────────────────┐
│ Queue inbound messages while  │
│ startup restore runs          │
│ (_startup_restore_in_progress)│
└───────────────────────────────┘
       │
       ▼
┌───────────────────────────────┐
│ For each adapter, find        │
│ resume_pending sessions →     │
│ synthesize MessageEvent and   │
│ run _handle_message to let    │
│ the agent auto-continue      │
└───────────────────────────────┘
```

### suspend_recently_active(max_age_seconds=120)

当不存在 `.clean_shutdown` 标记（表明发生了崩溃或意外退出）时，在网关启动时调用。对于最近 120 秒内更新过的每个会话：

- 设置 `resume_pending=True`、`resume_reason="restart_interrupted"`、
  `last_resume_marked_at=now`。
- 跳过已为 `resume_pending=True` 的条目（避免重复标记）。
- 跳过显式为 `suspended=True` 的条目（硬清空应保持不变）。

### 卡死循环检测（`_suspend_stuck_loop_sessions`）

通过一个 JSON 文件（`{HERMES_HOME}/restart_counts.json`）统计连续重启次数。如果某个会话在连续 3 次以上重启期间一直处于活跃状态，则自动将其挂起，以便用户获得一个干净的初始状态。

### 排空超时标记

在优雅关闭/重启时，排空系统会为任何一个在排空超时触发时仍处于回合进行中的会话调用 `mark_resume_pending()`。原因包括：

- `"restart_timeout"` — 在重启排空期间被终止
- `"shutdown_timeout"` — 在关闭排空期间被终止
- `"restart_interrupted"` — 崩溃恢复（来自 `suspend_recently_active`）

这三种原因都位于 `_AUTO_RESUME_REASONS` 中，并具备启动时自动恢复的资格。

### 下次访问时自动恢复

当 `get_or_create_session()` 遇到 `resume_pending=True` 时：

1. 它返回现有条目，而**不会**创建新的 `session_id`。
2. 现有记录被完整加载。
3. 标记不会在此处清除——它会一直保留，直到下一次成功完成回合（在 `run_conversation()` 返回真实响应后，网关调用 `clear_resume_pending()`）。
4. 如果恢复后的回合再次被中断，`resume_pending` 标志将保持设置，下一次重启会重试。卡死循环计数器负责最终升级处理（重试 3 次 → 挂起）。

### 干净关闭标记（`.clean_shutdown`）

在优雅关闭结束时写入。在下一次启动时：

- 如果该标记存在：完全跳过 `suspend_recently_active()`。活跃智能体已被排空，因此没有会话被卡住。
- 然后删除该标记。

这可以防止在 `hermes update`、`hermes gateway restart` 或 `/restart` 之后发生不必要的自动重置。

---

## 8. 消息排队流程

消息排队系统处理两种情况：

1. **中断后的后续消息** — 当用户在某智能体处理中发送多条消息时，后续消息会作为单槽位的待处理消息排队。
2. **`/queue` FIFO** — 显式的 `/queue` 命令，每一条都必须按顺序产生各自完整的智能体回合，不进行合并。

### 数据结构

```
adapter._pending_messages: Dict[session_key, MessageEvent]
    └── 每个会话一个「下一个」槽位。重复发送时被覆盖
        （突发合并）。与图片突发后续消息共享。

self._queued_events: Dict[session_key, List[MessageEvent]]
    └── 溢出缓冲区。当槽位被占用时，
        每次 /queue 调用追加到此处。在每次排空后逐个提升。
```

### 入队（`_enqueue_fifo`）

```
_enqueue_fifo(session_key, event, adapter)
       │
       ▼
┌───────────────────────────────────────┐
│ 槽位空闲？                             │
│（session_key 不在 _pending_messages 中）│── 是 ──► 将事件放入槽位
└───────────────────────────────────────┘
       │ 否
       ▼
追加到 _queued_events[session_key]（溢出尾部）
```

### 出队 / 提升（`_promote_queued_event`）

在槽位被消费后的排空点调用。如果存在溢出条目：

- 当 `pending_event is None`（槽位为空）时，返回溢出队首作为新事件。
- 当 `pending_event` 存在时，将溢出队首暂存于槽位中，供下一次递归使用。
- 如果没有可用的适配器，则推回 `_queued_events`（不要静默丢弃）。

### 队列深度

`_queue_depth(session_key, adapter)` 返回 `len(overflow) + (1 if slot occupied else 0)`。

### 清除

某个会话的排队事件会在 `/new` 和 `/reset` 时被清除（通过 `_handle_reset_command`）。

### FIFO 不变式

每次 `/queue` 调用严格产生一个完整的智能体回合，按 FIFO 顺序执行，不合并。单槽位的 `_pending_messages` + 溢出的 `_queued_events` 设计确保在活跃回合期间重复发送不会导致乱序处理。

---

## 9. 会话上下文注入

`SessionContext` 由 `SessionSource` 和 `GatewayConfig` 构建，并注入到智能体的系统提示词中。它告诉智能体：

- 当前消息来自哪里
- 连接了哪些平台
- 它可以将定时任务输出投递到哪里
- 这是否是一个共享的多用户会话

### 构建（`build_session_context`）

```python
def build_session_context(source, config, session_entry=None) -> SessionContext
```

1. 从配置中收集已连接的平台。
2. 收集每个平台的 home 频道。
3. 通过 `is_shared_multi_user_session()` 判断 `shared_multi_user_session`。
4. 如果提供了 `session_entry`，则附加会话元数据（key、id、时间戳）。

### PII 脱敏（`build_session_context_prompt`）

动态系统提示词部分（`## Current Session Context`）可选地在发送给 LLM 之前对个人身份信息进行脱敏：

- 用户 ID → `user_<12hex>`（SHA-256 前缀）
- 聊天 ID → `<platform>:<12hex>` 或仅 `<12hex>`
- 排除脱敏的平台：Discord（`@mentions` 需要原始 ID），以及任何未标记为 `pii_safe` 的插件注册平台。

脱敏仅应用于系统提示词文本。路由、会话密钥和适配器操作始终使用原始值。

---

## 10. 后台例行维护

`_session_housekeeping_watcher` 会定期清理空闲的缓存智能体，在内存压力下释放缓存条目，并每小时修剪旧的路由条目。它从不会因不活跃或一天中的时间而结束对话记录。

TTL、LRU 和压力驱逐会在软释放客户端之前将实时对话记录提交到记忆服务商。活跃轮次保持受保护；终端、浏览器和后台进程资源在软释放后仍存活。路由条目修剪会保留规范的 SQLite 对话记录，实时进程会保护其路由条目免遭修剪。历史 `expiry_finalized` 标志仍作为恢复围栏，但不再由定时 watcher 写入。

---

## 11. 智能体缓存

网关维护一个以 `session_key` 为键的 `AIAgent` 实例 LRU 缓存，以在轮次之间保留提示词缓存。

### 缓存属性

- **最大大小：** 128 个条目（`agent.agent_cache.max_size`，默认 `_AGENT_CACHE_MAX_SIZE`）。
- **驱逐策略：** 最近最少使用（通过 `OrderedDict` 实现 LRU）。
- **空闲 TTL：** 3600 秒（1 小时）— `agent.agent_cache.idle_ttl_secs`，由 `_session_housekeeping_watcher` 执行。
- **内存预算：** `agent.agent_cache.memory_high_mb`（默认 `auto`）— 见下文。
- **锁：** `_agent_cache_lock`（threading）用于线程安全。

### 内存压力驱逐

缓存的智能体会固定 `_session_messages`，即包含工具输出的完整实时对话记录 —— 在具有 100+ 次工具调用的会话中可达数十 MB。条目上限和空闲 TTL 对此都视而不见：服务于大量聊天的网关会让每个热对话记录常驻内存（在 TTL 内进行过一轮的智能体永远不会被空闲清扫），因此 RSS 持续攀升，直到 cgroup 开始限流，且 SIGTERM 无法在 systemd 的停止超时内完成刷新（#80764）。

`_sweep_agent_cache_under_pressure()` 是泄压阀。在每个 watcher  tick 中，它会将进程的匿名 RSS 与 `memory_high_mb` 进行比较；超过预算时，它通过与上限执行器相同的软路径（`_commit_then_release_soft`）驱逐 LRU 智能体，然后运行 `malloc_trim`，使释放的内存区域真正归还给操作系统。被驱逐的会话在下一轮时从已持久化的会话重建其对话记录。

三类会话永远不会被释放：

- 当前正在进行轮次的智能体（其客户端和沙箱正在使用中）；
- `protect_recent` 个最近使用的会话（它们的提示词缓存价值最高）；
- 任何其实时对话记录尚未完成落盘的会话 —— `transcript_persistence_caught_up()` 将 `_last_flushed_db_idx` 与 `len(_session_messages)` 进行比较，这正是 FTS 写入损坏防护在保留实时历史记录而非滞后的对话记录时所反应的同一差异。

`memory_high_mb: auto` 从网关运行所在的 cgroup 限制（先是 `memory.high`，然后是 `memory.max`，再然后是 cgroup v1）推导预算，在无限制时回退到总 RAM。设置一个数字可将其固定，或设为 `0`/`off` 完全禁用该过程。辅助函数位于 `gateway/agent_cache_pressure.py`。

### 缓存生命周期

```
消息到达
    │
    ▼
get_or_create_session()  →  获取 session_key
    │
    ▼
查找 _agent_cache[session_key]
    │
    ├── 命中 → move_to_end()，复用 AIAgent（保留提示词缓存）
    │
    └── 未命中 → 创建新的 AIAgent，存入缓存
                （如果已达容量，popitem(last=False) 驱逐 LRU 条目）
    │
    ▼
run_conversation()  →  智能体处理消息
    │
    ▼
例行维护软释放空闲智能体，但不结束对话记录
```

### 清理流程

资源驱逐会移除缓存的智能体，并在软释放客户端之前提交记忆。完整的 `_cleanup_agent_resources(agent)` 拆除仅保留用于实际对话边界和关闭时。

---

## 附录：关键配置

| 配置键 | 类型 | 默认值 | 描述 |
|---|---|---|---|
| `group_sessions_per_user` | `bool` | `true` | 按用户隔离群组/频道会话 |
| `thread_sessions_per_user` | `bool` | `false` | 按用户隔离线程会话 |
| `session_store_max_age_days` | `int` | `0` | 修剪超过 N 天的会话（0=禁用） |
| `agent.gateway_auto_continue_freshness` | `int` | `3600` | 恢复新鲜度窗口的秒数 |
| `agent.gateway_timeout` | `int` | `1800` | 智能体轮次超时（默认 30 分钟） |
| `agent.agent_cache.max_size` | `int` | `128` | 缓存的 AIAgent 的 LRU 条目上限 |
| `agent.agent_cache.idle_ttl_secs` | `int` | `3600` | 空闲这么久后驱逐智能体 |
| `agent.agent_cache.memory_high_mb` | `int`/`str` | `auto` | 超过此匿名 RSS 预算时释放 LRU 对话记录 |
| `agent.agent_cache.max_evictions_per_pass` | `int` | `16` | 每轮压力处理中释放会话的上限 |
| `agent.agent_cache.protect_recent` | `int` | `8` | 压力处理永不触及的 MRU 会话数 |

## 状态数据库与 FTS 恢复

规范对话记录存储在 `sessions` 和 `messages` 表中。FTS5 表及其同步触发器是派生索引，可以在不删除规范消息的情况下分离并重建。有关有界实时故障模式和明确的修复流程，请参阅 [状态数据库恢复](state-db-recovery.md)。

### 对话生命周期

不支持空闲或每日重置设置。显式的 `/new` 和 `/reset`、压缩、挂起和崩溃恢复各自保留其独立的生命周期角色。
