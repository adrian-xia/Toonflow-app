# Phase 3: 应用服务层提取 (`@toonflow/services`)

## 定位

- 第 3 阶段是 `packages/services` 的应用服务层阶段，不是旧单体路由瘦身清单
- 目标是建立共享应用服务层的阶段边界与最小接入方式，而非旧路由迁移手册
- 服务层负责领域用例、事务协调与单次业务用例内的 `repository + ai-providers + storage` 组合编排

## 目标

- 搭建可被入口层稳定消费的 `@toonflow/services` 共享应用服务层
- 首批范围只覆盖 `project / novel / outline / script / storyboard / assets / video`
- 明确应用服务在单次业务用例内编排底层依赖的职责边界
- 为后续 `agents` / `workflow` 阶段保留长流程与状态机能力

## 范围

- 服务层负责领域用例、事务协调与单次业务用例内的 `repository + ai-providers + storage` 组合编排
- 首批范围只覆盖 `project / novel / outline / script / storyboard / assets / video`
- 最小接入关系限定为 `db + ai-providers + storage -> services -> apps/api`

## 非目标

- `prompt / setting / auth` 不在首批范围
- 传输层职责不下沉到 `@toonflow/services`，包括 HTTP 解析、响应封装、鉴权、日志与 SSE/WebSocket
- Agent 运行时与长流程工作流编排不属于本阶段，留给 `agents` 与 `workflow`
- 不承诺旧单体路由的全量等价迁移

## 关键决策

- `@toonflow/services` 是共享应用服务层，不是 repository 的薄封装
- 最小装配链是 `db + ai-providers + storage -> services -> apps/api`
- `apps/api` 可以在应用启动期作为 composition root 完成依赖装配
- route/controller 等业务调用面只消费 `@toonflow/services`
- `services` 负责单次业务用例编排，不提前承接 `agents` / `workflow` 的长流程职责

## 服务层职责与相邻阶段边界

- `@toonflow/services` 负责领域用例执行、事务协调与单次业务用例内编排 `repository + ai-providers + storage`
- `apps/api` 负责请求解析、参数校验、鉴权、错误映射与响应封装，并在启动期完成依赖装配
- `@toonflow/services` 不承接传输层职责，也不直接暴露底层实现细节
- `agents` / `workflow` 负责可复用 Agent 运行时与长流程工作流编排，本阶段不抢占

## 集成方式

- 最小装配链为 `db + ai-providers + storage -> services -> apps/api`
- `apps/api` 在应用启动期作为 composition root 初始化底层依赖并注入 `@toonflow/services`
- 业务调用面只依赖 `@toonflow/services`，不跨包直接拼接底层实现

## 首批交付基线

- 首批交付基线是建立第 3 阶段文档边界与最小接入方式，而不是全量旧路由等价迁移
- 交付目标聚焦 `project / novel / outline / script / storyboard / assets / video` 的服务层边界描述
- 只要求形成最小可验证接入链路与依赖方向共识

## 交付物

- `docs/refactoring/03-application-services.md`
- `docs/refactoring/03-application-services-spec.md`

## 验收标准

- 边界清晰：服务层职责与 `apps/api`、`agents`、`workflow` 分工明确
- 范围收敛：首批领域仅限 `project / novel / outline / script / storyboard / assets / video`
- 依赖方向一致：坚持 `db + ai-providers + storage -> services -> apps/api`
- 最小接入口径明确：composition root 与业务调用面的依赖关系被固定

## 风险与注意事项

- 风险：服务层过薄导致业务编排回流到 `apps/api`，无法形成共享应用服务层
- 风险：服务层过胖导致提前吸收传输层、Agent 或 workflow 的长流程职责
