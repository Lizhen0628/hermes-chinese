---
title: "AI 主播视频 — 根据脚本 + 图片制作经过验证的 AI 主播视频"
sidebar_label: "Ai Presenter Video"
description: "根据脚本 + 图片制作经过验证的 AI 主播视频"
---

{/* 本页面由 website/scripts/generate-skill-docs.py 根据该技能的 SKILL.md 自动生成。请编辑源 SKILL.md，而不是此页面。 */}

# Ai Presenter Video

根据脚本 + 图片制作经过验证的 AI 主播视频。

## 技能元数据

| | |
|---|---|
| 来源 | 可选 — 使用 `hermes skills install official/creative/ai-presenter-video` 安装 |
| 路径 | `optional-skills/creative/ai-presenter-video` |
| 版本 | `1.0.0` |
| 作者 | cclank (https://github.com/cclank/lanshu-create-ai-presenter-video)，由 Hermes Agent 移植 |
| 许可证 | MIT |
| 平台 | linux、macos |
| 标签 | `video`、`presenter`、`avatar`、`lipsync`、`tts`、`captions`、`creative` |
| 相关技能 | [`hyperframes`](/docs/user-guide/skills/optional/creative/creative-hyperframes)、[`kanban-video-orchestrator`](/docs/user-guide/skills/optional/creative/creative-kanban-video-orchestrator)、[`comfyui`](/docs/user-guide/skills/optional/creative/creative-comfyui) |

## 参考：完整的 SKILL.md

:::info
以下是此技能被触发时 Hermes 加载的完整技能定义。这就是技能激活时智能体看到的指令内容。
:::

# AI Presenter Video

将某个主题（或已完成的脚本）加上一张**获得授权的成年人**主播图片，转变为完整的、可直接发布的由主播主导的视频：锁定旁白、带口型同步 QA 的头像生成、字幕、确定性剪辑、响度归一化的母版/分享编码，以及机器 + 视觉验收报告。

当需要制作新的主播视频，以及需要继续、修订、加字幕、修复口型同步或重新导出已有的主播视频任务时，使用此技能。工作流与服务商无关：根据会话中实际可用的能力来选择生成方式（通过 `image_generate` 和视频生成插件使用 FAL 视频/图像模型，通过 `text_to_speech` 使用 TTS，通过 whisper/STT 工具链使用 ASR，以及全程使用 ffmpeg 完成所有确定性工作）。

> 移植自 cclank/lanshu-create-ai-presenter-video（MIT）。上游正文基本原样保留在 `references/` 中；Hermes 的适配则存放在此 hub 文件中。脚本是确定性的（无网络、无凭据）。

## Hermes 适配（请先阅读）

- **技能目录解析** — 上游硬编码了其自身智能体的技能路径。在 Hermes 中，loader 会将 `${HERMES_SKILL_DIR}` 展开为此技能的安装目录，因此下方每条命令都直接使用该 token：

  ```bash
  SKILL_DIR="${HERMES_SKILL_DIR}"
  ```

  Shell 变量在工具调用之间不会保留 — 在每个用到它的终端调用中重新粘贴该赋值（或展开后的路径）。
- **能力映射** — 当参考资料中说“语音生成能力”时，使用 `text_to_speech`（根据用户配置使用 OpenAI/Edge/ElevenLabs）；“主播/头像生成”→ 通过配置好的视频工具链使用 FAL 图生视频系列（Kling、Wan、MiniMax H3 等），或用户可访问的头像/口型同步端点；“词级时间戳 ASR”→ 通过 STT 工具链或 venv 中的 `faster-whisper` 使用 whisper；“确定性合成器”→ ffmpeg filtergraph，或安装后的 `hyperframes` 技能（编辑参考资料中有直接对应它的 HyperFrames 章节）。
- **视觉 QA** — 对生成的拼图和采样帧执行“正常速度视觉复核”步骤时使用 `vision_analyze`（身份、嘴部时序、手部、眨眼、连续性）。数值检查来自脚本的 ffprobe 输出。
- **付费生成同意** — 远程头像/TTS 生成会计费。遵循上游操作规则：在第一次付费调用之前，说明所上传的资源、请求的秒数、已知费用、试做规模以及重试上限，并获得用户的明确许可。在 `job.json` 中 `remote_upload_approved` 为 true 之前，绝不要将主播图片上传到远程服务商。
- **同意标志位于 `input` 之下** — `rights_confirmed`、`adult_presenter_confirmed`、`remote_upload_approved` 和 `voice_clone_approved` 位于 `job.json` 的 `input` 对象内（init 标志会设置它们；手动编辑必须针对 `input.*`，而不是 job 根）。`manual_input_review.*` 位于根级别。`preflight.py` 会区分 `errors`（阻止一切）和 `remote_blockers`（只阻止远程生成）— 当远程被阻止时，本地脚本/音频工作仍可继续。

## 工作流

1. **开始或继续一个任务。** 新任务：

   ```bash
   python3 "$SKILL_DIR/scripts/init_job.py" \
     --job-dir ~/Videos/my-presenter-video \
     --presenter-image /path/to/presenter.png \
     --topic "explain context engineering in one minute" \
     --duration 60 --aspect 9:16 \
     --rights-confirmed --adult-presenter-confirmed
   ```

   对已有脚本文件使用 `--script`；其他标志：`--voice-sample`、`--supporting-media`、`--width`、`--height`、`--fps`、`--watermark`、`--cta`。对于已有任务，读取 `job.json` + QA 报告，并从最早未完成的状态继续 — 绝不重新生成已验收的工作。

2. **手动输入复核。** 实际查看主播图片（`vision_analyze`）并试听任何语音样本；通过设置 `job.json` 中的 `manual_input_review` 布尔值来记录结果，例如：

   ```bash
   python3 - <<'PY'
   import json
   p = "~/Videos/my-presenter-video/job.json"  # expand ~ or use an absolute path
   import os; p = os.path.expanduser(p)
   j = json.load(open(p))
   j["manual_input_review"].update(image_viewed=True, single_clear_face=True,
                                   image_has_no_unwanted_text=True)
   json.dump(j, open(p, "w"), indent=2)
   PY
   ```

   然后进行门控：

   ```bash
   python3 "$SKILL_DIR/scripts/preflight.py" ~/Videos/my-presenter-video/job.json
   ```

   仅在 `ok: true` 时才继续；仅在 `remote_ready: true` 时执行远程生成。注意：preflight 也会就地更新 `job.json`（记录报告路径）— 运行后应重新读取，而不是编辑一份过期的副本。

3. **锁定内容和音频** — 阅读 `references/generation.md`。脚本 → 通过 `text_to_speech` 生成完整旁白 → 用 ASR 对照脚本核验旁白 → 记录真实时长。锁定后的音频是下游一切工作的主时钟。

4. **规划和生成主播** — 阅读 `references/generation.md`。先进行简短、低成本的试做；只有在试做通过身份和嘴部时序复核后才进行完整生成。

5. **编辑** — 阅读 `references/editing.md`。由锁定音频驱动的确定性时间线；字幕和关键词标注仅在音频和媒体定稿后进行。

6. **验证并交付** — 阅读 `references/qa-recovery.md`，渲染，然后：

   ```bash
   bash "$SKILL_DIR/scripts/finalize_delivery.sh" \
     ~/Videos/my-presenter-video/renders/rendered.mp4 \
     ~/Videos/my-presenter-video/outputs my-video
   ```

   终结脚本会保留宽高比，运行两遍响度归一化（program ≈ −16 LUFS），生成母版 + 分享编码，对两者进行解码验证，写出交付报告 JSON，并输出一张九帧拼图。在声称完成之前，请用 `vision_analyze` 检查该拼图。

## 操作规则（不可协商）

- 在相关远程操作之前，确认图像权利、成年身份、远程上传批准以及语音克隆授权。
- 绝不从图像推断或克隆真人的声音；使用获得授权的样本或现成 TTS 语音。
- 在主播生成、字幕时序或最终场景边界之前，锁定完整旁白。
- 在最终合成中静音视频源的音频；只有经批准的旁白和有意的混音轨道承载音频。
- 保留服务商请求体和任务 ID（除去凭据/会过期的 URL）。在重新提交之前先轮询被中断的工作 — 避免重复计费。
- 在三个被拒的付费候选之后停止，并总结失败模式。
- 在最终文件完全可解码且已复核拼图或完整播放之前，不要声称完成。

## 最小输入时的默认值

9:16、1080×1920、30fps；主题派生的视频目标时长 45–75 秒；在没有授权样本时使用现成语音；主播主导的布局，采用 hook → 2–4 个节拍 → 收尾；除非有要求，否则不加音乐/CTA；语言根据请求推断。

## 参考路由

- `references/generation.md` — 受理录入、内容、语音、能力选择、主播提示词、付费生成、服务商变更。
- `references/editing.md` — 时间线契约、开场/结尾、字幕、关键词标注预设、HyperFrames 合成、导出。
- `references/qa-recovery.md` — 技术验收、视觉验收，以及针对口型同步/身份/手部/曝光/卡帧/字幕/音频故障的恢复。

## 陷阱

- `preflight.py` 需要 ffprobe；在干净的机器上先安装 ffmpeg。
- 由 init 标志设置的同意布尔值落在 `input.*` 之下；在 job-json 根级别编辑它们会静默无效（preflight 会持续阻止）。
- `finalize_delivery.sh` 需要 bash + jq + awk 以及完全可解码的输入 — 被截断的渲染按设计就无法通过解码检查，而不是偶然失败。
- 长头像片段会漂移：优先使用在音频时间线上切分的一个连续主播源，而不是许多重新生成的章节片段（跨重生成的身份漂移是视觉 QA 的首要失败原因）。
- FAL i2v 端点有持续时间上限（通常为 5–15 秒）；请相应规划章节级主播片段，并在端点支持的情况下复用试做的 seed/参数以保持一致性。

## 验证

实操验证（2026 年 8 月）：`init_job.py` → `job.json` 具有正确的状态机；`preflight.py` 在输入未复核时正确阻止，在复核布尔值设置后翻转为 `ok: true`，并在 `input.remote_upload_approved` 之前保持 `remote_ready: false`；对合成的 5 秒 1080×1920 渲染运行 `finalize_delivery.sh` 生成了经解码验证的母版（631kbit/s）+ 分享编码、交付报告 JSON 和一张 9 帧拼图，退出码为 0。
