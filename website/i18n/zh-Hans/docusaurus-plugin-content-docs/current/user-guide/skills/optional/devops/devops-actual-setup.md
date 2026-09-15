---
title: "Actual Setup — 在 Hermes 中设置 Actual Computer（actual.inc）推理"
sidebar_label: "Actual Setup"
description: "在 Hermes 中设置 Actual Computer（actual.inc）推理"
---

{/* 此页面由 website/scripts/generate-skill-docs.py 从技能的 SKILL.md 自动生成。请编辑源 SKILL.md，而不是此页面。 */}

# Actual Setup

在 Hermes 中设置 Actual Computer（actual.inc）推理。

## 技能元数据

| | |
|---|---|
| 来源 | 可选 — 使用 `hermes skills install official/devops/actual-setup` 安装 |
| 路径 | `optional-skills/devops\actual-setup` |
| 版本 | `2.0.0` |
| 作者 | shl0ms + Hermes Agent |
| 许可证 | MIT |
| 平台 | linux、macos、windows |
| 标签 | `actual`、`actual-inc`、`provider`、`local-inference`、`relay`、`gguf`、`setup` |

## 参考：完整 SKILL.md

:::info
以下是此技能被触发时 Hermes 加载的完整技能定义。当技能处于激活状态时，这就是智能体所看到的指令。
:::

# Actual Computer Setup 技能

将 [actual.inc](https://actual.inc)（Actual Computer）设置为 Hermes 推理服务商。Actual 将用户自己的硬件转变为私有推理集群，并通过两种方式暴露一个兼容 OpenAI 的 API：位于 `https://api.actual.inc` 的托管端到端加密中继（使用 `ac_` 密钥进行身份验证），以及位于 `http://127.0.0.1:8080` 的本地设备守护进程（回环地址上无需身份验证）。此技能不会为用户安装 Actual 守护进程 — 设备授权需要由人在浏览器中完成。

## 何时使用

- 用户希望将 actual.inc 添加为推理服务商（云中继或本地）。
- 用户拥有 `ac_` 密钥，并希望让 Hermes 通过其 Actual 集群进行路由。
- 用户希望通过 Actual 守护进程实现完全本地、设备上的推理。
- 故障排除：Actual 请求因晦涩的 400 错误或空流而失败。

## 先决条件

- Hermes **原生支持 `actual` 服务商**（服务商 id 为 `actual`，别名为 `actual-computer`、`actualcomputer`、`aci`）。在当前 Hermes 上不要将 Actual 配置为 `custom_providers` / `providers.actual.*` 条目 — 内置服务商拥有该名称，并会自动处理 base-url 规范化、Responses 传输以及本地无身份验证。
- 中继模式：一个 Actual 账户和来自 https://actual.inc/user/keys 的 `ac_` 推理密钥。
- 本地模式：用户已安装守护进程（`curl -fsSL "https://actual.inc/install" | bash`），并通过运行一次 `actual` 并在浏览器中打开打印出的 `https://actual.inc/device?code=...` URL 完成了设备授权。将该 URL 转发给用户并**等待** — 绝不要编造电子邮件地址或替用户授权。代码 5 分钟后过期；重新运行 `actual` 获取新的代码。

## 如何运行

### 中继 / API 模式

1. 将密钥放入 `.env`（仅限机密信息 — 永远不要放在 config.yaml 中）：
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

1. 用户已安装并授权守护进程（参见先决条件）。
2. 下载并加载模型（授权后可通过脚本完成）：
   ```bash
   actual models search "qwen2.5 0.5b instruct gguf" --limit 8 --no-prompt
   # 下载必须指定明确的量化（否则返回 409 ambiguous_model_download）：
   actual models download "Qwen/Qwen2.5-0.5B-Instruct-GGUF/Q4_K_M"
   actual models list        # 记下已安装名称（与下载 id 不同）
   actual models load "qwen2.5-0.5b-instruct-q4_k_m"   # 按已安装名称加载
   ```
3. 将 Hermes 指向守护进程。带有回环主机的 `ACTUAL_BASE_URL` 会自动将内置服务商切换为本地无身份验证模式 — 无需密钥：
   将 `ACTUAL_BASE_URL=http://127.0.0.1:8080` 追加到 `~/.hermes/.env`，然后：
   ```bash
   hermes config set model.provider actual
   hermes config set model.default "INSTALLED_MODEL_NAME"
   ```
4. 验证（减少工具集 — 参见下方上下文窗口陷阱）：
   ```bash
   hermes chat -Q -q "Reply with exactly: LOCAL_OK" --provider actual -m INSTALLED_NAME -t file,web
   ```

## 快速参考

| 项目 | 值 |
|---|---|
| 托管中继 | `https://api.actual.inc/v1`（从裸主机名自动规范化） |
| 本地守护进程 | `http://127.0.0.1:8080/v1`（回环地址上无需身份验证） |
| 密钥环境变量 | `ACTUAL_API_KEY`（`ac_...`） |
| Base URL 环境变量 | `ACTUAL_BASE_URL`（回环主机 ⇒ 本地无身份验证模式） |
| 服务商 id / 别名 | `actual` / `actual-computer`、`actualcomputer`、`aci` |
| 传输 | Responses API（`codex_responses`）— 内置，不要覆盖 |
| 集群锁定 | 通过 config.yaml 中的 `providers.actual.extra_headers` 设置 `X-Cluster-ID` 标头 |
| 模型大小指南 | 0.5B Q4_K_M 约 470MB（玩具级），7-8B Q4_K_M 约 4.5GB（日常使用），32B 约 20GB |

## 陷阱

1. **reasoning_effort 陷阱（自原生服务商起已由 Hermes 处理）。**
   Actual 的 SGLang/vLLM 后端仅接受 `none/low/medium/high/max`；
   `xhigh`/`ultra` 过去会因晦涩的
   `Expecting value: line 1 column 1 (char 0)`（被包装的 HTTP 400）而失败。内置服务商在传输时会将 `xhigh→high` 和 `ultra→max` 进行钳制。如果在旧的 Hermes 上请求仍然以这种方式返回 400，请在 config.yaml 中设置按模型的上限：
   `agent.reasoning_overrides.<model>: high`。
2. **小型本地模型上的上下文窗口溢出。** Hermes 的默认工具集约有 26k token 的 schema，加上约 9k token 的系统提示。以 32k 上下文加载的模型在第一个回合之前就会溢出，而 llama.cpp 系列服务器会发出一个裸的 `data: [DONE]` — Hermes 会报告
   `Provider returned an empty stream with no finish_reason`。这不是
   SSE bug。解决方法：限制工具（`-t file,web`）、以更大的 `n_ctx` 加载模型，或为完整工具集选择一个 >=64k 上下文的模型。
   上游跟踪：＃51448（不要提交新 issue；在那里添加证据）。
   相关但不同：＃65631（HTTP-200 SSE 携带 400）、＃56516
   （仅推理流）。
3. **下载 id 与已安装名称。** `actual models download` 接受
   `repo/QUANT` 并且在未明确量化时返回 409；
   `actual models load` 接受来自 `actual models list` 的已安装名称。
4. **推理模型返回空内容。** GLM/Qwen 推理变体会
   在单独的 `reasoning` 字段中发出思考内容，并可能将较小的
   输出预算全部消耗在推理上。在假定失败之前，请检查服务器端的输出默认值。
5. **不要创建名为 `actual` 的自定义服务商。** 较旧的设置指南
   （原生支持之前）会写入 `providers.actual.*` 配置块。在
   当前 Hermes 上，内置服务商拥有该名称；过时的自定义块
   会被忽略或产生冲突。请移除它们并使用上面的环境变量 + model.provider
   流程。

## 验证

```bash
# 中继：
hermes chat -Q -q "Reply with exactly: ACTUAL_OK" --provider actual -m MODEL
# 本地（小型模型 — 减少工具集）：
hermes chat -Q -q "Reply with exactly: LOCAL_OK" --provider actual -m MODEL -t file,web
# 服务商状态（本地无身份验证显示 key_source=local-offline）：
hermes status
```

有关其他兼容 OpenAI 的客户端（例如 OpenCode），请参见
`references/opencode.md`。
