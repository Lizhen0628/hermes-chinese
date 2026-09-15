---
title: "Xlsx — 创建、读取、编辑 Excel .xlsx 工作簿和 CSV"
sidebar_label: "Xlsx"
description: "创建、读取、编辑 Excel .xlsx 工作簿和 CSV"
---

{/* This page is auto-generated from the skill's SKILL.md by website/scripts/generate-skill-docs.py. Edit the source SKILL.md, not this page. */}

# Xlsx

创建、读取、编辑 Excel .xlsx 工作簿和 CSV。

## 技能元数据

| | |
|---|---|
| Source | Bundled (installed by default) |
| Path | `skills/productivity\xlsx` |
| Version | `1.1.0` |
| Author | Nous Research |
| License | MIT |
| Platforms | linux, macos, windows |
| Tags | `excel`, `spreadsheet`, `xlsx`, `csv`, `openpyxl`, `productivity` |
| Related skills | [`docx`](/docs/user-guide/skills/bundled/productivity/productivity-docx), [`pdf`](/docs/user-guide/skills/bundled/productivity/productivity-pdf), [`powerpoint`](/docs/user-guide/skills/bundled/productivity/productivity-powerpoint) |

## 参考：完整的 SKILL.md

:::info
以下是 Hermes 在此技能被触发时加载的完整技能定义。这就是技能激活时智能体看到的指令。
:::

# Xlsx 技能

使用 Python 和 openpyxl 处理 Excel .xlsx 工作簿：构建带公式和图表的、具有样式的多工作表工作簿，检查或导出已有文件，编辑单元格和结构，以及在 CSV 之间互相转换。所有辅助脚本都是 argparse CLI，会打印 JSON 并使用显式的 UTF-8 I/O。

## 使用场景

- 创建 .xlsx 报表：多工作表、数字格式、样式、合并单元格、冻结窗格、自动筛选、条件格式、图表、数据验证下拉列表、原生 Excel 表格、定义名称、超链接、单元格批注、工作表保护。
- 读取工作簿：工作表清单、以 JSON 或 CSV 导出数据、列出公式与缓存值、批注、定义名称、表格。
- 编辑已有文件：设置单元格、追加行、插入/删除行/列（通过 `xlsx_restructure.py` 感知引用）、复制/重命名工作表、表格、名称、批注、保护。
- 通过 LibreOffice 无头重新计算公式（`xlsx_recalc.py`）。
- CSV 互操作，支持类型推断和非 UTF-8 编码。
- 不适用于旧版 .xls 二进制格式（请先用 LibreOffice 转换：`soffice --headless --convert-to xlsx old.xls`）。

## 前提条件

- Python 3.10+ 及 `openpyxl`（`pip install openpyxl`）。不需要其他第三方包，其余都是标准库。
- 可选：LibreOffice（`soffice`）用于无头重新计算或格式转换。

## 如何运行

使用此技能 `scripts/` 目录下的辅助脚本，通过 `terminal` 工具运行（每个脚本都支持 `--help`）：

```bash
python scripts/xlsx_create.py spec.json report.xlsx   # build from JSON spec
python scripts/xlsx_read.py report.xlsx --sheets      # inventory
python scripts/xlsx_read.py report.xlsx --json --sheet Data
python scripts/xlsx_read.py report.xlsx --formulas
python scripts/xlsx_edit.py report.xlsx --sheet Data --set B2=42 --recalc
python scripts/xlsx_restructure.py report.xlsx --sheet Data --insert-rows 3:2
python scripts/xlsx_recalc.py report.xlsx
python scripts/csv_to_xlsx.py data.csv out.xlsx --encoding utf-8
python scripts/xlsx_to_csv.py report.xlsx out.csv --sheet Data
```

使用 `write_file` 编写 JSON 规范，使用 `read_file` 或直接从 stdout 检查脚本的 JSON 输出。

## 快速参考

| Task | Command |
|---|---|
| 从规范创建工作簿 | `xlsx_create.py spec.json out.xlsx` |
| 工作表名称 + 尺寸 | `xlsx_read.py f.xlsx --sheets` |
| 以 JSON 导出工作表 | `xlsx_read.py f.xlsx --json --sheet S` |
| 以 CSV 导出工作表 | `xlsx_read.py f.xlsx --csv --out d.csv` |
| 列出公式 + 缓存值 | `xlsx_read.py f.xlsx --formulas` |
| 设置单元格 / 公式 | `xlsx_edit.py f.xlsx --set "A1==SUM(B:B)"` |
| 追加一行 | `xlsx_edit.py f.xlsx --append '[1,"x",true]'` |
| 插入 2 行，引用不移动 | `xlsx_edit.py f.xlsx --insert-rows 3:2` |
| 插入 2 行，引用移动 | `xlsx_restructure.py f.xlsx --insert-rows 3:2` |
| 删除一列，引用移动 | `xlsx_restructure.py f.xlsx --delete-cols B` |
| 创建原生表格 | `xlsx_edit.py f.xlsx --add-table Sales:A1:C9` |
| 在表格内追加 | `--table-append 'Sales=["West",5]'` |
| 列出表格 | `xlsx_edit.py f.xlsx --list-tables` |
| 定义名称 | `--define-name "Rates='Data'!$B$2:$B$9"` / `--delete-name Rates` / `xlsx_read.py f.xlsx --names` |
| 超链接 | `--hyperlink "A1=https://example.com|Docs"` |
| 单元格批注 | `--note "B2=Check this|Reviewer"`；通过 `xlsx_read.py f.xlsx --notes` 读取 |
| 保护工作表（见注意事项） | `--protect your-password --unlock B2:B9` |
| 通过 LibreOffice 重新计算 | `xlsx_recalc.py f.xlsx` |
| 复制 / 重命名工作表 | `--copy-sheet Src:New --rename-sheet Old:New` |
| 打开时强制重新计算 | `xlsx_edit.py f.xlsx --recalc` |
| CSV -> 带样式的 xlsx | `csv_to_xlsx.py in.csv out.xlsx` |
| xlsx -> CSV | `xlsx_to_csv.py f.xlsx out.csv --encoding utf-8` |

## 步骤

1. **创建**：编写 JSON 规范（架构记录了在 `xlsx_create.py --help` 及其 docstring 中）。每个工作表支持 `rows`（标量或带样式的单元格对象）、稀疏的 `cells` 覆盖、`column_widths`、`row_heights`、`merges`、`freeze_panes`、`autofilter`、`conditional_formats`（cell_is 规则和色阶）、`charts`（从单元格区域绘制柱状图/折线图/饼图）、`validations`（列表下拉）、`tables`（带样式名称的原生 Excel 表格）和 `protection`。工作簿级别的 `defined_names` 将名称映射到引用。单元格对象还接受 `hyperlink` 和 `note`。类型化值：JSON 数字/布尔值直接传递；日期使用 `{"value": "2026-01-31", "type": "date"}`。数字格式是 Excel 格式字符串：货币 `"$#,##0.00"`、百分比 `"0.0%"`、日期 `"yyyy-mm-dd"`。
2. **公式**：在规范中使用 `"formula": "SUM(B2:B9)"` 设置，或在编辑器中用 `--set "C1==SUM(A:A)"`。写入公式时，添加 `"full_calc_on_load": true`（规范）或 `--recalc`（编辑器）；这会设置工作簿的 `fullCalcOnLoad` 标志，让 Excel/LibreOffice 在打开时重新计算所有内容。openpyxl 本身从不计算公式。
3. **读取**：`--sheets` 用于清单（名称、尺寸、合并区域、图表数量、表格、保护、定义名称），`--json`/`--csv` 用于数据，`--formulas` 将每个公式字符串与其缓存结果配对，`--notes` 用于单元格批注，`--names` 用于定义名称。缓存结果仅当文件最后被真正的电子表格应用保存过时才存在；刚从 openpyxl 生成的文件在那里返回 `null`。要在无头环境下物化结果，运行 `xlsx_recalc.py file.xlsx`（使用 LibreOffice；当 `soffice` 缺失时打印 `{"recalculated": false, ...}` 并以 0 退出），然后用 `--data-only` 重新加载。
4. **编辑**：`xlsx_edit.py` 先应用重命名/复制，再应用结构性行/列变更，然后 `--set`/`--append`。除非给出 `--out`，否则它就地进行编辑——如果需要保留原始文件，请先复制它。
5. **重构**：对于在含有公式、合并、表格或筛选的工作表上进行插入/删除，请使用 `xlsx_restructure.py` 而不是 `xlsx_edit.py`。它会重写所有工作表上的公式引用（绝对 `$` 引用、区域、跨工作表引用）、移动合并、自动筛选、冻结窗格、数据验证和条件格式区域、表格引用、定义名称以及行/列尺寸，然后打印包含 `not_shifted` 列表的 JSON 报告。规则与限制：`references/restructuring.md`。
6. **CSV 互操作**：`csv_to_xlsx.py` 对每个单元格推断 int/float/bool/ISO-date 并给表头行添加样式；`xlsx_to_csv.py` 写出 ISO 日期并为空单元格写出空白字符串。两者默认使用 UTF-8，并接受 `--encoding`（例如 `utf-8-sig` 用于 Excel 友好的 BOM，`cp1252` 用于传统 Windows 导出）。

## 转换为 PDF

LibreOffice 可无头转换（也适用于将单个工作表导出为 CSV）：

```bash
soffice --headless --convert-to pdf report.xlsx --outdir out/
soffice --headless --convert-to csv report.xlsx --outdir out/  # 1st sheet only
```

只有第一个工作表会进入 CSV；对于其他工作表，请使用 `xlsx_to_csv.py --sheet NAME`。如果缺少 `soffice`，请安装 LibreOffice 或将未转换的文件交给用户。

## 注意事项

- **openpyxl 不进行计算。** 公式结果只能通过 `load_workbook(path, data_only=True)` 获得，且仅当文件之前被 Excel/LibreOffice 保存过。否则你会得到 `None`。
- **`xlsx_edit.py` 插入/删除不会移动引用**（openpyxl 的原始行为）。请使用 `xlsx_restructure.py`，它会移动——但即使它也无法移动图表锚点、图片或条件格式规则公式；请阅读其 JSON 报告的 `not_shifted` 列表和 `references/restructuring.md`。
- **工作表保护不是安全措施。** `--protect` 设置标准的 xlsx 工作表保护哈希：它向行为良好的应用发出"不要编辑这个"的信号，仅此而已。任何人都可以通过编辑 zip 的 XML 或在 LibreOffice 中取消勾选来移除它。切勿依赖它来实现机密性或完整性；它不加密任何内容。
- **先 `data_only=True` 再保存**会静默丢弃所有公式（缓存值替代它们）。除非这就是目的，否则切勿保存以这种方式加载的工作簿。
- **加载会剥离图表/图片**：openpyxl 无法往返图表，因此编辑图表工作簿并保存会丢弃图表。请在编辑后重新添加图表，或避免重新保存图表文件。
- **CSV 区域设置陷阱**：始终传递显式编码（脚本已经这样做），并记住欧洲 CSV 常使用 `;` 分隔符和小数逗号——使用 `--delimiter ';'` 并预期像 `"12,5"` 这样的字符串保持为字符串。
- **日期是 datetime**：Excel 将日期存储为序列号；openpyxl 返回 `datetime`/`date` 对象。此处的导出会输出 ISO 字符串。
- 工作表名称上限为 31 个字符，并禁用 `[ ] : * ? / \`。

## 验证

- 创建后：运行 `xlsx_read.py out.xlsx --sheets` 并确认工作表名称、尺寸、合并区域和图表数量符合预期。
- 用 `--json` 导出数据并与源值比对。
- 编辑后：重新导出所触及的范围；如果写入了公式，确认 `--formulas` 列出了它们且已应用 `--recalc`。
- 运行 `xlsx_restructure.py` 后：阅读其 JSON 报告，然后重新运行 `--formulas` 和 `--sheets` 以确认引用和区域落在预期位置。
- 如需完整视觉检查，请在 LibreOffice 中打开：`soffice --headless --convert-to pdf out.xlsx` 并检查 PDF。
