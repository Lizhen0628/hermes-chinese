---
title: "子智能体驱动开发 — 通过 delegate_task 子智能体执行计划（两阶段评审）"
sidebar_label: "子智能体驱动开发"
description: "通过 delegate_task 子智能体执行计划（两阶段评审）"
---

{/* 本页面由 website/scripts/generate-skill-docs.py 从技能的 SKILL.md 自动生成。请编辑源文件 SKILL.md，而非此页面。 */}

# 子智能体驱动开发

通过 delegate_task 子智能体执行计划（两阶段评审）。

## 技能元数据

| | |
|---|---|
| 来源 | 可选 — 使用 `hermes skills install official/software-development/subagent-driven-development` 安装 |
| 路径 | `optional-skills/software-development\subagent-driven-development` |
| 版本 | `1.1.0` |
| 作者 | Hermes Agent（改编自 obra/superpowers） |
| 许可证 | MIT |
| 平台 | linux, macos, windows |
| 标签 | `delegation`、`subagent`、`implementation`、`workflow`、`parallel` |
| 相关技能 | [`requesting-code-review`](/docs/user-guide/skills/bundled/software-development/software-development-requesting-code-review)、[`test-driven-development`](/docs/user-guide/skills/bundled/software-development/software-development-test-driven-development) |

## 参考：完整 SKILL.md

:::info
以下是此技能被触发时 Hermes 加载的完整技能定义。当该技能处于激活状态时，这就是智能体看到的指令内容。
:::

# 子智能体驱动开发

## 概述

通过为每个任务分派全新的子智能体，并配合系统化的两阶段评审来执行实现计划。

**核心原则：** 每个任务使用全新子智能体 + 两阶段评审（先规范后质量）= 高质量、快速迭代。

## 何时使用

在以下情况使用此技能：
- 你有一个实现计划（来自 `plan` 技能或用户需求）
- 任务基本相互独立
- 质量与规范符合度很重要
- 你希望任务之间进行自动化评审

**与手动执行对比：**
- 每个任务使用全新上下文（不受累积状态干扰）
- 自动化评审流程尽早发现问题
- 所有任务采用一致的质量检查
- 子智能体可在开始工作前提出问题

## 流程

### 1. 阅读并解析计划

阅读计划文件。预先提取所有任务及其完整文本和上下文。创建 todo 列表：

```python
# 阅读计划
read_file("docs/plans/feature-plan.md")

# 创建包含所有任务的 todo 列表
todo([
    {"id": "task-1", "content": "Create User model with email field", "status": "pending"},
    {"id": "task-2", "content": "Add password hashing utility", "status": "pending"},
    {"id": "task-3", "content": "Create login endpoint", "status": "pending"},
])
```

**关键点：** 只阅读计划一次。提取所有内容。不要让子智能体自己去阅读计划文件 — 而是直接在上下文中提供完整的任务文本。

### 2. 每个任务的工作流

对于计划中的每个任务：

#### 步骤 1：分派实现者子智能体

使用 `delegate_task`，并提供完整上下文：

```python
delegate_task(
    goal="Implement Task 1: Create User model with email and password_hash fields",
    context="""
    TASK FROM PLAN:
    - Create: src/models/user.py
    - Add User class with email (str) and password_hash (str) fields
    - Use bcrypt for password hashing
    - Include __repr__ for debugging

    FOLLOW TDD:
    1. Write failing test in tests/models/test_user.py
    2. Run: pytest tests/models/test_user.py -v (verify FAIL)
    3. Write minimal implementation
    4. Run: pytest tests/models/test_user.py -v (verify PASS)
    5. Run: pytest tests/ -q (verify no regressions)
    6. Commit: git add -A && git commit -m "feat: add User model with password hashing"

    PROJECT CONTEXT:
    - Python 3.11, Flask app in src/app.py
    - Existing models in src/models/
    - Tests use pytest, run from project root
    - bcrypt already in requirements.txt
    """,
    toolsets=['terminal', 'file']
)
```

#### 步骤 2：分派规范符合度评审者

实现者完成后，对照原始规范进行验证：

```python
delegate_task(
    goal="Review if implementation matches the spec from the plan",
    context="""
    ORIGINAL TASK SPEC:
    - Create src/models/user.py with User class
    - Fields: email (str), password_hash (str)
    - Use bcrypt for password hashing
    - Include __repr__

    CHECK:
    - [ ] All requirements from spec implemented?
    - [ ] File paths match spec?
    - [ ] Function signatures match spec?
    - [ ] Behavior matches expected?
    - [ ] Nothing extra added (no scope creep)?

    OUTPUT: PASS or list of specific spec gaps to fix.
    """,
    toolsets=['file']
)
```

**如果发现规范问题：** 修复缺漏，然后重新运行规范评审。只有规范符合后才继续。

#### 步骤 3：分派代码质量评审者

规范符合度通过后：

```python
delegate_task(
    goal="Review code quality for Task 1 implementation",
    context="""
    FILES TO REVIEW:
    - src/models/user.py
    - tests/models/test_user.py

    CHECK:
    - [ ] Follows project conventions and style?
    - [ ] Proper error handling?
    - [ ] Clear variable/function names?
    - [ ] Adequate test coverage?
    - [ ] No obvious bugs or missed edge cases?
    - [ ] No security issues?

    OUTPUT FORMAT:
    - Critical Issues: [must fix before proceeding]
    - Important Issues: [should fix]
    - Minor Issues: [optional]
    - Verdict: APPROVED or REQUEST_CHANGES
    """,
    toolsets=['file']
)
```

**如果发现质量问题：** 修复问题，重新评审。只有通过后才继续。

#### 步骤 4：标记完成

```python
todo([{"id": "task-1", "content": "Create User model with email field", "status": "completed"}], merge=True)
```

### 3. 最终评审

所有任务完成后，分派一位最终集成评审者：

```python
delegate_task(
    goal="Review the entire implementation for consistency and integration issues",
    context="""
    All tasks from the plan are complete. Review the full implementation:
    - Do all components work together?
    - Any inconsistencies between tasks?
    - All tests passing?
    - Ready for merge?
    """,
    toolsets=['terminal', 'file']
)
```

### 4. 验证并提交

```bash
# 运行完整测试套件
pytest tests/ -q

# 审查所有更改
git diff --stat

# 如有需要，进行最终提交
git add -A && git commit -m "feat: complete [feature name] implementation"
```

## 任务粒度

**每个任务 = 2-5 分钟的专注工作。**

**过大：**
- "Implement user authentication system"

**合适大小：**
- "Create User model with email and password fields"
- "Add password hashing function"
- "Create login endpoint"
- "Add JWT token generation"
- "Create registration endpoint"

## 危险信号 — 绝不要做这些

- 没有计划就开始实现
- 跳过评审（规范符合度或代码质量）
- 在存在未修复的关键/重要问题时继续推进
- 为触及相同文件的多个任务分派多个实现者子智能体
- 让子智能体阅读计划文件（应在上下文中提供完整文本）
- 跳过背景设定上下文（子智能体需要理解任务在全局中的位置）
- 忽略子智能体的问题（先回答问题再让其继续）
- 在规范符合度上接受"差不多"
- 跳过评审循环（评审者发现问题 → 实现者修复 → 再次评审）
- 让实现者自评为真正的评审（两者都需要）
- **在规范符合度为 PASS 之前就开始代码质量评审**（顺序错误）
- 在任一评审仍有未解决问题时就进入下一个任务

## 处理问题

### 如果子智能体提出问题

- 清晰、完整地回答
- 必要时提供额外上下文
- 不要催促他们进入实现阶段

### 如果评审者发现问题

- 由实现者子智能体（或新的子智能体）修复
- 评审者再次评审
- 重复直到通过
- 不要跳过重新评审

### 如果子智能体任务失败

- 分派新的修复子智能体，并针对出错之处给出具体指示
- 不要尝试在控制者会话中手动修复（会污染上下文）

## 效率说明

**为什么每个任务使用全新子智能体：**
- 防止累积状态造成的上下文污染
- 每个子智能体获得干净、专注的上下文
- 不会受之前任务的代码或推理干扰

**为什么采用两阶段评审：**
- 规范评审尽早发现实现不足或过度实现
- 质量评审确保实现构建良好
- 在问题跨任务累积之前将其发现

**成本权衡：**
- 更多子智能体调用（每个任务：实现者 + 2 位评审者）
- 但能尽早发现问题（比之后调试累积的问题更便宜）

## 与其他技能的集成

### 与 plan 配合

此技能用于执行由 `plan` 技能创建的计划：
1. 用户需求 → 计划 → 实现计划
2. 实现计划 → 子智能体驱动开发 → 可运行代码

### 与 test-driven-development 配合

实现者子智能体应遵循 TDD：
1. 先编写失败的测试
2. 实现最小代码
3. 验证测试通过
4. 提交

在每个实现者上下文中都包含 TDD 指令。

### 与 requesting-code-review 配合

两阶段评审流程本身就是代码评审。对于最终集成评审，请使用 requesting-code-review 技能的评审维度。

### 与 systematic-debugging 配合

如果子智能体在实现过程中遇到 bug：
1. 遵循 systematic-debugging 流程
2. 先找到根本原因再修复
3. 编写回归测试
4. 恢复实现工作

## 工作流示例

```
[阅读计划：docs/plans/auth-feature.md]
[创建包含 5 个任务的 todo 列表]

--- 任务 1：创建 User 模型 ---
[分派实现者子智能体]
  实现者："email 应该唯一吗？"
  你："是的，email 必须唯一"
  实现者：已实现，3/3 测试通过，已提交。

[分派规范评审者]
  规范评审者：✅ PASS — 所有需求均满足

[分派质量评审者]
  质量评审者：✅ APPROVED — 代码整洁，测试良好

[标记任务 1完成]

--- 任务 2：密码哈希 ---
[分派实现者子智能体]
  实现者：无问题，已实现，5/5 测试通过。

[分派规范评审者]
  规范评审者：❌ 缺少：密码强度验证（规范中提到 "min 8 chars"）

[实现者修复]
  实现者：已添加验证，7/7 测试通过。

[再次分派规范评审者]
  规范评审者：✅ PASS

[分派质量评审者]
  质量评审者：重要：魔法数字 8，应提取为常量
  实现者：已提取 MIN_PASSWORD_LENGTH 常量
  质量评审者：✅ APPROVED

[标记任务 2 完成]

... （继续处理所有任务）

[所有任务完成后：分派最终集成评审者]
[运行完整测试套件：全部通过]
[完成！]
```

## 牢记

```
每个任务使用全新子智能体
每次都进行两阶段评审
规范符合度优先
代码质量次之
永不跳过评审
尽早发现问题
```

**质量不是偶然。它是系统化流程的产物。**

## 延伸阅读（按需加载）

当编排涉及大量上下文使用、冗长的评审循环或复杂的验证检查点时，加载以下参考资料以了解具体的纪律：

- **`references/context-budget-discipline.md`** — 四级上下文退化模型（PEAK / GOOD / DEGRADING / POOR）、随上下文窗口大小扩展的读取深度规则，以及静默退化的早期预警信号。当一次运行明显会消耗大量上下文时加载（多阶段计划、大量子智能体、大型产物）。
- **`references/gates-taxonomy.md`** — 四种规范门类型（Pre-flight、Revision、Escalation、Abort）及其行为、恢复与示例。在设计或评审任何带有验证检查点的工作流时加载 — 明确使用这些术语，以便每个门都有明确的进入条件、失败行为与恢复规则。

两份参考资料均改编自 gsd-build/get-shit-done（MIT © 2025 Lex Christopherson）。
