---
title: "Excalidraw — 手绘风格的 Excalidraw JSON 图表（架构图、流程图、时序图）"
sidebar_label: "Excalidraw"
description: "手绘风格的 Excalidraw JSON 图表（架构图、流程图、时序图）"
---

{/* 本页由 website/scripts/generate-skill-docs.py 从该技能的 SKILL.md 自动生成。请编辑源 SKILL.md，而非本页。 */}

# Excalidraw

手绘风格的 Excalidraw JSON 图表（架构图、流程图、时序图）。

## 技能元数据

| | |
|---|---|
| 来源 | 可选 — 使用 `hermes skills install official/creative/excalidraw` 安装 |
| 路径 | `optional-skills/creative\excalidraw` |
| Version | `1.0.1` |
| 作者 | Hermes Agent |
| 许可证 | MIT |
| 平台 | linux, macos, windows |
| 标签 | `Excalidraw`、`Diagrams`、`Flowcharts`、`Architecture`、`Visualization`、`JSON` |

## 参考：完整 SKILL.md

:::info
以下内容是该技能被触发时 Hermes 加载的完整技能定义。当技能处于激活状态时，这就是智能体所看到的指令。
:::

# Excalidraw 图表技能

通过编写标准 Excalidraw 元素 JSON 并保存为 `.excalidraw` 文件来创建图表。这些文件可以拖放到 [excalidraw.com](https://excalidraw.com) 上查看和编辑。无需账号、无需 API 密钥、无需渲染库 —— 只需要 JSON。

## 何时使用

为架构图、流程图、时序图、概念图等生成 `.excalidraw` 文件。文件可在 excalidraw.com 打开，或上传以获得可分享链接。

## 工作流

1. **加载该技能**（你已经完成了）
2. **编写元素 JSON** —— 一个 Excalidraw 元素对象数组
3. **保存文件** —— 使用 `write_file` 创建 `.excalidraw` 文件
4. **可选上传** —— 通过 `terminal` 使用 `scripts/upload.py` 获取可分享链接

### 保存图表

将元素数组包装在标准的 `.excalidraw` 封装结构中，然后用 `write_file` 保存：

```json
{
  "type": "excalidraw",
  "version": 2,
  "source": "hermes-agent",
  "elements": [ ...your elements array here... ],
  "appState": {
    "viewBackgroundColor": "#ffffff"
  }
}
```

保存到任意路径，例如 `~/diagrams/my_diagram.excalidraw`。

### 上传以获取可分享链接

通过终端运行上传脚本（位于该技能的 `scripts/` 目录中）：

```bash
python skills/creative/excalidraw/scripts/upload.py ~/diagrams/my_diagram.excalidraw
```

该脚本会上传到 excalidraw.com（无需账号）并打印一个可分享的 URL。需要 `cryptography` pip 包（`pip install cryptography`）。

---

## 元素格式参考

### 必需字段（所有元素）
`type`、`id`（唯一字符串）、`x`、`y`、`width`、`height`

### 默认值（可省略 —— 会自动应用）
- `strokeColor`：`"#1e1e1e"`
- `backgroundColor`：`"transparent"`
- `fillStyle`：`"solid"`
- `strokeWidth`：`2`
- `roughness`：`1`（手绘外观）
- `opacity`：`100`

画布背景为白色。

### 元素类型

**矩形（Rectangle）**：
```json
{ "type": "rectangle", "id": "r1", "x": 100, "y": 100, "width": 200, "height": 100 }
```
- `roundness: { "type": 3 }` 用于圆角
- `backgroundColor: "#a5d8ff"`、`fillStyle: "solid"` 用于填充

**椭圆（Ellipse）**：
```json
{ "type": "ellipse", "id": "e1", "x": 100, "y": 100, "width": 150, "height": 150 }
```

**菱形（Diamond）**：
```json
{ "type": "diamond", "id": "d1", "x": 100, "y": 100, "width": 150, "height": 150 }
```

**带标签的图形（容器绑定）** —— 创建一个绑定到该图形的文本元素：

> **警告：** 不要在图形上使用 `"label": { "text": "..." }`。这**不是**有效的
> Excalidraw 属性，会被静默忽略，从而产生空白图形。你**必须**
> 使用下面的容器绑定方式。

图形需要 `boundElements` 列出该文本，文本需要通过 `containerId` 回指该图形：
```json
{ "type": "rectangle", "id": "r1", "x": 100, "y": 100, "width": 200, "height": 80,
  "roundness": { "type": 3 }, "backgroundColor": "#a5d8ff", "fillStyle": "solid",
  "boundElements": [{ "id": "t_r1", "type": "text" }] },
{ "type": "text", "id": "t_r1", "x": 105, "y": 110, "width": 190, "height": 25,
  "text": "Hello", "fontSize": 20, "fontFamily": 1, "strokeColor": "#1e1e1e",
  "textAlign": "center", "verticalAlign": "middle",
  "containerId": "r1", "originalText": "Hello", "autoResize": true }
```
- 适用于矩形、椭圆、菱形
- 当设置了 `containerId` 时，Excalidraw 会自动将文本居中
- 文本的 `x`/`y`/`width`/`height` 是近似值 —— Excalidraw 会在加载时重新计算
- `originalText` 应与 `text` 一致
- 始终包含 `fontFamily: 1`（Virgil/手绘字体）

**带标签的箭头** —— 采用相同的容器绑定方式：
```json
{ "type": "arrow", "id": "a1", "x": 300, "y": 150, "width": 200, "height": 0,
  "points": [[0,0],[200,0]], "endArrowhead": "arrow",
  "boundElements": [{ "id": "t_a1", "type": "text" }] },
{ "type": "text", "id": "t_a1", "x": 370, "y": 130, "width": 60, "height": 20,
  "text": "connects", "fontSize": 16, "fontFamily": 1, "strokeColor": "#1e1e1e",
  "textAlign": "center", "verticalAlign": "middle",
  "containerId": "a1", "originalText": "connects", "autoResize": true }
```

**独立文本**（仅用于标题和注释 —— 无容器）：
```json
{ "type": "text", "id": "t1", "x": 150, "y": 138, "text": "Hello", "fontSize": 20,
  "fontFamily": 1, "strokeColor": "#1e1e1e", "originalText": "Hello", "autoResize": true }
```
- `x` 是左边缘坐标。要在位置 `cx` 居中：`x = cx - (text.length * fontSize * 0.5) / 2`
- 不要依赖 `textAlign` 或 `width` 进行定位

**箭头（Arrow）**：
```json
{ "type": "arrow", "id": "a1", "x": 300, "y": 150, "width": 200, "height": 0,
  "points": [[0,0],[200,0]], "endArrowhead": "arrow" }
```
- `points`：相对于元素 `x`、`y` 的 `[dx, dy]` 偏移
- `endArrowhead`：`null` | `"arrow"` | `"bar"` | `"dot"` | `"triangle"`
- `strokeStyle`：`"solid"`（默认）| `"dashed"` | `"dotted"`

### 箭头绑定（将箭头连接到图形）

```json
{
  "type": "arrow", "id": "a1", "x": 300, "y": 150, "width": 150, "height": 0,
  "points": [[0,0],[150,0]], "endArrowhead": "arrow",
  "startBinding": { "elementId": "r1", "fixedPoint": [1, 0.5] },
  "endBinding": { "elementId": "r2", "fixedPoint": [0, 0.5] }
}
```

`fixedPoint` 坐标：`top=[0.5,0]`、`bottom=[0.5,1]`、`left=[0,0.5]`、`right=[1,0.5]`

### 绘制顺序（z 轴顺序）
- 数组顺序 = z 轴顺序（第一个 = 最后面，最后一个 = 最前面）
- 逐步产出：背景区域 → 图形 → 其绑定文本 → 其箭头 → 下一个图形
- 错误方式：先所有矩形，再所有文本，最后所有箭头
- 正确方式：bg_zone → shape1 → text_for_shape1 → arrow1 → arrow_label_text → shape2 → text_for_shape2 → ...
- 始终将绑定文本元素紧挨着放在其容器图形的后面

### 尺寸指南

**字体大小：**
- 正文文本、标签、描述的最小 `fontSize`：**16**
- 标题和heading的最小 `fontSize`：**20**
- 仅次要注释的最小 `fontSize`：**14**（谨慎使用）
- 切勿使用低于 14 的 `fontSize`

**元素大小：**
- 带标签的矩形/椭圆的最小图形尺寸：120x60
- 元素之间至少留出 20-30px 的间距
- 宁要更少、更大的元素，不要许多很小的元素

### 调色板

完整颜色表见 `references/colors.md`。快速参考：

| 用途 | 填充色 | 十六进制 |
|-----|-----------|-----|
| 主要 / 输入 | 浅蓝 | `#a5d8ff` |
| 成功 / 输出 | 浅绿 | `#b2f2bb` |
| 警告 / 外部 | 浅橙 | `#ffd8a8` |
| 处理 / 特殊 | 浅紫 | `#d0bfff` |
| 错误 / 关键 | 浅红 | `#ffc9c9` |
| 备注 / 决策 | 浅黄 | `#fff3bf` |
| 存储 / 数据 | 浅青 | `#c3fae8` |

### 提示
- 在整个图表中一致使用调色板
- **文本对比度至关重要** —— 切勿在白色背景上使用浅灰色。白色背景上的最小文本颜色：`#757575`
- 不要在文本中使用 emoji —— 它们无法在 Excalidraw 的字体中渲染
- 深色模式图表，见 `references/dark-mode.md`
- 更大的示例，见 `references/examples.md`
