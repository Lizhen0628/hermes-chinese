---
title: "Xlsx — 创建、读取、编辑 Excel .xlsx 工作簿与 CSV"
sidebar_label: "Xlsx"
description: "创建、读取、编辑 Excel .xlsx 工作簿与 CSV"
---

{/* This page is auto-generated from the skill's SKILL.md by website/scripts/generate-skill-docs.py. Edit the source SKILL.md, not this page. */}

# Xlsx

创建、读取、编辑 Excel .xlsx 工作簿与 CSV。

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

## 参考：完整 SKILL.md

:::info
以下是 Hermes 在此技能被触发时加载的完整技能定义。当该技能处于激活状态时，这就是智能体看到的指令内容。
:::

# Xlsx 技能

使用 Python 和 openpyxl 处理 Excel .xlsx 工作簿：构建带样式、
含公式和图表的多个工作表工作簿，检查或转储现有
文件，编辑单元格与结构，并在 CSV 之间进行转换。所有辅助
脚本都是 argparse CLI，输出 JSON，并使用显式 UTF-8 I/O。

## 何时使用

- 创建 .xlsx 报告：多个工作表、数字格式、样式、
  合并单元格、冻结窗格、自动筛选、条件格式、
  图表、数据验证下拉列表、原生 Excel 表格、定义
  名称、超链接、单元格批注、工作表保护。
- 读取工作簿：工作表清单、以 JSON 或 CSV 转储数据、
  列出公式与缓存值、批注、定义名称、表格。
- 编辑现有文件：设置单元格、追加行、插入/删除
  行/列（通过 `xlsx_restructure.py` 实现引用感知）、
  复制/重命名工作表、表格、名称、批注、保护。
- 通过 LibreOffice 以无头方式重算公式
  （`xlsx_recalc.py`）。
- 带类型推断和非 UTF-8 编码的 CSV 互操作。
- 不适用于旧版 .xls 二进制格式（先使用 LibreOffice 转换：
  `soffice --headless --convert-to xlsx old.xls`）。

## 前置条件

- Python 3.10+ 以及 `openpyxl`（`pip install openpyxl`）。不需要其他
  第三方包；其他一切均为标准库。
- 可选：LibreOffice（`soffice`），用于无头重算或
  格式转换。

## 如何运行

使用 `terminal` 工具从此技能的 `scripts/` 目录运行
辅助脚本（每个脚本都支持 `--help`）：

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

使用 `write_file` 编写 JSON 规格，使用
`read_file` 或直接从 stdout 检查脚本的 JSON 输出。

## 快速参考

| 任务 | 命令 |
|---|---|
| 从规格创建工作簿 | `xlsx_create.py spec.json out.xlsx` |
| 工作表名称 + 尺寸 | `xlsx_read.py f.xlsx --sheets` |
| 以 JSON 转储工作表 | `xlsx_read.py f.xlsx --json --sheet S` |
| 以 CSV 转储工作表 | `xlsx_read.py f.xlsx --csv --out d.csv` |
| 列出公式 + 缓存值 | `xlsx_read.py f.xlsx --formulas` |
| 设置单元格 / 公式 | `xlsx_edit.py f.xlsx --set "A1==SUM(B:B)"` |
| 追加一行 | `xlsx_edit.py f.xlsx --append '[1,"x",true]'` |
| 插入 2 行，引用不偏移 | `xlsx_edit.py f.xlsx --insert-rows 3:2` |
| 插入 2 行，引用偏移 | `xlsx_restructure.py f.xlsx --insert-rows 3:2` |
| 删除一列，引用偏移 | `xlsx_restructure.py f.xlsx --delete-cols B` |
| 创建原生表格 | `xlsx_edit.py f.xlsx --add-table Sales:A1:C9` |
| 在表格内追加 | `--table-append 'Sales=["West",5]'` |
| 列出表格 | `xlsx_edit.py f.xlsx --list-tables` |
| 定义名称 | `--define-name "Rates='Data'!$B$2:$B$9"` / `--delete-name Rates` / `xlsx_read.py f.xlsx --names` |
| 超链接 | `--hyperlink "A1=https://example.com|Docs"` |
| 单元格批注 | `--note "B2=Check this|Reviewer"`；通过 `xlsx_read.py f.xlsx --notes` 读取 |
| 保护工作表（参见注意事项） | `--protect your-password --unlock B2:B9` |
| 通过 LibreOffice 重算 | `xlsx_recalc.py f.xlsx` |
| 复制 / 重命名工作表 | `--copy-sheet Src:New --rename-sheet Old:New` |
| 打开时强制重算 | `xlsx_edit.py f.xlsx --recalc` |
| CSV -> 带样式的 xlsx | `csv_to_xlsx.py in.csv out.xlsx` |
| xlsx -> CSV | `xlsx_to_csv.py f.xlsx out.csv --encoding utf-8` |

## 步骤

1. **创建**：编写 JSON 规格（架构文档见
   `xlsx_create.py --help` 及其 docstring）。每个工作表支持
   `rows`（标量或带样式的单元格对象）、稀疏 `cells` 覆盖、
   `column_widths`、`row_heights`、`merges`、`freeze_panes`、
   `autofilter`、`conditional_formats`（cell_is 规则和色阶）、
   `charts`（基于单元格区域的柱状图/折线图/饼图）、
   `validations`（列表下拉）、`tables`（带
   样式名的原生 Excel 表格）以及 `protection`。工作簿级别的 `defined_names`
   将名称映射到引用。单元格对象还接受 `hyperlink` 和 `note`。
   带类型的值：JSON 数字/布尔值
   直接传递；日期使用 `{"value": "2026-01-31", "type": "date"}`。
   数字格式为 Excel 格式字符串：货币 `"$#,##0.00"`、
   百分比 `"0.0%"`、日期 `"yyyy-mm-dd"`。
2. **公式**：在规格中通过 `"formula": "SUM(B2:B9)"` 或在编辑器中
   通过 `--set "C1==SUM(A:A)"` 设置。写入公式时，添加
   `"full_calc_on_load": true`（规格）或 `--recalc`（编辑器）；这会设置
   工作簿的 `fullCalcOnLoad` 标志，以便 Excel/LibreOffice 在打开时
   重新计算所有内容。openpyxl 本身从不计算公式。
3. **读取**：`--sheets` 用于清单（名称、尺寸、合并
   区域、图表数量、表格、保护、定义名称），
   `--json`/`--csv` 用于数据，`--formulas` 用于
   将每个公式字符串与其缓存结果配对，`--notes` 用于
   单元格批注，`--names` 用于定义名称。缓存结果
   仅在文件上次由真正的电子表格应用保存时存在；
   刚从 openpyxl 生成的文件的此处返回 `null`。若要
   以无头方式生成结果，请运行 `xlsx_recalc.py file.xlsx`（使用
   LibreOffice；当 `soffice` 缺失时打印 `{"recalculated": false, ...}` 并以 0 退出
   ），然后用 `--data-only` 重新加载。
4. **编辑**：`xlsx_edit.py` 先应用重命名/复制，然后
   执行结构性行/列更改，再执行 `--set`/`--append`。除非指定 `--out`，
   否则它就地编辑——如果需要保留原文件，请先复制该文件。
5. **重构**：对于含有公式、合并、表格或筛选的
   工作表进行插入/删除时，请使用 `xlsx_restructure.py` 而非
   `xlsx_edit.py`。它会重写所有工作表上的公式引用
   （绝对 `$` 引用、区域、跨工作表引用），移动合并、
   自动筛选、冻结窗格、验证和条件格式
   区域、表格引用、定义名称以及行/列尺寸，然后
   打印包含 `not_shifted` 列表的 JSON 报告。规则和
   限制：`references/restructuring.md`。
6. **CSV 互操作**：`csv_to_xlsx.py` 按单元格推断 int/float/bool/ISO 日期
   并为表头行设置样式；`xlsx_to_csv.py` 将空单元格写为 ISO
   日期和空字符串。两者默认使用 UTF-8 并
   接受 `--encoding`（例如 `utf-8-sig` 用于 Excel 友好的 BOM，
   `cp1252` 用于旧版 Windows 导出）。

## 转换为 PDF

LibreOffice 可以进行无头转换（也适用于单个
工作表的 CSV 导出）：

```bash
soffice --headless --convert-to pdf report.xlsx --outdir out/
soffice --headless --convert-to csv report.xlsx --outdir out/  # 1st sheet only
```

CSV 中只会包含第一个工作表；对于其他工作表，请使用
`xlsx_to_csv.py --sheet NAME`。如果缺少 `soffice`，请安装
LibreOffice 或将文件原样交给用户。

## 注意事项

- **openpyxl 不进行计算。** 公式结果仅
  可通过 `load_workbook(path, data_only=True)` 获得，且仅在文件
  之前由 Excel/LibreOffice 保存时才有。否则你会得到 `None`。
- **`xlsx_edit.py` 的插入/删除不会偏移引用**（原始
  openpyxl 行为）。请使用 `xlsx_restructure.py`，它会——但即便
  如此也无法移动图表锚点、图像或条件格式规则
  公式；请阅读其 JSON 报告中的 `not_shifted` 列表和
  `references/restructuring.md`。
- **工作表保护并非安全措施。** `--protect` 设置标准的
  xlsx 工作表保护哈希：它向行为良好的应用发出“请勿编辑此项”的
  信号，仅此而已。任何人都可以通过编辑
  zip 的 XML 或在 LibreOffice 中取消勾选来移除它。切勿依赖它来
  保密或保证完整性；它不加密任何内容。
- **`data_only=True` 后保存**会静默丢弃所有公式
  （缓存值取代它们）。除非这正是目的，
  否则切勿保存以这种方式加载的工作簿。
- **加载会剥离图表/图像**：openpyxl 不会往返保留
  图表，因此编辑带图表的工作簿并保存会丢失图表。
  编辑后重新添加图表，或避免重新保存带图表的文件。
- **CSV 区域设置陷阱**：始终显式传入编码（脚本
  已经这样做），并记住欧洲 CSV 常使用 `;` 分隔符和
  小数逗号——使用 `--delimiter ';'`，并预期像
  `"12,5"` 这样的字符串保持为字符串。
- **日期是 datetime**：Excel 将日期存储为序列号；
  openpyxl 返回 `datetime`/`date` 对象。此处的转储输出 ISO
  字符串。
- 工作表名称上限为 31 个字符，且不能包含 `[ ] : * ? / \`。

## 验证

- 创建后：运行 `xlsx_read.py out.xlsx --sheets` 并确认工作表
  名称、尺寸、合并区域和图表数量符合意图。
- 使用 `--json` 转储数据并与源值进行比对。
- 编辑后：重新转储受影响的区域；如果写入了公式，
  确认 `--formulas` 列出它们并且已应用 `--recalc`。
- 执行 `xlsx_restructure.py` 后：阅读其 JSON 报告，然后重新运行
  `--formulas` 和 `--sheets` 以确认引用和区域落在
  预期位置。
- 若要进行完整的视觉检查，请在 LibreOffice 中打开：
  `soffice --headless --convert-to pdf out.xlsx` 并检查该 PDF。
