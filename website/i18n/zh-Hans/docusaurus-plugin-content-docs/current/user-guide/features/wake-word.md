---
sidebar_position: 11
title: "唤醒词"
description: "免手动“Hey Hermes”唤醒词——像“Hey Siri”一样通过说话来启动语音会话"
---

# 唤醒词（“Hey Hermes”）

唤醒词让 Hermes 在 CLI、TUI 和桌面应用中成为免手动助手：开启一项设置后，Hermes 会在后台聆听口头触发短语。说出它，Hermes 就会启动一个新的会话，打开麦克风，通过常规的[语音管线](/user-guide/features/voice-mode)捕获你的命令，并作出回答——完全就像“Hey Siri”或“Alexa”。使用 `surface` 来选择由哪一个进行聆听。

检测**完全在设备本地**运行。常驻监听器只侦测唤醒短语；在你真正对智能体说出命令之前，不会有任何音频离开你的机器。

## 工作原理

1. 当 `wake_word.enabled: true`（或执行 `/wake on` 之后），一个轻量级热词检测器会在你配置的输入设备上监听；若未设置 `wake_word.input_device`，则使用进程默认麦克风。
2. 当它听到唤醒短语后，会暂停自身（释放麦克风），启动一个新的会话，并使用语音模式的静音检测录制一段话语。
3. 你的语音会被转写并发送给智能体。在它回复之后，监听器会自动恢复并等待下一个唤醒词。

它**默认关闭**——在你开启之前，不会有任何监听。

在桌面应用中，免手动语音对话可以通过简单地**说“stop”**（或“never mind”、“goodbye”、“cancel”、“that's all”）来结束——这条语音命令会结束对话，而不会被发送给智能体。只有整段话语都是停止命令时才会匹配，因此像“stop the docker container”这样的真实请求仍会正常发送。



## 远程桌面（客户端采集）

当桌面应用连接到**远程** Hermes 后端时（例如无头 Docker 主机或另一个房间里的机器），后端通常**没有麦克风**。此时服务端的 PortAudio 会失败，并报错“Failed to open the wake-word microphone.”。

针对这种情况，Hermes 支持**客户端采集**：

1. 桌面端以 `capture: client` 武装唤醒（当后端没有本地输入设备时，GUI 会自动采用，也可按下方显式设置）。
2. openWakeWord 仍在**后端**运行（相同引擎、相同模型）。
3. 桌面端打开**本地 Mac/PC 麦克风**，重采样为 16 kHz 单声道 int16，并通过 `wake.feed` RPC 流式发送短帧。
4. 检测到唤醒词后，后端照常发出 `wake.detected`；桌面端在客户端麦克风上启动常规语音管线。

```yaml
wake_word:
  enabled: true
  capture: auto    # auto | local | client
  # auto   — 除非桌面端以 client_capture 武装，否则使用本地 PortAudio
  # local  — 始终打开后端麦克风（CLI/TUI 默认）
  # client — 始终期望来自桌面端的 wake.feed PCM（适合远程）
```

桌面 GUI 在 `wake.start` 时总是传入 `client_capture: true`，因此没有麦克风的远程后端会自动以客户端模式武装。除非你显式设置 `capture: client`，CLI 和 TUI 保持本地采集。

隐私说明：使用客户端采集时，唤醒 PCM 会通过经过身份验证的桌面↔后端 WebSocket（与会话其余部分相同的通道）传输。检测仍不会将音频发送到第三方唤醒 API；引擎运行在后端进程本地。

## 引擎

| 引擎 | 费用 | API key | 说明 |
|--------|------|---------|-------|
| **openWakeWord**（默认） | 免费 | 无 | 本地 ONNX 模型。内置**“hey hermes”**模型（默认）；还支持 `hey_jarvis`、`alexa`、`hey_mycroft`……以及自定义模型 |
| **sherpa** | 免费 | 无 | **开放词表**——无需任何训练即可检测任意输入的短语。首次使用时自动下载小型英文模型（约 13 MB） |
| **Porcupine** | 免费额度 / 付费 | `PORCUPINE_ACCESS_KEY` | Picovoice 引擎；内置关键词 + 自定义 `.ppn` 文件 |

默认短语是 **“hey hermes”**——Hermes 随附该模型，因此开箱即用，无需训练。（首次使用时，openWakeWord 会下载其共享的特征提取模型——一次性的小量下载。）

两者都会在你首次启用唤醒词时惰性安装（使用 `--include-desktop` 进行的桌面端安装会预装它们，因此耳朵会立即工作）。如需提前安装：

```bash
cd ~/.hermes/hermes-agent && uv pip install -e ".[wake]"
```

## 快速开始

```bash
# 在交互式 `hermes` 会话中：
/wake on        # 开始监听（首次使用时安装引擎）
/wake status    # 显示唤醒词、服务商和状态
/wake off       # 停止监听
```

在桌面应用中，点击输入框中的耳朵图标。

该开关本身就是这项设置：开启或关闭唤醒词——通过 `/wake` 或桌面端的耳朵按钮——都会将 `wake_word.enabled` 写入 `~/.hermes/config.yaml`，因此你的选择会在会话之间保留。你也可以手动切换：

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
  capture: auto               # auto | local | client — PCM 捕获位置（参见远程桌面）
  provider: openwakeword      # "openwakeword"（免费、本地）| "sherpa"（免费、任意唤醒词）| "porcupine"
  phrase: "hey hermes"        # 仅为展示标签——检测由下方的模型/关键词决定
  sensitivity: 0.6            # 0.0-1.0 — 越高越严格（误触发越少），在所有引擎中方向一致
  confirmation_frames: 3      # 仅 openWakeWord——触发所需的连续超阈值帧数
  start_new_session: true     # 唤醒时启动全新会话，而非继续当前会话
  openwakeword:
    model: hey_hermes         # 内置默认值；或内置名称，或自定义 .onnx/.tflite 的路径
    inference_framework: ""   # ""（自动）| "onnx" | "tflite"
  porcupine:
    keyword: jarvis           # 内置关键词，或自定义 .ppn 的路径
```

`sensitivity`、`phrase` 和 `start_new_session` 适用于两个引擎。`openwakeword` 和 `porcupine` 块选择实际的检测模型。

`input_device` 会直接传给唤醒监听器的 PortAudio（`sounddevice`）流。可使用数字设备索引或无歧义的设备名子串。此设置只改变唤醒词捕获；桌面端的按键说话仍使用桌面应用的麦克风路径。

### 减少环境语音导致的误触发

openWakeWord 每次对一个短音频帧（约 80ms）评分，因此背景对话中一个零散音素偶尔会让单帧超过阈值，从而意外触发唤醒词。有两个旋钮可控制这一点：

- **`confirmation_frames`**（默认 `3`，仅 openWakeWord）——唤醒触发前需要多少个*连续*超阈值帧。真正的“hey hermes”会在多帧上保持高分；环境噪声只是单帧尖峰。如果在嘈杂房间中仍然误触发，就调高它（例如 `4`–`5`）；代价是额外几十毫秒的延迟。`1` 会恢复旧的“首帧即触发”行为。
- **`sensitivity`**（默认 `0.6`）——检测阈值，`0.0`–`1.0`。越高越严格（误触发越少）。此方向在**所有**引擎中一致——对 openWakeWord 它是每帧原始分数阈值，对 sherpa 它映射到关键词阈值，对 Porcupine 它在内部被反转，因此“越高越严格”在那里同样成立。`0.6` 的默认值高于 openWakeWord 宽松的 `0.5` 基线，后者会让“hey hor”这类近似发音通过；如果仍然误触发，就调高到 `0.8` 左右，如果真正的“hey hermes”语句被漏掉，就调低。

`sherpa` 和 `porcupine` 引擎在内部解码整个唤醒词，因此没有单帧尖峰问题，并且会忽略 `confirmation_frames`（但仍会遵循 `sensitivity`）。

`inference_framework` 选择 openWakeWord 后端。留空（默认）让 Hermes 按平台选择：**Apple Silicon 上使用 tflite**，其他地方使用 onnx。openWakeWord 的 onnx 后端在 macOS ARM64 上会返回接近零的分数（[openWakeWord#336](https://github.com/dscripka/openWakeWord/issues/336)），因此在那种环境下固定为 `onnx` 的监听器会武装、显示为监听中，但永远不会触发。tflite 后端在 macOS 上需要 `ai-edge-litert`，Hermes 会按需与其他唤醒词依赖一起安装。

### 界面（CLI、TUI、GUI）

唤醒词在 Hermes 的全部三个界面中均可工作，`surface` 决定由哪个界面持有监听器，并在触发时开启新会话：

| `surface` | 行为 |
|-----------|----------|
| `auto`（默认） | 所有本地界面均可参与；第一个完成武装的界面持有监听器。 |
| `cli` | 仅经典 `hermes` CLI。 |
| `tui` | 仅 `hermes --tui`。 |
| `gui` | 仅桌面应用。 |

检测器在设备端运行且使用单一麦克风，因此同一时间只有一个界面在监听——即使多个 Hermes 界面运行在各自独立的进程中也是如此。持有权是粘性的：第一个符合条件的认领者会一直持有监听器，直到它停止、断开连接或其进程退出。Hermes 不会静默切换到另一个已打开的界面。如果你想固定持有权，而不是采用先到先得，请设置 `surface`。TUI 与桌面 GUI 共享同一个 Python 后端（`tui_gateway`），由它在服务端运行检测器，并在命令录制期间让出麦克风给语音采集。

## 使用其他短语

“Hey Hermes” 开箱即用——绑定的 openWakeWord 模型（`model: hey_hermes`）即默认值。若要用其他短语唤醒，最便捷的路径是开放词汇引擎：

### 方案 A —— sherpa（任意短语，零训练）

输入你想要的短语；运行时进行分词——"hey coder"、"computer"、"wake up neo"，任何内容皆可：

```yaml
wake_word:
  enabled: true
  provider: sherpa
  phrase: "hey coder"        # 检测键——只需输入你的短语
```

小型英文 KWS 模型（约 13 MB）会在首次使用时下载一次。每个配置档可以设置自己的短语——为你运行的每个配置档设置 "hey \<profile\>"。

### 唤醒指定配置档（桌面端）

使用 sherpa 引擎时，一个监听器即可唤醒任意配置档。所有配置中 `wake_word.enabled: true` 的配置档都会被自动注册；未设置时其短语默认为 `hey <profile name>`。说出某个配置档的短语，桌面应用会实时切换到该配置档、在其中开启全新会话，并启动免手操作语音：

- "hey hermes" → 默认配置档
- "hey coder" → `coder` 配置档
- "hey trader" → `trader` 配置档

在监听器所属配置档上设置 `wake_word.profile_routing: false` 可退出该功能，仅监听自己的短语。CLI 与 TUI 是单配置档进程：属于其他配置档的唤醒短语会打印切换命令（`hermes -p <profile>`），而不是进行路由。

名称按英文子词发音进行声学匹配：由两个词组成、且名称词语区分度高并包含 2 个及以上音节的短语效果最佳。极短的名称、重度的非英语音系，或两个发音相近的配置档名称都会降低准确度——如有需要，可逐配置档微调 `sensitivity`。

### 方案 B —— openWakeWord（免费、已训练模型）

指定一个内置模型（`hey_jarvis`、`alexa`、`hey_mycroft`、……），或训练一个自定义模型（≈75–90 分钟，在免费/Colab GPU 上）以获得最佳稳健性，将 `.onnx` 文件放到某处并引用它：

```yaml
wake_word:
  enabled: true
  provider: openwakeword
  phrase: "computer"
  openwakeword:
    model: ~/.hermes/wakewords/computer.onnx   # 或使用内置名称，如 hey_jarvis
```

训练参考：

- [openWakeWord](https://github.com/dscripka/openWakeWord)
- [2026 training Colab](https://github.com/alfiedennen/openwakeword-colab-2026)

:::tip 选择一个有辨识度的短语
不会与日常用语冲突的唤醒短语泛化效果最佳。使用不常见词的双音节短语（"hermes" 符合条件）优于 "hello" 或 "stop" 之类常见词。
:::

### 方案 C —— Porcupine（数秒内定制关键词）

在 [Picovoice Console](https://console.picovoice.ai/) 创建一个 "Hey Hermes" 关键词，下载 `.ppn`，然后：

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

- 可用的麦克风以及 `sounddevice` + `numpy` 音频栈（与语音模式共用）。
- 用于转写语音命令的 STT 服务商——本地 `faster-whisper` 开箱即用；完整服务商列表见 [语音模式](/user-guide/features/voice-mode)。
- 用于朗读回复的 TTS 服务商（默认 `edge-tts` 无需密钥即可使用）。唤醒流程完全免手操作，因此在 STT 与 TTS 均就绪之前，该开关会拒绝武装——通过 `hermes tools`（Voice 部分）进行设置。
- 唤醒引擎依赖（自动安装，或 `hermes-agent[wake]`）。

若监听器无法启动，`/wake status` 会准确报告缺少什么。

### 显示“正在监听”却永不唤醒（macOS）

macOS 按**进程**授予麦克风访问权限。桌面应用中 STT 可用只能证明*渲染进程*拥有麦克风访问权限——而唤醒监听器运行在 Python *后端*中，需要后端自身的授权。缺少该授权时，CoreAudio 会交给后端一个“看似正常”的流，但永远只输出静音，因此耳朵图标显示为正在监听，而短语却永不触发。Hermes 会检测到这一情况（`/wake status` 显示 "mic delivers only silence"；桌面端耳朵图标的提示信息也带有相同提示）。修复：系统设置 → 隐私与安全性 → 麦克风 → 启用 Hermes 后端（它可能显示为你的终端、`python` 或 Hermes），然后将唤醒词关闭再打开。

### 显示“正在监听”却只收到静音（Windows）

桌面端按键说话与唤醒词采集使用不同的麦克风路径。按键说话使用桌面应用的浏览器采集，而唤醒词监听器在 Python 后端中打开 PortAudio 流。可能出现其中一个可用，而另一个选择了静音或不可用的 Windows 输入设备。

`/wake status` 会报告所选的输入设备与 Windows 音频 host API。当它报告静音时，将 `wake_word.input_device` 设为可用的 PortAudio 输入的数值索引或无歧义名称，然后重新切换唤醒词：

```bash
hermes config set wake_word.input_device "Microphone Array"
```

使用 `null` 恢复为进程默认值：

```bash
hermes config set wake_word.input_device null
```

## 注意事项与限制

- **仅本地界面。** 唤醒词在 CLI、TUI 和桌面 GUI 中运行——凡是本地麦克风可用之处皆可。它不在消息网关（Telegram、Discord、……）中运行，因为网关没有麦克风。
- **同一时间仅一个麦克风。** 检测器在命令录制期间释放麦克风，并在该轮结束后重新取回，因此不会与语音采集冲突。
- **隐私。** 热词检测在本地进行。若出现误触发可将 `sensitivity` 调高，若漏检则调低。
