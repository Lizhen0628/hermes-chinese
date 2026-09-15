---
title: "被拦截页面恢复 — 通过归档快照与阅读器回退恢复被拦截、付费墙或 WAF 拦截的页面"
sidebar_label: "被拦截页面恢复"
description: "通过归档快照与阅读器回退恢复被拦截、付费墙或 WAF 拦截的页面"
---

{/* 本页面由 website/scripts/generate-skill-docs.py 根据技能的 SKILL.md 自动生成。请编辑源 SKILL.md，而非此页面。 */}

# 被拦截页面恢复

通过归档快照与阅读器回退恢复被拦截、付费墙或 WAF 拦截的页面。当 web_extract 或浏览器遇到 403/429/挑战页面、付费墙或机器人检测插页时使用。

## 技能元数据

| | |
|---|---|
| 来源 | 内置（默认安装） |
| 路径 | `skills/research/blocked-page-recovery` |
| 版本 | `1.0.0` |
| 作者 | Hermes Agent |
| 许可证 | MIT |
| 平台 | linux, macos, windows |
| 标签 | `Research`, `Archives`, `Wayback`, `Paywall`, `WAF`, `Fallback` |
| 相关技能 | [`grounded-citations`](/docs/user-guide/skills/bundled/research/research-grounded-citations) |

## 参考：完整的 SKILL.md

:::info
以下是 Hermes 在此技能被触发时加载的完整技能定义。这就是技能激活后智能体看到的指令内容。
:::

# 被拦截页面恢复

当页面无法抓取时 —— 403/429、Cloudflare 的 "Just a moment..."、付费墙，或机器人检测插页 —— 不要放弃，也不要在同一个 URL 上反复循环。第三方服务通常存有该页面的**副本**。按此阶梯顺序逐一尝试，从成本最低的开始。

## 阶梯

```
1. Wayback Machine  — archive.org 的 "available" API  （快照 + 时间戳）
2. archive.today    — 域名轮换：archive.ph → .md → .li → .is
3. Jina Reader      — 仅在设置了 JINA_API_KEY 时  （服务端实时渲染）
4. API 优先转向     — 在同一主机上查找 /api/、/graphql、.json 或 RSS
5. 真实浏览器       — 作为最后、成本最高的手段使用 browser 工具
```

用本技能附带的脚本一次性运行：

```bash
python3 scripts/recover_page.py "https://example.com/blocked-article" --json
```

脚本会按顺序尝试每条路径，验证每个响应体（见下文的"虚假成功"），并打印出第一个真实命中及其来源。

## 来源纪律（不可协商）

每个恢复的副本都带有来源信息，引用时必须予以保留：

| 路径 | 来源 | 引用方式 |
|-------|-----------|-------------|
| Wayback / archive.today | `snapshot` | 引用时须带上快照日期："as archived 2026-08-06"。绝不可将快照呈现为实时页面 —— 它可能已过时。 |
| Jina Reader | `live` | 对实时页面的服务端重新渲染；按常规引用。 |
| 实时抓取 / 浏览器 | `live` | 按常规引用。 |

如果用户需要*当前*数据（价格、库存、突发新闻），快照只是背景信息，而非答案 —— 应明确说明，并注明其时效。

## 手动路径

### 1. Wayback Machine（最佳来源，优先尝试）

```bash
# 探查：返回最近的快照 URL + 时间戳（JSON 格式）
curl -sL "https://archive.org/wayback/available?url={URL}"
# 然后抓取 archived_snapshots.closest.url
```

若要枚举大量快照（或恢复已删除的页面），使用 CDX 索引：

```bash
curl -sL "https://web.archive.org/cdx/search/cdx?url={URL}&output=json&limit=10"
```

CDX 在负载高时会间歇性返回 503 —— 若遇到，回退到 `available` API；不要反复猛打。

适用情况：任何被公开抓取过的 URL。失效情况：被 robots 屏蔽的站点、从未被抓取的 URL、纯 JS 单页应用（快照不会渲染）。

### 2. archive.today（付费墙、已删除内容）

用户提交的归档 —— 常存有 Wayback 缺失的付费墙新闻文章。会激进地限制频率（429）并轮换域名，因此需遍历：

```bash
for d in archive.ph archive.md archive.li archive.is; do
  curl -sL --max-time 20 "https://$d/newest/{URL}" -o /tmp/page.html \
    -w "%{http_code}" && break
done
```

**验证响应体，而非状态码** —— 429 仍会返回数 KB 的限频 HTML，仅靠大小检查看起来就像成功。

### 3. Jina Reader（需要 JINA_API_KEY）

`r.jina.ai` 在服务端用真实浏览器重新渲染实时页面并返回 markdown。匿名访问已失效（401 → Turnstile）；需要密钥：

```bash
curl -s -H "Authorization: Bearer $JINA_API_KEY" "https://r.jina.ai/{URL}"
```

可处理归档无法应对的 JS 单页应用。当环境变量未设置时，完全跳过此路径。

### 4. API 优先转向

WAF 对 HTML 表面的保护远比其背后的数据端点激进。在某个站点被拦截 2-3 次后，停止与 HTML 较劲，转而查找：

- 页面 URL 的 `/api/...`、`/graphql` 或 `.json` 变体
- RSS/Atom 订阅源（`/feed`、`/rss`、任何已恢复副本中的 `<link rel="alternate">`）
- 站点地图（`/sitemap.xml`），可揭示可能未设门禁的规范 URL

## 虚假成功 —— 会撒谎的路径

这些路径返回 HTTP 200 并附带看似合理的响应体，但那并非目标页面。脚本会自动拒绝它们；你手动操作时也应同样拒绝：

- **Google Cache 已死**（自 2024 年中期起）。`webcache.googleusercontent.com` 会返回 200 + 数十 KB，但那是带 JS 重定向的 Google 搜索插页，而非缓存。切勿使用。
- **AMP 缓存**（`*.cdn.ampproject.org`）大多返回约 300 字节的 `<title>Redirecting</title>` meta-refresh 存根，指回原始的（被拦截的）URL。把它当作成功会导致抓取循环。
- **限频响应体**：archive.today 的 429 页面是多 KB 的 HTML。检查目标的实际内容（标题词、预期字符串），而非仅看大小。

脚本应用的检测启发式：响应体低于每条路径的字节下限；meta-refresh/JS 重定向存根，其目标为原主机；插页标题（"Just a moment"、"Redirecting"、"Google Search"、"Attention Required"）。

## 代理中继：不要用

通用的"网页代理"中继在结构上就是中间人。绝不要通过它们发送 cookie 或 Authorization 头，也不要将其用于用户会依赖的任何内容 —— 其来源无法验证。优先使用归档，至少它们会为副本打上时间戳。
