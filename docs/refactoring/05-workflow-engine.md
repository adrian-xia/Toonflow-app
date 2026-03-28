# Phase 5: 工作流引擎 (`@toonflow/workflow`)

## 定位

- 第 5 阶段是 `packages/workflow` 的工作流引擎阶段，不是页面操作编排清单。
- 第 5 阶段聚焦 Toonflow 当前内容生产主链，而不是通用工作流框架。
- `@toonflow/workflow` 是位于 `@toonflow/services` 与 `@toonflow/agents` 之上的长流程编排层。

## 目标

- 建立 `workflow run` 的统一生命周期语义：创建、推进、等待审核、返工回退、暂停、恢复、重试、完成与失败。
- 固定内容生产主链的稳定业务检查点阶段模型：`outline / script / storyboard / assets / video / review`。
- 明确 `workflow`、`services`、`agents`、入口层与 `review-console` 的职责边界，确保跨包协作一致。
- 形成“先执行单次 agent run，再调用 service 显式沉淀正式数据”的稳定主链模式。

## 范围

- 首批范围只覆盖 `outline / script / storyboard / assets / video / review` 六个业务检查点阶段。
- `@toonflow/workflow` 负责 `workflow run` 生命周期、阶段推进、审核返工、暂停恢复、失败重试与稳定事件。
- 第 5 阶段只定义异步后台编排语义与调度唤醒边界，不绑定具体任务系统实现。
- 运行模型聚焦单项目内容生产主链，不扩展到多业务线通用编排框架。

## 非目标

- 不在本阶段定义具体任务队列、worker 技术、发布流程与传输层协议。
- 不把 `@toonflow/workflow` 下沉为页面按钮驱动的“下一步”执行器，不以手工 `advance(runId)` 作为核心接口。
- 不把 `publish_ready`、`published` 作为本阶段主链正式阶段。
- 不把 `@toonflow/services` 的业务用例 owner 职责或 `apps/api`、`apps/mcp-server` 的入口适配职责并入 workflow。

## 关键决策

- `workflow` 组合 `agents + services`：先触发单次 `agent run`，再调用 service 显式沉淀正式领域数据。
- `services` 仍是业务用例、事务与正式持久化 owner。
- `agents` 仍只负责单次 agent run 协议、统一事件和 run-scope artifact/result。
- 人工审核由 `workflow` 拥有，`review-console` 只消费任务并提交决定。
- 单项目同一时刻只允许一个活跃主链 run。
- 第 5 阶段只定义异步后台编排语义，不绑定具体任务系统。

## Workflow 职责与相邻阶段边界

- `@toonflow/workflow` 负责长流程编排与主链阶段规则，不承担具体传输协议适配。
- `@toonflow/services` 负责业务用例、事务边界与正式持久化；workflow 不替代其领域所有权。
- `@toonflow/agents` 负责单次运行执行与统一事件输出，不拥有主链状态机与审核返工规则。
- `apps/api` / `apps/mcp-server` 只做命令、查询与事件转发，不重写状态机规则。
- `review-console` 只负责消费审核任务与提交审核决定，返工路径由 workflow 判定并执行。

## 集成方式

- 入口层通过稳定命令接口调用 `@toonflow/workflow`（如启动、暂停、恢复、重试、提交审核决定、查询运行态）。
- `@toonflow/workflow` 在阶段执行中调用 `@toonflow/agents` 产出 run-scope 结果，再调用 `@toonflow/services` 完成正式沉淀。
- 稳定 workflow 事件由 workflow 发布，入口层仅做转发与协议封装，供 `apps/web` 和 `review-console` 消费。
- 审核停点与返工回退由 workflow 内部规则驱动，入口层和页面不直接推进主链阶段。

## 首批交付基线

- 首批交付基线是建立 Phase 5 双层文档、主链边界、审核返工归属与异步编排语义。
- 第 5 阶段先完成阶段边界与语义定稿，再进入详细约束与实现计划。

## 交付物

- `docs/refactoring/05-workflow-engine.md`
- `docs/refactoring/05-workflow-engine-spec.md`

## 验收标准

- 边界清晰：`@toonflow/workflow`、`@toonflow/services`、`@toonflow/agents`、入口层与 `review-console` 职责可核对。
- 主链阶段模型稳定：只围绕 `outline / script / storyboard / assets / video / review`。
- 审核返工归属明确：审核任务归 workflow，返工回退规则不由页面定义。
- 约束明确：单项目单活跃 run 规则可被一致实现与验证。
- 衔接一致：与 Phase 3/4 的服务 owner 与单次 agent run 边界一致。

## 风险与注意事项

- 风险：workflow 过薄退化为状态记录器，无法真正承担阶段推进、审核停点与返工编排。
- 风险：workflow 过胖吞并 services / apps 职责，导致领域边界和入口边界失真。
- 注意：必须持续维持“agent run 产出 run-scope 结果，service 显式沉淀正式数据”的链路，不回退到页面手工推进语义。
