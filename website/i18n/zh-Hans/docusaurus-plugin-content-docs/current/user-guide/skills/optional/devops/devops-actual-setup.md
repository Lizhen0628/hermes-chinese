---
title: "Actual Setup — 在 Hermes 中设置 Actual Computer (actual.inc) 推理"
sidebar_label: "Actual Setup"
description: "在 Hermes 中设置 Actual Computer (actual.inc) 推理"
---

{/* 本页面由 website/scripts/generate-skill-docs.py 根据该技能的 SKILL.md 自动生成。请编辑源文件 SKILL.md，而非本页面。 */}

# Actual Setup

在 Hermes 中设置 Actual Computer (actual.inc) 推理。

## 技能元数据

| | |
|---|---|
| 来源 | 可选 — 使用 `hermes skills install official/devops/actual-setup` 安装 |
| 路径 | `optional-skills/devops\actual-setup` |
| 版本 | `2.0.0` |
| 作者 | shl0ms + Hermes Agent |
| 许可证 | MIT |
| 平台 | linux, macos, windows |
| 标签 | `actual`, `actual-inc`, `provider`, `local-inference`, `relay`, `gguf`, `setup` |

## 参考：完整的 SKILL.md

:::info
以下是 Hermes 在该技能被触发时加载的完整技能定义。这就是技能激活时智能体看到的指令内容。
:::

# Actual Computer Setup 技能

将 [actual.inc](https://actual.inc)（Actual Computer）设置为 Hermes 推理服务商。Actual 将用户自己的硬件变成一个私有推理集群，并以两种方式暴露兼容 OpenAI 的 API：一个托管的端到端加密中继，位于 `https://api.actual.inc`（使用 `ac_` 密钥认证）；以及一个本地设备上的守护进程，位于 `http://127.0.0.1:8080`（本地回环上无需认证）。本技能不会替用户安装 Actual 守护进程——设备授权需要有人在浏览器中操作。

## 何时使用

- 用户想要添加 actual.inc 作为推理服务商（云端中继或本地）。
- 用户拥有 `ac_` 密钥，并希望将 Hermes 路由到他们的 Actual 集群。
- 用户想要通过 Actual 守护进程实现完全本地的设备内推理。
- 故障排查：Actual 请求因难以理解的 400 错误或空流而失败。

## 前提条件

- Hermes 具有**一流的 `actual` 服务商支持**（服务商 id 为 `actual`，别名 `actual-computer`、`actualcomputer`、`aci`）。在当前 Hermes 上，不要将 Actual 配置为 `custom_providers` / `providers.actual.*` 条目——内置服务商占用了该名称，并自动处理 base-url 规范化、Responses 传输以及本地无需认证。
- 中继模式：一个 Actual 账户，以及来自 https://actual.inc/user/keys 的 `ac_` 推理密钥。
- 本地模式：用户已安装守护进程
  （`curl -fsSL "https://actual.inc/install" | bash`）并通过运行一次 `actual`、在浏览器中打开打印出的
  `https://actual.inc/device?code=...` URL 完成了设备授权。将该 URL 转达给用户并**等待**——绝不要编造邮箱或替他们授权。验证码 5 分钟后过期；重新运行 `actual` 获取新的验证码。

## 如何运行

### 中继 / API 模式

1. 将密钥放入 `.env`（仅存放机密——绝不要放在 config.yaml）：
   将 `ACTUAL_API_KEY=ac_...` 追加到 `~/.hermes/.env`。
2. 使用 `terminal` 验证密钥并发现模型：
   ```bash
   curl -s https://api.actual.inc/v1/models -H "Authorization: Bearer $ACTUAL_API_KEY"
   ```
3. 选择服务商 + 模型：
   ```bash
   hermes config set model.provider actual
   hermes config set model.default "MODEL_ID_FROM_DISCOVERY"
   ```
4. 端到端验证：
   ```bash
   hermes chat -Q -q "Reply with exactly: ACTUAL_OK" --provider actual -m MODEL_ID
   ```

### 本地模式

1. 人类已安装并授权守护进程（见前提条件）。
2. 下载并加载模型（授权后即可脚本化执行）：
   ```bash
   actual models search "qwen2.5 0.5b instruct gguf" --limit 8 --no-prompt
   # 下载必须指定明确的量化（否则会 409 ambiguous_model_download）：
   actual models download "Qwen/Qwen2.5-0.5B-Instruct-GGUF/Q4_K_M"
   actual models list        # 记下已安装的名称（与下载 id 不同）
   actual models load "qwen2.5-0.5b-instruct-q4_k_m"   # 用已安装名称加载
   ```
3. 将 Hermes 指向守护进程。带有回环主机的 `ACTUAL_BASE_URL` 会自动将内置服务商切换为本地无需认证模式——无需密钥：
   将 `ACTUAL_BASE_URL=http://127.0.0.1:8080` 追加到 `~/.hermes/.env`，然后：
   ```bash
   hermes config set model.provider actual
   hermes config set model.default "INSTALLED_MODEL_NAME"
   ```
4. 验证（精简工具集——见下方上下文窗口陷阱）：
   ```bash
   hermes chat -Q -q "Reply with exactly: LOCAL_OK" --provider actual -m INSTALLED_NAME -t file,web
   ```

## 快速参考

| 事项 | 值 |
|---|---|
| 托管中继 | `https://api.actual.inc/v1`（从裸主机自动规范化） |
| 本地守护进程 | `http://127.0.0.1:8080/v1`（本地回环上无需认证） |
| 密钥环境变量 | `ACTUAL_API_KEY` (`ac_...`) |
| Base URL 环境变量 | `ACTUAL_BASE_URL`（回环主机 ⇒ 本地无需认证模式） |
| 服务商 id / 别名 | `actual` / `actual-computer`、`actualcomputer`、`aci` |
| 传输 | Responses API (`codex_responses`) — 内置，不要覆盖 |
| 集群固定 | 通过 config.yaml 中的 `providers.actual.extra_headers` 设置 `X-Cluster-ID` 头 |
| 模型大小指南 | 0.5B Q4_K_M 约 470MB（玩具级），7-8B Q4_K_M 约 4.5GB（日常使用），32B 约 20GB |

## 陷阱

1. **reasoning_effort 陷阱（自一流服务商起由 Hermes 处理）。**
   Actual 的 SGLang/vLLM 后端只接受 `none/low/medium/high/max`；
   `xhigh`/`ultra` 过去会以难以理解的
   `Expecting value: line 1 column 1 (char 0)`（包装后的 HTTP 400）失败。内置服务商会在传输时将 `xhigh→high` 和 `ultra→max` 进行钳制。如果在旧版 Hermes 上请求仍以这种方式返回 400，请设置按模型的上限：
   config.yaml 中的 `agent.reasoning_overrides.<model>: high`。
2. **小型本地模型上的上下文窗口溢出。** Hermes 的默认工具集约为 26k tokens 的 schema，加上约 9k tokens 的系统提示。采用 32k 上下文加载的模型在第一个回合之前就会溢出，而 llama.cpp 系列服务器会发出一个裸 `data: [DONE]`——Hermes 报告
   `Provider returned an empty stream with no finish_reason`。这不是 SSE bug。修复方法：限制工具（`-t file,web`）、用更大的 `n_ctx` 加载模型，或者为完整工具集选用具有 >=64k 上下文的模型。
   上游追踪：#51448（不要提交新 issue；在该处添加证据）。
   相关但不同：#65631（HTTP-200 SSE 携带 400），#56516
   （仅推理的流）。
3. **下载 id 与已安装名称。** `actual models download` 接受
   `repo/QUANT`，未明确指定量化时会 409；
   `actual models load` 接受来自 `actual models list` 的已安装名称。
4. **推理模型返回空内容。** GLM/Qwen 推理变体会在单独的 `reasoning` 字段中输出思考过程，并可能将一小部分输出预算完全耗费在推理上。在假设失败之前，请检查服务器端的输出默认值。
5. **不要创建名为 `actual` 的自定义服务商。** 较旧的设置指南
   （在一流支持之前）会写入 `providers.actual.*` 配置块。在当前
   Hermes 上，内置服务商占据该名称；陈旧的配置块会被忽略或冲突。请移除它们，并使用上述环境变量 + model.provider
   流程。

## 验证

```bash
# 中继：
hermes chat -Q -q "Reply with exactly: ACTUAL_OK" --provider actual -m MODEL
# 本地（小型模型——精简工具集）：
hermes chat -Q -q "Reply with exactly: LOCAL_OK" --provider actual -m MODEL -t file,web
# 服务商状态（本地无需认证会显示 key_source=local-offline）：
hermes status
```

有关其他兼容 OpenAI 的客户端（例如 OpenCode），请参阅
`references/opencode.md`。
