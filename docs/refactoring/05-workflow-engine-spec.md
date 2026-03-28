# `@toonflow/workflow` 详细设计说明

## 1. 文档目的

本文档是 [`05-workflow-engine.md`](./05-workflow-engine.md) 的详细设计补充，用于固定 Phase 5 中 `@toonflow/workflow` 的共享规则、包边界与实现约束。  
阶段说明文档回答“本阶段交付什么、边界如何界定”，本文回答“`@toonflow/workflow` 在统一约束下如何落地”。

相关文档：

- 架构总览：[`architecture-overview.md`](./architecture-overview.md)
- 第 3 阶段阶段说明：[`03-application-services.md`](./03-application-services.md)
- 第 3 阶段详细设计：[`03-application-services-spec.md`](./03-application-services-spec.md)
- 第 4 阶段阶段说明：[`04-agent-runtime.md`](./04-agent-runtime.md)
- 第 4 阶段详细设计：[`04-agent-runtime-spec.md`](./04-agent-runtime-spec.md)
- 第 6 阶段阶段说明：[`06-api-gateway.md`](./06-api-gateway.md)
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

本节固定 `@toonflow/workflow` 的执行编排职责拆分，避免把命令入口、状态迁移、阶段执行、持久化和事件发布耦合在一个对象里。

### 8.1 核心组件与职责

- `WorkflowRunService`
  - 接收外部命令（启动、暂停、恢复、重试、提交审核决定）。
  - 负责命令级校验（如单项目单活跃 run 约束、命令前置状态校验）。
  - 协调 `WorkflowStateMachine`、`StepOrchestrator`、`WorkflowRepository` 与 `SchedulerPort`，但不内联状态迁移规则。
- `WorkflowStateMachine`
  - 定义 workflow 的合法状态迁移与阶段推进规则。
  - 统一表达自动推进、等待审核、返工回退、完成/终止等迁移判定。
  - 不执行数据库写入，不直接调用 Agent 或 service。
- `StepOrchestrator`
  - 负责单个业务阶段执行编排，组合 `agents + services`。
  - 顺序为：装配上下文 -> 触发单次 `agent run` -> 调用对应 service 显式沉淀。
  - 执行完成后回传阶段结果给状态机，决定下一步。
- `WorkflowRepository`
  - 负责 workflow 自身持久化：`workflow_run`、`workflow_step`、`workflow_step_attempt`、`workflow_review_task` 及事件/outbox 记录。
  - 不吞并业务域 repository 职责，领域数据持久化仍由 `@toonflow/services` 负责。
- `WorkflowEventPublisher`
  - 负责把 workflow 的稳定业务事件发布到对外消费边界。
  - 保证发布对象是 workflow 级契约，而非 agent 内部事件原文。
- `SchedulerPort`
  - 负责表达“何时唤醒下一步执行”的抽象端口。
  - 第 5 阶段只定义调度语义（入队、延迟、唤醒、去重键），不绑定具体队列/worker 技术。

### 8.2 执行流转约束

1. 外部入口把命令提交给 `WorkflowRunService`。
2. `WorkflowRunService` 完成校验并通过 `WorkflowRepository` 读取/写入 run 聚合状态。
3. 需要阶段执行时，由 `SchedulerPort` 触发或唤醒 `StepOrchestrator`。
4. `StepOrchestrator` 执行阶段并写入 attempt 事实。
5. `WorkflowStateMachine` 基于最新事实计算下一迁移。
6. `WorkflowEventPublisher` 发布 workflow 业务事件。

### 8.3 第 5 阶段技术绑定约束

- 第 5 阶段不规定必须使用某个队列、任务系统或 worker 运行时。
- `SchedulerPort` 是唯一调度依赖面，具体基础设施在后续阶段或部署层实现。
- 任何实现都必须满足“至少一次调度语义 + 幂等沉淀”的组合约束（见第 11 节）。

## 9. 审核与返工规则

### 9.1 审核等待归属

- `waiting_review` 是 workflow run 生命周期中的正式状态，由 `WorkflowStateMachine` 定义与迁移。
- 审核等待不是入口层补丁逻辑，不允许由 `apps/api` 或页面状态自行拼接“待审核”语义。

### 9.2 `review-console` 边界

- `review-console` 只负责消费审核任务并提交审核决定（`approved` / `rework` / `rejected`）。
- `review-console` 不负责推进阶段、不负责改写 run 状态机、不负责回退计算。
- 审核决定提交后，由 `WorkflowRunService + WorkflowStateMachine` 统一落地状态迁移。

### 9.3 返工与拒绝语义

- `rework` 是业务路径，表示审核要求回退并重做，不是系统失败。
- `rejected` 是业务终态，表示该 run 以业务拒绝结束，不是技术异常。
- 系统失败（`failed`）仅用于表达阶段执行异常、依赖故障、沉淀失败等技术问题。

### 9.4 返工回退边界

- 返工只允许回退到稳定业务检查点（`outline/script/storyboard/assets/video/review`）。
- 不允许回退到瞬时执行态或内部中间态（如 `*_generating`）。
- 回退后必须创建新的阶段 attempt，并保留完整历史链路用于审计。

## 10. 事件模型与投递边界

### 10.1 事件分层契约

- workflow 对外只发布稳定业务事件，不直接透传 agent 内部细粒度事件。
- agent 事件（`progress/artifact/result/error`）属于 `@toonflow/agents` 运行时协议层。
- workflow 事件属于主链编排层契约，面向入口层与外围消费方。

### 10.2 事件类型边界

- 阶段执行失败事件：表达技术失败事实（例如阶段 attempt 失败、可重试/不可重试判定）。
- 审核业务结果事件：表达 `approved` / `rework` / `rejected` 决定。
- 人工控制状态事件：表达暂停、恢复、终止等人工命令导致的状态变化。

上述三类必须分开建模与投递，不得混为单一“状态变化”事件。

### 10.3 投递与对外消费约束

- `WorkflowEventPublisher` 发布的是稳定 schema 的 workflow 事件。
- `apps/api`、`apps/mcp-server` 只消费 workflow 事件并做协议转发，不反向定义 workflow 事件语义。
- 事件投递失败处理与补偿可通过 outbox/重投机制实现，但不改变“契约稳定优先”的边界。

## 11. 失败、重试与幂等约束

### 11.1 失败与业务结果分离

- 技术失败：阶段执行异常、依赖超时、service 沉淀失败，映射到 `failed` 生命周期或失败 attempt。
- 业务结果：`approved` / `rework` / `rejected`，由审核流程给出，不映射为技术异常。
- 人工控制：`paused` / `running` / `terminated` 的变化，单独表达，不覆盖失败或审核结果语义。

### 11.2 重试与 attempt 历史

- 每次重试都必须创建新的 `workflow_step_attempt`，禁止覆盖历史 attempt。
- 可重试命令可指向“当前失败阶段”或“指定失败 attempt”，但结果都应沉淀为新 attempt。
- 状态机推进只读取“最新 attempt + 历史上下文”，不破坏审计链。

### 11.3 幂等与至少一次调度

- 调度默认按至少一次（at-least-once）语义建模，允许同一阶段唤醒重复投递。
- 因此 service 沉淀动作必须具备幂等保护（如业务幂等键、自然主键约束或去重记录）。
- `StepOrchestrator` 在执行前后都应检查阶段/attempt 幂等键，避免重复沉淀正式产物。

### 11.4 暂停与恢复语义

- 暂停表示 workflow 不再继续调度下一阶段。
- 暂停不等于强制取消不可中断的底层任务；已在运行中的底层任务可自然结束并回写结果。
- 恢复表示重新进入可调度状态，由 `SchedulerPort` 继续唤醒后续阶段。

## 12. 建议目录结构

以下结构用于约束 `@toonflow/workflow` 包内职责分层，避免单文件巨石实现：

```text
packages/workflow/
├── src/
│   ├── index.ts
│   ├── application/
│   │   └── workflow-run-service.ts
│   ├── state-machine/
│   │   └── workflow-state-machine.ts
│   ├── orchestration/
│   │   └── step-orchestrator.ts
│   ├── repositories/
│   │   └── workflow-repository.ts
│   ├── events/
│   │   ├── workflow-event-publisher.ts
│   │   └── workflow-event-schema.ts
│   ├── scheduler/
│   │   └── scheduler-port.ts
│   └── testing/
├── test/
├── package.json
└── tsconfig.json
```

约束：

- `application/` 只放命令入口与用例协调，不放状态机规则细节。
- `state-machine/` 只放迁移规则与判定逻辑，不依赖入口协议。
- `orchestration/` 只放阶段执行编排，不直接承载对外命令协议。
- `repositories/` 只放 workflow 自身持久化访问，不替代业务域 repository。
- `events/` 只放 workflow 稳定事件契约与发布逻辑。

## 13. 测试与验证基线

第 5 阶段的最小测试基线如下：

- 状态机单测：覆盖合法/非法迁移、审核停点、返工回退目标校验。
- 返工规则单测：覆盖 `rework` 仅回退稳定检查点、`rejected` 终态语义。
- 仓储测试：覆盖 `workflow_run/step/attempt/review_task` 的读写一致性与并发约束。
- 编排测试：覆盖 `StepOrchestrator` 的 `agent -> service` 顺序与失败分支。
- 审核流转测试：覆盖 `waiting_review -> approved/rework/rejected` 的状态变化。
- 事件契约测试：覆盖 workflow 稳定事件 schema、事件类型分离与投递边界。
- 幂等与重试测试：覆盖至少一次调度下重复唤醒不导致重复沉淀。
- 暂停恢复测试：覆盖暂停不继续调度、恢复后可继续推进。

## 14. 实施范围与衔接

本轮实施范围固定如下：

- 重写 [`05-workflow-engine.md`](./05-workflow-engine.md)。
- 新增 [`05-workflow-engine-spec.md`](./05-workflow-engine-spec.md)。

衔接约束：

- 本轮只固定文档口径，不在本任务中引入队列/worker 具体技术绑定。
- 第 3 阶段 `services` 继续持有领域持久化 owner 职责，第 4 阶段 `agents` 继续持有单次运行职责，第 5 阶段 `workflow` 负责编排、审核与状态机。
