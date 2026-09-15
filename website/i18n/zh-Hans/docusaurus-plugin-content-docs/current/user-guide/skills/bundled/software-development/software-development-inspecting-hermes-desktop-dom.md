---
title: "检查 Hermes Desktop DOM — 通过 CDP 读取实时 Hermes 桌面 DOM/CSS"
sidebar_label: "检查 Hermes Desktop DOM"
description: "通过 CDP 读取实时 Hermes 桌面 DOM/CSS"
---

{/* 本页面由 website/scripts/generate-skill-docs.py 根据该技能的 SKILL.md 自动生成。请编辑源 SKILL.md，而非此页面。 */}

# 检查 Hermes Desktop DOM

通过 CDP 读取实时 Hermes 桌面 DOM/CSS。

## 技能元数据

| | |
|---|---|
| 来源 | 内置（默认安装） |
| 路径 | `skills/software-development\inspecting-hermes-desktop-dom` |
| 版本 | `1.0.0` |
| 作者 | Hermes Agent |
| 许可证 | MIT |
| 平台 | linux、macos、windows |
| 标签 | `desktop`、`electron`、`cdp`、`dom`、`ui-verification`、`self-inspection` |
| 相关技能 | [`node-inspect-debugger`](/docs/user-guide/skills/bundled/software-development/software-development-node-inspect-debugger)、[`systematic-debugging`](/docs/user-guide/skills/bundled/software-development/software-development-systematic-debugging)、[`dogfood`](/docs/user-guide/skills/bundled/software-development/software-development-dogfood) |

## 参考：完整 SKILL.md

:::info
以下是 Hermes 在此技能被触发时加载的完整技能定义。当该技能处于激活状态时，这就是智能体所看到的指令。
:::

# 检查实时的 Hermes 桌面 DOM

## 概述

当你在开发 `apps/desktop`，而用户正在运行同一个应用（`hgui` / `npm run dev`）时，你可以读取他们正在查看的窗口的**实时渲染 DOM**——计算样式、几何布局、实际生效的 CSS 规则、控制台输出——而不是根据 `.tsx` 去推测结果却猜错。

开发服务器运行时会在 `127.0.0.1:9222` 上自动打开一个 Chrome DevTools Protocol 端口。渲染进程是一个 Chromium 页面，因此 DevTools 能读到的一切，脚本也能读到。

**这不能替代亲自查看。** CDP 回答的是*事实性*问题（“计算后的 padding 是多少”、“这个元素渲染了吗”、“哪个选择器匹配”）。它无法告诉你结果好不好看。色彩平衡、间距手感，以及“这丑不丑”，仍然需要用户的眼睛或截图来判断。事实用 CDP 回答；美观交给用户。

## 何时使用

- 验证某个 UI 改动确实在运行中的应用里生效了
- “为什么这个元素还是 X？”——在编辑任何东西之前先找到实际优胜的规则
- 为你即将改动的组件定位一个稳定的选择器
- 在真实节点上检查某个设计令牌的计算值
- 读取用户提到但无法复制出来的渲染进程控制台错误

**不要用于：**性能剖析或堆内存分析（`node-inspect-debugger`、`debugging-hermes-desktop`），或任何真正要问的是“这看起来对不对”的场景。

## 端口

对于任何开发服务器运行，它都会在 `127.0.0.1:9222` 上打开。它仅在两种情况下关闭（`apps/desktop/electron/dev-cdp.ts`）：

- **打包版本**——始终关闭，且没有环境变量值可以覆盖这一点；
- **没有 `HERMES_DESKTOP_DEV_SERVER`**——针对 `dist/` 运行未打包的 `electron .` 正是打包应用进行冒烟测试的方式，因此它的行为与打包应用一致。

`HERMES_DESKTOP_CDP_PORT` 可以改端口（`=9333`）或禁用它（`=off`）。

在做其他任何事之前先检查：

```bash
curl -s --max-time 3 http://127.0.0.1:${HERMES_DESKTOP_CDP_PORT:-9222}/json/version
```

返回空 → 没有端口。不要默默猜测另一个端口。

**绝不要为了让端口出现而重启用户的应用。**那会毁掉他们的会话和状态。改为启动你自己的隔离实例（见下文）。

## 读取 DOM

`apps/desktop/scripts/eval.mjs` 是一行命令的工具：

```bash
cd apps/desktop
node scripts/eval.mjs "document.querySelectorAll('[data-slot]').length"
```

对于多步骤的工作，使用共享客户端——它具备目标发现和感知 Promise 的 eval：

```js
import { CDP, SELECTORS } from './scripts/perf/lib/cdp.mjs'

const cdp = await CDP.connect({ port: 9222, match: '5174' })
const out = await cdp.eval(`JSON.stringify({
  radius: getComputedStyle(document.documentElement).getPropertyValue('--radius-scalar').trim(),
  composer: !!document.querySelector('[data-slot="composer-rich-input"]')
})`)
cdp.close()
```

`scripts/perf/lib/cdp.mjs` 中的 `SELECTORS` 保存了稳定的 `data-slot` 钩子（编辑器、线程视口、助手消息、轮次配对、配置档侧栏）。优先使用它们，而不是自己发明 `querySelector`——当组件迁移时它们会作为一个整体一并更新。

## 此方法最擅长回答的问题：哪个规则成功了？

因为样式“没生效”而去编辑每一个调用点是典型的浪费。先读取真实节点：

```js
const el = document.querySelector('[data-slot="aui_assistant-message-root"] a')
JSON.stringify({
  ownClasses: el.className,
  weight: getComputedStyle(el).fontWeight,
  parents: (() => {
    const out = []
    let n = el
    while ((n = n.parentElement) && out.length < 6) out.push(n.className)
    return out
  })()
})
```

如果该节点自身不带任何 class，那么这个值是**继承来的**——到处扫荡调用点是修不好它的，你需要的是祖先规则。插件样式表（例如 `@tailwindcss/typography` 的 `prose a { font-weight: 500 }`）通常能胜过某个工具类；要在共享 class 上覆盖，而不是在每个使用处覆盖。

## 你自己的隔离实例

当没有端口，或者你绝不能打扰用户的窗口时：

```bash
cd apps/desktop
HERMES_HOME=/tmp/cdp-probe-home \
HERMES_DESKTOP_DEV_SERVER=http://127.0.0.1:5174 \
HERMES_DESKTOP_CDP_PORT=9333 \
  npx electron . --user-data-dir=/tmp/cdp-probe-userdata
```

单独的 `--user-data-dir` 避开了 Electron 的单实例锁，因此它不会与正在运行的 `hgui` 冲突；单独的 `HERMES_HOME` 让它远离真实会话。出于同样的原因，选择一个不是 9222 的端口。在后台运行它，并在完成后杀死它。

`npm run perf:serve` 做了同样的事，并内置了一个临时 `HERMES_HOME`，如果你还想要性能测试工具的话。

## 坑

- **绝不要为了让出什么东西而去杀死用户的开发服务器或应用。**在服务中途杀进程会摧毁 Chromium 的套接字池，由此产生的 `ERR_NETWORK_CHANGED` 会被归咎于你刚改动的任何东西。
- **一次性的 `HERMES_HOME` 没有后端。**应用会为 `hermes:api` 记录 `ECONNREFUSED`，并可能会自行退出。渲染进程仍会挂载，DOM 仍可读——要迅速读取，别把自行退出的探针误当成端口坏了。Chromium 在绑定时会记录 `DevTools listening on ws://127.0.0.1:<port>/…`；那一行就是端口已打开的证明。
- **要轮询，不要只探测一次。**一个刚启动的应用需要一两秒端口才会应答。
- **绝不要转储整个 DOM。**桌面会渲染数百个节点，`outerHTML` 会淹没你的上下文。在被求值的表达式内部投影为一个小的 JSON 对象。
- **向 `CDP.connect` 传入 `match`。**不传的话，你可能附着到宠物悬浮层、快速输入窗口，或某个 devtools 目标，而不是主窗口。
- **`cdp.eval` 返回的是值本身；原生的 `Runtime.evaluate` 会把它双重嵌套**（`.result.result.value`）。使用封装。
- **在本仓库中，`import.meta.env.DEV` 在 `vite dev` 下为 `true`。**`apps/desktop/scripts/profile-typing-lag.md` 中声称并非如此的注记已过时。
