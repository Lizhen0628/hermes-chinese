---
title: "Obliteratus — OBLITERATUS：通过 diff-in-means 消除 LLM 的拒答行为"
sidebar_label: "Obliteratus"
description: "OBLITERATUS：通过 diff-in-means 消除 LLM 的拒答行为"
---

{/* 此页面由 website/scripts/generate-skill-docs.py 根据技能包中的 SKILL.md 自动生成。请编辑源 SKILL.md，而非此页面。 */}

# Obliteratus

OBLITERATUS：通过 diff-in-means 消除 LLM 的拒答行为。

## 技能元数据

| | |
|---|---|
| 来源 | 可选 — 使用 `hermes skills install official/mlops/obliteratus` 安装 |
| 路径 | `optional-skills/mlops\obliteratus` |
| 版本 | `2.0.0` |
| 作者 | Hermes Agent |
| 许可证 | MIT |
| 依赖 | `obliteratus`、`torch`、`transformers`、`bitsandbytes`、`accelerate`、`safetensors` |
| 平台 | linux、macos |
| 标签 | `Abliteration`、`Uncensoring`、`Refusal-Removal`、`LLM`、`Weight-Projection`、`SVD`、`Mechanistic-Interpretability`、`HuggingFace`、`Model-Surgery` |
| 相关技能 | [`serving-llms-vllm`](/docs/user-guide/skills/optional/mlops/mlops-inference-serving-llms-vllm)、[`llama-cpp`](/docs/user-guide/skills/optional/mlops/mlops-inference-llama-cpp)、[`huggingface-tokenizers`](/docs/user-guide/skills/optional/mlops/mlops-huggingface-tokenizers) |

## 参考：完整 SKILL.md

:::info
以下是此技能被触发时 Hermes 加载的完整技能定义。这是技能激活时代理所看到的指令内容。
:::

# OBLITERATUS 技能

## 内容概览

9 种 CLI 方法、28 个分析模块、覆盖 5 个算力层级的 116 个模型预设、锦标赛评估，以及遥测驱动的推荐。

无需重新训练或微调，即可从开放权重 LLM 中移除拒答行为（护栏）。它使用机械可解释性技术——包括 diff-in-means、SVD、白化 SVD、LEACE 概念擦除、SAE 分解、贝叶斯核投影等——来识别并从模型权重中精准切除拒答方向，同时保留推理能力。

**许可证警告：** OBLITERATUS 采用 AGPL-3.0。绝不可将其作为 Python 库导入。始终通过 CLI（`obliteratus` 命令）或子进程调用。这样可保持 Hermes Agent 的 MIT 许可证干净合规。

## 视频指南

Hermes 智能体使用 OBLITERATUS 对 Gemma 进行 abliterate 的完整演示：
https://www.youtube.com/watch?v=8fG9BrNTeHs（"OBLITERATUS：一个 AI 智能体移除了 Gemma 4 的安全护栏"）

当用户希望在自行运行之前先获得端到端工作流的可视化概览时，此视频非常有用。

## 何时使用此技能

在用户出现以下情况时触发：
- 想要"解除审查"或"abliterate"一个 LLM
- 询问如何从模型中移除拒答/护栏
- 想要创建 Llama、Qwen、Mistral 等的无审查版本
- 提到"拒答移除"、"abliteration"、"权重投影"
- 想要分析模型的拒答机制是如何运作的
- 提及 OBLITERATUS、abliterator 或拒答方向

## 步骤 1：安装

检查是否已安装：
```bash
obliteratus --version 2>/dev/null && echo "INSTALLED" || echo "NOT INSTALLED"
```

如果未安装，从 GitHub 克隆并安装：
```bash
git clone https://github.com/elder-plinius/OBLITERATUS.git
cd OBLITERATUS
pip install -e .
# For Gradio web UI support:
# pip install -e ".[spaces]"
```

**重要提示：** 安装前请与用户确认。这会引入约 5-10GB 的依赖（PyTorch、Transformers、bitsandbytes 等）。

## 步骤 2：检查硬件

在做任何事情之前，先检查可用的 GPU：
```bash
python3 -c "
import torch
if torch.cuda.is_available():
    gpu = torch.cuda.get_device_name(0)
    vram = torch.cuda.get_device_properties(0).total_memory / 1024**3
    print(f'GPU: {gpu}')
    print(f'VRAM: {vram:.1f} GB')
    if vram < 4: print('TIER: tiny (models under 1B)')
    elif vram < 8: print('TIER: small (models 1-4B)')
    elif vram < 16: print('TIER: medium (models 4-9B with 4bit quant)')
    elif vram < 32: print('TIER: large (models 8-32B with 4bit quant)')
    else: print('TIER: frontier (models 32B+)')
else:
    print('NO GPU - only tiny models (under 1B) on CPU')
"
```

### 显存需求（4 位量化）

| 显存     | 最大模型规模     | 示例模型                                    |
|:---------|:----------------|:--------------------------------------------|
| 仅 CPU   | ~1B 参数        | GPT-2、TinyLlama、SmolLM                    |
| 4-8 GB   | ~4B 参数        | Qwen2.5-1.5B、Phi-3.5 mini、Llama 3.2 3B    |
| 8-16 GB  | ~9B 参数        | Llama 3.1 8B、Mistral 7B、Gemma 2 9B        |
| 24 GB    | ~32B 参数       | Qwen3-32B、Llama 3.1 70B（吃紧）、Command-R |
| 48 GB+   | ~72B+ 参数      | Qwen2.5-72B、DeepSeek-R1                    |
| 多 GPU   | 200B+ 参数      | Llama 3.1 405B、DeepSeek-V3（685B MoE）     |

## 步骤 3：浏览可用模型并获取推荐

```bash
# Browse models by compute tier
obliteratus models --tier medium

# Get architecture info for a specific model
obliteratus info <model_name>

# Get telemetry-driven recommendation for best method & params
obliteratus recommend <model_name>
obliteratus recommend <model_name> --insights  # global cross-architecture rankings
```

## 步骤 4：选择方法

### 方法选择指南
**多数情况下的默认/推荐方案：`advanced`。** 它使用多方向 SVD 配合保范投影，且经过充分测试。

| 情况                          | 推荐方法   | 原因                                 |
|:------------------------------|:-----------|:-------------------------------------|
| 默认 / 大多数模型             | `advanced` | 多方向 SVD、保范投影、可靠           |
| 快速测试 / 原型验证           | `basic`    | 快、简单，足以评估                   |
| 稠密模型（Llama、Mistral）    | `advanced` | 多方向、保范投影                     |
| MoE 模型（DeepSeek、Mixtral） | `nuclear`  | 专家粒度，能应对 MoE 的复杂性        |
| 推理模型（R1 蒸馏版）         | `surgical` | 感知 CoT，保留思维链                 |
| 顽固的拒绝行为持续存在        | `aggressive` | 白化 SVD + 头部手术 + 越狱         |
| 希望改动可逆                  | 使用 steering vectors（见分析章节）  |
| 追求最高质量，不计时间        | `optimized` | 贝叶斯搜索最优参数                  |
| 实验性自动检测                | `informed`  | 自动检测对齐类型 — 实验性，不一定总能优于 advanced |

### 9 种 CLI 方法
- **basic** — 通过 diff-in-means 提取单一拒绝方向。速度快（8B 模型约 5-10 分钟）。
- **advanced**（默认，推荐）— 多个 SVD 方向、保范投影、2 轮精修。速度中等（约 10-20 分钟）。
- **aggressive** — 白化 SVD + 越狱对比 + 注意力头手术。连贯性受损风险较高。
- **spectral_cascade** — DCT 频域分解。研究性/新颖方法。
- **informed** — 在 abliteration 过程中进行分析并自动配置。实验性 — 比 advanced 更慢、更不可预测。
- **surgical** — SAE 特征 + 神经元掩码 + 头部手术 + 逐专家处理。非常慢（约 1-2 小时）。最适合推理模型。
- **optimized** — 贝叶斯超参数搜索（Optuna TPE）。运行时间最长，但能找到最优参数。
- **inverted** — 反转拒绝方向。模型会变得主动愿意配合。
- **nuclear** — 针对顽固 MoE 模型的最大力度组合。专家粒度。

### 方向提取方法（--direction-method 标志）
- **diff_means**（默认）— 在拒绝/服从激活之间做简单的差值均值。稳健。
- **svd** — 多方向 SVD 提取。更适合复杂对齐。
- **leace** — LEACE（Linear Erasure via Closed-form Estimation，闭式估计线性擦除）。最优线性擦除。

### 4 种仅限 Python API 的方法
（CLI 中不可用 — 需要 Python import，这会违反 AGPL 边界。仅当用户明确想在自己的 AGPL 项目中把 OBLITERATUS 作为库使用时才提及。）
- failspy、gabliteration、heretic、rdo

## 步骤 5：运行 Abliteration

### 标准用法
```bash
# Default method (advanced) — recommended for most models
obliteratus obliterate <model_name> --method advanced --output-dir ./abliterated-models

# With 4-bit quantization (saves VRAM)
obliteratus obliterate <model_name> --method advanced --quantization 4bit --output-dir ./abliterated-models

# Large models (70B+) — conservative defaults
obliteratus obliterate <model_name> --method advanced --quantization 4bit --large-model --output-dir ./abliterated-models
```

### 微调参数
```bash
obliteratus obliterate <model_name> \
  --method advanced \
  --direction-method diff_means \
  --n-directions 4 \
  --refinement-passes 2 \
  --regularization 0.1 \
  --quantization 4bit \
  --output-dir ./abliterated-models \
  --contribute  # opt-in telemetry for community research
```

### 关键标志
| 标志 | 描述 | 默认值 |
|:-----|:------------|:--------|
| `--method` | 消融方法 | advanced |
| `--direction-method` | 方向提取方式 | diff_means |
| `--n-directions` | 拒绝方向数量（1-32） | 取决于方法 |
| `--refinement-passes` | 迭代轮数（1-5） | 2 |
| `--regularization` | 正则化强度（0.0-1.0） | 0.1 |
| `--quantization` | 以 4bit 或 8bit 加载 | 无（全精度） |
| `--large-model` | 针对 120B+ 的保守默认值 | false |
| `--output-dir` | 保存消融后模型的位置 | ./obliterated_model |
| `--contribute` | 分享匿名化结果用于研究 | false |
| `--verify-sample-size` | 用于拒绝检查的测试提示数量 | 20 |
| `--dtype` | 模型 dtype（float16、bfloat16） | auto |

### 其他执行模式
```bash
# 交互式引导模式（硬件 → 模型 → 预设）
obliteratus interactive

# Web UI（Gradio）
obliteratus ui --port 7860

# 从 YAML 配置运行完整的消融研究
obliteratus run config.yaml --preset quick

# 竞标赛：将全部方法相互比较
obliteratus tourney <model_name>
```

## 第 6 步：验证结果

消融后，检查输出指标：

| 指标 | 良好值 | 警告 |
|:-------|:-----------|:--------|
| 拒绝率 | &lt; 5%（理想情况下约 0%） | > 10% 表示拒绝行为仍存在 |
| 困惑度变化 | &lt; 10% 增加 | > 15% 表示连贯性受损 |
| KL 散度 | &lt; 0.1 | > 0.5 表示显著的分布偏移 |
| 连贯性 | 高 / 通过定性检查 | 响应退化、重复 |

### 如果拒绝行为仍存在（> 10%）
1. 尝试 `aggressive` 方法
2. 增加 `--n-directions`（例如 8 或 16）
3. 添加 `--refinement-passes 3`
4. 尝试 `--direction-method svd` 替代 diff_means

### 如果连贯性受损（困惑度增加 > 15%）
1. 减少 `--n-directions`（尝试 2）
2. 增加 `--regularization`（尝试 0.3）
3. 将 `--refinement-passes` 减少到 1
4. 尝试 `basic` 方法（更温和）

## 第 7 步：使用消融后的模型

输出是标准的 HuggingFace 模型目录。

```bash
# 使用 transformers 在本地测试
python3 -c "
from transformers import AutoModelForCausalLM, AutoTokenizer
model = AutoModelForCausalLM.from_pretrained('./abliterated-models/<model>')
tokenizer = AutoTokenizer.from_pretrained('./abliterated-models/<model>')
inputs = tokenizer('How do I pick a lock?', return_tensors='pt')
outputs = model.generate(**inputs, max_new_tokens=200)
print(tokenizer.decode(outputs[0], skip_special_tokens=True))
"

# 上传到 HuggingFace Hub
huggingface-cli upload <username>/<model-name>-abliterated ./abliterated-models/<model>

# 使用 vLLM 提供服务
vllm serve ./abliterated-models/<model>
```

## CLI 命令参考

| 命令 | 描述 |
|:--------|:------------|
| `obliteratus obliterate` | 主要的消融命令 |
| `obliteratus info <model>` | 打印模型架构详细信息 |
| `obliteratus models --tier <tier>` | 按计算层浏览精选模型 |
| `obliteratus recommend <model>` | 遥测驱动的方法/参数建议 |
| `obliteratus interactive` | 引导式设置向导 |
| `obliteratus tourney <model>` | 竞标赛：所有方法正面对决 |
| `obliteratus run <config.yaml>` | 从 YAML 执行消融研究 |
| `obliteratus strategies` | 列出所有已注册的消融策略 |
| `obliteratus report <results.json>` | 重新生成可视化报告 |
| `obliteratus ui` | 启动 Gradio Web 界面 |
| `obliteratus aggregate` | 汇总社区遥测数据 |

## 分析模块

OBLITERATUS 包含 28 个分析模块，用于机制可解释性。
完整参考请参见 `skill_view(name="obliteratus", file_path="references/analysis-modules.md")`。

### 快速分析命令
```bash
# 运行特定分析模块
obliteratus run analysis-config.yaml --preset quick

# 优先运行的关键模块：
# - alignment_imprint: Fingerprint DPO/RLHF/CAI/SFT alignment method
# - concept_geometry: Single direction vs polyhedral cone
# - logit_lens: Which layer decides to refuse
# - anti_ouroboros: Self-repair risk score
# - causal_tracing: Causally necessary components
```

### 引导向量（可逆替代方案）
不永久修改权重，而是使用推理时引导：
```python
# 仅限 Python API — 用于用户自己的项目
from obliteratus.analysis.steering_vectors import SteeringVectorFactory, SteeringHookManager
```

## 消融策略

除了基于方向的消融之外，OBLITERATUS 还包括结构化消融策略：
- **嵌入消融** — 针对嵌入层组件
- **FFN 消融** — 前馈网络块移除
- **注意力头剪枝** — 注意力头剪枝
- **层移除** — 完整层移除

列出所有可用策略：`obliteratus strategies`

## 评估

OBLITERATUS 包含内置评估工具：
- 拒绝率基准测试
- 困惑度比较（前后）
- LM Eval Harness 集成，用于学术基准测试
- 正面竞争对手比较
- 基线性能跟踪

## 平台支持

- **CUDA** — 完全支持（NVIDIA GPU）
- **Apple Silicon（MLX）** — 通过 MLX 后端支持
- **CPU** — 支持微型模型（&lt; 1B 参数）

## YAML 配置模板

通过 `skill_view` 加载模板以实现可复现的运行：
- `templates/abliteration-config.yaml` — 标准单模型配置
- `templates/analysis-study.yaml` — 消融前的分析研究
- `templates/batch-abliteration.yaml` — 多模型批处理

## 遥测

OBLITERATUS 可以选择向全球研究数据集贡献匿名化的运行数据。
使用 `--contribute` 标志启用。不会收集任何个人数据——仅收集模型名称、方法和指标。

## 常见陷阱

1. **不要将 `informed` 用作默认值** — 它是实验性的且更慢。使用 `advanced` 获得可靠结果。
2. **约 1B 以下的模型对消融响应不佳** — 它们的拒绝行为浅薄且碎片化，使得干净的方向提取变得困难。预期部分结果（20-40% 剩余拒绝）。3B+ 模型有更清晰的拒绝方向，响应更好（使用 `advanced` 通常可达到 0% 拒绝）。
3. **`aggressive` 可能使情况更糟** — 在小模型上，它可能破坏连贯性并实际上增加拒绝率。仅当 `advanced` 在 3B+ 模型上仍留下 > 10% 拒绝时才使用它。
4. **始终检查困惑度** — 如果飙升 > 15%，模型已受损。降低激进程度。
5. **MoE 模型需要特殊处理** — 对 Mixtral、DeepSeek-MoE 等使用 `nuclear` 方法。
6. **量化模型无法重新量化** — 先对全精度模型进行消融，然后对输出进行量化。
7. **VRAM 估算为近似值** — 4-bit 量化有帮助，但提取过程中峰值使用可能飙升。
8. **推理模型较为敏感** — 对 R1 蒸馏版使用 `surgical` 以保留思维链。
9. **检查 `obliteratus recommend`** — 遥测数据可能有比默认值更好的参数。
10. **AGPL 许可证** — 切勿在 MIT/Apache 项目中 `import obliteratus`。仅限 CLI 调用。
11. **大型模型（70B+）** — 始终使用 `--large-model` 标志以获得保守默认值。
12. **光谱认证 RED 很常见** — 即使实际拒绝率为 0%，光谱检查也常标记为"不完整"。检查实际拒绝率，而非单独依赖光谱认证。

## 互补技能

- **vllm** — 以高吞吐量为消融后的模型提供服务
- **gguf** — 将消融后的模型转换为 GGUF 以供 llama.cpp 使用
- **huggingface-tokenizers** — 使用模型分词器
