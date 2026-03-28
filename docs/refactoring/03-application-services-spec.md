# `@toonflow/services` 详细设计说明

## 1. 文档目的

本文档是 [`03-application-services.md`](./03-application-services.md) 的详细设计补充，用于固化 Phase 3 中 `@toonflow/services` 的共享规则、包边界与实现基线。阶段说明文档回答“本阶段交付什么”，本文回答“应用服务层如何按统一约束落地”。

相关文档：

- 架构总览：[`architecture-overview.md`](./architecture-overview.md)
- Phase 2 详细设计：[`02-ai-providers-storage-spec.md`](./02-ai-providers-storage-spec.md)
- 设计输入：[`../superpowers/specs/2026-03-28-application-services-design.md`](../superpowers/specs/2026-03-28-application-services-design.md)

## 2. 设计目标

- 明确 `@toonflow/services` 作为共享应用服务层的包边界与依赖方向。
- 固定服务分组、DTO 边界、事务协同与错误模型的统一约束，避免实现阶段结构摇摆。
- 维持与 Phase 3 阶段说明一致的“最小接入”口径，确保入口层长期只消费稳定导出面。
- 为后续具体服务分组章节（第 6 至 13 节）提供一致的共享前提。

## 3. 非目标

- 不在本文中展开每个服务分组的具体方法表、文件清单或实现蓝图。
- 不把 HTTP/MCP/Web UI 等传输层职责下沉到 `@toonflow/services`。
- 不提前引入 `@toonflow/agents` 或 `@toonflow/workflow` 的长流程职责。
- 不恢复旧单体工具转发层、导入即初始化或隐式全局状态。

## 4. 包边界与依赖规则

### 4.1 允许依赖

- `@toonflow/services` 允许依赖 `@toonflow/kernel`、`@toonflow/db`、`@toonflow/ai-providers`、`@toonflow/storage`，即 `kernel/db/ai-providers/storage` 组合。
- 允许在单次业务用例内编排 `repository + ai-providers + storage` 的调用链。

### 4.2 禁止依赖

- 不允许依赖 `apps/*` 及其内部私有实现目录。
- 不允许依赖 `@toonflow/agents` 与 `@toonflow/workflow`。
- 不允许回流依赖入口层框架或传输层中间件。

## 5. 建议目录结构

仅定义包内分层关系，不定义方法表或实现蓝图：

```text
packages/services/
├── src/
│   ├── index.ts
│   ├── composition/
│   ├── dto/
│   ├── errors/
│   ├── services/
│   │   ├── project/
│   │   ├── novel/
│   │   ├── outline/
│   │   ├── script/
│   │   ├── storyboard/
│   │   ├── assets/
│   │   └── video/
│   └── testing/
├── package.json
└── tsconfig.json
```

约束：

- `src/index.ts` 作为唯一稳定公共导出入口。
- `composition/` 仅承载装配与依赖注入辅助，不承载业务逻辑。
- `services/` 下仅按领域分组，不以旧路由文件命名。

## 6. 首批领域服务分组

## 7. 应用服务职责模型

## 8. 输入输出与 DTO 边界

## 9. 事务与副作用协调原则

## 10. 错误模型与返回约束

## 11. 装配与最小接入方式

## 12. 测试与验证基线

## 13. 实施范围与衔接
