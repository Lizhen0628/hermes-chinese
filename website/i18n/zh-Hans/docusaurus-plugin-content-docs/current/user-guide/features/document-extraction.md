---
sidebar_position: 3
title: "文档提取"
description: "read_file 如何将 PDF、Office 文档和 notebook 转换为文本 —— 以及当 PDF 是扫描图像时该怎么办"
---

# 文档提取

`read_file` 工具会自动将常见文档格式转换为可读文本，因此智能体可以像读取源代码一样检查 PDF 或电子表格。

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

\* 可选转换器是 `firecrawl-anydoc` 包，在允许安装的场景下惰性安装（`config.yaml` 中的 `security.allow_lazy_installs`）。若没有它，三种标准库格式仍可用；其它格式则回退为二进制文件防护。

转换输出为 Markdown，通过 `read_file` 常规的 `offset`/`limit` 窗口分页读取。超过 50 MB 的文档会被拒绝，以保持工具调用轮次有界。

提取支持远程终端后端（Docker、Modal、SSH）：文件字节会跨越后端边界传输并在宿主侧转换，因此沙箱内的文档与本地文档读取效果一致。

## 扫描的 PDF：覆盖警告

PDF 转换只读取**文本层**。作为扫描图像的页面——在法律文档、转售资料包、已签署合同、传真中很常见——不含文本层，会静默地转换为空。最明显的特征是章节标题下内容为空。

当有相当比例的页面未产生文本时（超过文档的 20%，或绝对数量达到 10 页以上），`read_file` 会在提取结果前添加一条警告。每段不可读的缺失区间都会用其之前最后提取到的文本（通常是章节分隔）来标注，这样智能体就能只针对它真正需要的缺失区间，而无需对整份文档做 OCR：

```
[EXTRACTION COVERAGE WARNING: 198 of 311 pages in this PDF yielded no
text. ... Unreadable gaps, each labeled with the last text extracted
before it:
  pages 42-77 (36 pages) — after "Antigua Maintenance Corp Bylaws" (p41)
  pages 92-213 (122 pages) — after "... Covenants, Codes and Regulations" (p91)
  page 224 (1 page) — after "... Insurance Declaration Pages" (p223)
Decide which gaps you actually need — do NOT OCR or render everything. ...]
```

警告会列出确切的页码范围及恢复路径：

1. **少量页面——渲染 + 视觉。** 将页面转换为图像，并用视觉工具读取：
   ```bash
   pdftoppm -jpeg -r 150 -f 92 -l 94 document.pdf /tmp/page
   ```
   然后用 `vision_analyze` 检查每张图像。无需额外依赖（检测本身需要 poppler）。
2. **大量页面——OCR。** `ocr-and-documents` 技能涵盖使用 marker-pdf 进行批量 OCR（支持 90+ 种语言，可处理公式和表格；安装约需 3-5 GB）。

检测使用 poppler 的 `pdftotext` 逐页统计文本量。若未安装 poppler，提取仍可用——覆盖检查会被静默跳过。

:::tip
智能体可自行处理该警告——它会主动提出渲染或 OCR 缺失的页面。如果你自己在查看提取结果，请将“标题下内容为空”视为扫描的章节，而非缺失的章节。
:::
