---
title: "Docx — 创建、读取、编辑、模板化并审阅 Word .docx 文件"
sidebar_label: "Docx"
description: "创建、读取、编辑、模板化并审阅 Word .docx 文件"
---

{/* 本页面由 website/scripts/generate-skill-docs.py 根据技能的 SKILL.md 自动生成。请编辑源 SKILL.md，而非本页面。 */}

# Docx

创建、读取、编辑、模板化并审阅 Word .docx 文件。

## 技能元数据

| | |
|---|---|
| Source | Bundled（默认安装） |
| Path | `skills/productivity\docx` |
| Version | `1.1.0` |
| Author | Nous Research |
| License | MIT |
| Platforms | linux, macos, windows |
| Tags | `word`, `docx`, `documents`, `office`, `templates`, `revisions`, `comments` |
| Related skills | [`pdf`](/docs/user-guide/skills/bundled/productivity/productivity-pdf), [`xlsx`](/docs/user-guide/skills/bundled/productivity/productivity-xlsx), [`powerpoint`](/docs/user-guide/skills/bundled/productivity/productivity-powerpoint) |

## 参考：完整的 SKILL.md

:::info
以下是 Hermes 在此技能被触发时加载的完整技能定义。这就是技能处于激活状态时智能体所看到的指令。
:::

# Docx 技能

通过小型 CLI 借助 python-docx 创建、读取、编辑并模板化 Microsoft Word
`.docx` 文件。它可处理文本、样式、列表、表格、图像、页眉/页脚、
`{{token}}` 模板化、修订（列出/接受/拒绝）、批注
（列出/添加/删除）、目录与页码字段，以及包健康检查。它本身不渲染文档
（PDF 需要 LibreOffice —— 参见转换为 PDF），也不编辑旧版 `.doc`。

## 使用时机

- 用户要求生成一个 Word 文档（报告、信函、合同）。
- 你�需要获取 `.docx` 的文本、大纲、样式或内嵌图像。
- 你必须修改现有 `.docx`：替换文本、编辑表格单元格、
  插入/删除段落、应用样式、合并碎片化的 run。
- 你有一个带 `{{placeholders}}` 的 `.docx` 模板需从数据填充。
- 文档中有需要审阅、接受或拒绝的修订。
- 你需要阅读审阅者的批注，或添加/删除批注。
- 某个 `.docx` 无法打开或行为异常，你需要做损坏排查。
- 文档需要目录或“第 X 页 / 共 Y 页”页脚。
- 不适用于：`.doc`（旧版）、`.odt` 或所见即所得（WYSIWYG）排版工作。

## 前提条件

- Python 3.10+ 并安装 `python-docx`：
  `pip install python-docx`（导入名为 `docx`；lxml 会随之安装）。
- 批注 `add` 在 python-docx >= 1.2 使用原生 API，在更早版本上使用 XML
  回退 —— 两者都是自动的。
- 对于图像块：图像文件必须在本地存在（PNG/JPEG）。

## 如何运行

所有辅助脚本都位于本文件旁的 `scripts/` 目录中。使用
`terminal` 工具运行它们；每个脚本都支持 `--help` 并向 stdout 打印 JSON。

```bash
python scripts/docx_create.py spec.json out.docx
python scripts/docx_read.py out.docx --text
python scripts/docx_edit.py replace out.docx --find old --replace new
python scripts/docx_template.py tpl.docx values.json filled.docx
python scripts/docx_revisions.py list out.docx
python scripts/docx_comments.py list out.docx
python scripts/docx_validate.py out.docx
```

## 快速参考

| 任务 | 命令 |
| --- | --- |
| 从 JSON 规范创建 | `docx_create.py spec.json out.docx` |
| 全文（正文+表格+页眉/页脚） | `docx_read.py f.docx --text` |
| 标题大纲 + 表格形状 | `docx_read.py f.docx --structure` |
| 实际使用的样式 | `docx_read.py f.docx --styles` |
| 提取内嵌图像 | `docx_read.py f.docx --images outdir/` |
| 检测修订/批注 | `docx_read.py f.docx --revisions` |
| 查找/替换（保留格式） | `docx_edit.py replace f.docx --find A --replace B -o out.docx` |
| 设置表格单元格 | `docx_edit.py set-cell f.docx --table 0 --row 1 --col 2 --text X` |
| 在索引 N 之前插入段落 | `docx_edit.py insert f.docx --index N --text X --style Normal` |
| 删除第 N 个段落 | `docx_edit.py delete f.docx --index N` |
| 对第 N 个段落应用样式 | `docx_edit.py style f.docx --index N --style "Heading 1"` |
| 合格式相同的相邻 run | `docx_edit.py normalize f.docx -o out.docx` |
| 在段落 N 之前插入目录字段 | `docx_edit.py toc f.docx --index N -o out.docx` |
| “第 X 页 / 共 Y 页”页脚字段 | `docx_edit.py page-numbers f.docx` |
| 填充 `{{tokens}}` | `docx_template.py tpl.docx values.json out.docx --strict` |
| 列出修订（id/作者/日期/文本） | `docx_revisions.py list f.docx` |
| 接受 / 拒绝所有修订 | `docx_revisions.py accept-all f.docx -o out.docx`（或 `reject-all`） |
| 接受 / 拒绝单个修订 | `docx_revisions.py accept f.docx --id 3 -o out.docx` |
| 列出批注（+锚定文本） | `docx_comments.py list f.docx` |
| 添加锚定到文本的批注 | `docx_comments.py add f.docx --target "phrase" --text "note" --author You` |
| 按 id 删除批注 | `docx_comments.py delete f.docx --id 0` |
| 对包做健康检查 | `docx_validate.py f.docx`（出错时以 1 退出） |

## 流程

1. **创建。** 用 `write_file` 编写 JSON 规范，然后运行
   `scripts/docx_create.py`。规范支持：`page`（尺寸 + 以
   mm 为单位的页边距）、`header`/`footer` 字符串、`footer_page_numbers`
   （添加“第 X 页 / 共 Y 页”字段页脚）、`styles`（自定义段落样式，含
   字体、字号、粗体/斜体、十六进制 `color`）以及 `blocks` —— `heading`
   （级别 1-9）、`paragraph`（可以是 `text` 或一个 `runs` 列表，其中每个 run
   可设置 `bold`/`italic`/`underline`）、`bullet_list`、`numbered_list`、
   `table`（`header` 行渲染为粗体、`rows`、可选的内置表格
   `style`，如 `Table Grid`）、`image`（`path`、可选 `width_mm`）、
   `toc`（目录字段）和 `page_break`。完整的规范
   格式记录在 `scripts/docx_create.py` 顶部。
2. **读取。** 使用 `scripts/docx_read.py`，并恰好用一个模式标志。
   `--text` 返回正文段落、所有表格单元格文本以及
   页眉/页脚文本的 JSON。`--structure` 返回标题大纲
   以及段落/表格/节的数量。`--images DIR` 将 `word/media/`
   下的每个文件复制出包。
3. **编辑。** 使用 `scripts/docx_edit.py`。`replace` 遍历正文、表格
   （包括嵌套）、页眉和页脚，并保留 run 格式；
   添加 `--body-only` 可跳过页眉/页脚。传入 `-o out.docx` 可保留
   原文件；省略则就地编辑。用于
   `insert`/`delete`/`style`/`toc` 的段落索引指的是 `--structure`/`--text`
   正文顺序。对经过大量 Word 编辑后导出的文档，先运行 `normalize` ——
   它会合并格式相同的相邻 run，以便后续
   查找替换能可靠匹配。
4. **审阅修订。** `docx_revisions.py list` 报告正文、
   表格、页眉或页脚中任何位置的每个 `w:ins`
   和 `w:del`（id、作者、日期、受影响的文本）。`accept-all` / `reject-all` 批量解决它们；
   `accept`/`reject --id N` 处理单个修订。接受会
   保留插入并丢弃删除的文本；拒绝则相反。
5. **批注。** `docx_comments.py list` 返回每个批注的 id、
   作者、日期、正文文本及其在文档中所锚定的文本。
   `add --target "some phrase"` 将新批注锚定到该短语的首次
   出现处（run 按需拆分；格式得以
   保留）。`delete --id N` 删除该批注及其标记，而
   不触动文档文本。
6. **模板化。** 在文档中放入 `{{name}}` 风格的 token。用
   一个值的 JSON 对象运行 `scripts/docx_template.py`。使用
   `--strict` 可在尚有 token 未被填充时失败；无论哪种方式，JSON 输出都会列出
   `filled` 计数和 `unfilled_tokens`。
7. **验证**（始终）：用 `--text` 或
   `--structure` 重新读取输出，并对任何通过修订/批注手术产生的结果
   运行 `docx_validate.py`。

## 转换为 PDF

无需脚本。当安装 LibreOffice 后，可无头转换：

```bash
soffice --headless --convert-to pdf --outdir outdir/ file.docx
```

先检查是否可用（`command -v soffice || command -v
libreoffice`）。如果两者都不存在，请告知用户此环境中 PDF 转换
不可用，而不是临时发挥 —— python-docx
无法渲染 PDF，布局保真需要真正的渲染器。

## 陷阱

- **Token 被拆分到多个 run 中。** Word 常将文本切分成若干
  run。replace 辅助脚本会合并匹配到的 run（替换内容继承
  第一个 run 的格式）；先运行 `docx_edit.py normalize` 可减少碎片化，
  从而利于后续所有编辑。
- **修订覆盖范围。** `docx_revisions.py` 处理 run 级别的
  插入和删除（绝大多数情况）。段落标记
  和表格行修订、格式变更记录及移动会被
  `--revisions` 检测，但不会自动解决 —— 参见
  `references/revisions-and-comments.md`，并将这些交给 Word 处理。
- **批注串接。** 回复和“已解决”状态存于
  `commentsExtended.xml`，本技能将其忽略；它添加的批注
  是普通的顶层批注。
- **字段结果由 Word 计算。** `toc`、`page-numbers` 以及
  `toc`/`footer_page_numbers`规范选项写入的是*字段代码*。
  Word/LibreOffice 在打开文件时填充实际的条目和数字
  （Word 可能会提示更新字段）；python-docx 从不
  计算它们，因此在此之前显示的是占位文本。
- **验证是健康检查，不是 schema 校验。**
  `docx_validate.py` 校验 zip、必需部件、关系
  目标、图像魔数字节以及被引用的样式。它并非 XSD
  校验 —— 文件可能通过却仍包含 Word 不喜欢的 XML。
- **样式名必须已存在。** 应用文档中未定义的样式会
  抛出 `KeyError`。像 `Heading 1`、`List Bullet`、
  `List Number`、`Table Grid` 这样的内置样式存在于默认模板中；自定义
  样式必须先在创建规范中声明。
- **编号列表会重启。** `List Number` 依赖 Word 的默认
  编号；一个文档中的多个独立列表可能会继续编号
  而非重新开始。对于需要精确多列表编号的用户，请提醒。
- **单元格写入会替换格式。** `set-cell` 使用 `cell.text = ...`，
  这会将单元格中的 run 重置为纯格式。
- **编码。** 所有 JSON 规范/值文件都显式按 UTF-8 读取；
  在编写自己的胶水代码时，切勿依赖区域设置默认值。
- **不要 unzip 后用 sed 改 XML。** 通过脚本（或
  python-docx）编辑；在 `document.xml` 中进行原始文本替换很容易
  损坏文件。仅在 JSON 输入上使用 `patch`/`write_file`，
  绝不要在 `.docx` 本身之上使用。

## 验证

- 创建/编辑/模板化后，运行 `docx_read.py out.docx --text` 并
  检查期望的字符串出现（且旧字符串已消失）。
- 接受/拒绝后，`docx_revisions.py list` 应返回 `[]`（或
  仅你有意保留的 id）；批注手术后，
  `docx_comments.py list` 应反映变更，且 `--text` 输出
  必须保持不变。
- 健康的包上 `docx_validate.py out.docx` 以退出码 0、`"ok": true` 结束 ——
  在任何修订/批注/字段操作后运行它。
- 模板稍后用 `--strict` 运行，或检查 `unfilled_tokens == []`。
- 结构检查：`--structure` 应显示预期的标题
  大纲和表格形状；`--styles` 确认自定义样式已应用。
