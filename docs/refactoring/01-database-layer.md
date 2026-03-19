# Phase 1: 数据库层落地 (`@toonflow/db`)

## 目标

建立独立的数据库包 `packages/db`，让数据库连接、schema、migration、类型生成和 repository 都从入口层中抽离出来。

本阶段基于 Phase 0 的新 monorepo 骨架直接建设，不保留旧全局工具对象或兼容入口。

---

## 范围

- `packages/db/src/client.ts`：连接工厂与生命周期管理
- `packages/db/src/migrations/`：数据库迁移
- `packages/db/src/schema/`：表结构定义
- `packages/db/src/types/`：自动生成的数据库类型
- `packages/db/src/repositories/`：纯数据访问层

推荐目录：

```text
packages/db/
├── src/
│   ├── index.ts
│   ├── client.ts
│   ├── migrations/
│   ├── schema/
│   ├── types/
│   └── repositories/
├── package.json
└── tsconfig.json
```

---

## 设计要求

### 1. 明确连接边界

- 连接配置来自环境变量或上层配置对象
- `packages/db` 只暴露连接工厂与 repository，不在导入时自动连接
- migration 和类型生成通过独立脚本执行，不绑在应用启动时

### 2. Repository 只做数据访问

- 不承载业务规则
- 不做 HTTP / DTO 转换
- 不依赖 Express、WebSocket 或 MCP

### 3. 类型生成独立运行

- 数据库类型生成不依赖 `pnpm dev`
- CI 和本地都应能显式执行 codegen

---

## 集成方式

`@toonflow/db` 由后端实现包通过显式导入接入，优先在 `packages/services` 聚合；`apps/api` 通过 `services / agents / workflow` 组合能力，不直接依赖 repository：

```ts
import { createDbClient } from "@toonflow/db";

const db = createDbClient({
  host: process.env.DB_HOST!,
  port: Number(process.env.DB_PORT!),
  user: process.env.DB_USER!,
  password: process.env.DB_PASSWORD!,
  database: process.env.DB_NAME!
});
```

不再提供 `u.db()`、全局单例或兼容转发层。

---

## 验证标准

- `packages/db` 能独立通过 `build`、`lint`、`typecheck`
- migration 可显式执行并成功
- repository 具备直接测试覆盖
- 上层包通过显式依赖接入，不需要全局工具对象

---

## 风险与注意事项

- 连接池配置需要考虑 API、Agent 与 MCP 并发场景
- migration 顺序与回滚策略必须可重复执行
- repository API 要保持稳定，避免把 SQL 细节泄漏到服务层
