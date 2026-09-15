---
title: "被拦截页面恢复 — 当抓取失败时使用：403/429、付费墙、WAF、机器人墙"
sidebar_label: "被拦截页面恢复"
description: "当抓取失败时使用：403/429、付费墙、WAF、机器人墙"
---

{/* 本页由 website/scripts/generate-skill-docs.py 基于技能的 SKILL.md 自动生成。请编辑源 SKILL.md，而不是本页。 */}

# 被拦截页面恢复

当抓取失败时使用：403/429、付费墙、WAF、机器人墙。

## 技能元数据

| | |
|---|---|
| 来源 | 内置（默认安装） |
| 路径 | `skills/web\blocked-page-recovery` |
| 版本 | `1.0.0` |
| 作者 | Hermes Agent |
| 许可证 | MIT |
| 平台 | linux、macos、windows |
| 标签 | `Research`、`Archives`、`Wayback`、`Paywall`、`WAF`、`Fallback` |
| 相关技能 | [`grounded-citations`](/docs/user-guide/skills/bundled/research/research-grounded-citations) |

## 参考：完整 SKILL.md

:::info
以下是 Hermes 在触发此技能时加载的完整技能定义。这是技能激活时智能体看到的指令内容。
:::

# 被拦截页面恢复

当页面无法抓取——403/429、Cloudflare 的 "Just a moment..."、付费墙，
或机器人检测的插页——不要放弃，也不要在同一个 URL 上
循环重试。第三方服务往往保存着该页面的**副本**。按照这个阶梯
逐级下探，从成本最低的开始。

## 阶梯

```
1. Wayback Machine  — archive.org "available" API  （快照 + 时间戳）
2. archive.today    — 域名轮换：archive.ph → .md → .li → .is
3. Jina Reader      — 仅在设置了 JINA_API_KEY 时使用 （服务端实时渲染）
4. API 优先转向      — 在同一主机上寻找 /api/、/graphql、.json 或 RSS
5. 真实浏览器        — 作为最后、最昂贵的兜底手段使用浏览器工具
```

用捆绑脚本一次性运行整条链路：

```bash
python3 scripts/recover_page.py "https://example.com/blocked-article" --json
```

该脚本按顺序尝试每一条路径，校验每个响应体（见下文"虚假成功"），
并打印第一个真正的命中结果及其来源出处。

## 来源出处纪律（不可妥协）

每一份恢复的副本都带有出处，引用时你必须保留：

| 路径 | 出处 | 引用方式 |
|-------|-----------|-------------|
| Wayback / archive.today | `snapshot` | 引用时附带快照日期："as archived 2026-08-06"。切勿将快照当作实时页面呈现——它可能已过期。 |
| Jina Reader | `live` | 对实时页面的服务端重新渲染；正常引用。 |
| 实时抓取 / 浏览器 | `live` | 正常引用。 |

如果用户需要*当前*数据（价格、库存、突发新闻），快照只是背景信息，而非
答案——请明确说明这一点并注明其时效。

## 手动路径

### 1. Wayback Machine（出处最佳，优先尝试）

```bash
# 发现：以 JSON 返回最接近的快照 URL + 时间戳
curl -sL "https://archive.org/wayback/available?url={URL}"
# 然后抓取 archived_snapshots.closest.url
```

若要枚举大量快照（或恢复已删除页面），使用 CDX 索引：

```bash
curl -sL "https://web.archive.org/cdx/search/cdx?url={URL}&output=json&limit=10"
```

CDX 在高负载下会间歇性返回 503——若发生这种情况，回退到
`available` API，不要反复重试猛击它。

适用于：任何被公开爬取的 URL。不适用于：robots 屏蔽的站点、
从未被爬取的 URL、纯 JS 的 SPA（快照不会渲染）。

### 2. archive.today（付费墙、已删除内容）

用户提交的存档——往往拥有 Wayback 所缺少的付费墙新闻文章。
会激进地限流（429）并轮换域名，因此需要遍历：

```bash
for d in archive.ph archive.md archive.li archive.is; do
  curl -sL --max-time 20 "https://$d/newest/{URL}" -o /tmp/page.html \
    -w "%{http_code}" && break
done
```

**校验响应体，而非状态码**——429 依然会返回几 KB 的
限流 HTML，仅凭大小检查看起来像是成功。

### 3. Jina Reader（需要 JINA_API_KEY）

`r.jina.ai` 在服务端用真实浏览器重新渲染实时页面
并返回 markdown。匿名访问已经失效（401 → Turnstile）；必须有
密钥：

```bash
curl -s -H "Authorization: Bearer $JINA_API_KEY" "https://r.jina.ai/{URL}"
```

可处理存档无法应对的 JS SPA。当环境
变量未设置时，完全跳过此路径。

### 4. API 优先转向

WAF 对其背后的数据端点保护远不如对 HTML 界面那样
激进。在同一站点上被拦截 2-3 次后，别再攻击 HTML，
转而寻找：

- 页面 URL 的 `/api/...`、`/graphql` 或 `.json` 变体
- RSS/Atom 订阅源（`/feed`、`/rss`，或在你确实恢复到的任何副本中的
  `<link rel="alternate">`）
- 一个站点地图（`/sitemap.xml`），揭示可能未被门禁的规范 URL

## 虚假成功——会撒谎的路径

这些会返回 HTTP 200 以及一个看似合理但并非该页面的响应体。脚本
会自动拒绝它们；你也应手动拒绝：

- **Google Cache 已死**（自 2024 年中起）。`webcache.googleusercontent.com`
  返回 200 + 几十 KB，但它是带有 JS 重定向的 Google Search 插页，
  而非缓存。绝不要使用它。
- **AMP 缓存**（`*.cdn.ampproject.org`）大多返回约 300 字节的
  `<title>Redirecting</title>` meta-refresh 存根，指向
  原始（被拦截的）URL。把它当作成功会造成抓取死循环。
- **限流响应体**：archive.today 的 429 页面是数 KB 的 HTML。检查
  目标的实际内容（标题词、预期字符串），而不仅仅是大小。

脚本采用的检测启发式：响应体低于每条路径的字节下限；
meta-refresh/JS 重定向存根，其目标为原始主机；插页
标题（"Just a moment"、"Redirecting"、"Google Search"、"Attention Required"）。

## 代理中继：不要用

通用的"web 代理"中继在构造上就是中间人。绝不要通过它们发送
cookie 或 Authorization 头，也不要将其用于任何
用户会依赖的内容——出处无法验证。优先使用存档，它们至少
会为其副本打上时间戳。
