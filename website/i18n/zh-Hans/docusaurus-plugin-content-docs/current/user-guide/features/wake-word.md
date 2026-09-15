---
sidebar_position: 11
title: "唤醒词"
description: "免提的“Hey Hermes”唤醒词——通过说话启动语音会话，就像“Hey Siri”那样"
---

# 唤醒词（“Hey Hermes”）

唤醒词让 Hermes 在 CLI、TUI 和桌面应用中成为一个免提助手：开启一项设置后，Hermes 会在后台监听一个口头触发短语。说出它，Hermes 就会启动一个新会话、打开麦克风，通过常规的[语音管线](/user-guide/features/voice-mode)捕获你的命令，并给出回答——就像“Hey Siri”或“Alexa”一样。用 `surface` 来选择由哪一个来监听。

检测**完全在设备本地**运行。始终在线的监听器只关注唤醒短语；在你真正对智能体说出命令之前，不会有任何音频离开你的机器。

## 工作原理

1. 在 `wake_word.enabled: true` 时（或执行 `/wake on` 之后），一个轻量的热词检测器会在你配置的输入设备上监听；当 `wake_word.input_device` 未设置时，则使用进程默认麦克风。
2. 当它听到唤醒短语时，会暂停自身（释放麦克风），启动一个新会话，并使用语音模式的静音检测录制一段话语。
3. 你的语音会被转录并发送给智能体。在它回复之后，监听器会自动恢复并等待下一个唤醒词。

它**默认关闭**——在你开启之前，不会有任何东西在监听。

在桌面应用中，免提语音对话可以通过直接**说“stop”**（或“never mind”、“goodbye”、“cancel”、“that's all”）来结束——这个口头命令会结束对话，而不会被发送给智能体。只有整段话语就是停止命令时才会匹配，因此像“stop the docker container”这样的真实请求仍会正常传递。



## 远程桌面（客户端采集）

当桌面应用连接到**远程** Hermes 后端（例如一台无头 Docker 主机或另一个房间里的机器）时，后端通常**没有麦克风**。此时服务端的 PortAudio 会失败，并显示“Failed to open the wake-word microphone.”

针对这种情况，Hermes 支持**客户端采集**：

1. 桌面端以 `capture: client` 来启用唤醒（当后端没有本地输入设备时，GUI 会自动如此；也可按下文显式设置）。
2. openWakeWord 仍然**在后端**运行（相同的引擎、相同的模型）。
3. 桌面端打开**本地的 Mac/PC 麦克风**，重采样为 16 kHz 单声道 int16，并通过 `wake.feed` RPC 流式发送短帧。
4. 检测到时，后端像往常一样发出 `wake.detected`；桌面端则在客户端麦克风上启动常规语音管线。

```yaml
wake_word:
  enabled: true
  capture: auto    # auto | local | client
  # auto   — 使用本地 PortAudio，除非桌面端以 client_capture 启用
  # local  — 始终打开后端麦克风（CLI/TUI 默认）
  # client — 始终期望来自桌面端的 wake.feed PCM（便于远程使用）
```

桌面 GUI 总是在 `wake.start` 时传入 `client_capture: true`，因此没有麦克风的远程后端会自动以客户端模式启用。CLI 和 TUI 会保持本地采集，除非你显式设置 `capture: client`。

隐私说明：使用客户端采集时，唤醒 PCM 会通过经过身份验证的桌面端↔后端 WebSocket 传输（与会话其余部分相同的通道）。检测仍然不会把音频发送给第三方唤醒 API；引擎就在后端进程本地。

## 引擎

| 引擎 | 费用 | API key | 说明 |
|--------|------|---------|-------|
| **openWakeWord**（默认） | 免费 | 无 | 本地 ONNX 模型。内置一个 **“hey hermes”** 模型（默认）；也支持 `hey_jarvis`、`alexa`、`hey_mycroft`、……以及自定义模型 |
| **sherpa** | 免费 | 无 | **开放词汇**——无需任何训练即可检测任意输入短语。小型英语模型会在首次使用时自动下载（约 13 MB） |
| **Porcupine** | 免费额度 / 付费 | `PORCUPINE_ACCESS_KEY` | Picovoice 引擎；内置关键词 + 自定义 `.ppn` 文件 |

默认短语是 **“hey hermes”**——Hermes 内置了对应的模型，因此开箱即用、无需训练。（首次使用时，openWakeWord 会下载其共享的特征提取模型——一次很小的下载。）

在你第一次启用唤醒词时，两者都会懒安装（用 `--include-desktop` 进行的桌面安装会预先安装它们，因此“耳朵”会立即可用）。若想提前安装：

```bash
cd ~/.hermes/hermes-agent && uv pip install -e ".[wake]"
```

## 快速开始

```bash
# 在交互式 `hermes` 会话中：
/wake on        # 开始监听（首次使用时安装引擎）
/wake status    # 显示短语、服务商和状态
/wake off       # 停止监听
```

在桌面应用中，点击输入框中的耳朵图标。

开关即设置：打开或关闭唤醒词 —— 通过 `/wake` 或桌面耳朵按钮 —— 也会将 `wake_word.enabled` 写入 `~/.hermes/config.yaml`，因此你的选择会跨会话持久化。你也可以手动修改：

```yaml
wake_word:
  enabled: true
```

## 配置

```yaml
wake_word:
  enabled: false
  surface: auto               # 可用界面："auto" | "cli" | "tui" | "gui"
  input_device: null           # PortAudio 输入索引或设备名子串；null = 进程默认
  capture: auto               # auto | local | client — PCM 采集位置（见远程桌面）
  provider: openwakeword      # "openwakeword"（免费，本地）| "sherpa"（免费，任意短语）| "porcupine"
  phrase: "hey hermes"        # 仅作展示标签 — 检测由下方的模型/关键词决定
  sensitivity: 0.6            # 0.0-1.0 — 越高 = 越严格（误触发更少），在所有引擎中保持一致
  confirmation_frames: 3      # 仅 openWakeWord — 触发所需的连续超阈值帧数
  start_new_session: true     # 唤醒时开始新会话 vs. 继续当前会话
  openwakeword:
    model: hey_hermes         # 内置默认值；或内置名称，或自定义 .onnx/.tflite 的路径
    inference_framework: ""   # ""（自动）| "onnx" | "tflite"
  porcupine:
    keyword: jarvis           # 内置关键词或自定义 .ppn 的路径
```

`sensitivity`、`phrase` 和 `start_new_session` 对两个引擎都适用。`openwakeword` 和 `porcupine` 块选择实际的检测模型。

`input_device` 直接传递给唤醒监听器的 PortAudio（`sounddevice`）流。使用数字设备索引或无歧义的设备名子串。此设置仅更改唤醒词采集；桌面按键说话仍使用桌面应用的麦克风路径。

### 减少环境语音中的误触发

openWakeWord 一次对一个短（约 80ms）音频帧进行评分，因此后台对话中的杂散音素偶尔会使单帧超过阈值并意外触发唤醒词。有两个旋钮控制这一点：

- **`confirmation_frames`**（默认 `3`，仅 openWakeWord）—— 唤醒触发前所需的*连续*超阈值帧数。真正的“hey hermes”会在多个帧中保持高分；环境杂音只会在一个帧中突增。如果你在嘈杂房间中仍遇到误触发，请调高它（例如 `4`–`5`）；代价是额外几十毫秒的延迟。`1` 恢复旧的首帧即触发行为。
- **`sensitivity`**（默认 `0.6`）—— 检测阈值，`0.0`–`1.0`。越高越严格（误触发更少）。此方向在**所有**引擎中一致 —— 对 openWakeWord 是原始每帧分数阈值，对 sherpa 映射到关键词阈值，对 Porcupine 则内部反转，因此“越高 = 越严格”在那里也成立。`0.6` 默认值高于 openWakeWord 宽松的 `0.5` 基线，后者会让“hey hor”这类近似发音通过；如果仍有误触发，请向 `0.8` 调高；如果真正的“hey hermes”话语被漏掉，则调低。

`sherpa` 和 `porcupine` 引擎在内部解码整个短语，因此没有单帧突增问题，并忽略 `confirmation_frames`（但它们仍遵循 `sensitivity`）。

`inference_framework` 选择 openWakeWord 后端。留空（默认）让 Hermes 按平台选择：**Apple Silicon 上使用 tflite**，其他地方使用 onnx。openWakeWord 的 onnx 后端在 macOS ARM64 上返回接近零的分数（[openWakeWord#336](https://github.com/dscripka/openWakeWord/issues/336)），因此在那里固定为 `onnx` 的监听器会武装、显示为正在监听，却永远不会触发。tflite 后端在 macOS 上需要 `ai-edge-litert`，Hermes 会随其他唤醒词依赖按需安装。

### surfaces（CLI、TUI、GUI）

唤醒词在全部三种 Hermes surface 中都可用，而 `surface` 决定哪一个 surface 拥有监听器，并在触发时打开新会话：

| `surface` | 行为 |
|-----------|----------|
| `auto`（默认） | 所有本地 surface 均可参与；最先完成的那个拥有监听器。 |
| `cli` | 仅经典 `hermes` CLI。 |
| `tui` | 仅 `hermes --tui`。 |
| `gui` | 仅桌面应用。 |

检测器是端上运行的，并且为单麦克风模式，因此同一时间只有一个 surface 监听，即使 Hermes surface 运行在彼此独立的进程中也是如此。所有权是粘性的：第一个取得资格的声明者会一直保留监听器，直到它停止、断开连接或进程退出。Hermes 不会静默地故障转移到另一个打开的 surface 上。当你想固定所有权时，请设置 `surface`，而不是使用先到先得。

TUI 和桌面 GUI 共享同一个 Python 后端（`tui_gateway`），它在服务器端运行检测器，并在命令录制时将麦克风让给语音采集。

## 使用其他唤醒短语

"Hey Hermes" 开箱即用——内置的 openWakeWord 模型
（`model: hey_hermes`）是默认值。如果想用别的短语唤醒，最简单的方式是使用开放词汇引擎：

### 选项 A — sherpa（任意短语，无需训练）

输入你想要的短语；它会在运行时被分词——"hey coder"、"computer"、"wake up neo"，任何都行：

```yaml
wake_word:
  enabled: true
  provider: sherpa
  phrase: "hey coder"        # 检测键 — 只需输入你的短语
```

小型英语 KWS 模型（约 13 MB）会在首次使用时下载一次。每个配置档都可以设置自己的短语——对运行的每个配置档来说就是 "hey \<配置档\>"。

### 唤醒特定配置档（桌面端）

使用 sherpa 引擎，一个监听器就能唤醒任何配置档。每个在配置中有
`wake_word.enabled: true` 的配置档都会被自动登记；未设置时，其短语默认为 `hey <配置档名>`。说出某个配置档的短语后，桌面应用会实时切换到那个配置档，在那里打开一个新会话，并启动免手动语音：

- "hey hermes" → 默认配置档
- "hey coder" → `coder` 配置档
- "hey trader" → `trader` 配置档

在监听器所在配置档上设置 `wake_word.profile_routing: false` 可选择退出，仅监听它自己的短语。CLI 和 TUI 是单配置档进程：属于另一个配置档的唤醒短语会打印切换命令（`hermes -p <配置档>`），而不是进行路由。

名称是通过其英语子词发音按声学匹配的：名字发音清晰、音节在 2 个及以上的双词短语效果最好。过短的名字、大量非英语的音系，或两个发音相似的配置档都会降低准确率——如有需要，可为每个配置档调优 `sensitivity`。

### 选项 B — openWakeWord（免费的训练模型）

指定一个内置模型（`hey_jarvis`、`alexa`、`hey_mycroft`、……），或者训练一个自定义模型（在免费/Colab GPU 上约 75–90 分钟）以获得最大稳健性，把 `.onnx` 文件放在某个位置，然后引用它：

```yaml
wake_word:
  enabled: true
  provider: openwakeword
  phrase: "computer"
  openwakeword:
    model: ~/.hermes/wakewords/computer.onnx   # 或像 hey_jarvis 这样的内置名称
```

训练参考：

- [openWakeWord](https://github.com/dscripka/openWakeWord)
- [2026 训练 Colab](https://github.com/alfiedennen/openwakeword-colab-2026)

:::tip 选择一个有辨识度的短语
不会与日常用语冲突的唤醒短语泛化效果最好。带罕见词的双音节短语（"hermes" 符合）胜过 "hello" 或 "stop" 之类的常用词。
:::

### 选项 C — Porcupine（几秒钟内自定义关键词）

在 [Picovoice 控制台](https://console.picovoice.ai/) 创建一个 "Hey Hermes" 关键词，下载 `.ppn`，然后：

```yaml
wake_word:
  enabled: true
  provider: porcupine
  phrase: "hey hermes"
  porcupine:
    keyword: ~/.hermes/wakewords/hey_hermes.ppn
```

在 `~/.hermes/.env` 中设置你的访问密钥：

```bash
PORCUPINE_ACCESS_KEY=your-key-here
```

## 要求

- 一个可用的麦克风，以及 `sounddevice` + `numpy` 音频栈（与语音模式共用）。
- 一个用于转录口令的 STT 服务商——本地 `faster-whisper` 开箱即用；完整服务商列表参见[语音模式](/user-guide/features/voice-mode)。
- 一个用于朗读回复的 TTS 服务商（默认的 `edge-tts` 无需密钥即可使用）。唤醒流程是完全免手动的，因此开关在 STT 和 TTS 都就绪之前拒绝启用——`hermes tools`（Voice 部分）可完成设置。
- 唤醒引擎依赖（会自动安装，或 `hermes-agent[wake]`）。

如果监听器无法启动，`/wake status` 会准确报告缺失了什么。

### 显示"正在监听"但从不唤醒（macOS）

macOS 是按**进程**授予麦克风访问权限的。STT 在桌面应用中工作证明*渲染器*有麦克风访问权限——唤醒监听器运行在 Python *后端*，需要它自己的授权。没有授权时，CoreAudio 会交给后端一个"工作正常"的流，但它只传回静音，于是那只耳朵显示正在监听，但短语永不被触发。Hermes 会检测到这一点（`/wake status` 显示 "mic delivers only silence"；桌面那只耳朵的工具提示带有相同的提示）。修复方法：系统设置 → 隐私与安全性 → 麦克风 → 启用 Hermes 后端（它可能显示为你的终端、`python` 或 Hermes），然后关闭再打开唤醒词。

### 显示"正在监听"但收到静音（Windows）

桌面按住即说和唤醒词采集使用不同的麦克风路径。按住即说使用桌面应用的浏览器采集，而唤醒词监听器在 Python 后端打开一个 PortAudio 流。可能一方工作正常，而另一方选中了一个静音或不可用的 Windows 输入。

`/wake status` 会报告所选的输入设备和 Windows 音频主机 API。当它报告静音时，请将 `wake_word.input_device` 设为可用 PortAudio 输入的数字索引或一个明确无歧义的名称，然后关闭再打开唤醒词：

```bash
hermes config set wake_word.input_device "Microphone Array"
```

使用 `null` 可恢复到进程默认：

```bash
hermes config set wake_word.input_device null
```

## 说明与限制

- **仅限本地 surface。** 唤醒词运行在 CLI、TUI 和桌面 GUI 中——任何有本地麦克风的地方。它不在消息网关（Telegram、Discord、……）中运行，因为那里没有麦克风。
- **同一时间只用一支麦克风。** 检测器在命令录制期间释放麦克风，并在轮次结束后回收它，这样就不会与语音采集相冲突。
- **隐私。** 热词检测是本地进行的。若出现误触发，请调高 `sensitivity`；若它听不到你，请调低。
