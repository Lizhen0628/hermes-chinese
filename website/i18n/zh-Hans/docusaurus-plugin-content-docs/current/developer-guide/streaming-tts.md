---
title: "流式 TTS 内部机制"
description: "句子分块器、流式 provider ABC、能力矩阵，以及如何添加流式 TTS 服务商"
---

# 流式 TTS

Hermes 可以在 TTS 音频从服务商处到达时就开始流式播放，而无需等待完整音频生成完毕。此项能力用于语音模式（CLI/TUI 实时对话）、dashboard 的 speak-stream WebSocket，以及——通过网关的 `StreamingTTSConsumer`——任何选择启用流式音频的平台适配器。语音回复会在第一个子句之后就开始说话，而不是在整个生成 + 合成完成之后。

## 架构

流式管道由四部分组成：

1. **生产者**——LLM 在生成回复时逐块发出文本增量
2. **句子分块器**——`tools.tts_streaming.SentenceChunker` 累积增量、剔除 `<think>` 块（即使该块被拆分在多个增量之间），并冲刷出完整句子
3. **TTS 服务商**——一个注册的 `StreamingTTSProvider` 将每个句子转换为原始 PCM 块（服务商声明的 `sample_rate` 下的 int16 单声道）
4. **音频接收端**——本地播放使用 `sounddevice.OutputStream`（`tools.tts_tool_speaker.stream_tts_to_speaker`），或网关平台适配器的 `write_streaming_tts` 接缝（`gateway/streaming_tts_consumer.py`）

没有分块 API 的服务商仍可通过可靠的同步 `text_to_speech_tool` 路径获得逐*句子*的播放，因此 edge（默认）也能进行对话式交互。所有朗读文本都由 `tools.tts_text_normalize.prepare_spoken_text` 清洗（单一清洗器，适用于所有路径）。

## 如何选择服务商

默认情况下，当已配置的服务商（`tts.provider`）具有分块 API 时，调度器就使用该服务商进行流式传输——它绝不会仅仅为了获得流式能力而悄悄将你的语音换成其他服务商。

如需覆盖，请在 `config.yaml` 中设置 `tts.streaming.provider`：

- 服务商名称（`elevenlabs`、`gemini`、`openai`、`xai`）会固定使用该流式服务商
- `auto` 会按优先级列表 `elevenlabs → gemini → openai → xai` 依次尝试，使用第一个凭据可解析的服务商——这是显式选择启用“当前可用的最佳分块语音”

```yaml
tts:
  provider: gemini
  streaming:
    provider: gemini      # or "auto"
  gemini:
    model: gemini-2.5-flash-preview-tts
    voice: Kore
```

## 能力矩阵

| 服务商    | 传输方式                             | 分块 PCM | 凭据 |
|-------------|---------------------------------------|-------------|-------------|
| elevenlabs  | 分块 HTTP（`pcm_24000`）            | 是         | `ELEVENLABS_API_KEY` / `tts.elevenlabs` |
| openai      | 分块 HTTP（`with_streaming_response`、`pcm`） | 是 | `tts.openai.api_key` → 环境变量 → 托管网关 |
| gemini      | SSE（`streamGenerateContent?alt=sse`） | 是         | `GEMINI_API_KEY` / `GOOGLE_API_KEY` |
| xai         | WebSocket（`wss://api.x.ai/v1/tts`）   | 是         | xAI OAuth 或 `XAI_API_KEY` |
| edge、piper、kitten、neutts、mistral、minimax、deepinfra 等 | — | 否（逐句子同步回退） | 照常 |

所有凭据查找都通过 `resolve_provider_secret()`（config > env/.env > 凭据池）——绝不直接读取裸环境变量。流式响应体每个句子上限为 16 MiB，与同步服务商的有界上游响应体不变式保持一致。

## 添加新的流式服务商

1. 在 `tools/tts_streaming.py` 中子类化 `StreamingTTSProvider`
2. 设置 `sample_rate`（若非 int16 单声道，还需设置 `channels` / `sample_width`）
3. 实现 `available()`（纯探测——绝不安装任何东西）以及 `stream(self, text) -> Iterator[bytes]`，产生原始 PCM 块
4. 用 `@register("yourname")` 装饰
5. 在 `tests/tools/test_tts_streaming.py` 中添加测试

ABC 强制约定；注册表使服务商可被发现；调度器（`stream_tts_to_speaker`）和网关消费者会为你免费处理句子缓冲、停止事件和音频接收端。

## 网关流式（平台适配器）

`gateway/streaming_tts_consumer.py` 将智能体增量桥接到适配器的流式音频接缝。适配器可通过在 `BasePlatformAdapter` 上覆盖以下方法来选择启用：

- `supports_streaming_tts(chat_id, audio_format) -> bool`
- `begin_streaming_tts / write_streaming_tts / finish_streaming_tts /
  abort_streaming_tts`

它们全部默认为不支持/无操作，因此现有适配器不受影响。当某一轮的流式音频完成后，该轮的整文件自动 TTS 回复将被抑制（避免双重播放）；当流式传输在任何音频可听见之前失败时，网关会回退到传统的整文件语音回复。
