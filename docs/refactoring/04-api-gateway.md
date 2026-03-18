# Phase 4: API Gateway 重构 + v1 API

## 目标

统一 HTTP API 层，同时服务页面和外部调用。通过引入 RESTful v1 API，在保持旧路由兼容性的同时，为外部集成和未来扩展提供规范化的接口。

---

## 4.1 路由重构为 RESTful v1 API

现有路由（如 `/project/addProject`）迁移为新路由（如 `POST /api/v1/projects`），新旧并存，不破坏现有功能。

### 路由映射表

| 资源 | 新 API | 旧路由（保留兼容） |
|------|--------|------------------|
| 项目 | `GET /api/v1/projects`<br>`POST /api/v1/projects`<br>`GET /api/v1/projects/:id`<br>`PUT /api/v1/projects/:id`<br>`DELETE /api/v1/projects/:id` | `/project/getProject`<br>`/project/addProject`<br>`/project/getSingleProject`<br>`/project/updateProject`<br>`/project/delProject` |
| 小说 | `GET /api/v1/projects/:projectId/novels`<br>`POST /api/v1/projects/:projectId/novels`<br>`PUT /api/v1/novels/:id`<br>`DELETE /api/v1/novels/:id` | `/novel/getNovel`<br>`/novel/addNovel`<br>`/novel/updateNovel`<br>`/novel/delNovel` |
| 大纲 | `GET /api/v1/projects/:projectId/outlines`<br>`POST /api/v1/outlines`<br>`PUT /api/v1/outlines/:id`<br>`DELETE /api/v1/outlines/:id` | `/outline/getOutline`<br>`/outline/addOutline`<br>`/outline/updateOutline`<br>`/outline/delOutline` |
| 剧本 | `GET /api/v1/projects/:projectId/scripts`<br>`POST /api/v1/scripts/generate`<br>`PUT /api/v1/scripts/:id` | `/script/geScriptApi`<br>`/script/generateScriptApi`<br>`/script/generateScriptSave` |
| 分镜 | `GET /api/v1/scripts/:scriptId/storyboards`<br>`POST /api/v1/storyboards/generate`<br>`PUT /api/v1/storyboards/:id`<br>`DELETE /api/v1/storyboards/:id` | `/storyboard/getStoryboard`<br>`/storyboard/generateStoryboardApi` |
| 素材 | `GET /api/v1/projects/:projectId/assets`<br>`POST /api/v1/assets`<br>`PUT /api/v1/assets/:id`<br>`DELETE /api/v1/assets/:id` | `/assets/getAssets`<br>`/assets/addAssets`<br>`/assets/updateAssets`<br>`/assets/delAssets` |
| 视频 | `GET /api/v1/scripts/:scriptId/videos`<br>`POST /api/v1/videos/generate`<br>`GET /api/v1/videos/:id/status` | `/video/getVideo`<br>`/video/generateVideo` |
| 工作流 | `GET /api/v1/workflows`<br>`POST /api/v1/workflows`<br>`GET /api/v1/workflows/:id` | 新增 |
| 审核 | `GET /api/v1/reviews/inbox`<br>`POST /api/v1/reviews/:runId/approve`<br>`POST /api/v1/reviews/:runId/rework`<br>`POST /api/v1/reviews/:runId/reject` | 新增 |
| 配置 | `GET /api/v1/configs/models`<br>`POST /api/v1/configs/models`<br>`PUT /api/v1/configs/models/:id`<br>`DELETE /api/v1/configs/models/:id` | `/setting/getAiModelList`<br>`/setting/addModel`<br>`/setting/updateModel`<br>`/setting/delModel` |

---

## 4.2 WebSocket 端点统一

所有 WebSocket 连接统一迁移至 `/api/v1/ws/` 命名空间：

| 端点 | 用途 |
|------|------|
| `/api/v1/ws/outline/:projectId` | 大纲 Agent 实时通信 |
| `/api/v1/ws/storyboard/:projectId` | 分镜 Agent 实时通信 |
| `/api/v1/ws/workflow/:runId` | 工作流进度推送 |

---

## 4.3 认证与安全

### JWT 认证恢复

当前 `src/app.ts` 第 44-63 行的 JWT 认证中间件已被注释掉，需要恢复并按以下策略应用：

- v1 API（`/api/v1/*`）：全部需要认证
- 旧路由（`/project/*`、`/novel/*` 等）：保持当前行为，无需认证
- WebSocket 端点：通过 query 参数 `?token=` 传递 JWT

### CORS 收紧

从当前的宽松配置迁移为白名单模式，在环境变量中配置允许的 origin 列表：

```
CORS_ORIGINS=http://localhost:3000,https://app.toonflow.com
```

---

## 4.4 目录结构

```
apps/api/src/
├── routes/              # 旧路由（保持不变，向后兼容）
├── api/
│   └── v1/
│       ├── index.ts     # v1 路由注册入口
│       ├── projects.ts
│       ├── novels.ts
│       ├── outlines.ts
│       ├── scripts.ts
│       ├── storyboards.ts
│       ├── assets.ts
│       ├── videos.ts
│       ├── workflows.ts
│       ├── reviews.ts
│       └── configs.ts
├── middleware/
│   ├── auth.ts          # JWT 认证中间件
│   └── validate.ts      # 请求校验中间件
```

### v1 路由注册示例

`apps/api/src/api/v1/index.ts`：

```typescript
import { Router } from 'express'
import projectsRouter from './projects'
import novelsRouter from './novels'
// ... 其他资源路由

const v1Router = Router()

v1Router.use('/projects', projectsRouter)
v1Router.use('/novels', novelsRouter)
// ... 挂载其他路由

export default v1Router
```

在 `src/app.ts` 中挂载：

```typescript
import v1Router from './api/v1'
import { authMiddleware } from './middleware/auth'

// v1 API 全部需要认证
app.use('/api/v1', authMiddleware, v1Router)

// 旧路由保持不变
app.use('/', legacyRouter)
```

### 认证中间件示例

`apps/api/src/middleware/auth.ts`：

```typescript
import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { u } from '@/utils'

export async function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.replace('Bearer ', '') || req.query.token as string

  if (!token) {
    return res.status(401).json({ code: 401, message: '未授权' })
  }

  try {
    const tokenKey = u.db()('t_setting').where({ key: 'tokenKey' }).first()
    jwt.verify(token, (await tokenKey)?.value)
    next()
  } catch {
    return res.status(401).json({ code: 401, message: 'Token 无效或已过期' })
  }
}
```

---

## 4.5 响应格式规范

v1 API 统一使用以下响应结构：

```typescript
// 成功响应
{
  "code": 200,
  "data": { ... },
  "message": "success"
}

// 分页响应
{
  "code": 200,
  "data": {
    "list": [ ... ],
    "total": 100,
    "page": 1,
    "pageSize": 20
  }
}

// 错误响应
{
  "code": 400 | 401 | 403 | 404 | 500,
  "message": "错误描述"
}
```

---

## 4.6 实施步骤

1. 创建 `apps/api/src/api/v1/` 目录结构
2. 实现 `middleware/auth.ts` 和 `middleware/validate.ts`
3. 逐资源实现 v1 路由，复用现有业务逻辑（不重写，只做适配）
4. 在 `app.ts` 中挂载 v1 路由，恢复 JWT 认证
5. 配置 CORS 白名单
6. 实现 WebSocket 新端点

---

## 验证标准

- 旧路由全部正常工作，现有前端无需改动
- v1 API 可通过 Postman/curl 测试，返回规范响应格式
- WebSocket 端点可连接并收发消息
- JWT 认证正常工作，无效 token 返回 401
- CORS 仅允许白名单 origin 访问
