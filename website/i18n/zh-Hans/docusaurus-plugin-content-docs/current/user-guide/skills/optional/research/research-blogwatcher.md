---
title: "Blogwatcher — 通过 blogwatcher-cli 工具监控博客与 RSS/Atom 订阅源"
sidebar_label: "Blogwatcher"
description: "通过 blogwatcher-cli 工具监控博客与 RSS/Atom 订阅源"
---

{/* 本页面由 website/scripts/generate-skill-docs.py 根据该技能的 SKILL.md 自动生成。请编辑源 SKILL.md，而非本页面。 */}

# Blogwatcher

通过 blogwatcher-cli 工具监控博客与 RSS/Atom 订阅源。

## 技能元数据

| | |
|---|---|
| Source | 可选 — 使用 `hermes skills install official/research/blogwatcher` 安装 |
| Path | `optional-skills/research/blogwatcher` |
| Version | `2.0.0` |
| Author | JulienTant（Hyaxia/blogwatcher 的分支） |
| License | MIT |
| Platforms | linux, macos, windows |
| Tags | `RSS`, `Blogs`, `Feed-Reader`, `Monitoring` |

## 参考：完整的 SKILL.md

:::info
以下内容是该技能被触发时 Hermes 加载的完整技能定义。这也就是技能处于激活状态时智能体所看到的指令。
:::

# Blogwatcher

使用 `blogwatcher-cli` 工具跟踪博客与 RSS/Atom 订阅源的更新。支持自动发现订阅源、HTML 抓取回退、OPML 导入，以及已读/未读文章管理。

## 与 Hermes 工具配合使用（请先阅读本节）

`blogwatcher-cli` 是订阅源数据库；Hermes 工具则围绕它完成自动化：

- **周期性监控 — 请使用定时任务工具的 `monitor` 字段，而不是裸的时间表。** `monitor` 会在每个时间点运行一个脚本，并仅在输出发生变化时唤醒智能体：将其设置为运行 `blogwatcher-cli scan >/dev/null 2>&1 && blogwatcher-cli articles` 的脚本（确定性输出；有新文章 = 输出发生变化 = 智能体被唤醒并注入差异）。输出未变化的时间点消耗零次 LLM 调用。设置 `deliver` 可将摘要路由到某个聊天/频道；添加 `continuity: true` 以便连续的摘要可以去重。
- **阅读用户询问的某篇文章**：对 `blogwatcher-cli articles` 中给出的文章 URL 使用 `web_extract([url])` —— 不要手动重新抓取。
- **一次性的「监控此页面的变化」且不具备订阅源语义**：跳过本技能；定时任务工具的 `monitor` 字段可直接接受 http(s) URL。
- **一次性读取一个订阅源或某站点的最新文章，无需安装任何东西**：使用内置的 `rss-feeds` 技能（`scripts/feed.py read URL`）；当你需要跟踪大量订阅源并维护已读/未读状态时，blogwatcher 才值得安装。
- **带有分析和引用的公司/竞争对手跟踪**：优先使用 `competitor-news-monitor` 技能；blogwatcher 是它可依托的更轻量的原始订阅源层。

## 安装

任选一种方式：

- **Go：** `go install github.com/JulienTant/blogwatcher-cli/cmd/blogwatcher-cli@latest`
- **Docker：** `docker run --rm -v blogwatcher-cli:/data ghcr.io/julientant/blogwatcher-cli`
- **二进制（Linux amd64）：** `curl -sL https://github.com/JulienTant/blogwatcher-cli/releases/latest/download/blogwatcher-cli_linux_amd64.tar.gz | tar xz -C /usr/local/bin blogwatcher-cli`
- **二进制（Linux arm64）：** `curl -sL https://github.com/JulienTant/blogwatcher-cli/releases/latest/download/blogwatcher-cli_linux_arm64.tar.gz | tar xz -C /usr/local/bin blogwatcher-cli`
- **二进制（macOS Apple Silicon）：** `curl -sL https://github.com/JulienTant/blogwatcher-cli/releases/latest/download/blogwatcher-cli_darwin_arm64.tar.gz | tar xz -C /usr/local/bin blogwatcher-cli`
- **二进制（macOS Intel）：** `curl -sL https://github.com/JulienTant/blogwatcher-cli/releases/latest/download/blogwatcher-cli_darwin_amd64.tar.gz | tar xz -C /usr/local/bin blogwatcher-cli`

全部版本：https://github.com/JulienTant/blogwatcher-cli/releases

### 带持久化存储的 Docker

默认情况下，数据库位于 `~/.blogwatcher-cli/blogwatcher-cli.db`。在 Docker 中，这会在容器重启时丢失。使用 `BLOGWATCHER_DB` 或卷挂载来持久化：

```bash
# 命名卷（最简单）
docker run --rm -v blogwatcher-cli:/data -e BLOGWATCHER_DB=/data/blogwatcher-cli.db ghcr.io/julientant/blogwatcher-cli scan

# 主机绑定挂载
docker run --rm -v /path/on/host:/data -e BLOGWATCHER_DB=/data/blogwatcher-cli.db ghcr.io/julientant/blogwatcher-cli scan
```

### 从原始 blogwatcher 迁移

如果要从 `Hyaxia/blogwatcher` 升级，请移动你的数据库：

```bash
mv ~/.blogwatcher/blogwatcher.db ~/.blogwatcher-cli/blogwatcher-cli.db
```

二进制文件名从 `blogwatcher` 改为 `blogwatcher-cli`。

## 常用命令

### 管理博客

- 添加博客：`blogwatcher-cli add "My Blog" https://example.com`
- 添加并指定订阅源：`blogwatcher-cli add "My Blog" https://example.com --feed-url https://example.com/feed.xml`
- 添加并使用 HTML 抓取：`blogwatcher-cli add "My Blog" https://example.com --scrape-selector "article h2 a"`
- 列出已跟踪的博客：`blogwatcher-cli blogs`
- 移除博客：`blogwatcher-cli remove "My Blog" --yes`
- 从 OPML 导入：`blogwatcher-cli import subscriptions.opml`

### 扫描与阅读

- 扫描全部博客：`blogwatcher-cli scan`
- 扫描单个博客：`blogwatcher-cli scan "My Blog"`
- 列出未读文章：`blogwatcher-cli articles`
- 列出全部文章：`blogwatcher-cli articles --all`
- 按博客筛选：`blogwatcher-cli articles --blog "My Blog"`
- 按分类筛选：`blogwatcher-cli articles --category "Engineering"`
- 将文章标记为已读：`blogwatcher-cli read 1`
- 将文章标记为未读：`blogwatcher-cli unread 1`
- 全部标记为已读：`blogwatcher-cli read-all`
- 将某个博客的全部文章标记为已读：`blogwatcher-cli read-all --blog "My Blog" --yes`

## 环境变量

所有标志均可通过带 `BLOGWATCHER_` 前缀的环境变量设置：

| 变量 | 说明 |
|---|---|
| `BLOGWATCHER_DB` | SQLite 数据库文件的路径 |
| `BLOGWATCHER_WORKERS` | 并发扫描工作线程数（默认：8） |
| `BLOGWATCHER_SILENT` | 扫描时仅输出「scan done」 |
| `BLOGWATCHER_YES` | 跳过确认提示 |
| `BLOGWATCHER_CATEGORY` | 按分类筛选文章的默认过滤器 |

## 示例输出

```
$ blogwatcher-cli blogs
Tracked blogs (1):

  xkcd
    URL: https://xkcd.com
    Feed: https://xkcd.com/atom.xml
    Last scanned: 2026-04-03 10:30
```

```
$ blogwatcher-cli scan
Scanning 1 blog(s)...

  xkcd
    Source: RSS | Found: 4 | New: 4

Found 4 new article(s) total!
```

```
$ blogwatcher-cli articles
Unread articles (2):

  [1] [new] Barrel - Part 13
       Blog: xkcd
       URL: https://xkcd.com/3095/
       Published: 2026-04-02
       Categories: Comics, Science

  [2] [new] Volcano Fact
       Blog: xkcd
       URL: https://xkcd.com/3094/
       Published: 2026-04-01
       Categories: Comics
```

## 说明

- 当未提供 `--feed-url` 时，会自动从博客首页发现 RSS/Atom 订阅源。
- 如果 RSS 失败且配置了 `--scrape-selector`，则回退到 HTML 抓取。
- 来自 RSS/Atom 订阅源的分类会被存储，并可用于筛选文章。
- 可从 Feedly、Inoreader、NewsBlur 等导出的 OPML 文件批量导入博客。
- 数据库默认存储在 `~/.blogwatcher-cli/blogwatcher-cli.db`（可通过 `--db` 或 `BLOGWATCHER_DB` 覆盖）。
- 使用 `blogwatcher-cli <command> --help` 查看所有标志与选项。
