---
title: "Serving Llms Vllm — vLLM：高吞吐量 LLM 服务、OpenAI API、量化"
sidebar_label: "Serving Llms Vllm"
description: "vLLM：高吞吐量 LLM 服务、OpenAI API、量化"
---

{/* 本页面由 website/scripts/generate-skill-docs.py 根据技能的 SKILL.md 自动生成。请编辑源 SKILL.md，而非本页面。 */}

# Serving Llms Vllm

vLLM：高吞吐量 LLM 服务、OpenAI API、量化。

## 技能元数据

| | |
|---|---|
| 来源 | 可选 — 使用 `hermes skills install official/mlops/serving-llms-vllm` 安装 |
| 路径 | `optional-skills/mlops\inference\serving-llms-vllm` |
| 版本 | `1.0.1` |
| 作者 | Orchestra Research |
| 许可证 | MIT |
| 依赖项 | `vllm`、`torch`、`transformers` |
| 平台 | linux、macos |
| 标签 | `vLLM`、`Inference Serving`、`PagedAttention`、`Continuous Batching`、`High Throughput`、`Production`、`OpenAI API`、`Quantization`、`Tensor Parallelism` |

## 参考：完整的 SKILL.md

:::info
以下是 Hermes 在此技能被触发时加载的完整技能定义。这就是该技能激活时智能体所看到的指令内容。
:::

# vLLM - 高性能 LLM 服务

## 何时使用

当你需要部署生产级 LLM API、优化推理延迟/吞吐量，或在 GPU 显存有限的情况下服务模型时使用。支持 OpenAI 兼容端点、量化（GPTQ/AWQ/FP8）以及张量并行。

## 快速开始

vLLM 通过 PagedAttention（基于块的 KV 缓存）和连续批处理（混合 prefill/decode 请求），实现比标准 transformers 高 24 倍的吞吐量。

**安装**：
```bash
pip install vllm
```

**基础离线推理**：
```python
from vllm import LLM, SamplingParams

llm = LLM(model="meta-llama/Meta-Llama-3-8B-Instruct")
sampling = SamplingParams(temperature=0.7, max_tokens=256)

outputs = llm.generate(["Explain quantum computing"], sampling)
print(outputs[0].outputs[0].text)
```

**OpenAI 兼容服务器**：
```bash
vllm serve meta-llama/Meta-Llama-3-8B-Instruct

# 使用 OpenAI SDK 查询
python -c "
from openai import OpenAI
client = OpenAI(base_url='http://localhost:8000/v1', api_key='EMPTY')
print(client.chat.completions.create(
    model='meta-llama/Meta-Llama-3-8B-Instruct',
    messages=[{'role': 'user', 'content': 'Hello!'}]
).choices[0].message.content)
"
```

## 常见工作流

### 工作流 1：生产 API 部署

复制此清单并跟踪进度：

```
部署进度：
- [ ] 第 1 步：配置服务器设置
- [ ] 第 2 步：以受限流量进行测试
- [ ] 第 3 步：启用监控
- [ ] 第 4 步：部署到生产环境
- [ ] 第 5 步：验证性能指标
```

**第 1 步：配置服务器设置**

根据你的模型规模选择配置：

```bash
# 适用于单 GPU 上的 7B-13B 模型
vllm serve meta-llama/Meta-Llama-3-8B-Instruct \
  --gpu-memory-utilization 0.9 \
  --max-model-len 8192 \
  --port 8000

# 适用于使用张量并行的 30B-70B 模型
vllm serve meta-llama/Meta-Llama-3-70B-Instruct \
  --tensor-parallel-size 4 \
  --gpu-memory-utilization 0.9 \
  --quantization awq \
  --port 8000

# 适用于带缓存的生产环境（Prometheus 指标会自动暴露
# 在 API 端口上的 /metrics 处）
vllm serve meta-llama/Meta-Llama-3-8B-Instruct \
  --gpu-memory-utilization 0.9 \
  --enable-prefix-caching \
  --port 8000 \
  --host 0.0.0.0
```

**第 2 步：以受限流量进行测试**

在生产前运行负载测试：

```bash
# 安装负载测试工具
pip install locust

# 创建 test_load.py 文件，包含示例请求
# 运行：locust -f test_load.py --host http://localhost:8000
```

验证 TTFT（首 token 时间）&lt; 500ms 且吞吐量 > 100 req/sec。

**第 3 步：启用监控**

vLLM 在 API 端口（默认为 8000）的 `/metrics` 处暴露 Prometheus 指标：

```bash
curl http://localhost:8000/metrics | grep vllm
```

需监控的关键指标：
- `vllm:time_to_first_token_seconds` - 延迟
- `vllm:num_requests_running` - 活动请求数
- `vllm:gpu_cache_usage_perc` - KV 缓存利用率

**第 4 步：部署到生产环境**

使用 Docker 实现一致部署：

```bash
# 在 Docker 中运行 vLLM
docker run --gpus all -p 8000:8000 \
  vllm/vllm-openai:latest \
  --model meta-llama/Meta-Llama-3-8B-Instruct \
  --gpu-memory-utilization 0.9 \
  --enable-prefix-caching
```

**第 5 步：验证性能指标**

检查部署是否达到目标：
- TTFT &lt; 500ms（对于短提示词）
- 吞吐量 > 目标 req/sec
- GPU 利用率 > 80%
- 日志中无 OOM 错误

### 工作流 2：离线批量推理

用于在无服务器开销的情况下处理大规模数据集。

复制此清单：

```
批量处理：
- [ ] 第 1 步：准备输入数据
- [ ] 第 2 步：配置 LLM 引擎
- [ ] 第 3 步：运行批量推理
- [ ] 第 4 步：处理结果
```

**第 1 步：准备输入数据**

```python
# 从文件加载提示词
prompts = []
with open("prompts.txt") as f:
    prompts = [line.strip() for line in f]

print(f"Loaded {len(prompts)} prompts")
```

**第 2 步：配置 LLM 引擎**

```python
from vllm import LLM, SamplingParams

llm = LLM(
    model="meta-llama/Meta-Llama-3-8B-Instruct",
    tensor_parallel_size=2,  # 使用 2 块 GPU
    gpu_memory_utilization=0.9,
    max_model_len=4096
)

sampling = SamplingParams(
    temperature=0.7,
    top_p=0.95,
    max_tokens=512,
    stop=["</s>", "\n\n"]
)
```

**第 3 步：运行批量推理**

vLLM 会自动批处理请求以提高效率：

```python
# 在一次调用中处理所有提示词
outputs = llm.generate(prompts, sampling)

# vLLM 在内部处理批处理
# 无需手动对提示词进行分块
```

**第 4 步：处理结果**

```python
# 提取生成的文本
results = []
for output in outputs:
    prompt = output.prompt
    generated = output.outputs[0].text
    results.append({
        "prompt": prompt,
        "generated": generated,
        "tokens": len(output.outputs[0].token_ids)
    })

# 保存到文件
import json
with open("results.jsonl", "w") as f:
    for result in results:
        f.write(json.dumps(result) + "\n")

print(f"Processed {len(results)} prompts")
```

### 工作流 3：量化模型服务

在有限的 GPU 显存中容纳大模型。

```
量化设置：
- [ ] 第 1 步：选择量化方法
- [ ] 第 2 步：查找或创建量化模型
- [ ] 第 3 步：使用量化标志启动
- [ ] 第 4 步：验证准确性
```

**第 1 步：选择量化方法**

- **AWQ**：最适合 70B 模型，精度损失最小
- **GPTQ**：模型支持广泛，压缩效果好
- **FP8**：在 H100 GPU 上速度最快

**第 2 步：查找或创建量化模型**

使用 HuggingFace 上的预量化模型：

```bash
# 搜索 AWQ 模型
# 示例：TheBloke/Llama-2-70B-AWQ
```

**第 3 步：使用量化标志启动**

```bash
# 使用预量化模型
vllm serve TheBloke/Llama-2-70B-AWQ \
  --quantization awq \
  --tensor-parallel-size 1 \
  --gpu-memory-utilization 0.95

# 结果：70B 模型运行在约 40GB 显存中
```

**第 4 步：验证准确性**

测试输出是否符合预期质量：

```python
# 对比量化与非量化响应
# 验证任务特定性能保持不变
```

## 何时使用 vs 替代方案

**在以下情况下使用 vLLM：**
- 部署生产 LLM API（100+ req/sec）
- 服务 OpenAI 兼容端点
- GPU 显存有限但需要大模型
- 多用户应用（聊天机器人、助手）
- 需要高吞吐量下的低延迟

**改为使用替代方案：**
- **llama.cpp**：CPU/边缘推理，单用户
- **HuggingFace transformers**：研究、原型设计、一次性生成
- **TensorRT-LLM**：仅限 NVIDIA，需要绝对最大性能
- **Text-Generation-Inference**：已在 HuggingFace 生态系统中

## 常见问题

**问题：模型加载时显存不足**

降低内存使用：
```bash
vllm serve MODEL \
  --gpu-memory-utilization 0.7 \
  --max-model-len 4096
```

或使用量化：
```bash
vllm serve MODEL --quantization awq
```

**问题：首 token 缓慢（TTFT > 1 秒）**

对重复提示词启用前缀缓存：
```bash
vllm serve MODEL --enable-prefix-caching
```

对于长提示词，启用分块预填充：
```bash
vllm serve MODEL --enable-chunked-prefill
```

**问题：模型未找到错误**

对自定义模型使用 `--trust-remote-code`：
```bash
vllm serve MODEL --trust-remote-code
```

**问题：吞吐量低（&lt;50 req/sec）**

增加并发序列数：
```bash
vllm serve MODEL --max-num-seqs 512
```

使用 `nvidia-smi` 检查 GPU 利用率 - 应 > 80%。

**问题：推理比预期慢**

确认张量并行使用 2 的幂次方数量的 GPU：
```bash
vllm serve MODEL --tensor-parallel-size 4  # 而非 3
```

启用投机解码以加速生成（以 JSON 格式传递配置；
`--speculative-model` 已被弃用，改用 `--speculative-config`）：
```bash
vllm serve MODEL \
  --speculative-config '{"model": "DRAFT_MODEL", "num_speculative_tokens": 5, "method": "draft_model"}'
```

## 高级主题

**服务器部署模式**：参见 [references/server-deployment.md](https://github.com/NousResearch/hermes-agent/blob/main/optional-skills/mlops\inference\serving-llms-vllm/references/server-deployment.md)，了解 Docker、Kubernetes 和负载均衡配置。

**性能优化**：参见 [references/optimization.md](https://github.com/NousResearch/hermes-agent/blob/main/optional-skills/mlops\inference\serving-llms-vllm/references/optimization.md)，了解 PagedAttention 调优、连续批处理细节和基准测试结果。

**量化指南**：参见 [references/quantization.md](https://github.com/NousResearch/hermes-agent/blob/main/optional-skills/mlops\inference\serving-llms-vllm/references/quantization.md)，了解 AWQ/GPTQ/FP8 设置、模型准备和准确性对比。

**故障排除**：参见 [references/troubleshooting.md](https://github.com/NousResearch/hermes-agent/blob/main/optional-skills/mlops\inference\serving-llms-vllm/references/troubleshooting.md)，了解详细错误消息、调试步骤和性能诊断。

## 硬件要求

- **小型模型（7B-13B）**：1x A10（24GB）或 A100（40GB）
- **中型模型（30B-40B）**：2x A100（40GB），使用张量并行
- **大型模型（70B+）**：4x A100（40GB）或 2x A100（80GB），使用 AWQ/GPTQ

支持的平台：NVIDIA（主要）、AMD ROCm、Intel GPU、TPU

## 资源

- 官方文档：https://docs.vllm.ai
- GitHub：https://github.com/vllm-project/vllm
- 论文："Efficient Memory Management for Large Language Model Serving with PagedAttention"（SOSP 2023）
- 社区：https://discuss.vllm.ai
