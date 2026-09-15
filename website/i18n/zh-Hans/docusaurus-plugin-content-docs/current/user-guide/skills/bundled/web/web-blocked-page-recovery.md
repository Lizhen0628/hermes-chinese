---
title: "被拦截页面恢复 — 当抓取失败时使用：403/429、付费墙、WAF、机器人墙"
sidebar_label: "被拦截页面恢复"
description: "当抓取失败时使用：403/429、付费墙、WAF、机器人墙"
---

{/* 此页面由 website/scripts/generate-skill-docs.py 根据该技能的 SKILL.md 自动生成。请编辑源 SKILL.md，而非此页面。 */}

# 被拦截页面恢复

当抓取失败时使用：403/429、付费墙、WAF、机器人墙。

## 技能元数据

| | |
|---|---|
| Source | 内置（默认安装） |
| Path | `skills/web\blocked-page-recovery` |
| Version | `1.0.0` |
| Author | Hermes Agent |
| License | MIT |
| Platforms | linux, macos, windows |
| Tags | `Research`、`Archives`、`Wayback`、`Paywall`、`WAF`、`Fallback` |
| Related skills | [`grounded-citations`](/docs/user-guide/skills/bundled/research/research-grounded-citations) |

## 参考：完整 SKILL.md

:::info
以下是 Hermes 在触发此技能时加载的完整技能定义。当技能处于激活状态时，这是智能体看到的指令内容。
:::

# 被拦截页面恢复

当某个页面无法抓取时——403/429、Cloudflare 的“Just a moment...”、付费墙，
或机器人检测过渡页——不要放弃，也不要在同一个 URL 上反复尝试。第三方服务
往往保留了该页面的**副本**。沿着下面这个阶梯逐个尝试，从成本最低的开始。

## 阶梯

```
1. Wayback Machine  — archive.org 的 "available" API  (快照 + 时间戳)
2. archive.today    — 域名轮换: archive.ph → .md → .li → .is
3. Jina Reader      — 仅当设置了 JINA_API_KEY 时  (服务器端实时渲染)
4. API优先转向      — 在同一主机上查找 /api/, /graphql, .json, 或 RSS
5. 真实浏览器       — 将浏览器工具作为最后、成本最高的手段
```

用随附的脚本一次性执行：

```bash
python3 scripts/recover_page.py "https://example.com/blocked-article" --json
```

脚本按顺序尝试每一条路径，校验每个响应体（见下文“虚假的成功”），并
打印第一个真正的命中结果及其来源。

## 来源纪律（不可妥协）

每份恢复的副本都带有来源信息，你在引用时 MUST 保留：

| 路径 | 来源 | 如何引用 |
|-------|-----------|-------------|
| Wayback / archive.today | `snapshot` | 引用时 WITH 快照日期：“以 2026-08-06 归档时的版本”。绝不可将快照当作实时页面呈现——它可能已过时。 |
| Jina Reader | `live` | 对实时页面的服务器端重新渲染；正常引用。 |
| 实时抓取 / 浏览器 | `live` | 正常引用。 |

如果用户需要*当前*数据（价格、可用性、突发新闻），快照只是背景，不是答案
——要明确说明这一点，并注明其时效。

## 手动路径

### 1. Wayback Machine（来源最佳，优先尝试）

```bash
# Discovery: returns closest snapshot URL + timestamp as JSON
curl -sL "https://archive.org/wayback/available?url={URL}"
# Then fetch archived_snapshots.closest.url
```

如需枚举大量快照（或恢复已删除的页面），可使用 CDX 索引：

```bash
curl -sL "https://web.archive.org/cdx/search/cdx?url={URL}&output=json&limit=10"
```

CDX 在高负载时会间歇性返回 503——若出现这种情况，改回使用 `available`
API；不要反复狂刷它。

适用于：任何被公开爬取的 URL。不适用于：被 robots 屏蔽的站点、
从未被爬取的 URL、纯 JS SPA（快照不会进行渲染）。

### 2. archive.today（付费墙、已删除内容）

由用户提交的存档——常常包含 Wayback 所缺少的付费墙新闻文章。
会激进地限流（429）并轮换域名，所以需要迭代：

```bash
for d in archive.ph archive.md archive.li archive.is; do
  curl -sL --max-time 20 "https://$d/newest/{URL}" -o /tmp/page.html \
    -w "%{http_code}" && break
done
```

**要校验响应体，而非状态码**——429 仍会返回数 KB 的限流 HTML，仅凭大小
检查看起来像是成功。

### 3. Jina Reader（需要 JINA_API_KEY）

`r.jina.ai` 在服务器端用真实浏览器重新渲染实时页面并返回 markdown。
匿名访问已失效（401 → Turnstile）；必须有密钥：

```bash
curl -s -H "Authorization: Bearer $JINA_API_KEY" "https://r.jina.ai/{URL}"
```

能处理存档无法应对的 JS SPA。当环境变量未设置时，完全跳过此路径。

### 4. API 优先转向

WAF 对 HTML 表面的防护远比对背后的数据端点更为激进。在某个站点上被拦截
2-3 次后，停止与 HTML 缠斗，转而查找：

- 页面 URL 的 `/api/...`、`/graphql` 或 `.json` 变体
- RSS/Atom 订阅源（`/feed`、`/rss`，或在你已恢复的任何副本中的
  `<link rel="alternate">`）
- 站点地图（`/sitemap.xml`），可揭示可能未被限制的规范 URL

## 虚假的成功——会说谎的路径

这些会返回 HTTP 200，并附带看起来合理但并非该页面的响应体。脚本会自动
拒绝它们；你也要手动拒绝：

- **Google Cache 已死**（自 2024 年中期起）。`webcache.googleusercontent.com`
  返回 200 以及数十 KB 内容，但那是带 JS 重定向的 Google Search 过渡页，
  不是缓存。绝不要使用它。
- **AMP 缓存**（`*.cdn.ampproject.org`）大多返回一个约 300 字节的
  `<title>Redirecting</title>` meta-refresh 桩，指回原始（被拦截的）URL。
  把它当作成功会造成抓取循环。
- **限流响应体**：archive.today 的 429 页面是数 KB 的 HTML。要检查目标的
  实际内容（标题词语、预期字符串），而不仅仅是大小。

脚本采用的检测启发式规则：响应体低于各路径的字节下限；目标为原始主机的
meta-refresh/JS 重定向桩；过渡页标题（“Just a moment”、“Redirecting”、
“Google Search”、“Attention Required”）。

## 代理中继：不要用

通用的“web 代理”中继在结构上就是中间人。绝不要通过它们发送 cookie 或
Authorization 头，也不要将它们用于任何用户会依赖的内容——其来源无法验证。
宁可选择存档，它们至少会给副本打上时间戳。
