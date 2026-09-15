#!/usr/bin/env python3
"""从官方落地页快照 landing/upstream.html 生成中文版 landing/index.html。

流程：剥离 Next.js 脚本 → 本地化资源 URL → 注入 Linux/Windows 安装面板 →
应用中文翻译表 → 追加 zh.css / landing.js。

上游官网改版后重新快照并重跑本脚本；翻译表中任何条目失配都会以非零码报出，
以便发现上游文案变化。运行：python3 scripts/sync-landing.py
"""
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "landing" / "upstream.html"
OUT = ROOT / "landing" / "index.html"

ORIGIN = "https://hermes-agent.nousresearch.com"
WB = "https://web-assets.nousresearch.com/nousnet-web"
HA = "https://hermes-assets.nousresearch.com"

# ---------------------------------------------------------------------------
# 资源 URL 重写（本地自托管）
# ---------------------------------------------------------------------------
URL_REWRITES = [
    (f"{ORIGIN}/_next/static/chunks/0~..gmu634h~d.css", "css/app.css"),
    (f"{ORIGIN}/_next/static/chunks/04yc5urihmp~2.css", "css/extra-1.css"),
    (f"{ORIGIN}/_next/static/chunks/0pios051-721d.css", "css/landing.css"),
    (f"{ORIGIN}/_next/static/media/Sigurd_Variable-s.p.092~ec~icx8ri.woff2", "font/Sigurd_Variable.woff2"),
    (f"{ORIGIN}/font/Rules/RulesVariable.woff2", "font/RulesVariable.woff2"),
    (f"{ORIGIN}/font/Rules/RulesGothicCnd-Light.woff2", "font/RulesGothicCnd-Light.woff2"),
    (f"{ORIGIN}/font/Rules/RulesGothicCnd-Regular.woff2", "font/RulesGothicCnd-Regular.woff2"),
    (f"{ORIGIN}/font/Rules/RulesGothicCnd-Medium.woff2", "font/RulesGothicCnd-Medium.woff2"),
    (f"{ORIGIN}/font/Rules/RulesGothicCmp-Regular.woff2", "font/RulesGothicCmp-Regular.woff2"),
    (f"{ORIGIN}/font/Rules/RulesGothicCmp-Medium.woff2", "font/RulesGothicCmp-Medium.woff2"),
    (f"{ORIGIN}/font/Rules/RulesGothicCmp-Semibold.woff2", "font/RulesGothicCmp-Semibold.woff2"),
    (f"{ORIGIN}/font/AeonikFonoProTRIAL/AeonikFonoProTRIAL-Regular.woff2", "font/AeonikFonoProTRIAL-Regular.woff2"),
    (f"{ORIGIN}/font/CourierPrime/CourierPrime-Regular.woff2", "font/CourierPrime-Regular.woff2"),
    (f"{WB}/img/landing/", "assets/landing/"),
    (f"{WB}/assets/hermes-landing/teams/hermes-wing.6ee276e9bff5a166.svg", "assets/landing/hermes-wing.svg"),
    (f"{WB}/assets/hermes-landing/teams/nous-girl.66f8944c40c50f8c.svg", "assets/landing/nous-girl.svg"),
    (f"{WB}/assets/hermes-landing/nous-portal-badge.17acea7b147e40b5.svg", "assets/landing/nous-portal-badge.svg"),
    (f"{WB}/assets/hermes-landing/nous-girl-badge.57892048f67f4848.svg", "assets/landing/nous-girl-badge.svg"),
    (f"{WB}/assets/hermes-landing/hermes-agent-badge.fcd9ed0a6930ee56.svg", "assets/landing/hermes-agent-badge.svg"),
    (f"{WB}/img/hermes-og-image-blue.62cadc1481af4bbe.png", "assets/hermes-og-image-blue.png"),
    (f"{HA}/hermes-desktop.mp4", "assets/hermes-desktop.mp4"),
    # 同款资源的站内相对路径（HTML 中 CSS/字体/图标均为 origin-relative）
    ("/_next/static/chunks/0~..gmu634h~d.css", "css/app.css"),
    ("/_next/static/chunks/04yc5urihmp~2.css", "css/extra-1.css"),
    ("/_next/static/chunks/0pios051-721d.css", "css/landing.css"),
    ("/_next/static/media/Sigurd_Variable-s.p.092~ec~icx8ri.woff2", "font/Sigurd_Variable.woff2"),
    ("/font/Rules/RulesVariable.woff2", "font/RulesVariable.woff2"),
    ("/font/Rules/RulesGothicCnd-Light.woff2", "font/RulesGothicCnd-Light.woff2"),
    ("/font/Rules/RulesGothicCnd-Regular.woff2", "font/RulesGothicCnd-Regular.woff2"),
    ("/font/Rules/RulesGothicCnd-Medium.woff2", "font/RulesGothicCnd-Medium.woff2"),
    ("/font/Rules/RulesGothicCmp-Regular.woff2", "font/RulesGothicCmp-Regular.woff2"),
    ("/font/Rules/RulesGothicCmp-Medium.woff2", "font/RulesGothicCmp-Medium.woff2"),
    ("/font/Rules/RulesGothicCmp-Semibold.woff2", "font/RulesGothicCmp-Semibold.woff2"),
    ("/font/AeonikFonoProTRIAL/AeonikFonoProTRIAL-Regular.woff2", "font/AeonikFonoProTRIAL-Regular.woff2"),
    ("/font/CourierPrime/CourierPrime-Regular.woff2", "font/CourierPrime-Regular.woff2"),
    ("/favicon.ico", "assets/favicon.ico"),
    ("/icon.png", "assets/icon.png"),
]

# ---------------------------------------------------------------------------
# 中文翻译表
# 每项为 (原文, 译文)。文本节点按 ">原文<" 精确匹配；属性类条目自带定界符。
# 列表顺序无关，脚本会先按长度排序应用。
# ---------------------------------------------------------------------------
TRANSLATIONS = [
    # <title> 与 meta
    ("<title>Hermes Agent — Open-Source AI Agent That Grows With You | Nous Research</title>",
     "<title>Hermes Agent —— 与你共同成长的开源 AI 智能体 | Nous Research 中文站</title>"),
    ("content=\"Hermes Agent is the open-source, self-hosted AI agent by Nous Research. Persistent memory, self-created skills, and a messaging gateway for Telegram, Discord, Slack, and more. Download Hermes Desktop for macOS and Windows, or install via terminal on Linux — free under the MIT license.\"",
     "content=\"Hermes Agent 是 Nous Research 推出的开源、可自托管的 AI 智能体：持久记忆、自动生成技能，并可通过 Telegram、Discord、Slack 等消息平台连接。支持下载 Hermes 桌面应用（macOS / Windows）或通过终端安装（Linux）——MIT 许可证，免费开源。\""),
    ("content=\"Hermes Agent — The Agent That Grows With You\"",
     "content=\"Hermes Agent —— 与你共同成长的智能体\""),
    ('lang="en"', 'lang="zh-CN"'),

    # 导航
    ('aria-label="Open menu"', 'aria-label="打开菜单"'),
    (">Docs</a>", ">文档</a>"),
    (">Community</a>", ">社区</a>"),
    ('aria-label="Hermes Agent, pinned"', 'aria-label="Hermes Agent（吸顶导航）"'),
    (">Install<svg", ">安装<svg"),
    (">Install Hermes</span>", ">安装 Hermes</span>"),
    (">Install via terminal</p>", ">通过终端安装</p>"),
    (">Install via terminal</span>", ">通过终端安装</span>"),

    # Hero
    ("<span>The Agent</span>", "<span>一位与你</span>"),
    ("<span>That Grows</span>", "<span>共同成长</span>"),
    ("<span>With You</span>", "<span>的智能体</span>"),
    (">Download desktop app</span>", ">下载桌面应用</span>"),
    (">Deploy to the cloud</span>", ">部署到云端</span>"),
    ('aria-label="Copy install command"', 'aria-label="复制安装命令"'),

    # 桌面应用
    (">Hermes Desktop App</h2>", ">Hermes 桌面应用</h2>"),
    (">Available across all computers.</p>", ">支持所有主流电脑平台。</p>"),
    (">Any distro</p>", ">任意发行版</p>"),
    ('aria-label="Hermes Desktop app preview"', 'aria-label="Hermes 桌面应用预览"'),

    # 功能特性
    (">Features</h2>", ">功能特性</h2>"),
    (">#1 Connect</p>", ">#1 连接</p>"),
    (">Lives Everywhere</h3>", ">无处不在</h3>"),
    ("Telegram, Discord, Slack, WhatsApp, Signal, Email, CLI — and a growing list of platforms. One agent, one memory, every surface.",
     "Telegram、Discord、Slack、WhatsApp、Signal、邮件、CLI——支持的平台持续增加。一个智能体，一份记忆，处处可用。"),
    (">#2 Remember</p>", ">#2 记忆</p>"),
    (">Persistent Memory</h3>", ">持久记忆</h3>"),
    ("It learns your projects, auto-generates skills, and never forgets how it solved a problem.",
     "它了解你的项目，自动生成技能，永远不会忘记自己是如何解决问题的。"),
    (">#3 Schedule</p>", ">#3 计划</p>"),
    (">Focused Automation</h3>", ">专注的自动化</h3>"),
    ("Natural-language scheduling for reports, backups, and briefings — running unattended through the gateway, focused every time.",
     "用自然语言安排报告、备份与简报——通过网关无人值守地运行，每次都保持专注。"),
    (">#4 Delegate</p>", ">#4 委派</p>"),
    (">Tasks Multiplied</h3>", ">任务成倍扩展</h3>"),
    ("Isolated subagents with their own conversations, terminals, and Python RPC scripts for zero-context-cost pipelines.",
     "隔离子智能体拥有各自的会话、终端与 Python RPC 脚本，构建零上下文成本的流水线。"),
    (">#5 Search</p>", ">#5 检索</p>"),
    (">Browse the Web</h3>", ">畅游网络</h3>"),
    ("Web search, browser automation, vision, image generation, text-to-speech, and multi-model reasoning.",
     "网页搜索、浏览器自动化、视觉理解、图像生成、语音合成与多模型推理。"),
    (">#6 Experiment</p>", ">#6 实验</p>"),
    (">Isolated Sandboxing</h3>", ">隔离沙箱</h3>"),
    ("Five backends — local, Docker, SSH, Singularity, Modal — with container hardening and namespace isolation.",
     "五种后端——本地、Docker、SSH、Singularity、Modal——提供容器加固与命名空间隔离。"),

    # FAQ
    (">FAQs</h2>", ">常见问题</h2>"),
    ('aria-label="View Docs"', 'aria-label="查看文档"'),
    (">View Docs</span>", ">查看文档</span>"),
    (">How does pricing work?</span>", ">定价是怎样的？</span>"),
    ("Hermes Agent is free and open source under the MIT license. Model providers and optional hosted services have their own pricing. You can use your own provider or connect to Nous Portal for model and tool credits; cloud hosting is optional.",
     "Hermes Agent 在 MIT 许可证下免费开源。模型提供商与可选的托管服务按各自标准收费。你可以使用自己的模型提供商，也可以接入 Nous Portal 获取模型与工具额度；云端托管完全是可选的。"),
    (">How do I get started?</span>", ">如何开始使用？</span>"),
    ("Download Hermes Desktop for macOS or Windows, or use the terminal installation command above. Follow the setup steps to connect a model provider, then start a conversation. For an always-on hosted agent, choose Deploy in the cloud.",
     "下载适用于 macOS 或 Windows 的 Hermes 桌面应用，或使用上方的终端安装命令。按照设置步骤连接模型提供商，然后开始对话。如需全天候托管的智能体，可选择「部署到云端」。"),
    (">How do I chat with my agent?</span>", ">如何与我的智能体对话？</span>"),
    ("Use Hermes Desktop or the terminal, or connect a messaging platform such as Telegram, Discord, Slack, WhatsApp, Signal, or email. The documentation walks you through configuring each integration.",
     "使用 Hermes 桌面应用或终端，或接入 Telegram、Discord、Slack、WhatsApp、Signal、邮件等消息平台。文档会引导你逐一完成这些集成的配置。"),
    (">Does my agent keep its data between sessions?</span>", ">智能体在会话之间会保留数据吗？</span>"),
    ("Yes. Hermes stores conversations, memories, and skills so you can return to your work in a later session. Keep a backup of your Hermes data directory when moving to another computer.",
     "会。Hermes 会保存对话、记忆和技能，方便你在之后的会话中接着工作。更换电脑时，请记得备份 Hermes 数据目录。"),
    (">What happens when I stop my agent?</span>", ">停止智能体后会发生什么？</span>"),
    ("Stopping a local agent ends its running process, but does not delete its saved conversations, memories, or skills. Start it again to continue. Tasks that need an active agent will not run while it is stopped; hosted agents are managed separately in Nous Portal.",
     "停止本地智能体会结束其运行中的进程，但不会删除已保存的对话、记忆或技能，重新启动即可继续。需要智能体在线的任务在其停止期间不会运行；托管智能体则由 Nous Portal 单独管理。"),

    # Nous Portal 定价
    ('aria-label="Available plans"', 'aria-label="可用方案"'),
    (">Create an account</span>", ">创建账户</span>"),
    (">Sign in</span>", ">登录</span>"),
    ("All paid tiers include monthly credits for use in Hermes Agent, access to 200+ cutting-edge models and built-in tool use",
     "所有付费档位均包含每月额度，可用于 Hermes Agent，并可访问 200+ 前沿模型与内置工具调用"),
    (">Get Started</p>", ">立即开始</p>"),
    ("Free models only", "仅可用免费模型"),
    ("Standard rate limits", "标准速率限制"),
    ("$0 monthly credits", "每月 $0 额度"),
    (">Free Hermes</span>", ">免费使用 Hermes</span>"),
    (">Per month</p>", ">每月</p>"),
    (">10% Bonus</span>", ">10% 加赠</span>"),
    ("200+ Models", "200+ 模型"),
    ("Hosted tool usage", "托管工具调用"),
    ("High rate limits", "更高速率限制"),
    ("$22.00 monthly credits — 10% bonus", "每月 $22.00 额度——含 10% 加赠"),
    ("$10.00 rollover cap", "结转上限 $10.00"),
    ("$110.00 monthly credits — 10% bonus", "每月 $110.00 额度——含 10% 加赠"),
    ("$50.00 rollover cap", "结转上限 $50.00"),
    ("$220.00 monthly credits — 10% bonus", "每月 $220.00 额度——含 10% 加赠"),
    ("$100.00 rollover cap", "结转上限 $100.00"),
    (">Release Hermes</span>", ">释放 Hermes</span>"),
    (">most popular<", ">最受欢迎<"),
    (">Liberate Hermes</span>", ">解放 Hermes</span>"),
    (">Unleash Hermes</span>", ">全力释放 Hermes</span>"),
    (">Current plans and billing details in Nous Portal</a>", ">最新方案与账单详情见 Nous Portal</a>"),

    # 纸色页脚
    ("The Internet&#x27;s Own AI</p>", "互联网自己的 AI</p>"),
    (">Terms</a>", ">服务条款</a>"),
    (">Privacy</a>", ">隐私政策</a>"),
    ("MIT License · 2026", "MIT 许可证 · 2026"),

    # 深色大页脚
    ("<p>The Internet&#x27;s Own AI<!-- -->.</p>", "<p>互联网自己的 AI<!-- -->。</p>"),
    (">Research</p>", ">研究</p>"),
    (">Research</span>", ">研究</span>"),
    (">Open Source</p>", ">开源</p>"),
    (">MIT License</p>", ">MIT 许可证</p>"),
    (">Releases</span>", ">发布</span>"),
    (">Careers</span>", ">招聘</span>"),
    (">Blog</span>", ">博客</span>"),
    (">Shop</span>", ">商店</span>"),
    (">Contact</span>", ">联系我们</span>"),
    (">Products</p>", ">产品</p>"),
    (">Business</span>", ">商业版</span>"),
    (">Enterprise</span>", ">企业版</span>"),
    (">Via Terminal</span>", ">终端安装</span>"),
    (">For Mac OS</span>", ">macOS 版</span>"),
    (">For Windows</span>", ">Windows 版</span>"),
    (">For Linux</span>", ">Linux 版</span>"),
    (">In the Cloud</span>", ">云端版</span>"),
    (">Resources</p>", ">资源</p>"),
    (">Community</p>", ">社区</p>"),
    (">Go to </span>", ">前往 </span>"),
    (">Platform</p>", ">平台</p>"),
    (">Create account</span>", ">创建账户</span>"),
    (">Plans</span>", ">方案</span>"),
]

# 站内链接：/docs → /docs/（Docusaurus baseUrl）
LINK_REWRITES = [
    ('href="/docs"', 'href="/docs/"'),
    ('href="https://hermes-agent.nousresearch.com/docs"', 'href="/docs/"'),
    ('href="https://hermes-agent.nousresearch.com/"', 'href="/"'),
    ('href="https://hermes-agent.nousresearch.com"', 'href="/"'),
]

# 官方安装命令（Tab 面板 SSR 只渲染 macOS，Linux/Windows 由客户端填充，这里静态注入）
MAC_CMD = "curl -fsSL https://hermes-agent.nousresearch.com/install.sh | bash"
LINUX_CMD = MAC_CMD
WIN_CMD = "iex (irm https://hermes-agent.nousresearch.com/install.ps1)"

REQUIRED_PATTERNS = [p for p, _ in TRANSLATIONS]


def apply_rewrites(html: str) -> str:
    for old, new in URL_REWRITES:
        html = html.replace(old, new)
    # 去掉 Next.js 的部署指纹查询串
    html = re.sub(r"\?dpl=dpl_[A-Za-z0-9]+", "", html)
    html = re.sub(r"\?favicon\.[A-Za-z0-9_-]+\.ico", "", html)
    html = re.sub(r"\?icon\.[A-Za-z0-9_.-]+\.png", "", html)
    for old, new in LINK_REWRITES:
        html = html.replace(old, new)
    return html


def strip_scripts(html: str) -> str:
    html = re.sub(r"<script\b[^>]*>.*?</script>", "", html, flags=re.S)
    html = re.sub(r"<script\b[^>]*/>", "", html)
    # 移除外链预取/预载（资源已本地化，DNS 预取不再需要）
    html = re.sub(r'<link[^>]*rel="preconnect"[^>]*/?>\n?', "", html)
    # 移除脚本预载（脚本已全部剥离）与字体预载（CSS 已按需加载，避免控制台警告）
    html = re.sub(r'<link[^>]*rel="(?:preload|modulepreload)"[^>]*as="script"[^>]*/?>\n?', "", html)
    html = re.sub(r'<link[^>]*rel="modulepreload"[^>]*/?>\n?', "", html)
    html = re.sub(r'<link[^>]*rel="preload"[^>]*as="font"[^>]*/?>\n?', "", html)
    # 移除 LinkedIn 像素的 noscript
    html = re.sub(r"<noscript>.*?</noscript>", "", html, flags=re.S)
    return html


def inject_terminal_panels(html: str) -> str:
    """SSR 只渲染 macOS 面板内容，为 Linux / Windows 面板补上命令。"""
    def panel(cmd: str) -> str:
        return (
            f'<code>{cmd}</code>'
            '<button aria-label="复制安装命令" class="landing-terminal-copy" type="button">'
            '<img alt="" height="16" src="assets/landing/copy.13392da62cc1f9c5.svg" width="16"/>'
            "</button>"
        )

    html = html.replace(
        '<div data-state="inactive" data-orientation="horizontal" role="tabpanel" '
        'aria-labelledby="radix-_R_m5ebaudb_-trigger-Linux" hidden="" '
        'id="radix-_R_m5ebaudb_-content-Linux" tabindex="0" class="landing-terminal-panel">\n</div>',
        '<div data-state="inactive" data-orientation="horizontal" role="tabpanel" '
        'aria-labelledby="radix-_R_m5ebaudb_-trigger-Linux" hidden="" '
        f'id="radix-_R_m5ebaudb_-content-Linux" tabindex="0" class="landing-terminal-panel">{panel(LINUX_CMD)}</div>',
    )
    html = html.replace(
        '<div data-state="inactive" data-orientation="horizontal" role="tabpanel" '
        'aria-labelledby="radix-_R_m5ebaudb_-trigger-Windows" hidden="" '
        'id="radix-_R_m5ebaudb_-content-Windows" tabindex="0" class="landing-terminal-panel">\n</div>',
        '<div data-state="inactive" data-orientation="horizontal" role="tabpanel" '
        'aria-labelledby="radix-_R_m5ebaudb_-trigger-Windows" hidden="" '
        f'id="radix-_R_m5ebaudb_-content-Windows" tabindex="0" class="landing-terminal-panel">{panel(WIN_CMD)}</div>',
    )
    return html


def apply_translations(html: str) -> tuple[str, list[str]]:
    missing = []
    for old, new in sorted(TRANSLATIONS, key=lambda t: len(t[0]), reverse=True):
        count = html.count(old)
        if count == 0:
            missing.append(old)
        html = html.replace(old, new)
    return html, missing


def append_local_assets(html: str) -> str:
    add = (
        '<link rel="stylesheet" href="zh.css"/>\n'
        '<script src="js/landing.js" defer></script>\n'
    )
    return html.replace("</head>", add + "</head>")


def main() -> int:
    html = SRC.read_text(encoding="utf-8")
    html = strip_scripts(html)
    html = apply_rewrites(html)
    html = inject_terminal_panels(html)
    html, missing = apply_translations(html)
    html = append_local_assets(html)
    OUT.write_text(html, encoding="utf-8")

    print(f"写入 {OUT}（{len(html)/1024:.0f} KB）")
    if missing:
        print("以下翻译条目在快照中未命中（上游文案可能已变化）：")
        for m in missing:
            print("  MISS:", m[:100])
        return 1
    print("全部翻译条目命中 ✓")
    return 0


if __name__ == "__main__":
    sys.exit(main())
