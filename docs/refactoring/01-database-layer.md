# Phase 1: 数据库层落地 (`@toonflow/db`)

## 定位

Phase 1 是 Phase 0 monorepo skeleton 之后的第一个基础设施包。它的目标不是把 Toonflow 的业务数据域一次性铺满，而是先把数据库能力从入口层抽离出来，形成一个可独立构建、迁移、测试和复用的 `packages/db`。

这一步直接对齐 [`architecture-overview.md`](./architecture-overview.md) 中的目标目录结构与依赖方向：

- `@toonflow/db` 是共享基础设施包，不是 `apps/api` 的私有工具层
- 它位于 `packages/services` 之下，为后续 `services / agents / workflow` 提供稳定的数据访问边界
- Phase 1 仍然基于新 monorepo 骨架推进，不恢复旧单体的全局工具对象、兼容路由或旧目录结构

本文件只说明 Phase 1 的阶段目标、范围和验收口径。详细设计见 [`01-database-layer-spec.md`](./01-database-layer-spec.md)。

---

## 目标

- 建立独立的数据库包 `packages/db`
- 锁定基础设施技术栈为 `PostgreSQL + Knex`
- 明确数据库连接、migration、schema、类型生成和 repository 的职责边界
- 为后续 `packages/services` 提供稳定的数据访问基础，而不是让入口层直接长期依赖 SQL 细节
- 让数据库层可以独立通过 `build`、`lint`、`typecheck` 和 repository 测试

---

## 范围

Phase 1 只覆盖数据库基础设施本身，不覆盖完整业务建模。落地范围包括：

- `packages/db` package skeleton
- 连接配置解析与 `DbClient` 生命周期管理
- Knex 基础配置与 PostgreSQL 驱动接入
- migration 目录、命名规则和显式执行命令
- schema 组织约定与通用列 helper
- 数据库类型生成流程与输出目录
- repository 设计规范与至少一组示例 repository
- 面向真实 PostgreSQL 的 repository 集成测试基线
- 面向后续 `services` 的显式接入方式说明

建议目录如下：

```text
packages/db/
├── src/
│   ├── index.ts
│   ├── config/
│   ├── client/
│   ├── migrations/
│   ├── schema/
│   ├── repositories/
│   ├── types/
│   └── test-utils/
├── knexfile.ts
├── scripts/
├── package.json
└── tsconfig.json
```

---

## 非目标

Phase 1 明确不做以下事情：

- 不在这一阶段铺开完整业务表设计
- 不把业务规则、权限判断、状态流转或 DTO 转换塞进 repository
- 不在应用启动时自动执行 migration 或类型生成
- 不引入 `u.db()`、全局单例、兼容转发层或根级共享运行时
- 不为了数据库层提前实现 `services`、`agents` 或 `workflow`
- 不把 `apps/api` 对 repository 的直接使用固化成长期架构模式

---

## 关键决策

### 1. 技术栈锁定为 `PostgreSQL + Knex`

Phase 1 不再保留 ORM / Query Builder 的开放选择。数据库连接、migration 与查询访问统一围绕 PostgreSQL 和 Knex 设计，避免 Phase 1 文档停留在抽象层。

### 2. 连接必须显式创建和显式释放

- `packages/db` 不在 import 时自动连接数据库
- 连接配置来自显式的配置对象或边缘配置解析函数
- 长生命周期进程在启动时创建连接、退出时关闭连接
- migration、codegen 和测试脚本自行创建和释放短生命周期连接

### 3. migration 与 codegen 必须通过独立命令运行

- 不依赖 `pnpm dev`
- 不耦合到 `apps/api` 启动过程
- CI 和本地都必须显式执行并得到一致结果
- 统一以 `pnpm --filter @toonflow/db <script>` 的 package 级脚本作为调用入口

### 4. Repository 只做数据访问

- 负责查询、插入、更新、删除
- 不承载 HTTP、MCP、WebSocket 或业务编排逻辑
- “查不到” 与 “数据库异常” 需要清晰区分

### 5. 长期依赖方向仍然以 `services` 聚合为准

根据 [`architecture-overview.md`](./architecture-overview.md)，长期目标仍然是由 `packages/services` 聚合 `@toonflow/db`。如果 Phase 1 为了验证链路需要从脚本或 `apps/api` 做最小接入，这只能视为临时验证，不应成为未来包依赖的范式。

---

## 集成方式

`@toonflow/db` 对上暴露的应是稳定的数据库基础设施入口，而不是一组散落的内部工具：

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

约束：

- 上层通过显式导入接入 `@toonflow/db`
- repository 的事务协调优先由未来 `packages/services` 负责
- schema helper、底层 Knex 配置和内部脚本不应成为默认公共 API

---

## 交付物

Phase 1 完成时至少应交付：

- `packages/db` package 及其 `package.json` / `tsconfig.json`
- 统一的配置模型与 client 生命周期实现
- Knex migration 基线与显式脚本入口
- schema helper 与命名约定
- 类型生成脚本与输出目录
- 至少一组示例 repository 与配套集成测试
- 一套仓库内可复现的 PostgreSQL 测试环境约定，默认采用 `docker compose`
- 与本文件配套的详细设计文档 [`01-database-layer-spec.md`](./01-database-layer-spec.md)

---

## 验收标准

- `packages/db` 能独立通过 `build`、`lint`、`typecheck`
- PostgreSQL + Knex 配置路径清晰且无需全局工具对象
- migration 可通过显式命令执行并验证回滚路径
- 类型生成可通过显式命令执行，且不依赖 `pnpm dev`
- package 级数据库脚本具备统一入口，默认通过 `pnpm --filter @toonflow/db ...` 调用
- repository 具备直接测试覆盖，测试目标为真实 PostgreSQL
- 本地与 CI 共享同一套可复现的 PostgreSQL 测试环境，默认采用仓库内 `docker compose` 约定
- 上层包通过显式依赖接入，不需要 `u.db()` 或兼容转发层
- 文档层级清晰：本文件负责 Phase 说明，详细实现约束集中在 [`01-database-layer-spec.md`](./01-database-layer-spec.md)

---

## 风险与注意事项

- 连接池参数需要兼顾未来 API、Agent 与 MCP 的并发模型
- migration 必须保持可重复执行，避免“大而全”的不可回滚变更
- repository API 需要稳定，避免把 SQL 细节泄漏给未来 `services`
- 类型生成流程要避免要求下游包在日常 `build` 时强依赖活跃数据库
- 数据库层的验证要聚焦基础设施本身，不要提前把完整业务数据域绑进 Phase 1
