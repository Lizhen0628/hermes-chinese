---
title: "Blogwatcher — 通过 blogwatcher-cli 工具监控博客和 RSS/Atom 订阅源"
sidebar_label: "Blogwatcher"
description: "通过 blogwatcher-cli 工具监控博客和 RSS/Atom 订阅源"
---

{/* 本页面由 website/scripts/generate-skill-docs.py 基于该技能的 SKILL.md 自动生成。请编辑源 SKILL.md，而非本页面。 */}

# Blogwatcher

通过 blogwatcher-cli 工具监控博客和 RSS/Atom 订阅源。

## 技能元数据

| | |
|---|---|
| Source | Optional — 使用 `hermes skills install official/research/blogwatcher` 安装 |
| Path | `optional-skills/research/blogwatcher` |
| Version | `2.0.0` |
| Author | JulienTant（Hyaxia/blogwatcher 的分支） |
| License | MIT |
| Platforms | linux, macos, windows |
| Tags | `RSS`, `Blogs`, `Feed-Reader`, `Monitoring` |

## 参考：完整 SKILL.md

:::info
以下是 Hermes 在触发此技能时加载的完整技能定义。这就是技能激活时智能体所看到的指令内容。
:::

# Blogwatcher

使用 `blogwatcher-cli` 工具跟踪博客和 RSS/Atom 订阅源的更新。支持自动发现订阅源、HTML 抓取兜底、OPML 导入，以及已读/未读文章管理。

## 配合 Hermes 工具使用（请先阅读）

`blogwatcher-cli` 是订阅源数据库；Hermes 工具负责围绕它做自动化：

- **周期性监控 — 使用 cronjob 工具的 `monitor` 字段，而不是裸的 schedule。** `monitor` 每个周期运行一次脚本，只有在输出发生变化时才会唤醒智能体：将它设置为运行 `blogwatcher-cli scan >/dev/null 2>&1 && blogwatcher-cli articles` 的脚本（输出是确定性的；有新文章 = 输出变化 = 智能体被唤醒并注入 diff）。周期内输出未变化时零 LLM 调用成本。设置 `deliver` 可将摘要路由到聊天/频道；添加 `continuity: true` 使得连续的摘要能够去重。
- **读取用户询问的文章**：对来自 `blogwatcher-cli articles` 的文章 URL 使用 `web_extract([url])` —— 不要手动重新抓取。
- **一次性的“监控此页面变化”且不涉及订阅源语义**：跳过本技能；cronjob 工具的 `monitor` 字段可以直接接受 http(s) URL。
- **一次性读取某个订阅源或站点的最新文章，无需安装任何东西**：使用内置的 `rss-feeds` 技能（`scripts/feed.py read URL`）；当你需要跟踪大量订阅源并维护已读/未读状态时，blogwatcher 才值得安装。
- **公司/竞品跟踪及分析和引用**：优先使用 `competitor-news-monitor` 技能；blogwatcher 是它所依赖的更轻量的原始订阅源层。

## 安装

选择一种方式：

- **Go:** `go install github.com/JulienTant/blogwatcher-cli/cmd/blogwatcher-cli@latest`
- **Docker:** `docker run --rm -v blogwatcher-cli:/data ghcr.io/julientant/blogwatcher-cli`
- **二进制文件（Linux amd64）：** `curl -sL https://github.com/JulienTant/blogwatcher-cli/releases/latest/download/blogwatcher-cli_linux_amd64.tar.gz | tar xz -C /usr/local/bin blogwatcher-cli`
- **二进制文件（Linux arm64）：** `curl -sL https://github.com/JulienTant/blogwatcher-cli/releases/latest/download/blogwatcher-cli_linux_arm64.tar.gz | tar xz -C /usr/local/bin blogwatcher-cli`
- **二进制文件（macOS Apple Silicon）：** `curl -sL https://github.com/JulienTant/blogwatcher-cli/releases/latest/download/blogwatcher-cli_darwin_arm64.tar.gz | tar xz -C /usr/local/bin blogwatcher-cli`
- **二进制文件（macOS Intel）：** `curl -sL https://github.com/JulienTant/blogwatcher-cli/releases/latest/download/blogwatcher-cli_darwin_amd64.tar.gz | tar xz -C /usr/local/bin blogwatcher-cli`

所有发行版本：https://github.com/JulienTant/blogwatcher-cli/releases

### 带有持久化存储的 Docker

默认情况下，数据库位于 `~/.blogwatcher-cli/blogwatcher-cli.db`。在 Docker 中，容器重启后该文件会丢失。使用 `BLOGWATCHER_DB` 或卷挂载来持久化它：

```bash
# 命名卷（最简单）
docker run --rm -v blogwatcher-cli:/data -e BLOGWATCHER_DB=/data/blogwatcher-cli.db ghcr.io/julientant/blogwatcher-cli scan

# 宿主目录绑定挂载
docker run --rm -v /path/on/host:/data -e BLOGWATCHER_DB=/data/blogwatcher-cli.db ghcr.io/julientant/blogwatcher-cli scan
```

### 从原始 blogwatcher 迁移

如果从 `Hyaxia/blogwatcher` 升级，请迁移你的数据库：

```bash
mv ~/.blogwatcher/blogwatcher.db ~/.blogwatcher-cli/blogwatcher-cli.db
```

二进制文件的名称已从 `blogwatcher` 改为 `blogwatcher-cli`。

## 常用命令

### 管理博客

- 添加博客：`blogwatcher-cli add "My Blog" https://example.com`
- 指定订阅源添加：`blogwatcher-cli add "My Blog" https://example.com --feed-url https://example.com/feed.xml`
- 使用 HTML 抓取添加：`blogwatcher-cli add "My Blog" https://example.com --scrape-selector "article h2 a"`
- 列出已跟踪的博客：`blogwatcher-cli blogs`
- 移除博客：`blogwatcher-cli remove "My Blog" --yes`
- 从 OPML 导入：`blogwatcher-cli import subscriptions.opml`

### 扫描与阅读

- 扫描所有博客：`blogwatcher-cli scan`
- 扫描单个博客：`blogwatcher-cli scan "My Blog"`
- 列出未读文章：`blogwatcher-cli articles`
- 列出所有文章：`blogwatcher-cli articles --all`
- 按博客筛选：`blogwatcher-cli articles --blog "My Blog"`
- 按分类筛选：`blogwatcher-cli articles --category "Engineering"`
- 将文章标记为已读：`blogwatcher-cli read 1`
- 将文章标记为未读：`blogwatcher-cli unread 1`
- 将全部标记为已读：`blogwatcher-cli read-all`
- 将某个博客的全部标记为已读：`blogwatcher-cli read-all --blog "My Blog" --yes`

## 环境变量

所有标志都可以通过带有 `BLOGWATCHER_` 前缀的环境变量来设置：

| 变量 | 描述 |
|---|---|
| `BLOGWATCHER_DB` | SQLite 数据库文件的路径 |
| `BLOGWATCHER_WORKERS` | 并发扫描 worker 的数量（默认：8） |
| `BLOGWATCHER_SILENT` | 扫描时仅输出 “scan done” |
| `BLOGWATCHER_YES` | 跳过确认提示 |
| `BLOGWATCHER_CATEGORY` | 按分类筛选文章的默认值 |

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

## 注意事项

- 当未提供 `--feed-url` 时，会自动从博客首页发现 RSS/Atom 订阅源。
- 如果 RSS 失败且配置了 `--scrape-selector`，则回退到 HTML 抓取。
- 来自 RSS/Atom 订阅源的分类会被存储，并可用于筛选文章。
- 可从 Feedly、Inoreader、NewsBlur 等导出的 OPML 文件中批量导入博客。
- 数据库默认存储在 `~/.blogwatcher-cli/blogwatcher-cli.db`（可通过 `--db` 或 `BLOGWATCHER_DB` 覆盖）。
- 使用 `blogwatcher-cli <command> --help` 来查看所有标志和选项。
