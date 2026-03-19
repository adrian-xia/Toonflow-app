# Toonflow 重构架构概览

> 文档版本：v2.0
> 更新日期：2026-03-19
> 状态：Phase 0 对齐版

---

## 1. 定位

Toonflow 的活跃代码基线已经切换为新的 monorepo 冷启动骨架。当前仓库不再沿用旧单体运行时，也不再以“兼容旧目录、旧路由、旧前端构建产物”为目标。后续阶段全部基于新的 workspace 结构继续演进。

这份文档描述的是未来目标架构与分阶段落地顺序，不是旧单体迁移手册。

---

## 2. 目标

将 Toonflow 演进为一个以共享应用服务为核心、支持多入口消费的基础设施平台：

1. 人工操作入口
   - `apps/web`：Creator Console
   - `apps/review-console`：Review Console
2. 程序化入口
   - `apps/mcp-server`：MCP Server
3. 桌面壳
   - `apps/electron`

这些入口共享同一套领域服务、Agent 运行时与工作流能力，但各自保留独立的传输层与打包方式。

---

## 3. 架构原则

- 包边界优先：共享能力放在 `packages/*`，入口壳放在 `apps/*`
- 明确依赖方向：上层只能依赖下层，不允许循环依赖
- 共享契约集中：跨包复用的响应、错误、schema、类型统一放在 `packages/kernel`
- 入口保持轻量：`apps/*` 只负责 HTTP、stdio、Web UI 或 Electron 壳，不在入口层堆业务逻辑
- 分阶段扩展：每个阶段只引入必要包与最小运行链路，不预埋超前抽象
- 不保留兼容层：旧实现如果与新结构冲突，直接删除，而不是保留双轨运行

---

## 4. 目标目录结构

```text
toonflow/
├── apps/
│   ├── api/                    # HTTP / WebSocket / SSE API Gateway
│   ├── web/                    # Creator Console
│   ├── review-console/         # Review Console
│   ├── mcp-server/             # MCP Server
│   └── electron/               # Electron shell
├── packages/
│   ├── kernel/                 # 共享契约与纯函数工具
│   ├── db/                     # 数据库层与 repository
│   ├── ai-providers/           # AI 提供商抽象
│   ├── storage/                # 文件存储抽象
│   ├── services/               # 应用服务层
│   ├── agents/                 # Agent 运行时
│   └── workflow/               # 工作流引擎
├── docs/
├── pnpm-workspace.yaml
├── turbo.json
├── tsconfig.base.json
└── tsconfig.json
```

---

## 5. 包职责

### `packages/kernel`

- 统一响应 envelope
- 错误模型与错误码
- 共享 schema / 类型 / 枚举
- 纯函数工具

约束：

- 无 IO
- 无数据库连接
- 无 Web 框架依赖
- 无容器初始化逻辑

### `packages/db`

- 数据库客户端与连接生命周期
- migration / schema 管理
- SQL 类型生成
- repository 实现

### `packages/ai-providers`

- 文本 / 图像 / 视频模型抽象
- 统一调用接口
- 厂商差异适配与模型注册

### `packages/storage`

- 本地文件存储
- 对象存储扩展点
- 文件路径与 URL 规则

### `packages/services`

- 领域服务
- 事务协调
- 聚合多个 repository / provider / storage

### `packages/agents`

- Outline、Storyboard 等 Agent 运行时
- 面向多入口的统一调用协议

### `packages/workflow`

- 工作流状态机
- Run 生命周期管理
- 异步任务编排

### `apps/api`

- HTTP 路由
- WebSocket / SSE 传输适配
- 认证、鉴权、日志、错误处理
- 组合 services / agents / workflow

### `apps/web` / `apps/review-console`

- Vue 前端入口
- API client、UI 状态与页面交互
- 不直接访问数据库或 AI provider

### `apps/mcp-server`

- stdio 协议
- MCP tool 定义
- 把 tool 请求转给 services / agents

### `apps/electron`

- 桌面壳
- 打包、预加载、窗口管理
- 组合 `apps/web` 产物与本地能力

---

## 6. 依赖方向

```text
kernel
  ├── db
  ├── ai-providers
  └── storage

db + ai-providers + storage + kernel
  └── services

services + ai-providers + storage + kernel
  └── agents

db + services + agents + kernel
  └── workflow

services + agents + workflow + kernel
  ├── apps/api
  └── apps/mcp-server

apps/api
  ├── apps/web
  ├── apps/review-console
  └── apps/electron
```

规则：

- `kernel` 不依赖任何业务包
- `apps/*` 不允许反向被 `packages/*` 依赖
- `apps/web` 和 `apps/review-console` 通过 API 消费后端，不直接跨包读取服务实现
- Electron 不承载后端业务逻辑，只消费明确暴露的入口

---

## 7. 当前 Phase 0 基线

当前已经落地的只有：

- 根目录 workspace 协调器
- `packages/kernel`
- `apps/api` 的最小 `/health` 链路
- 四个正式占位 app 包

Phase 0 的目的不是交付完整功能，而是验证：

- pnpm workspace 是否成型
- Turbo pipeline 是否可用
- TypeScript project references 是否连通
- 共享包能否被运行包直接消费

---

## 8. 后续阶段顺序

### Phase 1: `packages/db`（见 `01-database-layer.md`）

- 建立 PostgreSQL / Knex 基础设施
- 定义 migrations、schema、repository

### Phase 2: `packages/ai-providers` + `packages/storage`（见 `02-ai-providers-storage.md`）

- 把 AI 与文件存储提取为独立可复用包

### Phase 3: `packages/services`（见 `03-application-services.md`）

- 形成项目、小说、剧本、分镜、素材、视频等领域服务

### Phase 4: `packages/agents`（见 `04-agent-runtime.md`）

- 提取 Agent 运行时
- 向上暴露统一事件与调用协议

### Phase 5: `packages/workflow`（见 `05-workflow-engine.md`）

- 构建工作流状态机
- 组合 services 与 agents 管理 Run 生命周期

### Phase 6: `apps/api`（见 `06-api-gateway.md`）

- `apps/api` 扩展为正式 API Gateway

### Phase 7: `apps/mcp-server`（见 `07-mcp-server.md`）

- `apps/mcp-server` 通过 stdio 暴露 Toonflow 能力

### Phase 8: `apps/web`（见 `08-creator-console.md`）

- Creator Console 正式落地

### Phase 9: `apps/review-console`（见 `09-review-console.md`）

- Review Console 正式落地

---

## 9. 实施规则

- 不恢复 root `src/`、`web/`、`build/`、Yarn、旧 Electron 打包脚本
- 不保留旧静态前端产物作为长期运行时
- 不通过全局 `u`、转发层或兼容层把旧架构搬回新仓库
- 只有当一个类型或错误模型被两个及以上包共享时，才进入 `packages/kernel`
- 每个 phase 都应提供可验证的最小结果，而不是一次性铺满整个目标目录

---

## 10. 配套文档

- 当前基线：`00-monorepo-skeleton.md`
- 数据库层：`01-database-layer.md`
- AI 与存储：`02-ai-providers-storage.md`
- 应用服务层：`03-application-services.md`
- Agent 运行时：`04-agent-runtime.md`
- 工作流引擎：`05-workflow-engine.md`
- API Gateway：`06-api-gateway.md`
- MCP Server：`07-mcp-server.md`
- Creator Console：`08-creator-console.md`
- Review Console：`09-review-console.md`
