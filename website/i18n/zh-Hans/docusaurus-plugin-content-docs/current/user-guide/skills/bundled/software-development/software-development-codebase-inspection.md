---
title: "代码库检查 — 使用 pygount 检查代码库：代码行数、语言、比例"
sidebar_label: "代码库检查"
description: "使用 pygount 检查代码库：代码行数、语言、比例"
---

{/* 本页由 website/scripts/generate-skill-docs.py 根据技能的 SKILL.md 自动生成。请编辑源文件 SKILL.md，而非本页。 */}

# 代码库检查

使用 pygount 检查代码库：代码行数、语言、比例。

## 技能元数据

| | |
|---|---|
| 来源 | 内置（默认安装） |
| 路径 | `skills/software-development\codebase-inspection` |
| 版本 | `1.0.0` |
| 作者 | Hermes Agent |
| 许可证 | MIT |
| 平台 | linux、macos、windows |
| 标签 | `LOC`、`Code Analysis`、`pygount`、`Codebase`、`Metrics`、`Repository` |
| 相关技能 | [`github`](/docs/user-guide/skills/bundled/software-development/software-development-github) |

## 参考：完整 SKILL.md

:::info
以下是 Hermes 在该技能被触发时加载的完整技能定义。这就是技能激活时智能体所看到的指令。
:::

# 使用 pygount 检查代码库

使用 `pygount` 分析仓库的代码行数、语言构成、文件数量和代码与注释的比例。

## 何时使用

- 用户要求统计代码行数（LOC）
- 用户想要仓库的语言构成
- 用户询问代码库规模或组成
- 用户想要代码与注释的比例
- 一般性的"这个仓库有多大"之类的问题

## 前置条件

```bash
pip install --break-system-packages pygount 2>/dev/null || pip install pygount
```

## 1. 基本摘要（最常用）

获取完整的语言构成，包含文件数、代码行数和注释行数：

```bash
cd /path/to/repo
pygount --format=summary \
  --folders-to-skip=".git,node_modules,venv,.venv,__pycache__,.cache,dist,build,.next,.tox,.eggs,*.egg-info" \
  .
```

**重要：** 务必使用 `--folders-to-skip` 排除依赖/构建目录，否则 pygount 会遍历它们，导致耗时极长甚至卡死。

## 2. 常见目录排除

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
# 摘要表格（默认推荐）
pygount --format=summary .

# 用于程序化处理的 JSON 输出
pygount --format=json .

# 便于管道处理：语言、文件数、代码、文档、空行、字符串
pygount --format=summary . 2>/dev/null
```

## 6. 解读结果

摘要表格的各列：
- **Language** — 检测到的编程语言
- **Files** — 该语言的文件数
- **Code** — 实际代码行数（可执行/声明式）
- **Comment** — 注释或文档行数
- **%** — 占总量的百分比

特殊伪语言：
- `__empty__` — 空文件
- `__binary__` — 二进制文件（图片、编译产物等）
- `__generated__` — 自动生成的文件（启发式检测）
- `__duplicate__` — 内容完全相同的文件
- `__unknown__` — 无法识别的文件类型

## 常见陷阱

1. **务必排除 .git、node_modules、venv** — 不使用 `--folders-to-skip`，pygount 会遍历所有内容，可能耗时数分钟，或在庞大的依赖树上卡死。
2. **Markdown 显示 0 行代码** — pygount 将所有 Markdown 内容归类为注释，而非代码。这是预期行为。
3. **JSON 文件显示较少代码行数** — pygount 统计 JSON 行数时可能偏保守。如需精确的 JSON 行数，请直接使用 `wc -l`。
4. **大型 monorepo** — 对于超大型仓库，考虑使用 `--suffix` 只针对特定语言，而非扫描全部内容。
