---
sidebar_position: 3
title: "文档提取"
description: "read_file 如何将 PDF、Office 文档和 notebook 转换为文本——以及当 PDF 是扫描图像时该怎么办"
---

# 文档提取

`read_file` 工具会自动将常见文档格式转换为可读文本，这样智能体就能像阅读源代码一样检查 PDF 或电子表格。

## 支持的格式

| 格式 | 扩展名 | 转换器 | 可用性 |
|--------|-----------|-----------|--------------|
| Jupyter notebook | `.ipynb` | 内置（标准库） | 始终可用 |
| Word 文档 | `.docx` | 内置（标准库） | 始终可用 |
| Excel 工作簿 | `.xlsx` | 内置（标准库） | 始终可用 |
| PDF | `.pdf` | 可选的 `anydoc` 转换器 | 首次使用时自动安装* |
| 旧版 Office | `.doc`、`.ppt`、`.xls`、`.pptx` 及其变体 | 可选的 `anydoc` 转换器 | 首次使用时自动安装* |
| OpenDocument | `.odt`、`.ods`、`.odp` | 可选的 `anydoc` 转换器 | 首次使用时自动安装* |
| 富文本 / 电子书 | `.rtf`、`.epub` | 可选的 `anydoc` 转换器 | 首次使用时自动安装* |

\* 可选转换器是 `firecrawl-anydoc` 包，在允许安装的环境中按需安装（`config.yaml` 中的 `security.allow_lazy_installs`）。没有它，三种标准库格式仍然可用；其他格式则回退到二进制文件保护。

转换输出为 Markdown，通过 `read_file` 常规的 `offset`/`limit` 窗口分页。超过 50 MB 的文档会被拒绝，以保持工具轮次有界。

提取功能可用于远程终端后端（Docker、Modal、SSH）：文件的字节会跨后端边界传输并在主机侧转换，因此沙箱内的文档读起来与本地文档相同。

## 扫描版 PDF：覆盖率警告

PDF 转换只读取**文本层**。作为扫描图像的页面——在法律文件、转售资料包、已签署合同、传真中很常见——不包含文本层，会静默转换为空。其典型特征是章节标题下正文为空。

当相当比例的页面未产出文本时（超过文档的 20%，或绝对值达到 10 页以上），`read_file` 会在提取结果前添加一条警告。每个不可读的空白区间都会以其前面最后提取到的文本作标注——通常是章节分隔线——这样智能体就能只针对它实际需要的空白区间，而不是 OCR 整个文档：

```
[EXTRACTION COVERAGE WARNING: 198 of 311 pages in this PDF yielded no
text. ... Unreadable gaps, each labeled with the last text extracted
before it:
  pages 42-77 (36 pages) — after "Antigua Maintenance Corp Bylaws" (p41)
  pages 92-213 (122 pages) — after "... Covenants, Codes and Regulations" (p91)
  page 224 (1 page) — after "... Insurance Declaration Pages" (p223)
Decide which gaps you actually need — do NOT OCR or render everything. ...]
```

警告会列出确切的页码范围以及恢复路径：

1. **少量页面——渲染 + 视觉。** 将页面转换为图像，并用视觉工具读取：
   ```bash
   pdftoppm -jpeg -r 150 -f 92 -l 94 document.pdf /tmp/page
   ```
   然后用 `vision_analyze` 检查每一张图像。无需额外依赖（检测本身需要 poppler）。
2. **大量页面——OCR。** `ocr-and-documents` 技能涵盖使用 marker-pdf 进行批量 OCR（支持 90 多种语言，可处理公式和表格；约需安装 3-5 GB）。

检测使用 poppler 的 `pdftotext` 进行逐页文本计数。如果未安装 poppler，提取仍然可用——覆盖率检查会被静默跳过。

:::tip
智能体会自行处理该警告——它会主动提出对缺失页面进行渲染或 OCR。如果你自己在阅读提取结果，请将“标题下正文为空”视为扫描版章节，而不是缺失的章节。
:::
