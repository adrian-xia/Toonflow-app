# Phase 4: Agent 运行时 (`@toonflow/agents`)

## 定位

- 第 4 阶段是 `packages/agents` 的共享 Agent 运行时阶段，不是入口层 Agent 调用封装迁移
- 聚焦单次 agent run 的统一运行时边界与可复用协议，为 Phase 5 的 `workflow` 组合铺底

## 目标

- 建立 `@toonflow/agents` 的单次 agent run 协议与统一事件流
- 明确 `artifact` / `result` 的边界与语义（run-scope，不隐含持久化），形成稳定的输出契约
- 建立依赖注入与运行时装配方式，保证跨入口复用

## 范围

- `@toonflow/agents` 负责单次 agent run 的执行契约、统一事件流与 `artifact` / `result` 输出边界
- `artifact` / `result` 默认仅代表本次运行（run-scope）结果，不隐含持久化、正式版本提交或资产登记
- 如需沉淀，必须由外层 `services` 或 `workflow + services` 显式完成
- 首批范围只覆盖 `outline / script / storyboard / assets / video`
- `@toonflow/services` 仍负责业务用例、事务与持久化归属

## 非目标

- run 生命周期、状态机、暂停/恢复/重试、审核返工与阶段推进不属于本阶段
- HTTP、MCP、SSE、WebSocket 等传输层协议适配不下沉到 `@toonflow/agents`
- 不做入口层 Agent 调用封装迁移，也不承诺旧入口实现的等价搬迁

## 关键决策

- `@toonflow/agents` 可依赖 `@toonflow/services`、`@toonflow/ai-providers`、`@toonflow/storage`、`@toonflow/kernel`
- `services` 是同名内容域的业务 owner，`agents` 不是同名 service 的替代者
- `artifact` / `result` 仅为 run-scope 结果，不代表落库、版本提交或资产登记
- 需要沉淀时必须由外层 `services` 或 `workflow + services` 显式完成
- `AgentContext.services` 只允许 `read/query` 读查询门面，`agent run` 不允许通过 services 间接落库
- 这里仅指读取项目、内容域与已登记资源的稳定视图，具体接口细则由本阶段详细设计文档统一定义

## Agent 运行时职责与相邻阶段边界

- `@toonflow/agents` 聚焦单次 agent run 执行、统一事件流与 `artifact` / `result` 输出语义
- `@toonflow/services` 负责业务用例、事务与持久化归属，仍是业务入口调用的默认依赖
- `@toonflow/workflow` 在 Phase 5 负责 `workflow run` 的长流程编排与阶段推进，本阶段不提前设计 workflow
- 传输层协议与入口层适配留在 `apps/api` / `apps/mcp-server`，不下沉到 `@toonflow/agents`

## 集成方式

- `apps/api` / `apps/mcp-server` 的常规业务调用面继续优先消费 `@toonflow/services`
- Phase 4 只允许隔离的 `internal/preview/debug` 入口直连 `@toonflow/agents`，作为非正式业务调用面、非公开稳定 API 面
- 允许的场景示例包括预览生成、流式调试与 tool-style 的单次 agent run 请求
- 正式业务接口与常规 route/controller 不得走这条路径，创建/更新领域记录、登记资产、推进项目状态的请求不属于允许范围
- 内容生产主链在 Phase 5 后应由 `@toonflow/workflow` 组合驱动 `@toonflow/agents`

## 首批交付基线

- 首批交付基线是建立双层文档、统一运行时边界与五组 Agent 分组，而不是提前设计 workflow

## 交付物

- `docs/refactoring/04-agent-runtime.md`
- `docs/refactoring/04-agent-runtime-spec.md`

## 验收标准

- 边界清晰：`@toonflow/agents` 与 `@toonflow/services`、`workflow` 的职责切分可核对
- 依赖方向一致：依赖允许清单与装配口径一致
- 主路径与允许路径清晰：常规业务调用面走 `services`，`internal/preview/debug` 直连受控
- `artifact` / `result` 语义稳定，可被多入口一致消费且明确 run-scope 边界

## 风险与注意事项

- 风险：运行时过薄退化为脚本集合，无法形成统一的 Agent 运行时协议
- 风险：运行时过胖侵入 services / workflow，导致职责提前混杂
