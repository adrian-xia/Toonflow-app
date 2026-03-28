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

### project

- 负责项目级生命周期与项目聚合根的核心业务用例，例如项目创建、状态流转与跨内容域的基础读取。
- 允许在单次用例内组合 `repository + ai-providers + storage`，但仅限于项目级资料与元信息的生成或聚合。
- 不包含小说正文、剧本、分镜、素材、视频等内容域的生成或编辑用例，也不承载入口层鉴权或传输适配。

### novel

- 负责小说原文、章节结构与相关文本素材的管理与生成类用例。
- 允许在单次用例内组合 `repository + ai-providers + storage`，用于小说内容生成与持久化。
- 不包含项目级权限控制、分镜或视频生成职责，也不处理入口层的请求解析与响应封装。

### outline

- 负责大纲的创建、更新、版本管理与单次大纲生成用例。
- 允许在单次用例内组合 `repository + ai-providers + storage`，但不跨出大纲域的职责边界。
- 不包含剧本、分镜、素材或视频生成，也不承担 Agent 运行时与长流程工作流职责。

### script

- 负责剧本内容的读写、结构化整理与单次剧本生成用例。
- 允许在单次用例内组合 `repository + ai-providers + storage`，用于剧本生成与结果落库。
- 不包含分镜、素材或视频合成，不负责传输层日志与鉴权中间件。

### storyboard

- 负责分镜读写、结构化组织与单次分镜生成用例。
- 允许在单次用例内组合 `repository + ai-providers + storage`，用于分镜生成与素材引用整理。
- 不包含资产上传、视频渲染或跨阶段工作流编排，也不处理入口层协议适配。

### assets

- 负责素材的组织、引用、生成与存储相关的用例。
- 允许在单次用例内组合 `repository + ai-providers + storage`，用于素材生成、落盘与元数据登记。
- 不包含分镜或视频生成，不负责 HTTP 层参数解析或鉴权职责。

### video

- 负责视频相关元数据、生成请求与结果引用的用例协同。
- 允许在单次用例内组合 `repository + ai-providers + storage`，用于视频生成请求与结果记录。
- 不包含素材采集与编辑细节、不承载跨阶段 workflow，也不承担入口层响应包装。

## 7. 应用服务职责模型

应用服务层的职责是执行领域用例、协调单次业务用例内的事务与副作用，并在 `repository + ai-providers + storage` 之间完成必要编排。`services` 负责把底层能力组合成可复用的领域用例，但不扩展为传输层或长流程运行时。

明确边界如下：

- `services` 负责领域用例执行、事务协调、单次业务用例内编排。
- `services` 不负责 HTTP 参数解析、JWT、SSE/WebSocket、日志中间件。
- `apps/api` 负责参数校验、错误映射、响应封装与传输层适配，并保持业务调用面只消费 `@toonflow/services`。
- `services` 不提前承接 Agent 运行时与长流程工作流（`agents` / `workflow`）的职责。

## 8. 输入输出与 DTO 边界

## 9. 事务与副作用协调原则

## 10. 错误模型与返回约束

## 11. 装配与最小接入方式

## 12. 测试与验证基线

## 13. 实施范围与衔接
