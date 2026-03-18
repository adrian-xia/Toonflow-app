# Toonflow

## Phase 0 Monorepo Skeleton

当前仓库已经切换为 Phase 0 的 monorepo 冷启动骨架，用来承接后续 Creator Console、Review Console、MCP Server 和 Electron 壳的分层演进。这个阶段是新项目初始化，不做旧单体迁移，也不保留兼容层。

目前真正可运行的只有两个包：

- `packages/kernel`：共享响应封装、错误模型和健康检查类型
- `apps/api`：最小 Express HTTP 壳，提供 `/health`

其余应用 `apps/web`、`apps/review-console`、`apps/mcp-server`、`apps/electron` 当前都只是正式占位包，供后续阶段逐步落地。

## 工具链

- `pnpm workspace`
- `turbo`
- `TypeScript project references`

根目录只负责 workspace 编排，不承载运行时业务代码。

## 快速开始

```bash
pnpm install
pnpm lint
pnpm build
pnpm typecheck
pnpm --filter @toonflow/kernel test
pnpm --filter @toonflow/api test
pnpm dev
```

默认启动 `@toonflow/api`，监听 `http://127.0.0.1:3001`。

```bash
curl http://127.0.0.1:3001/health
```

期望返回：

```json
{
  "ok": true,
  "data": {
    "status": "ok",
    "service": "api",
    "timestamp": "2026-03-19T12:00:00.000Z"
  }
}
```

## 目录结构

```text
.
├── apps/
│   ├── api/              # 当前唯一运行中的 HTTP 入口
│   ├── web/              # 占位包
│   ├── review-console/   # 占位包
│   ├── mcp-server/       # 占位包
│   └── electron/         # 占位包
├── packages/
│   └── kernel/           # 共享契约与纯函数内核
├── docs/
│   └── refactoring/
│       ├── architecture-overview.md
│       └── 00-monorepo-skeleton.md
├── pnpm-workspace.yaml
├── turbo.json
├── tsconfig.base.json
└── tsconfig.json
```

## Phase 0 约束

- 旧实现与新骨架冲突时，直接删除旧实现，不做兼容适配。
- 根 `tsconfig.json` 只引用真实可编译包：`packages/kernel` 与 `apps/api`。
- `packages/kernel` 保持无副作用、无 IO、无容器依赖。
- `apps/api` 只验证最小链路，不提前引入 services、db、workflow 等抽象。

## 参考文档

- 架构方向：`docs/refactoring/architecture-overview.md`
- 当前阶段说明：`docs/refactoring/00-monorepo-skeleton.md`
