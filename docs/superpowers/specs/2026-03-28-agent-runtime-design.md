# Toonflow 第 4 阶段 Agent 运行时设计

## 概述

本文档定义 Toonflow 第 4 阶段的设计目标：将内容生产类 Agent 的统一运行能力沉淀到 `packages/agents`，形成位于 `@toonflow/services`、`@toonflow/ai-providers`、`@toonflow/storage`、`@toonflow/kernel` 之上的共享 Agent 运行时层，并以双层文档方式重写第 4 阶段的 refactoring 文档：

- `docs/refactoring/04-agent-runtime.md`
- `docs/refactoring/04-agent-runtime-spec.md`

本设计直接对齐以下文档：

- 架构总览：[`docs/refactoring/architecture-overview.md`](../../refactoring/architecture-overview.md)
- 第 3 阶段说明：[`docs/refactoring/03-application-services.md`](../../refactoring/03-application-services.md)
- 第 3 阶段详细设计：[`docs/refactoring/03-application-services-spec.md`](../../refactoring/03-application-services-spec.md)
- 第 5 阶段阶段文档：[`docs/refactoring/05-workflow-engine.md`](../../refactoring/05-workflow-engine.md)

本文档服务于后续实施计划，不承担旧入口层 Agent 调用封装说明的职责，也不把第 4 阶段提前扩写为工作流引擎设计。

## 核心决策

- 第 4 阶段采用与第 2、3 阶段一致的双层文档结构：阶段说明文档负责阶段边界，详细设计文档负责运行时约束。
- `@toonflow/agents` 是共享 Agent 运行时层，不是入口层里的脚本集合，也不是 `workflow` 的轻量替身。
- 第 4 阶段的首批范围覆盖内容生产主链中的五类 Agent：`outline`、`script`、`storyboard`、`assets`、`video`。
- `@toonflow/agents` 只负责单次 Agent 运行的统一协议，包括上下文注入、统一事件流、artifact/result 输出边界与稳定调用接口。
- 第 4 阶段明确采用硬边界：run 生命周期、状态机推进、暂停/恢复/重试、审核回退和阶段推进职责留给第 5 阶段 `workflow`。
- `@toonflow/agents` 保持与架构总览一致的依赖方向：可依赖 `@toonflow/services`、`@toonflow/ai-providers`、`@toonflow/storage`、`@toonflow/kernel`；数据访问经 `services`，运行时模型调用与产物读写可直连 `ai-providers` / `storage`。
- `apps/api`、`apps/mcp-server` 与后续 `workflow` 都应消费同一套 Agent 运行时协议，而不是各自定义私有 Agent 接口。
- 第 4 阶段不承诺完整工作流调度，也不下沉到每个 Agent 的方法级设计。

## 目标与非目标

### 目标

- 将第 4 阶段从“入口层里的 Agent 调用片段”改写为对齐 monorepo 架构的 Agent 运行时阶段文档。
- 为 `@toonflow/agents` 建立稳定的包边界、依赖规则、Agent 分组与运行时协议口径。
- 明确首批五类内容生产 Agent 的运行时职责边界，避免实现前在事件协议、上下文结构和输出语义上继续发散。
- 固定 `apps/api`、`apps/mcp-server` 与未来 `workflow` 对 Agent 运行时的统一消费关系，同时维持长期依赖方向。
- 为后续实施计划提供足够清晰的 `AgentContext`、事件协议、artifact/result、错误与测试约束输入。

### 非目标

- 不把第 4 阶段写成某个入口层的 Agent 调用迁移说明。
- 不在本轮设计中细化到每个 Agent 的方法列表、步骤清单或文件级实现蓝图。
- 不把 run 生命周期、状态机推进、暂停/恢复/重试、审核回退等工作流职责提前塞进 `@toonflow/agents`。
- 不把 HTTP、MCP、WebSocket、SSE 等传输层协议适配下沉到 `@toonflow/agents`。
- 不恢复旧单体兼容层、隐式全局单例或导入即初始化模式。

## 文档交付物设计

第 4 阶段的 refactoring 文档应拆成两个层级：

- `docs/refactoring/04-agent-runtime.md`
  - 负责第 4 阶段的定位、目标、范围、非目标、关键决策、相邻阶段边界、集成方式、首批交付基线、交付物、验收标准和风险。
- `docs/refactoring/04-agent-runtime-spec.md`
  - 负责 `@toonflow/agents` 的包边界、依赖规则、目录分层、首批 Agent 分组、`AgentContext`、事件协议、artifact/result 边界、装配与测试基线。

拆分原则如下：

- 阶段说明文档回答“本阶段交付什么、为什么这样界定”。
- 详细设计文档回答“`@toonflow/agents` 如何按统一运行时约束落地”。
- 阶段说明文档不再直接承载包结构示意、接口代码片段和入口消费示例作为主干叙事。
- 运行时协议与 `AgentContext` 等技术约束集中在详细设计文档中统一定义。

## 依赖方向与架构边界

第 4 阶段必须继续遵守 [`architecture-overview.md`](../../refactoring/architecture-overview.md) 的依赖方向：

```text
services + ai-providers + storage + kernel
  └── agents

db + services + agents + kernel
  └── workflow

services + agents + workflow + kernel
  ├── apps/api
  └── apps/mcp-server
```

边界约束如下：

- `@toonflow/agents` 可以依赖：
  - `@toonflow/kernel`
  - `@toonflow/services`
  - `@toonflow/ai-providers`
  - `@toonflow/storage`
- `@toonflow/agents` 不允许依赖：
  - `apps/*`
  - `@toonflow/workflow`
  - 数据库客户端、repository 实现或入口层私有协议实现
- `@toonflow/agents` 负责：
  - 单次 Agent 运行协议
  - 统一事件流
  - artifact/result/error 输出边界
  - 运行时依赖注入与上下文接收
- `@toonflow/workflow` 后续负责：
  - Run 生命周期
  - 状态机推进
  - 暂停 / 恢复 / 重试 / 阶段推进
  - 审核与返工编排
- `apps/api` 与 `apps/mcp-server` 负责：
  - 消费统一 Agent 协议
  - 传输层或协议层翻译
  - 不自定义私有 Agent 运行接口

第 4 阶段的表述重点应是“建立统一 Agent 运行时”，而不是“把入口层里的 Agent 调用代码搬到 package”。

## `04-agent-runtime.md` 的设计骨架

阶段说明文档建议固定为以下章节：

1. `定位`
2. `目标`
3. `范围`
4. `非目标`
5. `关键决策`
6. `Agent 运行时职责与相邻阶段边界`
7. `集成方式`
8. `首批交付基线`
9. `交付物`
10. `验收标准`
11. `风险与注意事项`

每节承担的角色如下：

- `定位`：明确第 4 阶段是 `packages/agents` 阶段，不再沿用入口层调用封装叙事。
- `目标`：写清统一 Agent 运行时、首批五类 Agent 和多入口消费三项目标。
- `范围`：限定为单次 Agent 运行协议、事件流、artifact/result 边界与运行时依赖注入。
- `非目标`：排除工作流状态机、run 生命周期、传输层协议适配与方法级设计。
- `关键决策`：固定运行时硬边界、依赖方向和多入口统一消费原则。
- `Agent 运行时职责与相邻阶段边界`：一次写清 `services`、`agents`、`workflow`、`apps/api`、`apps/mcp-server` 的责任切分。
- `集成方式`：描述 `services + ai-providers + storage + kernel -> agents -> apps/api / apps/mcp-server / workflow` 的最小接入关系。
- `首批交付基线`：强调首批只要求建立统一运行协议与五类 Agent 分组，不要求提前实现工作流调度。
- `交付物`：列出阶段文档和详细 spec 两层文档。
- `验收标准`：以边界清晰、依赖方向一致、首批范围明确、统一协议可被多入口消费为准。
- `风险与注意事项`：重点提醒 Agent 运行时过薄或过胖两类偏差。

## `04-agent-runtime-spec.md` 的设计骨架

详细设计文档建议固定为以下章节：

1. `文档目的`
2. `设计目标`
3. `非目标`
4. `包边界与依赖规则`
5. `建议目录结构`
6. `首批 Agent 分组`
7. `Agent 运行时职责模型`
8. `AgentContext 与依赖注入边界`
9. `统一事件协议与结果边界`
10. `多入口消费与最小接入方式`
11. `错误模型与中断语义`
12. `测试与验证基线`
13. `实施范围与衔接`

每节承担的角色如下：

- `包边界与依赖规则`：锁定允许和禁止依赖，避免 `agents` 回流依赖入口层或提前依赖 `workflow`。
- `建议目录结构`：只定义包内分层，不定义每个 Agent 的方法表。
- `首批 Agent 分组`：按运行时场景描述五类 Agent 的职责边界，而不是列出方法签名。
- `Agent 运行时职责模型`：明确 Agent 负责单次运行、事件输出、artifact/result 生成，不负责 run 生命周期。
- `AgentContext 与依赖注入边界`：固定数据访问经 `services`，模型调用与产物读写可直连 `ai-providers` / `storage`。
- `统一事件协议与结果边界`：锁定 `run()` / `stream()`、事件类别、artifact/result/error 语义。
- `多入口消费与最小接入方式`：固定 `apps/api`、`apps/mcp-server`、`workflow` 对 Agent 运行时的消费关系。
- `错误模型与中断语义`：限定错误归一化和中断语义，但不扩展成 workflow 恢复机制。
- `测试与验证基线`：要求 Agent 运行时可脱离入口层独立测试。

## 首批 Agent 分组

第 4 阶段的首批 Agent 分组固定为以下五组：

- `outline agent`
  - 负责大纲生成类单次运行场景。
- `script agent`
  - 负责剧本生成类单次运行场景。
- `storyboard agent`
  - 负责分镜生成类单次运行场景。
- `assets agent`
  - 负责素材生成类单次运行场景。
- `video agent`
  - 负责视频生成类单次运行场景。

这些分组在文档中应描述到“运行时职责边界”粒度，而不是方法清单或工作流阶段定义。共同原则如下：

- 每组 Agent 围绕一个明确内容生产场景组织，而不是围绕入口层协议或路由动作命名。
- 每组 Agent 都可以在单次运行中组合 `services + ai-providers + storage + kernel`。
- 每组 Agent 都应明确哪些职责属于本组，哪些职责应留给 `workflow` 或入口层消费者。
- 首批分组是最小运行时基线，不等于未来所有 Agent 类型的完整名单。

## `AgentContext`、依赖注入与多入口消费

`AgentContext` 是 Agent 运行时唯一的依赖入口，用于在一次运行开始时显式注入稳定依赖集合，而不是把入口层对象或隐式全局状态直接暴露给 Agent。

关键约束如下：

- 数据访问必须经 `@toonflow/services` 暴露的领域接口完成，Agent 不直接依赖 repository 或数据库客户端。
- Agent 可以直接依赖 `@toonflow/ai-providers` 与 `@toonflow/storage` 完成模型调用和产物读写。
- 包内不允许隐式全局单例、导入即初始化或入口层私有上下文对象。
- `apps/api`、`apps/mcp-server` 与未来 `workflow` 都应消费同一套 Agent 运行时协议，而不是各自定义私有 Agent 接口。

## 统一事件协议与输出边界

第 4 阶段应把统一事件协议视为 Agent 运行时的核心契约之一。`@toonflow/agents` 对外只提供两种稳定运行语义：

- `run()`：一次性返回最终结构化结果
- `stream()`：以统一事件流输出运行过程

约束如下：

- `run()` 与 `stream()` 共享同一输入边界和主要错误语义，只在输出方式上区分。
- 统一事件协议至少覆盖 `progress`、`artifact`、`result`、`error` 等稳定类别。
- `artifact` 表示运行过程中产生、可被外部引用或消费的产物；`result` 表示该次 Agent 运行的最终结构化结果。
- 入口层不得依赖某个 Agent 私有事件名或某个 SDK 的原始回调形态。
- 对外暴露的是统一错误语义和中断语义，而不是底层 provider / 文件系统异常原文。

## 对后续实施计划的直接输入

本设计为后续实施计划提供以下直接输入：

- 第 4 阶段先完成文档重构，而不是直接进入代码实现。
- 文档实施范围固定为两项：
  - 重写 `docs/refactoring/04-agent-runtime.md`
  - 新增 `docs/refactoring/04-agent-runtime-spec.md`
- 两份文档都必须使用中文，并与第 2、3 阶段的双层模式保持一致。
- 详细设计文档需要优先锁定共享运行时规则，再展开首批 Agent 分组与统一事件协议。
- 后续计划阶段不得重新引入入口层脚本封装叙事，也不得把 Workflow 生命周期职责提前写入 `@toonflow/agents`。
