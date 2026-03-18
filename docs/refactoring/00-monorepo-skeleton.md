# Phase 0: Monorepo Skeleton

## Positioning

Phase 0 is the cold-start skeleton for a new project layout, not a migration guide for the deleted monolith.

- No compatibility discussion
- No bridge layer between old and new paths
- No requirement to preserve the former root `src/` or `web/` structure
- If legacy implementation conflicts with the new skeleton, remove it directly

The goal of this phase is to establish a clean workspace boundary that later phases can build on without inheriting old package layout assumptions.

## Fixed Toolchain

Phase 0 standardizes the repository on:

- `pnpm workspace` for package management
- `turbo` for root task orchestration
- TypeScript project references for package-level compilation boundaries

The repository root now serves only as the coordinator for these tools. It should not become a new application runtime.

## Delivered Scope

The current Phase 0 repository contains six workspace packages, but only two are implemented as real code:

### Runnable packages

- `apps/api`
  - Minimal Express service
  - Exposes `GET /health`
  - Uses `packages/kernel` for shared contracts
- `packages/kernel`
  - Shared response envelope helpers
  - Shared error primitives
  - Shared health payload type

### Placeholder packages

- `apps/web`
- `apps/review-console`
- `apps/mcp-server`
- `apps/electron`

These placeholder packages exist only to reserve stable workspace names and package boundaries for later phases. They are intentionally minimal and should stay no-op until their own implementation phase begins.

## Repository Shape

```text
toonflow/
├── apps/
│   ├── api/
│   ├── electron/
│   ├── mcp-server/
│   ├── review-console/
│   └── web/
├── packages/
│   └── kernel/
├── package.json
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── tsconfig.json
└── turbo.json
```

### Root responsibilities

- Define workspace-level scripts
- Register workspace package locations
- Hold the shared TypeScript baseline
- Define root TypeScript references
- Configure Turbo pipelines

### Package responsibilities

- `apps/*` own application entrypoints
- `packages/*` own shared library code
- Cross-package contracts should be published through package boundaries, not through root aliases or compatibility folders

## Phase 0 Operating Rules

1. New work must start from the monorepo structure already in place.
2. Only `apps/api` and `packages/kernel` should be treated as runnable implementation.
3. Placeholder apps should not accumulate accidental production logic.
4. Root commands must remain simple orchestration commands.
5. When an old implementation pattern conflicts with the new package boundary, prefer deletion over forwarding or shimming.

## What Phase 0 Does Not Do

Phase 0 does not:

- migrate the old monolith in place
- preserve old entrypoints for backward compatibility
- keep dual implementations alive
- add compatibility wrappers around deleted files
- treat placeholder apps as partially supported products

## Ready-for-Phase-1 Baseline

Phase 0 is considered complete when the repository can do the following from root:

```bash
pnpm install
pnpm dev
pnpm build
pnpm typecheck
```

And when `apps/api` responds successfully to:

```bash
curl http://127.0.0.1:3001/health
```

That baseline gives later phases a stable starting point without carrying forward monolith-era structure or compatibility debt.
