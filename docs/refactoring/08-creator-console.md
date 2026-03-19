# Phase 8: Creator Console 落地 (`apps/web`)

## 目标

把 `apps/web` 从 Phase 0 的占位包扩展为正式的 Creator Console，承载创作者的项目、小说、剧本、分镜、素材与视频工作流界面。

本阶段直接在 monorepo 内建设 `apps/web`，不依赖旧的预构建静态目录，也不再以外部仓库作为运行时前提。

---

## 当前基线

- `apps/web` 已经存在 package manifest 与 `tsconfig.json`
- `apps/api` 已提供统一后端入口位置
- `packages/kernel` 可承载前后端共享契约

当前仍未落地：

- 真正的 Vue 源码
- API client
- 业务页面与状态管理
- 与工作流 / Agent 的交互体验

---

## 8.1 目录结构

```text
apps/web/
├── src/
│   ├── api/
│   ├── components/
│   ├── composables/
│   ├── pages/
│   ├── router/
│   ├── stores/
│   └── main.ts
├── public/
├── package.json
├── tsconfig.json
└── vite.config.ts
```

---

## 8.2 API 消费方式

`apps/web` 只通过 `apps/api` 提供的正式接口消费能力：

- HTTP：`/api/v1/*`
- WebSocket：`/api/v1/ws/*`
- SSE：按需提供

不再保留旧路由或历史静态目录作为兼容路径。

### API client 方向

```ts
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "/api/v1";

export async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...init?.headers
    },
    ...init
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  return response.json() as Promise<T>;
}
```

---

## 8.3 共享契约

`apps/web` 可以依赖 `@toonflow/kernel` 获取：

- 响应 envelope 类型
- 错误码
- 工作流状态枚举
- 共享 DTO / schema

共享原则：

- 进入 `kernel` 的必须是前后端都需要的契约
- UI 私有状态、页面模型、视觉组件不进入共享包

---

## 8.4 构建与集成

- `apps/web` 自己产出 `dist/`
- `apps/electron` 如需嵌入前端，应在自己的打包阶段显式消费 `apps/web/dist`
- `apps/api` 不再负责承接历史前端静态目录

### package.json 示例

```json
{
  "name": "@toonflow/web",
  "private": true,
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "lint": "eslint .",
    "typecheck": "vue-tsc --noEmit"
  }
}
```

---

## 8.5 验证标准

- `apps/web` 能独立启动开发服务器
- 能通过 `apps/api` 的正式接口加载项目数据
- 工作流进度与运行状态可视化正常
- `dist/` 构建产物可被后续 Electron 阶段消费
- 不引回旧的静态资源目录或外部前端运行时依赖
