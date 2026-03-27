# Database Layer Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement Phase 1 `@toonflow/db` as a buildable workspace package with explicit config/client APIs, PostgreSQL + Knex migration scripts, generated database types, a real-Postgres test harness, and one representative `projects` repository.

**Architecture:** Add a standalone `packages/db` CommonJS package that exposes a narrow public API (`readDbConfig`, `createDbClient`, repository factories, generated types) and keeps runtime, migrations, codegen, and tests on the same `DbConfig` contract. Use programmatic Knex scripts plus `docker compose` backed PostgreSQL 16 for reproducible integration tests, and keep the rest of the monorepo unchanged except for workspace wiring and verification scripts.

**Tech Stack:** TypeScript, pnpm workspace, Knex, pg, node:test, tsx, PostgreSQL 16, docker compose

---

## File Structure

### New files

- `packages/db/package.json`
- `packages/db/tsconfig.json`
- `packages/db/src/index.ts`
- `packages/db/src/config/db-config.ts`
- `packages/db/src/config/read-db-config.ts`
- `packages/db/src/client/types.ts`
- `packages/db/src/client/knex-config.ts`
- `packages/db/src/client/create-db-client.ts`
- `packages/db/src/schema/common/columns.ts`
- `packages/db/src/schema/tables/projects.ts`
- `packages/db/src/migrations/20260326153000_create_projects_table.ts`
- `packages/db/src/repositories/create-project-repository.ts`
- `packages/db/src/repositories/index.ts`
- `packages/db/src/types/generated.ts`
- `packages/db/src/types/index.ts`
- `packages/db/src/test-utils/database.ts`
- `packages/db/scripts/migrate.ts`
- `packages/db/scripts/rollback.ts`
- `packages/db/scripts/generate-db-types.ts`
- `packages/db/knexfile.ts`
- `packages/db/docker-compose.test.yml`
- `packages/db/test/public-api.test.ts`
- `packages/db/test/read-db-config.test.ts`
- `packages/db/test/db-client.test.ts`
- `packages/db/test/migration.test.ts`
- `packages/db/test/project-repository.test.ts`
- `packages/db/test/generate-db-types.test.ts`

### Modified files

- `package.json`
- `tsconfig.json`

---

### Task 1: Scaffold `@toonflow/db` Into The Workspace

**Files:**
- Create: `packages/db/package.json`
- Create: `packages/db/tsconfig.json`
- Create: `packages/db/src/index.ts`
- Create: `packages/db/test/public-api.test.ts`
- Modify: `package.json`
- Modify: `tsconfig.json`

- [ ] **Step 1: Create a failing public API smoke test**

```ts
import test from "node:test";
import assert from "node:assert/strict";

import {
  createDbClient,
  readDbConfig
} from "../src/index";

test("db package exposes the phase-1 public API entry points", () => {
  assert.equal(typeof readDbConfig, "function");
  assert.equal(typeof createDbClient, "function");
});
```

- [ ] **Step 2: Run the package test to verify it fails**

Run: `pnpm --filter @toonflow/db test`
Expected: FAIL because `@toonflow/db` package files or exports do not exist yet.

- [ ] **Step 3: Add the workspace package skeleton and root wiring**

Create `packages/db/package.json` with scripts:

```json
{
  "name": "@toonflow/db",
  "private": true,
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsc -b",
    "dev": "tsc -b -w",
    "lint": "tsc --pretty false --noEmit -p tsconfig.json",
    "typecheck": "tsc --pretty false --noEmit -p tsconfig.json",
    "test": "node --import tsx --test --test-concurrency=1 test/**/*.test.ts",
    "db:migrate": "tsx scripts/migrate.ts",
    "db:rollback": "tsx scripts/rollback.ts",
    "db:types": "tsx scripts/generate-db-types.ts",
    "db:test:up": "docker compose -f docker-compose.test.yml up -d",
    "db:test:down": "docker compose -f docker-compose.test.yml down -v"
  },
  "dependencies": {
    "@toonflow/kernel": "workspace:*",
    "knex": "^3.1.0",
    "pg": "^8.16.0"
  }
}
```

Update root `tsconfig.json` references to include `./packages/db`.

- [ ] **Step 4: Export minimal placeholders from `src/index.ts`**

```ts
export function readDbConfig() {
  throw new Error("Not implemented");
}

export function createDbClient() {
  throw new Error("Not implemented");
}
```

- [ ] **Step 5: Run the smoke test to verify it passes**

Run: `pnpm --filter @toonflow/db test -- --test-name-pattern "public API"`
Expected: PASS for the smoke test.

- [ ] **Step 6: Commit**

```bash
git add package.json tsconfig.json packages/db
git commit -m "feat: scaffold toonflow db package"
```

### Task 2: Implement `DbConfig` Parsing And `DbClient` Contract

**Files:**
- Create: `packages/db/src/config/db-config.ts`
- Create: `packages/db/src/config/read-db-config.ts`
- Create: `packages/db/src/client/types.ts`
- Create: `packages/db/src/client/knex-config.ts`
- Create: `packages/db/src/client/create-db-client.ts`
- Create: `packages/db/test/read-db-config.test.ts`
- Create: `packages/db/test/db-client.test.ts`
- Modify: `packages/db/src/index.ts`

- [ ] **Step 1: Write failing config parsing tests**

Include tests for:
- required `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `DB_SCHEMA`
- default values for `DB_PORT`, `DB_SSL`, pool fields
- `TEST_DB_*` prefix support

Key assertion shape:

```ts
test("readDbConfig parses DB_* env into a DbConfig object", () => {
  const config = readDbConfig(
    {
      DB_HOST: "127.0.0.1",
      DB_USER: "postgres",
      DB_PASSWORD: "postgres",
      DB_NAME: "toonflow",
      DB_SCHEMA: "toonflow_app"
    },
    { prefix: "DB" }
  );

  assert.deepEqual(config, {
    host: "127.0.0.1",
    port: 5432,
    user: "postgres",
    password: "postgres",
    database: "toonflow",
    schema: "toonflow_app",
    ssl: false,
    pool: {
      min: 0,
      max: 10,
      idleTimeoutMillis: 30000,
      acquireTimeoutMillis: 60000
    }
  });
});
```

- [ ] **Step 2: Run config tests to verify they fail**

Run: `pnpm --filter @toonflow/db test -- test/read-db-config.test.ts`
Expected: FAIL because config parsing is not implemented yet.

- [ ] **Step 3: Implement `DbConfig`, `readDbConfig`, `DbExecutor`, and `buildKnexConfig`**

Required behavior:
- `DbConfig` matches the approved spec exactly
- `buildKnexConfig(config)` sets PostgreSQL `searchPath` to `config.schema`
- migrations metadata table is configured with `schemaName: config.schema`
- `DbExecutor = Knex | Knex.Transaction`

- [ ] **Step 4: Write the failing `DbClient` tests**

Cover:
- `createDbClient(config)` returns `{ executor, destroy, transaction }`
- `transaction` commits on success
- `transaction` rolls back and rethrows on error

Minimal callback contract:

```ts
await assert.rejects(
  () => db.transaction(async () => {
    throw new Error("rollback me");
  }),
  /rollback me/
);
```

- [ ] **Step 5: Run the `DbClient` tests to verify they fail**

Run: `pnpm --filter @toonflow/db test -- test/db-client.test.ts`
Expected: FAIL because client and transaction behavior are still missing.

- [ ] **Step 6: Implement `createDbClient` and wire the public API**

Implementation requirements:
- expose `executor: Knex`
- `destroy()` closes the Knex instance
- `transaction(fn)` wraps Knex transaction, commits on resolved callback, rolls back on thrown error, and rethrows the original error
- `src/index.ts` exports config/client contracts

- [ ] **Step 7: Run targeted tests to verify green**

Run:
- `pnpm --filter @toonflow/db test -- test/read-db-config.test.ts`
- `pnpm --filter @toonflow/db test -- test/db-client.test.ts`

Expected: PASS for both files.

- [ ] **Step 8: Commit**

```bash
git add packages/db/src packages/db/test
git commit -m "feat: add db config and client contracts"
```

### Task 3: Add PostgreSQL Test Harness And Migration Scripts

**Files:**
- Create: `packages/db/docker-compose.test.yml`
- Create: `packages/db/src/test-utils/database.ts`
- Create: `packages/db/scripts/migrate.ts`
- Create: `packages/db/scripts/rollback.ts`
- Create: `packages/db/knexfile.ts`
- Create: `packages/db/test/migration.test.ts`
- Modify: `packages/db/package.json`
- Modify: `packages/db/src/client/knex-config.ts`

- [ ] **Step 1: Write a failing migration integration test**

Test flow:
1. assume test PostgreSQL is already running
2. run `db:migrate` with explicit `DB_*` values that mirror the `TEST_DB_*` database
3. verify the `projects` table and Knex migration metadata table exist in `TEST_DB_SCHEMA`
4. run `db:rollback`
5. verify the latest migration batch was rolled back
6. run `db:migrate` again to confirm replay works

- [ ] **Step 2: Run the migration test to verify it fails**

Run:
- `pnpm --filter @toonflow/db db:test:up`
- `DB_HOST=127.0.0.1 DB_PORT=55432 DB_USER=postgres DB_PASSWORD=postgres DB_NAME=toonflow_db_test DB_SCHEMA=toonflow_test pnpm --filter @toonflow/db db:migrate`
- `pnpm --filter @toonflow/db test -- test/migration.test.ts`

Expected: FAIL because scripts/test utils are not implemented yet.

- [ ] **Step 3: Implement the test harness and scripts**

Required behavior:
- `docker-compose.test.yml` uses `postgres:16`
- the compose service sets `POSTGRES_DB=toonflow_db_test`, `POSTGRES_USER=postgres`, and `POSTGRES_PASSWORD=postgres`
- default port is `${TEST_DB_PORT:-55432}`
- `test-utils/database.ts` reads `TEST_DB_*`, creates the schema if needed, and provides helpers to truncate tables between tests
- `scripts/migrate.ts` and `scripts/rollback.ts` read `DB_*` through `readDbConfig(process.env, { prefix: "DB" })`
- `scripts/migrate.ts` creates `DB_SCHEMA` before running Knex migrations so `migrations.schemaName = config.schema` works on a clean database
- `knexfile.ts` is a compatibility bridge only; scripts use programmatic Knex APIs

Canonical CI/local sequence to preserve in scripts and docs:

```bash
pnpm --filter @toonflow/db db:test:up
DB_HOST=127.0.0.1 DB_PORT=55432 DB_USER=postgres DB_PASSWORD=postgres DB_NAME=toonflow_db_test DB_SCHEMA=toonflow_test pnpm --filter @toonflow/db db:migrate
pnpm --filter @toonflow/db test
pnpm --filter @toonflow/db db:test:down
```

- [ ] **Step 4: Re-run the migration integration test**

Run:
- `pnpm --filter @toonflow/db test -- test/migration.test.ts`

Expected: PASS, including the `migrate -> rollback -> migrate` sequence.

- [ ] **Step 5: Shut down the test database after verification**

Run: `pnpm --filter @toonflow/db db:test:down`
Expected: container stops and volumes are removed cleanly.

- [ ] **Step 6: Commit**

```bash
git add packages/db/docker-compose.test.yml packages/db/scripts packages/db/src/test-utils packages/db/test/migration.test.ts packages/db/knexfile.ts packages/db/package.json
git commit -m "feat: add db migration scripts and test harness"
```

### Task 4: Implement `projects` Schema, Repository, And Type Generation

**Files:**
- Create: `packages/db/src/schema/common/columns.ts`
- Create: `packages/db/src/schema/tables/projects.ts`
- Create: `packages/db/src/migrations/20260326153000_create_projects_table.ts`
- Create: `packages/db/src/repositories/create-project-repository.ts`
- Create: `packages/db/src/repositories/index.ts`
- Create: `packages/db/src/types/generated.ts`
- Create: `packages/db/src/types/index.ts`
- Create: `packages/db/scripts/generate-db-types.ts`
- Create: `packages/db/test/project-repository.test.ts`
- Create: `packages/db/test/generate-db-types.test.ts`
- Modify: `packages/db/src/index.ts`

- [ ] **Step 1: Write the failing repository integration test**

Cover:
- insert a project row
- fetch by id
- update mutable fields
- return `null` for missing project
- delete by id
- allow repository construction from `db.executor` and transactional `trx`
- verify transaction rollback leaves no row behind when callback throws
- verify at least one database-enforced failure path, using a unique `slug` column on `projects`

Representative shape:

```ts
const repo = createProjectRepository(db.executor);
const created = await repo.insert({ title: "Pilot" });
const found = await repo.getById(created.id);
assert.equal(found?.title, "Pilot");
```

- [ ] **Step 2: Write the failing type generation test**

Assert that running `db:types` produces:
- `ProjectRow`
- `ProjectInsert`
- `ProjectUpdate`
- `JsonValue`
- `description: string | null`
- `status?: "draft" | "archived"` in `ProjectInsert`
- `status?: "draft" | "archived"` in `ProjectUpdate`

Run the codegen script inside the test and inspect `src/types/generated.ts`.

- [ ] **Step 3: Run the repository and typegen tests to verify they fail**

Run:
- `pnpm --filter @toonflow/db db:test:up`
- `DB_HOST=127.0.0.1 DB_PORT=55432 DB_USER=postgres DB_PASSWORD=postgres DB_NAME=toonflow_db_test DB_SCHEMA=toonflow_test pnpm --filter @toonflow/db db:migrate`
- `pnpm --filter @toonflow/db test -- test/project-repository.test.ts`
- `pnpm --filter @toonflow/db test -- test/generate-db-types.test.ts`

Expected: FAIL because schema, repository, and codegen are not implemented yet.

- [ ] **Step 4: Implement the schema, migration, repository, and generator**

Required behavior:
- `projects` table uses `snake_case`, UUID/string id, `created_at`, `updated_at`
- `projects` also includes a unique `slug` column so the repository test can verify a real constraint failure path
- migration lives under `src/migrations/` and is replayable
- repository factory binds a `DbExecutor`
- generated types follow the approved mapping rules:
  - `uuid` -> `string`
  - `bigint` -> `string`
  - `numeric` -> `string`
  - `timestamp/timestamptz` -> `string`
  - `json/jsonb` -> `JsonValue`
  - PostgreSQL enum -> string union
  - nullable columns -> `T | null`
  - `Insert` types keep `snake_case` field names and make DB-default columns optional
  - `Update` types exclude immutable columns such as `id`, `created_at`, `updated_at`

- [ ] **Step 5: Run targeted tests until green**

Run:
- `pnpm --filter @toonflow/db test -- test/project-repository.test.ts`
- `pnpm --filter @toonflow/db test -- test/generate-db-types.test.ts`
- `pnpm --filter @toonflow/db db:types`

Expected: PASS for tests and regenerated `src/types/generated.ts`.

- [ ] **Step 6: Run package and workspace verification**

Run:
- `pnpm --filter @toonflow/db build`
- `pnpm --filter @toonflow/db lint`
- `pnpm --filter @toonflow/db typecheck`
- `pnpm --filter @toonflow/db test`
- `pnpm build`
- `pnpm lint`
- `pnpm typecheck`
- `pnpm --filter @toonflow/kernel test`
- `pnpm --filter @toonflow/api test`

Expected: all commands exit 0.

- [ ] **Step 7: Commit**

```bash
git add package.json tsconfig.json packages/db
git commit -m "feat: implement toonflow db layer phase 1"
```
