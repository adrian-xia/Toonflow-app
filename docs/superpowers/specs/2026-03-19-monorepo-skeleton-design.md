# Toonflow Phase 0 Monorepo Skeleton Design

## 概述

本文档定义 Toonflow 在新项目场景下的 Phase 0 设计：建立与 `docs/refactoring/architecture-overview.md` 对齐的 monorepo 骨架，并让 `apps/api` 与 `packages/kernel` 具备最小可运行能力。

本设计明确覆盖并替代 `docs/refactoring/00-monorepo-skeleton.md` 中面向“旧单体迁移”的假设。当前前提不是迁移存量代码，而是按目标架构冷启动新工程。

## 核心决策

- 项目按新项目初始化，不保留旧目录、旧导入、兼容层或转发层。
- 实施过程中如发现旧实现与新设计冲突，直接删除旧实现，由新实现原位替代。
- Phase 0 只建立工程骨架和共享内核，不提前引入数据库、服务层、Agent 运行时或工作流包。
- monorepo 工具链一次到位，采用 `pnpm workspace + turbo + TypeScript project references`。
- 目录边界一步对齐目标架构，但只有 `apps/api` 和 `packages/kernel` 在 Phase 0 具备真实实现。

## 目标与非目标

### 目标

- 建立稳定的 monorepo 目录结构，避免后续入口和基础包二次搬迁。
- 让 `apps/api` 能以最小 Express 服务运行，并提供健康检查接口。
- 让 `packages/kernel` 成为首个共享包，提供统一响应、错误模型和少量共享类型。
- 让未来入口以正式 workspace package 身份存在，具备 `package.json`、`tsconfig.json` 和基础脚本。
- 明确包依赖方向，为 Phase 1 以后增加 `db`、`services`、`agents`、`workflow` 奠定边界。

### 非目标

- 不做旧项目迁移，不保留兼容逻辑，不设计双轨运行。
- 不创建 `packages/db`、`packages/services`、`packages/agents`、`packages/workflow` 等空抽象包。
- 不在 Phase 0 接入数据库、AI provider、存储、工作流、WebSocket、认证或 Electron 运行时。
- 不要求 `apps/web`、`apps/review-console`、`apps/mcp-server`、`apps/electron` 在 Phase 0 可运行。

## 目标目录结构

```text
toonflow/
├── apps/
│   ├── api/
│   ├── web/
│   ├── review-console/
│   ├── mcp-server/
│   └── electron/
├── packages/
│   └── kernel/
├── package.json
├── pnpm-workspace.yaml
├── turbo.json
├── tsconfig.base.json
└── tsconfig.json
```

### 包边界

- `apps/api`
  - Phase 0 唯一需要运行的服务入口。
  - 负责 HTTP 应用启动、路由注册和统一错误映射。
  - 仅允许依赖 `@toonflow/kernel`。
- `packages/kernel`
  - Phase 0 唯一共享包。
  - 负责跨入口稳定复用的基础类型、响应模型、错误定义和少量共享 schema。
  - 不依赖任何 Toonflow 内部包。
- `apps/web`
- `apps/review-console`
- `apps/mcp-server`
- `apps/electron`
  - 以上四个入口在 Phase 0 作为正式 workspace package 占位。
  - 必须拥有 `package.json`、`tsconfig.json` 和基础脚本。
  - 不要求具备运行逻辑或实际源码目录。

## Workspace 与构建设计

### pnpm workspace

`pnpm-workspace.yaml` 只声明两类包：

- `apps/*`
- `packages/*`

根目录 `package.json` 只承担 workspace 编排职责：

- `private: true`
- 固定 `packageManager: pnpm`
- 提供统一脚本，如 `dev`、`build`、`lint`、`typecheck`

根目录不再承载业务源码，也不再保留 `src/` 作为主运行入口。

### Turbo 任务模型

Phase 0 仅定义最小任务集：

- `build`
- `dev`
- `lint`
- `typecheck`

设计原则：

- `build` 依赖上游包的 `build`
- `dev` 为持久任务，不缓存
- `lint` 与 `typecheck` 按包独立执行
- 不在 Phase 0 提前引入 `test`、`release`、`codegen` 等 pipeline

### TypeScript Project References

TypeScript 采用三层组织：

- `tsconfig.base.json`
  - 放公共严格模式与基础编译选项
- 根 `tsconfig.json`
  - 只承担 references 聚合职责，不直接编译业务代码
- 各包 `tsconfig.json`
  - 继承 base config
  - 明确声明本包输入输出与 references 依赖

Phase 0 中最重要的 references 关系是：

- `apps/api` 引用 `packages/kernel`

这条依赖必须同时体现在：

- `package.json` 依赖声明
- TypeScript references
- Turbo 的上游构建顺序

## 包级实现约定

### `packages/kernel`

`kernel` 只放跨入口稳定复用、无副作用、无基础设施依赖的内容：

- `src/types/`
  - 通用 DTO、分页结构、列表结构等基础共享类型
- `src/errors/`
  - `AppError`
  - 错误码枚举
  - `normalizeError`
- `src/response/`
  - 统一响应结构
  - `ok()` / `fail()` 等工厂函数
- `src/schemas/`
  - 少量确实跨入口共享的 Zod schema
- `src/index.ts`
  - 统一导出入口

进入 `kernel` 的标准必须同时满足以下条件之一：

- 会被两个及以上入口共享
- 会被多个内部包共享
- 不依赖数据库、网络、文件系统、HTTP 上下文或运行时容器

业务专属类型、临时 DTO 或只服务单一路由的结构，不能因为“未来可能复用”而提前塞进 `kernel`。

### `apps/api`

`apps/api` 在 Phase 0 只实现最小 API Gateway 壳：

- `src/main.ts`
  - 启动 HTTP 服务
- `src/app.ts`
  - 创建 Express app 并注册基础中间件
- `src/routes/health.ts`
  - 提供 `GET /health`
- `src/middleware/error-handler.ts`
  - 统一错误处理中间件

`apps/api` 的目标不是提前模拟后续服务层，而是验证 monorepo 依赖链路与运行链路。Phase 0 中不应创建 `services` 目录，不应预埋数据库仓储抽象，也不应引入 future-facing 的空接口。

### 占位入口包

`apps/web`、`apps/review-console`、`apps/mcp-server`、`apps/electron` 采用正式包占位策略：

- 有合法包名，例如 `@toonflow/web`
- 有本地 `tsconfig.json`
- 有基础脚本
- 可在 workspace 中被识别
- 不要求有可执行入口

这些占位包的意义是固定未来落点，而不是制造伪实现。它们可以使用最小 no-op 脚本或仅提供通过型脚本，以保证 workspace 与 Turbo 不因缺包而失真。

## 统一响应与错误约定

Phase 0 即建立共享错误与响应语义：

- 成功响应由 `@toonflow/kernel` 统一定义
- 失败响应由 `@toonflow/kernel` 的错误模型统一定义
- `apps/api` 只负责将领域错误映射为 HTTP 状态码和响应体

最小健康检查接口也必须遵守这套规范。这样未来 `apps/mcp-server`、CLI 或其他入口才能复用同一组语义，而不是只共享 TypeScript 类型名。

## 最小可运行链路

Phase 0 必须验证以下链路：

1. `pnpm install` 可以在根目录成功安装 workspace
2. `packages/kernel` 可以独立构建
3. `apps/api` 可以引用 `@toonflow/kernel`
4. `apps/api` 开发态可以启动 HTTP 服务
5. `GET /health` 返回 `@toonflow/kernel` 定义的统一响应结构

建议健康检查接口只返回最小信息，例如：

- `status`
- `service`
- `timestamp`

其中响应 envelope 必须来自 `kernel`，而不是在 `api` 内部手写重复结构。

## 脚本约定

根脚本负责 workspace 编排，包内脚本负责实际动作。

建议约定如下：

- 根目录
  - `pnpm dev`：仅启动 `@toonflow/api`
  - `pnpm build`：通过 Turbo 编排全 workspace `build`
  - `pnpm lint`：通过 Turbo 编排 `lint`
  - `pnpm typecheck`：通过 Turbo 编排 `typecheck`
- `packages/kernel`
  - 提供真实 `build`、`lint`、`typecheck`
- `apps/api`
  - 提供真实 `dev`、`build`、`lint`、`typecheck`
- 占位包
  - 提供最小可通过脚本，保证 workspace 结构完整

Phase 0 的 `pnpm dev` 不启动所有占位入口，只服务 `apps/api`。这样可以在保持目录完整的同时，把运行复杂度压缩到一个入口。

## 验收标准

以下清单全部满足，Phase 0 才算完成：

- 根目录执行 `pnpm install` 成功
- 根目录执行 `pnpm build` 成功
- 根目录执行 `pnpm typecheck` 成功
- `pnpm --filter @toonflow/api dev` 可以启动 API 服务
- 访问 `GET /health` 获得统一成功响应
- `apps/web`、`apps/review-console`、`apps/mcp-server`、`apps/electron` 都被 workspace 正确识别
- `apps/api -> packages/kernel` 的依赖方向在代码、构建和类型层面全部生效

## 后续阶段接口

本设计为下一阶段预留稳定扩展点，但不提前实现：

- `packages/db`
- `packages/ai-providers`
- `packages/storage`
- `packages/services`
- `packages/agents`
- `packages/workflow`

这些包必须在后续阶段按 `architecture-overview.md` 的依赖方向逐步引入，而不是在 Phase 0 以空壳形式出现。

## 结论

Phase 0 的关键不是“把所有未来模块先建出来”，而是建立一个不会被后续推翻的工程骨架。为此，本设计选择：

- 目录一步对齐目标架构
- 实现只落在 `apps/api` 与 `packages/kernel`
- 不做旧逻辑兼容
- 不提前引入空抽象
- 用最小健康检查链路验证 monorepo、构建与共享内核已经真正连通

在此基础上，后续每个入口或基础包都可以直接落位，不需要再对顶层结构做二次重写。
