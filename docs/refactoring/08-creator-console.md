# Phase 8: Creator Console 升级 (apps/web)

## 目标

将现有创作页面迁入 monorepo，接入 v1 API 与工作流驱动，新增工作流进度、运行状态反馈和 MCP Server 监控等能力。

---

## 当前状态

- 前端代码位于独立仓库 Toonflow-web
- 预构建静态文件位于当前项目的 `scripts/web/` 目录
- 技术栈为 Vue 3 + Vite + TypeScript

---

## 8.1 迁移策略

### 代码迁入

将 Toonflow-web 仓库代码迁入 `apps/web/`，作为 monorepo 的一个 app 管理，保持独立的 `package.json` 和构建配置。

```
monorepo/
├── apps/
│   ├── api/          # Phase 1-4 后端
│   ├── mcp-server/   # Phase 5 MCP Server
│   └── web/          # 本阶段：前端迁入
├── packages/
│   └── kernel/       # 共享类型定义
```

迁入后，`scripts/web/` 中的预构建产物由 `apps/web/` 的构建产物替代，构建输出路径配置为 `apps/api/scripts/web/`，保持 Express 静态文件服务路径不变。

### 依赖关系

`apps/web/` 依赖 `@toonflow/kernel` 获取共享类型定义（接口、枚举、工作流状态等），与 `apps/api/` 共享同一套类型，避免前后端类型漂移。

---

## 8.2 API Client 层

创建统一的 API client 层，将旧路由调用（如 `/project/getProject`）逐步切换到 v1 API（如 `GET /api/v1/projects`）。迁移策略为渐进式：新功能直接使用 v1 API，旧功能按模块逐步切换，不做一次性大重构。

### 目录结构

```
apps/web/src/api/
├── client.ts       # 统一 HTTP client（fetch 封装）
├── websocket.ts    # WebSocket 连接管理
├── projects.ts     # 项目相关接口
├── novels.ts       # 小说相关接口
├── outlines.ts     # 大纲相关接口
├── scripts.ts      # 剧本相关接口
├── storyboards.ts  # 分镜相关接口
├── assets.ts       # 素材相关接口
├── videos.ts       # 视频相关接口
└── workflows.ts    # 工作流相关接口
```

### HTTP Client 封装

`apps/web/src/api/client.ts`：

```typescript
import type { ApiResponse } from '@toonflow/kernel'

const BASE_URL = import.meta.env.VITE_API_BASE_URL || ''

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = localStorage.getItem('token')
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init?.headers,
    },
  })
  const json: ApiResponse<T> = await res.json()
  if (json.code !== 200) throw new Error(json.message)
  return json.data
}

export const api = {
  projects: {
    list: () => request('/api/v1/projects'),
    get: (id: string) => request(`/api/v1/projects/${id}`),
    create: (data: unknown) => request('/api/v1/projects', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: unknown) => request(`/api/v1/projects/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) => request(`/api/v1/projects/${id}`, { method: 'DELETE' }),
  },
  workflows: {
    list: () => request('/api/v1/workflows'),
    get: (id: string) => request(`/api/v1/workflows/${id}`),
    create: (data: unknown) => request('/api/v1/workflows', { method: 'POST', body: JSON.stringify(data) }),
  },
  // ... 其他资源按需补充
}
```

### WebSocket 管理

`apps/web/src/api/websocket.ts`：

```typescript
type WsHandler = {
  onData: (payload: unknown) => void
  onError?: (err: Event) => void
  onClose?: () => void
}

export function createWsConnection(path: string, handlers: WsHandler): WebSocket {
  const token = localStorage.getItem('token')
  const url = `${location.origin.replace('http', 'ws')}${path}?token=${token}`
  const ws = new WebSocket(url)

  ws.onmessage = (e) => handlers.onData(JSON.parse(e.data))
  ws.onerror = (e) => handlers.onError?.(e)
  ws.onclose = () => handlers.onClose?.()

  return ws
}
```

---

## 8.3 新增页面与组件

### 工作流进度条（WorkflowProgress）

在项目详情页增加工作流进度展示，通过 WebSocket `/api/v1/ws/workflow/:runId` 接收实时推送。

`apps/web/src/components/WorkflowProgress.vue`：

```vue
<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { createWsConnection } from '@/api/websocket'
import type { WorkflowRunStatus } from '@toonflow/kernel'

const props = defineProps<{ runId: string }>()
const status = ref<WorkflowRunStatus | null>(null)
let ws: WebSocket

onMounted(() => {
  ws = createWsConnection(`/api/v1/ws/workflow/${props.runId}`, {
    onData: (payload) => { status.value = payload as WorkflowRunStatus },
  })
})

onUnmounted(() => ws?.close())
</script>

<template>
  <div class="workflow-progress">
    <div v-if="status" class="steps">
      <div
        v-for="step in status.steps"
        :key="step.name"
        :class="['step', step.state]"
      >
        {{ step.label }}
      </div>
    </div>
    <div v-else class="loading">加载中...</div>
  </div>
</template>
```

显示内容：
- 当前工作流阶段（大纲 → 剧本 → 分镜 → 视频）
- 每个阶段的状态（pending / running / done / failed）
- 整体进度百分比

### 运行状态反馈（RunStatus）

各生成页面（大纲、剧本、分镜、视频）复用此组件，展示 Agent 执行进度。

`apps/web/src/components/RunStatus.vue`：

```vue
<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { createWsConnection } from '@/api/websocket'

const props = defineProps<{
  wsPath: string   // 如 /api/v1/ws/outline/:projectId
}>()

const logs = ref<string[]>([])
const currentStep = ref('')
let ws: WebSocket

onMounted(() => {
  ws = createWsConnection(props.wsPath, {
    onData: (payload: any) => {
      if (payload.type === 'step') currentStep.value = payload.step
      if (payload.type === 'log') logs.value.push(payload.message)
    },
  })
})

onUnmounted(() => ws?.close())
</script>

<template>
  <div class="run-status">
    <p class="current-step">{{ currentStep }}</p>
    <ul class="logs">
      <li v-for="(log, i) in logs" :key="i">{{ log }}</li>
    </ul>
  </div>
</template>
```

### MCP Server 状态监控

在设置页面增加 MCP Server 面板，展示连接状态、已注册工具列表和最近调用记录。

数据来源：`GET /api/v1/mcp/status`（由 Phase 5 MCP Server 提供）

展示内容：
- 连接状态（已连接 / 未连接）
- 已注册的 tool 列表（名称、描述、最后调用时间）
- 最近 20 条调用记录（tool 名称、入参摘要、耗时、状态）

---

## 8.4 WebSocket 端点切换

| 功能 | 旧端点 | 新端点 |
|------|--------|--------|
| 大纲生成 | `/agentsOutline` (ws) | `/api/v1/ws/outline/:projectId` |
| 分镜生成 | `/agentsStoryboard` (ws) | `/api/v1/ws/storyboard/:projectId` |
| 工作流进度 | 无 | `/api/v1/ws/workflow/:runId` |

切换方式：在 `api/websocket.ts` 中统一管理端点路径，页面组件只传入语义化的资源标识，不硬编码 URL。

---

## 8.5 包结构

```
apps/web/
├── src/
│   ├── api/
│   │   ├── client.ts           # 统一 HTTP client
│   │   ├── websocket.ts        # WebSocket 连接管理
│   │   ├── projects.ts
│   │   ├── workflows.ts
│   │   └── ...                 # 其他资源接口
│   ├── components/
│   │   ├── WorkflowProgress.vue  # 工作流进度条
│   │   └── RunStatus.vue         # 运行状态组件
│   ├── views/
│   │   └── ...                 # 现有页面（保持不变，逐步迁移 API 调用）
│   └── main.ts
├── package.json
├── vite.config.ts
└── tsconfig.json
```

### package.json 关键配置

```json
{
  "name": "@toonflow/web",
  "dependencies": {
    "@toonflow/kernel": "workspace:*"
  },
  "scripts": {
    "dev": "vite",
    "build": "vite build --outDir ../../apps/api/scripts/web"
  }
}
```

---

## 8.6 实施步骤

1. 将 Toonflow-web 仓库代码迁入 `apps/web/`，调整 `package.json` 和 `vite.config.ts`
2. 添加 `@toonflow/kernel` 依赖，替换本地类型定义
3. 创建 `src/api/client.ts` 和 `src/api/websocket.ts`
4. 按模块逐步将旧路由调用替换为 v1 API（优先替换项目、大纲、剧本模块）
5. 实现 `WorkflowProgress.vue` 和 `RunStatus.vue`，接入对应 WebSocket 端点
6. 在设置页面增加 MCP Server 状态面板
7. 更新构建输出路径，验证 Express 静态文件服务正常

---

## 依赖

- `@toonflow/kernel`：共享类型定义（Phase 0 monorepo 骨架提供）
- Phase 4 API Gateway：v1 API 端点和 WebSocket 端点
- Phase 5 MCP Server：MCP 状态查询接口

---

## 验证标准

- 所有现有页面功能正常，无回归
- v1 API 调用正常，响应格式符合规范
- 工作流进度通过 WebSocket 实时更新，断线后自动重连
- MCP Server 状态面板正确展示连接状态和工具列表
- 构建产物正确输出到 `apps/api/scripts/web/`，Electron 打包正常
