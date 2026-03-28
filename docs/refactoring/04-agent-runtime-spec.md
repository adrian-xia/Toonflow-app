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
首批分组只描述运行时封装边界，不列方法清单或工作流阶段定义。每组围绕单次 `agent run` 组织，并保持与同名内容域的 `services` 边界清晰。

### `outline agent`

- 负责大纲域的 `agent run` 封装，包括上下文装配、模型交互、统一事件输出与 artifact/result 归一化。
- 单次运行可组合 `services + ai-providers + storage + kernel`，但仅限 `read/query` 读取与 run-scope 产物处理。
- 不替代 `outline service` 的业务 owner 身份，领域用例、领域写入、版本创建与资产登记仍由 `services` 负责。
- 运行生命周期、阶段推进、重试与审核等职责留给 `workflow` 或入口层消费者。

### `script agent`

- 负责剧本域的 `agent run` 封装，包括上下文装配、模型交互、统一事件输出与 artifact/result 归一化。
- 单次运行可组合 `services + ai-providers + storage + kernel`，但仅限 `read/query` 读取与 run-scope 产物处理。
- 不替代 `script service` 的业务 owner 身份，领域用例、领域写入、版本创建与资产登记仍由 `services` 负责。
- 运行生命周期、阶段推进、重试与审核等职责留给 `workflow` 或入口层消费者。

### `storyboard agent`

- 负责分镜域的 `agent run` 封装，包括上下文装配、模型交互、统一事件输出与 artifact/result 归一化。
- 单次运行可组合 `services + ai-providers + storage + kernel`，但仅限 `read/query` 读取与 run-scope 产物处理。
- 不替代 `storyboard service` 的业务 owner 身份，领域用例、领域写入、版本创建与资产登记仍由 `services` 负责。
- 运行生命周期、阶段推进、重试与审核等职责留给 `workflow` 或入口层消费者。

### `assets agent`

- 负责素材域的 `agent run` 封装，包括上下文装配、模型交互、统一事件输出与 artifact/result 归一化。
- 单次运行可组合 `services + ai-providers + storage + kernel`，但仅限 `read/query` 读取与 run-scope 产物处理。
- 不替代 `assets service` 的业务 owner 身份，领域用例、领域写入、版本创建与资产登记仍由 `services` 负责。
- 运行生命周期、阶段推进、重试与审核等职责留给 `workflow` 或入口层消费者。

### `video agent`

- 负责视频域的 `agent run` 封装，包括上下文装配、模型交互、统一事件输出与 artifact/result 归一化。
- 单次运行可组合 `services + ai-providers + storage + kernel`，但仅限 `read/query` 读取与 run-scope 产物处理。
- 不替代 `video service` 的业务 owner 身份，领域用例、领域写入、版本创建与资产登记仍由 `services` 负责。
- 运行生命周期、阶段推进、重试与审核等职责留给 `workflow` 或入口层消费者。
## 7. Agent 运行时职责模型
本节明确三类术语的边界，避免职责混用：

- `业务用例（use case）`：由 `@toonflow/services` 持有的领域级操作，负责领域状态读写、事务协调与稳定 DTO。
- `agent run`：由 `@toonflow/agents` 执行的单次运行，负责上下文装配、模型交互、统一事件输出与 run-scope artifact/result 产出。
- `workflow run`：由 `@toonflow/workflow` 承担的上层编排，负责阶段推进、状态机、重试、暂停/恢复与审核返工。

职责模型固定如下：

- `@toonflow/agents` 负责单次运行协议、统一事件流与 artifact/result/error 的输出边界。
- `@toonflow/agents` 不负责领域写入、版本创建、资产登记，也不负责 run 生命周期或状态机推进。
## 8. AgentContext 与依赖注入边界
`AgentContext` 是 Agent 运行时唯一的依赖注入入口，负责显式提供运行所需的稳定依赖集合。

约束如下：

- 数据访问必须经 `services` 暴露的只读查询门面完成，限定为 `read/query` 性质的稳定视图。
- `read/query` 的最小判定标准是不改变领域状态、无持久化副作用。
- `agent run` 禁止调用会写库、提交副作用、创建版本、登记资产的 service 用例，任何领域写入只能发生在运行外层。
- 模型调用可直连 `@toonflow/ai-providers`。
- run-scope 产物写入可直连 `@toonflow/storage`。
- 不允许隐式全局单例、导入即初始化或入口层私有上下文对象。
## 9. 统一事件协议与结果边界
`@toonflow/agents` 必须对外暴露统一事件协议与稳定输出边界，避免入口层各自定义私有事件或回调形态。

约束如下：

- `run()` / `stream()` 是对外稳定运行入口。
- 其余公共导出仅限类型、契约、上下文构造辅助等支撑性导出。
- `run()` 与 `stream()` 共享同一输入边界和主要错误语义，只在输出方式上区分。
- 统一事件协议至少覆盖 `progress`、`artifact`、`result`、`error` 四类稳定事件。
- `artifact` 是 run-scope 产物，可携带存储引用，但默认不等于领域资产记录或正式版本。
- `result` 是最终结构化结果，可引用本次运行产出的 artifact，但不隐含持久化已完成。
- 如需把 artifact/result 沉淀为正式领域数据，必须由外层 `services` 或 `workflow + services` 显式完成。
- 入口层不得依赖某个 Agent 私有事件名或某个 SDK 的原始回调形态。
## 10. 多入口消费与最小接入方式
多入口消费必须遵循“主路径服务化、直连入口隔离化”的原则，避免把直连 Agent 作为正式业务接口默认实现。

约束如下：

- `apps/api` 常规业务接口继续以 `@toonflow/services` 为主调用面。
- 只有隔离的 `internal/preview/debug` 入口允许直连 `@toonflow/agents`。
- 正式业务接口、常规 route/controller、对外稳定 API 不得导入 `@toonflow/agents`。
- `apps/mcp-server` 只允许在隔离的 tool-style 入口中直连 Agent。
- 任何直连 Agent 的入口都禁止落库、登记资产、创建正式版本或推进项目状态。
- Phase 5 后内容生产主链由 `workflow` 作为上层编排入口。
## 11. 错误模型与中断语义
错误模型需保持与 `@toonflow/kernel` 一致，确保不同入口消费到的是同一套稳定错误语义与中断语义。

约束如下：

- 错误语义优先复用 `@toonflow/kernel`。
- 取消 / 超时 / 上游中断需归一为统一的中断类别。
- `run()` 与 `stream()` 共享同类错误对象、错误分类与稳定字段口径。
- 稳定字段以 `@toonflow/kernel` 的错误契约为准，入口层只依赖错误码/类别/是否中断等稳定字段。
- 入口层依赖统一错误码、错误类别、是否中断等稳定信息，不依赖底层异常原文。
- 对外暴露统一错误语义和中断语义，不透传底层 provider / storage 原始异常原文。
- 中断语义只描述本次 run 终止，不定义恢复策略或工作流级回退。
## 12. 测试与验证基线
`@toonflow/agents` 必须能够脱离入口层独立验证，确保事件协议与结果边界稳定可复用。

基线要求如下：

- `@toonflow/agents` 可脱离入口层独立验证。
- AI 生成型 Agent 默认以 stub/mock provider 为验证基线。
- 验证重点覆盖依赖注入正确、事件协议稳定、artifact/result 边界清晰、入口消费隔离明确。
- 事件类型集合与基本顺序/结束语义可验证。
- `run()` / `stream()` 的错误归一口径一致。
- artifact/result 不隐含持久化已完成。
- 入口隔离与依赖注入边界可验证。
## 13. 实施范围与衔接
Phase 4 交付范围仅完成文档层面的详细设计约束，不提前下沉 Phase 5 的状态机职责。

约束如下：

- Phase 4 交付范围仅限重写 `04-agent-runtime.md` 与新增 `04-agent-runtime-spec.md`。
- Phase 5 继续承接 workflow 状态机、重试、暂停恢复、审核返工与主链编排。
