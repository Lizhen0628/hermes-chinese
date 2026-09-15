---
title: "Tldraw Offline — 用智能体驱动并编写 tldraw 离线画布脚本"
sidebar_label: "Tldraw Offline"
description: "用智能体驱动并编写 tldraw 离线画布脚本"
---

{/* 本页由 website/scripts/generate-skill-docs.py 根据技能的 SKILL.md 自动生成。请编辑源 SKILL.md，而非本页。 */}

# Tldraw Offline

用智能体驱动并编写 tldraw 离线画布脚本。

## 技能元数据

| | |
|---|---|
| Source | 可选 — 通过 `hermes skills install official/creative/tldraw-offline` 安装 |
| Path | `optional-skills/creative\tldraw-offline` |
| Version | `1.0.0` |
| Author | Teknium + Hermes Agent |
| License | MIT |
| Platforms | linux, macos, windows |
| Tags | `tldraw`, `canvas`, `whiteboard`, `document-script`, `diagramming` |

## 参考：完整的 SKILL.md

:::info
以下是 Hermes 在此技能被触发时加载的完整技能定义。这就是技能激活时智能体看到的指令。
:::

# tldraw offline 技能

配合 tldraw 离线桌面应用（offline.tldraw.com）使用：读取当前打开的
画布、进行编辑，以及编写**文档脚本** —— 嵌入在 `.tldraw` 文件中、在加载时运行、
赋予文件持久行为的 JavaScript。该应用运行一个**本地 HTTP API**（默认 `localhost:7236`），
编码智能体可以从终端用普通的 `curl` 驱动它 —— 这正是应用自家主页演示
（Codex 实时编辑画布）的工作方式。智能体**不**使用 computer-use /
GUI 点击，也**不**直接手动编辑 `.tldraw` 文件。工作期间请保持 tldraw
offline 处于打开状态。

## 何时使用

- 用户打开了 tldraw offline，并要求你构建或修改画布
  （图表、线框图、布局）。
- 你想为绘图添加持久行为（响应式形状、交互式按钮、动画、连接逻辑），
  通过嵌入的文档脚本实现。

不要为了模仿一幅绘图而手动摆放形状 —— 编写生成它们的代码。
智能体编写画布脚本的能力远胜于在画布上绘制。

## 前提条件

- **tldraw offline 已安装并正在运行**，且打开了一个文档。发行版：
  https://github.com/tldraw/tldraw-offline/releases/latest（macOS DMG、Windows
  x64/Arm64、Linux 的 `x86_64`/`arm64` AppImage 或 amd64/arm64 `.deb`）。
- **应用中已安装智能体技能**：`Develop → Install Agent Skills`。应用会把
  自己的 tldraw 技能写入 `~/.codex/skills/`、`~/.claude/skills/`、
  `~/.cursor/skills/` 和 `~/.gemini/skills/` —— 教会该智能体下面这些 `curl`
  用法。（本 Hermes 技能为 Hermes 镜像了该指南。）
- **本地控制 API。** 启动时，应用会把 `server.json` 写入其配置目录
  （Linux `~/.config/tldraw/`、macOS `~/Library/Application Support/tldraw/`、
  Windows `%APPDATA%\tldraw\`），其中包含 `port`（默认 `7236`）、一个
  bearer `token`、`pid` 和 `startedAt`。除 `GET /` 之外，每个请求都需要
  `Authorization: Bearer <token>`。正常退出会删除 `server.json`；如果文件存在但端口无响应，
  说明应用非正常退出 —— 视为未运行。
- **每次 shell 调用都要重新读取 port + token。** 每次终端调用都是一个全新的
  shell，因此 `export` 出去的 token 不会保留 —— “导出一次后复用”会发送
  空 token 并返回 401。在每次调用开头内联读取两者：
  `PORT=$(jq -r .port <server.json>); TOKEN=$(jq -r .token <server.json>)`。
- 本地编辑不需要账户或网络。

## 如何运行

两种不同的工作流，按改动是否需要在重新加载后保留来选择。

**A. 一次性画布编辑（`/exec`）** —— 布局、生成形状、清理。这是实时编辑，
不保存为脚本：

```bash
BASE=http://localhost:7236
TOKEN=$(python -c "import json;print(json.load(open('$HOME/.config/tldraw/server.json'))['token'])")
# 找到当前聚焦的文档 id
DOC=$(curl -s "$BASE/api/search" -X POST -H 'content-type: application/json' \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"code":"return (await api.getFocusedDoc()).id"}' | python -c "import sys,json;print(json.load(sys.stdin)['result'])")
# 在作用域内带有实时的 `editor` + `helpers` 的情况下运行代码
curl -s "$BASE/api/doc/$DOC/exec" -X POST -H 'content-type: application/json' \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"code":"const {createShapeId,toRichText}=await import(\"tldraw\"); editor.createShape({id:createShapeId(),type:\"geo\",x:0,y:0,props:{geo:\"rectangle\",w:200,h:100,color:\"blue\",fill:\"solid\",richText:toRichText(\"hello\")}}); return editor.getCurrentPageShapes().length"}'
```

**B. 持久行为（`script/main.js`）** —— 必须能在重新加载后保留的响应式/交互式逻辑。
编辑磁盘上的文件；应用的 watcher watcher 会应用它：

```bash
# 获取该文档的实时脚本文件路径
curl -s "$BASE/api/doc/$DOC/script-workspace" -X POST \
  -H "Authorization: Bearer $TOKEN"          # -> result.mainJsPath、result.isDefaultScript
# 用 read_file / patch / write_file 编辑 result.mainJsPath（参见 scripts/main.js）
# 然后确认 watcher 已应用它：
curl -s "$BASE/api/doc/$DOC/script-status" -H "Authorization: Bearer $TOKEN"
```

可直接取用的文档脚本是 `scripts/main.js`。

## 快速参考

文档-脚本契约（已对照应用内置的 `script-context.d.ts` 验证）：

```js
import { createShapeId, toRichText } from 'tldraw'   // 基元：以 import 引入，而非全局变量

export default function ({ editor, helpers, signal }) {
  editor.run(() => {                                 // 批处理 = 一次撤销步骤
    helpers.createShapeIfMissing({                   // 幂等的固定元素
      id: createShapeId('node-1'), type: 'geo', x: 0, y: 0,
      props: { geo: 'rectangle', w: 200, h: 100, richText: toRichText('hi') },
    })
  })

  const stop = editor.store.listen(() => { /* 响应 */ })  // 在提交后的那个 tick 触发
  signal.addEventListener('abort', () => stop())           // 在重跑/关闭时必须清理
}
```

- `ctx.editor` —— 实时的 `Editor`（`createShape`、`updateShape`、`deleteShapes`、
  `getCurrentPageShapes`、`getShape`、`getBindingsFromShape`、`zoomToFit`、
  `on('tick'|'event', fn)`、`run(fn, { history: 'ignore' })`）。
- `ctx.helpers` —— `createShapeIfMissing`、`createShapesIfMissing`、
  `createArrowBetweenShapes(from, to, { arrowheadEnd })`、`translateShapes`、
  `onShapeTranslate(id, fn, { signal })`、`richTextToPlainText`、`boxShapes`、
  `getLints`。
- `ctx.signal` —— `AbortSignal`；把每个监听器/定时器的清理都挂到它上面。
- `config.js`（单独的文件）注册自定义形状/工具/组件工具函数，并在挂载前运行；
  `main.js` 针对已挂载的 editor 运行，并在保存时重跑。

## 交互式 UI（驱动状态的可点击按钮）

绘制的形状可以像一个真正的应用一样运作——这是静态白板做不到的。
完整示例：`scripts/counter.js`（一个数字显示 + MINUS/RESET/PLUS 按钮）。

验证边界——在声称交互能工作或不能工作之前请阅读此部分。
应用自己的智能体操练手册说，要用 `/exec` 通过“一次模拟点击和一次状态读取”来验证可点击 UI 脚本
（`editor.dispatch` 一个指针事件，等待一个 tick，读取形状的状态）——而不是通过驱动真实鼠标。按
该标准，计数器已经验证过：分派的点击让它按
`0 → 1 → 2 → 1 → 0` 步进。有两点值得记录的注意事项：
- **脚本只有在应用的文件监听器应用它之后才会运行。** 在 Linux 上，该
  监听器使用 inotify；如果主机的 `fs.inotify.max_user_instances` 已耗尽，
  日志会记录 `inotify_add_watch ... No space left on device`，`script-status` 显示
  `state: "not-watching"` / `hasEntry: false`，脚本永远不会执行。
  这是主机限制，不是脚本缺陷——普通桌面不受影响。
- **用 computer-use 驱动画布需要前台交付，而非后台交付。** cua-driver 的默认 `background` 交付
  在针对于 Electron 被遮挡的渲染器时会返回
  `background_unavailable`——但那是第一级台阶，不是一堵墙。cua-driver 返回一个 `escalation: "foreground"` 提示；
  设置 `delivery_mode: "foreground"`（搭配 `bring_to_front`），它的 X11 XTest
  路径（`x11_xtest_fg`）的点击就能落地——这能关闭 "Run Script" 确认
  对话框，并点击画布。Cua 团队是在这个确切的 v1.11.0
  AppImage（Linux/X11）上验证的。不要得出“Electron 拒绝合成点击”的结论
  然后在后台模式下放弃——要向上切换到前台。（真正的产品路径仍然是
  `/exec`，而非点击；此注记是为了 computer-use 驱动的测试。）

模式：

```js
export default function ({ editor, helpers, signal }) {
  // 1. 幂等地构建按钮；给每个按钮打上 meta 标记，以便处理程序能找到它们。
  //    给按钮一个可见标签 AND 一个 meta.action。
  // 2. 用 PAGE 坐标对按钮边界做 pointer_down 命中测试：
  const inside = (b, p) => p.x >= b.x && p.x <= b.x + b.w && p.y >= b.y && p.y <= b.y + b.h
  function onEvent(info) {
    if (!info || info.name !== 'pointer_down') return
    let p = null
    try { if (info.point && editor.screenToPage) p = editor.screenToPage(info.point) } catch {}
    p = p ?? editor.inputs?.currentPagePoint
    if (!p) return
    const hit = editor.getCurrentPageShapes().find(
      (s) => s.meta?.ui === 'button' &&
        inside({ x: s.x, y: s.y, w: s.props.w, h: s.props.h }, p)
    )
    if (hit) runAction(hit.meta.action)   // 变更状态；将其存储到形状的 meta 中
  }
  editor.on('event', onEvent)
  signal.addEventListener('abort', () => editor.off('event', onEvent))  // 必须执行
}
```

- 通过 `meta`（或经由 `helpers.richTextToPlainText` 的可见标签）来查找按钮，
  而不是靠硬编码坐标。
- **同一个脚本同时拥有构建和读取。** 如果形状是由一条代码路径创建的
  （带 `meta.action: 'inc'`），而处理程序读取的是另一套约定
  （`meta.action === 'PLUS'`），点击就会悄无声息地什么也不做。要让创建按钮的脚本
  与处理它们的脚本是同一个，或者交付空白画布以便脚本从头构建它们——绝不要把不匹配的形状
  预烘焙进文件的 db。
- 把应用状态保存在某个形状的 `meta` 中（例如 `meta.count`），并将其渲染为该
  形状的 `richText` 标签，这样它才能在保存后存续并可读取以用于验证。
- **在 `signal` abort 时分离监听器。** 省略这一步骤不是无关紧要的表面问题：在下一次保存时，
  旧的 `onEvent` 会与新的一起保持挂载，所以每次点击
  都会触发两次，计数器会跳 2 而不是 1。
- 对于连续运动，使用 `editor.on('tick', fn)`；对于带附件的移动锚点，使用
  `helpers.onShapeTranslate(id, fn, { signal })`。

### 发布自运行的脚本化 `.tldraw`

一个 `.tldraw` 是 `metadata.json` + `session.json` + `db.sqlite` + `assets/` +
`script/` 的 zip 包（只有这些条目可被打包）。要让脚本在无
"This document contains a script → Run Script" 确认对话框的情况下自动运行：

- `metadata.json` 必须携带 `script` 清单：`{ "sha256": "<digest>" }`，其中
  digest 是对每个已排序的 `script/` 路径按 `` `${path}\0${sha256hex(bytes)}\n` `` 计算出的 `sha256`。
  不匹配将被视为被篡改并拒绝。
- 通过将 digest 添加到 `~/.tldraw/script-trust.json`
  （`{ "trusted": ["<digest>"] }`，或 `$TLDRAW_SCRIPT_TRUST`）预先信任它。当
  `isScriptTrusted(digest)` 为 true 时，应用会跳过确认。

## 流程

1. 从 `server.json` 读取当前的 token/端口。用 `api.getFocusedDoc()`（或 `api.getDocs()`）
   找到目标文档；如果打开了多个文档，请显式指定其名称。
2. 对于布局/生成，使用 `/exec`。对于持久行为，通过 `/script-workspace` 编辑
   `script/main.js`。
3. 使脚本具备幂等性：用 `helpers.createShapeIfMissing` 和稳定的 `createShapeId('name')`
   id 创建持久形状。脚本会在每次加载时重新运行。
4. 将脚本自有的写入排除在用户的撤销栈之外：
   `editor.run(fn, { history: 'ignore' })`（或 `helpers.translateShapes`，它已经如此处理）。
5. 对于响应式行为，使用 `editor.store.listen(cb)`，并在 `signal` 中止时拆除它。
   对于交互，使用 `editor.on('event', h)`（在页面坐标中命中测试 `pointer_down`）；
   对于动画，使用 `editor.on('tick', h)`。
6. 对于单个移动锚点 + 已附加的内部部分，优先使用
   `helpers.onShapeTranslate(anchorId, fn, { signal })` 而非宽泛的 store
   监听器——宽泛的监听器可能会将你自己的写入变成反馈循环。

## 形状属性（依据 tldraw SDK v5 schema 校验）

`editor.createShape` / `createShapeIfMissing` 接受部分属性（shape utils
会填充默认值）。当为文件快照构建**原始记录**时，以下每个属性
都是必需的（运行 `scripts/validate_shapes.mjs`）：

| 形状 | 必需属性 |
|-------|----------------|
| `note`  | `richText`、`color`、`labelColor`、`size`、`font`、`align`、`verticalAlign`、`growY`、`fontSizeAdjustment`、`url`、`scale`、`textLastEditedBy` |
| `text`  | `richText`、`color`、`size`、`font`、`textAlign`、`w`、`scale`、`autoSize` |
| `frame` | `w`、`h`、`name`、`color` |
| `geo`   | `geo`、`w`、`h`、`color`、`fill`、`richText`（+ dash/size/等，有默认值） |

`richText` 必须是 `toRichText('...')`——裸字符串会被拒绝。`color` 枚举：
`black grey light-violet violet blue light-blue yellow orange green light-green
light-red red white`。`font` 枚举：`draw sans serif mono`。

## 陷阱

- **`store.listen` 在各提交后的下一个 tick 触发，而非同步触发。** 如果你
  写入一个形状后立即读取状态，期望监听器已经运行，那么它还没有。已在
  实盘验证：回合内读取显示 0 次触发；经过一次 `setTimeout`
  tick 后显示 1 次。这也是应用注释中 `editor.dispatch` 为异步的同一原因——在验证前
  等待一个 tick。
- **是 `ctx`，不是全局变量。** 入口是 `export default function ({ editor,
  helpers, signal })`。在文档脚本中没有裸的 `editor` 全局变量。
  `createShapeId` / `toRichText` / `Vec` 来自 `import ... from 'tldraw'`。
- **是 `richText`，不是 `text`。** text/note/geo 标签使用 `richText: toRichText(s)`。
- **原始记录需要每个属性；`createShape` 不需要。** 在应用内只传入你关心的
  属性；手工构建的 `.tldraw` 快照需要完整集合（见表格）。
- **脚本会在每次加载时重新运行——需幂等。** 使用带有稳定 id 的
  `createShapeIfMissing`，否则你会重复内容并覆盖用户编辑。
- **在 `signal` 上清理。** 对每个 `store.listen` / `editor.on` / `setInterval`
  使用 `signal.addEventListener('abort', () => stop())`；该 signal 会在
  重新运行之前以及关闭时触发。
- **将脚本写入排除在撤销之外：** `editor.run(fn, { history: 'ignore' })`。
- **`editor.on('tick')` 在窗口隐藏时会暂停**（它是一个 RAF 循环）；
  `setInterval` 会持续触发，但 Electron 在后台会将其节流至约 1 次/秒。
- **API 需要** 来自 `server.json` 的 bearer token；端口可能为非默认值
  （`server.listen(0)` 会选取一个）——始终读取该文件，不要硬编码 `7236`。
- **只能导入 `tldraw` / `react` / `react-dom`**——不是 Node 项目。

## 验证

- **形状 schema（离线，无需应用）：** `node scripts/validate_shapes.mjs`——构建
  真实的 tldraw schema 并校验 note/text/frame。通过会打印 `3/3`。
- **实时画布编辑：** 在 `/exec` 之后，用 `/api/search` →
  `api.getShapes(docId)`（返回 `{ page, viewport, shapes }`）回读，并用
  `api.getBindings(docId)`（数组）回读。确认预期的形状/绑定存在。获取
  `api.getScreenshot(docId)`（返回 `{ filePath, ... }`）并用 `vision_analyze`
  检查 PNG/JPEG。
- **持久脚本已应用：** `GET /api/doc/:id/script-status`。成功为
  `state: "applied"`（`currentDiskDigest === lastAppliedDigest === manifestSha256`，
  `pendingApply === false`，`lastApplyError === null`）。如果短暂重试后它仍保持
  `"pending"`，请报告该状态，而非声称成功；`"error"` 表示
  应用失败——请读取 `errorLogPath`。
