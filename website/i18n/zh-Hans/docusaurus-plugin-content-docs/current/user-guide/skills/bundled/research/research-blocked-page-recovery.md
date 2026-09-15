---
title: "受阻页面恢复 — 通过归档快照和阅读器回退方案恢复受阻/付费墙/被 WAF 拦截的页面"
sidebar_label: "受阻页面恢复"
description: "通过归档快照和阅读器回退方案恢复受阻/付费墙/被 WAF 拦截的页面"
---

{/* 本页由 website/scripts/generate-skill-docs.py 根据技能的 SKILL.md 自动生成。请编辑源文件 SKILL.md，而非本页。 */}

# 受阻页面恢复

通过归档快照和阅读器回退方案恢复受阻/付费墙/被 WAF 拦截的页面。当 web_extract 或浏览器遇到 403/429/挑战页面、付费墙或机器人检测插页时使用。

## 技能元数据

| | |
|---|---|
| 来源 | 内置（默认安装） |
| 路径 | `skills/research/blocked-page-recovery` |
| 版本 | `1.0.0` |
| 作者 | Hermes Agent |
| 许可证 | MIT |
| 平台 | linux、macos、windows |
| 标签 | `Research`、`Archives`、`Wayback`、`Paywall`、`WAF`、`Fallback` |
| 相关技能 | [`grounded-citations`](/docs/user-guide/skills/bundled/research/research-grounded-citations) |

## 参考：完整 SKILL.md

:::info
以下是 Hermes 在触发该技能时加载的完整技能定义。这是技能激活时智能体所看到的指令。
:::

# 受阻页面恢复

当页面无法抓取时——403/429、Cloudflare 的 “Just a moment...”、付费墙，或机器人检测插页——不要放弃，也不要在同一个 URL 上循环重试。第三方服务通常持有该页面的**副本**。沿着这个梯子逐级而下，从成本最低的开始。

## 梯子

```
1. Wayback Machine  — archive.org 的 "available" API  （快照 + 时间戳）
2. archive.today    — 域名轮换：archive.ph → .md → .li → .is
3. Jina Reader      — 仅当设置了 JINA_API_KEY 时  （服务端实时渲染）
4. API 优先转向     — 在同一主机上寻找 /api/、/graphql、.json 或 RSS
5. 真实浏览器       — 浏览器工具作为最后手段，成本最高
```

用内置脚本一次性运行：

```bash
python3 scripts/recover_page.py "https://example.com/blocked-article" --json
```

该脚本按顺序尝试每条路径，验证每个响应正文（见下方“虚假的成功”），并打印第一个真实命中的结果及其来源。

## 来源纪律（不可动摇）

每个恢复的副本都带有来源信息，引用时你**必须**保留：

| 路径 | 来源 | 引用方式 |
|-------|-----------|-------------|
| Wayback / archive.today | `snapshot` | 引用时**带上**快照日期：“as archived 2026-08-06”。绝不要把快照当作实时页面呈现——它可能已过时。 |
| Jina Reader | `live` | 实时页面的服务端重新渲染；正常引用。 |
| 实时抓取 / 浏览器 | `live` | 正常引用。 |

如果用户需要*当前*数据（价格、可用性、突发新闻），快照只是背景，而非答案——请明确说明并注明其时效。

## 手动路径

### 1. Wayback Machine（来源最佳，优先尝试）

```bash
# Discovery: returns closest snapshot URL + timestamp as JSON
curl -sL "https://archive.org/wayback/available?url={URL}"
# Then fetch archived_snapshots.closest.url
```

若要枚举大量快照（或恢复已删除页面），使用 CDX 索引：

```bash
curl -sL "https://web.archive.org/cdx/search/cdx?url={URL}&output=json&limit=10"
```

CDX 在负载下会间歇性返回 503——若发生这种情况，回退到 `available` API；不要反复猛打。

适用：任何被公开抓取的 URL。不适用：robots 屏蔽的站点、从未被抓取的 URL、纯 JS SPA（快照无法渲染）。

### 2. archive.today（付费墙、已删除内容）

用户提交的归档——常包含 Wayback 所没有的付费墙新闻文章。速率限制很激进（429）且会轮换域名，因此要遍历：

```bash
for d in archive.ph archive.md archive.li archive.is; do
  curl -sL --max-time 20 "https://$d/newest/{URL}" -o /tmp/page.html \
    -w "%{http_code}" && break
done
```

**验证响应正文，而非状态码**——429 仍会返回数 KB 的速率限制 HTML，仅凭大小检查会误判为成功。

### 3. Jina Reader（需要 JINA_API_KEY）

`r.jina.ai` 在服务端用真实浏览器重新渲染实时页面并返回 markdown。匿名访问已失效（401 → Turnstile）；需要密钥：

```bash
curl -s -H "Authorization: Bearer $JINA_API_KEY" "https://r.jina.ai/{URL}"
```

能处理归档无法处理的 JS SPA。当环境变量未设置时，完全跳过此路径。

### 4. API 优先转向

WAF 对 HTML 表面的保护远比其背后的数据端点更激进。在某个站点上被拦截 2-3 次后，停止与 HTML 缠斗，转而寻找：

- 页面 URL 的 `/api/...`、`/graphql` 或 `.json` 变体
- RSS/Atom 订阅源（`/feed`、`/rss`，或你确实恢复到的任何副本中的 `<link rel="alternate">`）
- 站点地图（`/sitemap.xml`），可能揭示未受门禁的规范 URL

## 虚假的成功——会撒谎的路径

这些会返回 HTTP 200 和一个看似合理的正文，但它并非该页面。脚本会自动拒绝它们；你也应手动拒绝：

- **Google Cache 已死**（自 2024 年中起）。`webcache.googleusercontent.com` 返回 200 + 数十 KB，但那是带 JS 重定向的 Google Search 插页，不是缓存。永不使用。
- **AMP 缓存**（`*.cdn.ampproject.org`）大多返回一个约 300 字节的 `<title>Redirecting</title>` meta-refresh 存根，指回原始（被拦截的）URL。把它当作成功会形成抓取死循环。
- **速率限制正文**：archive.today 的 429 页面是数 KB 的 HTML。检查目标的实际内容（标题词语、预期字符串），而不仅仅是大小。

脚本应用的检测启发式规则：正文低于每条路径的字节下限；meta-refresh/JS 重定向存根，其目标为原始主机；插页标题（“Just a moment”、“Redirecting”、“Google Search”、“Attention Required”）。

## 代理中继：不要用

通用“网络代理”中继在构造上就是中间人。绝不通过它们发送 cookie 或 Authorization 头，也不要将其用于用户会依赖的任何内容——来源无法验证。优先使用归档，它们至少会为副本打上时间戳。
