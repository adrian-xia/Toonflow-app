# Toonflow 第 5 阶段工作流引擎设计

## 概述

本文档定义 Toonflow 第 5 阶段的设计目标：将内容生产主链的长流程编排能力沉淀到 `packages/workflow`，形成位于 `@toonflow/db`、`@toonflow/services`、`@toonflow/agents`、`@toonflow/kernel` 之上的专用工作流引擎层，并以双层文档方式重写第 5 阶段的 refactoring 文档：

- `docs/refactoring/05-workflow-engine.md`
- `docs/refactoring/05-workflow-engine-spec.md`

本设计直接对齐以下文档：

- 架构总览：[`docs/refactoring/architecture-overview.md`](../../refactoring/architecture-overview.md)
- 第 3 阶段说明：[`docs/refactoring/03-application-services.md`](../../refactoring/03-application-services.md)
- 第 3 阶段详细设计：[`docs/refactoring/03-application-services-spec.md`](../../refactoring/03-application-services-spec.md)
- 第 4 阶段说明：[`docs/refactoring/04-agent-runtime.md`](../../refactoring/04-agent-runtime.md)
- 第 4 阶段详细设计：[`docs/refactoring/04-agent-runtime-spec.md`](../../refactoring/04-agent-runtime-spec.md)
- 第 6 阶段阶段文档：[`docs/refactoring/06-api-gateway.md`](../../refactoring/06-api-gateway.md)

本文档服务于后续实施计划，不承担旧页面操作流程梳理手册的职责，也不把第 5 阶段提前扩写为具体队列或 worker 基础设施选型文档。

## 术语约定

为避免后续 planning 混淆，本设计固定使用以下术语：

- `业务检查点阶段（stage）`
  - 指内容生产主链中的稳定业务节点，只包含 `outline`、`script`、`storyboard`、`assets`、`video`、`review`。
  - 阶段用于表达“当前主链在业务上推进到哪里”，而不是表达瞬时执行态。
- `阶段尝试（step attempt）`
  - 指某个业务检查点阶段的一次具体执行尝试。
  - 首次执行、失败重试、审核返工后重做都属于不同的 `attempt`。
- `业务用例（use case）`
  - 指由 `@toonflow/services` 持有的领域级操作，负责领域状态读写、事务协调、持久化归属与稳定 DTO。
- `Agent 运行（agent run）`
  - 指 `@toonflow/agents` 内一次 `run()` 或 `stream()` 调用，负责上下文装配、模型交互、统一事件输出以及 run-scope 的 artifact/result 产出。
  - `agent run` 本身不创建、不更新领域记录，也不完成正式资产登记。
- `工作流运行（workflow run）`
  - 指 `@toonflow/workflow` 对内容生产主链的长流程编排实例，负责主链阶段推进、审核停点、返工回退、暂停恢复、失败重试与正式沉淀协调。

## 核心决策

- 第 5 阶段采用与第 3、4 阶段一致的双层文档结构：阶段说明文档负责阶段边界，详细设计文档负责工作流约束。
- `@toonflow/workflow` 是 Toonflow 当前内容生产主链的专用工作流引擎，不在本阶段抽象为通用流程框架。
- 第 5 阶段的首批范围固定围绕内容生产主链：`outline -> script -> storyboard -> assets -> video -> review`。
- 人工审核属于 `@toonflow/workflow` 的核心业务语义，审核等待、审核决定、返工回退规则由 workflow 拥有，`review-console` 只负责展示与提交决定。
- `@toonflow/workflow` 负责组合 `@toonflow/agents` 与 `@toonflow/services`：先触发单次 `agent run`，再调用对应 service 显式沉淀为正式领域数据或资产记录。
- `@toonflow/workflow` 的设计目标是“支持异步后台执行”的编排层，但第 5 阶段只定义调度与唤醒语义，不绑定具体队列、worker 或任务系统实现。
- 工作流阶段模型必须和运行生命周期分层表达：阶段描述业务检查点，生命周期描述编排运行状态。
- 返工只允许回退到稳定业务检查点，不允许回退到 `*_generating` 这类瞬时执行态。
- 单个项目同一时刻只允许一个活跃的内容生产主链 `workflow run`；历史 run 保留，可在终态后再启动新 run。
- 对外命令接口不暴露手工 `advance()` 语义；“下一步是什么”由 workflow 内部状态机和调度器决定。
- `@toonflow/workflow` 只发布稳定的 workflow 业务事件，不直接向入口层透传 Agent 内部的细粒度流式事件。
- 第 5 阶段不把 `publish_ready / published` 纳入主链状态机，也不在本阶段吸收传输层、认证、通知系统或具体任务基础设施职责。

## 目标与非目标

### 目标

- 将第 5 阶段从“页面驱动的操作列表”改写为对齐 monorepo 架构的工作流引擎阶段文档。
- 为 `@toonflow/workflow` 建立稳定的包边界、依赖规则、阶段模型、审核返工规则与运行语义。
- 明确内容生产主链中 `services`、`agents`、`workflow`、`apps/api`、`review-console` 的职责边界。
- 固定“agent run 产生 run-scope 结果，由 workflow 驱动 service 显式沉淀”的主链模式。
- 为后续实施计划提供足够清晰的阶段状态、数据模型、命令接口、事件模型、幂等约束与测试范围输入。

### 非目标

- 不把第 5 阶段写成通用工作流平台或多业务线流程引擎设计。
- 不在本轮设计中绑定具体任务队列、worker 框架、调度器产品或部署方式。
- 不把 `publish_ready / published`、发布流程或更上层运营流程纳入 Phase 5 主链状态机。
- 不把 HTTP、WebSocket、SSE、MCP 等传输层协议适配下沉到 `@toonflow/workflow`。
- 不把 AI provider、storage adapter 直接作为 `workflow` 的主依赖面；这些能力继续通过 `agents` 与 `services` 间接消费。
- 不恢复旧单体页面按钮驱动的隐式流程规则，也不把页面手工点击“下一步”作为长期推进方式。

## 文档交付物设计

第 5 阶段的 refactoring 文档应拆成两个层级：

- `docs/refactoring/05-workflow-engine.md`
  - 负责第 5 阶段的定位、目标、范围、非目标、关键决策、相邻阶段边界、集成方式、首批交付基线、交付物、验收标准和风险。
- `docs/refactoring/05-workflow-engine-spec.md`
  - 负责 `@toonflow/workflow` 的包边界、阶段模型、数据模型、命令接口、执行编排、审核返工规则、事件模型、幂等与测试基线。

拆分原则如下：

- 阶段说明文档回答“本阶段交付什么、为什么这样界定”。
- 详细设计文档回答“`@toonflow/workflow` 如何在统一约束下落地”。
- 阶段说明文档不再直接承载状态表、表结构草图、接口伪代码和入口交互示例作为主干叙事。
- 详细的状态机、命令语义、数据模型与事件契约集中在详细设计文档定义。

## 依赖方向与架构边界

第 5 阶段必须继续遵守 [`architecture-overview.md`](../../refactoring/architecture-overview.md) 的依赖方向：

```text
db + services + agents + kernel
  └── workflow

services + agents + workflow + kernel
  ├── apps/api
  └── apps/mcp-server
```

边界约束如下：

- `@toonflow/workflow` 可以依赖：
  - `@toonflow/kernel`
  - `@toonflow/db`
  - `@toonflow/services`
  - `@toonflow/agents`
- `@toonflow/workflow` 不允许依赖：
  - `apps/*`
  - `@toonflow/ai-providers`
  - `@toonflow/storage`
  - 任意入口层私有协议或传输层实现
- `@toonflow/services` 仍负责：
  - 领域用例执行
  - 单次业务用例内的事务协调
  - 正式持久化归属
  - 领域错误与稳定 DTO
- `@toonflow/agents` 仍负责：
  - 单次 Agent 运行协议
  - 统一事件流
  - run-scope artifact/result 产出
  - 不隐含持久化的结果边界
- `@toonflow/workflow` 负责：
  - 内容生产主链的长流程编排
  - `workflow run` 生命周期
  - 业务检查点阶段推进
  - 审核停点、返工回退、暂停恢复、失败重试
  - 组合 `agents + services` 完成阶段执行与正式沉淀
  - 稳定 workflow 事件发布
- `apps/api` 与 `apps/mcp-server` 负责：
  - 对外协议适配
  - 调用 workflow 命令接口
  - 转发 workflow 稳定事件
  - 不重写 workflow 的阶段与回退规则
- `apps/web` 与 `apps/review-console` 负责：
  - 消费入口层暴露的查询、命令与事件
  - 不直接驱动主链状态机

第 5 阶段的表述重点应是“建立工作流编排层”，而不是“给页面按钮找一个统一后端接口”。

## 定位、职责与相邻阶段边界

`@toonflow/workflow` 应被定义为 Toonflow 当前内容生产主链的专用长流程编排层，而不是通用工作流框架。它的任务是把第 3 阶段的单次业务用例能力与第 4 阶段的单次 Agent 运行能力组合成一个可持续推进、可中断、可返工、可审核的 `workflow run`。

职责边界应固定如下：

- `workflow` 负责 `run` 生命周期：创建、排程、推进、等待审核、返工回退、暂停、恢复、重试、完成、失败、终止。
- `workflow` 负责主链阶段语义：知道当前处于哪个业务检查点，以及在给定结果下下一步应进入哪个阶段。
- `workflow` 负责在正确时机组合 `agents + services`：
  - 先触发对应 `agent run`
  - 再调用对应 service 显式沉淀正式领域数据或资产记录
  - 最后记录 workflow 自身的阶段结果与事件
- `agents` 只负责单次运行，不拥有长流程状态机，不直接负责正式落库。
- `services` 仍是业务持久化 owner，workflow 只是其上层编排者，不替代 service 的领域所有权。
- `apps/api` / `apps/mcp-server` 只做命令、查询和事件的协议适配，不承载工作流状态迁移规则。
- Phase 5 只定义异步后台编排语义与装配边界，不承诺某种具体的任务基础设施。

## 主链阶段模型与运行状态语义

第 5 阶段的状态模型应拆成两层，而不是把 `outline_generating`、`outline_generated` 这类瞬时执行态直接铺成一条大状态链。

### 业务检查点阶段

首批只保留可理解、可回退、可审核的稳定节点：

- `outline`
- `script`
- `storyboard`
- `assets`
- `video`
- `review`

补充约束如下：

- `novel_imported` 更适合作为工作流启动前置条件，而不是 workflow 自己的正式阶段。
- `publish_ready / published` 不属于 Phase 5 主链状态机，应留给后续更上层流程。
- 审核返工只允许回退到稳定业务检查点，不允许回退到瞬时执行态。

### 运行生命周期状态

运行状态用于表达编排过程本身，建议独立于业务阶段表达，例如：

- `queued`
- `running`
- `waiting_review`
- `paused`
- `failed`
- `completed`
- `terminated`

为了避免把业务结果和系统执行结果混在一起，终态业务结果建议通过独立字段表达，例如：

- `approved`
- `rejected`
- `aborted`

这意味着：

- 审核 `rework` 是业务路径，不是系统失败。
- 审核 `rejected` 是业务终态，不应伪装成执行异常。
- 系统执行失败只对应阶段执行失败、依赖异常、沉淀失败等技术性问题。

### 阶段执行状态

某个业务阶段的具体执行应通过 `step attempt` 维度表达，至少区分：

- `pending`
- `running`
- `succeeded`
- `failed`
- `skipped`

这样“当前业务推进到哪一步”“这次运行现在是否暂停”“同一阶段第几次重试成功”三类问题可以被独立回答。

## 核心组件与数据流

`@toonflow/workflow` 包内至少应拆成以下核心部件：

- `WorkflowRunService`
  - 负责创建 run、加载 run、校验单项目单活跃 run 约束、接收外部命令。
  - 它是 workflow 包对外的主入口，但不直接承载状态机定义与阶段执行细节。
- `WorkflowStateMachine`
  - 负责定义主链阶段顺序、合法迁移、审核停点规则、返工回退规则。
  - 它只回答“能不能这么转”“下一阶段是谁”，不直接碰数据库、Agent 或 service。
- `StepOrchestrator`
  - 负责执行某个业务检查点阶段。
  - 它负责装配读取上下文、调用 Agent、触发 service 沉淀、记录 attempt 结果，并交回状态机决定下一步。
- `WorkflowRepository`
  - 负责 workflow 自身持久化，包括 run、step、attempt、review task、事件/outbox 等记录。
  - 它不吞并领域数据持久化；领域对象仍由各内容域 service/repository 负责。
- `WorkflowEventPublisher`
  - 负责发布稳定 workflow 事件，供 `apps/api` 的 SSE/WebSocket 转发层或其他外围系统消费。
- `SchedulerPort` 或等价调度唤醒端口
  - 负责表达“何时继续执行下一步”的抽象能力。
  - 第 5 阶段只定义这个端口，不绑定具体队列或 worker 技术。

推荐的数据流如下：

1. 入口层发起“启动 workflow run”命令给 `WorkflowRunService`。
2. `WorkflowRunService` 创建 run，校验项目活跃 run 约束，并把 run 置入可调度状态。
3. 调度器唤醒对应阶段的 `StepOrchestrator`。
4. `StepOrchestrator` 读取所需上下文，触发单次 `agent run`。
5. Agent 返回 run-scope result / artifact 后，`StepOrchestrator` 调用对应 service 显式沉淀为正式领域产物。
6. `WorkflowRepository` 写入本次阶段 attempt 结果。
7. `WorkflowStateMachine` 计算下一步：
   - 自动进入下一个阶段
   - 进入 `waiting_review`
   - 标记失败等待重试
   - 标记完成或终止
8. `WorkflowEventPublisher` 发布稳定 workflow 事件。
9. 审核场景下，`review-console` 通过入口层提交审核决定，`WorkflowRunService` 再按规则推进、回退或结束 run。

这组拆分的目标是避免把状态机、阶段执行、持久化和对外事件塞进单个 `engine.ts` 巨石实现中。

## 数据模型与对外接口边界

第 5 阶段的持久化模型建议至少分成以下 4 类记录：

- `workflow_run`
  - 记录一次主链 run 的全局事实：
    - `projectId`
    - workflow 类型
    - 当前业务阶段
    - 当前生命周期状态
    - 启动配置快照
    - 终态业务结果
    - 最近一次调度时间
    - 完成或失败原因摘要
  - 它同时承载“单项目单活跃主链 run”的约束。
- `workflow_step`
  - 记录某个业务检查点在该 run 中的聚合视图，例如 `outline`、`script`、`storyboard`。
  - 它表达该阶段是否已经成功沉淀、当前是否等待重做，以及最近一次 attempt 的聚合结果。
- `workflow_step_attempt`
  - 记录某个业务阶段的一次具体执行尝试。
  - 需要保存触发原因、输入快照摘要、关联 agent run、service 沉淀结果摘要、错误摘要、开始结束时间。
  - 它是支持失败重试与审核返工历史追踪的关键层。
- `workflow_review_task`
  - 记录待审核任务与审核决定：
    - 关联 run
    - 关联审核目标阶段
    - 当前审核状态
    - 决定类型
    - 理由
    - 操作人
    - 回退目标阶段
    - 时间戳

如果需要可靠对外投递，还可以在详细 spec 中补充 `workflow_event` 或 outbox 语义，但它属于对外事件保障模型，不是 workflow 领域主模型本身。

### 对外命令接口边界

第 5 阶段不建议把“推进到下一阶段”暴露成通用业务命令。相比现稿里的 `advance(runId)`，更合理的对外命令是：

- 启动 run
- 暂停 run
- 恢复 run
- 重试当前失败阶段或指定失败 attempt
- 提交审核决定
- 查询 run 状态
- 查询阶段时间线与 attempt 历史

原因如下：

- 如果入口层直接调用 `advance()`，等于页面或控制台在驱动阶段流转，workflow 会退化为被动状态记录器。
- “下一阶段是谁、是否应等待审核、是否应自动继续执行”应由 workflow 内部状态机与调度器决定。

## 失败处理、重试、暂停恢复与事件边界

第 5 阶段必须把“业务语义失败”和“系统执行失败”严格分离。

### 失败分类

- `阶段执行失败`
  - 例如 Agent 调用失败、service 沉淀失败、依赖超时、幂等冲突。
  - 这类错误会让当前 `step attempt` 标记为失败，并使 run 进入 `failed` 或等待重试的可恢复状态。
- `审核业务结果`
  - `approved / rework / rejected` 都属于业务决定，不是系统执行失败。
  - 其中 `rework` 进入回退重做路径，`rejected` 进入业务终态。
- `人工控制状态`
  - `paused / resumed / terminated` 是运行控制命令结果，不应与错误混用。

### 重试语义

- 默认只允许重试当前失败阶段的最新 attempt。
- 每次重试都必须创建新的 `workflow_step_attempt`，而不是覆盖旧记录。
- 所有阶段执行器都应按“至少一次调度”语义设计，因此 service 沉淀动作必须具备幂等保护。
- 是否允许“指定历史失败 attempt 重试”可以留到详细 spec 收敛，但阶段说明文档不必提前承诺过深。

### 暂停与恢复

- `pause` 作用在 `workflow run`，表示停止继续调度后续阶段，而不是强制中断一个已在外部 provider 中不可取消的底层任务。
- 如果某个阶段已经开始执行，暂停更准确的语义是“当前 attempt 收尾后不再调度下一阶段”。
- `resume` 只是把 run 放回可调度状态，由内部调度器继续推进，不向入口层暴露手工 `advance()`。

### 事件发布边界

`@toonflow/workflow` 只发布稳定 workflow 业务事件，例如：

- `workflow.run.created`
- `workflow.stage.started`
- `workflow.stage.completed`
- `workflow.stage.failed`
- `workflow.review.waiting`
- `workflow.review.submitted`
- `workflow.run.paused`
- `workflow.run.resumed`
- `workflow.run.completed`
- `workflow.run.terminated`

事件边界约束如下：

- 这些事件用于给 `apps/api` 做 SSE/WebSocket 转发，或给后续通知、审计系统消费。
- workflow 不应直接对外暴露 Agent 内部 token 流、思维碎片或 provider 级细粒度事件。
- 阶段说明文档不提前承诺具体重试次数、退避策略或死信队列设计；这些属于详细 spec 或实现阶段的基础设施细节。

## `05-workflow-engine.md` 的设计骨架

阶段说明文档建议固定为以下章节：

1. `定位`
2. `目标`
3. `范围`
4. `非目标`
5. `关键决策`
6. `Workflow 职责与相邻阶段边界`
7. `集成方式`
8. `首批交付基线`
9. `交付物`
10. `验收标准`
11. `风险与注意事项`

每节承担的角色如下：

- `定位`
  - 明确第 5 阶段是 `packages/workflow` 的工作流引擎阶段，不再沿用页面按钮操作串联的叙事。
- `目标`
  - 写清专用主链工作流、审核返工、异步编排语义与 `workflow + services + agents` 的组合关系。
- `范围`
  - 限定为内容生产主链的 `workflow run` 生命周期、阶段推进、审核返工、失败重试与稳定事件。
- `非目标`
  - 排除通用流程框架、发布流程、具体队列技术、传输层协议与页面细节。
- `关键决策`
  - 固定专用主链、审核归属、单项目单活跃 run、回退粒度与不暴露 `advance()` 的原则。
- `Workflow 职责与相邻阶段边界`
  - 一次写清 `services`、`agents`、`workflow`、`apps/api`、`review-console` 的责任切分。
- `集成方式`
  - 描述 `services + agents + workflow + kernel -> apps/api` 的组合关系，以及 `review-console` 如何只做命令提交与事件消费。
- `首批交付基线`
  - 强调首批只要求建立主链工作流边界与双层文档，不要求一次性铺满任务基础设施。
- `交付物`
  - 列出阶段说明文档与详细设计文档。
- `验收标准`
  - 以边界清晰、阶段模型稳定、审核返工归属明确、异步语义明确、与 Phase 3/4 的衔接一致为准。
- `风险与注意事项`
  - 重点提醒 workflow 过薄退化为状态记录器，或过胖吞并 services / apps 职责两类风险。

## `05-workflow-engine-spec.md` 的设计骨架

详细设计文档建议固定为以下章节：

1. `文档目的`
2. `设计目标`
3. `非目标`
4. `包边界与依赖规则`
5. `阶段模型与状态语义`
6. `数据模型`
7. `对外命令与查询接口`
8. `执行编排模型`
9. `审核与返工规则`
10. `事件模型与投递边界`
11. `失败、重试与幂等约束`
12. `建议目录结构`
13. `测试与验证基线`
14. `实施范围与衔接`

每节承担的角色如下：

- `包边界与依赖规则`
  - 锁定允许和禁止依赖，避免 `workflow` 回流依赖入口层或直接吞掉 provider / storage。
- `阶段模型与状态语义`
  - 统一定义业务检查点阶段、运行生命周期状态、step attempt 状态和终态业务结果。
- `数据模型`
  - 细化 `run / step / attempt / review task / event-outbox` 的字段职责与关系。
- `对外命令与查询接口`
  - 固定启动、暂停、恢复、重试、提交审核决定、查询时间线等稳定语义。
- `执行编排模型`
  - 说明如何组合 `agents + services`、何时自动推进、何时等待审核、何时发布事件。
- `审核与返工规则`
  - 锁定允许回退的业务检查点、返工触发方式与审核历史保留方式。
- `事件模型与投递边界`
  - 明确定义 workflow 事件类别、最小 payload 和对外发布边界。
- `失败、重试与幂等约束`
  - 固定阶段失败、业务拒绝、暂停恢复、至少一次调度与 service 幂等约束。
- `建议目录结构`
  - 定义包内模块分层，不退化成单文件 `engine.ts`。
- `测试与验证基线`
  - 要求工作流状态机、返工规则、attempt 历史、事件契约与执行编排可独立验证。

## 建议目录结构与测试策略

`@toonflow/workflow` 的详细 spec 建议按以下方向组织，而不是只放一个 `engine.ts`：

```text
packages/workflow/
├── src/
│   ├── index.ts
│   ├── types.ts
│   ├── application/
│   ├── state-machine/
│   ├── orchestration/
│   ├── repositories/
│   └── events/
├── package.json
└── tsconfig.json
```

测试与验收建议分两层表达：

- 阶段说明文档里的验收标准只写架构级结果：
  - 主链职责边界清晰
  - 单项目单活跃 run 约束明确
  - 审核与返工属于 workflow 语义
  - `workflow + services` 沉淀边界明确
  - 异步执行语义与入口层边界明确
- 详细 spec 里的验证策略再写具体测试面：
  - 状态机单测
  - 返工回退规则单测
  - run / step / attempt 仓储测试
  - 阶段执行编排测试
  - 审核决定驱动的流转测试
  - 事件发布契约测试

## 对后续实施计划的直接输入

本设计为后续实施计划提供以下直接输入：

- 第 5 阶段先完成文档重构，而不是直接进入代码实现。
- 文档实施范围固定为两项：
  - 重写 `docs/refactoring/05-workflow-engine.md`
  - 新增 `docs/refactoring/05-workflow-engine-spec.md`
- 两份文档都必须使用中文，并与第 3、4 阶段的双层模式保持一致。
- 阶段说明文档必须优先写清边界与职责，而不是直接展开状态表和伪接口。
- 详细设计文档需要优先锁定阶段模型、数据模型、审核返工与幂等约束，再展开接口和目录结构。
- 后续计划阶段不得重新引入“页面直接调用 `advance()` 推进主链”的设计。
