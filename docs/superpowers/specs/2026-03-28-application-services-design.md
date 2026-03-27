# Toonflow 第 3 阶段应用服务层设计

## 概述

本文档定义 Toonflow 第 3 阶段的设计目标：将应用服务能力沉淀到 `packages/services`，形成位于 `@toonflow/db`、`@toonflow/ai-providers`、`@toonflow/storage` 之上的共享应用服务层，并以双层文档方式重写第 3 阶段的 refactoring 文档：

- `docs/refactoring/03-application-services.md`
- `docs/refactoring/03-application-services-spec.md`

本设计直接对齐以下文档：

- 架构总览：[`docs/refactoring/architecture-overview.md`](../../refactoring/architecture-overview.md)
- 第 2 阶段说明：[`docs/refactoring/02-ai-providers-storage.md`](../../refactoring/02-ai-providers-storage.md)
- 第 2 阶段详细设计：[`docs/refactoring/02-ai-providers-storage-spec.md`](../../refactoring/02-ai-providers-storage-spec.md)

本文档服务于后续实施计划，不承担旧单体路由迁移手册的职责，也不把第 3 阶段重新定义为“路由瘦身清单”。

## 核心决策

- 第 3 阶段采用与第 2 阶段一致的双层文档结构：阶段说明文档负责阶段边界，详细设计文档负责包级约束。
- `@toonflow/services` 是共享应用服务层，不是旧路由文件的搬运层，也不是 repository 的薄封装层。
- 第 3 阶段的首批范围只覆盖核心内容域：`project`、`novel`、`outline`、`script`、`storyboard`、`assets`、`video`。
- `@toonflow/services` 允许在单次业务用例内编排 `repository + ai-providers + storage`，包括单次 AI 生成型业务用例。
- `@toonflow/services` 不承载 HTTP 请求解析、响应 envelope、鉴权、日志、SSE/WebSocket 等传输层职责，这些继续留在 `apps/api`。
- `@toonflow/services` 不提前承载可复用 Agent 运行时、长生命周期任务状态机或多阶段工作流编排，这些继续留给第 4 阶段 `agents` 和第 5 阶段 `workflow`。
- 第 3 阶段允许 `apps/api` 做最小验证接入，但长期模式仍然是入口层的业务调用面只消费 `@toonflow/services` 的稳定导出面；应用启动期可以作为 composition root 完成底层依赖装配。
- 第 3 阶段不把 `prompt`、`setting`、`auth` 纳入首批服务分组，也不承诺“所有旧路由功能按原样迁移”。

## 目标与非目标

### 目标

- 将第 3 阶段从旧路由提取叙事，改写为对齐 monorepo 架构的应用服务层阶段文档。
- 为 `@toonflow/services` 建立稳定的包边界、依赖规则、服务分组与装配口径。
- 明确首批核心内容域服务的职责边界，避免在实现前继续按旧路由方法表发散。
- 固定 `apps/api` 与 `@toonflow/services` 的最小验证接入关系，同时维持长期依赖方向。
- 为后续实施计划提供足够清晰的 DTO、事务、错误与测试约束输入。

### 非目标

- 不把第 3 阶段写成旧单体 `src/routes/*` 的逐文件迁移计划。
- 不在本轮设计中细化到每个 service 的方法列表、文件清单或类级实现蓝图。
- 不把 `prompt`、`setting`、`auth` 等支撑域纳入首批核心内容域服务。
- 不把 HTTP 参数解析、响应格式、JWT、日志中间件或 SSE/WebSocket 适配下沉到 `@toonflow/services`。
- 不把可复用 Agent 运行时、长流程任务编排或跨阶段状态机提前塞进第 3 阶段。
- 不恢复全局工具对象、入口层业务回流或兼容旧目录结构的双轨模式。

## 文档交付物设计

第 3 阶段的 refactoring 文档应拆成两个层级：

- `docs/refactoring/03-application-services.md`
  - 负责第 3 阶段的定位、目标、范围、非目标、关键决策、集成方式、首批交付基线、交付物、验收标准和风险。
- `docs/refactoring/03-application-services-spec.md`
  - 负责 `@toonflow/services` 的包边界、依赖规则、目录分层、首批服务分组、职责模型、DTO/错误/事务/装配/测试基线。

拆分原则如下：

- 阶段说明文档回答“本阶段交付什么、为什么这样界定”。
- 详细设计文档回答“`@toonflow/services` 如何在统一约束下落地”。
- 阶段说明文档不再保留旧路由文件统计、逐 service 方法表或迁移前后代码对比。
- 旧路由盘点如果仍有参考价值，只作为设计输入或附录，不再作为主干叙事。

## 依赖方向与架构边界

第 3 阶段必须继续遵守 [`architecture-overview.md`](../../refactoring/architecture-overview.md) 的依赖方向：

```text
kernel
  ├── db
  ├── ai-providers
  └── storage

db + ai-providers + storage + kernel
  └── services

services + agents + workflow + kernel
  └── apps/api
```

上面的依赖方向表达的是业务依赖与包职责分层，不否定应用启动期的依赖装配职责。

边界约束如下：

- `@toonflow/services` 可以依赖：
  - `@toonflow/kernel`
  - `@toonflow/db`
  - `@toonflow/ai-providers`
  - `@toonflow/storage`
- `@toonflow/services` 不允许依赖：
  - `apps/*`
  - `@toonflow/agents`
  - `@toonflow/workflow`
  - 任意入口层私有实现目录
- `apps/api` 负责：
  - 请求解析与参数校验
  - 鉴权、日志、错误映射
  - HTTP / WebSocket / SSE 传输适配
  - 应用启动期的依赖装配
  - 调用 `@toonflow/services` 并封装响应
- `apps/api` 的约束：
  - 可以在应用启动期作为 composition root 初始化 repository、AI registry、storage adapter 等底层实例，并注入 `@toonflow/services`
  - route/controller 等业务调用面不得绕过 `@toonflow/services` 直接拼接底层包实现
- `@toonflow/services` 负责：
  - 领域用例执行
  - 单次业务用例内的事务协调
  - 组合 repository / provider / storage
  - 对底层错误和返回结果做领域级归一化
- `@toonflow/agents` 与 `@toonflow/workflow` 后续负责：
  - 可复用 Agent 运行时
  - 长生命周期任务编排
  - 多阶段状态推进与恢复策略

第 3 阶段的表述重点应是“建立共享应用服务层”，而不是“保证旧路由全部等价提取”。

## `03-application-services.md` 的设计骨架

阶段说明文档建议固定为以下章节：

1. `定位`
2. `目标`
3. `范围`
4. `非目标`
5. `关键决策`
6. `服务层职责与相邻阶段边界`
7. `集成方式`
8. `首批交付基线`
9. `交付物`
10. `验收标准`
11. `风险与注意事项`

每节承担的角色如下：

- `定位`：明确第 3 阶段是 `packages/services` 阶段，不再沿用旧单体迁移叙事。
- `目标`：写清共享应用服务层、首批核心内容域、最小 API 接入验证三项目标。
- `范围`：限定为领域服务、事务协调、单次业务用例内的基础设施组合编排。
- `非目标`：排除支撑域、传输层、Agent/Workflow 长流程和全量旧路由等价迁移承诺。
- `关键决策`：固定显式构造、依赖注入、单次 AI 编排允许、长期依赖方向不回退。
- `服务层职责与相邻阶段边界`：一次写清 `services`、`apps/api`、`agents`、`workflow` 的责任切分。
- `集成方式`：描述 `db + ai-providers + storage -> services -> apps/api` 的最小装配关系。
- `首批交付基线`：强调只要求建立首批服务分组与最小验证链路，不要求铺满未来全部服务形态。
- `交付物`：列出阶段文档和详细 spec 两层文档。
- `验收标准`：以边界清晰、范围收敛、依赖方向一致、最小接入口径明确为准。
- `风险与注意事项`：重点提醒服务层过薄或过胖两类偏差。

## `03-application-services-spec.md` 的设计骨架

详细设计文档建议固定为以下章节：

1. `文档目的`
2. `设计目标`
3. `非目标`
4. `包边界与依赖规则`
5. `建议目录结构`
6. `首批领域服务分组`
7. `应用服务职责模型`
8. `输入输出与 DTO 边界`
9. `事务与副作用协调原则`
10. `错误模型与返回约束`
11. `装配与最小接入方式`
12. `测试与验证基线`
13. `实施范围与衔接`

每节承担的角色如下：

- `包边界与依赖规则`：锁定允许和禁止依赖，避免 `services` 回流依赖入口层或后续阶段包。
- `建议目录结构`：只定义包内分层，不定义方法表和文件级蓝图。
- `首批领域服务分组`：按核心内容域描述职责边界，而不是列出每个 service 的方法签名。
- `应用服务职责模型`：明确 service 的责任是领域用例、事务协调和单次业务编排。
- `输入输出与 DTO 边界`：要求公共服务契约不直接暴露 HTTP、数据库或厂商 SDK 原始对象。
- `事务与副作用协调原则`：限定第 3 阶段只处理单次用例级协调，不进入长流程状态机。
- `错误模型与返回约束`：要求先归一化底层错误，再向上传递领域或应用语义。
- `装配与最小接入方式`：固定 `apps/api` 的最小接入方式与长期消费关系。
- `测试与验证基线`：要求服务层可脱离 HTTP 层独立测试。

## 首批领域服务分组

第 3 阶段的首批服务分组固定为以下七组：

- `project` 服务组
  - 负责项目级生命周期与项目聚合根基础读写。
- `novel` 服务组
  - 负责小说原文、章节或文本素材的内容管理。
- `outline` 服务组
  - 负责大纲读写与单次大纲生成用例。
- `script` 服务组
  - 负责剧本读写与单次剧本生成用例。
- `storyboard` 服务组
  - 负责分镜读写与单次分镜生成用例。
- `assets` 服务组
  - 负责素材管理与单次素材生成用例。
- `video` 服务组
  - 负责视频相关元数据、生成请求结果引用与单次视频生成用例。

这些分组在文档中应描述到“职责边界”粒度，而不是方法清单粒度。共同原则如下：

- 每组围绕一个明确领域组织应用服务，而不是围绕旧路由文件切分。
- 每组都可以组合 `repository + ai-providers + storage` 完成单次业务用例。
- 每组都应明确哪些职责属于本组，哪些职责应留给 `apps/api`、`agents` 或 `workflow`。
- `prompt`、`setting`、`auth` 不进入首批分组。

## `apps/api` 的最小接入方式

第 3 阶段文档应明确以下接入口径：

- `apps/api` 在第 3 阶段可以作为最小验证入口，用来证明 `@toonflow/services` 可被真实入口层消费。
- 这种接入是阶段性验证方式，不是把业务逻辑继续留在 route/controller 中的许可。
- 入口层负责请求解析、参数校验、鉴权、错误映射和响应封装。
- 领域用例执行、事务协调和底层依赖组合由 `@toonflow/services` 承担。
- 依赖装配方式应是显式构造与注入；`apps/api` 可以在应用启动期作为 composition root 初始化 repository、AI registry、storage adapter，再交给 `@toonflow/services` 消费。
- “入口层只消费 `@toonflow/services`”指的是 route/controller 等业务调用面不直接跨包拼接底层实现，不否定启动期的依赖注入职责。
- 验收只要求存在最小可验证接入链路，不要求第 3 阶段一次性铺满全部 API 接入面。

## DTO、事务、错误与测试约束

### DTO 边界

- 应用服务对外只暴露稳定输入输出对象。
- 不直接暴露 HTTP request/response、数据库表行结构、Knex 查询结果或厂商 SDK 原始响应。
- storage 的内部路径或底层实现对象不应直接泄漏给入口层。

### 事务与副作用协调

- 应用服务负责单次业务用例内的数据一致性协调。
- 当用例需要组合多个 repository 写操作，或需要协调数据库写入与 AI / storage 副作用时，由 service 定义执行顺序和边界。
- 第 3 阶段不引入跨多阶段、可恢复、可重试的长流程状态机。

### 错误语义

- service 不应直接向上抛数据库驱动异常、provider SDK 异常或文件系统原始异常。
- 共享错误语义优先复用 `@toonflow/kernel`。
- service 应将底层错误归一化为入口层可稳定消费的领域错误或应用错误。

### 测试基线

- `@toonflow/services` 必须可以脱离 HTTP 层独立验证。
- 测试重点应放在领域用例成立、依赖注入正确、事务边界明确、错误归一化稳定。
- AI 生成型服务默认以 stub/mock provider 为验证基线，不把在线厂商调用作为常规测试前提。

## 对后续实现计划的直接输入

本设计为后续实施计划提供以下直接输入：

- 第 3 阶段先完成文档重构，而不是直接进入代码实现。
- 文档实施范围固定为两项：
  - 重写 `docs/refactoring/03-application-services.md`
  - 新增 `docs/refactoring/03-application-services-spec.md`
- 两份文档都必须使用中文，并与第 2 阶段的双层模式保持一致。
- 详细设计文档需要优先锁定共享规则，再展开首批领域服务分组与接入方式。
- 后续计划阶段不得重新引入旧路由统计、方法清单驱动的文档结构。
