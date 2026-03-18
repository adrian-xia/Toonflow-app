# Toonflow Phase 0 Monorepo Skeleton Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将当前仓库直接替换为新的 monorepo 骨架，落地 `apps/api` 与 `packages/kernel` 的最小可运行链路，并为 `apps/web`、`apps/review-console`、`apps/mcp-server`、`apps/electron` 建立正式占位包。

**Architecture:** 根目录只保留 pnpm/turbo/TypeScript references 的编排职责；`packages/kernel` 提供统一响应、错误和健康检查类型；`apps/api` 通过最小 Express 健康检查接口验证共享包、构建链路和运行链路。旧单体代码不做兼容迁移，直接删除后由新结构原位替代。

**Tech Stack:** pnpm workspace, Turborepo, TypeScript project references, Node.js, Express 5, Zod, tsx, node:test, supertest

---

## File Structure

### Root Coordinator

- Modify: `package.json` - 改为 monorepo 根协调器，仅保留 workspace 级脚本和公共开发依赖
- Modify: `.gitignore` - 补充 `.turbo/` 等 monorepo 产物忽略规则
- Modify: `README.md` - 更新为 Phase 0 的 pnpm 启动方式和目录结构
- Modify: `tsconfig.json` - 改为 references 聚合入口
- Create: `pnpm-workspace.yaml` - 声明 `apps/*` 与 `packages/*`
- Create: `turbo.json` - 定义 `build`、`dev`、`lint`、`typecheck`
- Create: `tsconfig.base.json` - 放公共 TS 编译选项
- Delete: `src/` - 删除旧根级后端实现
- Delete: `web/` - 删除旧根级前端实现
- Delete: `build/` - 删除旧构建产物
- Delete: `scripts/build.ts` - 删除旧单体构建脚本
- Delete: `scripts/main.ts` - 删除旧 Electron 启动脚本
- Delete: `electron-builder.yml` - 删除旧桌面打包配置
- Delete: `yarn.lock`
- Delete: `web/yarn.lock`

### Shared Kernel

- Create: `packages/kernel/package.json`
- Create: `packages/kernel/tsconfig.json`
- Create: `packages/kernel/src/index.ts`
- Create: `packages/kernel/src/response.ts`
- Create: `packages/kernel/src/errors.ts`
- Create: `packages/kernel/src/types/health.ts`
- Create: `packages/kernel/test/kernel.test.ts`

### API App

- Create: `apps/api/package.json`
- Create: `apps/api/tsconfig.json`
- Create: `apps/api/src/main.ts`
- Create: `apps/api/src/app.ts`
- Create: `apps/api/src/routes/health.ts`
- Create: `apps/api/src/middleware/error-handler.ts`
- Create: `apps/api/test/health.test.ts`

### Placeholder Apps

- Create: `apps/web/package.json`
- Create: `apps/web/tsconfig.json`
- Create: `apps/review-console/package.json`
- Create: `apps/review-console/tsconfig.json`
- Create: `apps/mcp-server/package.json`
- Create: `apps/mcp-server/tsconfig.json`
- Create: `apps/electron/package.json`
- Create: `apps/electron/tsconfig.json`

### Docs

- Modify: `docs/refactoring/00-monorepo-skeleton.md` - 改写为“新项目冷启动版 Phase 0”

## Implementation Rules

- 发现旧实现与新骨架冲突时，直接删除旧实现，不做转发层、兼容层或双轨运行。
- 根目录 `tsconfig.json` 只引用真实可编译包：`packages/kernel` 与 `apps/api`。占位包保留本地 `tsconfig.json`，但先不加入根 references。
- Turbo 只编排 `build`、`dev`、`lint`、`typecheck`。不要在 Phase 0 把 `test` 提升为 workspace pipeline。
- `packages/kernel` 中的内容必须无副作用、无 IO、无运行时容器依赖。
- `apps/api` 只做最小 HTTP 壳，不预埋 service/db/agent/workflow 空抽象。

### Task 1: Replace the Root With a Workspace Coordinator

**Files:**
- Delete: `src/`
- Delete: `web/`
- Delete: `build/`
- Delete: `scripts/build.ts`
- Delete: `scripts/main.ts`
- Delete: `electron-builder.yml`
- Delete: `yarn.lock`
- Delete: `web/yarn.lock`
- Modify: `package.json`
- Modify: `.gitignore`
- Modify: `tsconfig.json`
- Create: `pnpm-workspace.yaml`
- Create: `turbo.json`
- Create: `tsconfig.base.json`
- Create: `apps/api/package.json`
- Create: `apps/api/tsconfig.json`
- Create: `packages/kernel/package.json`
- Create: `packages/kernel/tsconfig.json`
- Create: `apps/web/package.json`
- Create: `apps/web/tsconfig.json`
- Create: `apps/review-console/package.json`
- Create: `apps/review-console/tsconfig.json`
- Create: `apps/mcp-server/package.json`
- Create: `apps/mcp-server/tsconfig.json`
- Create: `apps/electron/package.json`
- Create: `apps/electron/tsconfig.json`

- [ ] **Step 1: 删除旧单体根实现**

```bash
rm -rf src web build
rm -f scripts/build.ts scripts/main.ts electron-builder.yml yarn.lock web/yarn.lock
```

- [ ] **Step 2: 将根 `package.json` 改成纯 workspace 协调器**

```json
{
  "name": "toonflow",
  "private": true,
  "packageManager": "pnpm@10.0.0",
  "scripts": {
    "dev": "pnpm --filter @toonflow/api dev",
    "build": "turbo run build",
    "lint": "turbo run lint",
    "typecheck": "turbo run typecheck"
  },
  "devDependencies": {
    "@types/node": "^24.0.0",
    "tsx": "^4.21.0",
    "turbo": "^2.0.0",
    "typescript": "^5.9.3"
  }
}
```

- [ ] **Step 3: 新增根配置文件**

`pnpm-workspace.yaml`

```yaml
packages:
  - apps/*
  - packages/*
```

`turbo.json`

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
    "lint": {},
    "typecheck": {}
  }
}
```

`tsconfig.base.json`

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "CommonJS",
    "moduleResolution": "Node",
    "strict": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "skipLibCheck": true,
    "resolveJsonModule": true
  }
}
```

根 `tsconfig.json`

```json
{
  "files": [],
  "references": [
    { "path": "./packages/kernel" },
    { "path": "./apps/api" }
  ]
}
```

- [ ] **Step 4: 为 6 个 workspace 包建立 package manifests 与 tsconfig**

先确保包名精确固定：

- `apps/api` -> `@toonflow/api`
- `packages/kernel` -> `@toonflow/kernel`
- `apps/web` -> `@toonflow/web`
- `apps/review-console` -> `@toonflow/review-console`
- `apps/mcp-server` -> `@toonflow/mcp-server`
- `apps/electron` -> `@toonflow/electron`

真实包脚本先写空壳，后续任务补源码；占位包使用 no-op 脚本：

```json
{
  "name": "@toonflow/web",
  "private": true,
  "scripts": {
    "build": "node -e \"console.log('placeholder build: @toonflow/web')\"",
    "dev": "node -e \"console.log('placeholder dev: @toonflow/web')\"",
    "lint": "node -e \"process.exit(0)\"",
    "typecheck": "node -e \"process.exit(0)\""
  }
}
```

占位包 `tsconfig.json` 统一使用：

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "composite": false,
    "noEmit": true
  },
  "files": []
}
```

- [ ] **Step 5: 更新 `.gitignore` 以适配 monorepo 输出**

至少补上：

```gitignore
.turbo/
apps/*/dist
packages/*/dist
```

- [ ] **Step 6: 安装依赖并确认 workspace 已被识别**

Run: `pnpm install`  
Expected: 生成 `pnpm-lock.yaml`，日志中出现 `Scope: all 6 workspace projects`

- [ ] **Step 7: 列出 workspace 包，确认 6 个包全部注册**

Run: `pnpm list -r --depth -1`  
Expected: 输出中至少包含 `@toonflow/api`、`@toonflow/kernel`、`@toonflow/web`、`@toonflow/review-console`、`@toonflow/mcp-server`、`@toonflow/electron`

- [ ] **Step 8: Commit**

```bash
git add package.json pnpm-workspace.yaml turbo.json tsconfig.base.json tsconfig.json .gitignore pnpm-lock.yaml apps packages
git commit -m "chore: scaffold monorepo workspace"
```

### Task 2: Implement the Shared Kernel Contract

**Files:**
- Modify: `packages/kernel/package.json`
- Modify: `packages/kernel/tsconfig.json`
- Create: `packages/kernel/src/index.ts`
- Create: `packages/kernel/src/response.ts`
- Create: `packages/kernel/src/errors.ts`
- Create: `packages/kernel/src/types/health.ts`
- Create: `packages/kernel/test/kernel.test.ts`

- [ ] **Step 1: 先写 `packages/kernel` 的失败测试，锁定响应与错误契约**

`packages/kernel/test/kernel.test.ts`

```ts
import test from "node:test";
import assert from "node:assert/strict";
import { AppError, ErrorCode, fail, normalizeError, ok } from "../src";

test("ok wraps payload in a success envelope", () => {
  assert.deepEqual(ok({ status: "ok" }), {
    ok: true,
    data: { status: "ok" }
  });
});

test("fail returns normalized error metadata", () => {
  assert.deepEqual(fail(ErrorCode.INTERNAL_ERROR, "boom"), {
    ok: false,
    error: { code: ErrorCode.INTERNAL_ERROR, message: "boom" }
  });
});

test("normalizeError converts unknown values into AppError", () => {
  const normalized = normalizeError(new Error("bad"));
  assert.equal(normalized instanceof AppError, true);
  assert.equal(normalized.code, ErrorCode.INTERNAL_ERROR);
});
```

- [ ] **Step 2: 运行测试，确认它先失败**

Run: `pnpm --filter @toonflow/kernel test`  
Expected: FAIL，报错原因是 `../src` 或导出的 `ok` / `fail` / `normalizeError` 尚不存在

- [ ] **Step 3: 实现 `kernel` 源码**

`packages/kernel/src/response.ts`

```ts
export interface SuccessResponse<T> {
  ok: true;
  data: T;
}

export interface ErrorResponse {
  ok: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export type ApiResponse<T> = SuccessResponse<T> | ErrorResponse;

export function ok<T>(data: T): SuccessResponse<T> {
  return { ok: true, data };
}

export function fail(code: string, message: string, details?: unknown): ErrorResponse {
  return {
    ok: false,
    error: details === undefined ? { code, message } : { code, message, details }
  };
}
```

`packages/kernel/src/errors.ts`

```ts
export enum ErrorCode {
  INTERNAL_ERROR = "INTERNAL_ERROR",
  VALIDATION_ERROR = "VALIDATION_ERROR"
}

export class AppError extends Error {
  constructor(
    public code: ErrorCode,
    message: string,
    public status: number = 500,
    public details?: unknown
  ) {
    super(message);
    this.name = "AppError";
  }
}

export function normalizeError(error: unknown): AppError {
  if (error instanceof AppError) return error;
  if (error instanceof Error) return new AppError(ErrorCode.INTERNAL_ERROR, error.message, 500);
  return new AppError(ErrorCode.INTERNAL_ERROR, "Unknown error", 500, error);
}
```

`packages/kernel/src/types/health.ts`

```ts
export interface HealthPayload {
  status: "ok";
  service: "api";
  timestamp: string;
}
```

`packages/kernel/src/index.ts`

```ts
export * from "./errors";
export * from "./response";
export * from "./types/health";
```

- [ ] **Step 4: 给 `kernel` 补齐脚本与依赖**

`packages/kernel/package.json`

```json
{
  "name": "@toonflow/kernel",
  "private": true,
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsc -b",
    "lint": "tsc --pretty false --noEmit -p tsconfig.json",
    "typecheck": "tsc --pretty false --noEmit -p tsconfig.json",
    "test": "node --import tsx --test test/**/*.test.ts"
  },
  "dependencies": {
    "zod": "^4.3.5"
  }
}
```

`packages/kernel/tsconfig.json`

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "composite": true,
    "rootDir": "src",
    "outDir": "dist"
  },
  "include": ["src/**/*.ts"]
}
```

- [ ] **Step 5: 运行测试，确认契约通过**

Run: `pnpm --filter @toonflow/kernel test`  
Expected: PASS，3 个测试全部通过

- [ ] **Step 6: 运行构建与类型检查**

Run: `pnpm --filter @toonflow/kernel build && pnpm --filter @toonflow/kernel typecheck`  
Expected: PASS，生成 `packages/kernel/dist/`

- [ ] **Step 7: Commit**

```bash
git add packages/kernel
git commit -m "feat: add shared kernel primitives"
```

### Task 3: Implement the Minimal API Health Endpoint

**Files:**
- Modify: `apps/api/package.json`
- Modify: `apps/api/tsconfig.json`
- Create: `apps/api/src/main.ts`
- Create: `apps/api/src/app.ts`
- Create: `apps/api/src/routes/health.ts`
- Create: `apps/api/src/middleware/error-handler.ts`
- Create: `apps/api/test/health.test.ts`

- [ ] **Step 1: 先写健康检查失败测试**

`apps/api/test/health.test.ts`

```ts
import test from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import { createApp } from "../src/app";

test("GET /health returns the kernel success envelope", async () => {
  const response = await request(createApp()).get("/health");

  assert.equal(response.status, 200);
  assert.equal(response.body.ok, true);
  assert.equal(response.body.data.status, "ok");
  assert.equal(response.body.data.service, "api");
  assert.match(response.body.data.timestamp, /^\d{4}-\d{2}-\d{2}T/);
});
```

- [ ] **Step 2: 运行测试，确认它先失败**

Run: `pnpm --filter @toonflow/api test`  
Expected: FAIL，报错原因是 `../src/app`、`createApp` 或 `/health` 路由尚不存在

- [ ] **Step 3: 实现 `apps/api` 的最小应用壳**

`apps/api/src/routes/health.ts`

```ts
import { Router } from "express";
import { HealthPayload, ok } from "@toonflow/kernel";

const router = Router();

router.get("/", (_req, res) => {
  const payload: HealthPayload = {
    status: "ok",
    service: "api",
    timestamp: new Date().toISOString()
  };

  res.status(200).json(ok(payload));
});

export default router;
```

`apps/api/src/middleware/error-handler.ts`

```ts
import type { NextFunction, Request, Response } from "express";
import { fail, normalizeError } from "@toonflow/kernel";

export function errorHandler(error: unknown, _req: Request, res: Response, _next: NextFunction) {
  const normalized = normalizeError(error);
  res.status(normalized.status).json(
    fail(normalized.code, normalized.message, normalized.details)
  );
}
```

`apps/api/src/app.ts`

```ts
import express from "express";
import healthRouter from "./routes/health";
import { errorHandler } from "./middleware/error-handler";

export function createApp() {
  const app = express();
  app.use(express.json());
  app.use("/health", healthRouter);
  app.use(errorHandler);
  return app;
}
```

`apps/api/src/main.ts`

```ts
import { createApp } from "./app";

const port = Number(process.env.PORT ?? 3001);

createApp().listen(port, () => {
  console.log(`[api] listening on http://127.0.0.1:${port}`);
});
```

- [ ] **Step 4: 给 `apps/api` 补齐依赖、脚本和 TS references**

`apps/api/package.json`

```json
{
  "name": "@toonflow/api",
  "private": true,
  "main": "dist/main.js",
  "types": "dist/main.d.ts",
  "scripts": {
    "build": "tsc -b",
    "dev": "tsx watch src/main.ts",
    "lint": "tsc --pretty false --noEmit -p tsconfig.json",
    "typecheck": "tsc --pretty false --noEmit -p tsconfig.json",
    "test": "node --import tsx --test test/**/*.test.ts"
  },
  "dependencies": {
    "@toonflow/kernel": "workspace:*",
    "express": "^5.2.1"
  },
  "devDependencies": {
    "@types/express": "^5.0.6",
    "@types/supertest": "^6.0.3",
    "supertest": "^7.1.1"
  }
}
```

`apps/api/tsconfig.json`

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "composite": true,
    "rootDir": "src",
    "outDir": "dist"
  },
  "references": [{ "path": "../../packages/kernel" }],
  "include": ["src/**/*.ts"]
}
```

- [ ] **Step 5: 运行 API 测试，确认健康检查契约通过**

Run: `pnpm --filter @toonflow/api test`  
Expected: PASS，健康检查测试通过

- [ ] **Step 6: 运行 API 构建与类型检查**

Run: `pnpm --filter @toonflow/api build && pnpm --filter @toonflow/api typecheck`  
Expected: PASS，且 `apps/api/dist/` 成功生成

- [ ] **Step 7: 手动启动 API 并验证健康检查**

Run: `PORT=3001 pnpm --filter @toonflow/api dev`  
Expected: 日志输出 `[api] listening on http://127.0.0.1:3001`

另开终端运行: `curl http://127.0.0.1:3001/health`  
Expected:

```json
{
  "ok": true,
  "data": {
    "status": "ok",
    "service": "api",
    "timestamp": "2026-03-19T12:00:00.000Z"
  }
}
```

- [ ] **Step 8: Commit**

```bash
git add apps/api
git commit -m "feat: add api health entrypoint"
```

### Task 4: Align the Docs and Run End-to-End Verification

**Files:**
- Modify: `README.md`
- Modify: `docs/refactoring/00-monorepo-skeleton.md`

- [ ] **Step 1: 重写 `docs/refactoring/00-monorepo-skeleton.md`**

把文档从“旧单体迁移”改成“新项目冷启动骨架”，至少同步以下结论：

- Phase 0 是新项目初始化，不再讨论兼容迁移
- 真正可运行的只有 `apps/api` 与 `packages/kernel`
- `apps/web`、`apps/review-console`、`apps/mcp-server`、`apps/electron` 只做占位包
- 工具链固定为 `pnpm workspace + turbo + TypeScript project references`
- 旧实现冲突时直接删除，不做兼容层

- [ ] **Step 2: 更新 `README.md` 的启动方式和结构说明**

至少包含：

- `pnpm install`
- `pnpm dev`
- `pnpm build`
- `pnpm typecheck`
- `curl http://127.0.0.1:3001/health`
- `apps/` 与 `packages/` 的目录说明

- [ ] **Step 3: 执行 Phase 0 的完整验证命令**

Run:

```bash
pnpm lint
pnpm build
pnpm typecheck
pnpm --filter @toonflow/kernel test
pnpm --filter @toonflow/api test
```

Expected: 全部 PASS，Turbo 中 6 个 workspace 包的 `build` / `lint` / `typecheck` 任务都没有失败

- [ ] **Step 4: 再做一次运行态健康检查**

Run:

```bash
PORT=3001 pnpm --filter @toonflow/api dev
curl http://127.0.0.1:3001/health
```

Expected: 返回 `kernel` 统一成功 envelope，且 `service` 固定为 `"api"`

- [ ] **Step 5: 检查工作区，只保留预期的新结构**

Run: `git status --short`  
Expected:

- 不再出现 `src/`、`web/`、`build/` 等旧运行目录
- 变更集中在 `apps/`、`packages/`、根配置和文档
- 没有为了兼容旧结构保留下来的中间层文件

- [ ] **Step 6: Commit**

```bash
git add README.md docs/refactoring/00-monorepo-skeleton.md
git commit -m "docs: finalize phase 0 monorepo skeleton"
```

## Execution Notes

- 如果某个旧文件仍被新脚本引用，不要加兼容代码，直接修改调用方到新路径。
- 如果实现过程中发现某个占位包的 no-op 脚本妨碍 Turbo，可保留 no-op，但不要让它变成真实运行时。
- 只有当某个类型/错误模型被两个及以上包共享时，才允许放进 `packages/kernel`。
- `apps/api` 之外的运行入口全部留到后续阶段，不要在本计划中扩 scope。
