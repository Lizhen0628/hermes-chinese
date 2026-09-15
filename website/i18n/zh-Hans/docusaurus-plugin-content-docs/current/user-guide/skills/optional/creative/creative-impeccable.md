---
title: "Impeccable — 前端设计指导，由上游维护（impeccable）"
sidebar_label: "Impeccable"
description: "前端设计指导，由上游维护（impeccable）"
---

{/* 本页面由 website/scripts/generate-skill-docs.py 根据技能的 SKILL.md 自动生成。请编辑源 SKILL.md，而非本页面。 */}

# Impeccable

前端设计指导，由上游维护（impeccable）。

## 技能元数据

| | |
|---|---|
| 来源 | 可选 — 使用 `hermes skills install official/creative/impeccable` 安装 |
| 路径 | `optional-skills/creative\impeccable` |
| 版本 | `4.1.2` |
| 作者 | Paul Bakaus (pbakaus) |
| 许可证 | Apache-2.0 |
| 平台 | linux, macos, windows |
| 标签 | `design`、`frontend`、`ui`、`ux`、`web-design`、`anti-slop` |
| 相关技能 | [`claude-design`](/docs/user-guide/skills/bundled/creative/creative-claude-design)、[`popular-web-designs`](/docs/user-guide/skills/bundled/creative/creative-popular-web-designs) |

## 参考：完整 SKILL.md

:::info
以下是 Hermes 在此技能被触发时加载的完整技能定义。当技能处于激活状态时，这就是智能体看到的指令内容。
:::

# Impeccable（由上游维护）

> **目录存根。** 本条目在上游 [pbakaus/impeccable](https://github.com/pbakaus/impeccable) 处维护：
> 该项目在 `.hermes/skills/` 下发布并验证一个 Hermes 原生的技能包。
> `hermes skills install impeccable` 会从该仓库实时拉取当前技能包
> （与任何 hub 安装一样进行隔离和扫描）——本目录仅保存目录元数据，
> 因此内置副本永远不会过时。

Impeccable 是一套面向 AI 编程智能体的设计语言：一个技能，暴露 23 个子命令（`/impeccable init`、`craft`、`shape`、`critique`、`audit`、`polish`、`bolder`、`quieter`、`distill`、`harden`、`onboard`、`animate`、`colorize`、`typeset`、`layout`、`delight`、`overdrive`、`clarify`、`adapt`、`optimize`、`extract`、`document`、`live`），明确的反模式指导（过度使用的字体、紫色渐变、嵌套卡片、弹跳缓动），以及一个包含 61 条规则的确定性检测器 CLI（`npx impeccable detect`），无需 LLM 或 API 密钥。

安装后，从以下命令开始：

```
/impeccable init
```

完整文档：https://impeccable.style
