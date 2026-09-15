---
title: "Ai Presenter Video — 根据脚本 + 图像制作经过验证的 AI 主持人视频"
sidebar_label: "Ai Presenter Video"
description: "根据脚本 + 图像制作经过验证的 AI 主持人视频"
---

{/* 本页由 website/scripts/generate-skill-docs.py 从技能的 SKILL.md 自动生成。请编辑源文件 SKILL.md，而不是本页。 */}

# Ai Presenter Video

根据脚本 + 图像制作经过验证的 AI 主持人视频。

## 技能元数据

| | |
|---|---|
| 来源 | 可选 — 使用 `hermes skills install official/creative/ai-presenter-video` 安装 |
| 路径 | `optional-skills/creative/ai-presenter-video` |
| 版本 | `1.0.0` |
| 作者 | cclank (https://github.com/cclank/lanshu-create-ai-presenter-video)，由 Hermes Agent 移植 |
| 许可证 | MIT |
| 平台 | linux, macos |
| 标签 | `video`、`presenter`、`avatar`、`lipsync`、`tts`、`captions`、`creative` |
| 相关技能 | [`hyperframes`](/docs/user-guide/skills/optional/creative/creative-hyperframes)、[`kanban-video-orchestrator`](/docs/user-guide/skills/optional/creative/creative-kanban-video-orchestrator)、[`comfyui`](/docs/user-guide/skills/optional/creative/creative-comfyui) |

## 参考：完整的 SKILL.md

:::info
以下是 Hermes 在此技能被触发时加载的完整技能定义。当技能处于激活状态时，这就是智能体所看到的指令。
:::

# Ai Presenter Video

将一个主题（或已完成的脚本）加上一张经授权的成年人主持人图像，
转化为一版完整、可直接发布的以主持人主导的视频：锁定旁白、
进行带唇形同步 QA 的头像生成、添加字幕、确定性剪辑、响度归一化的
母版/分享编码，以及机器 + 视觉验收报告。

对于新的主持人视频，以及需要继续、修订、加字幕、修复唇形同步或
重新导出既有主持人视频任务的情况，均可使用本技能。该工作流对服务商
中立：根据会话中实际可用的能力选择生成手段（通过 `image_generate`
和视频生成插件使用 FAL 视频/图像模型，通过 `text_to_speech` 使用 TTS，
通过 whisper/STT 工具进行 ASR，所有确定性处理均用 ffmpeg）。

> 由 cclank/lanshu-create-ai-presenter-video (MIT) 移植而来。上游正文
> 在 `references/` 中基本逐字保留；Hermes 的适配内容位于
> 本中心文件。脚本是确定性的（不联网、不需要凭证）。

## Hermes 适配（请先阅读）

- **技能目录解析** — 上游硬编码了其自身智能体的 skills 路径。
  在 Hermes 中，加载器会把 `${HERMES_SKILL_DIR}` 展开为此技能已安装的
  目录，因此下面每条命令都直接使用该占位符：

  ```bash
  SKILL_DIR="${HERMES_SKILL_DIR}"
  ```

  Shell 变量不会在工具调用之间保留 — 在每个用到它的终端调用中
  重新粘贴该赋值（或展开后的路径）。
- **能力映射** — 参考文献中所说的"语音生成能力"，请使用
  `text_to_speech`（根据用户配置使用 OpenAI/Edge/ElevenLabs）；
  "主持人/头像生成" → 通过已配置的视频工具使用 FAL 图生视频系列
  （Kling、Wan、MiniMax H3 等），或用户有权访问的头像/唇形同步
  端点；"词级时间戳 ASR" → 通过 STT 工具使用 whisper，或在
  venv 中使用 `faster-whisper`；"确定性合成器" → ffmpeg
  滤镜图，或在已安装时使用 `hyperframes` 技能（剪辑
  参考中有一节 HyperFrames 可直接对应使用）。
- **视觉 QA** — 用 `vision_analyze` 对生成的
  联系表加上抽样帧执行"常速视觉审查"步骤（身份、口型
  时序、手部、眨眼、连续性）。数值检查来自
  脚本的 ffprobe 输出。
- **付费生成同意** — 远程头像/TTS 生成会产生费用。
  遵循上游操作规则：在首次付费调用之前，说明
  上传的资产、请求的秒数、已知费用、试点规模以及重试
  上限，并获得用户的明确许可。在 `job.json` 中的
  `remote_upload_approved` 为 true 之前，切勿将主持人
  图像上传到远程服务商。
- **同意标志位于 `input` 下** — `rights_confirmed`、
  `adult_presenter_confirmed`、`remote_upload_approved` 和
  `voice_clone_approved` 位于 `job.json` 的 `input` 对象内（init
  标志会设置它们；手动编辑必须针对 `input.*`，而不是 job
  根节点）。`manual_input_review.*` 位于根节点。`preflight.py` 区分
  `errors`（阻止一切）与 `remote_blockers`（仅阻止远程
  生成）— 在远程被阻止时，本地的脚本/音频工作可以继续进行。

## 工作流

1. **开始或恢复一个任务。** 新任务：

   ```bash
   python3 "$SKILL_DIR/scripts/init_job.py" \
     --job-dir ~/Videos/my-presenter-video \
     --presenter-image /path/to/presenter.png \
     --topic "explain context engineering in one minute" \
     --duration 60 --aspect 9:16 \
     --rights-confirmed --adult-presenter-confirmed
   ```

   对既有脚本文件使用 `--script`；其他标志：`--voice-sample`、
   `--supporting-media`、`--width`、`--height`、`--fps`、`--watermark`、
   `--cta`。对于既有任务，读取 `job.json` + QA 报告，并
   从最早未完成的状态恢复 — 绝不要重新生成已通过的工作。

2. **人工输入审查。** 切实查看主持人图像
   （`vision_analyze`）并聆听任何语音样本；通过设置 `job.json`
   中的 `manual_input_review` 布尔值来记录发现，例如：

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

   然后进行门禁检查：

   ```bash
   python3 "$SKILL_DIR/scripts/preflight.py" ~/Videos/my-presenter-video/job.json
   ```

   只有当 `ok: true` 时才继续；只有当 `remote_ready: true` 时才
   进行远程生成。注意：preflight 也会就地更新 `job.json`
   （记录报告路径）— 运行后要重新读取它，而不要编辑
   过期副本。

3. **锁定内容与音频** — 阅读 `references/generation.md`。脚本 →
   通过 `text_to_speech` 生成完整旁白 → 用 ASR 对照
   脚本验证旁白 → 记录真实时长。锁定的音频是下游
   一切的主时钟。

4. **规划并生成主持人** — 阅读 `references/generation.md`。
   先做简短低成本的试点；只有在试点通过身份
   与口型时序审查后才进行完整生成。

5. **剪辑** — 阅读 `references/editing.md`。由
   锁定音频驱动的确定性时间线；仅在音频与媒体
   最终确定后才添加字幕和关键词标注。

6. **验证与交付** — 阅读 `references/qa-recovery.md`，渲染，然后：

   ```bash
   bash "$SKILL_DIR/scripts/finalize_delivery.sh" \
     ~/Videos/my-presenter-video/renders/rendered.mp4 \
     ~/Videos/my-presenter-video/outputs my-video
   ```

   终结脚本会保留宽高比，执行两遍响度归一化
   （节目 ≈ −16 LUFS），生成母版 + 分享编码，对
   两者进行解码验证，写入交付报告 JSON，并生成九帧联系表。
   在声称完成之前，用 `vision_analyze` 检查联系表。

## 操作规则（不可协商）

- 在采取相关远程操作之前，确认图像权利、成年人身份、远程上传
  许可和语音克隆授权。
- 绝不要根据图像推断或克隆真实人物的声音；使用经授权的
  样本或库存 TTS 声音。
- 在主持人生成、字幕时序或最终场景边界确定之前，
  锁定完整旁白。
- 在最终合成中将视频源静音；只有已批准的旁白
  和有意的混音音轨承载音频。
- 保留服务商请求体和任务 ID（去除凭证/过期
  URL）。在重新提交之前轮询中断的工作 — 避免重复计费。
- 在三个被拒绝的付费候选之后停止，并总结失败模式。
- 在最终文件完全可解码且联系表或完整播放
  已审查之前，不要声称完成。

## 最小输入的默认值

9:16、1080×1920、30fps；基于主题的视频目标为 45–75 秒；无授权样本时
使用库存声音；以主持人主导的布局，采用钩子 → 2–4 拍 → 结尾；
除非要求，否则不加音乐/CTA；语言根据请求推断。

## 参考路由

- `references/generation.md` — 接收、内容、声音、能力选择、
  主持人提示词、付费生成、服务商变更。
- `references/editing.md` — 时间线契约、开场/收尾、字幕、
  关键词标注预设、HyperFrames 合成、导出。
- `references/qa-recovery.md` — 技术验收、视觉验收，以及
  对唇形同步/身份/手部/曝光/卡帧/字幕/音频故障的恢复。

## 陷阱

- `preflight.py` 需要 ffprobe；在裸机上请先安装 ffmpeg。
- 由 init 标志设置的同意布尔值落在 `input.*` 下；在
  job-json 根节点编辑它们不会起任何作用（preflight 会继续阻止）。
- `finalize_delivery.sh` 需要 bash + jq + awk 以及完全可解码的输入 —
  截断的渲染会因设计而失败解码检查，而非偶然。
- 长头像片段会漂移：优先使用一个连续的主持人源在
  音频时间线上切分，而不是多个重新生成的章节片段（跨重新生成的
  身份漂移是头号视觉 QA 失败点）。
- FAL i2v 端点限制时长（通常 5–15 秒）；据此规划
  章节级的主持人片段，并在端点支持的情况下复用试点的
  种子/参数以保持一致性。

## 验证

经验证实操（2026 年 8 月）：`init_job.py` → `job.json` 具有正确的状态
机；`preflight.py` 正确地在未审查输入上阻止，在审查布尔值之后翻转为
`ok: true`，并在 `input.remote_upload_approved` 之前保持 `remote_ready: false`；
`finalize_delivery.sh` 对合成的 5 秒
1080×1920 渲染产生了经解码验证的母版（631kbit/s）+ 分享编码、
交付报告 JSON 和 9 帧联系表，退出码 0。
