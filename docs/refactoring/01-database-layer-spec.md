# `@toonflow/db` 详细设计说明

## 1. 文档目的

本文档是 [`01-database-layer.md`](./01-database-layer.md) 的详细设计补充，用于约束 Phase 1 中 `packages/db` 的包边界、目录组织、运行方式和验收标准。它服务于后续 implementation plan，不承担旧单体迁移说明的职责。

相关文档：

- 架构总览：[`architecture-overview.md`](./architecture-overview.md)
- Phase 0 基线：[`00-monorepo-skeleton.md`](./00-monorepo-skeleton.md)
- Phase 1 阶段说明：[`01-database-layer.md`](./01-database-layer.md)

---

## 2. 设计目标

- 让数据库能力成为可独立复用的 monorepo package，而不是入口层私有实现
- 固化 `PostgreSQL + Knex` 的基础设施组合，减少 Phase 1 设计摇摆
- 收紧数据库边界，只暴露稳定的 client 与 repository 访问入口
- 让 migration、类型生成、repository 测试都能通过显式命令独立运行
- 为未来 `packages/services` 提供稳定事务边界和数据访问约束

---

## 3. 非目标

- 不在本阶段设计完整业务数据模型
- 不在 repository 中引入领域规则、权限判断或 API 响应格式
- 不把数据库错误在 Phase 1 扩展成跨包完整错误体系
- 不要求 `apps/api` 在本阶段就成为正式数据库消费方
- 不实现 ORM 风格实体模型、通用 `BaseRepository` 或自动代码脚手架体系

---

## 4. 包边界与依赖规则

### 4.1 `@toonflow/db` 的职责

`@toonflow/db` 只负责以下内容：

- 数据库配置解析与标准化
- Knex 客户端创建、连接池配置与销毁
- migration 组织与执行入口
- schema helper 与命名约定
- 数据库类型生成与生成结果存放
- repository 实现与 repository 测试辅助

它不负责：

- 业务服务编排
- HTTP / Express / MCP / SSE / WebSocket 适配
- AI provider、文件存储、工作流状态管理
- 导入即连接的运行时副作用

### 4.2 允许的依赖

`@toonflow/db` 可以依赖：

- `pg`
- `knex`
- `@toonflow/kernel`，但仅限真正跨包共享的纯类型或错误码

`@toonflow/db` 不可以依赖：

- `apps/*`
- `packages/services`
- `packages/agents`
- `packages/workflow`
- Express、MCP SDK、前端框架

### 4.3 上层依赖方向

长期目标仍然遵循架构概览：

```text
kernel -> db -> services -> agents -> workflow -> apps/*
```

Phase 1 如果需要最小链路验证，可以由脚本或临时接入点显式使用 `@toonflow/db`，但文档和计划都应明确这是阶段性验证，而不是长期依赖方向。

---

## 5. 建议目录结构

```text
packages/db/
├── src/
│   ├── index.ts
│   ├── config/
│   │   ├── db-config.ts
│   │   └── read-db-config.ts
│   ├── client/
│   │   ├── create-db-client.ts
│   │   ├── knex-config.ts
│   │   └── types.ts
│   ├── migrations/
│   ├── schema/
│   │   ├── common/
│   │   └── tables/
│   ├── repositories/
│   │   ├── index.ts
│   │   └── <example-repository>.ts
│   ├── types/
│   │   ├── generated.ts
│   │   └── index.ts
│   └── test-utils/
│       └── database.ts
├── scripts/
│   ├── migrate.ts
│   ├── rollback.ts
│   └── generate-db-types.ts
├── docker-compose.test.yml
├── knexfile.ts
├── package.json
└── tsconfig.json
```

目录约束：

- `config/` 只处理配置对象，不直接承载业务逻辑
- `client/` 只处理 Knex 和连接生命周期
- `schema/` 只放表结构约定和通用字段 helper
- `migrations/` 只放 migration 文件，不混入 seed 或业务初始化
- `repositories/` 聚焦数据访问实现
- `types/generated.ts` 视为生成文件，不手工编辑
- `test-utils/` 统一承载数据库测试准备与清理逻辑

---

## 6. 公共 API 设计

`@toonflow/db` 的公共 API 应保持克制，优先暴露以下稳定入口：

- `createDbClient(config)`
- `closeDbClient(client)` 或 `client.destroy()`
- `DbConfig`
- `DbClient`
- `DbExecutor`
- 已实现 repository 的稳定工厂，形如 `createXRepository(executor: DbExecutor)`

不应默认暴露：

- 全部 schema helper
- 任意内部 Knex config 拼装细节
- 供上层随意拼接 SQL 的杂项工具

公共 API 的目标是收紧数据库边界，而不是把整个内部目录树直接透传给上层。

---

## 7. 配置模型

### 7.1 配置来源

运行时真实输入是结构化 `DbConfig`，而不是隐式读取 `process.env`。`process.env` 只允许在边缘配置解析函数中出现，例如 `readDbConfig(env)`。

这样可以保证：

- `apps/api`、测试脚本、migration、codegen 共用同一套配置规则
- `packages/db` 本身不依赖进程级全局状态
- 测试可以直接构造显式配置对象

Phase 1 固定采用“环境变量 -> `readDbConfig` -> `DbConfig`”的配置输入路径：

- runtime、`db:migrate`、`db:rollback`、`db:types` 都通过 `readDbConfig(process.env, { prefix: "DB" })` 读取配置
- Phase 1 不引入 CLI 参数覆盖、YAML/JSON 配置文件或多套并行配置源
- 测试环境单独使用 `readDbConfig(process.env, { prefix: "TEST_DB" })`

非测试环境变量契约如下：

| 变量名 | 含义 | 是否必填 | 默认值 |
|--------|------|----------|--------|
| `DB_HOST` | 数据库主机 | 是 | 无 |
| `DB_PORT` | 数据库端口 | 否 | `5432` |
| `DB_USER` | 数据库用户名 | 是 | 无 |
| `DB_PASSWORD` | 数据库密码 | 是 | 无 |
| `DB_NAME` | 数据库名 | 是 | 无 |
| `DB_SCHEMA` | 目标 schema | 是 | 无 |
| `DB_SSL` | 是否启用 SSL | 否 | `false` |
| `DB_POOL_MIN` | 连接池最小连接数 | 否 | `0` |
| `DB_POOL_MAX` | 连接池最大连接数 | 否 | `10` |
| `DB_POOL_IDLE_TIMEOUT_MS` | 空闲连接超时 | 否 | `30000` |
| `DB_POOL_ACQUIRE_TIMEOUT_MS` | 获取连接超时 | 否 | `60000` |

### 7.2 `DbConfig` 最小字段

`DbConfig` 至少应包含：

- `host`
- `port`
- `user`
- `password`
- `database`
- `schema`
- `ssl`
- `pool`

其中 `pool` 至少应支持：

- `min`
- `max`
- `idleTimeoutMillis`
- `acquireTimeoutMillis`

Phase 1 不要求把所有 PostgreSQL 连接选项暴露为公共配置，但上述字段需要足以支撑本地、CI 和未来长生命周期进程。

`DbConfig` 的推荐 TypeScript 形状如下：

```ts
export interface DbConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
  schema: string;
  ssl: boolean;
  pool: {
    min: number;
    max: number;
    idleTimeoutMillis: number;
    acquireTimeoutMillis: number;
  };
}
```

`schema` 在 Phase 1 中是必填字段，不默认回退到 `public`。后续各环节都必须围绕同一个 schema 工作：

- Knex runtime 使用该 schema 作为 `searchPath`
- migration 元数据表通过 `migrations.schemaName = config.schema` 写入同一 schema
- 类型生成只 introspect 该 schema

---

## 8. 连接与生命周期

### 8.1 创建与释放原则

- `@toonflow/db` 在 import 时绝不建立连接
- `createDbClient(config)` 负责创建 Knex 实例与包级客户端对象
- 长生命周期进程在启动阶段创建一个进程级 `DbClient`
- 长生命周期进程在退出阶段显式调用 `destroy`
- migration、codegen 和测试脚本各自创建短生命周期 `DbClient`，任务结束后立即销毁

### 8.2 `DbClient` 最小能力

`DbClient` 至少应提供：

- `executor: Knex`
- 访问底层 Knex executor 的能力，供 repository 使用
- `destroy()` 或等价关闭方法
- `transaction<T>(fn: (trx: DbExecutor) => Promise<T>)`
- 可选 `ping()` / `healthcheck()`，用于后续启动校验与健康探测

`transaction` 的行为契约需要固定为：

- 回调成功返回时自动 `commit`
- 回调抛出任何错误时自动 `rollback`
- `transaction` 不吞掉错误，回调抛出的错误原样向上抛出
- Phase 1 不引入显式 `abort()` API；调用方如果需要主动回滚，直接在回调中抛错

### 8.3 事务边界

事务协调不应由 `apps/api` 直接承担。推荐模式是：

- `DbClient` 提供事务入口
- 导出显式类型别名 `DbExecutor = Knex | Knex.Transaction`
- repository 通过工厂函数绑定 executor，而不是在每个方法上传入 executor
- 典型使用方式是 `createProjectRepository(db.executor)` 或在事务内 `createProjectRepository(trx)`
- 未来由 `packages/services` 统一编排多 repository 写操作

这样可以在 Phase 1 先把事务能力准备好，而不把业务编排提前塞进数据库包。

---

## 9. Knex 配置与脚本边界

### 9.1 单一配置构建点

Knex runtime、migration 和 codegen 必须共享同一套配置构建逻辑，避免每个脚本自行拼接数据库参数。

推荐做法：

- 在 `client/knex-config.ts` 中定义统一的 Knex config 构建函数
- 运行时 `createDbClient` 与所有脚本都复用同一构建函数
- `knexfile.ts` 只作为本地调试和 CLI 兼容桥接文件，不是仓库脚本的 canonical 执行入口
- `buildKnexConfig` 需要显式设置目标 schema 的 `searchPath`，避免 runtime、migration 与 typegen 落到不同 schema

### 9.2 运行时形态

Phase 1 的数据库脚本统一采用“TypeScript 源码直接执行”的模式：

- `packages/db` 继续遵循当前仓库的 CommonJS 输出约定
- migration、rollback、codegen 脚本通过 `tsx` 执行 `scripts/*.ts`
- migration 文件位于 `src/migrations/`，由脚本通过 Knex programmatic API 直接加载 TypeScript 源文件
- CI 和本地都不依赖先把 `packages/db` 编译到 `dist/` 再执行 migration

这样可以避免把“Knex CLI 如何加载 TS migration”变成额外变量，也能保持脚本与运行时共享同一套配置构建逻辑。

### 9.3 脚本边界

数据库脚本必须是显式命令，不与应用启动过程耦合。Phase 1 计划中的命令至少包括：

- `pnpm --filter @toonflow/db db:migrate`
- `pnpm --filter @toonflow/db db:rollback`
- `pnpm --filter @toonflow/db db:types`

这些命令的职责分别是：

- `db:migrate`：执行最新 migration
- `db:rollback`：只回滚最近一个 migration batch
- `db:types`：基于当前 schema 刷新生成类型

这些脚本的归属为 `packages/db/package.json`，根目录只负责通过 workspace script 透传调用，不复制第二套数据库脚本入口。

`db:rollback` 的语义需要固定为：

- 只作用于当前目标数据库中的最新 batch
- 前置条件是该数据库已经通过 `db:migrate` 到达一个已知 batch 边界
- migration 集成测试和 CI 中的标准验证序列为：`db:migrate` -> `db:rollback` -> `db:migrate`
- Phase 1 不引入“回滚到任意版本”或“全量 reset”这类额外脚本语义

不应出现：

- 应用启动自动迁移
- `pnpm dev` 隐式触发 codegen
- 各脚本拥有不同的数据库配置规则

---

## 10. Migration 约定

### 10.1 组织原则

- migration 文件放在 `src/migrations/`
- 每个 migration 只处理单一、可解释的 schema 变更
- 不把业务数据修复、seed、环境初始化混进 migration
- 回滚必须可定义且可验证

### 10.2 命名与粒度

推荐使用时间戳前缀命名，例如：

```text
20260326153000_create_projects_table.ts
```

粒度要求：

- 一个 migration 只覆盖一组强相关变更
- 避免“大爆炸”式 migration
- 修改通用列约定时，也要保持回滚路径清晰

### 10.3 Phase 1 的建模边界

由于本阶段是“基础设施优先”，migration 不应提前铺满未来业务表。Phase 1 只需要：

- 建立数据库工具链本身所需结构
- 引入一组窄范围、可验证 repository 设计的代表性表

推荐把“代表性表”控制为单一根实体，优先选择 `projects` 这类后续一定存在、但关系最少的聚合根，以验证建表、CRUD、约束和事务路径，而不是在 Phase 1 引入整组下游关联表。

---

## 11. Schema 组织约定

`schema/` 用来定义数据库结构约定，而不是上层业务逻辑。

约束如下：

- 表名、列名统一 `snake_case`
- 主键命名统一为 `id`
- 外键命名统一为 `<entity>_id`
- 通用时间戳统一为 `created_at` / `updated_at`
- 通用列与通用约束通过 helper 复用，不在每个 migration 中手写重复模板

推荐把 schema helper 分成两类：

- `common/`：时间戳、主键、审计字段等共用 helper
- `tables/`：按表粒度组织的 schema 片段或辅助定义

这里的 helper 只服务于 migration 与类型一致性，不作为面向上层的领域模型抽象。

---

## 12. 类型生成策略

### 12.1 运行方式

数据库类型生成必须通过独立命令执行，不依赖 `pnpm dev` 或应用启动。Phase 1 采用“数据库 introspection + 受版本控制的生成文件”模式：

- `scripts/generate-db-types.ts` 在 migration 执行完成后连接目标 PostgreSQL
- 通过 `information_schema` 与 `pg_catalog` 读取当前 schema 元数据
- 基于实际数据库结构生成 `src/types/generated.ts`
- Phase 1 不从 migration AST 推导类型，也不以 SQL 字符串解析作为生成来源

执行顺序固定为：

1. 执行 migration
2. 运行 `db:types`
3. 再进行 `build` / `typecheck`

### 12.2 输出约定

- 生成结果固定输出到 `src/types/generated.ts`
- 手写补充类型放在其他文件中，例如 `src/types/index.ts`
- 生成文件不手工编辑

`generated.ts` 在 Phase 1 中至少需要为每张表生成 3 组类型：

- `<TableName>Row`：查询结果行类型，反映数据库真实 nullability、enum 和默认列展开后的形态
- `<TableName>Insert`：插入输入类型，允许省略数据库默认值列与可空列以外的非必填列
- `<TableName>Update`：更新输入类型，为可更新列的 `Partial` 结构，不包含主键等只读列

命名约束：

- 表名 `projects` 生成 `ProjectRow`、`ProjectInsert`、`ProjectUpdate`
- 数据库 `snake_case` 列名在生成类型中保持 `snake_case`
- PostgreSQL enum 映射为 TypeScript string union
- 数据库 nullable 列映射为 `T | null`
- 有数据库默认值且允许由数据库填充的列，在 `Insert` 类型中是可选字段

最小示例：

```ts
export interface ProjectRow {
  id: string;
  title: string;
  description: string | null;
  status: "draft" | "archived";
  created_at: string;
  updated_at: string;
}

export interface ProjectInsert {
  id?: string;
  title: string;
  description?: string | null;
  status?: "draft" | "archived";
}

export interface ProjectUpdate {
  title?: string;
  description?: string | null;
  status?: "draft" | "archived";
}
```

repository 在 Phase 1 中应优先直接消费这些生成类型，而不是再定义一套重复的手写数据库行类型。

关键 PostgreSQL 类型映射规则固定如下：

| PostgreSQL 类型 | TypeScript 类型 | 说明 |
|----------------|-----------------|------|
| `uuid` | `string` | 保持字符串形式 |
| `text` / `varchar` / `citext` | `string` | 文本列统一映射为字符串 |
| `boolean` | `boolean` | 布尔值 |
| `smallint` / `integer` | `number` | 32 位以内整数 |
| `bigint` | `string` | 避免超过 JS 安全整数范围 |
| `numeric` / `decimal` | `string` | 避免精度丢失 |
| `real` / `double precision` | `number` | 浮点数 |
| `date` / `timestamp` / `timestamptz` | `string` | 统一保留为字符串，避免运行时时区与序列化差异 |
| `json` / `jsonb` | `JsonValue` | 在 `generated.ts` 中提供共享 `JsonValue` 类型别名 |
| PostgreSQL enum | string union | 基于 enum label 生成 |

时间类型在 Phase 1 中统一生成为 `string`，不生成 `Date`。这样 repository、测试和上层序列化都围绕同一稳定表示工作，避免不同运行环境对时区和 `Date` 实例的隐式行为差异。

### 12.3 版本控制策略

生成出的类型文件应提交到仓库。原因是：

- 下游 TypeScript 包不应为了日常 `build` / `typecheck` 强依赖活跃数据库
- clean checkout 后的开发环境应能先阅读和编译 package，再按需刷新 codegen
- migration 变更与类型变更可以在同一提交中被清晰 review

这意味着类型生成仍然是显式命令，但其产物是受版本控制的源文件，而不是临时构建输出。

---

## 13. Repository 设计规范

### 13.1 角色边界

repository 只负责数据访问：

- 查询
- 插入
- 更新
- 删除
- 面向持久化模型的简单筛选与排序

repository 不负责：

- HTTP request/response 转换
- 鉴权
- 领域状态机
- AI 调用
- 工作流编排

### 13.2 API 风格

推荐每个 repository 提供清晰、有限的方法集，例如：

- `getById`
- `listByFilter`
- `insert`
- `updateById`
- `deleteById`

“查不到”应返回 `null` 或空集合，数据库异常则抛出错误。不要把 “未命中结果” 伪装成异常控制流。

Phase 1 固定采用“factory 绑定 executor”的使用方式，而不是“每个 repository 方法额外接收 executor 参数”。例如：

```ts
const projectRepository = createProjectRepository(db.executor);

await db.transaction(async (trx) => {
  const transactionalProjectRepository = createProjectRepository(trx);
  await transactionalProjectRepository.insert(input);
});
```

### 13.3 聚合粒度

- 一个 repository 负责一个聚合根，或一组强相关表
- 不构建一个横跨全域的大型 repository
- 不在 Phase 1 引入通用 `BaseRepository`

### 13.4 示例 repository

Phase 1 至少应有一组示例 repository 和测试，用来证明目录结构、事务入口和类型边界可行。示例优先选择单一根实体表，而不是跨多个下游子表的复杂聚合。

---

## 14. 测试策略

### 14.1 测试层次

Phase 1 的测试分为三层：

- 配置与 client 单测
- migration 集成测试
- repository 集成测试

### 14.2 配置与 client 单测

验证内容包括：

- 必填配置缺失时的失败路径
- 默认值与标准化结果
- client 创建与销毁逻辑

### 14.3 Migration 集成测试

验证内容包括：

- `up` 能成功执行
- `rollback` 能成功执行
- migration 顺序可重复运行

这里必须针对真实 PostgreSQL 执行，而不是 mock Knex。

### 14.4 Repository 集成测试

验证内容包括：

- CRUD 正常路径
- 唯一约束或外键约束失败路径
- 空结果路径
- 事务场景

测试实现要求：

- 使用共享 `test-utils/` 完成数据库准备与清理
- 不允许每个测试文件自行复制一套清理脚本
- 仓库需要提供 `docker-compose.test.yml` 作为默认、受支持的测试数据库入口，镜像版本固定为 `postgres:16`
- `docker-compose.test.yml` 默认暴露 `${TEST_DB_PORT:-55432}`，避免占用本机常见的 `5432`
- 共享测试配置通过一组明确的 `TEST_DB_*` 环境变量发现连接信息，并映射到 `DbConfig`
- CI 与本地默认共用这套 `docker compose` 定义，保证测试步骤一致
- 每次 `pnpm --filter @toonflow/db test` 只针对一个专用测试数据库和单一 schema 执行
- Phase 1 的数据库集成测试按串行方式运行，并通过 `test-utils/` 在用例间清理状态，而不是依赖并发共享写入
- 开发者可以自行切换到本地 PostgreSQL 实例，但那只是便利路径，不是文档承诺的标准验证环境

测试环境变量契约如下：

| 变量名 | 含义 | 是否必填 | 默认值 |
|--------|------|----------|--------|
| `TEST_DB_HOST` | 测试数据库主机 | 否 | `127.0.0.1` |
| `TEST_DB_PORT` | 测试数据库端口 | 否 | `55432` |
| `TEST_DB_USER` | 测试数据库用户名 | 否 | `postgres` |
| `TEST_DB_PASSWORD` | 测试数据库密码 | 否 | `postgres` |
| `TEST_DB_NAME` | 测试数据库名 | 否 | `toonflow_db_test` |
| `TEST_DB_SCHEMA` | 测试 schema 名称 | 否 | `toonflow_test` |
| `TEST_DB_SSL` | 是否启用 SSL | 否 | `false` |

责任边界固定为：

- `pnpm --filter @toonflow/db test` 假定测试数据库已经就绪，不负责自动拉起或关闭 `docker compose`
- 仓库需要额外提供显式的测试数据库脚本，例如 `db:test:up` / `db:test:down`，专门负责 `docker compose` 生命周期
- CI 的标准顺序是：`db:test:up` -> `db:migrate` -> `test` -> `db:test:down`
- 本地开发沿用同一顺序，只是允许开发者手动保留测试数据库进程以加快重复运行

---

## 15. 实施顺序建议

实现计划应按以下顺序拆解：

1. 创建 `packages/db` package skeleton 与 TypeScript 基线
2. 定义 `DbConfig`、配置解析函数和 `DbClient`
3. 建立共享 Knex config 与 `knexfile.ts`
4. 打通 migration 命令与最小代表性表
5. 打通类型生成命令与 `src/types/generated.ts`
6. 实现示例 repository 与事务入口
7. 建立 repository 集成测试与测试辅助
8. 追加 package 级 `build`、`lint`、`typecheck`、`test` 验证

这个顺序先验证工具链，再验证 repository，避免先写大量数据访问代码、后补迁移和测试。

---

## 16. Phase 1 完成定义

当以下条件全部满足时，Phase 1 才算完成：

- `packages/db` 已作为独立 workspace package 落地
- `PostgreSQL + Knex` 配置与连接生命周期路径明确
- migration 和 rollback 能通过显式命令运行
- 类型生成能通过显式命令运行，且生成文件纳入版本控制
- 至少一组示例 repository 已通过真实 PostgreSQL 集成测试验证
- 上层接入方式保持显式依赖，不出现全局单例或兼容转发层
- 文档层次清晰：阶段说明与详细设计各司其职
