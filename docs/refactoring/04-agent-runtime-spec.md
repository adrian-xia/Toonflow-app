# `@toonflow/agents` 详细设计说明

## 1. 文档目的

本文档是 [`04-agent-runtime.md`](./04-agent-runtime.md) 的详细设计补充，用于固定 Phase 4 中 `@toonflow/agents` 的共享规则、包边界与运行时分层约束。阶段说明文档回答“本阶段交付什么”，本文回答“Agent 运行时如何按统一约束落地”。

相关文档：

- 架构总览：[`architecture-overview.md`](./architecture-overview.md)
- 第 3 阶段说明：[`03-application-services.md`](./03-application-services.md)
- 第 3 阶段详细设计：[`03-application-services-spec.md`](./03-application-services-spec.md)
- 设计输入：[`../superpowers/specs/2026-03-28-agent-runtime-design.md`](../superpowers/specs/2026-03-28-agent-runtime-design.md)

## 2. 设计目标

- 明确 `@toonflow/agents` 作为共享 Agent 运行时层的包边界与依赖方向。
- 固定首批 Agent 分组、上下文注入、事件协议与输出边界的统一约束，避免实现阶段结构摇摆。
- 保持与 Phase 4 阶段说明一致的“多入口消费与最小接入”口径，确保入口层长期只消费稳定导出面。
- 为后续具体 Agent 分组与运行时协议章节（第 6 至 13 节）提供一致的共享前提。

## 3. 非目标

- 不在本文中展开每个 Agent 的方法表、步骤清单或文件级实现蓝图。
- 不把 run 生命周期、状态机推进、暂停/恢复/重试、审核回退等工作流职责下沉到 `@toonflow/agents`。
- 不把 HTTP/MCP/WebSocket/SSE 等传输层协议适配写入 `@toonflow/agents`。
- 不恢复旧单体的入口兼容层、隐式全局单例或导入即初始化模式。

## 4. 包边界与依赖规则

### 4.1 允许依赖

- `@toonflow/agents` 允许依赖 `@toonflow/kernel`、`@toonflow/services`、`@toonflow/ai-providers`、`@toonflow/storage`，即 `kernel/services/ai-providers/storage` 组合。
- 上述依赖对应 [`architecture-overview.md`](./architecture-overview.md) 中定义的共享包边界，是本阶段对齐目标架构的依赖口径。
- 允许在单次 Agent 运行内组合 `services + ai-providers + storage`，但仅限 run-scope 读取与产物处理。
  - `run-scope 读取` 指通过只读查询门面读取项目、内容域和已登记资源的稳定视图。
  - `产物处理` 指本次运行内的 artifact 读写与引用整理。
  - 不包含领域记录创建/更新、正式版本提交、资产登记。

### 4.2 禁止依赖

- 不允许依赖 `apps/*` 及其内部私有实现目录。
- 不允许依赖 `@toonflow/workflow`。
- 不允许依赖数据库客户端、repository 实现或入口层私有协议。

## 5. 建议目录结构

仅定义包内层次与运行时分层，不展开方法表、SDK 回调或入口适配代码：

```text
packages/agents/
├── src/
│   ├── index.ts
│   ├── composition/
│   ├── context/
│   ├── contracts/
│   ├── errors/
│   ├── events/
│   ├── runtime/
│   ├── agents/
├── test/
├── package.json
└── tsconfig.json
```

约束：

- `src/index.ts` 作为唯一稳定公共导出入口。
- `composition/` 仅承载装配与依赖注入辅助，不承载业务逻辑。
- `agents/` 下按内容域分组，不以入口或传输协议命名。

## 6. 首批 Agent 分组
## 7. Agent 运行时职责模型
## 8. AgentContext 与依赖注入边界
## 9. 统一事件协议与结果边界
## 10. 多入口消费与最小接入方式
## 11. 错误模型与中断语义
## 12. 测试与验证基线
## 13. 实施范围与衔接
