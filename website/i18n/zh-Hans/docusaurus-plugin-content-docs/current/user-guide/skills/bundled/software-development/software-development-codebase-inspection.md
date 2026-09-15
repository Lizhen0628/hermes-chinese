---
title: "代码库检查 — 使用 pygount 检查代码库：代码行数、语言、比例"
sidebar_label: "代码库检查"
description: "使用 pygount 检查代码库：代码行数、语言、比例"
---

{/* 此页面由 website/scripts/generate-skill-docs.py 根据该技能的 SKILL.md 自动生成。请编辑源 SKILL.md，而非此页面。 */}

# 代码库检查

使用 pygount 检查代码库：代码行数、语言、比例。

## 技能元数据

| | |
|---|---|
| Source | Bundled（默认安装） |
| Path | `skills/software-development\codebase-inspection` |
| Version | `1.0.0` |
| Author | Hermes Agent |
| License | MIT |
| Platforms | linux, macos, windows |
| Tags | `LOC`、`Code Analysis`、`pygount`、`Codebase`、`Metrics`、`Repository` |
| Related skills | [`github`](/docs/user-guide/skills/bundled/software-development/software-development-github) |

## 参考：完整 SKILL.md

:::info
以下为 Hermes 在该技能被触发时加载的完整技能定义。这就是技能激活时智能体看到的指令内容。
:::

# 使用 pygount 进行代码库检查

使用 `pygount` 分析代码仓库的代码行数、语言分布、文件数量以及代码与注释的比例。

## 何时使用

- 用户要求统计 LOC（代码行数）
- 用户想要代码仓库的语言分布
- 用户询问代码库大小或构成
- 用户想要代码与注释的比例
- 一般的“这个仓库有多大”问题

## 前置条件

```bash
pip install --break-system-packages pygount 2>/dev/null || pip install pygount
```

## 1. 基本摘要（最常用）

获取包含文件数量、代码行数和注释行数的完整语言分布：

```bash
cd /path/to/repo
pygount --format=summary \
  --folders-to-skip=".git,node_modules,venv,.venv,__pycache__,.cache,dist,build,.next,.tox,.eggs,*.egg-info" \
  .
```

**重要：** 始终使用 `--folders-to-skip` 排除依赖/构建目录，否则 pygount 会遍历它们，耗时非常长或直接挂起。

## 2. 常用目录排除项

根据项目类型进行调整：

```bash
# Python 项目
--folders-to-skip=".git,venv,.venv,__pycache__,.cache,dist,build,.tox,.eggs,.mypy_cache"

# JavaScript/TypeScript 项目
--folders-to-skip=".git,node_modules,dist,build,.next,.cache,.turbo,coverage"

# 通用兜底
--folders-to-skip=".git,node_modules,venv,.venv,__pycache__,.cache,dist,build,.next,.tox,vendor,third_party"
```

## 3. 按指定语言过滤

```bash
# 仅统计 Python 文件
pygount --suffix=py --format=summary .

# 仅统计 Python 和 YAML
pygount --suffix=py,yaml,yml --format=summary .
```

## 4. 逐文件详细输出

```bash
# 默认格式显示逐文件明细
pygount --folders-to-skip=".git,node_modules,venv" .

# 按代码行数排序（通过 sort 管道）
pygount --folders-to-skip=".git,node_modules,venv" . | sort -t$'\t' -k1 -nr | head -20
```

## 5. 输出格式

```bash
# 摘要表（默认推荐）
pygount --format=summary .

# JSON 输出，供程序化使用
pygount --format=json .

# 适合管道的格式：Language、file count、code、docs、empty、string
pygount --format=summary . 2>/dev/null
```

## 6. 解读结果

摘要表的列：
- **Language** — 检测到的编程语言
- **Files** — 该语言的文件数量
- **Code** — 实际代码行数（可执行/声明式）
- **Comment** — 注释或文档行数
- **%** — 占总数百分比

特殊的伪语言：
- `__empty__` — 空文件
- `__binary__` — 二进制文件（图片、编译产物等）
- `__generated__` — 自动生成的文件（通过启发式方法检测）
- `__duplicate__` — 内容完全相同的文件
- `__unknown__` — 无法识别的文件类型

## 注意事项

1. **始终排除 .git、node_modules、venv** — 不使用 `--folders-to-skip` 时，pygount 会遍历所有内容，可能耗时数分钟，或在庞大的依赖树上挂起。
2. **Markdown 显示 0 行代码** — pygount 将所有 Markdown 内容归类为注释而非代码。这是预期行为。
3. **JSON 文件显示的代码行数偏低** — pygount 统计 JSON 行数可能偏保守。如需准确的 JSON 行数，请直接使用 `wc -l`。
4. **大型单体仓库** — 对于非常大的仓库，考虑使用 `--suffix` 针对特定语言，而不是扫描全部内容。
