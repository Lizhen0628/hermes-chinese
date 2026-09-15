---
title: "Rss Feeds — 读取 RSS、Atom、JSON feed；发现页面背后的 feed"
sidebar_label: "Rss Feeds"
description: "读取 RSS、Atom、JSON feed；发现页面背后的 feed"
---

{/* This page is auto-generated from the skill's SKILL.md by website/scripts/generate-skill-docs.py. Edit the source SKILL.md, not this page. */}

# Rss Feeds

读取 RSS、Atom、JSON feed；发现页面背后的 feed。

## 技能元数据

| | |
|---|---|
| 来源 | 可选 — 使用 `hermes skills install official/research/rss-feeds` 安装 |
| 路径 | `optional-skills/research/rss-feeds` |
| 版本 | `1.0.0` |
| 作者 | Teknium (teknium1), Hermes Agent |
| 许可证 | MIT |
| 平台 | linux, macos, windows |
| 标签 | `RSS`、`Atom`、`Feeds`、`Monitoring`、`Research`、`Blogs`、`Releases` |
| 相关技能 | [`reddit-reading`](/docs/user-guide/skills/optional/social-media/social-media-reddit-reading), [`competitor-news-monitor`](/docs/user-guide/skills/bundled/research/research-competitor-news-monitor), [`grounded-citations`](/docs/user-guide/skills/bundled/research/research-grounded-citations), [`youtube-content`](/docs/user-guide/skills/bundled/media/media-youtube-content), [`blogwatcher`](/docs/user-guide/skills/optional/research/research-blogwatcher) |

## 参考：完整的 SKILL.md

:::info
以下是 Hermes 在触发此技能时加载的完整技能定义。这是技能激活时智能体所看到的指令内容。
:::

# RSS Feeds 技能

将任意 RSS 2.0、RSS 1.0/RDF、Atom 或 JSON Feed URL 读取为按日期排序的干净条目列表，并发现普通页面 URL 背后的 feed（`<link rel="alternate">` 或常见的 `/feed`、`/rss.xml`、`/atom.xml` 路径）。仅使用标准库，无需安装任何东西。它不会抓取完整文章正文——如需正文，请将条目的 link 传给 `web_extract`。

## 何时使用

- “&lt;博客/站点> 有什么新内容”、“&lt;GitHub 仓库> 的最新发布”、“&lt;subreddit> 的近期帖子”、“读取这个 feed”、“这个站点有 RSS feed 吗”。
- 使用 `cronjob_manage` 构建周期性摘要（feed 比每次运行时抓取 HTML 首页更便宜、更稳定）。若要在多个 feed 上维护持久化的已读/未读数据库，请安装可选的 `blogwatcher` 技能；本技能是零安装的读取方式。
- 任何需要 `title / link / date / author / summary` 结构化列表而非渲染页面的场景：播客、更新日志、YouTube 频道、新闻编辑部、论坛分类。

## 前置条件

无。Python 3.10+、可访问 feed 主机的网络。

## 如何运行

通过 `terminal` 使用技能相对脚本路径运行：

```bash
python3 scripts/feed.py read https://hnrss.org/frontpage --limit 10
python3 scripts/feed.py read https://simonwillison.net/            # page URL → discovers the feed
python3 scripts/feed.py read URL --since 2026-09-01 --json          # only newer entries, machine-readable
python3 scripts/feed.py discover https://example.com/               # list candidate feed URLs
```

## 快速参考

| 来源 | Feed URL 模式 |
|---|---|
| GitHub releases / commits / tags | `https://github.com/OWNER/REPO/releases.atom`, `…/commits/BRANCH.atom`, `…/tags.atom` |
| Subreddit / Reddit 搜索 | `https://www.reddit.com/r/NAME/.rss`, `https://www.reddit.com/search.rss?q=…`（匿名限 1 次请求/分钟；见 `reddit-reading`） |
| YouTube 频道 | `https://www.youtube.com/feeds/videos.xml?channel_id=UC…` |
| Hacker News | `https://hnrss.org/frontpage`, `https://hnrss.org/newest?q=TERM` |
| arXiv 分类 | `https://rss.arxiv.org/rss/cs.CL` |
| Substack / Medium / WordPress / Ghost | `SITE/feed`, `medium.com/feed/@user`, `SITE/rss/` |
| 播客 | 来自其托管页面的节目 RSS URL（`discover` 可找到它） |

每个条目的输出字段：`title`、`link`、`published`（UTC ISO 8601）、`author`、`summary`（已剥离 HTML，≤ 2000 字符）。条目按最新优先排序。

## 步骤

① 如果你只有站点 URL，直接对其运行 `read`；脚本会发现 feed 并报告它使用了哪个 URL（`discovered_from`）。当你需要在多个已声明的 feed 之间选择时（评论 feed vs 帖子 feed、按分类的 feed），使用 `discover`。

② 限定请求范围：“最新 N 条”用 `--limit`，“自上次检查以来”用 `--since YYYY-MM-DD`。对于定时任务摘要，持久化上次见到的 `published` 值，并在下次运行时将其作为 `--since` 传入。

③ 如需全文，将条目 `link` 传给 `web_extract`；feed 摘要通常被截断或只有第一段。

④ 当结果要用于报告时，引用条目 `link` 而非 feed URL（`grounded-citations`）。

## 常见问题

- 返回 200 但内容是 HTML 意味着该 URL 是一个页面而非 feed；脚本会自动转为发现流程，但若站点没有 `<link rel="alternate">` 且没有常见路径，则报告 `no feed found`——在断定不存在 feed 之前，检查站点页脚或 `/sitemap.xml`。
- Reddit feed 共享 Reddit 的匿名限流（每个 IP 约每分钟一次请求）。当你需要进行多次 Reddit 调用时，通过 `reddit-reading` 串联，它会等待限流窗口过去。
- 日期：RSS `pubDate` 是 RFC 822，Atom 使用 ISO 8601；脚本将二者都规范化为 UTC。省略日期的 feed 会排在底部，并被 `--since` 丢弃。
- 某些 feed 位于 Cloudflare 之后，对非浏览器客户端返回 403；`blocked-page-recovery` 可处理这类情况。

## 验证

`python3 scripts/feed.py read https://github.com/NousResearch/hermes-agent/releases.atom
--limit 1` 会打印一个带有 `releases/tag/` 链接和 `[atom]` 格式标签的条目；
`discover https://simonwillison.net/` 会打印一个 `/atom/` URL。
