# `@toonflow/workflow` 详细设计说明

## 1. 文档目的

本文档是 [`05-workflow-engine.md`](./05-workflow-engine.md) 的详细设计补充，用于固定 Phase 5 中 `@toonflow/workflow` 的共享规则、包边界与实现约束。  
阶段说明文档回答“本阶段交付什么、边界如何界定”，本文回答“`@toonflow/workflow` 在统一约束下如何落地”。

相关文档：

- 架构总览：[`architecture-overview.md`](./architecture-overview.md)
- 第 3 阶段详细设计：[`03-application-services-spec.md`](./03-application-services-spec.md)
- 第 4 阶段详细设计：[`04-agent-runtime-spec.md`](./04-agent-runtime-spec.md)
- 设计输入：[`../superpowers/specs/2026-03-28-workflow-engine-design.md`](../superpowers/specs/2026-03-28-workflow-engine-design.md)

## 2. 设计目标

- 明确 `@toonflow/workflow` 作为内容生产主链编排层的包边界与依赖方向。
- 固定 Phase 5 的共享语义：阶段模型、运行状态语义、审核与返工归属、失败与重试边界。
- 保持与 [`05-workflow-engine.md`](./05-workflow-engine.md) 一致的职责拆分：`workflow` 编排、`agents` 单次运行、`services` 正式沉淀。
- 为后续第 5 至第 14 节的细化约束提供统一前提，避免实现阶段出现边界漂移。

## 3. 非目标

- 不把本文写成通用工作流平台或多业务线流程框架设计文档。
- 不在本文中绑定具体任务队列、worker、调度基础设施或部署方案。
- 不把传输层协议适配（HTTP、WebSocket、SSE、MCP）纳入 `@toonflow/workflow`。
- 不在 Phase 5 中纳入 `publish_ready`、`published` 等超出首批主链范围的流程。

## 4. 包边界与依赖规则

### 4.1 允许依赖

`@toonflow/workflow` 允许依赖以下共享包：

- `@toonflow/kernel`
- `@toonflow/db`
- `@toonflow/services`
- `@toonflow/agents`

### 4.2 禁止依赖

`@toonflow/workflow` 明确禁止依赖以下对象：

- `apps/*`
- `@toonflow/ai-providers`
- `@toonflow/storage`
- 入口层私有协议（包括入口层内部传输协议与私有上下文约定）

## 5. 阶段模型与状态语义

第 5 阶段的状态语义采用三层表达，避免把业务阶段、运行生命周期与单次执行结果混在一条状态链里。

### 5.1 业务检查点阶段（stage）

Phase 5 主链只包含以下稳定业务检查点：

- `outline`
- `script`
- `storyboard`
- `assets`
- `video`
- `review`

补充约束：

- `novel_imported` 是启动前置条件（项目可启动 workflow run 的前提），不是正式 workflow stage。
- `publish_ready`、`published` 不属于 Phase 5 主链状态机，留给后续更上层流程定义。
- 审核返工只能回退到上述稳定业务检查点，不能回退到瞬时执行态。

### 5.2 运行生命周期状态（run lifecycle）

运行生命周期用于表达“这次编排当前处于什么运行状态”，与业务阶段分层表达，至少覆盖：

- `queued`
- `running`
- `waiting_review`
- `paused`
- `failed`
- `completed`
- `terminated`

语义要求：

- 生命周期状态回答“run 现在是否在执行/等待/暂停/终止”。
- 业务阶段回答“主链推进到哪个业务检查点”。
- 审核业务结果（如 `approved`/`rework`/`rejected`）不等同于系统执行失败。

### 5.3 阶段尝试状态（step attempt）

单个业务阶段的执行历史必须以 `step attempt` 单独表达，并固定以下状态集合：

- `pending`
- `running`
- `succeeded`
- `failed`
- `skipped`

该层用于表达同一阶段的首次执行、失败重试、审核返工重做等多次尝试，不覆盖写回 stage 或 run 的聚合字段。

## 6. 数据模型

Phase 5 至少包含以下四类 workflow 主模型，分别记录不同粒度的事实，避免跨层覆盖写入导致历史丢失。

### 6.1 `workflow_run`

- 表达的事实：一次工作流主链运行的全局事实（所属项目、当前业务阶段、当前生命周期状态、启动参数快照、终态摘要等）。
- 与其他模型关系：`workflow_run` 是根实体，1 对多关联 `workflow_step`、`workflow_review_task`。
- 不覆盖写回原因：run 只承载“全局当前态与全局摘要”，不能承载每个阶段的多次执行细节与审核明细。

### 6.2 `workflow_step`

- 表达的事实：某个 run 内某个业务检查点阶段的聚合视图（阶段是否已完成、最近结果、是否等待重做等）。
- 与其他模型关系：`workflow_step` 属于某个 `workflow_run`，并 1 对多关联 `workflow_step_attempt`。
- 不覆盖写回原因：step 需要稳定聚合同一阶段多次 attempt 的当前结论，直接写回 run 会丢失阶段级边界，无法清晰回答“哪个阶段失败/成功”。

### 6.3 `workflow_step_attempt`

- 表达的事实：某个阶段的一次具体执行尝试，包括触发原因、开始/结束时间、执行状态、错误摘要、关联 agent run 与 service 沉淀摘要。
- 与其他模型关系：`workflow_step_attempt` 从属于某个 `workflow_step`，按 attempt 序号形成历史链。
- 不覆盖写回原因：失败重试与审核返工要求保留完整执行历史；若只把“最新结果”覆盖写回 `workflow_step` 或 `workflow_run`，将无法审计“第几次尝试成功/失败、失败原因是否变化、重试是否有效”，也无法支持“重试指定失败 attempt”的命令语义。

### 6.4 `workflow_review_task`

- 表达的事实：审核停点与审核决定事实（审核目标阶段、审核状态、决定类型、理由、操作人、回退目标等）。
- 与其他模型关系：`workflow_review_task` 从属于某个 `workflow_run`，并与目标 `workflow_step` 建立引用关系。
- 不覆盖写回原因：审核记录是独立业务对象，不应简化为 run 上单个“审核结果”字段；否则会丢失审核过程、操作人和返工依据。

## 7. 对外命令与查询接口

`@toonflow/workflow` 对入口层（`apps/api`、`apps/mcp-server`）暴露业务命令与查询接口，不暴露手工推进主链的内部动作。

### 7.1 命令接口

应提供以下命令能力：

- 启动 run：创建并启动新的 `workflow_run`。
- 暂停 run：将活跃 run 置为 `paused`，停止后续调度。
- 恢复 run：将 `paused` run 恢复为可调度状态。
- 重试：支持重试当前失败阶段，或重试指定失败 `workflow_step_attempt`。
- 提交审核决定：提交 `approved` / `rework` / `rejected`，由 workflow 内部状态机决定推进、回退或终止。

明确排除项：

- `advance(runId)` 不作为页面或控制台手工推进主链的核心命令对外暴露。
- “下一步执行哪个阶段、是否等待审核、何时自动继续”由 workflow 内部状态机与调度器决定。

### 7.2 查询接口

应提供以下查询能力：

- 查询 run 状态：返回 `workflow_run` 当前业务阶段、生命周期状态与终态摘要。
- 查询阶段时间线：返回 `workflow_step` 聚合视图及 `workflow_step_attempt` 历史，支持排查失败与返工路径。

## 8. 执行编排模型

本节后续补充。

## 9. 审核与返工规则

本节后续补充。

## 10. 事件模型与投递边界

本节后续补充。

## 11. 失败、重试与幂等约束

本节后续补充。

## 12. 建议目录结构

本节后续补充。

## 13. 测试与验证基线

本节后续补充。

## 14. 实施范围与衔接

本节后续补充。
