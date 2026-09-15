---
sidebar_position: 7
title: "智能体混合（Mixture of Agents）"
description: "创建命名的 MoA 预设，它们会作为可选模型出现在智能体混合（Mixture of Agents）服务商下"
---

# 智能体混合（Mixture of Agents）

智能体混合（Mixture of Agents）是一个虚拟模型服务商。每个命名的 MoA 预设都会作为可选模型出现在 `moa` 服务商下。

当你选择一个 MoA 预设时，该预设的聚合器（aggregator）就是实际执行的模型。它负责撰写助手回复并发起工具调用。参考模型（reference models）先运行，为聚合器提供分析供其使用。

当一项困难任务受益于多种模型视角，但仍需要 Hermes 正常的智能体循环时——工具调用、后续迭代、中断、对话记录持久化，以及与其他任何消息相同的会话上下文——就使用 MoA。

## 选择 MoA 预设作为你的模型

你可以通过常规的模型选择界面来选择预设：

```bash
/model default --provider moa
/model review --provider moa
```

MoA 预设可在**每一个 Hermes 界面**上选择，因为 MoA 在模型系统中是一个普通服务商：

- **CLI / 网关 / TUI `/model`** — 使用 `/model <preset> --provider moa`，或 `/model --provider moa` 选择默认预设。当名称与已配置的预设完全匹配时，也可以使用裸 `/model <preset>`。
- **`hermes model`** 和 **Dashboard 模型选择器** — 会出现一个 `Mixture of Agents` 服务商行，其模型即为你预设的名称。
- **Desktop GUI 应用** — 模型下拉菜单会显示一个 `MoA presets` 区域；选择其中一个（`MoA: <preset>`）即将当前模型切换到该预设。Desktop 设置面板也可以创建和编辑预设。

因此，已配置的预设会出现在任何你选择其他模型的地方。

## 斜杠命令快捷方式

`/moa` 是一次性便捷语法糖。它通过**默认**的 MoA 预设运行单个提示，然后恢复你原先使用的模型：

```bash
/moa design and implement a migration plan for this flaky test cluster
```

Hermes 会为此单轮临时切换到默认 MoA 预设，发送提示，然后再恢复你之前的模型。整个参数都被视为提示——`/moa` 不再将其解释为预设名。

```bash
/moa
```

裸 `/moa`（无提示）只会打印用法说明。

若要在此后会话中**切换**到某个 MoA 预设，请在模型选择器中选择它——MoA 预设会出现在每个模型选择界面下的 `Mixture of Agents` 服务商中（见上文）。`/moa` 刻意不是模型切换，因此普通提示绝不会意外改变你的模型。

## 在智能体循环中如何工作

当选择服务商 `moa` 时，对于每次主模型调用，Hermes 会：

1. 按名称解析所选预设；
2. 在不带工具 schema 的情况下运行配置的参考模型（它们只接收对话的用户/助手文本——不接收 Hermes 系统提示或工具调用记录——从而让参考调用保持低开销并避免严格服务商的拒绝）；
3. 将参考输出作为聚��器的私有上下文追加；
4. 使用正常的 Hermes 工具 schema 调用配置的聚合器；
5. 将聚合器响应视为真实模型响应；
6. 如果聚合器调用工具，Hermes 会正常执行这些工具；
7. 在下一个模型迭代中，同样的 MoA 流程会在更新后的对话（包括工具结果）上再次运行。

由于 MoA 是通过正常的模型系统选择，因此它会自动与 `/goal`、网关会话、TUI 会话以及 Desktop 聊天组合工作。

## 配置预设

你可以从以下位置配置命名的 MoA 预设：

- Dashboard → Models → Model Settings → Mixture of Agents
- Desktop 应用 → Settings → Model → Mixture of Agents
- `hermes moa configure [name]`
- `config.yaml`

配置存储显式的服务商/模型对，因此你可以混合使用不同服务商，并使用同一服务商的多个模型：

```yaml
moa:
  default_preset: default
  presets:
    default:
      reference_models:
        - provider: openai-codex
          model: gpt-5.5
        - provider: openrouter
          model: deepseek/deepseek-v4-pro
      aggregator:
        provider: openrouter
        model: anthropic/claude-opus-4.8
      # 可选：固定采样温度。省略时（默认），
      # 不会发送 temperature，每个模型使用其服务商默认值——
      # 与单模型 Hermes 智能体行为一致。
      # reference_temperature: 0.6
      # aggregator_temperature: 0.4

      enabled: true
```

默认预设：

- 参考：`openai-codex:gpt-5.5`
- 参考：`openrouter:deepseek/deepseek-v4-pro`
- 聚合器 / 实际执行模型：`openrouter:anthropic/claude-opus-4.8`

### 顾问输出

MoA 使用服务商拥有的输出限制。不再支持预设及每个槽位的输出 token 上限设置。服务商默认值各不相同；省略并不总是意味着模型最大值。要求输出限制的原生协议会从 Hermes 接收一个内部值。

### 使用 `fanout` 的顾问节奏

默认情况下，顾问**每个用户轮次运行一次**（`fanout: user_turn`）——它们在轮次的第一条消息上综合出计划级别的建议，然后实际执行的聚合器独自完成剩余的整个工具循环。这是最便宜的节奏：顾问成本不会随一个轮次中的工具调用数量成倍增加。另外两种节奏以成本换取建议的新鲜度：

- `fanout: per_iteration` — 顾问在**每一次工具迭代**都重新运行，因此其建议始终跟随最新的工具结果——代价是顾问的延迟和开销随一个轮次中的工具调用数量成倍增加。
- `fanout: every_n:3` — 折中方案：顾问在每个用户轮次的**第一次**迭代运行，之后每**第 3 次**工具迭代运行一次（任意 `N >= 2` 均可）。中间的迭代复用上一次顾问运行的缓存指引，因此聚合器在每一步仍能获得建议——只是每 N 步刷新一次，而非每步都刷新。计数器在每个新用户消息时重置，因此每个轮次都以新鲜建议开始。映射形式 `fanout: {mode: every_n, n: 3}` 也会被接受并规范化为字符串形式。

```yaml
moa:
  presets:
    fresh:
      reference_models:
        - provider: openrouter
          model: anthropic/claude-opus-4.8
      aggregator:
        provider: openrouter
        model: openai/gpt-5.5
      fanout: per_iteration   # 顾问在每一次工具迭代都刷新
```

未知或格式错误的值会回退到 `user_turn`。

:::note 默认变更
在 2026 年 7 月之前，默认节奏是 `per_iteration`。现在的默认值是
`user_turn`——即最便宜、影响最小的节奏——直到针对各模式的基准测试
证明更昂贵的默认值合理性为止。想要恢复逐步建议的预设需显式设置 `fanout: per_iteration`。
:::

### 顾问输出的隐私过滤器

顾问输出可能将对话中的敏感数据——电子邮件、格式化电话号码、API 密钥、JWT——回显到 UI 中显示的参考块、保存的 MoA 追踪记录，以及聚合器提示中。`moa.privacy_filter`（默认关闭）会对这些界面进行脱敏：

```yaml
moa:
  privacy_filter: display   # 或：full
```

- `display` — 仅对**用户可见界面**脱敏：UI 中呈现的带标签参考块，以及由 `save_traces` 写入的记录。聚合器仍会接收原始的顾问文本，因此答案质量不受影响。
- `full` — 额外对注入聚合器提示中的顾问文本（以及一次性 `/moa` 综合输入）脱敏。

凭据形态（API 密钥前缀、JWT、私钥、数据库连接字符串）由 Hermes 的中央密钥脱敏器遮盖；MoA 过滤器在其之上添加了电子邮件和格式清晰电话号码的脱敏。对于代码审查式建议，这些模式刻意保持保守：裸数字串、行号、时间戳、git SHA 以及 IP 地址绝不会被触碰——只有分隔符式的电话格式，如 `(555) 123-4567` 或 `555-123-4567` 才会匹配。

### 每个槽位的推理强度

参考和聚合器槽位也可以设置 `reasoning_effort`。当你希望同一个模型以不同深度参与，或希望聚合器比起咨询性参考者思考得更深入时使用它。有效值匹配 Hermes 常规推理控制：`none`、`minimal`、`low`、`medium`、`high`、`xhigh`、`max` 和 `ultra`。

```yaml
moa:
  presets:
    deep_review:
      reference_models:
        - provider: openai-codex
          model: gpt-5.6-sol
          reasoning_effort: low
        - provider: openai-codex
          model: gpt-5.6-sol
          reasoning_effort: xhigh
        - provider: xai-oauth
          model: grok-4.5
      aggregator:
        provider: openai-codex
        model: gpt-5.6-sol
        reasoning_effort: high
```

省略 `reasoning_effort` 即使用该槽位的服务商/Hermes 默认值。

## 终端预设管理

```bash
hermes moa list
hermes moa configure              # 更新默认预设
hermes moa configure review       # 创建或更新命名预设
hermes moa delete review
```

## 基准测试

在 HermesBench 上，一个双模型 MoA 预设——`claude-opus-4.8` 聚合，基于一个 `gpt-5.5` 参考——得分高于任一模型单独运行：

| 模型 | HermesBench 得分 |
|---|---|
| **Opus 聚合器（opus-4.8 + gpt-5.5 参考）— MoA** | **0.8202** |
| `anthropic/claude-opus-4.8` | 0.7607 |
| `openai/gpt-5.5` | 0.7412 |

MoA 配置比其最强组件（opus-4.8）高出约 6 分，证实了聚合第二种视角能在困难任务上提升质量，而不仅仅是平均两者。

## 提示缓存

MoA 的设计使**主对话的提示缓存绝不会被破坏**。选择 MoA 预设是一次普通的模型选择：它不会变更过往上下文、替换工具集或在对话中途重建系统提示。你的对话历史、系统提示和工具 schema 保持逐字节稳定，因此其他模型依赖的缓存前缀会完全如普通模型那样被保留。切换到 MoA 预设或从之切出，代价与其他任何 `/model` 切换的缓存失效相同——不会更多。

两种内部调用类型都会正常缓存：

- **参考模型**接收经过裁剪、确定性的对话视图（系统提示和工具记录被剥离——见上文的循环）。由于该视图是稳定历史的稳定函数，参考模型的提示前缀会在各次迭代中重复并正常缓存。参考是不带工具的简短咨询调用。
- **聚合器**是实际执行的模型。参考输出被作为私有指引追加到最新用户轮次的*末尾*。由于该文本位于尾部——在整个稳定前缀（系统提示 + 先前历史）之下——它不会使任何缓存前缀失效：聚合器在注入内容之上的所有部分都能命中缓存，只有新追加的尾部是新内容。这与每个普通轮次的行为完全一致，其中每条新用户消息也是未缓存的尾部 token。

因此 MoA 在两种调用类型上都不牺牲提示缓存。它唯一的真实成本是每次迭代额外的参考调用——你为多种模型视角付费，而不是为损坏的缓存付费。与 Hermes 其他部分共享的长生命周期对话前缀完全完好。

## 注意事项

- MoA 不再列于 `hermes tools` 下；没有需要启用的 `moa` 工具集。
- 在预设上设置 `enabled: false` 会禁用该预设的参考扇出：聚合器独自执行，就如同你把它当作普通模型选择一样。这是 dashboard 和 desktop 设置中暴露的每预设关闭开关。
- 一个预设的聚合器不能是另一个 MoA 预设。递归的 MoA 树被有意阻止。
- 一个参考模型上的凭据失败不会中止该轮次。Hermes 会将失败包含在参考上下文中，并继续使用任何返回了的模型。
- MoA 会增加模型调用次数。单次模型迭代可能涉及多次参考调用加上聚合器调用。
