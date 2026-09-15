# hermes-chinese · Hermes Agent 中文站

Hermes Agent（[Nous Research](https://nousresearch.com) 开源的、与你共同成长的自托管 AI 智能体）的社区中文站点，托管于 Cloudflare Pages：
**https://chinese.hermes.tools-online.site**（备用：https://chinese.hermes.geeksphere.online · https://hermes-chinese.pages.dev）

## 这是什么

- Hermes Agent 是 Nous Research 开源的（MIT 协议）AI 智能体，官网为 [hermes-agent.nousresearch.com](https://hermes-agent.nousresearch.com)，代码仓库 [NousResearch/hermes-agent](https://github.com/NousResearch/hermes-agent)。
- 本站是其**社区中文翻译站**，非官方：
  - **落地页**（首页）：对官网 Next.js 页面做 1:1 静态复刻，文案整体翻译为中文，交互（终端安装 Tab、复制命令、FAQ 手风琴、吸顶导航、安装下拉菜单、移动端菜单）以原生 JS 重新实现。
  - **文档**（/docs/）：直接 vendor 官方 Docusaurus 文档站（`website/`），使用官方维护的 zh-Hans 翻译构建为纯中文文档站，并在官方基础上补充了导航栏、页脚、侧栏分类的中文 UI 翻译。
- 保留原项目版权与许可（MIT）；如与英文原文有出入，以英文原文为准。

## 站点结构

```
landing/                 中文落地页（upstream.html 为官方快照源，index.html 由脚本生成）
  ├─ upstream.html       官网 SSR HTML 快照（sync 脚本输入）
  ├─ index.html          生成的中文落地页（勿手改，改 scripts/sync-landing.py 的翻译表）
  ├─ css/ font/ assets/  官方 CSS / 字体 / 图片 / 视频（本地自托管）
  ├─ zh.css              中文字体回退与交互态样式
  └─ js/landing.js       原生 JS 交互层
website/                 vendor 的官方 Docusaurus 文档站（含官方 zh-Hans 文档翻译）
  └─ i18n/zh-Hans/       文档翻译（官方维护）+ UI 翻译（本仓库 scripts/i18n-zh.py 生成）
scripts/
  ├─ download-assets.sh  下载落地页官方静态资源（幂等）
  ├─ sync-landing.py     官方快照 → 中文落地页（翻译表即文档，条目失配会报错）
  ├─ i18n-zh.py          文档站 UI 字符串中文化
  └─ upstream-sync.sh    每日上游同步逻辑（CI 用）
build.js                 构建脚本：landing → dist/，website build → dist/docs/
dist/                    构建产物（部署目录，不提交）
```

## 本地开发

```bash
npm install -g npm@11          # website 要求 npm >= 11.17
npm ci --prefix website        # 安装文档站依赖
npm run build                  # 生成 dist/（Docusaurus zh-Hans 构建 + dist 组装）
npm run serve                  # http://localhost:3000 预览
```

落地页单页调试（跳过文档构建）：`node build.js --skip-docs`

## 部署

推送到 `main` 分支后，GitHub Actions（[deploy.yml](.github/workflows/deploy.yml)）自动构建并部署到 Cloudflare Pages 项目 `hermes-chinese`。需要在仓库 Secrets 配置：

- `CLOUDFLARE_API_TOKEN`：具有 Cloudflare Pages Write 权限的 API Token
- `CLOUDFLARE_ACCOUNT_ID`：Cloudflare 账户 ID

自定义域名 `chinese.hermes.geeksphere.online` 绑定在 Pages 项目上，DNS 为指向 `hermes-chinese.pages.dev` 的 CNAME（橙云代理）。

## 上游同步机制（每日自动）

每天北京时间凌晨 03:00 运行[每日上游同步](.github/workflows/daily-sync.yml)（也可手动 `workflow_dispatch` 触发）：

1. 稀疏克隆上游 `website/` 覆盖本仓库（`docusaurus.config.ts` 除外，其中含本站专属修改）；
2. 抓取官方落地页快照，重跑翻译表生成中文落地页（条目失配会在报告中标记人工处理）；
3. 刷新文档站 UI 翻译；构建校验通过后**直接部署**到 Cloudflare Pages；
4. 提交同步结果并创建/更新跟踪 issue「上游同步：hermes-agent 官网差异」。

文档中文内容（`website/i18n/zh-Hans/docusaurus-plugin-content-docs/`）由官方上游维护、随同步自动更新；上游未翻译的新页面会回退英文显示并在 issue 中列出。

## 与官方的差异（本仓库专属修改）

- `website/docusaurus.config.ts`：`url` 指向本站域名；导航「Download / Home」与页脚「Desktop Download」指向本站落地页 `/`；tagline 中文化。此文件**不参与上游覆盖**，上游更新时需人工比对。
- `website/i18n/zh-Hans/docusaurus-theme-classic/*.json`、`code.json`、`docusaurus-plugin-content-docs/current.json`：本仓库补充的 UI 中文翻译（上游仅有文档内容翻译）。
- 站内搜索使用官方 Algolia 索引，搜索结果会跳转到官方站点对应页面。
- 官方落地页的部分滚动动效（图片视差）未复刻，其余布局样式 1:1。

## 许可

- 本仓库的站点实现代码与中文文案翻译：MIT
- `website/` 目录及落地页设计、图片、商标等内容：归 Nous Research 所有（上游项目 MIT；品牌资产与官网文案版权归权利人）
