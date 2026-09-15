---
title: "检查 Hermes Desktop Dom — 通过 CDP 读取实时 Hermes 桌面 DOM/CSS"
sidebar_label: "检查 Hermes Desktop Dom"
description: "通过 CDP 读取实时 Hermes 桌面 DOM/CSS"
---

{/* This page is auto-generated from the skill's SKILL.md by website/scripts/generate-skill-docs.py. Edit the source SKILL.md, not this page. */}

# 检查 Hermes Desktop Dom

通过 CDP 读取实时 Hermes 桌面 DOM/CSS。

## 技能元数据

| | |
|---|---|
| Source | Bundled (installed by default) |
| Path | `skills/software-development\inspecting-hermes-desktop-dom` |
| Version | `1.0.0` |
| Author | Hermes Agent |
| License | MIT |
| Platforms | linux, macos, windows |
| Tags | `desktop`, `electron`, `cdp`, `dom`, `ui-verification`, `self-inspection` |
| Related skills | [`node-inspect-debugger`](/docs/user-guide/skills/bundled/software-development/software-development-node-inspect-debugger), [`systematic-debugging`](/docs/user-guide/skills/bundled/software-development/software-development-systematic-debugging), [`dogfood`](/docs/user-guide/skills/bundled/software-development/software-development-dogfood) |

## 参考：完整 SKILL.md

:::info
以下是 Hermes 在触发此技能时加载的完整技能定义。这就是技能激活时智能体看到的指令内容。
:::

# 检查实时 Hermes 桌面 DOM

## 概述

当你正在开发 `apps/desktop`，而用户正在运行同一个应用（`hgui` / `npm run dev`）时，你可以读取他们看到的那个窗口的**实时渲染 DOM** —— 计算样式、几何布局、到底是哪条 CSS 规则胜出、控制台输出 —— 而不是从 `.tsx` 中推断然后搞错。

开发服务器运行时会在 `127.0.0.1:9222` 上自动打开一个 Chrome DevTools Protocol 端口。渲染进程是一个 Chromium 页面，所以 DevTools 能读取的一切，脚本也能读取。

**这不能替代亲自去看。** CDP 回答的是*事实性*问题（"计算出的 padding 是多少"、"这个元素渲染了吗"、"哪个选择器匹配上了"）。它无法告诉你结果好不好看。色彩平衡、间距手感，以及"这是不是很丑"仍然需要用户的眼睛或截图。用 CDP 回答事实；把审美交给用户。

## 何时使用

- 验证某项 UI 改动是否真的在运行中的应用里生效了
- "为什么这个元素还是 X？" —— 在编辑任何东西之前先找出胜出的规则
- 为你即将修改的组件定位一个稳定的选择器
- 在真实节点上检查设计令牌的计算值
- 读取用户提到但无法复制出来的渲染进程控制台错误

**不要用于：** 性能剖析或堆内存工作（`node-inspect-debugger`、`debugging-hermes-desktop`），或者当真正的问题是"这看起来对吗"的时候。

## 端口

对任何开发服务器运行，端口都在 `127.0.0.1:9222` 上打开。只有两种情况会关闭（`apps/desktop/electron/dev-cdp.ts`）：

- **打包构建** —— 始终关闭，且没有任何环境变量值可以覆盖；
- **没有 `HERMES_DESKTOP_DEV_SERVER`** —— 用未打包的 `electron .` 对着 `dist/` 运行是打包应用冒烟测试的方式，所以它的行为跟打包版一样。

`HERMES_DESKTOP_CDP_PORT` 可以移动端口（`=9333`）或禁用它（`=off`）。

在做任何事之前先检查：

```bash
curl -s --max-time 3 http://127.0.0.1:${HERMES_DESKTOP_CDP_PORT:-9222}/json/version
```

输出为空 → 没有端口。不要悄悄猜测另一个端口。

**绝不要为了获取端口而重启用户的应用。** 那会破坏他们的会话和状态。请改为启动你自己的隔离实例（见下文）。

## 读取 DOM

`apps/desktop/scripts/eval.mjs` 是一行命令：

```bash
cd apps/desktop
node scripts/eval.mjs "document.querySelectorAll('[data-slot]').length"
```

对于多步骤工作，使用共享客户端 —— 它具有目标发现和 promise 感知的 eval：

```js
import { CDP, SELECTORS } from './scripts/perf/lib/cdp.mjs'

const cdp = await CDP.connect({ port: 9222, match: '5174' })
const out = await cdp.eval(`JSON.stringify({
  radius: getComputedStyle(document.documentElement).getPropertyValue('--radius-scalar').trim(),
  composer: !!document.querySelector('[data-slot="composer-rich-input"]')
})`)
cdp.close()
```

`scripts/perf/lib/cdp.mjs` 中的 `SELECTORS` 保存了稳定的 `data-slot` 钩子（composer、线程视口、助手消息、轮次对、配置档侧栏）。优先使用它们，而不是自己发明 `querySelector` —— 当组件移动时它们作为一个整体一起更新。

## 这个工具最擅长回答的问题：哪条规则胜出了？

仅仅因为某个样式"没生效"就去编辑每个调用点，是典型的浪费。先读取真实节点：

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

如果该节点本身没有携带任何类名，那么该值是**继承**来的 —— 到处扫调用点是修不好的，你需要的是祖先节点的规则。插件样式表（例如 `@tailwindcss/typography` 的 `prose a { font-weight: 500 }`）经常击败工具类；应在共享类上覆盖，而不是在每个使用处覆盖。

## 你自己的隔离实例

当端口不存在，或者你绝不能打扰用户的窗口时：

```bash
cd apps/desktop
HERMES_HOME=/tmp/cdp-probe-home \
HERMES_DESKTOP_DEV_SERVER=http://127.0.0.1:5174 \
HERMES_DESKTOP_CDP_PORT=9333 \
  npx electron . --user-data-dir=/tmp/cdp-probe-userdata
```

独立的 `--user-data-dir` 避开了 Electron 的单实例锁，所以它不会与正在运行的 `hgui` 冲突；独立的 `HERMES_HOME` 让它远离真实会话。出于同样的原因，选择一个不是 9222 的端口。在后台运行它，完成后杀掉它。

如果你还想要性能测试工具，`npm run perf:serve` 做了同样的事，并内置了一个临时 `HERMES_HOME`。

## 陷阱

- **绝不要为了"释放"任何东西而杀掉用户的开发服务器或应用。** 服务中途的杀进程会摧毁 Chromium 的套接字池，由此产生的 `ERR_NETWORK_CHANGED` 会被归咎于你刚改的任何东西。
- **一次性的 `HERMES_HOME` 没有后端。** 应用会为 `hermes:api` 记录 `ECONNREFUSED`，并可能自行退出。渲染进程仍然会挂载，DOM 仍然可读 —— 及时读取，不要把自行退出的探测实例误认为是端口坏了。Chromium 在绑定时会记录 `DevTools listening on ws://127.0.0.1:<port>/…`；那行日志就是端口已打开的证明。
- **轮询，而不是只探测一次。** 刚启动的应用需要一两秒端口才会响应。
- **绝不要转储整个 DOM。** 桌面渲染数百个节点，`outerHTML` 会淹没你的上下文。在求值表达式中投影成一个小 JSON 对象。
- **给 `CDP.connect` 传 `match`。** 没有它，你可能会连到宠物浮层、快速输入窗口或 devtools 目标，而不是主窗口。
- **`cdp.eval` 直接返回值；裸的 `Runtime.evaluate` 会双层嵌套它**（`.result.result.value`）。使用封装版本。
- **在这个仓库中，`vite dev` 下 `import.meta.env.DEV` 是 `true`。** `apps/desktop/scripts/profile-typing-lag.md` 中声称相反的注释是过时的。
