---
title: "Pdf — PDF 文件：创建、读取、合并、填表、OCR、编辑文本"
sidebar_label: "Pdf"
description: "PDF 文件：创建、读取、合并、填表、OCR、编辑文本"
---

{/* 本页面由 website/scripts/generate-skill-docs.py 从该技能的 SKILL.md 自动生成。请编辑源文件 SKILL.md，而非本页面。 */}

# Pdf

PDF 文件：创建、读取、合并、填表、OCR、编辑文本。

## 技能元数据

| | |
|---|---|
| 来源 | 内置（默认安装） |
| 路径 | `skills/productivity\pdf` |
| 版本 | `1.1.0` |
| 作者 | Nous Research |
| 许可证 | MIT |
| 平台 | linux、macos、windows |
| 标签 | `pdf`、`documents`、`forms`、`ocr`、`text-extraction`、`reportlab`、`pypdf`、`pdfplumber`、`pymupdf`、`marker` |
| 相关技能 | [`docx`](/docs/user-guide/skills/bundled/productivity/productivity-docx)、[`xlsx`](/docs/user-guide/skills/bundled/productivity/productivity-xlsx)、[`powerpoint`](/docs/user-guide/skills/bundled/productivity/productivity-powerpoint) |

## 参考：完整 SKILL.md

:::info
以下是 Hermes 在该技能被触发时加载的完整技能定义。当技能处于激活状态时，这就是智能体看到的指令内容。
:::

# PDF 技能

从结构化 spec 创建 PDF，构建并填写 AcroForm 表单（含布局检查与可视化叠加层），提取文本/表格/元数据，合并/拆分/旋转/添加水印/加盖印章，导出页面图像，管理元数据与附件，以及加密/解密——使用 pypdf、reportlab 和 pdfplumber。两个已并入的能力位于 references/ 目录中（执行这些任务前请先阅读对应文件）：

- **扫描件/纯图像 PDF 与 OCR**（pymupdf 快速路径、marker-pdf 高质量路径，scripts/extract_pymupdf.py + scripts/extract_marker.py）：`references/ocr-extraction.md`
- **通过自然语言提示编辑现有 PDF 中的文本**（nano-pdf CLI）：`references/nano-pdf-editing.md`

## 何时使用

- 以 PDF 形式生成报告、发票或多页文档。
- 从 JSON spec 构建可填写的 AcroForm（文本/复选框/单选按钮/下拉列表），并先对布局进行检查。
- 从 PDF 中提取文本、表格（JSON/CSV）、元数据或表单字段值。
- 合并、拆分、旋转 PDF，提取页面子集，添加水印，在指定坐标加盖文本/图像印章，添加书签，或压缩 PDF。
- 将页面导出为 PNG 以便进行可视化审阅或交接给 OCR；设置/清除文档元数据；添加/提取文件附件。
- 填写或扁平化 AcroForm 表单；使用密码加密或解密。
- 不适用于扫描件/纯图像 PDF（请使用 `references/ocr-extraction.md`），也不适用于像素级精确的 HTML 转 PDF 渲染（请使用无头浏览器）。

## 前置条件

- Python 3.10+，并安装 `pypdf`、`reportlab`、`pdfplumber`：
  `python -m pip install pypdf reportlab pdfplumber`
- 可选，用于页面栅格化（`pdf_page_image.py`、叠加层渲染）：`python -m pip install pypdfium2`，或将 poppler 的 `pdftoppm` 加入 PATH。脚本的回退顺序为 pypdfium2 → pdftoppm，当两者都不存在时报告 `{"rendered": false, "missing": [...]}`（退出码 0）。
- 每个辅助脚本都会延迟检查导入，并在缺依赖时打印安装提示。

## 如何运行

所有辅助脚本都位于 `scripts/` 目录中，均为 argparse CLI——使用 `terminal` 工具运行；每个脚本都支持 `--help`。它们严格以 UTF-8 读写 JSON，将 JSON 结果打印到 stdout，并在失败时以非零码退出。

```bash
python scripts/pdf_create.py spec.json -o out.pdf         # 根据 JSON spec 构建 PDF
python scripts/pdf_make_form.py formspec.json -o form.pdf # 根据 JSON spec 构建可填写的 AcroForm
python scripts/pdf_form_layout.py formspec.json           # 构建前先检查表单布局
python scripts/pdf_form_layout.py formspec.json --render-overlay boxes.png [--pdf form.pdf]
python scripts/pdf_read.py doc.pdf --text                 # 每页文本（JSON）
python scripts/pdf_read.py doc.pdf --tables --csv-dir t/  # 表格导出为 JSON + CSV 文件
python scripts/pdf_read.py doc.pdf --meta                 # 元数据、页面尺寸、加密/扫描件标记
python scripts/pdf_read.py form.pdf --fields              # 表单字段：名称、类型、值
python scripts/pdf_merge.py a.pdf b.pdf -o merged.pdf [--bookmarks]
python scripts/pdf_split.py doc.pdf --pages 1-3,7 -o part.pdf [--rotate 90]
python scripts/pdf_fill_form.py form.pdf --fields-json values.json -o filled.pdf [--flatten]
python scripts/pdf_secure.py doc.pdf --encrypt -o enc.pdf --user-password your-password
python scripts/pdf_secure.py enc.pdf --decrypt -o dec.pdf --password your-password
python scripts/pdf_watermark.py doc.pdf --stamp mark.pdf -o stamped.pdf [--under]
python scripts/pdf_stamp.py doc.pdf -o out.pdf --text "DRAFT" --x 150 --y 400 \
    --font-size 60 --rotation 45 --opacity 0.3 --color "#cc0000" [--pages 1-3]
python scripts/pdf_stamp.py doc.pdf -o out.pdf --image sig.png --x 400 --y 60 --width 120
python scripts/pdf_page_image.py doc.pdf --pages 1-3 --dpi 150 --out-dir imgs/
python scripts/pdf_meta.py doc.pdf --set-meta --title "T" --author "A" -o out.pdf
python scripts/pdf_meta.py doc.pdf --attach data.csv -o out.pdf
python scripts/pdf_meta.py doc.pdf --list-attachments | --extract-attachments dir/
```

## 快速参考

| 任务 | 工具 | 命令 / API |
|---|---|---|
| 创建文档（标题、表格、图像） | reportlab platypus | `pdf_create.py spec.json -o out.pdf` |
| 构建可填写表单 | reportlab acroForm | `pdf_make_form.py formspec.json -o form.pdf` |
| 检查表单布局 / 叠加图像 | pure python + PIL | `pdf_form_layout.py formspec.json [--render-overlay o.png]` |
| 逐页文本 | pdfplumber | `pdf_read.py f.pdf --text` |
| 表格 → JSON/CSV | pdfplumber | `pdf_read.py f.pdf --tables` |
| 元数据 / 尺寸 / 加密 / 扫描 | pypdf + pdfplumber | `pdf_read.py f.pdf --meta` |
| 合并（+ 大纲） | pypdf | `pdf_merge.py a.pdf b.pdf -o m.pdf` |
| 拆分 / 提取 / 旋转 | pypdf | `pdf_split.py f.pdf --pages 2-5 --rotate 90` |
| 列出 / 填写 / 展平表单 | pypdf | `pdf_read.py --fields`, `pdf_fill_form.py` |
| 加密 / 解密（AES-256） | pypdf | `pdf_secure.py --encrypt/--decrypt` |
| 水印 / 盖章 PDF 页面 | pypdf | `pdf_watermark.py f.pdf --stamp w.pdf` |
| 在坐标处盖章文字/图像 | reportlab + pypdf | `pdf_stamp.py f.pdf --text "Sign here" --x 400 --y 60` |
| 页面 → PNG（审核 / OCR 交接） | pypdfium2 或 pdftoppm | `pdf_page_image.py f.pdf --pages 1-3 --out-dir imgs/` |
| 设置/清除元数据、附件 | pypdf | `pdf_meta.py --set-meta / --attach / --extract-attachments` |
| 压缩内容流 | pypdf | `pdf_split.py f.pdf --pages 1-N --compress` |

## 操作步骤

1. **先检查。** 运行 `pdf_read.py file.pdf --meta`。检查 `encrypted`（如果为 true，先用 `pdf_secure.py --decrypt` 解密）和 `likely_scanned_pages`。如果页面只有图像，用 `pdf_page_image.py --pages <scanned> --dpi 300 --out-dir imgs/` 导出，并把 PNG 交给 `references/ocr-extraction.md` 技能处理——不要把空的文本报告为"无内容"。
2. **创建。** 用 `write_file` 写一个 JSON 规范（元素包括：`heading`、`paragraph`、`table`、`image`、`pagebreak`；可选 `title`/`author` 元数据；页码会自动添加），然后运行 `pdf_create.py`。如果布局很重要，用 `vision_analyze` 对渲染后的页面图像进行视觉验证。
3. **提取。** `--text` 给出逐页字符串的 JSON 列表；`--tables` 给出每页的行数组，也可以输出 CSV 文件。用 `read_file` 读取结果；绝不要直接肉眼查看二进制 PDF。
4. **操作。** `pdf_merge.py` 拼接文件，并可为每个源文件添加一个书签；`pdf_split.py` 处理页面范围（从 1 开始，例如 `1-3,5,9-`）、按 90° 步长旋转，以及 `--compress`。制作水印的方法是准备一个单页印章 PDF（例如通过 `pdf_create.py`），然后用 `pdf_watermark.py` 叠加它；对于单行印章（"sign here"、斜向 DRAFT、角落标签），用 `pdf_stamp.py` 在显式坐标处放置文本或图像。
5. **构建表单。** 写一个表单规范 JSON（字段带有以 PDF 点为单位的 `label_box`/`entry_box`——见 `references/forms.md`），用 `pdf_form_layout.py` 检查它并修复每个报告的问题，可选地用 `vision_analyze` 审查 `--render-overlay` PNG，然后用 `pdf_make_form.py` 构建，并用 `pdf_read.py --fields` 确认。
6. **填写表单。** 列出字段（`--fields`）以了解确切的名称和类型，用 `write_file` 写一个 `{"FieldName": "value"}` 的 UTF-8 JSON（复选框接受 `true`/`false`；单选/选择的值必须匹配字段的导出选项），然后运行 `pdf_fill_form.py`。用 `--fields` 重新读取以确认值已写入。
7. **元数据与附件。** `pdf_meta.py --set-meta` 写入 Title/Author/Subject/Keywords（DocInfo）；`--clear-meta` 清除它们；`--attach`/`--list-attachments`/`--extract-attachments` 往返处理嵌入文件。
8. **安全。** 使用不同的用户/所有者密码和 AES-256 加密。要移除你知道的密码，`--decrypt` 会写出一个未加密的副本。
9. **验证**（见下文），然后再报告成功。

## 陷阱

- **扫描版 PDF**：`extract_text()` 返回空，加上页面图像，意味着没有文本层。请转到 `references/ocr-extraction.md`；不要捏造文本。
- **展平限制**：`pdf_fill_form.py --flatten` 使用 pypdf 的展平支持，它将控件外观转换为页面内容。它对纯文本字段和复选框可靠，但可能丢弃或错误渲染特殊控件（富文本、自定义外观流、某些单选组）。用 `vision_analyze` 视觉验证展平后的输出；对于万无一失的展平，使用外部渲染器（例如 Ghostscript 或 `pdftoppm`+重新组装）作为后备方案。
- **NeedAppearances**：填写后，查看器只有在存在外观流时才会渲染值。填写脚本设置 AcroForm 的 `NeedAppearances` 标志，以便符合规范的查看器重新生成它们；某些精简查看器会忽略它——如果显示保真度很重要，请展平。
- **非拉丁表单值**：值被正确存储（UTF-16），但字段的默认字体可能缺少字形，因此即使数据往返正常，查看器也可能显示空白。用 `--fields` 验证，而不仅仅是视觉上验证。
- **压缩期望**：`--compress` 只会对内容流进行 deflate 压缩。典型节省为 0–20%；对于以图像为主或流已被压缩的 PDF，它没有效果。它不是图像降低采样的替代品（那是 Ghostscript 的领域）。
- **权限标志不会强制执行**：所有者密码权限位（禁止打印、禁止复制）只是礼貌的请求，查看器可能会遵守；任何库（包括 pypdf）都可以读取并剥离它们。只有用户密码通过加密真正管控内容。绝不要把权限标志当作安全措施。
- **表格提取是启发式的**：pdfplumber 从框线/文字对齐检测表格；无边框或合并单元格的表格可能需要调优 `table_settings` 或手动清理。
- **页面索引**：辅助 CLI 接收从 1 开始的页码；pypdf API 是从 0 开始的。脚本会转换——不要重复转换。
- **旋转印章文本提取**：pdfplumber 的行分组会打乱旋转的字形（一个 45° 的 "DRAFT" 会被提取为散乱字母）；请用 `pypdf` 的 `extract_text()` 或渲染图像来验证旋转印章。
- **单选组**：reportlab 每个组需要 ≥2 个 `radio()` 控件，填写需要带斜杠的导出值（`"/red"`），而且单选的展平保真度最差——见 `references/forms.md`。
- **元数据范围**：`pdf_meta.py` 只写入经典的 DocInfo 字典；嵌入的 XMP 元数据（如果有）不受影响，在某些查看器中可能显示不同的值。
- **PDF/A 不在范围内**：pypdf/reportlab 无法生成或验证符合规范的 PDF/A。如果需要归档合规性，请通过 `terminal` 工具运行 Ghostscript（例如 `gs -dPDFA=2 -dPDFACompatibilityPolicy=1 -sColorConversionStrategy=UseDeviceIndependentColor -sDEVICE=pdfwrite -o out.pdf in.pdf`，并配合合适的 ICC 配置文件），然后用 veraPDF 验证——两者都是外部安装，而且结果仍然需要验证，而不是想当然。
- 旋转必须是 90 的倍数；加密的输入必须在任何其他操作之前解密。

## 验证

- 创建/合并/拆分后：运行 `pdf_read.py out.pdf --meta` —— 确认 `page_count`，如果你做了旋转，还要确认每页的 `rotation`。
- 提取后：检查 JSON 非空，并抽查一个已知字符串或单元格。
- 表单设计循环：`pdf_form_layout.py spec.json` 必须以退出码 0 结束；然后运行 `--render-overlay boxes.png --pdf form.pdf`，用 `vision_analyze` 审查生成的 PNG（红色 = 含字段名的输入框，蓝色 = 标签框），重点检查重叠、错位以及标签与字段脱离的问题。重复执行 spec → lint → overlay，直到结果干净。
- 构建表单后：`pdf_read.py form.pdf --fields` 会列出每一个 spec 字段及其正确的类型和选项。
- 填充表单后：运行 `pdf_read.py filled.pdf --fields` 并比对值（精确匹配，包括非 ASCII 字符）。
- 盖章后：重新提取文本（旋转过的图章用 pypdf），或用 `pdf_page_image.py` 渲染页面，再用 `vision_analyze` 检查。
- 元数据/附件编辑后：运行 `pdf_read.py --meta` / `pdf_meta.py --list-attachments`，并重新提取一个附件做逐字节比对。
- 加密后：`--meta` 应显示 `"encrypted": true`，且不带密码无法打开；解密后，文本提取结果应与原始文件一致。
- 对于任何视觉相关内容（水印、扁平化表单），都要渲染后用 `vision_analyze` 检查。
