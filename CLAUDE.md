# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

Toonflow 是一款 AI 驱动的短剧制作工具，可将小说转换为剧本、生成分镜并使用 AI 制作视频。应用采用 Electron 桌面端架构，后端为 Express API 服务。

**技术栈：**
- 后端：Node.js + Express + TypeScript
- 数据库：SQLite (better-sqlite3)
- AI 集成：Vercel AI SDK，支持多个提供商（OpenAI、Anthropic、DeepSeek、Google、xAI、Qwen、Zhipu）
- 桌面端：Electron
- 图像处理：Sharp
- 前端：预构建静态文件位于 `scripts/web/`（独立仓库：Toonflow-web）

## 开发命令

```bash
# 安装依赖
yarn install

# 开发模式 - 仅后端 API（端口 60000）
yarn dev

# 开发模式 - 完整 Electron 桌面应用（含 GUI）
yarn dev:gui

# 类型检查
yarn lint

# 构建 TypeScript 到 JavaScript
yarn build

# 打包发布版本
yarn dist:win    # Windows
yarn dist:mac    # macOS
yarn dist:linux  # Linux

# AI SDK 调试工具
yarn debug:ai
```

## 架构设计

### 核心应用流程

1. **入口点 (`src/app.ts`)**：Express 服务器初始化，包含 JWT 认证中间件
2. **路由生成 (`src/core.ts`)**：从 `src/routes/**/*.ts` 文件自动生成路由（基于文件的路由系统）
3. **数据库 (`src/lib/initDB.ts`)**：SQLite 数据库模式初始化，包含项目、小说、剧本、分镜、素材、视频等表
4. **工具函数 (`src/utils.ts`)**：统一导出数据库、AI 服务、图像处理和辅助函数

### 基于文件的路由系统

路由从 `src/routes/` 目录结构自动生成：
- 文件路径决定路由 URL（例如：`src/routes/project/addProject.ts` → `/project/addProject`）
- 每个路由文件导出一个 Express router
- `src/router.ts` 由 `src/core.ts` 自动生成 - **切勿手动编辑**

### AI 集成架构

项目在 `src/utils/ai/` 中使用统一的 AI 抽象层：
- **文本 AI** (`text/`)：用于剧本生成、角色分析、对话的 LLM 提供商
- **图像 AI** (`image/`)：图像生成模型（Nano Banana Pro）
- **视频 AI** (`video/`)：视频生成服务（Sora、豆包/字节跳动）

AI 模型在数据库中配置（`t_aiModel` 表），通过 `u.ai.text()`、`u.ai.image()`、`u.ai.video()` 访问。

**AI 调用模式：**
- `ai.invoke()`：同步调用，返回完整结果（支持 `output` 参数进行结构化输出）
- `ai.stream()`：流式调用，实时返回生成内容
- 支持 `tools` 参数进行函数调用（Vercel AI SDK 的 tool calling）
- 响应格式根据厂商自动适配（`schema` 或 `object` 模式）

### Agent 系统

`src/agents/` 中的 AI Agent 处理复杂的多步骤工作流：
- **outlineScript**：从小说生成故事大纲和剧本
- **storyboard**：创建视觉分镜，包含镜头描述、图像提示词和素材标签

Agent 使用 Vercel AI SDK 的 tool calling 能力实现结构化输出，并通过 EventEmitter 发送实时进度。

### 数据库模式

核心表（完整模式见 `src/lib/initDB.ts`）：
- `t_project`：顶层项目
- `t_novel`：小说章节和内容
- `t_outline`：故事大纲和事件
- `t_storyline`：角色故事线
- `t_script`：生成的剧本
- `t_storyboard`：视觉分镜和镜头
- `t_assets`：角色、道具、场景及其图像
- `t_video`：生成的视频片段
- `t_aiModel`：AI 模型配置
- `t_user`：用户认证（默认：admin/admin123）

### 环境配置

环境变量从 `env/.env.{NODE_ENV}` 加载：
- `NODE_ENV`：dev 或 prod
- `PORT`：服务器端口（默认：60000）
- `OSSURL`：文件上传的基础 URL

在 Electron 打包模式下，env 文件存储在应用的 userData 目录中。

### 文件上传

上传文件存储位置：
- 开发环境：`./uploads/`
- Electron 环境：`{userData}/uploads/`

静态文件由 Express 直接提供服务。

## 核心工作流

### 小说 → 剧本 → 分镜 → 视频

1. **小说导入**：上传小说文本，拆分为章节（`src/routes/novel/`）
2. **大纲生成**：AI 分析小说并创建包含事件的故事大纲（`src/routes/outline/agentsOutline.ts`）
3. **剧本生成**：将大纲事件转换为对话剧本（`src/routes/script/generateScriptApi.ts`）
4. **分镜创建**：生成带图像提示词的视觉镜头（`src/routes/storyboard/generateStoryboardApi.ts`）
5. **素材生成**：创建角色/场景图像（`src/routes/assets/generateAssets.ts`）
6. **视频制作**：从分镜生成视频片段（`src/routes/video/generateVideo.ts`）

### WebSocket 实时通信

Agent 路由（如 `agentsOutline.ts`）使用 WebSocket 进行实时通信：
- 通过 `express-ws` 实现 WebSocket 支持
- Agent 通过 EventEmitter 发送事件（`data`、`response`、`subAgentStream` 等）
- 前端通过 WebSocket 接收实时进度和流式输出

### 认证机制

基于 JWT 的认证，token 存储在数据库中（`t_setting.tokenKey`）。除 `/other/login` 外，所有路由都需要在 `Authorization` header 或 `token` 查询参数中提供有效 token。

## 重要注意事项

- **路由自动生成**：切勿手动编辑 `src/router.ts` - 它在每次开发服务器启动时从 `src/routes/` 重新生成
- **路径别名**：使用 `@/` 引用 `src/` 目录（在 tsconfig.json 中配置）
- **数据库访问**：始终使用 `u.db()`（Knex 实例）进行数据库查询
- **AI 模型选择**：模型在数据库中按项目配置，而非硬编码
- **Electron vs 独立模式**：相同的后端代码可在 Electron 和独立 Node.js 模式下运行
- **中文项目**：这是一个中文语言项目 - 注释、UI 文本和文档主要使用中文

## PR 提交规范

- PR 必须提交到 `develop` 分支，**不能**提交到 `master`
- `master` 分支受保护，不接受 PR
