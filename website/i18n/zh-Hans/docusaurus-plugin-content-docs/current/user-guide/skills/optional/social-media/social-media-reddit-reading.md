---
title: "Reddit Reading — 读取 Reddit：子版块、搜索、帖子、用户"
sidebar_label: "Reddit Reading"
description: "读取 Reddit：子版块、搜索、帖子、用户"
---

{/* 此页面由 website/scripts/generate-skill-docs.py 根据技能的 SKILL.md 自动生成。请修改源 SKILL.md，而非此页面。 */}

# Reddit Reading

读取 Reddit：子版块、搜索、帖子、用户。无需浏览器。

## 技能元数据

| | |
|---|---|
| 来源 | 可选 — 使用 `hermes skills install official/social-media/reddit-reading` 安装 |
| 路径 | `optional-skills/social-media/reddit-reading` |
| 版本 | `1.0.0` |
| 作者 | Teknium (teknium1), Hermes Agent |
| 许可证 | MIT |
| 平台 | linux, macos, windows |
| 标签 | `Reddit`、`Social Media`、`Research`、`Discussions`、`Community` |
| 相关技能 | [`rss-feeds`](/docs/user-guide/skills/optional/research/research-rss-feeds)、[`grounded-citations`](/docs/user-guide/skills/bundled/research/research-grounded-citations)、[`blocked-page-recovery`](/docs/user-guide/skills/bundled/web/web-blocked-page-recovery)、[`xurl`](/docs/user-guide/skills/bundled/social-media/social-media-xurl) |

## 参考：完整的 SKILL.md

:::info
以下是 Hermes 在此技能被触发时加载的完整技能定义。这就是技能激活时智能体看到的指令。
:::

# Reddit Reading 技能

从正常途径均已失效的服务器或无头机器上读取 Reddit 内容——子版块列表、站点或子版块搜索、含评论的完整帖子，以及用户活动。它不会发布、投票或以用户身份登录。创意鸣谢：[Agent Reach](https://github.com/Panniantong/Agent-Reach) 中按平台路由后端的设计。

## 何时使用

- “r/LocalLLaMA 对 X 有什么看法”、“查找关于 Y 的 Reddit 帖子”、“总结这个 Reddit 帖子”、“u/someone 最近发布了什么”。
- 用户分享的任何 `reddit.com` URL。`web_extract`、`browser_navigate` 以及 `.json` 端点从服务器 IP 访问时都会失败（403 或“证明你是人类”的墙）；此技能是可用的途径。
- 不适用于发帖、投票、发消息或任何需要用户登录的操作。

## 前置条件

**无。** 无需 Reddit 账户、登录、cookie 或 API 密钥。默认后端是 Reddit 的公开 Atom 订阅源（`.rss` 端点），这是 Reddit 仍向非住宅 IP 提供服务的唯一无需认证途径。它被限流为每个 IP 大约每分钟一个请求，返回的数据较单薄（没有评分，只有顶层评论），这对于少量调用来说没问题。

**可选升级（应用凭证，仍无需用户登录）：** 若需持续使用或完整数据，请在 https://www.reddit.com/prefs/apps 注册一个免费的 “script” 类型应用，并将其两个值填入 `~/.hermes/.env`：

```
REDDIT_CLIENT_ID=...
REDDIT_CLIENT_SECRET=...
```

这是应用注册，不是登录：脚本使用仅应用的 `client_credentials` 授权，绝不使用用户名、密码或浏览器 cookie，也绝不代表用户行事。两个值都设置后，它会自动切换到 OAuth API（约每分钟 100 个请求、评分、嵌套评论、`num_comments`）；如果缺失或被拒绝，则回退到匿名订阅源，并在 stderr 上说明。

| | 匿名订阅源（默认） | OAuth 应用凭证 |
|---|---|---|
| 设置 | 无 | 1 分钟应用注册，两个 `.env` 值 |
| 速率限制 | 约 1 个请求 / 分钟 / IP | 约 100 个请求 / 分钟 |
| 帖子数据 | 帖子 + 顶层评论，无评分 | 嵌套评论、评分、评论数 |
| 以用户身份行事 | 否 | 否 |

## 如何运行

每条命令都通过 `terminal` 使用技能相对脚本路径运行：

```bash
python3 scripts/reddit.py doctor                                  # 使用哪个后端、当前速率限制窗口
python3 scripts/reddit.py sub LocalLLaMA --sort hot --limit 15
python3 scripts/reddit.py search "hermes agent" --sub LocalLLaMA --sort new
python3 scripts/reddit.py thread https://www.reddit.com/r/x/comments/abc123/slug/ --limit 40
python3 scripts/reddit.py user spez --limit 10
python3 scripts/reddit.py --json search "topic"                  # 机器可读
```

## 快速参考

每条命令在两个后端上都可用；脚本会自动选择后端，你无需传入标志。

| 需求 | 命令 | 匿名 | OAuth |
|---|---|---|---|
| 子版块首页 | `sub NAME --sort hot\|new\|top\|rising [--time week]` | ✔ | ✔ |
| 全 Reddit 搜索 | `search "q" --sort relevance\|new\|top\|comments` | ✔ | ✔ |
| 单个子版块搜索 | `search "q" --sub NAME` | ✔ | ✔ |
| 帖子 + 评论 | `thread URL --limit N` | ✔ 仅顶层，无评分 | ✔ 嵌套、评分 |
| 用户的帖子/评论 | `user NAME` | ✔ | ✔ |
| 后端 + 速率限制 | `doctor` | ✔ | ✔ |

## 步骤

① 若本会话中尚未调用过，每个任务运行一次 `doctor` —— 它会告诉你哪个后端处于活动状态，以及匿名窗口还剩多少秒。

② 在调用之前先规划好你的调用。匿名 Reddit 大约允许**每个 IP 每分钟一个请求**；在遇到 429 时，脚本会休眠直到窗口重置并重试一次，因此五次调用的计划大约花费五分钟。优先使用一次 `search --sub` 而非多次 `sub` 列表，并阅读一个帖子而非整个列表。

③ 对于“社区怎么说”类问题，阅读帖子正文（`thread`），而不要止步于标题；列表只携带每篇帖子的前约 300 个字符。

④ 当结果要用于报告时，引用永久链接（`url` 字段），而非列表页。`grounded-citations` 会像注册任何其他来源一样注册这些 URL。

⑤ 如果用户需要持续的 Reddit 访问（监控、超过约 10 次调用），停下来请他们注册应用凭证（前置条件），而不要硬扛限流。直白地告诉他们：这是免费的应用注册，不是让 Hermes 登录他们的账户。绝不要索取 Reddit 密码或浏览器 cookie。

## 常见陷阱

- `www.reddit.com/…/.json`、`api.reddit.com` 和 `old.reddit.com` 对数据中心 IP 会返回 403 或空的 “Welcome to Reddit” 外壳。不要回退到它们；不要伪造浏览器 User-Agent（同样 403）。
- `r.jina.ai` 和 `browser_navigate` 工具会遇到同样的封锁（“被网络安全封锁” / 人类验证）。`blocked-page-recovery` 的 Wayback 途径仍能恢复已归档的**旧**帖子；但无法获取新的。
- 匿名帖子订阅源只包含帖子加上顶层评论（Reddit 将订阅源限制为寥寥数条）；评分和回复嵌套仅 OAuth 可用。
- Reddit 订阅源上的 `limit` 只是建议性的 —— 无论你请求多少，都预期 5–25 条。
- 绝不要将 `REDDIT_CLIENT_SECRET` 粘贴到聊天或日志中；脚本仅从环境变量读取它。
- 不要通过循环重试或添加代理来“修复” 429；限流是按 IP 的，且脚本已经等待过一次窗口。连续出现多于一次 429 意味着该任务需要使用应用凭证。

## 验证

`python3 scripts/reddit.py doctor` 会打印 `anonymous_feed: ok` 和一个 `x-ratelimit-reset` 值；`sub announcements --limit 1` 返回一条带有 `reddit.com/r/announcements/comments/` URL 的条目。设置凭证后，`doctor` 会打印 `active_backend: oauth`，且 `thread …` 输出会显示数值评分。
