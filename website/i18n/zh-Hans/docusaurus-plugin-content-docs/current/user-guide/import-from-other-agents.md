---
sidebar_position: 9
title: "从其他智能体导入"
description: "一条命令将 Claude Code（~/.claude）或 OpenAI Codex CLI（~/.codex）配置导入 Hermes —— 指令、允许列表、MCP 服务器、技能与记忆。"
---

# 从其他智能体导入

`hermes import-agent` 通过一条命令将你现有的 **Claude Code** 或 **OpenAI Codex CLI** 配置导入 Hermes。它遵循与 [`hermes claw migrate`](../guides/migrate-from-openclaw.md) 相同的先预览后执行模式：在写入任何内容之前，你总能看到逐项计划，而 `--dry-run` 绝不会触碰磁盘。

```bash
hermes import-agent                    # 自动检测 ~/.claude 或 ~/.codex
hermes import-agent claude-code        # 从 ~/.claude 导入
hermes import-agent codex              # 从 ~/.codex 导入
hermes import-agent claude-code --dry-run          # 仅预览
hermes import-agent codex --source /path/to/.codex # 自定义位置
hermes import-agent claude-code --overwrite --yes  # 替换冲突项，跳过提示
```

## 会导入哪些内容

### Claude Code（`~/.claude`）

| Claude Code | Hermes |
|---|---|
| `CLAUDE.md`（全局指令） | `~/.hermes/memories/MEMORY.md` 中的记忆条目 |
| `settings.json` → `permissions.allow`（`Bash(...)` 规则） | `config.yaml` 中的 `command_allowlist` |
| `settings.json` → `permissions.deny`（`Bash(...)` 规则） | `config.yaml` 中的 `approvals.deny` |
| `mcpServers`（来自 `~/.claude.json` 和 `settings.json`） | `config.yaml` 中的 `mcp_servers` |
| `skills/<name>/`（包含 `SKILL.md` 的目录） | `~/.hermes/skills/claude-code-imports/<name>/` |
| `commands/*.md`（斜杠命令） | 跳过并附提示 —— 请将其转换为技能 |

Claude 的 `Bash(npm run test:*)` 前缀规则会转换为 `npm run test*` 通配符。非 `Bash` 的权限规则（`Read(...)`、`WebFetch` 等）控制的是 Claude 特有的工具，会被报告为无法映射而非导入。

### Codex CLI（`~/.codex`）

| Codex CLI | Hermes |
|---|---|
| `AGENTS.md`（全局指令） | `~/.hermes/memories/MEMORY.md` 中的记忆条目 |
| `config.toml` → `[mcp_servers.*]` | `config.yaml` 中的 `mcp_servers` |
| `memories/*.md` | `~/.hermes/memories/MEMORY.md` 中的记忆条目 |
| `skills/<name>/`（包含 `SKILL.md` 的目录） | `~/.hermes/skills/codex-imports/<name>/` |

## 绝不会导入的内容

**API 密钥和凭证。** 凭证文件（`~/.claude/.credentials.json`、`~/.codex/auth.json`）从不读取，MCP 服务器的环境变量或名称看似机密的请求头（`*_TOKEN`、`*_API_KEY`、`Authorization` 等）会被剥离并在报告中列出，以便你自行审慎地重新添加。运行 `hermes setup` 来配置服务商，或将密钥添加到 `~/.hermes/.env`。

## 行为说明

- **始终先预览。** 该命令会在应用前打印完整计划；在非交互式会话中，除非传入 `--yes`，否则它会在预览处停止。
- **合并，而非替换。** 记忆条目会与现有的 `MEMORY.md` 去重；允许列表/拒绝列表模式会与 `config.yaml` 中已有的内容合并。
- **冲突默认跳过。** Hermes 中已存在的 MCP 服务器或技能会被报告为冲突；传入 `--overwrite` 即可替换它。
- **格式错误的文件不会中止运行。** 损坏的 `settings.json` 或 `config.toml` 会变为报告中的逐项错误，而其他所有内容仍会导入。
- 若来自 OpenClaw？请使用 [`hermes claw migrate`](../guides/migrate-from-openclaw.md)。
