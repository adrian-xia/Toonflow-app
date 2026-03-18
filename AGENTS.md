# Repository Guidelines

## 项目结构
当前仓库处于 Phase 0 monorepo skeleton：根目录仅做 workspace 协调。应用位于 `apps/*`，共享包位于 `packages/*`。当前已注册包为 `apps/api`、`apps/web`、`apps/review-console`、`apps/mcp-server`、`apps/electron` 与 `packages/kernel`。设计与重构文档集中在 `docs/`，开始结构性改动前先看 `docs/refactoring/architecture-overview.md`。

## 构建、测试与开发命令
根目录使用 pnpm + turbo：

- `pnpm dev`：转发到 `@toonflow/api` 的 `dev` 脚本
- `pnpm build`：执行全 workspace `build`（`turbo run build`）
- `pnpm lint`：执行全 workspace `lint`（`turbo run lint`）
- `pnpm typecheck`：执行全 workspace `typecheck`（`turbo run typecheck`）

按包执行命令示例：

- `pnpm --filter @toonflow/web dev`
- `pnpm --filter @toonflow/web build`
- `pnpm --filter @toonflow/api dev`

## 编码风格与命名
全仓库以 TypeScript 为主，开启 `strict`。新增代码优先跟随所在包的现有风格，不强行统一整个仓库。

## 测试要求
当前仓库没有成型的单元测试框架，提交前至少完成与改动范围对应的静态验证与手动冒烟。monorepo 基线验证优先使用 `pnpm list -r --depth -1`、`pnpm lint`、`pnpm typecheck`。若补充自动化测试，推荐使用 `*.test.ts` 或 `*.spec.ts` 命名，并放在相邻模块目录。

## 提交与 PR 规范
现有提交历史以简短中文、祈使句、单一主题为主，例如 `修复小说章节管理接口`。保持一条提交只做一件事，避免把重构、功能和格式化混在一起。PR 需要写清楚变更范围、验证命令、配置或数据迁移影响；涉及 UI 时附截图，涉及接口时附请求示例或关键返回值。

## 配置与产物注意事项
不要提交密钥、令牌或本地环境配置。`apps/*/dist`、`packages/*/dist` 属于构建产物，除非发布流程明确需要，否则不要手工编辑。涉及架构迁移时，优先保持当前阶段可运行，再按 `docs/refactoring/` 中的阶段文档渐进调整。
