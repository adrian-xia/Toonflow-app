# Toonflow 重构架构概览

> 文档版本：v1.0
> 更新日期：2026-03-19
> 状态：草稿

---

## 1. 项目背景

### 1.1 现状

Toonflow 当前是单体 Express + Electron 应用，将 AI 驱动的短剧制作流程（小说 → 剧本 → 分镜 → 视频）封装在一个进程中。

**当前技术栈：**

| 层次 | 技术 |
|------|------|
| 后端 | Node.js + Express 5 + TypeScript (ESNext/CommonJS) |
| 数据库 | PostgreSQL (Knex)，自动生成类型 (sql-ts) |
| AI | Vercel AI SDK v6，支持 13+ text 厂商、9 image、9 video |
| 桌面端 | Electron 40 |
| 图像处理 | Sharp |
| 前端 | 预构建静态文件（独立仓库 Toonflow-web） |
| 包管理 | yarn 1.x |

### 1.2 核心痛点

当前架构存在以下结构性问题：

- **路由层职责过重**：82 个路由文件直接包含业务逻辑、数据库操作和 AI 调用，三者耦合在同一层。
- **依赖注入缺失**：所有路由通过 `u from "@/utils"` 访问全部依赖，无法按需隔离或替换。
- **可测试性差**：业务逻辑与 HTTP 层绑定，单元测试需要启动完整 Express 实例。
- **扩展性受限**：无法在不修改路由代码的情况下新增调用入口（如 MCP、CLI）。
- **Agent 系统孤立**：`src/agents/` 与路由层紧耦合，无法复用于其他入口。

---

## 2. 重构目标

### 2.1 核心目标

将 Toonflow 从**单体工具**重构为**双入口基础设施平台**：

1. **人工操作入口**
   - Creator Console（创作页面）— 面向内容创作者的主操作界面
   - Review Console（审核工作台）— 面向审核人员的内容审查界面

2. **Agent 调用入口**
   - MCP Server — 供 OpenClaw 等 Agent 程序化调用，通过 stdio 传输

两个入口**共享同一套 Application Services**，保证业务逻辑一致性。

### 2.2 架构原则

- **关注点分离**：HTTP 层、业务层、数据层严格分离
- **依赖倒置**：上层依赖抽象接口，不依赖具体实现
- **渐进迁移**：Strangler Fig 模式，新旧代码并存，逐步替换
- **零停机**：迁移过程中保持现有功能完整可用

---

## 3. 目标架构

### 3.1 Monorepo 目录结构

```
toonflow/
├── apps/
│   ├── api/                    # API Gateway（HTTP + WebSocket）
│   │   ├── src/
│   │   │   ├── routes/         # 路由定义（仅 HTTP 层）
│   │   │   ├── middleware/     # 认证、日志、错误处理
│   │   │   └── ws/             # WebSocket 处理器
│   │   └── package.json
│   │
│   ├── mcp-server/             # MCP Server（stdio 传输）
│   │   ├── src/
│   │   │   ├── tools/          # MCP Tool 定义
│   │   │   └── server.ts       # stdio 入口
│   │   └── package.json
│   │
│   ├── web/                    # Creator Console
│   │   └── package.json
│   │
│   ├── review-console/         # Review Console（审核工作台）
│   │   └── package.json
│   │
│   └── electron/               # Electron 壳
│       ├── src/
│       │   ├── main.ts         # 主进程
│       │   └── preload.ts      # 预加载脚本
│       └── package.json
│
├── packages/
│   ├── kernel/                 # 共享内核：类型、枚举、schema、错误、工具
│   │   ├── src/
│   │   │   ├── types/          # 共享 TypeScript 类型
│   │   │   ├── enums/          # 枚举定义
│   │   │   ├── schemas/        # Zod schema
│   │   │   ├── errors/         # 错误类定义
│   │   │   └── utils/          # 纯函数工具
│   │   └── package.json
│   │
│   ├── db/                     # 数据库层：Knex + Repository
│   │   ├── src/
│   │   │   ├── client.ts       # Knex 实例
│   │   │   ├── migrations/     # 数据库迁移
│   │   │   ├── repositories/   # Repository 模式实现
│   │   │   └── types/          # sql-ts 自动生成类型
│   │   └── package.json
│   │
│   ├── ai-providers/           # AI 抽象层
│   │   ├── src/
│   │   │   ├── text/           # LLM 提供商（13+）
│   │   │   ├── image/          # 图像生成（9）
│   │   │   ├── video/          # 视频生成（9）
│   │   │   └── registry.ts     # 模型注册表
│   │   └── package.json
│   │
│   ├── storage/                # 文件存储抽象
│   │   ├── src/
│   │   │   ├── local.ts        # 本地文件系统
│   │   │   ├── oss.ts          # 对象存储
│   │   │   └── interface.ts    # 存储接口定义
│   │   └── package.json
│   │
│   ├── services/               # 应用服务层
│   │   ├── src/
│   │   │   ├── novel/          # 小说服务
│   │   │   ├── script/         # 剧本服务
│   │   │   ├── storyboard/     # 分镜服务
│   │   │   ├── assets/         # 素材服务
│   │   │   ├── video/          # 视频服务
│   │   │   └── project/        # 项目服务
│   │   └── package.json
│   │
│   ├── agents/                 # Agent 运行时
│   │   ├── src/
│   │   │   ├── outline/        # 大纲生成 Agent
│   │   │   ├── storyboard/     # 分镜生成 Agent
│   │   │   └── runtime/        # Agent 基础运行时
│   │   └── package.json
│   │
│   └── workflow/               # 工作流状态机
│       ├── src/
│       │   ├── states/         # 状态定义
│       │   ├── transitions/    # 状态转换
│       │   └── engine.ts       # 状态机引擎
│       └── package.json
│
├── pnpm-workspace.yaml
└── turbo.json
```

---

## 4. 模块依赖图

各包之间的依赖关系严格单向，禁止循环依赖：

```
┌─────────────────────────────────────────────────────────┐
│                      kernel                             │
│              （零依赖 — 类型/枚举/schema/错误）           │
└──────────────────────────┬──────────────────────────────┘
                           │
          ┌────────────────┼────────────────┐
          ▼                ▼                ▼
       ┌──────┐       ┌─────────┐    ┌──────────────┐
       │  db  │       │ storage │    │ ai-providers │
       └──┬───┘       └────┬────┘    └──────┬───────┘
          │                │                │
          └────────────────┼────────────────┘
                           ▼
                    ┌─────────────┐
                    │  services   │
                    └──────┬──────┘
                           │
                    ┌──────┴──────┐
                    ▼             ▼
                ┌────────┐  ┌──────────┐
                │ agents │  │ workflow │
                └────┬───┘  └────┬─────┘
                     │           │
                     └─────┬─────┘
                           ▼
              ┌────────────┴────────────┐
              ▼                         ▼
         ┌─────────┐            ┌────────────────┐
         │ apps/api│            │ apps/mcp-server│
         └────┬────┘            └────────────────┘
              │
    ┌─────────┼──────────┐
    ▼         ▼          ▼
┌───────┐ ┌────────────┐ ┌──────────┐
│apps/  │ │apps/review-│ │apps/     │
│web    │ │console     │ │electron  │
└───────┘ └────────────┘ └──────────┘
```

**依赖规则汇总：**

| 包 | 依赖 |
|----|------|
| `kernel` | 零依赖 |
| `db` | kernel |
| `storage` | kernel |
| `ai-providers` | kernel, db |
| `services` | kernel, db, ai-providers, storage |
| `agents` | kernel, db, ai-providers, services |
| `workflow` | kernel, db, services, agents |
| `apps/api` | services, agents, workflow |
| `apps/mcp-server` | services, agents, workflow |
| `apps/web` | apps/api（HTTP client） |
| `apps/review-console` | apps/api（HTTP client） |
| `apps/electron` | apps/api + apps/web |

---

## 5. 三入口复用架构

三个入口通过 API Gateway 共享同一套 Application Services，保证业务逻辑一致：

```
┌─────────────────────────────────────────────────────────────────┐
│                         用户 / Agent                            │
└──────────┬──────────────────────┬──────────────────────┬────────┘
           │                      │                      │
           ▼                      ▼                      ▼
  ┌─────────────────┐   ┌──────────────────┐   ┌────────────────┐
  │ Creator Console │   │ Review Console   │   │   MCP Server   │
  │  (apps/web)     │   │(apps/review-     │   │(apps/mcp-      │
  │                 │   │ console)         │   │ server)        │
  └────────┬────────┘   └────────┬─────────┘   └───────┬────────┘
           │  HTTP/WS            │  HTTP/WS             │  stdio
           └──────────┬──────────┘                      │
                      ▼                                  │
           ┌──────────────────────┐                      │
           │     API Gateway      │                      │
           │     (apps/api)       │                      │
           │  ┌────────────────┐  │                      │
           │  │  HTTP Routes   │  │                      │
           │  │  WebSocket     │  │                      │
           │  │  Auth/RBAC     │  │                      │
           │  └────────────────┘  │                      │
           └──────────┬───────────┘                      │
                      │                                  │
                      └──────────────┬───────────────────┘
                                     ▼
                    ┌────────────────────────────────┐
                    │      Application Services      │
                    │         (packages/services)    │
                    │                                │
                    │  NovelService  ScriptService   │
                    │  StoryboardService  VideoSvc   │
                    │  AssetsService  ProjectService │
                    └────────────────┬───────────────┘
                                     │
                    ┌────────────────┼────────────────┐
                    ▼                ▼                ▼
             ┌──────────┐    ┌──────────┐    ┌──────────────┐
             │  agents  │    │ workflow │    │ ai-providers │
             └──────────┘    └──────────┘    └──────────────┘
                    │                                │
                    └────────────────┬───────────────┘
                                     ▼
                              ┌─────────────┐
                              │     db      │
                              │   storage   │
                              └─────────────┘
```

**各入口职责：**

- **Creator Console**：内容创作者的主操作界面，通过 HTTP/WebSocket 与 API Gateway 通信
- **Review Console**：审核人员的内容审查界面，独立部署，权限隔离
- **MCP Server**：通过 stdio 传输直接调用 services 包，供 OpenClaw 等 Agent 程序化调用，绕过 HTTP 层

---

## 6. 迁移策略

### 6.1 Strangler Fig 模式

新代码包裹旧代码，逐步替换，保持系统持续可用：

```
Phase N-1                    Phase N                     Phase N+1
┌─────────────┐         ┌─────────────────┐         ┌─────────────────┐
│  旧路由层    │  →      │  新服务层        │  →      │  旧路由层下线    │
│  (直接操作) │         │  + 旧路由兼容层  │         │  (完全移除)     │
└─────────────┘         └─────────────────┘         └─────────────────┘
```

### 6.2 迁移枢纽：`src/utils.ts`

`src/utils.ts` 是迁移的核心枢纽。迁移策略：**改导入源，保持导出签名不变**。

```typescript
// 迁移前：直接实现
export const u = {
  db: () => knexInstance,
  ai: { text: () => ..., image: () => ..., video: () => ... },
  // ...
}

// 迁移后：从新包转发
import { db } from '@toonflow/db'
import { aiProviders } from '@toonflow/ai-providers'

export const u = {
  db: () => db.client,          // 签名不变，实现来自新包
  ai: { text: () => aiProviders.text(), ... },
  // ...
}
```

所有 82 个路由文件无需修改，自动获得新实现。

### 6.3 新旧 API 并存

v1 API 与旧路由同时运行，通过路由前缀区分：

```
/api/v1/project/...    ← 新 API（来自 services 包）
/project/...           ← 旧路由（保持兼容，逐步废弃）
```

### 6.4 MCP Server 独立进程

MCP Server 作为独立进程运行，直接调用 `services` 包，不经过 HTTP 层：

```
OpenClaw Agent
    │ stdio
    ▼
MCP Server Process
    │ import
    ▼
@toonflow/services
    │ import
    ▼
@toonflow/db + @toonflow/ai-providers
```

### 6.5 Agent 兼容层

Agent 系统支持 EventEmitter（旧）和 AsyncGenerator（新）双模式过渡：

```typescript
// 兼容层：同时支持两种消费方式
class OutlineAgent extends BaseAgent {
  // 旧模式：EventEmitter（保持兼容）
  run(params): EventEmitter { ... }

  // 新模式：AsyncGenerator（推荐）
  async *stream(params): AsyncGenerator<AgentEvent> { ... }
}
```

### 6.6 前端渐进迁移

前端通过 API 版本号渐进迁移，无需大规模重写：

1. 新功能直接使用 v1 API
2. 旧功能在稳定后逐步切换到 v1 API
3. 旧 API 在所有前端迁移完成后下线

---

## 7. Phase 路线图

| Phase | 标题 | 目标 |
|-------|------|------|
| Phase 0 | 基础设施准备 | 建立 monorepo 结构（pnpm workspace + Turborepo），迁移包管理器 |
| Phase 1 | Kernel 包提取 | 将共享类型、枚举、schema、错误类提取到 `@toonflow/kernel` |
| Phase 2 | DB 层分离 | 将 Knex 实例和 Repository 模式提取到 `@toonflow/db` |
| Phase 3 | AI 抽象层重构 | 将 AI 提供商统一封装到 `@toonflow/ai-providers`，支持运行时切换 |
| Phase 4 | Storage 抽象 | 将文件存储抽象为接口，支持本地和 OSS 两种实现 |
| Phase 5 | Services 层建立 | 将路由中的业务逻辑提取到 `@toonflow/services`，路由层仅保留 HTTP 处理 |
| Phase 6 | Agent 系统重构 | 将 Agent 迁移到 `@toonflow/agents`，支持 AsyncGenerator 流式输出 |
| Phase 7 | Workflow 引擎 | 建立状态机引擎，管理小说→剧本→分镜→视频的完整工作流状态 |
| Phase 8 | MCP Server 上线 | 基于 services 包实现 MCP Server，开放 Agent 程序化调用入口 |
| Phase 9 | Review Console | 建立独立审核工作台，完成双入口平台架构 |

---

## 8. 关键文件清单

### 8.1 迁移核心文件

| 文件路径 | 当前角色 | 重构后角色 |
|----------|----------|------------|
| `src/utils.ts` | 全局依赖入口，所有路由通过此文件访问 db/ai/storage | 迁移枢纽，改为从新包转发，保持导出签名不变 |
| `src/lib/initDB.ts` | 数据库 schema 初始化，包含所有表定义 | 迁移到 `@toonflow/db/migrations`，schema 定义保留 |
| `src/core.ts` | 基于文件系统自动生成路由 | 保留用于旧路由兼容，新路由手动注册到 `apps/api` |
| `src/router.ts` | 自动生成的路由注册文件 | 继续自动生成，不手动编辑 |
| `src/app.ts` | Express 服务器入口，JWT 中间件 | 拆分为 `apps/api/src/server.ts`，中间件迁移到 `apps/api/src/middleware/` |

### 8.2 业务逻辑文件

| 文件路径 | 当前角色 | 重构后角色 |
|----------|----------|------------|
| `src/agents/outlineScript/` | 大纲生成 Agent，含 EventEmitter 通信 | 迁移到 `@toonflow/agents/outline`，新增 AsyncGenerator 模式 |
| `src/agents/storyboard/` | 分镜生成 Agent | 迁移到 `@toonflow/agents/storyboard` |
| `src/routes/novel/` | 小说管理路由（含业务逻辑） | 业务逻辑提取到 `@toonflow/services/novel`，路由层仅保留 HTTP 处理 |
| `src/routes/outline/agentsOutline.ts` | WebSocket + Agent 调用 | 路由层保留 WebSocket 处理，Agent 调用委托给 `@toonflow/agents` |
| `src/routes/script/generateScriptApi.ts` | 剧本生成路由 | 业务逻辑提取到 `@toonflow/services/script` |
| `src/routes/storyboard/generateStoryboardApi.ts` | 分镜生成路由 | 业务逻辑提取到 `@toonflow/services/storyboard` |
| `src/routes/assets/generateAssets.ts` | 素材生成路由 | 业务逻辑提取到 `@toonflow/services/assets` |
| `src/routes/video/generateVideo.ts` | 视频生成路由 | 业务逻辑提取到 `@toonflow/services/video` |

### 8.3 AI 集成文件

| 文件路径 | 当前角色 | 重构后角色 |
|----------|----------|------------|
| `src/utils/ai/text/` | LLM 提供商实现（13+） | 迁移到 `@toonflow/ai-providers/text` |
| `src/utils/ai/image/` | 图像生成实现（9） | 迁移到 `@toonflow/ai-providers/image` |
| `src/utils/ai/video/` | 视频生成实现（9） | 迁移到 `@toonflow/ai-providers/video` |

### 8.4 配置文件

| 文件路径 | 当前角色 | 重构后角色 |
|----------|----------|------------|
| `tsconfig.json` | TypeScript 配置，含 `@/` 路径别名 | 拆分为根配置 + 各包独立配置 |
| `env/.env.dev` / `env/.env.prod` | 环境变量 | 迁移到各 app 的 `.env` 文件，敏感配置通过 secrets 管理 |
| `electron/main.ts` | Electron 主进程 | 迁移到 `apps/electron/src/main.ts` |

---

## 9. 验证方式

每个 Phase 完成后，通过以下标准验证迁移质量：

### Phase 0 — 基础设施准备
- [ ] `pnpm install` 在根目录成功执行
- [ ] `turbo build` 按依赖顺序构建所有包
- [ ] 现有 `yarn dev` 功能完全保留

### Phase 1 — Kernel 包提取
- [ ] `@toonflow/kernel` 可独立构建，零外部依赖
- [ ] 所有类型导入从 `@/types` 切换到 `@toonflow/kernel`
- [ ] TypeScript 类型检查通过（`tsc --noEmit`）

### Phase 2 — DB 层分离
- [ ] `@toonflow/db` 可独立构建
- [ ] 所有数据库操作通过 Repository 接口访问
- [ ] 数据库迁移脚本可独立执行
- [ ] 现有 API 功能回归测试通过

### Phase 3 — AI 抽象层重构
- [ ] `@toonflow/ai-providers` 可独立构建
- [ ] 13+ text、9 image、9 video 提供商全部迁移
- [ ] AI 模型切换无需重启服务
- [ ] 现有 AI 生成功能回归测试通过

### Phase 4 — Storage 抽象
- [ ] `@toonflow/storage` 可独立构建
- [ ] 本地存储和 OSS 存储通过同一接口访问
- [ ] 文件上传/下载功能回归测试通过

### Phase 5 — Services 层建立
- [ ] `@toonflow/services` 可独立构建
- [ ] 路由文件代码行数减少 60% 以上（仅保留 HTTP 处理）
- [ ] 所有业务逻辑可在不启动 HTTP 服务的情况下单元测试
- [ ] v1 API 端点与旧路由功能对等

### Phase 6 — Agent 系统重构
- [ ] `@toonflow/agents` 可独立构建
- [ ] EventEmitter 和 AsyncGenerator 两种消费方式均可用
- [ ] 大纲生成、分镜生成 Agent 功能回归测试通过
- [ ] WebSocket 实时进度推送正常工作

### Phase 7 — Workflow 引擎
- [ ] `@toonflow/workflow` 可独立构建
- [ ] 小说→剧本→分镜→视频完整工作流状态机可运行
- [ ] 工作流状态持久化到数据库
- [ ] 工作流中断后可从断点恢复

### Phase 8 — MCP Server 上线
- [ ] `apps/mcp-server` 可作为独立进程启动
- [ ] MCP Tool 列表覆盖核心业务操作
- [ ] OpenClaw Agent 可通过 MCP 协议调用所有核心功能
- [ ] MCP Server 与 API Gateway 共享同一套 services，结果一致

### Phase 9 — Review Console
- [ ] `apps/review-console` 可独立部署
- [ ] 审核工作台与创作页面权限隔离
- [ ] 双入口平台架构完整验证
- [ ] 端到端测试覆盖两个入口的核心流程
