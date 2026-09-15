---
sidebar_position: 7
title: "Mixture of Agents"
description: "创建命名的 MoA 预设，使其以可选模型的形式出现在 Mixture of Agents 服务商下"
---

# Mixture of Agents

Mixture of Agents 是一个虚拟模型服务商。每个命名的 MoA 预设都会以可选模型的形式出现在 `moa` 服务商下。

当你选择一个 MoA 预设时，该预设的聚合器即为执行模型。它负责撰写助手回复并发出工具调用。参考模型会先行运行，为聚合器提供可供使用的分析。

当一项艰巨的任务既需要多个模型的视角、又仍然需要 Hermes 正常的智能体循环时（工具调用、后续迭代、中断、对话记录持久化，以及与其他任何消息相同的会话上下文），请使用 MoA。

## 选择 MoA 预设作为你的模型

你可以通过正常的模型选择器入口选择预设：

```bash
/model default --provider moa
/model review --provider moa
```

MoA 预设可在**每一个 Hermes 界面**上选择，因为 MoA 是模型系统中的一个普通服务商：

- **CLI / 网关 / TUI 的 `/model`** —— `/model <preset> --provider moa`，或用 `/model --provider moa` 选择默认预设。当名称与已配置的预设完全匹配时，直接输入 `/model <preset>` 也可生效。
- **`hermes model`** 和**仪表盘模型选择器** —— 会出现一行 `Mixture of Agents` 服务商，其模型即为你的预设名称。
- **Desktop GUI 应用** —— 模型下拉菜单会显示一个 `MoA presets` 区块；选择其中一项（`MoA: <preset>`）会将当前模型切换为该预设。Desktop 的设置面板也可创建和编辑预设。

因此，已配置的预设会出现在你选择任何其他模型的地方。

## 斜杠命令快捷方式

`/moa` 是一次性的便捷语法糖。它通过**默认** MoA 预设运行单条提示词，然后恢复你此前使用的模型：

```bash
/moa design and implement a migration plan for this flaky test cluster
```

Hermes 会临时切换到默认 MoA 预设来处理该轮对话，发送提示词，然后恢复你之前的模型。整个参数都是提示词——`/moa` 不再将其解释为预设名称。

```bash
/moa
```

裸的 `/moa`（不带提示词）只会打印用法说明。

如需在**整个会话期间切换**到某个 MoA 预设，请从模型选择器中选择它——MoA 预设会在每个模型选择界面中出现在 `Mixture of Agents` 服务商下（见上文）。`/moa` 刻意不作为模型切换，因此正常的提示词永远不会意外改变你的模型。

## 在智能体循环中的工作方式

当选中 `moa` 服务商时，对于每一次主模型调用，Hermes 会：

1. 按名称解析所选预设；
2. 在不带工具 schema 的情况下运行配置的参考模型（它们只接收对话中的用户/助手文本——不接收 Hermes 系统提示词或工具调用记录——以确保参考调用保持低成本并避免严格服务商的拒绝）；
3. 将参考模型的输出作为聚合器的私有上下文追加；
4. 使用正常的 Hermes 工具 schema 调用配置的聚合器；
5. 将聚合器的响应视为真实的模型响应；
6. 如果聚合器调用了工具，Hermes 会照常执行这些工具；
7. 在下一次模型迭代时，对整个更新后的对话（包括工具结果）再次运行相同的 MoA 流程。

由于 MoA 是通过正常的模型系统选择的，它会自动与 `/goal`、网关会话、TUI 会话和 Desktop 聊天组合使用。

## 配置预设

你可以从以下位置配置命名的 MoA 预设：

- 仪表盘 → 模型 → 模型设置 → Mixture of Agents
- Desktop 应用 → 设置 → 模型 → Mixture of Agents
- `hermes moa configure [name]`
- `config.yaml`

配置存储显式的服务商/模型对，因此你可以混合使用多个服务商，也可以使用同一服务商下的多个模型：

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
      # Optional: pin sampling temperatures. When omitted (the default),
      # temperature is NOT sent and each model uses its provider default —
      # the same behavior as a single-model Hermes agent.
      # reference_temperature: 0.6
      # aggregator_temperature: 0.4

      enabled: true
```

默认预设：

- 参考：`openai-codex:gpt-5.5`
- 参考：`openrouter:deepseek/deepseek-v4-pro`
- 聚合器 / 执行模型：`openrouter:anthropic/claude-opus-4.8`

### 顾问输出

MoA 使用服务商自有的输出限制。不再支持预设级别和每个槽位的输出 token 上限设置。服务商默认值各不相同；省略并不总是意味着模型的最高值。需要输出限制的原生协议会从 Hermes 收到一个内部值。

### 使用 `fanout` 的顾问节奏

默认情况下，顾问**每个用户轮次运行一次**（`fanout: user_turn`）——它们在轮次的第一条消息上综合出计划级建议，随后执行的聚合器独自完成余下的工具循环。这是成本最低的节奏：顾问成本不会随轮次中工具调用次数的增加而成倍增长。另外两种节奏以成本换取建议的新鲜度：

- `fanout: per_iteration` —— 顾问在**每一次工具迭代**时重新运行，因此其建议始终跟踪最新的工具结果——代价是顾问延迟和开销会随轮次中工具调用次数成倍增长。
- `fanout: every_n:3` —— 折中方案：顾问在每个用户轮次的**第一次**迭代运行，之后每**第 3**次工具迭代运行（任意 `N >= 2` 均可）。其间的迭代复用上一次顾问运行的缓存指导，因此聚合器在每一步仍能获得建议——只是每 N 步刷新一次，而非每一步。计数器会在每条新用户消息时重置，因此每一轮都以新鲜的建议开始。映射形式 `fanout: {mode: every_n, n: 3}` 同样被接受并被规范化为字符串形式。

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
      fanout: per_iteration   # advisors refresh on every tool iteration
```

未知或格式错误的值会回退到 `user_turn`。

:::note 默认值变更
在 2026 年 7 月之前，默认节奏为 `per_iteration`。现在默认值
为 `user_turn`——成本最低、影响最小的节奏——直到按模式的
基准测试证明采用更昂贵的默认值是合理的。希望恢复逐步建议的预设
可显式设置 `fanout: per_iteration`。
:::

### 顾问输出的隐私过滤器

顾问输出可能会将对话中的敏感数据——电子邮件、格式化电话号码、API 密钥、JWT——回显到 UI 中显示的参考块、保存的 MoA 追踪记录以及聚合器提示词中。`moa.privacy_filter`（默认关闭）会对这些界面进行脱敏：

```yaml
moa:
  privacy_filter: display   # or: full
```

- `display` —— 仅对**用户可见的界面**进行脱敏：UI 中渲染的带标签参考块以及 `save_traces` 写入的记录。聚合器仍会收到原始的顾问文本，因此回答质量不受影响。
- `full` —— 额外对注入到聚合器提示词中的顾问文本（以及一次性 `/moa` 综合输入）进行脱敏。

凭证形态（API 密钥前缀、JWT、私钥、数据库连接字符串）会由 Hermes 的中央密钥脱敏器进行遮蔽；MoA 过滤器在此之上增加了对电子邮件和明确格式化的电话号码的脱敏。对于代码审查风格的建议，其模式刻意保守：裸数字串、行号、时间戳、git SHA 和 IP 地址绝不会被触及——只有像 `(555) 123-4567` 或 `555-123-4567` 这样带分隔符的电话号码格式才会匹配。

### 每个槽位的推理强度

参考槽位和聚合器槽位也可以设置 `reasoning_effort`。当你希望同一模型以不同深度作出贡献，或希望聚合器比作为建议的参考模型思考更深入时，可以使用此设置。有效值与 Hermes 的常规推理控制一致：`none`、`minimal`、`low`、`medium`、`high`、`xhigh`、`max` 和 `ultra`。

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

省略 `reasoning_effort` 则使用该槽位的服务商/Hermes 默认值。

## 终端预设管理

```bash
hermes moa list
hermes moa configure              # update the default preset
hermes moa configure review       # create or update a named preset
hermes moa delete review
```

## 基准测试

在 HermesBench 上，一个双模型 MoA 预设——以 `claude-opus-4.8` 聚合后接 `gpt-5.5` 参考——得分高于任一单独运行的模型：

| 模型 | HermesBench 得分 |
|---|---|
| **Opus 聚合器（opus-4.8 + gpt-5.5 参考）— MoA** | **0.8202** |
| `anthropic/claude-opus-4.8` | 0.7607 |
| `openai/gpt-5.5` | 0.7412 |

该 MoA 配置比其最强的组件（opus-4.8）高出约 6 分，证实了聚合第二种视角能在艰巨任务上提升质量，而不仅仅是两者的平均。

## 提示词缓存

MoA 的构建方式确保**主对话的提示词缓存绝不会被破坏**。选择 MoA 预设是正常的模型选择：它不会改变过去的上下文、替换工具集，也不会在对话中途重建系统提示词。你的对话历史、系统提示词和工具 schema 保持字节级稳定，因此所有其他模型所依赖的缓存前缀会被原样保留，如同使用普通模型一样。切换到 MoA 预设或从其切走时所付出的缓存失效代价与任何其他 `/model` 切换相同——不多不少。

两种内部调用类型都正常缓存：

- **参考模型**接收对话的一份精简、确定性的视图（系统提示词和工具记录被剥离——见上文循环）。由于该视图是稳定历史的稳定函数，参考模型的提示词前缀在各次迭代间重复出现并正常缓存。参考调用是无工具的简短建议性调用。
- **聚合器**是执行模型。参考输出被追加到最新用户轮次的*末尾*作为私有指导。由于该文本位于尾部——位于整个稳定前缀（系统提示词 + 先前历史）之下——它不会使任何缓存前缀失效：聚合器在注入之上的一切内容都获得缓存命中，只有新近追加的尾部是新的。这正是每个正常轮次的行为，其中每条新用户消息同样也是未缓存的尾部 token。

因此 MoA 不会牺牲任何一种调用类型的提示词缓存。其唯一真正的成本是每次迭代额外的参考调用——你为多个模型视角付费，而非为损坏的缓存付费。与 Hermes 其余部分共享的长期对话前缀完全完好无损。

## 注意事项

- MoA 不再列在 `hermes tools` 下；没有需要启用的 `moa` 工具集。
- 在预设上设置 `enabled: false` 会禁用该预设的参考扇出：聚合器独自工作，与你将其作为普通模型选择时完全一样。这是在仪表盘和桌面设置中呈现的每预设定开关。
- 预设的聚合器不能是另一个 MoA 预设。递归的 MoA 树被有意阻止。
- 某个参考模型上的凭证失败不会中止该轮次。Hermes 会将失败纳入参考上下文，并以返回结果的模型继续。
- MoA 会增加模型调用次数。一次模型迭代可能涉及多个参考调用加上聚合器调用。
