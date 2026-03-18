# Phase 0: Monorepo Skeleton

## 定位

Phase 0 不是旧仓库迁移方案，而是 Toonflow 新项目的冷启动骨架。目标是先把 monorepo 编排、共享内核和最小 API 链路落地，为后续 `services`、`agents`、`workflow`、双控制台与 MCP 入口预留稳定边界。

本阶段直接遵循 [architecture-overview.md](./architecture-overview.md) 的总体方向，但只实现最小可运行子集，不讨论兼容迁移，不保留旧单体转发层。

## 已落地范围

### 1. 根目录变成纯协调层

根目录现在只承担三类职责：

- `pnpm-workspace.yaml`：声明 `apps/*` 与 `packages/*`
- `turbo.json`：编排 `build`、`dev`、`lint`、`typecheck`
- `tsconfig.json` / `tsconfig.base.json`：提供 project references 与公共 TS 基线

旧的根级运行时代码、旧前端目录和旧 Electron 构建脚本已经全部删除，不再兼容。

### 2. `packages/kernel` 作为共享内核

当前 `kernel` 只承载真正被多个包共享、且没有运行时副作用的基础契约：

- 响应 envelope：`ok` / `fail`
- 错误模型：`AppError`、`ErrorCode`、`normalizeError`
- 健康检查类型：`HealthPayload`

这个包必须保持纯净，不引入 IO、数据库、Web 框架或容器依赖。

### 3. `apps/api` 作为最小验证入口

`apps/api` 当前只实现：

- `createApp()` 应用壳
- `/health` 路由
- 错误处理中间件
- `node:test + supertest` 冒烟测试

它的职责仅仅是验证：

- workspace 依赖能否通过包名消费 `@toonflow/kernel`
- TypeScript references 能否串起构建与类型检查
- 运行态能否返回统一的成功 envelope

本阶段明确不在 API 中预埋 service、repository、workflow、agent facade 等抽象。

### 4. 其余入口先做正式占位

以下包当前只保留 package manifest、tsconfig 与 no-op scripts：

- `apps/web`
- `apps/review-console`
- `apps/mcp-server`
- `apps/electron`

它们存在的意义是固定 workspace 边界和命名，不代表这些入口已经具备运行能力。

## 当前结构

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
├── docs/refactoring/
├── pnpm-workspace.yaml
├── turbo.json
├── tsconfig.base.json
└── tsconfig.json
```

## Phase 0 关键决策

- 工具链固定为 `pnpm workspace + turbo + TypeScript project references`
- 根 `tsconfig.json` 只引用 `packages/kernel` 和 `apps/api`
- 旧实现一旦与新骨架冲突，直接删除，不做兼容层
- 运行态验证只覆盖 `apps/api` 与 `packages/kernel`
- 其他 app 先占位，避免在骨架阶段扩 scope

## 验证基线

Phase 0 结束前至少要能完成以下验证：

```bash
pnpm lint
pnpm build
pnpm typecheck
pnpm --filter @toonflow/kernel test
pnpm --filter @toonflow/api test
pnpm dev
curl http://127.0.0.1:3001/health
```

健康检查必须返回来自 `kernel` 的统一 success envelope，且 `service` 固定为 `"api"`。

## 后续阶段衔接

后续阶段会继续向架构概览中的目标形态推进，包括 `db`、`ai-providers`、`services`、`agents`、`workflow` 以及多入口应用层，但这些都不属于 Phase 0 的实现范围。
