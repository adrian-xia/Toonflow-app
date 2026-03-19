# CLAUDE.md

This repository is now a Phase 0 pnpm monorepo skeleton.

## 当前状态

- 根目录只负责 workspace 编排，不再承载旧单体运行时代码
- 当前真正可运行的只有 `apps/api` 与 `packages/kernel`
- `apps/web`、`apps/review-console`、`apps/mcp-server`、`apps/electron` 目前都是正式占位包
- 旧的根级 `src/`、`web/`、`build/`、Yarn 构建链路、预构建前端产物与兼容层都不应重新引入

## 开发命令

```bash
pnpm install
pnpm dev
pnpm build
pnpm lint
pnpm typecheck
pnpm --filter @toonflow/kernel test
pnpm --filter @toonflow/api test
curl http://127.0.0.1:3001/health
```

## 目录约束

- `apps/api`：最小 Express HTTP 壳，当前只验证 `/health`
- `packages/kernel`：共享响应 envelope、错误模型、健康检查类型
- 其他 `apps/*`：只保留包边界与 no-op 脚本，占位，不放真实运行时
- 根目录配置文件只承担协调职责，不放业务入口

## 架构规则

- 结构性改动前先阅读 `docs/refactoring/architecture-overview.md`
- 当前阶段同时阅读 `docs/refactoring/00-monorepo-skeleton.md`
- Phase 0 是冷启动骨架，不做旧单体兼容迁移
- 不要恢复旧 Docker 路径、旧 Electron 构建脚本、旧前端静态目录或 `u` 风格全局兼容入口
- `packages/kernel` 必须保持纯净：无 IO、无数据库连接、无框架耦合
- `apps/api` 只做 HTTP 壳与共享契约验证，不提前塞入 services/db/agents/workflow 空抽象

## 文档与提交

- 文档以中文为主，新增说明优先与当前 Phase 0 口径保持一致
- 提交保持单一主题，优先使用 `chore:`、`feat:`、`fix:`、`docs:` 前缀
