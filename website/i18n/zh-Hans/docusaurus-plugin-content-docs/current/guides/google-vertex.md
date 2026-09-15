---
sidebar_position: 15
title: "Google Vertex AI"
description: "在 Google Cloud Vertex AI 上使用 Gemini 运行 Hermes Agent — OAuth2 服务账号或 ADC、GCP 计费与配额、无需静态 API 密钥"
---

# Google Vertex AI

Hermes Agent 通过 Vertex 的 OpenAI 兼容端点，支持在 **Google Cloud Vertex AI 上使用 Gemini 模型**。与 [Google AI Studio 服务商](/guides/google-gemini)（针对 `generativelanguage.googleapis.com` 使用静态 API 密钥）不同，Vertex 提供**企业级速率限制与 GCP 计费/抵扣额度**，当你希望 Gemini 用量计入 Google Cloud 账户而非 AI Studio 密钥时，它是合适的选择。

:::info Vertex 使用 OAuth2 认证，而非 API 密钥
标准端点上的 Vertex **没有静态 API 密钥**。每个请求都需要一个短期有效的 **OAuth2 访问令牌**（有效期约 1 小时），由服务账号 JSON 或应用默认凭据（ADC）签发。Hermes 会为你铸造并**自动刷新**这些令牌——你永远无需手动粘贴令牌。这就是为什么把临时令牌粘贴到自定义服务商的 `api_key` 字段行不通：它会在会话中途过期。
:::

## 前置条件

- **一个 Google Cloud 项目**，已**启用 Vertex AI API** 且计费正常。
- **凭据**，以下之一：
  - 具备 `roles/aiplatform.user` 角色的**服务账号 JSON** 密钥文件，或
  - 通过 `gcloud auth application-default login` 获取的**应用默认凭据（ADC）**（或在 GCP 虚拟机上运行时使用元数据服务器）。
- **`google-auth`** —— 首次选择 Vertex 时会自动安装（延迟安装）。如果安装失败，运行 `hermes setup` 修复托管安装。

## 快速开始

```bash
# 方式 A — 服务账号 JSON（推荐用于服务器 / 网关）
echo "VERTEX_CREDENTIALS_PATH=/path/to/service-account.json" >> ~/.hermes/.env

# 方式 B — 应用默认凭据（适合本地开发）
gcloud auth application-default login

# 选择 Vertex 作为服务商
hermes model
# → 选择 "More providers..." → "Google Vertex AI"
# → 输入你的 GCP 项目 ID（或留空以使用凭据中的项目）
# → 选择区域（默认：global）
# → 选择一个 Gemini 模型

# 开始对话
hermes chat
```

## 配置

Vertex 按敏感程度拆分其设置：

- **凭据路径**是指向机密的指针，位于 `~/.hermes/.env`。
- **项目 ID 和区域**是非机密的路由设置，位于 `~/.hermes/config.yaml`。

`~/.hermes/.env`：

```bash
# 以下之一（按此顺序检查）；两者都省略则使用 ADC：
VERTEX_CREDENTIALS_PATH=/path/to/service-account.json
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json
```

`~/.hermes/config.yaml`：

```yaml
model:
  default: google/gemini-3-flash-preview
  provider: vertex

vertex:
  project_id: my-gcp-project   # 留空 → 使用凭据中嵌入的项目
  region: global               # Gemini 3.x 预览版必须使用 "global"
```

:::tip 环境变量优先于 config.yaml
`VERTEX_PROJECT_ID` 和 `VERTEX_REGION` 会覆盖 `config.yaml` 中的 `vertex.project_id` / `vertex.region` 值。用它们做单 shell 覆盖；把持久设置保留在 `config.yaml` 中。
:::

### 认证如何工作

1. Hermes 按此顺序解析凭据：`VERTEX_CREDENTIALS_PATH` → `GOOGLE_APPLICATION_CREDENTIALS` → ADC。
2. 它铸造一个 OAuth2 访问令牌（`cloud-platform` 作用域）并缓存，当令牌距过期时间不足 5 分钟时刷新。
3. 令牌交给一个指向 Vertex 端点的标准 OpenAI 客户端：
   ```text
   https://aiplatform.googleapis.com/v1beta1/projects/{project}/locations/{region}/endpoints/openapi
   ```
   区域位置则改用 `{region}-aiplatform.googleapis.com` 主机。
4. 如果会话运行时间超过令牌有效期，且某个请求返回 `401`，Hermes 会重新铸造令牌并自动重试。在长时间运行的网关上，如果 ADC 的刷新令牌本身已过期，Hermes 会在配置了服务账号 JSON 时回退到它。

## 可用模型

Vertex 要求模型 ID 带 `google/` 厂商标识前缀。`hermes model` 选择器提供：

| 模型 | ID |
|-------|----|
| Gemini 3.8 Flash | `google/gemini-3.8-flash` |
| Gemini 3.7 Flash | `google/gemini-3.7-flash` |
| Gemini 3.1 Pro Preview | `google/gemini-3.1-pro-preview` |
| Gemini 3 Pro Preview | `google/gemini-3-pro-preview` |
| Gemini 3 Flash Preview | `google/gemini-3-flash-preview` |
| Gemini 3.1 Flash Lite Preview | `google/gemini-3.1-flash-lite-preview` |
| Gemini 2.5 Pro | `google/gemini-2.5-pro` |
| Gemini 2.5 Flash | `google/gemini-2.5-flash` |

:::note Gemini 3.x 使用 `global` 区域
Gemini 3.x 预览模型通过 `global` 端点提供服务。区域端点（`us-central1` 等）可能会对其返回 404。除非有特定理由固定某个区域，否则保持 `region: global`。
:::

## 会话中途切换模型

```text
/model google/gemini-3-pro-preview
/model google/gemini-3-flash-preview
```

`/model` 在已配置的服务商和模型之间切换；它不会收集新凭据。请先用 `hermes model` 配置 Vertex。

## 推理 / 思考

Vertex 通过 OpenAI 兼容接口暴露 Gemini 的思考预算。Hermes 会自动把推理强度设置映射到 `extra_body.google.thinking_config`，因此 `reasoning_effort` 的工作方式与其他 Gemini 接口相同。

## 诊断

```bash
hermes doctor
```

doctor 会报告是否可解析 Vertex 凭据（服务账号路径或 ADC），以及服务商是否已配置。

## 故障排查

### "Vertex AI credentials could not be resolved"

Hermes 既未找到服务账号 JSON，也没有可用的 ADC。要么在 `~/.hermes/.env` 中设置 `VERTEX_CREDENTIALS_PATH`，要么运行 `gcloud auth application-default login`。如果你的项目未嵌入凭据中，请在 `config.yaml` 中设置 `vertex.project_id`。

### 未安装 `google-auth`

首次选择 Vertex 服务商时，Hermes 会延迟安装它。如果失败，运行 `hermes setup` 修复托管安装。

### Gemini 3.x 模型返回 404

你很可能使用了区域端点。在 `config.yaml` 的 `vertex:` 部分设置 `region: global`（或取消 `VERTEX_REGION`）。

### 403 / 权限被拒绝

服务账号（或你的 ADC 身份）需要项目上的 `roles/aiplatform.user` 角色，且该项目必须启用 Vertex AI API。

## 相关

- [Google Gemini (AI Studio)](/guides/google-gemini) —— 使用静态 API 密钥的 Gemini，无需 GCP
- [AWS Bedrock](/guides/aws-bedrock) —— 另一个原生云服务商集成
- [AI 服务商](/integrations/providers)
- [配置](/user-guide/configuration)
