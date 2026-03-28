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

本节后续补充。

## 6. 数据模型

本节后续补充。

## 7. 对外命令与查询接口

本节后续补充。

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
