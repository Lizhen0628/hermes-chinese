---
sidebar_position: 7
title: "Mixture of Agents"
description: "创建命名的 MoA 预设，它们会作为可选模型出现在 Mixture of Agents 服务商下"
---

# Mixture of Agents

Mixture of Agents 是一种虚拟模型服务商。每个命名的 MoA 预设都会作为可选模型出现在 `moa` 服务商下。

当你选择一个 MoA 预设时，该预设的聚合器就是实际起作用的模型。它负责撰写助手回复并发出工具调用。参考模型先运行，为聚合器提供可供使用的分析。

当一项困难任务既需要多个模型视角，又仍需 Hermes 正常的智能体循环——工具调用、后续迭代、中断、会话记录持久化，以及与其他任何消息相同的会话上下文——时，就使用 MoA。

## 选择一个 MoA 预设置为你的模型

你可以通过常规的模型选择界面选择预设：

```bash
/model default --provider moa
/model review --provider moa
```

MoA 预设可在**每一个 Hermes 界面**上选到，因为 MoA 是模型系统中的一个普通服务商：

- **CLI / 网关 / TUI `/model`** — `/model <preset> --provider moa`，或使用 `/model --provider moa` 选择默认预设。若名称与已配置的预设完全匹配，直接 `/model <preset>` 也可行。
- **`hermes model`** 和**仪表盘模型选择器** — 会出现一行 `Mixture of Agents` 服务商，其模型即你的预设名称。
- **Desktop GUI 应用** — 模型下拉菜单中会显示 `MoA presets` 分区；选择其中一个（`MoA: <preset>`）即可将当前模型切换为该预设。Desktop 设置面板也可以创建和编辑预设。

因此，已配置的预设会出现在你选择任何其他模型的位置。

## 斜杠命令快捷方式

`/moa` 是一次性的便捷糖。它通过**默认** MoA 预设运行单个提示词，然后恢复你原先的模型：

```bash
/moa design and implement a migration plan for this flaky test cluster
```

Hermes 会为那一轮临时切换到默认 MoA 预设，发送提示词，然后恢复你之前的模型。整个参数就是提示词——`/moa` 不再把它解释为预设名称。

```bash
/moa
```

单独使用 `/moa`（无提示词）只会打印用法说明。

若要在本会话余下时间内**切换**到某个 MoA 预设，请从模型选择器中选择它——MoA 预设会出现在每一个模型选择界面中的 `Mixture of Agents` 服务商下（见上文）。`/moa` 刻意不作为模型切换，因此普通提示词永远不会意外更改你的模型。

## 在智能体循环中如何工作

当选择的服务商为 `moa` 时，每次主模型调用，Hermes 会：

1. 按名称解析所选的预设；
2. 在不带工具 schema 的情况下运行所配置的参考模型（它们仅接收对话中的用户/助手文本——不接收 Hermes 系统提示词或工具调用记录——因此参考调用成本低，并避免被严格的服务商拒绝）；
3. 将参考模型的输出作为聚合器的私有上下文追加；
4. 使用正常的 Hermes 工具 schema 调用所配置的聚合器；
5. 将聚合器的响应视为真实的模型响应；
6. 若聚合器调用了工具，Hermes 会正常执行这些工具；
7. 在下一次模型迭代中，同样的 MoA 过程会在更新后的对话（包括工具结果）上再次运行。

由于 MoA 是通过正常的模型系统选择的，它会自动与 `/goal`、网关会话、TUI 会话和 Desktop 聊天配合工作。

## 配置预设

你可以从以下位置配置命名的 MoA 预设：

- 仪表盘 → Models → Model Settings → Mixture of Agents
- Desktop 应用 → Settings → Model → Mixture of Agents
- `hermes moa configure [name]`
- `config.yaml`

配置中存储明确的服务商/模型对，因此你可以混合服务商，并复用同一服务商下的多个模型：

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
      # 可选：固定采样 temperature。省略时（默认），
      # 不发送 temperature，各模型使用其服务商默认值 ——
      # 与单模型 Hermes 智能体的行为相同。
      # reference_temperature: 0.6
      # aggregator_temperature: 0.4

      enabled: true
```

默认预设：

- 参考：`openai-codex:gpt-5.5`
- 参考：`openrouter:deepseek/deepseek-v4-pro`
- 聚合器 / 起作用的模型：`openrouter:anthropic/claude-opus-4.8`

### Advisor 输出

MoA 使用由服务商掌管输出上限。不再支持预设级别和按槽位的输出 token 上限设置。服务商默认值各不相同；省略并不总意味着模型上限。对于要求输出上限的原生协议，Hermes 会为其提供一个内部值。

### 使用 `fanout` 控制 advisor 节奏

默认情况下，advisor **每个用户回合运行一次**（`fanout: user_turn`）——它们在回合的第一条消息上综合出计划级建议，然后由起作用的聚合器独自完成余下的工具循环。这是最省成本的节奏：advisor 成本不会随回合内工具调用数成倍增加。另有两种替代节奏，用成本换取建议的新鲜度：

- `fanout: per_iteration` —— advisor 在**每一次工具迭代**都重跑，因此其建议始终跟进最新的工具结果——代价是 advisor 的延迟和开销会随回合内工具调用数成倍增加。
- `fanout: every_n:3` —— 折中方案：advisor 在每个用户回合的**第一次**迭代运行，之后每**第 3 次**工具迭代运行一次（任意 `N >= 2` 均可）。其间的迭代复用上一次 advisor 运行缓存的指导，因此聚合器在每一步仍能获得建议——只是每 N 步刷新一次，而非每一步。计数器在每个新的用户消息时重置，因此每个回合都以新鲜的建议开始。映射形式 `fanout: {mode: every_n, n: 3}` 也被接受，并会规范化为字符串形式。

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
      fanout: per_iteration   # advisor 在每次工具迭代时刷新
```

未知或格式错误的值将回退到 `user_turn`。

:::note 默认值变更
在 2026 年 7 月之前，默认节奏为 `per_iteration`。现在的默认值为 `user_turn`——成本最低、影响最小的节奏——直到按模式的基准测试证明可以采用更昂贵的默认值。希望恢复逐步建议的预设需显式设置 `fanout: per_iteration`。
:::

### advisor 输出的隐私过滤器

advisor 输出可能将对话中的敏感数据——电子邮件、格式化电话号码、API 密钥、JWT——回显到 UI 中显示的参考区块、保存的 MoA 追踪记录以及聚合器提示词中。`moa.privacy_filter`（默认关闭）会对这些界面进行脱敏：

```yaml
moa:
  privacy_filter: display   # 或：full
```

- `display` —— 仅对**用户可见界面**脱敏：UI 中渲染的带标签参考区块，以及由 `save_traces` 写入的记录。聚合器仍接收原始的 advisor 文本，因此回答质量不受影响。
- `full` —— 额外对注入聚合器提示词（以及一次性 `/moa` 综合输入）的 advisor 文本进行脱敏。

凭证形态（API 密钥前缀、JWT、私钥、数据库连接字符串）由 Hermes 的中央密钥脱敏器遮蔽；MoA 过滤器在其之上增加电子邮件和格式化明显的电话号码的脱敏。对于代码审查风格的建议，这些模式被刻意设计得保守：纯数字串、行号、时间戳、git SHA 和 IP 地址永远不会被触及——只有带分隔符的电话格式如 `(555) 123-4567` 或 `555-123-4567` 会被匹配。

### 按槽位的推理强度

参考槽位和聚合器槽位也可以设置 `reasoning_effort`。当你希望同一模型以不同深度做出贡献，或希望聚合器比参考 advisor 思考得更深入时，可使用此项。有效值与 Hermes 正常的推理控制一致：`none`、`minimal`、`low`、`medium`、`high`、`xhigh`、`max` 和 `ultra`。

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

省略 `reasoning_effort` 即对该槽位使用服务商/Hermes 默认值。

## 终端预设管理

```bash
hermes moa list
hermes moa configure              # 更新默认预设
hermes moa configure review       # 创建或更新命名预设
hermes moa delete review
```

## 基准测试

在 HermesBench 上，一个双模型 MoA 预设——由 `claude-opus-4.8` 聚合一个 `gpt-5.5` 参考模型——得分高于任一单独运行的模型：

| 模型 | HermesBench 分数 |
|---|---|
| **Opus 聚合器（opus-4.8 + gpt-5.5 参考）— MoA** | **0.8202** |
| `anthropic/claude-opus-4.8` | 0.7607 |
| `openai/gpt-5.5` | 0.7412 |

该 MoA 配置比其最强的组件（opus-4.8）高出约 6 分，证实了聚合第二种视角能提升困难任务的质量，而不仅仅是两者的平均。

## 提示词缓存

MoA 的设计使**主对话的提示词缓存永不破坏**。选择 MoA 预设是一种普通的模型选择：它不会变更过往上下文、切换工具集，或在对话中途重建系统提示词。你的对话历史、系统提示词和工具 schema 保持字节级稳定，因此其他模型所依赖的缓存前缀将完全如对普通模型一样得到保留。切换到 MoA 预设或从 MoA 预设切走，所付出的缓存失效代价与任何其他 `/model` 切换相同——绝不会更多。

两种内部调用类型都正常缓存：

- **参考模型**接收对话的一个经过裁剪、确定性的视图（移除了系统提示词和工具记录——见上文循环）。由于该视图是稳定历史的稳定函数，参考模型的提示词前缀会在迭代之间重复并正常缓存。参考模型是无工具的简短 advisory 调用。
- **聚合器**是起作用的模型。参考输出作为私有指导被追加到最新用户回合的*末尾*。由于该文本位于尾部——在整个稳定前缀（系统提示词 + 先前历史）之下——它不会使任何缓存前缀失效：聚合器对注入点之上的所有内容都命中缓存，只有新追加的尾部是新的。这正是每个正常回合的行为，其中每条新的用户消息同样是未缓存的尾部 token。

因此 MoA 在两种调用类型上都不牺牲提示词缓存。其唯一真正的成本是每次迭代的额外参考调用——你为多个模型视角付费，而不是为破坏的缓存付费。与 Hermes 其余部分共享的长久会话前缀完全完好。

## 注意事项

- MoA 不再列于 `hermes tools` 下；没有可启用的 `moa` 工具集。
- 对某预设设置 `enabled: false` 会禁用该预设的参考扇出：聚合器独自运作，与你把它作为普通模型选择时完全一样。这就是仪表盘和 desktop 设置中暴露的按预设关闭开关。
- 预设的聚合器不能是另一个 MoA 预设。递归的 MoA 树被有意阻止。
- 某个参考模型的凭证失败不会中止该回合。Hermes 会将失败包含在参考上下文中，并继续使用成功返回的模型。
- MoA 会增加模型调用次数。单次模型迭代可能涉及多次参考调用外加一次聚合器调用。
