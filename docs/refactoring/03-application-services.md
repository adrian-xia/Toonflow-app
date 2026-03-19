# Phase 3: 应用服务层提取 (@toonflow/services)

## 目标

路由瘦身为纯 controller，业务逻辑沉淀到 Service。

---

## 当前状态

82 个路由文件直接包含业务逻辑、数据库操作和 AI 调用。路由分布在 11 个域：

| 域 | 文件数 |
|----|--------|
| assets | 10 |
| index | 1 |
| novel | 4 |
| other | 7 |
| outline | 11 |
| project | 6 |
| prompt | 2 |
| script | 3 |
| setting | 11 |
| storyboard | 10 |
| task | 2 |
| user | 2 |
| video | 13 |

---

## 服务清单

### ProjectService

来源：`src/routes/project/*.ts`（6 个文件）

| 方法 | 说明 |
|------|------|
| `create` | 创建新项目 |
| `get` | 获取单个项目 |
| `list` | 获取项目列表 |
| `update` | 更新项目信息 |
| `delete` | 删除项目 |
| `getCount` | 获取项目数量 |

### NovelService

来源：`src/routes/novel/*.ts`（4 个文件）

| 方法 | 说明 |
|------|------|
| `add` | 添加小说章节 |
| `get` | 获取小说内容 |
| `update` | 更新小说内容 |
| `delete` | 删除小说章节 |

### OutlineService

来源：`src/routes/outline/*.ts`（11 个文件）

| 方法 | 说明 |
|------|------|
| `generate` | AI 生成故事大纲 |
| `get` | 获取大纲内容 |
| `update` | 更新大纲 |
| `delete` | 删除大纲 |
| `getHistory` | 获取生成历史 |

### ScriptService

来源：`src/routes/script/*.ts` + `src/utils/generateScript.ts`

| 方法 | 说明 |
|------|------|
| `generate` | AI 生成剧本 |
| `get` | 获取剧本内容 |
| `save` | 保存剧本 |

### StoryboardService

来源：`src/routes/storyboard/*.ts`（10 个文件）

| 方法 | 说明 |
|------|------|
| `generate` | AI 生成分镜 |
| `get` | 获取分镜内容 |
| `save` | 保存分镜 |
| `delete` | 删除分镜 |
| `generateShotImage` | 生成镜头图像 |

### AssetsService

来源：`src/routes/assets/*.ts`（10 个文件）

| 方法 | 说明 |
|------|------|
| `generate` | AI 生成素材 |
| `get` | 获取素材列表 |
| `add` | 添加素材 |
| `update` | 更新素材 |
| `delete` | 删除素材 |
| `polishPrompt` | 优化图像提示词 |

### VideoService

来源：`src/routes/video/*.ts`（13 个文件）

| 方法 | 说明 |
|------|------|
| `generate` | 生成视频片段 |
| `get` | 获取视频信息 |
| `save` | 保存视频 |
| `getStatus` | 查询生成状态 |
| `getConfigs` | 获取视频配置 |

### ConfigService

来源：`src/routes/setting/*.ts`（11 个文件）

| 方法 | 说明 |
|------|------|
| `getModels` | 获取 AI 模型列表 |
| `addModel` | 添加 AI 模型配置 |
| `updateModel` | 更新模型配置 |
| `deleteModel` | 删除模型配置 |

### PromptService

来源：`src/routes/prompt/*.ts`（2 个文件）

| 方法 | 说明 |
|------|------|
| `get` | 获取提示词模板 |
| `update` | 更新提示词模板 |

### AuthService

来源：`src/routes/other/login.ts`

| 方法 | 说明 |
|------|------|
| `login` | 用户登录，返回 JWT token |
| `validateToken` | 验证 token 有效性 |

---

## 包结构

```
packages/services/
├── src/
│   ├── index.ts          # 统一导出所有 Service
│   ├── project.ts        # ProjectService
│   ├── novel.ts          # NovelService
│   ├── outline.ts        # OutlineService
│   ├── script.ts         # ScriptService
│   ├── storyboard.ts     # StoryboardService
│   ├── assets.ts         # AssetsService
│   ├── video.ts          # VideoService
│   ├── config.ts         # ConfigService
│   ├── prompt.ts         # PromptService
│   └── auth.ts           # AuthService
├── package.json
└── tsconfig.json
```

---

## 迁移策略

### 原则

- 逐个路由提取：先改 `project/getProject.ts` 验证模式，再批量推进
- 路由文件只保留：参数校验 → 调用 Service → 返回响应
- Service 依赖注入：通过构造函数注入 Repository、AI Provider、Storage

### 迁移步骤

1. 从 `ProjectService` 开始，作为模式验证
2. 确认路由行为不变后，按域批量推进其余 Service
3. 每个域完成后运行集成测试，确保功能不回归
4. 全部迁移完成后清理路由中的冗余代码

### 路由瘦身前后对比

瘦身前（当前）：

```typescript
// src/routes/project/getProject.ts
router.get("/", async (req, res) => {
  const projects = await u.db("t_project").select("*").orderBy("createTime", "desc");
  res.json(success(projects));
});
```

瘦身后：

```typescript
// apps/api/src/routes/project/getProject.ts
router.get("/", async (req, res) => {
  const projects = await projectService.list();
  res.json(success(projects));
});
```

### Service 实现示例

```typescript
// packages/services/src/project.ts
import type { ProjectRepository } from "@toonflow/db";
import type { Project } from "@toonflow/kernel";

export class ProjectService {
  constructor(private readonly repo: ProjectRepository) {}

  async list(): Promise<Project[]> {
    return this.repo.findAll({ orderBy: "createTime", order: "desc" });
  }

  async get(id: string): Promise<Project | null> {
    return this.repo.findById(id);
  }

  async create(data: Omit<Project, "id" | "createTime">): Promise<Project> {
    return this.repo.create(data);
  }

  async update(id: string, data: Partial<Project>): Promise<Project> {
    return this.repo.update(id, data);
  }

  async delete(id: string): Promise<void> {
    return this.repo.delete(id);
  }

  async getCount(): Promise<number> {
    return this.repo.count();
  }
}
```

---

## 依赖关系

```
@toonflow/services
├── @toonflow/kernel    # 类型定义、响应格式工具
├── @toonflow/db        # Repository 接口与实现
├── @toonflow/ai-providers  # AI 调用抽象层
└── @toonflow/storage   # 文件操作工具
```

---

## 验证标准

- 所有路由功能不受影响（行为与迁移前完全一致）
- Service 可独立单元测试（不依赖 HTTP 层）
- `pnpm lint` 通过，无类型错误
- 路由文件行数显著减少，不含直接数据库操作
