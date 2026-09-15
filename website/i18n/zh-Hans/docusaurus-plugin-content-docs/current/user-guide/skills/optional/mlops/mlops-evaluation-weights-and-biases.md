---
title: "Weights And Biases — W&B：记录机器学习实验、超参数扫描、模型注册表、仪表盘"
sidebar_label: "Weights And Biases"
description: "W&B：记录机器学习实验、超参数扫描、模型注册表、仪表盘"
---

{/* 本页面由 website/scripts/generate-skill-docs.py 根据技能的 SKILL.md 自动生成。请编辑源 SKILL.md，而非此页面。 */}

# Weights And Biases

W&B：记录机器学习实验、超参数扫描、模型注册表、仪表盘。

## 技能元数据

| | |
|---|---|
| 来源 | 可选 — 使用 `hermes skills install official/mlops/weights-and-biases` 安装 |
| 路径 | `optional-skills/mlops\evaluation\weights-and-biases` |
| 版本 | `1.0.1` |
| 作者 | Orchestra Research |
| 许可证 | MIT |
| 依赖 | `wandb` |
| 平台 | linux、macos、windows |
| 标签 | `MLOps`、`Weights And Biases`、`WandB`、`Experiment Tracking`、`Hyperparameter Tuning`、`Model Registry`、`Collaboration`、`Real-Time Visualization`、`PyTorch`、`TensorFlow`、`HuggingFace` |

## 参考：完整 SKILL.md

:::info
以下是此技能被触发时 Hermes 加载的完整技能定义。当技能处于激活状态时，这就是智能体看到的指令内容。
:::

# Weights & Biases：机器学习实验跟踪与 MLOps

## 何时使用此技能

当你需要以下功能时，请使用 Weights & Biases（W&B）：
- **跟踪机器学习实验**，自动记录指标
- **可视化训练过程**，通过实时仪表盘
- **对比多次运行**，跨超参数和配置
- **优化超参数**，通过自动化扫描
- **管理模型注册表**，具备版本控制和血统追溯
- **协作开展机器学习项目**，通过团队工作区
- **跟踪制品**（数据集、模型、代码），具备血统追溯

**用户**：200,000+ 机器学习从业者 | **GitHub Stars**：10.5k+ | **集成**：100+

## 安装

```bash
# 安装 W&B
pip install wandb

# 登录（创建 API 密钥）
wandb login

# 或以编程方式设置 API 密钥
export WANDB_API_KEY=your_api_key_here
```

## 快速开始

### 基础实验跟踪

```python
import wandb

# 初始化一次运行
run = wandb.init(
    project="my-project",
    config={
        "learning_rate": 0.001,
        "epochs": 10,
        "batch_size": 32,
        "architecture": "ResNet50"
    }
)

# 训练循环
for epoch in range(run.config.epochs):
    # 你的训练代码
    train_loss = train_epoch()
    val_loss = validate()

    # 记录指标
    wandb.log({
        "epoch": epoch,
        "train/loss": train_loss,
        "val/loss": val_loss,
        "train/accuracy": train_acc,
        "val/accuracy": val_acc
    })

# 结束运行
wandb.finish()
```

### 搭配 PyTorch

```python
import torch
import wandb

# 初始化
wandb.init(project="pytorch-demo", config={
    "lr": 0.001,
    "epochs": 10
})

# 访问配置
config = wandb.config

# 训练循环
for epoch in range(config.epochs):
    for batch_idx, (data, target) in enumerate(train_loader):
        # 前向传播
        output = model(data)
        loss = criterion(output, target)

        # 反向传播
        optimizer.zero_grad()
        loss.backward()
        optimizer.step()

        # 每 100 个批次记录一次
        if batch_idx % 100 == 0:
            wandb.log({
                "loss": loss.item(),
                "epoch": epoch,
                "batch": batch_idx
            })

# 保存模型
torch.save(model.state_dict(), "model.pth")
wandb.save("model.pth")  # 上传至 W&B

wandb.finish()
```

## 核心概念

### 1. 项目与运行

**项目（Project）**：相关实验的集合
**运行（Run）**：训练脚本的单次执行

```python
# 创建/使用项目
run = wandb.init(
    project="image-classification",
    name="resnet50-experiment-1",  # 可选的运行名称
    tags=["baseline", "resnet"],    # 用标签组织
    notes="First baseline run"      # 添加备注
)

# 每次运行都有唯一 ID
print(f"Run ID: {run.id}")
print(f"Run URL: {run.url}")
```

### 2. 配置跟踪

自动跟踪超参数：

```python
config = {
    # 模型架构
    "model": "ResNet50",
    "pretrained": True,

    # 训练参数
    "learning_rate": 0.001,
    "batch_size": 32,
    "epochs": 50,
    "optimizer": "Adam",

    # 数据参数
    "dataset": "ImageNet",
    "augmentation": "standard"
}

wandb.init(project="my-project", config=config)

# 在训练期间访问配置
lr = wandb.config.learning_rate
batch_size = wandb.config.batch_size
```

### 3. 指标记录

```python
# 记录标量
wandb.log({"loss": 0.5, "accuracy": 0.92})

# 记录多个指标
wandb.log({
    "train/loss": train_loss,
    "train/accuracy": train_acc,
    "val/loss": val_loss,
    "val/accuracy": val_acc,
    "learning_rate": current_lr,
    "epoch": epoch
})

# 使用自定义 x 轴记录
wandb.log({"loss": loss}, step=global_step)

# 记录媒体（图像、音频、视频）
wandb.log({"examples": [wandb.Image(img) for img in images]})

# 记录直方图
wandb.log({"gradients": wandb.Histogram(gradients)})

# 记录表格
table = wandb.Table(columns=["id", "prediction", "ground_truth"])
wandb.log({"predictions": table})
```

### 4. 模型检查点

```python
import torch
import wandb

# 保存模型检查点
checkpoint = {
    'epoch': epoch,
    'model_state_dict': model.state_dict(),
    'optimizer_state_dict': optimizer.state_dict(),
    'loss': loss,
}

torch.save(checkpoint, 'checkpoint.pth')

# 上传到 W&B
wandb.save('checkpoint.pth')

# 或使用 Artifacts（推荐）
artifact = wandb.Artifact('model', type='model')
artifact.add_file('checkpoint.pth')
wandb.log_artifact(artifact)
```

## 超参数扫描

自动搜索最优超参数。

### 定义扫描配置

```python
sweep_config = {
    'method': 'bayes',  # 或 'grid'、'random'
    'metric': {
        'name': 'val/accuracy',
        'goal': 'maximize'
    },
    'parameters': {
        'learning_rate': {
            'distribution': 'log_uniform_values',
            'min': 1e-5,
            'max': 1e-1
        },
        'batch_size': {
            'values': [16, 32, 64, 128]
        },
        'optimizer': {
            'values': ['adam', 'sgd', 'rmsprop']
        },
        'dropout': {
            'distribution': 'uniform',
            'min': 0.1,
            'max': 0.5
        }
    }
}

# 初始化扫描
sweep_id = wandb.sweep(sweep_config, project="my-project")
```

### 定义训练函数

```python
def train():
    # 初始化 run
    run = wandb.init()

    # 访问扫描参数
    lr = wandb.config.learning_rate
    batch_size = wandb.config.batch_size
    optimizer_name = wandb.config.optimizer

    # 使用扫描配置构建模型
    model = build_model(wandb.config)
    optimizer = get_optimizer(optimizer_name, lr)

    # 训练循环
    for epoch in range(NUM_EPOCHS):
        train_loss = train_epoch(model, optimizer, batch_size)
        val_acc = validate(model)

        # 记录指标
        wandb.log({
            "train/loss": train_loss,
            "val/accuracy": val_acc
        })

# 运行扫描
wandb.agent(sweep_id, function=train, count=50)  # 运行 50 次试验
```

### 扫描策略

```python
# 网格搜索 - 穷举
sweep_config = {
    'method': 'grid',
    'parameters': {
        'lr': {'values': [0.001, 0.01, 0.1]},
        'batch_size': {'values': [16, 32, 64]}
    }
}

# 随机搜索
sweep_config = {
    'method': 'random',
    'parameters': {
        'lr': {'distribution': 'uniform', 'min': 0.0001, 'max': 0.1},
        'dropout': {'distribution': 'uniform', 'min': 0.1, 'max': 0.5}
    }
}

# 贝叶斯优化（推荐）
sweep_config = {
    'method': 'bayes',
    'metric': {'name': 'val/loss', 'goal': 'minimize'},
    'parameters': {
        'lr': {'distribution': 'log_uniform_values', 'min': 1e-5, 'max': 1e-1}
    }
}
```

## Artifacts

跟踪数据集、模型及其他文件及其血缘关系。

### 记录 Artifacts

```python
# 创建 artifact
artifact = wandb.Artifact(
    name='training-dataset',
    type='dataset',
    description='ImageNet training split',
    metadata={'size': '1.2M images', 'split': 'train'}
)

# 添加文件
artifact.add_file('data/train.csv')
artifact.add_dir('data/images/')

# 记录 artifact
wandb.log_artifact(artifact)
```

### 使用 Artifacts

```python
# 下载并使用 artifact
run = wandb.init(project="my-project")

# 下载 artifact
artifact = run.use_artifact('training-dataset:latest')
artifact_dir = artifact.download()

# 使用数据
data = load_data(f"{artifact_dir}/train.csv")
```

### 模型注册表

```python
# 将模型记录为制品
model_artifact = wandb.Artifact(
    name='resnet50-model',
    type='model',
    metadata={'architecture': 'ResNet50', 'accuracy': 0.95}
)

model_artifact.add_file('model.pth')
wandb.log_artifact(model_artifact, aliases=['best', 'production'])

# 关联到模型注册表
run.link_artifact(model_artifact, 'model-registry/production-models')
```

## 集成示例

### HuggingFace Transformers

```python
from transformers import Trainer, TrainingArguments
import wandb

# 初始化 W&B
wandb.init(project="hf-transformers")

# 带 W&B 的训练参数
training_args = TrainingArguments(
    output_dir="./results",
    report_to="wandb",  # 启用 W&B 日志记录
    run_name="bert-finetuning",
    logging_steps=100,
    save_steps=500
)

# Trainer 会自动记录到 W&B
trainer = Trainer(
    model=model,
    args=training_args,
    train_dataset=train_dataset,
    eval_dataset=eval_dataset
)

trainer.train()
```

### PyTorch Lightning

```python
from pytorch_lightning import Trainer
from pytorch_lightning.loggers import WandbLogger
import wandb

# 创建 W&B logger
wandb_logger = WandbLogger(
    project="lightning-demo",
    log_model=True  # 记录模型检查点
)

# 与 Trainer 配合使用
trainer = Trainer(
    logger=wandb_logger,
    max_epochs=10
)

trainer.fit(model, datamodule=dm)
```

### Keras/TensorFlow

```python
import wandb
from wandb.integration.keras import WandbMetricsLogger, WandbModelCheckpoint

# 初始化
wandb.init(project="keras-demo")

# 添加回调（一体式的 WandbCallback 已被移除；
# 请改用 wandb.integration.keras 中专用的回调）
model.fit(
    x_train, y_train,
    validation_data=(x_val, y_val),
    epochs=10,
    callbacks=[
        WandbMetricsLogger(),                        # 自动记录指标
        WandbModelCheckpoint("models/model-{epoch}")  # 保存检查点
    ]
)
```

## 可视化与分析

### 自定义图表

```python
# 记录自定义可视化
import matplotlib.pyplot as plt

fig, ax = plt.subplots()
ax.plot(x, y)
wandb.log({"custom_plot": wandb.Image(fig)})

# 记录混淆矩阵
wandb.log({"conf_mat": wandb.plot.confusion_matrix(
    probs=None,
    y_true=ground_truth,
    preds=predictions,
    class_names=class_names
)})
```

### 报告

在 W&B UI 中创建可分享的报告：
- 组合运行、图表与文本
- 支持 Markdown
- 可嵌入的可视化
- 团队协作

## 最佳实践

### 1. 用标签与分组进行组织

```python
wandb.init(
    project="my-project",
    tags=["baseline", "resnet50", "imagenet"],
    group="resnet-experiments",  # 将相关的运行分组
    job_type="train"             # 作业类型
)
```

### 2. 记录所有相关内容

```python
# 记录系统指标
wandb.log({
    "gpu/util": gpu_utilization,
    "gpu/memory": gpu_memory_used,
    "cpu/util": cpu_utilization
})

# 记录代码版本
wandb.log({"git_commit": git_commit_hash})

# 记录数据划分
wandb.log({
    "data/train_size": len(train_dataset),
    "data/val_size": len(val_dataset)
})
```

### 3. 使用描述性名称

```python
# ✅ 良好：描述性的运行名称
wandb.init(
    project="nlp-classification",
    name="bert-base-lr0.001-bs32-epoch10"
)

# ❌ 不佳：通用名称
wandb.init(project="nlp", name="run1")
```

### 4. 保存重要的制品

```python
# 保存最终模型
artifact = wandb.Artifact('final-model', type='model')
artifact.add_file('model.pth')
wandb.log_artifact(artifact)

# 保存预测结果以供分析
predictions_table = wandb.Table(
    columns=["id", "input", "prediction", "ground_truth"],
    data=predictions_data
)
wandb.log({"predictions": predictions_table})
```

### 5. 在连接不稳定时使用离线模式

```python
import os

# 启用离线模式
os.environ["WANDB_MODE"] = "offline"

wandb.init(project="my-project")
# ... 你的代码 ...

# 稍后同步
# wandb sync <run_directory>
```

## 团队协作

### 分享运行

```python
# 运行可通过 URL 自动分享
run = wandb.init(project="team-project")
print(f"Share this URL: {run.url}")
```

### 团队项目

- 在 wandb.ai 创建团队账户
- 添加团队成员
- 设置项目可见性（私有/公开）
- 使用团队级制品与模型注册表

## 定价

- **免费版**：无限公开项目，100GB 存储
- **学术版**：面向学生/研究者免费
- **团队版**：每席位每月 $50，私有项目，无限存储
- **企业版**：定制定价，支持本地部署

## 资源

- **文档**：https://docs.wandb.ai
- **GitHub**：https://github.com/wandb/wandb（10.5k+ stars）
- **示例**：https://github.com/wandb/examples
- **社区**：https://wandb.ai/community
- **Discord**：https://wandb.me/discord

## 另请参阅

- `references/sweeps.md` - 全面的超参数优化指南
- `references/artifacts.md` - 数据与模型版本管理的方式
- `references/integrations.md` - 各框架的具体示例
