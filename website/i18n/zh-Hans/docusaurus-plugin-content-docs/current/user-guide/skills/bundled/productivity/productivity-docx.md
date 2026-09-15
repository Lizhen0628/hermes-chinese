---
title: "Docx — 创建、读取、编辑、模板化和审阅 Word .docx 文件"
sidebar_label: "Docx"
description: "创建、读取、编辑、模板化和审阅 Word .docx 文件"
---

{/* This page is auto-generated from the skill's SKILL.md by website/scripts/generate-skill-docs.py. Edit the source SKILL.md, not this page. */}

# Docx

创建、读取、编辑、模板化和审阅 Word .docx 文件。

## 技能元数据

| | |
|---|---|
| 来源 | 内置（默认安装） |
| 路径 | `skills/productivity\docx` |
| 版本 | `1.1.0` |
| 作者 | Nous Research |
| 许可证 | MIT |
| 平台 | linux, macos, windows |
| 标签 | `word`、`docx`、`documents`、`office`、`templates`、`revisions`、`comments` |
| 相关技能 | [`pdf`](/docs/user-guide/skills/bundled/productivity/productivity-pdf)、[`xlsx`](/docs/user-guide/skills/bundled/productivity/productivity-xlsx)、[`powerpoint`](/docs/user-guide/skills/bundled/productivity/productivity-powerpoint) |

## 参考：完整 SKILL.md

:::info
以下是 Hermes 在此技能被触发时加载的完整技能定义。这就是技能激活时智能体看到的指令内容。
:::

# Docx 技能

通过小型 CLI 使用 python-docx 创建、读取、编辑 Microsoft Word `.docx`
文件并套用模板。它可处理文本、样式、列表、表格、图片、页眉/页脚、`{{token}}`
模板化、修订记录（列出/接受/拒绝）、批注（列出/添加/删除）、目录和页码
域，以及包健康检查。它本身不渲染文档（PDF 需要 LibreOffice —— 参见
「转换为 PDF」），也不能编辑旧版 `.doc`。

## 何时使用

- 用户要求生成 Word 文档（报告、信函、合同）。
- 你需要 `.docx` 的文本、大纲、样式或内嵌图片。
- 你必须修改现有 `.docx`：替换文本、编辑表格单元格、插入/删除段落、
  应用样式、合并碎片化的文本块。
- 你有一个带 `{{placeholders}}` 的 `.docx` 模板需要用数据填充。
- 文档有修订记录需要审阅、接受或拒绝。
- 你需要读取审阅者的批注，或添加/删除批注。
- `.docx` 无法打开或行为异常，需要损坏排查。
- 文档需要目录或「第 X 页，共 Y 页」页脚。
- 不适用于：`.doc`（旧版）、`.odt` 或所见即所得布局工作。

## 前置条件

- Python 3.10+ 并安装 `python-docx`：
  `pip install python-docx`（导入名为 `docx`；lxml 随其一同安装）。
- 批注 `add` 在 python-docx >= 1.2 上使用原生 API，在旧版本上使用 XML
  回退方案——两者均自动选择。
- 图片块：图片文件必须存在于本地（PNG/JPEG）。

## 如何运行

所有辅助脚本都位于此文件旁的 `scripts/` 目录。使用 `terminal` 工具运行；
每个脚本都支持 `--help` 并向 stdout 打印 JSON。

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
| 从 JSON 规格创建 | `docx_create.py spec.json out.docx` |
| 完整文本（正文+表格+页眉/页脚） | `docx_read.py f.docx --text` |
| 标题大纲 + 表格形状 | `docx_read.py f.docx --structure` |
| 实际使用的样式 | `docx_read.py f.docx --styles` |
| 提取内嵌图片 | `docx_read.py f.docx --images outdir/` |
| 检测修订/批注 | `docx_read.py f.docx --revisions` |
| 查找/替换（保留格式） | `docx_edit.py replace f.docx --find A --replace B -o out.docx` |
| 设置表格单元格 | `docx_edit.py set-cell f.docx --table 0 --row 1 --col 2 --text X` |
| 在索引 N 前插入段落 | `docx_edit.py insert f.docx --index N --text X --style Normal` |
| 删除段落 N | `docx_edit.py delete f.docx --index N` |
| 对段落 N 应用样式 | `docx_edit.py style f.docx --index N --style "Heading 1"` |
| 合并格式相同的相邻文本块 | `docx_edit.py normalize f.docx -o out.docx` |
| 在段落 N 前插入目录域 | `docx_edit.py toc f.docx --index N -o out.docx` |
| 「第 X 页，共 Y 页」页脚域 | `docx_edit.py page-numbers f.docx` |
| 填充 `{{tokens}}` | `docx_template.py tpl.docx values.json out.docx --strict` |
| 列出修订（id/作者/日期/文本） | `docx_revisions.py list f.docx` |
| 接受/拒绝全部修订 | `docx_revisions.py accept-all f.docx -o out.docx`（或 `reject-all`） |
| 接受/拒绝单条修订 | `docx_revisions.py accept f.docx --id 3 -o out.docx` |
| 列出批注（+锚定文本） | `docx_comments.py list f.docx` |
| 添加锚定到文本的批注 | `docx_comments.py add f.docx --target "phrase" --text "note" --author You` |
| 按 id 删除批注 | `docx_comments.py delete f.docx --id 0` |
| 对包进行健康检查 | `docx_validate.py f.docx`（出错时退出码为 1） |

## 步骤

1. **创建。** 用 `write_file` 编写 JSON 规格，然后运行
   `scripts/docx_create.py`。该规格支持：`page`（尺寸和页边距，单位
   mm）、`header`/`footer` 字符串、`footer_page_numbers`（添加
   「第 X 页，共 Y 页」域页脚）、`styles`（自定义段落样式，含
   字体、字号、粗体/斜体、十六进制 `color`），以及 `blocks`——`heading`
   （级别 1-9）、`paragraph`（`text` 或 `runs` 列表，每个 run
   可设置 `bold`/`italic`/`underline`）、`bullet_list`、`numbered_list`、
   `table`（`header` 行渲染为粗体，`rows`，可选内置表格
   `style` 如 `Table Grid`）、`image`（`path`，可选 `width_mm`）、
   `toc`（目录域）和 `page_break`。完整的规格
   格式记录在 `scripts/docx_create.py` 顶部。
2. **读取。** 使用 `scripts/docx_read.py`，且只带一个模式标志。
   `--text` 以 JSON 返回正文段落、所有表格单元格文本，以及
   页眉/页脚文本。`--structure` 返回标题大纲
   以及段落/表格/节计数。`--images DIR` 将 `word/media/` 下的
   每个文件从包中复制出来。
3. **编辑。** 使用 `scripts/docx_edit.py`。`replace` 遍历正文、表格
   （含嵌套）、页眉和页脚，并保留文本块格式；
   添加 `--body-only` 可跳过页眉/页脚。传入 `-o out.docx` 保留
   原始文件；省略则就地编辑。`insert`/`delete`/`style`/`toc` 的段落索引
   对应 `--structure`/`--text` 的正文顺序。对于刚从重度 Word
   编辑中得到的文档，先运行 `normalize` —— 它会合并格式相同的相邻
   文本块，使后续查找替换可靠匹配。
4. **审阅修订。** `docx_revisions.py list` 报告正文、表格、页眉或页脚中
   任一处出现的每个 `w:ins` 和 `w:del`（id、作者、日期、影响的文本）。
   `accept-all` / `reject-all` 批量处理它们；
   `accept`/`reject --id N` 处理单条修订。接受保留插入并
   丢弃删除的文本；拒绝则相反。
5. **批注。** `docx_comments.py list` 返回每个批注的 id、
   作者、日期、正文文本，以及它所锚定的文档文本。
   `add --target "some phrase"` 将新批注锚定到该短语的首次
   出现处（文本块按需拆分；格式
   得以保留）。`delete --id N` 删除批注及其标记，
   不触及文档文本。
6. **模板。** 在文档中放置 `{{name}}` 风格的令牌。使用值为 JSON 对象的
   数据运行 `scripts/docx_template.py`。使用
   `--strict` 在仍有令牌未填充时失败；无论如何，JSON 输出都会列出
   `filled` 计数和 `unfilled_tokens`。
7. **验证**（始终执行）：用 `--text` 或
   `--structure` 重新读取输出，并对任何经修订/批注手术得到的文档运行
   `docx_validate.py`。

## 转换为 PDF

无需脚本。当安装了 LibreOffice 时，可无头转换：

```bash
soffice --headless --convert-to pdf --outdir outdir/ file.docx
```

先检查可用性（`command -v soffice || command -v
libreoffice`）。若两者都不存在，告知用户此环境中无法进行 PDF 转换，
而不是自行设法——python-docx 无法渲染 PDF，布局保真需要真正的渲染器。

## 陷阱

- **令牌跨文本块拆分。** Word 常将文本碎片化为多个
  文本块。替换辅助脚本会合并匹配到的文本块（替换内容继承
  第一个文本块的格式）；先运行 `docx_edit.py normalize` 可减少
  碎片化，利于之后的所有编辑。
- **修订覆盖范围。** `docx_revisions.py` 解析文本块级别的
  插入和删除（绝大多数）。段落标记
  和表格行修订、格式变更记录以及移动会被 `--revisions` 检测到
  但不会自动处理——参见
  `references/revisions-and-comments.md` 并将这些交给 Word。
- **批注串联。** 回复和「已解决」状态存于
  `commentsExtended.xml`，本技能忽略该文件；它添加的批注是
  普通顶级批注。
- **域结果由 Word 计算。** `toc`、`page-numbers` 以及
  `toc`/`footer_page_numbers` 规格选项写入*域代码*。
  Word/LibreOffice 在文件被打开时填充实际条目和编号（Word 可能提示
  更新域）；python-docx 从不计算它们，因此在此之前显示的是
  占位文本。
- **验证是健康检查，不是架构验证。**
  `docx_validate.py` 校验 zip、必需部件、关系
  目标、图片魔术字节和引用的样式。它不是 XSD
  验证——文件可能通过却仍含 Word 不喜欢的 XML。
- **样式名必须存在。** 应用文档中未定义的样式会
  引发 `KeyError`。诸如 `Heading 1`、`List Bullet`、
  `List Number`、`Table Grid` 等内置样式存在于默认模板中；自定义
  样式必须先在创建规格中声明。
- **编号列表会重启失效。** `List Number` 依赖 Word 的默认
  编号；一个文档中分开的列表可能会继续编号
  而非重新开始。需精确控制多个列表编号的用户请留意此警告。
- **单元格写入会替换格式。** `set-cell` 使用 `cell.text = ...`，
  这会将单元格中的文本块重置为纯格式。
- **编码。** 所有 JSON 规格/值文件都显式按 UTF-8 读取；
  编写自己的胶水代码时切勿依赖区域设置默认值。
- **不要对 XML 解压后 sed。** 通过脚本（或
  python-docx）编辑；在 `document.xml` 中做原始文本替换极易损坏文件。
  仅对 JSON 输入使用 `patch`/`write_file`，绝不要
  对 `.docx` 本身使用。

## 验证

- 创建/编辑/模板化后，运行 `docx_read.py out.docx --text` 并
  检查预期字符串出现（且旧字符串已消失）。
- 接受/拒绝后，`docx_revisions.py list` 应返回 `[]`（或
  仅你刻意保留的 id）；批注手术后，
  `docx_comments.py list` 应反映变更，且 `--text` 输出
  必须不变。
- `docx_validate.py out.docx` 在健康的
  包上退出码为 0 且 `"ok": true` —— 在任何修订/批注/域操作后都要运行它。
- 对以 `--strict` 运行的模板，或检查 `unfilled_tokens == []`。
- 结构检查：`--structure` 应显示预期的标题
  大纲和表格形状；`--styles` 确认自定义样式已应用。
