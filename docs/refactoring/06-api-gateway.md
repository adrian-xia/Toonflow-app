# Phase 6: API Gateway 扩展 (`apps/api`)

## 目标

把 `apps/api` 从 Phase 0 的最小健康检查入口扩展为正式 API Gateway，统一承载：

- REST API
- WebSocket / SSE
- 认证与鉴权
- 请求校验
- 错误处理
- 对 `services`、`agents`、`workflow` 的组合调用

本阶段只建设新的 API 结构，不恢复旧单体路由。

---

## 目录建议

```text
apps/api/src/
├── app.ts
├── main.ts
├── api/
│   └── v1/
│       ├── index.ts
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
│   ├── auth.ts
│   ├── validate.ts
│   └── error-handler.ts
└── ws/
    ├── outlines.ts
    ├── storyboards.ts
    └── workflows.ts
```

---

## 设计要求

### 1. 统一 API 前缀

- 所有正式业务接口统一放在 `/api/v1/*`
- WebSocket / SSE 入口也以 `/api/v1/*` 组织
- 不再保留根级旧风格路由命名

### 2. 响应格式统一走 `@toonflow/kernel`

```ts
ok(data);
fail(code, message, details);
```

错误处理中间件必须统一把未知异常归一化为 `AppError`。

### 3. 传输层只做适配

- `apps/api` 不直接承载复杂业务逻辑
- 路由层负责参数解析、鉴权、调用 service、返回 envelope
- WebSocket / SSE 负责事件转发，不直接耦合具体 Agent 内部实现

### 4. 安全能力集中

- JWT / session / token 校验放在 middleware
- CORS 白名单显式配置
- 请求校验在路由边界完成

---

## 路由示例

```ts
import { Router } from "express";
import { ok } from "@toonflow/kernel";

const router = Router();

router.get("/projects", async (_req, res) => {
  const projects = await projectService.list();
  res.json(ok(projects));
});

export default router;
```

---

## WebSocket / SSE 方向

- `/api/v1/ws/outlines/:projectId`
- `/api/v1/ws/storyboards/:projectId`
- `/api/v1/ws/workflows/:runId`
- `/api/v1/outlines/generate` 可按需要提供 SSE

这些入口只把上游事件翻译为传输协议，不重新实现业务流程。

---

## 验证标准

- `apps/api` 通过 `build`、`lint`、`typecheck`
- 关键资源路由具备集成测试
- 认证失败、校验失败、未知异常都返回统一错误 envelope
- WebSocket / SSE 能正确转发事件
- 新 API 可被 `apps/web`、`apps/review-console` 明确消费
- `apps/mcp-server` 直接组合 `services / agents / workflow`，不经由 HTTP API
