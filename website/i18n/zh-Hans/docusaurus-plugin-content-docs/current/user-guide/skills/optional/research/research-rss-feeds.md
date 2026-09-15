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
| 来源 | 可选 — 通过 `hermes skills install official/research/rss-feeds` 安装 |
| 路径 | `optional-skills/research/rss-feeds` |
| 版本 | `1.0.0` |
| 作者 | Teknium (teknium1), Hermes Agent |
| 许可证 | MIT |
| 平台 | linux, macos, windows |
| 标签 | `RSS`, `Atom`, `Feeds`, `Monitoring`, `Research`, `Blogs`, `Releases` |
| 相关技能 | [`reddit-reading`](/docs/user-guide/skills/optional/social-media/social-media-reddit-reading), [`competitor-news-monitor`](/docs/user-guide/skills/bundled/research/research-competitor-news-monitor), [`grounded-citations`](/docs/user-guide/skills/bundled/research/research-grounded-citations), [`youtube-content`](/docs/user-guide/skills/bundled/media/media-youtube-content), [`blogwatcher`](/docs/user-guide/skills/optional/research/research-blogwatcher) |

## 参考：完整的 SKILL.md

:::info
以下是 Hermes 在此技能被触发时加载的完整技能定义。这就是技能激活时智能体看到的指令内容。
:::

# RSS Feeds 技能

将任意 RSS 2.0、RSS 1.0/RDF、Atom 或 JSON Feed URL 读取为干净的、按日期排序的条目
列表，并从普通页面 URL 中发现其背后的 feed（`<link rel="alternate">` 或常见的
`/feed`、`/rss.xml`、`/atom.xml` 路径）。仅使用标准库，无需安装任何东西。它不获取
完整文章正文 —— 如需正文，请将条目的链接传给 `web_extract`。

## 使用场景

- "&lt;blog/site> 上有什么新内容"、"&lt;GitHub repo> 的最新版本发布"、"&lt;subreddit>
  中的最近帖子"、"读取这个 feed"、"这个网站有 RSS feed 吗"。
- 用 `cronjob_manage` 构建周期性摘要（相比每次运行都抓取 HTML 首页，feed 更便宜也
  更稳定）。若需要在多个 feed 之间维护持久的已读/未读数据库，请安装可选的
  `blogwatcher` 技能；本技能是零安装的读取方式。
- 任何结构化列表 `title / link / date / author / summary` 胜过渲染页面的场景：
  播客、更新日志、YouTube 频道、新闻编辑室、论坛分类。

## 前置条件

无。需要 Python 3.10+，以及对 feed 主机的网络访问权限。

## 如何运行

通过 `terminal` 使用技能相对路径的脚本运行：

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
| Subreddit / Reddit 搜索 | `https://www.reddit.com/r/NAME/.rss`, `https://www.reddit.com/search.rss?q=…`（匿名每分钟 1 次请求；见 `reddit-reading`） |
| YouTube 频道 | `https://www.youtube.com/feeds/videos.xml?channel_id=UC…` |
| Hacker News | `https://hnrss.org/frontpage`, `https://hnrss.org/newest?q=TERM` |
| arXiv 分类 | `https://rss.arxiv.org/rss/cs.CL` |
| Substack / Medium / WordPress / Ghost | `SITE/feed`, `medium.com/feed/@user`, `SITE/rss/` |
| 播客 | 从节目托管页面获取该节目的 RSS URL（`discover` 会找到它） |

每个条目的输出字段：`title`、`link`、`published`（UTC ISO 8601）、`author`、
`summary`（剥离 HTML，≤ 2000 字符）。条目按最新优先排序。

## 操作步骤

① 如果你只有一个站点 URL，直接对它运行 `read`；脚本会发现 feed 并报告它使用的是
哪个 URL（`discovered_from`）。当你想在多个对外声明的 feed 之间选择时（评论 feed 与
文章 feed、按分类的 feed），使用 `discover`。

② 为请求设定边界：`--limit` 表示"最新 N 条"，`--since YYYY-MM-DD` 表示"自上次检查
以来"。对于定时任务摘要，持久化上次见到的 `published` 值，下次运行时作为 `--since`
传入。

③ 如需全文，将条目的 `link` 交给 `web_extract`；feed 摘要常常被截断，或者只有第一
段。

④ 当结果用于报告时，引用条目的 `link`，而不是 feed URL（`grounded-citations`）。

## 常见陷阱

- 返回 200 但内容是 HTML 意味着该 URL 是页面，而不是 feed；脚本会自动转而进行发现，
  但如果有站点既没有 `<link rel="alternate">`，也没有任何常见路径，则报告
  `no feed found` —— 在断定没有 feed 之前，先检查站点页脚或 `/sitemap.xml`。
- Reddit feed 共享 Reddit 的匿名限流（每 IP 大约每分钟一次请求）。当你需要不止一次
  Reddit 调用时，请通过 `reddit-reading` 串联调用，它会等待限流窗口结束。
- 日期：RSS 的 `pubDate` 是 RFC 822，Atom 使用 ISO 8601；脚本会将两者统一规范化为
  UTC。省略日期的 feed 会排序到底部，并被 `--since` 丢弃。
- 有些 feed 部署在 Cloudflare 之后，会对非浏览器客户端返回 403；`blocked-page-recovery`
  可处理这类情况。

## 验证

`python3 scripts/feed.py read https://github.com/NousResearch/hermes-agent/releases.atom
--limit 1` 会打印一个条目，带有 `releases/tag/` 链接和 `[atom]` 格式标记；
`discover https://simonwillison.net/` 会打印一个 `/atom/` URL。
