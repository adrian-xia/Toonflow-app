# Repository Guidelines

## Project Structure & Module Organization
The repository is a pnpm monorepo. Runtime code currently lives in [`apps/api`](./apps/api) and shared contracts live in [`packages/kernel`](./packages/kernel). The other app packages under [`apps/`](./apps) are placeholders only: `web`, `review-console`, `mcp-server`, and `electron`. Root files such as `pnpm-workspace.yaml`, `turbo.json`, `tsconfig.base.json`, and `tsconfig.json` exist only to coordinate the workspace. Architecture and refactoring notes live in [`docs/refactoring/`](./docs/refactoring).

## Build, Test, and Development Commands
Use `pnpm install` to install workspace dependencies. Use `pnpm dev` to start `@toonflow/api` on port `3001`. Use `pnpm build`, `pnpm lint`, and `pnpm typecheck` to run the workspace pipelines through Turbo. Package-level verification commands are `pnpm --filter @toonflow/kernel test` and `pnpm --filter @toonflow/api test`. For a runtime smoke check, run `curl http://127.0.0.1:3001/health`.

## Coding Style & Naming Conventions
Use TypeScript with strict typing. Keep package boundaries explicit and avoid cross-package reach-through imports. Current Node packages use CommonJS output, `src/` for source, and `test/` for tests. Follow existing file formatting: double quotes, semicolons, and 2-space indentation in JSON/TypeScript. Package names use the `@toonflow/*` scope, and new files should be named by responsibility, for example `health.ts` or `error-handler.ts`.

## Testing Guidelines
Tests use `node:test` with `tsx`, and HTTP behavior is verified with `supertest`. Name tests `*.test.ts` and keep them close to the owning package. Before opening a PR, run `pnpm lint`, `pnpm build`, `pnpm typecheck`, plus the relevant package tests. If you touch shared contracts in `packages/kernel`, add or update direct contract tests there first.

## Commit & Pull Request Guidelines
Recent history follows Conventional Commit prefixes such as `chore:`, `feat:`, `fix:`, and `docs:`. Keep each commit scoped to one task. PRs should explain the affected packages, list the exact verification commands you ran, and include API samples or screenshots when behavior changes.

## Architecture Notes
Read [`docs/refactoring/architecture-overview.md`](./docs/refactoring/architecture-overview.md) and [`docs/refactoring/00-monorepo-skeleton.md`](./docs/refactoring/00-monorepo-skeleton.md) before making structural changes. Phase 0 is a new-project skeleton: do not add migration shims or preserve deleted monolith paths for compatibility.
