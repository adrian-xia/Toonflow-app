# Toonflow

Toonflow is currently in Phase 0 of a fresh monorepo bootstrap. The repository is organized as a `pnpm` workspace, orchestrated by `turbo`, and typed with TypeScript project references.

At this stage, only two workspace packages contain real implementation:

- `apps/api`: minimal Express API with `GET /health`
- `packages/kernel`: shared response, error, and health payload primitives

The other application packages exist as formal placeholders for later phases:

- `apps/web`
- `apps/review-console`
- `apps/mcp-server`
- `apps/electron`

Conflicting legacy implementation has been removed. This repository does not keep compatibility shims, forwarding layers, or the old monolith layout.

## Quick Start

### Requirements

- Node.js 20+
- `pnpm` 10

### Install

```bash
pnpm install
```

### Start the current runnable app

```bash
pnpm dev
```

The root `dev` script delegates to `@toonflow/api`, which starts the API on `http://127.0.0.1:3001` by default.

### Verify the health endpoint

```bash
curl http://127.0.0.1:3001/health
```

Expected response shape:

```json
{
  "ok": true,
  "data": {
    "status": "ok",
    "service": "api",
    "timestamp": "2026-03-19T00:00:00.000Z"
  }
}
```

## Workspace Commands

Run these from the repository root:

```bash
pnpm build
pnpm typecheck
pnpm lint
```

- `pnpm build`: runs the Turbo `build` pipeline across the workspace
- `pnpm typecheck`: runs workspace type checks through Turbo
- `pnpm lint`: currently maps to TypeScript-based static checks in implemented packages

## Repository Layout

```text
.
├── apps/
│   ├── api/              # runnable Express API
│   ├── electron/         # placeholder app
│   ├── mcp-server/       # placeholder app
│   ├── review-console/   # placeholder app
│   └── web/              # placeholder app
├── packages/
│   └── kernel/           # shared types, errors, response helpers
├── docs/
│   └── refactoring/      # architecture and phase documents
├── package.json          # root workspace scripts
├── pnpm-workspace.yaml   # workspace package discovery
├── tsconfig.json         # root TypeScript references
├── tsconfig.base.json    # shared compiler baseline
└── turbo.json            # task pipeline
```

### `apps/`

`apps/` contains executable entrypoints. In Phase 0, only `apps/api` is implemented. The remaining app directories are intentionally minimal so later phases can add real runtime code without reviving the deleted monolith.

### `packages/`

`packages/` contains shared libraries. `packages/kernel` is the only implemented package today and provides the response envelope helpers, normalized application errors, and the health payload type consumed by `apps/api`.

## Architecture Notes

- Root config is responsible only for workspace orchestration.
- Package boundaries are explicit from the start.
- New implementation should land inside `apps/` or `packages/`.
- If an old design conflicts with the new structure, delete the old path instead of adding a compatibility layer.

See [docs/refactoring/architecture-overview.md](./docs/refactoring/architecture-overview.md) for the target architecture and [docs/refactoring/00-monorepo-skeleton.md](./docs/refactoring/00-monorepo-skeleton.md) for the Phase 0 baseline.
