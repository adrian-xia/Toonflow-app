# Phase 0: Monorepo 骨架 + 共享内核

## 目标

建立工程基础，现有代码原封不动可运行。

---

## 0.1 初始化 Monorepo

### 当前状态

- 包管理器：yarn 1.x
- 无 workspace 配置
- 单一 package.json
- tsconfig.json: target ESNext, module CommonJS, paths `@/*` → `src/*`

### 迁移步骤

**1. 引入 pnpm-workspace.yaml**

```yaml
packages:
  - 'apps/*'
  - 'packages/*'
```

**2. 引入 turbo.json**

```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "lint": {
      "dependsOn": ["^build"]
    }
  }
}
```

**3. 现有代码整体移入 `apps/api/`**

**4. 调整 tsconfig paths，保持 `@/*` 别名可用**

**5. 根目录 tsconfig.json 作为 base config，apps/api 继承**

### 目录结构变化

```
toonflow/
├── apps/
│   └── api/                    # 现有代码整体迁入
│       ├── src/
│       ├── package.json        # 从根 package.json 演化
│       └── tsconfig.json       # 继承根 tsconfig
├── packages/
│   └── kernel/                 # 新建
├── pnpm-workspace.yaml         # 新建
├── turbo.json                  # 新建
├── tsconfig.base.json          # 新建（公共编译选项）
└── package.json                # 根 package.json（workspace 脚本）
```

---

## 0.2 创建 @toonflow/kernel

### 类型提取清单

**从 `src/agents/outlineScript/index.ts` 提取：**

```typescript
// packages/kernel/src/types/agent.ts
type AgentType = "AI1" | "AI2" | "director";
type AssetType = "角色" | "道具" | "场景";
type RefreshEvent = "storyline" | "outline" | "assets";

interface AssetItem {
  name: string;
  description: string;
}

interface EpisodeData {
  episodeIndex: number;
  title: string;
  chapterRange: number[];
  scenes: AssetItem[];
  characters: AssetItem[];
  props: AssetItem[];
  coreConflict: string;
  outline: string;
  openingHook: string;
  keyEvents: string[];
  emotionalCurve: string;
  visualHighlights: string[];
  endingHook: string;
  classicQuotes: string[];
}
```

**从 `src/agents/storyboard/index.ts` 提取：**

```typescript
// packages/kernel/src/types/storyboard.ts
type StoryboardAgentType = "segmentAgent" | "shotAgent";

interface Segment {
  index: number;
  description: string;
  emotion?: string;
  action?: string;
}

interface Shot {
  id: string;
  segmentId: number;
  title: string;
  x: number;
  y: number;
  cells: any[];
  fragmentContent: string;
  assetsTags: any;
}

interface AssetsType {
  type: "role" | "props" | "scene";
  text: string;
}
```

**从 `src/utils/ai/text/index.ts` 和 `src/utils/ai/image/type.ts` 提取：**

```typescript
// packages/kernel/src/types/ai.ts
interface AIConfig {
  // AI 模型配置接口
}

interface AIInput {
  system?: string;
  messages: any[];
  tools?: Record<string, any>;
  maxStep?: number;
  output?: any;
}
```

### Schema 提取

将 `episodeSchema` 等 Zod schema 也提取到 kernel：

```typescript
// packages/kernel/src/schemas/episode.ts
import { z } from "zod";
export const episodeSchema = z.object({ ... });
```

### 统一状态枚举

```typescript
// packages/kernel/src/enums.ts
export enum VideoState {
  Failed = -1,
  Pending = 0,
  Generating = 1,
  Completed = 2,
}

export enum AssetState { ... }
export enum WorkflowState { ... }
export enum ReviewDecision { ... }
```

### 统一响应格式

替代 `src/lib/responseFormat.ts`：

```typescript
// packages/kernel/src/response.ts
export interface ApiResponse<T = any> {
  code: number;
  data: T | null;
  message: string;
}

export function success<T>(data: T | null = null, message = "成功"): ApiResponse<T> {
  return { code: 200, data, message };
}

export function error<T>(message = "", data: T | null = null): ApiResponse<T> {
  return { code: 400, data, message };
}
```

### 统一错误类型

替代 `src/err.ts`（全局错误处理）和 `src/utils/error.ts`（normalizeError）：

```typescript
// packages/kernel/src/errors.ts
export class AppError extends Error {
  constructor(
    message: string,
    public code: number = 400,
    public data?: any
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export function normalizeError(err: unknown): { message: string; stack?: string } { ... }
```

### kernel 包结构

```
packages/kernel/
├── src/
│   ├── index.ts          # 统一导出
│   ├── types/
│   │   ├── agent.ts      # Agent 相关类型
│   │   ├── storyboard.ts # 分镜相关类型
│   │   ├── ai.ts         # AI 配置类型
│   │   └── index.ts      # 类型统一导出
│   ├── schemas/
│   │   ├── episode.ts    # EpisodeData schema
│   │   └── index.ts
│   ├── enums.ts          # 状态枚举
│   ├── response.ts       # 统一响应格式
│   └── errors.ts         # 统一错误类型
├── package.json
└── tsconfig.json
```

### package.json

```json
{
  "name": "@toonflow/kernel",
  "version": "0.0.1",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch"
  },
  "dependencies": {
    "zod": "^4.3.5"
  }
}
```

---

## 0.3 兼容层

### 迁移策略

`apps/api/` 中的代码通过 re-export 从 `@toonflow/kernel` 导入类型，保持现有代码不变：

```typescript
// apps/api/src/agents/outlineScript/index.ts 修改
// 旧：本地定义 EpisodeData, AssetItem 等
// 新：
import { EpisodeData, AssetItem, AgentType, AssetType, RefreshEvent } from "@toonflow/kernel";
```

### 验证标准

- `pnpm dev` 在 apps/api 中正常启动
- `pnpm lint` 通过类型检查
- 现有所有路由功能不受影响
- kernel 包可独立构建

---

## 风险与注意事项

- yarn → pnpm 迁移需要删除 yarn.lock，生成 pnpm-lock.yaml
- tsconfig paths 需要同时在 tsconfig 和 package.json 中配置
- Electron 相关的构建脚本需要适配 monorepo 结构
- `src/router.ts` 自动生成逻辑（`src/core.ts`）需要适配新路径
