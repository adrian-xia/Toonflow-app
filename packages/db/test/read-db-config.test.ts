import test from "node:test";
import assert from "node:assert/strict";

import { readDbConfig } from "../src/index";

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

test("readDbConfig enforces required DB_* variables", () => {
  const env = {
    DB_HOST: "127.0.0.1",
    DB_USER: "postgres",
    DB_PASSWORD: "postgres",
    DB_NAME: "toonflow",
    DB_SCHEMA: "toonflow_app"
  };

  const requiredKeys = [
    "DB_HOST",
    "DB_USER",
    "DB_PASSWORD",
    "DB_NAME",
    "DB_SCHEMA"
  ] as const;

  for (const key of requiredKeys) {
    const nextEnv: Record<string, string> = { ...env };
    delete nextEnv[key];

    assert.throws(() => readDbConfig(nextEnv, { prefix: "DB" }), new RegExp(key));
  }
});

test("readDbConfig supports TEST_DB_* prefix", () => {
  const config = readDbConfig(
    {
      TEST_DB_HOST: "127.0.0.1",
      TEST_DB_USER: "postgres",
      TEST_DB_PASSWORD: "postgres",
      TEST_DB_NAME: "toonflow_db_test",
      TEST_DB_SCHEMA: "toonflow_test",
      TEST_DB_PORT: "55432",
      TEST_DB_SSL: "true",
      TEST_DB_POOL_MIN: "1",
      TEST_DB_POOL_MAX: "20",
      TEST_DB_POOL_IDLE_TIMEOUT_MS: "15000",
      TEST_DB_POOL_ACQUIRE_TIMEOUT_MS: "45000"
    },
    { prefix: "TEST_DB" }
  );

  assert.deepEqual(config, {
    host: "127.0.0.1",
    port: 55432,
    user: "postgres",
    password: "postgres",
    database: "toonflow_db_test",
    schema: "toonflow_test",
    ssl: true,
    pool: {
      min: 1,
      max: 20,
      idleTimeoutMillis: 15000,
      acquireTimeoutMillis: 45000
    }
  });
});
