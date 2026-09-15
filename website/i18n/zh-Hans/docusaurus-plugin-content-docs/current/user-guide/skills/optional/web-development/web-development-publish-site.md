---
title: "Publish Site — 带版本管理的站点部署到 GitHub/Cloudflare/Netlify Pages"
sidebar_label: "Publish Site"
description: "带版本管理的站点部署到 GitHub/Cloudflare/Netlify Pages"
---

{/* This page is auto-generated from the skill's SKILL.md by website/scripts/generate-skill-docs.py. Edit the source SKILL.md, not this page. */}

# Publish Site

带版本管理的站点部署到 GitHub/Cloudflare/Netlify Pages。

## 技能元数据

| | |
|---|---|
| Source | 可选 — 使用 `hermes skills install official/web-development/publish-site` 安装 |
| Path | `optional-skills/web-development\publish-site` |
| Version | `1.0.0` |
| Author | Hermes Agent (Nous Research) |
| License | MIT |
| Platforms | linux, macos, windows |
| Tags | `publish`, `deploy`, `hosting`, `github-pages`, `cloudflare-pages`, `netlify`, `static-site`, `versioning`, `rollback`, `web-development` |

## 参考：完整的 SKILL.md

:::info
以下是此技能被触发时 Hermes 加载的完整技能定义。这就是技能激活时智能体所看到的指令。
:::

# Publish Site

把用户构建（或你为其构建）的网站、仪表盘或 Web 应用，上线到用户自己拥有的基础设施上——默认使用 GitHub Pages，需要更多功能时使用 Cloudflare Pages 或 Netlify。原则是：先在本地预览获得确认，为每次部署打上 git tag 进行版本化，按服务商阶梯顺序部署，用真实的 HTTP 检查验证线上 URL，并让回滚只需一条命令。

此技能覆盖静态站点和 SPA 构建输出（纯 HTML/CSS/JS，或来自 Vite/Next-export/Astro 等的 `dist/`/`build/` 文件夹）。它不覆盖服务端运行时——如需零账号配置的一次性 serverless 部署，请改用 `cloudflare-temporary-deploy` 可选技能。

## 何时使用

当用户要求以下操作时加载此技能：

- **把站点上线** — "publish this"、"host this somewhere"、"给我一个可以分享的链接"
- **部署刚刚生成的** 仪表盘、报告、作品集、文档站点或原型
- **更新已发布的站点** 内容（重新部署 = 新版本）
- **回滚** 一次不良部署到上一版本
- **挑选主机** — 他们不在乎位置，只想要一个 URL

## 前提条件

至少一个已认证的服务商 CLI（按此顺序检查）：

- **GitHub Pages（默认）：** `gh auth status` 成功。还需要 `git`。
- **Cloudflare Pages：** `wrangler whoami` 成功（或已设置 `CLOUDFLARE_API_TOKEN`）。安装：`npm i -g wrangler` 或使用 `npx wrangler@latest`。
- **Netlify（后备）：** `netlify status` 成功。安装：`npm i -g netlify-cli`。

外加：

- 一个待发布的静态输出目录（站点根目录或 `dist/`/`build/` 文件夹）。如果项目需要构建步骤，先运行构建，发布输出目录，绝不发布源码。
- 如需本地预览分享：`cloudflared`（可选 — `python3 -m http.server` 可用于纯本地预览）。

## 如何运行

以下所有命令均通过 `terminal` 工具，在站点的项目目录中运行。整个流水线始终是同样的五个动作：

1. 构建 → 2. 预览以获得确认 → 3. 提交 + 打 tag（部署前版本化） → 4. 按服务商阶梯部署 → 5. 用 `curl` 验证线上 URL 并报告。

## 快速参考

| 步骤 | 命令 |
|---|---|
| 本地预览 | `python3 -m http.server 8080 --directory dist` |
| 可分享的预览 | `cloudflared tunnel --url http://localhost:8080` |
| 为部署打版本 | `git add -A && git commit -m "deploy: <what>" && git tag deploy-YYYYMMDD-HHMM` |
| GitHub Pages（分支模式） | `git subtree push --prefix dist origin gh-pages` |
| 在仓库上启用 Pages | `gh api repos/{owner}/{repo}/pages -X POST -f 'source[branch]=gh-pages' -f 'source[path]=/'` |
| Cloudflare Pages | `npx wrangler@latest pages deploy dist --project-name <name>` |
| Netlify | `netlify deploy --prod --dir dist` |
| 回滚 | `git checkout <previous-tag> -- . && redeploy`（或服务商仪表盘） |
| 验证线上 | `curl -sS -o /dev/null -w '%{http_code}' <url>` → 预期 `200` |

## 操作流程

### 1. 本地构建并预览

如需构建则构建（`npm run build` 等）并确定输出目录。以服务方式提供它：

```bash
python3 -m http.server 8080 --directory dist
```

如需可分享的预览链接（用户在其他机器上，或你需要他们在线确认），在后台 `terminal` 会话中开启一个临时隧道：

```bash
cloudflared tunnel --url http://localhost:8080
```

把 `https://*.trycloudflare.com` URL 给用户，并在部署前获得确认。之后杀掉隧道。

### 2. 部署前版本化 — 无例外

每次部署都必须来自一次 git commit，这样每次部署都是可复现的，回滚也轻而易举。

```bash
git init 2>/dev/null; git add -A
git commit -m "deploy: <short description>"
git tag "deploy-$(date +%Y%m%d-%H%M)"
```

如果项目已有仓库，直接提交 + 打 tag 即可。绝不要部署未提交的文件。

### 3. 部署 — 服务商阶梯

**第 1 级 — GitHub Pages（默认：免费，如果 `gh` 已认证则无需额外账号）：**

```bash
gh repo create <name> --public --source . --push   # skip if repo exists
git subtree push --prefix dist origin gh-pages      # publish build output
gh api "repos/{owner}/<name>/pages" -X POST \
  -f 'source[branch]=gh-pages' -f 'source[path]=/'  # first time only
```

站点出现在 `https://<owner>.github.io/<name>/`。如果站点就是仓库根目录（无构建目录），推送 `main` 并把 Pages 源设为 `main`，而不用 subtree。对于会频繁重新部署的构建步骤项目，建议使用官方的 `actions/deploy-pages` workflow，这样推送即可自动发布。

**第 2 级 — Cloudflare Pages（当用户想要自定义域名、redirects/headers 或 Functions 时）：**

```bash
npx wrangler@latest pages deploy dist --project-name <name>
```

首次运行会创建项目并打印 `https://<name>.pages.dev` URL。自定义域名通过 Cloudflare 仪表盘绑定（Pages → 项目 → Custom domains）。

**第 3 级 — Netlify（后备，或用户已在使用它时）：**

```bash
netlify deploy --prod --dir dist
```

`netlify deploy --dir dist`（不加 `--prod`）会产生一个草稿 URL——可作为第二阶段预览。

### 4. 回滚

回滚 = 重新部署一个先前的 tag。绝不手工编辑线上的输出。

```bash
git checkout deploy-<previous> -- .   # or: git checkout deploy-<previous>; rebuild
# then rerun the same deploy command from step 3
```

Cloudflare Pages 和 Netlify 也在各自仪表盘中保留每次部署的历史（"Rollback to this deploy"），当 CLI 不趁手时这更快。

### 5. 机密和环境变量

- **绝不提交机密、API 密钥或 `.env` 文件** — 它们在 Pages 托管上会公开。首次提交前用 `git status` 检查，并把 `.env*` 放进 `.gitignore`。
- 运行时环境变量应放在服务商的仪表盘中：Cloudflare Pages → Settings → Environment variables；Netlify → Site settings → Environment variables。GitHub Pages 仅支持静态 — 没有服务端环境；打包进 bundle 的任何内容按定义都是公开的。如果用户的构建内联了密钥，要提醒他们。

## 常见陷阱

- **SPA 路由在 GitHub Pages 上 404。** Pages 没有重写规则。把 `index.html` 复制为输出目录中的 `404.html`（`cp dist/index.html dist/404.html`），以便客户端路由能恢复。Cloudflare Pages 和 Netlify 通过 `_redirects`（`/* /index.html 200`）处理 SPA。
- **GitHub Pages 构建延迟。** 首次启用后，站点可能需要 1–10 分钟才出现，之后每次推送约 1 分钟。不要在第一个 404 就宣称失败 — 先轮询 `curl` 几次再排查。
- **路径大小写敏感。** Pages 主机是大小写敏感的 Linux；在 macOS/Windows 上可用的站点，可能因为引用为 `Logo.PNG` 但提交为 `logo.png` 的资源而 404。当资源 404 时，在 HTML 中 grep 大小写不匹配的地方。
- **项目页基础路径。** `https://<owner>.github.io/<name>/` 在 `/<name>/` 下提供服务 — 像 `/app.js` 这样的绝对资源 URL 会失效。使用相对路径，或设置构建工具的 base（`vite build --base=/<name>/`）。
- **`wrangler` 认证流程需要浏览器。** `wrangler login` 会打开 OAuth；在无头会话中，优先使用 `CLOUDFLARE_API_TOKEN`（用户在 dash.cloudflare.com → API Tokens 创建），且绝不把 token 回显到日志中。
- **自定义域名的 DNS 传播。** 新的 CNAME 可能需要几分钟到数小时。先针对服务商的默认 URL（`*.pages.dev`、`*.netlify.app`、`*.github.io`）验证，再单独检查自定义域名 — 不要混淆两者的失败。
- **部署源码而非构建输出。** 当真正的站点位于 `dist/` 时却发布仓库根目录，会得到目录列表或原始 JSX。始终确认输出目录包含 `index.html`。

## 验证

不要仅凭部署日志就报告成功。在告知用户任何信息之前：

1. `curl -sS -o /dev/null -w '%{http_code}' <live-url>` 返回 `200`（对于首次 GitHub Pages 部署，在约 2 分钟内重试）。
2. `curl -sS <live-url> | head -30` 显示预期的 `index.html` 内容 — 可选地在该现场 URL 上用 `web_extract` 确认标记。
3. 对于 SPA，再 curl 一个深层路由（例如 `/about`）并确认它返回 `200`，而非 `404`。
4. `git tag --list 'deploy-*'` 显示本次部署的 tag。

然后把现场 URL 报告给用户，并附上他们可用于回滚的部署 tag。
