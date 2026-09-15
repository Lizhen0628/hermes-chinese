---
title: "Pinecone Research — 使用 Pinecone 的智能体 RAG 和长期记忆"
sidebar_label: "Pinecone Research"
description: "使用 Pinecone 的智能体 RAG 和长期记忆"
---

{/* 本页由 website/scripts/generate-skill-docs.py 根据技能的 SKILL.md 自动生成。请修改源文件 SKILL.md，而非本页。 */}

# Pinecone Research

使用 Pinecone 实现智能体 RAG 和长期记忆。

## 技能元数据

| | |
|---|---|
| Source | 可选 — 通过 `hermes skills install official/research/pinecone-research` 安装 |
| Path | `optional-skills/research\pinecone-research` |
| Version | `1.0.0` |
| Author | immuhammadfurqan |
| License | MIT |
| Dependencies | `pinecone-client`、`langchain-pinecone` |
| Platforms | linux、macos、windows |
| Tags | `RAG`、`Pinecone`、`Memory`、`Research`、`Vector Database`、`Agent`、`Retrieval` |

## 参考：完整 SKILL.md

:::info
以下是 Hermes 在此技能被触发时加载的完整技能定义。这就是技能激活时智能体看到的指令。
:::

# Pinecone Research — 智能体 RAG 与长期记忆

将 Pinecone 用作智能体对话的检索增强生成（RAG）后端：持久化嵌入、
从过往会话中检索相关上下文，并构建长期记忆。

## 何时使用此技能

**在以下情况使用：**
- 构建以 Pinecone 作为向量存储的智能体 RAG 流水线
- 需要跨智能体会话的持久长期记忆
- 将检索与智能体工具使用相结合
- 研究或原型化语义搜索工作流

**在以下情况改用 mlops/pinecone 技能：**
- 需要通用的 Pinecone 参考（索引管理、CRUD、混合搜索）
- 从事无智能体集成方的生产基础设施

## 快速开始

### 设置

```bash
pip install pinecone-client langchain-pinecone langchain-openai
```

设置你的 API 密钥：
```bash
export PINECONE_API_KEY="your-api-key"
```

### 基础 RAG 流水线

```python
from pinecone import Pinecone, ServerlessSpec
from langchain_pinecone import PineconeVectorStore
from langchain_openai import OpenAIEmbeddings

# 初始化 Pinecone
pc = Pinecone(api_key=os.environ["PINECONE_API_KEY"])

# 创建或连接到索引
index_name = "agent-memory"
if index_name not in [i.name for i in pc.list_indexes()]:
    pc.create_index(
        name=index_name,
        dimension=1536,
        metric="cosine",
        spec=ServerlessSpec(cloud="aws", region="us-east-1"),
    )

# 构建向量存储
vectorstore = PineconeVectorStore.from_documents(
    documents=docs,
    embedding=OpenAIEmbeddings(),
    index_name=index_name,
)

# 检索相关上下文
retriever = vectorstore.as_retriever(search_kwargs={"k": 5})
results = retriever.invoke("What did the agent discuss yesterday?")
```

### 基于命名空间的会话记忆

```python
# 存储按会话隔离的记忆
vectorstore = PineconeVectorStore(
    index=pc.Index(index_name),
    embedding=OpenAIEmbeddings(),
    namespace=f"session-{session_id}",
)

# 跨所有会话查询（不设命名空间过滤）
all_memory = PineconeVectorStore(
    index=pc.Index(index_name),
    embedding=OpenAIEmbeddings(),
)
results = all_memory.similarity_search("relevant query", k=10)
```

## 最佳实践

1. **按会话或用户划分命名空间** —— 为多租户智能体隔离数据
2. **批量 upsert** —— 为提高效率每批 100–200 个向量
3. **元数据过滤** —— 用会话 ID、时间戳、主题为向量打标签
4. **清理旧记忆** —— 删除过期的命名空间以控制成本
5. **使用无服务器** —— 自动扩缩容，按使用量付费的定价模式

## 资源

- **Pinecone 文档**：https://docs.pinecone.io
- **LangChain 集成**：https://python.langchain.com/docs/integrations/vectorstores/pinecone
- **免费套餐**：1 个索引、10 万个向量（1536 维）
