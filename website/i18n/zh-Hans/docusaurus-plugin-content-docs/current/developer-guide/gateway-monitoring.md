---
title: "网关监控"
description: "健康导出、结构化诊断、队列查询以及如何扩展监控平面"
---

# 网关监控

针对 Hermes 网关守护进程的服务健康监控与结构化运维诊断，通过 OTLP/HTTP 导出到运维人员配置的端点（OpenTelemetry Collector、DataDog 或任何 OTLP 接收端）。

此平面在设计上不包含内容。它导出网关和定时任务的生命周期状态、平台连接器健康状况，以及无内容的警告/错误诊断。它绝不导出提示词、消息、工具参数或结果、任务名称、目标地址、调度计划、原始错误、会话历史、使用分析、审计日志或详细执行追踪。运行/模型/工具轨迹捕获是另一个独立平面，由 Hermes 原生 NeMo Relay SDK 集成以及显式配置的 Relay 订阅者或导出器提供。

## 导出内容

| 信号 | OTLP 路由 | 内容 |
| --- | --- | --- |
| 网关指标（gauge） | `/v1/metrics` | `hermes.gateway.up/state/busy/drainable/active_agents/background_work/background_delegations/restart_requested`、`hermes.platform.up/degraded`，带有有界 `error_code` 属性 |
| 健康/生命周期事件 | `/v1/traces` | `gateway.lifecycle` 状态转换（`starting -> running -> draining -> stopped`、`startup_failed`、退出）、`gateway.health_snapshot`、平台状态变化 |
| 诊断 | `/v1/logs` | 警告/错误网关事件，带有固定正文以及有界的子系统、严重级别、错误类别和错误代码属性；渲染后的日志消息绝不导出 |
| 定时任务调度器指标 | `/v1/metrics` | 时钟心跳与最近成功时间间隔（不可用时省略）、来自调度器过期窗口分支的单调追赶发生次数、已启用/运行中任务数量，以及基于持久化的 `next_run_at` 加上调度器现有宽限规则推导出的逾期数量 |
| 定时任务执行生命周期 | `/v1/traces` | 持久化的 `claimed/running/completed/failed/unknown` 状态、有界的来源与错误类别、不透明哈希任务键、时间戳存在时的已用时长，以及调度器已知时的投递结果；终态会发起一次失败开放的 flush 尝试，最多可能将完成延迟一秒 |

信号携带 `service.name`、版本、监督模式，以及安装 ID 的稳定单向哈希，以便运维人员在不导出账户/配置档身份或原始安装标识符的情况下区分实例。

`hermes.gateway.active_agents`、`hermes.gateway.background_work` 和 `hermes.gateway.background_delegations` 互为补充。`active_agents` 统计前台消息轮次加上进行中的定时任务加上 API 运行——即网关在关闭时要排空的工作。`background_work` 统计 `active_agents` 从不包含的游离工作：后台化的 `delegate_task` 子智能体、`terminal(background=true)` 进程以及看板工作器；它是**以任务为粒度**的——一批 N 个子智能体的扇出计为 N——因此它反映真实的并发子智能体负载。`background_delegations` 只统计异步委托**单元**（每次 `delegate_task` 派发为一个单元，一批扇出为一个单元），与异步池的容量核算相匹配；可针对 `delegation.max_concurrent_children` 对其告警以查看槽位压力。将 `active_agents` 与 `background_work` 相加得到每个实例的总活动工作量；使用 `background_delegations` 观察池饱和情况。

## 启用

```yaml
# config.yaml
monitoring:
  gateway_health_export:
    enabled: true
  export:
    otlp:
      enabled: true
      endpoint: http://collector-host:4318/v1/traces   # 由此推导 metrics/logs
      headers_env: {}   # 请求头名称 -> 环境变量名（值绝不存储）
```

随时检查状态：

```bash
hermes monitoring status
```

OpenTelemetry SDK 是可选的附加组件（`pip install 'hermes-agent[otlp]'`），首次使用时惰性安装。当 SDK 缺失或端点不可用时，网关运行不受影响：指标收集和常规事件导出始终不在热路径上，而终态定时任务事件会发起一次最多一秒的有界失败开放 flush 尝试，使最终状态不易丢失。

在 systemd/launchd/s6 监督、容器、tmux 或直接 `hermes gateway run` 下运行方式完全一致：导出器位于网关进程内，因此主机上无需边车、代理或收集器。

## 采集到 DataDog

运行客户自有的 OpenTelemetry Collector 并转发：

```yaml
# otel-collector 配置
receivers:
  otlp:
    protocols:
      http:
exporters:
  datadog:
    api:
      key: ${env:DD_API_KEY}
service:
  pipelines:
    metrics:   {receivers: [otlp], exporters: [datadog]}
    traces:    {receivers: [otlp], exporters: [datadog]}
    logs:      {receivers: [otlp], exporters: [datadog]}
```

将 `monitoring.export.otlp.endpoint` 指向该 Collector。告警应挂在
`hermes.gateway.up`、`hermes.platform.up` 和 `hermes.platform.degraded` 上。

## 通用集群查询与告警

具体语法取决于客户的可观测性后端。以下示例使用 PromQL 风格的表达式，并有意避免
厂商专属的路由、目标或客户清单。

按不透明的 `service.instance.id` 资源属性对集群视图分组。已经终止的进程无法再发出
自己的零值，因此每个部署都需要同时具备显式状态检测和缺失序列检测。

```promql
# 网关显式故障。
hermes_gateway_up == 0

# 主机消失或停止导出。选择一个比配置的导出间隔与 Collector 重试宽限
# 都更长的窗口。
absent_over_time(hermes_gateway_up[5m])

# 本地管理的网桥显式宕机。
hermes_platform_up == 0

# 调度器线程已停滞，即使网关可能仍然存活。
hermes_cron_scheduler_heartbeat_age_seconds > 180

# 心跳循环仍在运行，但最近未完成一次成功的 tick。
hermes_cron_scheduler_last_success_age_seconds > 300

# 一个或多个任务已超出其现有的调度器宽限窗口。
hermes_cron_jobs_overdue > 0

# 补跑计数器增加，证明至少有一次错过发生的任务被合并并延迟执行了一次。
increase(hermes_cron_scheduler_catch_up_occurrences[15m]) > 0
```

Cron 执行生命周期记录以 `hermes.cron_execution` span 的形式到达。
针对有界属性发出告警或派生事件，例如：

```text
hermes.status = failed|unknown
hermes.delivery_outcome = failed|not_configured
hermes.error_class = auth_failed|rate_limited|timeout|network_error|
                     dispatch_failed|interrupted|empty_response|
                     invalid_config|unknown
```

推荐的运维视图：

1. 每个 `service.instance.id` 一行，包含网关以及已配置的本地平台状态；
2. 调度器心跳、最近成功时间、运行中数量、逾期数量以及补跑增量；
3. 仅以不透明的 `hermes.job_key` 作为键的 cron 生命周期数据流；
4. 分别为主机缺失、本地网桥宕机、调度器停滞、cron 失败/未知、投递失败、以及
   逾期/补跑活动设置独立告警。

将告警阈值与路由保留在部署方拥有的配置中。不要为了让仪表盘更易读而加入任务名称、
提示词、输出、时间表、目标、原始错误、配置档名称或账户身份。

## 发布验证场景

在验收部署之前，通过真实的 Collector 和后端强制触发并验证全部五种情况：

1. **Cron 成功：** 观察 `claimed -> running -> completed`、耗时以及真实的投递结果。
2. **Cron 失败：** 观察 `failed` 以及有界的错误分类，且解码后的 OTLP 载荷中没有
   任何原始异常或内容。
3. **Cron 中断：** 在执行期间停止所属网关，重启它，并观察其恢复为 `unknown`。
4. **本地管理网桥中断：** 弄坏一个原生连接器，观察其有界的 down/retrying/fatal
   状态及恢复情况，并验证未受影响的机器仍然健康。
5. **杀死网关：** 终止一台金丝雀，验证缺失序列检测，重启它，并确认同一个不透明的
   实例身份返回。

Hermes Agent 自有的 Relay 传输健康度同样在范围内。对于任何由独立网关或连接器
服务拥有的共享已连接平台状态，该服务仍然是权威来源，并应通过自己的遥测路径
导出该状态。

对于每个场景，都要验证信号和告警在恢复后清除、其他机器不受影响、Collector 失败
保持 fail-open，并且解码后的指标、span、日志和资源属性保持无内容。

## 本地冒烟测试（不使用 Docker）

```bash
# terminal 1: 在 :4318 上捕获 collector
python scripts/observability/otel_capture_collector.py \
  --host 127.0.0.1 --port 4318 --log /tmp/hermes_otel_capture.jsonl

# terminal 2: 通过生命周期转换驱动真实 exporter，
# 触发一个 fatal platform 和一个结构化 warning 事件，然后刷新
python scripts/observability/gateway_health_export_probe.py \
  --endpoint http://127.0.0.1:4318/v1/traces \
  --log /tmp/hermes_otel_capture.jsonl --wait 8
# 退出码 0 会打印: {"requests": 6, "paths": ["/v1/logs", "/v1/metrics", "/v1/traces"]}
```

## 维护和扩展此平面

此平面按设计是一套**固定的、枚举的、无内容的词汇表**。新增一个信号并不只是"发出一个新指标"——每个新名称和属性都必须在其所有强制限定词汇表的层中声明，否则它会在下游被静默丢弃。按照所要做变更对应的检查清单操作。黄金法则：**一个已发出但未在每一层都声明的新信号，看起来像代码错误，实际上是词汇表注册错误——不会有任何报错，信号就是永远不会到达。**

### 无内容不变式（适用于每一处变更）

在添加任何内容之前，先确认它不能承载内容。数字、布尔值、时长、持续时间、单调计数和单向哈希都是安全的。**绝不**添加可能持有任务名称、prompt、输出、调度、目的地、原始异常文本、文件路径、配置档名称、账户 ID 或自由格式字符串的属性。必须将一条记录关联到任务/实体时，对其进行哈希（`sha256(...)[:24]`，参见 `agent/monitoring/cron_health.py` 中的 `_job_key`）——绝不要发出原始 ID。所有可能触及用户输入的字符串属性都必须经过 `redaction.redact_for_export` 并截断（参见 `agent/monitoring/otlp_exporter.py` 中的 `_span_attrs`）。

### 新增一个 gauge/metric

1. 在 snapshot builder 中发出它（`agent/monitoring/gateway_health.py` 的 `build_gateway_health_snapshot`、`cron_health.py` 的 `build_cron_health_snapshot`，或接入 `gateway_health_export.py` 中 `_read_runtime_snapshot` 的同类 reader）。采用 best-effort 方式：绝不让 reader 异常抛进采集循环——将其包裹并记录一条**仅带异常类型名称的无内容 WARNING**（cron 和 background-work reader 使用的模式），这样将来的回归会可见，而不是静默丢弃信号。
2. 将点分格式的指标名称注册到 `gateway_health_export.py::_start_metric_provider` 中 observable-gauge 的 `metric_names` 列表里。**在 snapshot 中发出但未在此注册的 gauge 永远不会被观测。**
3. 在此文件中添加导出行和告警示例。
4. 如果部署在 exporter 前用 OpenTelemetry Collector 并使用了指标名 allowlist（一个带 `name != "..."` 守卫的 `filter/...` 处理器），也要在那里添加新名称——否则 collector 会在到达后端前丢弃它。这不属于仓库代码，但它是正确发出的新指标从未出现的最常见原因；在 PR 中指出这一点，以便部署运维人员更新其 collector 配置。

### 新增一个子系统（一族新信号）

镜像 cron 的模式（`cron_health.py` 及其接入）：将读/投影逻辑放入其自身模块，暴露一个返回有界 `GatewayMetric`（以及事件，若有）的 `build_<subsystem>_health_snapshot()`，并以相同的 best-effort try/except-WARNING 守卫将其扩展到 `_read_runtime_snapshot`。然后对每个新名称执行"添加指标"检查清单，对每个新事件属性执行"添加属性"检查清单。在下方为子系统的故障模式添加发布验证场景。

### 扩展 error-class / status / source / state 词汇表

这些是保持平面有界的闭合枚举。先扩展 SET，再扩展分类器，绝不可只做其一：

- **Cron** (`agent/monitoring/cron_health.py`)：`_KNOWN_STATUSES`、`_KNOWN_SOURCES`、`_KNOWN_DELIVERY_OUTCOMES`，以及 `classify_cron_error` 的关键词分桶。凡不在集合中的值在输出时都会被强制为 `unknown`，因此未添加到集合的新值是不可见的。
- **Gateway/platform** (`agent/monitoring/gateway_health.py`)：`_KNOWN_GATEWAY_STATES`、`_KNOWN_PLATFORM_STATES` 和 `classify_gateway_error`。

规则：保持词汇表**小而**且具有运维意义（一个错误类应映射到运维人员的动作，而非异常子类）；新分桶必须匹配稳定关键词，而非可能变化的 message 文本；更新此文件告警部分中的 `hermes.error_class = ...` 列表以及该枚举的单元测试，使契约被断言，而不是被冻结为计数。

### 为已有 event/span 添加无内容属性

将键添加到 emitter 中按种类的 `keep_by_kind` allowlist（位于 `agent/monitoring/otlp_exporter.py::_span_attrs`，未列出的键会被丢弃），若它任何时候是字符串形态，就让它经过 redaction，并且——与指标一样——如果部署的 collector 有 span-attribute `keep_keys(...)` allowlist，也要在那里添加该属性，否则它会在传输途中被剥离。

### 验证整条链路，而不仅仅是发出

发出是必要条件，但非充分条件。确认信号一路存活到后端，因为枚举、`metric_names` 注册、emitter 属性 allowlist 以及任何 collector allowlist 都会在不报错的情况下丢弃未列出的值：

```bash
hermes monitoring status                 # 姿态
python scripts/observability/gateway_health_export_probe.py \
  --endpoint http://127.0.0.1:4318/v1/traces \
  --log /tmp/cap.jsonl --wait 8          # 驱动真实 exporter
```

解码捕获到的 OTLP payload，断言新名称/属性存在，且没有内容泄露。当真正有 collector 位于前端时，添加其 allowlist 条目并针对后端（而不仅仅是本地捕获）重新验证。

## 边界与路线图

`hermes monitoring` CLI 有意仅暴露 `status`。此首个版本仅覆盖 Hermes Agent 所拥有的服务健康和运维诊断信号，包括 Hermes Agent 所拥有的 Relay 传输健康。Team Gateway 权威的共享连接器/平台状态明确不在范围内，产品分析、审计/质量报告以及详细执行 trace 同样如此。共享客户端使用指标和企业 trace 遥测正在基于 NeMo Relay 集成进行设计，拥有各自独立同意、策略与导出边界；此监测平面保持窄小，以便运维人员启用它而无需触及任何承载内容的信号。当该集成落地时，遥测表面可能会被重组。
