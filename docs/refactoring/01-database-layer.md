# Phase 1: 数据库层提取 (@toonflow/db)

## 目标

数据访问与业务逻辑分离。

---

## 当前状态

### 数据库连接 (src/utils/db.ts)

- 使用 PostgreSQL (Knex, pg client)
- 环境变量配置：`DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`
- `ensureDatabase()` 自动创建数据库
- 导出 `dbClient` 函数：`dbClient<TableName>(table)` 返回类型化的 Knex 查询构建器
- 开发模式自动生成 `src/types/database.d.ts`（通过 @rmp135/sql-ts）

### 数据库 Schema (src/lib/initDB.ts)

15 张表：

| 表名 | 说明 |
|------|------|
| `t_user` | 用户认证 |
| `t_assets` | 角色、道具、场景及其图像 |
| `t_chatHistory` | 对话历史 |
| `t_novel` | 小说章节和内容 |
| `t_outline` | 故事大纲和事件 |
| `t_storyline` | 角色故事线 |
| `t_project` | 顶层项目 |
| `t_script` | 生成的剧本 |
| `t_setting` | 系统设置 |
| `t_video` | 生成的视频片段 |
| `t_taskList` | 任务队列 |
| `t_image` | 图像资源 |
| `t_config` | AI 模型配置 |
| `t_videoConfig` | 视频配置 |
| `t_aiModelMap` | AI 模型映射 |
| `t_prompts` | 提示词模板 |

### 当前问题

- SQL 查询散落在 82 个路由文件和 2 个 Agent 类中
- 所有文件通过 `u.db("table_name")` 直接写 SQL
- 无事务管理
- 无查询复用

---

## 1.1 Knex 初始化提取

### 从 src/utils/db.ts 提取到 packages/db/src/client.ts

```typescript
// packages/db/src/client.ts
import knex, { Knex } from "knex";
import type { DB } from "./types";

type TableName = keyof DB & string;
type RowType<TName extends TableName> = DB[TName];

export function createDbClient(config: {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
}) {
  const connectionString = `postgresql://${config.user}:${config.password}@${config.host}:${config.port}/${config.database}`;

  const db = knex({
    client: "pg",
    connection: connectionString,
    useNullAsDefault: true,
  });

  const dbClient = Object.assign(
    <TName extends TableName>(table: TName) => db<RowType<TName>, RowType<TName>[]>(table),
    db
  );
  dbClient.schema = db.schema;

  return { db, dbClient };
}

export async function ensureDatabase(config: { ... }) { ... }
```

### 从 src/lib/initDB.ts 提取到 packages/db/src/schema.ts

- 移入完整的 TableSchema 定义和初始化逻辑
- 移入 `fixDB` 逻辑

### 类型生成

- 移入 `initKnexType()` 到 `packages/db/src/codegen.ts`
- 生成的 `database.d.ts` 放在 `packages/db/src/types/`

---

## 1.2 Repository 模式

为核心表创建 Repository，封装当前散落在路由和 Agent 中的 SQL 查询。

### Repository 清单

#### ProjectRepo

来源：`src/routes/project/*.ts`（6 个文件）

```typescript
// packages/db/src/repositories/project.ts
export class ProjectRepo {
  constructor(private db: DbClient) {}

  async create(data: Omit<DB['t_project'], 'id'>): Promise<number>
  async get(id: number): Promise<DB['t_project'] | undefined>
  async list(userId?: number): Promise<DB['t_project'][]>
  async update(id: number, data: Partial<DB['t_project']>): Promise<void>
  async delete(id: number): Promise<void>
  async getCount(userId?: number): Promise<number>
}
```

#### NovelRepo

来源：`src/routes/novel/*.ts`（4 个文件）

```typescript
export class NovelRepo {
  async add(data: Omit<DB['t_novel'], 'id'>): Promise<number>
  async get(projectId: number): Promise<DB['t_novel'][]>
  async getByChapterIndex(projectId: number, chapterIndex: number): Promise<DB['t_novel'] | undefined>
  async update(id: number, data: Partial<DB['t_novel']>): Promise<void>
  async delete(id: number): Promise<void>
}
```

#### OutlineRepo

来源：`src/agents/outlineScript/index.ts:167-259`

```typescript
export class OutlineRepo {
  async findByProject(projectId: number): Promise<DB['t_outline'][]>
  async findById(id: number, projectId: number): Promise<DB['t_outline'] | undefined>
  async getMaxEpisode(projectId: number): Promise<number>
  async insert(outlines: Array<{projectId: number; data: string; episode: number}>): Promise<void>
  async update(id: number, data: string): Promise<void>
  async delete(ids: number[]): Promise<void>
  async clearByProject(projectId: number): Promise<number>
}
```

#### StorylineRepo

来源：`src/agents/outlineScript/index.ts:145-163`

```typescript
export class StorylineRepo {
  async find(projectId: number): Promise<DB['t_storyline'] | undefined>
  async upsert(projectId: number, content: string): Promise<void>
  async delete(projectId: number): Promise<number>
}
```

#### ScriptRepo

来源：`src/routes/script/*.ts`

```typescript
export class ScriptRepo {
  async get(projectId: number): Promise<DB['t_script'][]>
  async getById(id: number): Promise<DB['t_script'] | undefined>
  async getByOutlineId(outlineId: number): Promise<DB['t_script'] | undefined>
  async insert(scripts: Array<Omit<DB['t_script'], 'id'>>): Promise<void>
  async update(id: number, content: string): Promise<void>
  async deleteByOutlineIds(outlineIds: number[]): Promise<void>
}
```

#### StoryboardRepo

来源：`src/routes/storyboard/*.ts`

```typescript
export class StoryboardRepo {
  async get(scriptId: number): Promise<any[]>
  async save(data: any): Promise<void>
  async delete(id: number): Promise<void>
  async update(id: number, data: any): Promise<void>
}
```

#### AssetsRepo

来源：`src/agents/outlineScript/index.ts:322-396`

```typescript
export class AssetsRepo {
  async findByTypeAndName(projectId: number, type: string, name: string): Promise<DB['t_assets'] | undefined>
  async upsert(projectId: number, type: string, item: {name: string; description: string}): Promise<"inserted"|"updated"|"skipped">
  async getByProject(projectId: number): Promise<DB['t_assets'][]>
  async delete(id: number): Promise<void>
  async update(id: number, data: Partial<DB['t_assets']>): Promise<void>
}
```

#### VideoRepo

来源：`src/routes/video/*.ts`（13 个文件）

```typescript
export class VideoRepo {
  async add(data: Omit<DB['t_video'], 'id'>): Promise<number>
  async get(scriptId: number): Promise<DB['t_video'][]>
  async getById(id: number): Promise<DB['t_video'] | undefined>
  async updateState(id: number, state: number): Promise<void>
  async save(id: number, data: Partial<DB['t_video']>): Promise<void>
}
```

#### ConfigRepo

来源：`src/routes/setting/*.ts`（11 个文件）

```typescript
export class ConfigRepo {
  async getModelList(type?: string): Promise<DB['t_config'][]>
  async addModel(data: Omit<DB['t_config'], 'id'>): Promise<number>
  async updateModel(id: number, data: Partial<DB['t_config']>): Promise<void>
  async deleteModel(id: number): Promise<void>
  async getAiModelMap(key: string): Promise<any>
}
```

### 包结构

```
packages/db/
├── src/
│   ├── index.ts              # 统一导出
│   ├── client.ts             # Knex 初始化
│   ├── schema.ts             # 表结构定义 + 初始化
│   ├── codegen.ts            # 类型自动生成
│   ├── types/
│   │   └── database.d.ts     # 自动生成的表类型
│   └── repositories/
│       ├── index.ts
│       ├── project.ts
│       ├── novel.ts
│       ├── outline.ts
│       ├── storyline.ts
│       ├── script.ts
│       ├── storyboard.ts
│       ├── assets.ts
│       ├── video.ts
│       └── config.ts
├── package.json
└── tsconfig.json
```

---

## 1.3 兼容层

### 迁移策略

- `apps/api/` 中 `u.db()` 保持可用
- 新代码使用 Repository
- 逐步将路由中的直接 SQL 替换为 Repository 调用

```typescript
// apps/api/src/utils/db.ts 改为
import { createDbClient } from "@toonflow/db";

const { db, dbClient } = createDbClient({
  host: process.env.DB_HOST || "192.168.1.100",
  port: parseInt(process.env.DB_PORT || "5432"),
  user: process.env.DB_USER || "postgres",
  password: process.env.DB_PASSWORD || "123456",
  database: process.env.DB_NAME || "toonflow",
});

export default dbClient;
export { db };
```

---

## 验证标准

- `pnpm dev` 正常启动，数据库连接成功
- 所有现有路由功能不受影响
- Repository 单元测试通过
- `pnpm lint` 类型检查通过

---

## 风险与注意事项

- 数据库类型自动生成依赖运行时数据库连接，需要确保 CI 环境可用
- Repository 方法签名需要覆盖所有现有查询模式
- 事务支持需要在 Repository 层预留接口
