# Repository Guidelines

## Project Structure & Module Organization
This repository is a Phase 0 monorepo built with `pnpm` workspaces, `turbo`, and TypeScript project references. The root only coordinates workspace scripts and shared config. Put runnable entrypoints in `apps/` and shared libraries in `packages/`. Today, `apps/api` and `packages/kernel` are the only implemented packages; `apps/web`, `apps/review-console`, `apps/mcp-server`, and `apps/electron` are intentional placeholders. Before structural work, read `docs/refactoring/architecture-overview.md` and `docs/refactoring/00-monorepo-skeleton.md`.

## Build, Test, and Development Commands
Run all commands from the repo root unless a package-specific workflow is needed. Use `pnpm install` to bootstrap dependencies. Use `pnpm dev` to start the current runnable app, which delegates to `@toonflow/api`. Use `pnpm build`, `pnpm lint`, and `pnpm typecheck` to execute the Turbo pipelines across the workspace. For end-to-end smoke verification, start the API and run `curl http://127.0.0.1:3001/health`.

## Coding Style & Naming Conventions
Use TypeScript throughout and keep package boundaries explicit. Follow the style already present in the file you touch; current backend code uses double quotes and focused modules. Name packages and directories by responsibility. Keep shared contracts in `packages/kernel` and app-specific runtime code inside the owning app. Do not reintroduce the old root `src/` or `web/` monolith layout, and do not add compatibility shims when an old path conflicts with the monorepo structure.

## Testing Guidelines
Prefer package-local tests beside the implementation or under the package `test/` directory. Use `*.test.ts` for automated tests. Before submitting changes, run the narrowest relevant package tests plus root verification commands: `pnpm lint`, `pnpm typecheck`, and `pnpm build`. If you change API behavior, include a smoke check against `/health` or the affected endpoint.

## Commit & Pull Request Guidelines
Recent history follows conventional commit prefixes such as `chore:`, `feat:`, `fix:`, and `docs:`. Keep commits single-purpose and scoped to one package or one documentation concern when possible. PRs should state the affected workspace packages, list verification commands, and call out any package-boundary or architecture impact. If UI work arrives in later phases, include screenshots; if API behavior changes, include request and response examples.

## Architecture Overview
Treat this repository as a fresh start. Root config is orchestration only, `apps/api` is the current executable surface, and `packages/kernel` is the current shared core. If legacy implementation ideas conflict with the new structure, remove the old pattern instead of preserving it behind a forwarding layer.
