<p align="center">
  <a href="../README.md">中文</a> |
  <strong>English</strong>
</p>

# Toonflow

## Phase 0 Monorepo Skeleton

This repository now uses a Phase 0 pnpm monorepo skeleton. The goal of this phase is to establish the workspace layout, shared contracts, and a minimal runnable API path for later phases. It is a clean project bootstrap, not a legacy migration layer.

Currently runnable packages:

- `packages/kernel`: shared response helpers, error primitives, and health-check types
- `apps/api`: a minimal Express shell exposing `/health`

Placeholder packages only:

- `apps/web`
- `apps/review-console`
- `apps/mcp-server`
- `apps/electron`

## Toolchain

- `pnpm workspace`
- `turbo`
- `TypeScript project references`

The repository root exists only to coordinate the workspace and should not host runtime business code.

## Quick Start

```bash
pnpm install
pnpm lint
pnpm build
pnpm typecheck
pnpm --filter @toonflow/kernel test
pnpm --filter @toonflow/api test
pnpm dev
```

By default, `pnpm dev` starts `@toonflow/api` on `http://127.0.0.1:3001`.

```bash
curl http://127.0.0.1:3001/health
```

Expected response:

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

## Repository Layout

```text
.
├── apps/
│   ├── api/              # Current HTTP entrypoint
│   ├── web/              # Placeholder package
│   ├── review-console/   # Placeholder package
│   ├── mcp-server/       # Placeholder package
│   └── electron/         # Placeholder package
├── packages/
│   └── kernel/           # Shared contracts and pure helpers
├── docs/
│   └── refactoring/
│       ├── architecture-overview.md
│       └── 00-monorepo-skeleton.md
├── pnpm-workspace.yaml
├── turbo.json
├── tsconfig.base.json
└── tsconfig.json
```

## Phase 0 Constraints

- If legacy implementation conflicts with the new skeleton, delete the legacy path instead of adding compatibility shims.
- Root `tsconfig.json` must only reference `packages/kernel` and `apps/api`.
- `packages/kernel` must remain side-effect free and contain no IO or framework coupling.
- `apps/api` should stay a minimal HTTP shell and should not predeclare service, database, agent, or workflow abstractions.
- Placeholder apps stay no-op until their own phases begin.

## References

- Architecture direction: `docs/refactoring/architecture-overview.md`
- Current phase details: `docs/refactoring/00-monorepo-skeleton.md`
