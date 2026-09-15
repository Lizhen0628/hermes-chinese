---
title: "Pinecone Research — 使用 Pinecone 实现智能体 RAG 与长期记忆"
sidebar_label: "Pinecone Research"
description: "使用 Pinecone 实现智能体 RAG 与长期记忆"
---

{/* 本页面由 website/scripts/generate-skill-docs.py 根据该技能的 SKILL.md 自动生成。请编辑源文件 SKILL.md，而非此页面。 */}

# Pinecone Research

使用 Pinecone 实现智能体 RAG 与长期记忆。

## 技能元数据

| | |
|---|---|
| Source | Optional — install with `hermes skills install official/research/pinecone-research` |
| Path | `optional-skills/research\pinecone-research` |
| Version | `1.0.0` |
| Author | immuhammadfurqan |
| License | MIT |
| Dependencies | `pinecone-client`, `langchain-pinecone` |
| Platforms | linux, macos, windows |
| Tags | `RAG`, `Pinecone`, `Memory`, `Research`, `Vector Database`, `Agent`, `Retrieval` |

## 参考：完整 SKILL.md

:::info
以下是 Hermes 在触发此技能时加载的完整技能定义。当该技能处于激活状态时，这就是智能体看到的指令内容。
:::

# Pinecone Research — Agent RAG & 长期记忆

将 Pinecone 用作智能体对话的检索增强生成（RAG）后端：持久化
嵌入、从过往会话中检索相关上下文，并构建长期记忆。

## 何时使用此技能

**适用场景：**
- 使用 Pinecone 作为向量存储来构建智能体 RAG 流程
- 需要跨智能体会话的持久长期记忆
- 将检索与智能体工具使用相结合
- 研究或原型验证语义搜索工作流

**以下情况请改用 mlops/pinecone 技能：**
- 需要通用的 Pinecone 参考（索引管理、CRUD、混合搜索）
- 处理不涉及智能体集成的生产基础设施

## 快速开始

### 配置

```bash
pip install pinecone-client langchain-pinecone langchain-openai
```

设置你的 API 密钥：
```bash
export PINECONE_API_KEY="your-api-key"
```

### 基础 RAG 流程

```python
from pinecone import Pinecone, ServerlessSpec
from langchain_pinecone import PineconeVectorStore
from langchain_openai import OpenAIEmbeddings

# Initialize Pinecone
pc = Pinecone(api_key=os.environ["PINECONE_API_KEY"])

# Create or connect to index
index_name = "agent-memory"
if index_name not in [i.name for i in pc.list_indexes()]:
    pc.create_index(
        name=index_name,
        dimension=1536,
        metric="cosine",
        spec=ServerlessSpec(cloud="aws", region="us-east-1"),
    )

# Build vector store
vectorstore = PineconeVectorStore.from_documents(
    documents=docs,
    embedding=OpenAIEmbeddings(),
    index_name=index_name,
)

# Retrieve relevant context
retriever = vectorstore.as_retriever(search_kwargs={"k": 5})
results = retriever.invoke("What did the agent discuss yesterday?")
```

### 基于命名空间的会话记忆

```python
# Store per-session memory
vectorstore = PineconeVectorStore(
    index=pc.Index(index_name),
    embedding=OpenAIEmbeddings(),
    namespace=f"session-{session_id}",
)

# Query across all sessions (no namespace filter)
all_memory = PineconeVectorStore(
    index=pc.Index(index_name),
    embedding=OpenAIEmbeddings(),
)
results = all_memory.similarity_search("relevant query", k=10)
```

## 最佳实践

1. **按会话或用户划分命名空间** — 为多租户智能体隔离数据
2. **批量 upsert** — 每批 100–200 个向量以提高效率
3. **元数据过滤** — 为向量标记会话 ID、时间戳、主题
4. **清理旧记忆** — 删除过期的命名空间以控制成本
5. **使用 serverless** — 自动扩缩容，按使用量付费

## 资源

- **Pinecone Docs**: https://docs.pinecone.io
- **LangChain Integration**: https://python.langchain.com/docs/integrations/vectorstores/pinecone
- **Free Tier**: 1 index, 100K vectors (1536 dimensions)
