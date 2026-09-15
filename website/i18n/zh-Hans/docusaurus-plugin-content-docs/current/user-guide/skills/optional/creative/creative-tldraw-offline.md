---
title: "Tldraw 离线 — 用智能体驱动和编写 tldraw 离线画布脚本"
sidebar_label: "Tldraw 离线"
description: "用智能体驱动和编写 tldraw 离线画布脚本"
---

{/* 本页面由 website/scripts/generate-skill-docs.py 根据该技能的 SKILL.md 自动生成。请编辑源 SKILL.md，而非本页面。 */}

# Tldraw 离线

用智能体驱动和编写 tldraw 离线画布脚本。

## 技能元数据

| | |
|---|---|
| 来源 | 可选 — 通过 `hermes skills install official/creative/tldraw-offline` 安装 |
| 路径 | `optional-skills/creative\tldraw-offline` |
| 版本 | `1.0.0` |
| 作者 | Teknium + Hermes Agent |
| 许可证 | MIT |
| 平台 | linux、macos、windows |
| 标签 | `tldraw`、`canvas`、`whiteboard`、`document-script`、`diagramming` |

## 参考：完整 SKILL.md

:::info
以下为 Hermes 在触发该技能时加载的完整技能定义。这就是技能激活时智能体看到的操作说明。
:::

# tldraw 离线技能

配合 tldraw 离线桌面应用（offline.tldraw.com）工作：读取当前打开的
画布，进行编辑，并编写**文档脚本**——嵌入 `.tldraw` 文件、在加载时运行的
JavaScript，从而赋予文件持久行为。该应用运行一个**本地 HTTP API**
（默认为 `localhost:7236`），编码智能体可从终端用普通 `curl` 驱动它——
这正是该应用自家首页演示（Codex 实时编辑画布）的工作方式。智能体不使用
计算机操作 / GUI 点击，也不直接手工编辑 `.tldraw` 文件。工作期间注意
始终保持 tldraw 离线处于打开状态。

## 何时使用

- 用户已打开 tldraw 离线，并要求你构建或修改画布（图表、线框图、
  布局）。
- 你想通过嵌入的文档脚本为绘图添加持久行为（响应式图形、可交互
  按钮、动画、连接逻辑）。

不要用手工摆放图形来模仿绘图——编写生成这些图形的代码。
智能体编写画布脚本的能力远胜于在画布上亲手绘制。

## 前提条件

- **tldraw 离线已安装并运行**，且打开了某个文档。发布版本：
  https://github.com/tldraw/tldraw-offline/releases/latest（macOS DMG、Windows
  x64/Arm64、Linux `x86_64`/`arm64` AppImage 或 amd64/arm64 `.deb`）。
- **已在应用中安装智能体技能**：`Develop → Install Agent Skills`。
  应用会将自己的 tldraw 技能写入 `~/.codex/skills/`、`~/.claude/skills/`、
  `~/.cursor/skills/` 和 `~/.gemini/skills/`——教会相应智能体下述 `curl`
  操作配方。（本 Hermes 技能为 Hermes 复制了该指引。）
- **本地控制 API。** 启动时，应用会将 `server.json` 写入其配置
  目录（Linux `~/.config/tldraw/`，macOS `~/Library/Application Support/tldraw/`，
  Windows `%APPDATA%\tldraw\`），其中包含 `port`（默认 `7236`）、bearer `token`、
  `pid` 和 `startedAt`。除 `GET /` 外的每个请求都需要
  `Authorization: Bearer <token>`。正常退出会删除 `server.json`；若它存在
  但端口无响应，说明应用非正常退出——视为未运行。
- **在每次 shell 调用时都要重新读取端口 + token。** 每次终端调用都是全新的
  shell，因此通过 `export` 设置的 token 不会持续——"导出一次反复使用"会发送
  空 token 并得到 401。在每次调用开头内联读取两者：
  `PORT=$(jq -r .port <server.json>); TOKEN=$(jq -r .token <server.json>)`。
- 本地编辑无需账号或网络。

## 如何运行

两种截然不同的工作流。根据改动是否需要挺过重新加载来选择。

**A. 一次性画布编辑（`/exec`）**——布局、生成图形、清理。这是
实时编辑，而非已保存的脚本：

```bash
BASE=http://localhost:7236
TOKEN=$(python -c "import json;print(json.load(open('$HOME/.config/tldraw/server.json'))['token'])")
# 查找当前聚焦的文档 id
DOC=$(curl -s "$BASE/api/search" -X POST -H 'content-type: application/json' \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"code":"return (await api.getFocusedDoc()).id"}' | python -c "import sys,json;print(json.load(sys.stdin)['result'])")
# 在作用域中带有活动的 `editor` + `helpers` 的情况下运行代码
curl -s "$BASE/api/doc/$DOC/exec" -X POST -H 'content-type: application/json' \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"code":"const {createShapeId,toRichText}=await import(\"tldraw\"); editor.createShape({id:createShapeId(),type:\"geo\",x:0,y:0,props:{geo:\"rectangle\",w:200,h:100,color:\"blue\",fill:\"solid\",richText:toRichText(\"hello\")}}); return editor.getCurrentPageShapes().length"}'
```

**B. 持久行为（`script/main.js`）**——必须挺过重新加载的响应式 / 可交互
逻辑。编辑磁盘上的文件；应用的监视器会应用它：

```bash
# 获取文档对应的实时脚本文件路径
curl -s "$BASE/api/doc/$DOC/script-workspace" -X POST \
  -H "Authorization: Bearer $TOKEN"          # -> result.mainJsPath, result.isDefaultScript
# 用 read_file / patch / write_file 编辑 result.mainJsPath（见 scripts/main.js）
# 然后确认监视器已应用它：
curl -s "$BASE/api/doc/$DOC/script-status" -H "Authorization: Bearer $TOKEN"
```

开箱即可改编的文档脚本是 `scripts/main.js`。

## 快速参考

文档与脚本的契约（已对照应用内置的 `script-context.d.ts` 校验）：

```js
import { createShapeId, toRichText } from 'tldraw'   // 基础组件：用 import 引入，而非全局变量

export default function ({ editor, helpers, signal }) {
  editor.run(() => {                                 // 批处理 = 一次撤销步骤
    helpers.createShapeIfMissing({                   // 幂等元素
      id: createShapeId('node-1'), type: 'geo', x: 0, y: 0,
      props: { geo: 'rectangle', w: 200, h: 100, richText: toRichText('hi') },
    })
  })

  const stop = editor.store.listen(() => { /* 响应 */ })  // 在提交之后触发 tick
  signal.addEventListener('abort', () => stop())           // 重跑/关闭时必需的清理
}
```

- `ctx.editor` — 实时的 `Editor`（`createShape`、`updateShape`、`deleteShapes`、
  `getCurrentPageShapes`、`getShape`、`getBindingsFromShape`、`zoomToFit`、
  `on('tick'|'event', fn)`、`run(fn, { history: 'ignore' })`）。
- `ctx.helpers` — `createShapeIfMissing`、`createShapesIfMissing`、
  `createArrowBetweenShapes(from, to, { arrowheadEnd })`、`translateShapes`、
  `onShapeTranslate(id, fn, { signal })`、`richTextToPlainText`、`boxShapes`、
  `getLints`。
- `ctx.signal` — `AbortSignal`；把每个监听器/定时器的拆除工作都挂到它上面。
- `config.js`（独立文件）用于注册自定义形状/工具/组件工具，并在挂载前运行；
  `main.js` 针对已挂载的编辑器运行，并在保存时重跑。

## 交互式 UI（驱动状态的可点击按钮）

绘制出的形状可以表现得像真正的应用——这是静态白板做不到的事。
完整示例：`scripts/counter.js`（一个数字显示 + MINUS/RESET/PLUS 按钮）。

验证边界——在断言交互有效或无效之前请先阅读此节。
应用自带的智能体操作手册说，要通过 `/exec` 用“一次模拟点击和一次状态读取”来验证可点击
UI 脚本（`editor.dispatch` 一个指针事件，等待一个 tick，读取形状的状态）——
而不是驱动真实鼠标。按此标准，计数器是已验证的：派发的点击使其步进
`0 → 1 → 2 → 1 → 0`。有两点值得记录下来的注意事项：
- **只有应用的文件监视器应用该脚本后，脚本才会运行。** 在 Linux 上，该
  监视器使用 inotify；若主机的 `fs.inotify.max_user_instances` 已耗尽，
  会记录 `inotify_add_watch ... No space left on device`，`script-status` 显示
  `state: "not-watching"` / `hasEntry: false`，而脚本永远不会执行。
  这是主机限制，不是脚本缺陷——普通桌面环境不受影响。
- **用 computer-use 驱动画布需要前台投递，而非后台。** cua-driver 默认的 `background`
  投递在 Electron 被遮挡的渲染器上返回
  `background_unavailable`——但那只
  是第一级阶梯，不是一堵墙。cua-driver 会返回 `escalation: "foreground"` 提示；
  设置 `delivery_mode: "foreground"`（配合 `bring_to_front`），其 X11 XTest
  路径（`x11_xtest_fg`）的点击便能生效——这可以关闭 “Run Script” 同意
  对话框并点击画布。已由 Cua 团队在这个确切的 v1.11.0
  AppImage（Linux/X11）上验证。不要得出 “Electron 拒绝合成点击” 的结论
  并在后台模式下放弃——要升级到前台。（真正的产品路径依然
  是 `/exec`，而非点击；此说明针对的是 computer-use 驱动的测试。）

模式：

```js
export default function ({ editor, helpers, signal }) {
  // 1. 幂等地构建按钮；给每个按钮打上 meta 标签，以便处理函数找到它们。
  //    给按钮一个可见的标签 AND 一个 meta.action。
  // 2. 在页面坐标中把 pointer_down 对按钮边界做命中检测：
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
    if (hit) runAction(hit.meta.action)   // 变更状态；将其存入某形状的 meta
  }
  editor.on('event', onEvent)
  signal.addEventListener('abort', () => editor.off('event', onEvent))  // 必需
}
```

- 通过 `meta`（或通过 `helpers.richTextToPlainText` 的可见标签）来找按钮，
  而非硬编码坐标。
- **一个脚本同时负责构建和读取。** 如果形状由一个代码
  路径创建（带 `meta.action: 'inc'`），而处理函数读的是另一套约定
  （`meta.action === 'PLUS'`），点击就会悄无声息地无效。让处理它们的同一个脚本
  构建按钮，或提供一个空画布让脚本
  从头构建它们——绝不要把不匹配的形状预烘焙进文件的 db。
- 把应用状态保存在形状的 `meta` 中（例如 `meta.count`），并将其渲染为该
  形状的 `richText` 标签，这样它能在保存后保留，且可读以用于验证。
- **在 `signal` abort 时分离监听器。** 跳过这步可不是表面功夫：在
  下一次保存时，旧的 `onEvent` 会和新的一起保留，
  于是每次点击都触发两次，计数器会跳 2 而非 1。
- 若需连续运动，使用 `editor.on('tick', fn)`；若需带附属部件的移动锚点，使用
  `helpers.onShapeTranslate(id, fn, { signal })`。

### 打包一个可自行运行的脚本化 `.tldraw`

`.tldraw` 是一个 zip，包含 `metadata.json` + `session.json` + `db.sqlite` + `assets/`
+ `script/`（只有这些条目可以被打包）。要让脚本自动运行、而不出现
"This document contains a script → Run Script" 同意对话框：

- `metadata.json` 必须带有 `script` 清单：`{ "sha256": "<digest>" }`，其中
  digest 是 `sha256` 对每个排序后的 `script/` 路径按 `` `${path}\0${sha256hex(bytes)}\n` `` 计算得出。
  不匹配会被视为内容被篡改而拒绝。
- 预先信任该 digest，方法是将其加入 `~/.tldraw/script-trust.json`
  （`{ "trusted": ["<digest>"] }`，或使用 `$TLDRAW_SCRIPT_TRUST`）。当
  `isScriptTrusted(digest)` 为 true 时，应用会跳过同意流程。

## 步骤

1. 从 `server.json` 读取当前 token/port。使用
   `api.getFocusedDoc()`（或 `api.getDocs()`）找到目标文档；如果打开了多个，请明确指定名称。
2. 对于布局/生成，使用 `/exec`。对于持久行为，通过 `/script-workspace` 编辑
   `script/main.js`。
3. 让脚本具备幂等性：使用 `helpers.createShapeIfMissing`
   以及稳定的 `createShapeId('name')` id 创建持久形状。脚本会在每次加载时重新运行。
4. 避免脚本写入进入用户的撤销栈：
   `editor.run(fn, { history: 'ignore' })`（或使用 `helpers.translateShapes`，它已经这样做了）。
5. 若要实现响应式，使用 `editor.store.listen(cb)`，并在 `signal` 中止时将其解除。
   若要处理交互，使用 `editor.on('event', h)`（在页面坐标中对 `pointer_down` 做命中测试）；若要处理动画，使用 `editor.on('tick', h)`。
6. 对于单个移动锚点 + 附着其上的内部元素，优先使用
   `helpers.onShapeTranslate(anchorId, fn, { signal })`，而不是宽泛的 store
   监听器——宽泛监听器可能会把你自己的写入变成反馈循环。

## 形状 props（根据 tldraw SDK v5 schema 校验）

`editor.createShape` / `createShapeIfMissing` 接受部分 props（形状工具类
会填充默认值）。当为文件快照构建**原始记录**时，下列每个 prop
都是必需的（运行 `scripts/validate_shapes.mjs`）：

| 形状 | 必需 props |
|-------|----------------|
| `note`  | `richText`, `color`, `labelColor`, `size`, `font`, `align`, `verticalAlign`, `growY`, `fontSizeAdjustment`, `url`, `scale`, `textLastEditedBy` |
| `text`  | `richText`, `color`, `size`, `font`, `textAlign`, `w`, `scale`, `autoSize` |
| `frame` | `w`, `h`, `name`, `color` |
| `geo`   | `geo`, `w`, `h`, `color`, `fill`, `richText`（dash/size/等使用默认值） |

`richText` 必须是 `toRichText('...')`——裸字符串会被拒绝。`color`
枚举：`black grey light-violet violet blue light-blue yellow orange green light-green
light-red red white`。`font` 枚举：`draw sans serif mono`。

## 陷阱

- **`store.listen` 会在提交后的下一个 tick 触发，而不是同步触发。** 如果你
  写入一个形状后立刻读取状态，并期望监听器已经运行，那么它还没有运行。已现场验证：
  在回合内读取显示 0 次触发；经过一个 `setTimeout`
  tick 后显示 1 次。这也是应用注明 `editor.dispatch` 是异步的原因——在验证前先等待
  一个 tick。
- **使用 `ctx`，不是全局变量。** 入口是 `export default function ({ editor,
  helpers, signal })`。在文档脚本中不存在裸的 `editor` 全局变量。
  `createShapeId` / `toRichText` / `Vec` 来自 `import ... from 'tldraw'`。
- **使用 `richText`，不是 `text`。** Text/note/geo 标签使用 `richText: toRichText(s)`。
- **原始记录需要每个 prop；`createShape` 不需要。** 应用内只需传入你关心的
  props；手工构建的 `.tldraw` 快照需要完整集合（见表格）。
- **脚本会在每次加载时重新运行——必须幂等。** 使用带稳定 id 的 `createShapeIfMissing`，
  否则你会复制内容并覆盖用户编辑。
- **在 `signal` 上清理。** 对每个 `store.listen` / `editor.on` / `setInterval` 使用
  `signal.addEventListener('abort', () => stop())`；signal 会在重新运行前
  以及关闭时触发。
- **让脚本写入不进入撤销：** `editor.run(fn, { history: 'ignore' })`。
- **`editor.on('tick')` 在窗口隐藏时会暂停**（它是一个 RAF 循环）；
  `setInterval` 会继续触发，但 Electron 在后台会将其节流到约 1 次/秒。
- **该 API 需要来自 `server.json` 的 bearer token**；port 可能是非默认值
  （`server.listen(0)` 会选择一个）——始终读取该文件，不要硬编码 `7236`。
- **只能 import `tldraw` / `react` / `react-dom`**——它不是一个 Node 项目。

## 验证

- **形状 schema（离线，无需应用）：** `node scripts/validate_shapes.mjs`——构建
  真实的 tldraw schema，并校验 note/text/frame。通过时会打印 `3/3`。
- **实时画布编辑：** 在 `/exec` 之后，使用 `/api/search` →
  `api.getShapes(docId)`（返回 `{ page, viewport, shapes }`）和
  `api.getBindings(docId)`（数组）回读。确认预期的形状/绑定存在。抓取
  `api.getScreenshot(docId)`（返回 `{ filePath, ... }`），并用 `visionKIND_ANALYZE_PLACEHOLDER` 检查 PNG/JPEG。
