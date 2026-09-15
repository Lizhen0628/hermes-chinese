---
sidebar_position: 3
title: "文档提取"
description: "read_file 如何将 PDF、Office 文档和 notebook 转换为文本——以及当 PDF 是扫描图像时该怎么办"
---

# 文档提取

`read_file` 工具会自动将常见文档格式转换为可读文本，因此智能体可以像阅读源代码一样查看 PDF 或电子表格。

## 支持的格式

| 格式 | 扩展名 | 转换器 | 可用性 |
|--------|-----------|-----------|--------------|
| Jupyter notebook | `.ipynb` | 内置（标准库） | 始终可用 |
| Word 文档 | `.docx` | 内置（标准库） | 始终可用 |
| Excel 工作簿 | `.xlsx` | 内置（标准库） | 始终可用 |
| PDF | `.pdf` | 可选的 `anydoc` 转换器 | 首次使用时自动安装* |
| 旧版 Office | `.doc`、`.ppt`、`.xls`、`.pptx` 及变体 | 可选的 `anydoc` 转换器 | 首次使用时自动安装* |
| OpenDocument | `.odt`、`.ods`、`.odp` | 可选的 `anydoc` 转换器 | 首次使用时自动安装* |
| 富文本 / 电子书 | `.rtf`、`.epub` | 可选的 `anydoc` 转换器 | 首次使用时自动安装* |

\* 可选转换器是 `firecrawl-anydoc` 包，在允许安装的环境下延迟安装（`config.yaml` 中的 `security.allow_lazy_installs`）。不安装它时，三种标准库格式仍然可用；其他格式则回退到二进制文件防护。

转换输出为 Markdown，通过 `read_file` 常规的 `offset`/`limit` 窗口分页。超过 50 MB 的文档会被拒绝，以保持工具轮次有界。

提取可与远程终端后端（Docker、Modal、SSH）配合使用：文件字节会跨后端边界传输并在主机侧转换，因此沙箱内的文档与本地文档读取效果相同。

## 扫描版 PDF：覆盖警告

PDF 转换**只读取文本层**。作为扫描图像的页面——在法律文件、转售资料包、已签署合同、传真中很常见——不包含文本层，会静默地转换为空。明显的特征是正文为空的小节标题。

当有相当比例的页面没有产出文本时（超过文档的 20%，或绝对数量达到 10 页以上），`read_file` 会在提取内容前添加警告。每个无法读取的缺口都用其之前最后提取到的文本（通常是分节分隔符）标注，这样智能体可以只针对它实际需要的缺口进行处理，而不必对整份文档 OCR：

```
[EXTRACTION COVERAGE WARNING: 198 of 311 pages in this PDF yielded no
text. ... Unreadable gaps, each labeled with the last text extracted
before it:
  pages 42-77 (36 pages) — after "Antigua Maintenance Corp Bylaws" (p41)
  pages 92-213 (122 pages) — after "... Covenants, Codes and Regulations" (p91)
  page 224 (1 page) — after "... Insurance Declaration Pages" (p223)
Decide which gaps you actually need — do NOT OCR or render everything. ...]
```

警告会列出确切的页面范围以及恢复途径：

1. **少量页面——渲染 + 视觉。** 将页面转换为图像，并用视觉工具读取：
   ```bash
   pdftoppm -jpeg -r 150 -f 92 -l 94 document.pdf /tmp/page
   ```
   然后用 `vision_analyze` 检查每张图像。零额外依赖（检测本身需要 poppler）。
2. **大量页面——OCR。** `ocr-and-documents` 技能涵盖使用 marker-pdf 进行批量 OCR（支持 90+ 种语言，能处理公式和表格；安装约需 3-5 GB）。

检测使用 poppler 的 `pdftotext` 统计每页文本量。如果未安装 poppler，提取仍然可用——覆盖检查会被静默跳过。

:::tip
智能体会自行处理该警告——它会主动提议渲染或 OCR 缺失的页面。如果你自己在阅读提取结果，请将"标题配空正文"视为扫描章节，而非缺失章节。
:::
