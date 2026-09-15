#!/usr/bin/env python3
"""为 zh-Hans 的 UI 翻译文件（code.json / navbar / footer / 侧栏分类）填入中文。

每次上游同步后先跑 `npx docusaurus write-translations --locale zh-Hans`
重新生成英文基线，再跑本脚本覆盖为中文；字典未覆盖的 key 保持英文。
运行：python3 scripts/i18n-zh.py
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent / "website" / "i18n" / "zh-Hans"

NAVBAR = {
    "item.label.Docs": "文档",
    "item.label.Skills": "技能",
    "item.label.Plugins": "插件",
    "item.label.Download": "下载",
    "item.label.Home": "首页",
}

FOOTER = {
    "link.title.Docs": "文档",
    "link.title.Community": "社区",
    "link.title.More": "更多",
    "link.item.label.Getting Started": "快速上手",
    "link.item.label.User Guide": "使用指南",
    "link.item.label.Developer Guide": "开发者指南",
    "link.item.label.Reference": "参考",
    "link.item.label.GitHub Issues": "GitHub Issues",
    "link.item.label.Skills Hub": "技能广场",
    "link.item.label.Desktop Download": "桌面应用下载",
    "copyright": "由 <a href=\"https://nousresearch.com\">Nous Research</a> 构建 · MIT 许可证 · 2026（社区中文翻译站）",
}

CODE = {
    "theme.colorToggle.ariaLabel.mode.system": "跟随系统",
    "theme.IconExternalLink.ariaLabel": "（在新标签页中打开）",
    "theme.navbar.mobileDropdown.collapseButton.expandAriaLabel": "展开下拉菜单",
    "theme.navbar.mobileDropdown.collapseButton.collapseAriaLabel": "收起下拉菜单",
    "theme.SearchModal.searchBox.placeholderText": "搜索文档",
    "theme.SearchModal.searchBox.placeholderTextAskAi": "再问一个问题……",
    "theme.SearchModal.searchBox.placeholderTextAskAiStreaming": "正在回答……",
    "theme.SearchModal.searchBox.enterKeyHint": "搜索",
    "theme.SearchModal.searchBox.enterKeyHintAskAi": "发送",
    "theme.SearchModal.searchBox.searchInputLabel": "搜索",
    "theme.SearchModal.searchBox.backToKeywordSearchButtonText": "返回关键词搜索",
    "theme.SearchModal.searchBox.backToKeywordSearchButtonAriaLabel": "返回关键词搜索",
    "theme.SearchModal.startScreen.recentConversationsTitle": "最近对话",
    "theme.SearchModal.startScreen.removeRecentConversationButtonTitle": "从历史记录中删除该对话",
    "theme.SearchModal.resultsScreen.askAiPlaceholder": "问 AI：",
    "theme.SearchModal.askAiScreen.disclaimerText": "回答由 AI 生成，可能有误，请自行核实。",
    "theme.SearchModal.askAiScreen.relatedSourcesText": "相关来源",
    "theme.SearchModal.askAiScreen.thinkingText": "思考中……",
    "theme.SearchModal.askAiScreen.copyButtonText": "复制",
    "theme.SearchModal.askAiScreen.copyButtonCopiedText": "已复制！",
    "theme.SearchModal.askAiScreen.copyButtonTitle": "复制",
    "theme.SearchModal.askAiScreen.likeButtonTitle": "赞",
    "theme.SearchModal.askAiScreen.dislikeButtonTitle": "踩",
    "theme.SearchModal.askAiScreen.thanksForFeedbackText": "感谢你的反馈！",
    "theme.SearchModal.askAiScreen.preToolCallText": "搜索中……",
    "theme.SearchModal.askAiScreen.duringToolCallText": "正在搜索",
    "theme.SearchModal.askAiScreen.afterToolCallText": "已搜索",
    "theme.SearchModal.footer.selectText": "选中",
    "theme.SearchModal.footer.submitQuestionText": "提交问题",
    "theme.SearchModal.footer.backToSearchText": "返回搜索",
}

SIDEBAR = {
    "version.label": "当前文档",
    "sidebar.docs.category.Getting Started": "快速上手",
    "sidebar.docs.category.Using Hermes": "使用 Hermes",
    "sidebar.docs.category.Secrets": "密钥管理",
    "sidebar.docs.category.Egress proxy": "出站代理",
    "sidebar.docs.category.Features": "功能特性",
    "sidebar.docs.category.Core": "核心功能",
    "sidebar.docs.category.Automation": "自动化",
    "sidebar.docs.category.Media & Web": "媒体与网络",
    "sidebar.docs.category.Management": "管理",
    "sidebar.docs.category.Skills": "技能",
    "sidebar.docs.category.Bundled": "内置技能",
    "sidebar.docs.category.Optional": "可选技能",
    "sidebar.docs.category.Messaging Platforms": "消息平台",
    "sidebar.docs.category.Popular": "常用平台",
    "sidebar.docs.category.Microsoft 365": "Microsoft 365",
    "sidebar.docs.category.Chinese platforms": "国内平台",
    "sidebar.docs.category.Other": "其他",
    "sidebar.docs.category.Integrations": "集成",
    "sidebar.docs.category.Guides & Tutorials": "指南与教程",
    "sidebar.docs.category.Developer Guide": "开发者指南",
    "sidebar.docs.category.Architecture": "架构",
    "sidebar.docs.category.Extending": "扩展开发",
    "sidebar.docs.category.Plugins": "插件",
    "sidebar.docs.category.Internals": "内部机制",
    "sidebar.docs.category.Reference": "参考",
    "sidebar.docs.category.Command Reference": "命令参考",
    "sidebar.docs.category.Configuration Reference": "配置参考",
    "sidebar.docs.category.Tools & Skills Reference": "工具与技能参考",
    # 内置/可选技能分类
    "sidebar.docs.category.skills-bundled-apple": "苹果平台",
    "sidebar.docs.category.skills-bundled-autonomous-ai-agents": "自主智能体",
    "sidebar.docs.category.skills-bundled-creative": "创意",
    "sidebar.docs.category.skills-bundled-devops": "DevOps",
    "sidebar.docs.category.skills-bundled-email": "邮件",
    "sidebar.docs.category.skills-bundled-media": "媒体",
    "sidebar.docs.category.skills-bundled-note-taking": "笔记",
    "sidebar.docs.category.skills-bundled-productivity": "效率",
    "sidebar.docs.category.skills-bundled-research": "研究",
    "sidebar.docs.category.skills-bundled-social-media": "社交媒体",
    "sidebar.docs.category.skills-bundled-software-development": "软件开发",
    "sidebar.docs.category.skills-bundled-web": "网络",
    "sidebar.docs.category.skills-optional-autonomous-ai-agents": "自主智能体",
    "sidebar.docs.category.skills-optional-blockchain": "区块链",
    "sidebar.docs.category.skills-optional-communication": "沟通",
    "sidebar.docs.category.skills-optional-creative": "创意",
    "sidebar.docs.category.skills-optional-data-science": "数据科学",
    "sidebar.docs.category.skills-optional-devops": "DevOps",
    "sidebar.docs.category.skills-optional-dogfood": "内测",
    "sidebar.docs.category.skills-optional-email": "邮件",
    "sidebar.docs.category.skills-optional-finance": "金融",
    "sidebar.docs.category.skills-optional-gaming": "游戏",
    "sidebar.docs.category.skills-optional-health": "健康",
    "sidebar.docs.category.skills-optional-mcp": "MCP",
    "sidebar.docs.category.skills-optional-migration": "迁移",
    "sidebar.docs.category.skills-optional-mlops": "MLOps",
    "sidebar.docs.category.skills-optional-payments": "支付",
    "sidebar.docs.category.skills-optional-productivity": "效率",
    "sidebar.docs.category.skills-optional-research": "研究",
    "sidebar.docs.category.skills-optional-security": "安全",
    "sidebar.docs.category.skills-optional-smart-home": "智能家居",
    "sidebar.docs.category.skills-optional-social-media": "社交媒体",
    "sidebar.docs.category.skills-optional-software-development": "软件开发",
    "sidebar.docs.category.skills-optional-web-development": "Web 开发",
    "sidebar.docs.category.skills-optional-yuanbao": "腾讯元宝",
}


def patch(path: Path, table: dict) -> None:
    if not path.exists():
        print("跳过（不存在）:", path)
        return
    data = json.loads(path.read_text(encoding="utf-8"))
    changed = 0
    for key, zh in table.items():
        if key in data and data[key].get("message") != zh:
            data[key]["message"] = zh
            changed += 1
    path.write_text(
        json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    print(f"{path.name}: 更新 {changed} 条")


def main() -> None:
    patch(ROOT / "docusaurus-theme-classic" / "navbar.json", NAVBAR)
    patch(ROOT / "docusaurus-theme-classic" / "footer.json", FOOTER)
    patch(ROOT / "code.json", CODE)
    patch(ROOT / "docusaurus-plugin-content-docs" / "current.json", SIDEBAR)


if __name__ == "__main__":
    main()
