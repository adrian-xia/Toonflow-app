# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 当前阶段（Phase 0）

仓库已经切换到 monorepo skeleton，根目录仅负责 workspace 协调，不再承载旧单体 `src/` / `web/` 实现。

- 包管理器：`pnpm@10`
- 工作区：`apps/*`、`packages/*`
- 已注册包：
  - `@toonflow/api`
  - `@toonflow/web`
  - `@toonflow/review-console`
  - `@toonflow/mcp-server`
  - `@toonflow/electron`
  - `@toonflow/kernel`

## 常用命令

```bash
# 安装依赖
pnpm install

# 查看 workspace 注册
pnpm list -r --depth -1

# 根级任务（turbo）
pnpm dev
pnpm build
pnpm lint
pnpm typecheck

# 按包执行
pnpm --filter @toonflow/api dev
pnpm --filter @toonflow/web build
```

## 约束

- 不要假设旧 `src/`、`web/`、`build/` 目录仍存在。
- 在 Phase 0 只维护 skeleton 与 workspace 协调能力，业务源码由后续任务补齐。
- 提交前优先确认 workspace 安装与包识别正常。
