# `@toonflow/ai-providers` 与 `@toonflow/storage` 详细设计说明

## 1. 文档目的

本文档是 [`02-ai-providers-storage.md`](./02-ai-providers-storage.md) 的详细设计补充，用于约束 Phase 2 中 `@toonflow/ai-providers` 与 `@toonflow/storage` 的共享规则、包边界与实现基线。阶段说明文档回答“本阶段交付什么”，本文回答“两个包如何按统一约束落地”。

相关文档：

- 架构总览：[`architecture-overview.md`](./architecture-overview.md)
- Phase 1 详细设计：[`01-database-layer-spec.md`](./01-database-layer-spec.md)
- 设计输入：[`../superpowers/specs/2026-03-27-ai-providers-storage-design.md`](../superpowers/specs/2026-03-27-ai-providers-storage-design.md)

## 2. 设计目标

- 固化 `@toonflow/ai-providers` 与 `@toonflow/storage` 作为 `packages/` 下并列的基础设施包，而非 `apps/api` 私有工具目录。
- 统一两个包的共享边界、依赖方向与目录分层，减少实现阶段的结构摇摆。
- 约束公共 API 只暴露稳定构造入口与核心类型，确保上层通过显式构造和依赖注入接入。
- 固定配置输入模型为结构化对象，避免包内耦合 `process.env` 和进程级隐式状态。
- 为后续包专属章节（第 8、9 节）提供一致的共享前提。

## 3. 非目标

- 本节不提前补全 `@toonflow/ai-providers` 与 `@toonflow/storage` 的包内专属实现细节（由后续任务在第 8、9 节展开）。
- 不在 Phase 2 设计 provider 配置持久化、业务路由策略或场景级 fallback 策略。
- 不在 Phase 2 首批交付 `video` 的真实厂商实现与 `S3-compatible storage` 的真实对象存储实现。
- 不恢复全局单例、`utils.ts` 转发层或导入即初始化的兼容模式。

## 4. 包边界与依赖规则

### 4.1 并列包边界

- `@toonflow/ai-providers` 与 `@toonflow/storage` 必须作为 `packages/` 下并列 package 存在，二者不互相依赖。
- 二者均属于基础设施层，长期由上层聚合消费，不能回流为任一 app 的内部子模块。

目标依赖方向保持为：

```text
kernel
  ├── db
  ├── ai-providers
  └── storage

db + ai-providers + storage + kernel
  └── services
```

### 4.2 允许依赖

- `@toonflow/ai-providers`：厂商 SDK、`@toonflow/kernel` 中跨包共享的类型/错误码/纯函数。
- `@toonflow/storage`：Node.js 文件系统能力（以及后续对象存储 SDK 扩展位）、`@toonflow/kernel` 中跨包共享的类型/错误码/纯函数。

### 4.3 禁止依赖

- 两个包均不允许依赖：`apps/*`、`@toonflow/services`、`@toonflow/agents`、`@toonflow/workflow`。
- 两个包均不允许导入对方内部实现（包括 `src/*` 路径直连）。
- 两个包均不允许耦合 HTTP/MCP/Web UI 等传输层或入口层框架。

## 5. 建议目录结构

共享结构约束（仅定义并列关系与包级边界）：

```text
packages/
├── ai-providers/
│   ├── src/
│   ├── package.json
│   └── tsconfig.json
└── storage/
    ├── src/
    ├── package.json
    └── tsconfig.json
```

约束：

- 两个包必须同级放置在 `packages/` 下，不允许一个包作为另一个包的子目录。
- 每个包仅通过自身 `src/index.ts` 暴露公共 API，内部目录不直接作为跨包契约。

## 6. 公共 API 设计

- 公共 API 必须体现“边界最小化”：只暴露稳定构造函数、核心接口和跨包必要类型。
- 上层消费必须使用显式构造与依赖注入，不允许依赖包内全局单例或导入即初始化副作用。
- 公共 API 不暴露厂商 SDK 原始对象、底层文件系统句柄或内部注册表实现细节。
- 包内可以存在多层实现目录，但跨包只认可 `@toonflow/ai-providers`、`@toonflow/storage` 的稳定导出面。

推荐装配方式（示意）：

```ts
const aiRegistry = createAiProviderRegistry(aiProvidersConfig);
const storage = createLocalStorage(storageConfig);

const serviceDeps = {
  aiRegistry,
  storage
};
```

## 7. 配置与运行方式

- 两个包的运行时输入必须是结构化配置对象，而不是在包内直接读取 `process.env`。
- 允许在边缘层提供 `read*Config(env)` 之类解析函数，把环境变量转换为结构化配置；解析函数不承载业务路由策略。
- `@toonflow/ai-providers` 与 `@toonflow/storage` 的包内模块禁止直接访问 `process.env`。
- 测试、脚本、应用启动均应沿用同一输入路径：`env(可选) -> 配置解析 -> 结构化配置对象 -> 显式构造 -> 依赖注入`。
- 配置持久化、默认 provider 选择、对象存储策略选择属于上层职责，不属于两个包内部职责。

## 8. `@toonflow/ai-providers` 设计

### 8.1 包职责与边界

`@toonflow/ai-providers` 在 Phase 2 中只负责以下事项：

- `text` / `image` / `video` 三类能力的统一抽象。
- 厂商 SDK 差异适配与 provider 封装。
- provider registry 的注册、查找与实例解析。
- 统一 request / result / stream 语义，避免上层直接处理厂商事件细节。

`@toonflow/ai-providers` 不负责以下事项：

- 配置持久化（例如数据库存储 provider 配置）。
- 业务路由策略（例如场景级默认模型选择与 fallback 策略）。
- 工作流编排或任务级调度。
- HTTP / MCP / Web UI / Electron 等传输层接入。

### 8.2 Phase 2 能力基线

- `text`：必须提供真实可运行实现。
- `image`：必须提供真实可运行实现。
- `video`：只定义接口、类型与 registry 扩展位，不要求首批接入真实厂商。

### 8.3 建议目录结构

```text
packages/ai-providers/
├── src/
│   ├── index.ts
│   ├── config/
│   ├── registry/
│   ├── errors/
│   ├── text/
│   ├── image/
│   ├── video/
│   └── providers/
│       └── <vendor>/
```

### 8.4 稳定公共导出面

`@toonflow/ai-providers` 需要长期稳定暴露以下导出：

- `createAiProviderRegistry(...)`
- `AiProviderRegistry`
- `TextProvider`
- `ImageProvider`
- `VideoProvider`
- 各模态共享的 request / result / stream chunk 类型

### 8.5 配置模型与注册装配约束

- provider 包只接受结构化配置对象，不在包内直接读取 `process.env`。
- 边缘层可以提供 `env -> config` 的解析函数，但解析过程不能替代业务默认值决策。
- registry 装配只负责接收 provider 实例并提供解析能力，不承担配置持久化或场景路由策略。
- 默认 provider 的业务选择由上层组合层决定，不固化在 `@toonflow/ai-providers` 包内。

### 8.6 `TextProvider.stream()` 与流式语义约束

- `TextProvider.stream()` 是 Phase 2 正式要求，不是预留接口。
- 流式调用采用 provider-neutral 的异步消费模型，调用方通过统一的异步迭代结果读取增量输出。
- 公共 API 不暴露厂商 SDK 的事件类型、回调签名或连接对象，SDK 事件形态必须在 provider 内部完成映射。
- `invoke()` 与 `stream()` 必须共享同一请求边界与主要错误语义，避免上层按厂商分支处理。

## 9. `@toonflow/storage` 设计

> 本节由 Task 4 补充。

## 10. 错误模型设计

> 待后续任务补充。

## 11. 测试与验证基线

> 待后续任务补充。

## 12. 实施范围与衔接

> 待后续任务补充。
