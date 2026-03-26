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

test("readDbConfig allows an intentionally empty DB_PASSWORD", () => {
  const config = readDbConfig(
    {
      DB_HOST: "127.0.0.1",
      DB_USER: "postgres",
      DB_PASSWORD: "",
      DB_NAME: "toonflow",
      DB_SCHEMA: "toonflow_app"
    },
    { prefix: "DB" }
  );

  assert.equal(config.password, "");
});

test("readDbConfig rejects empty DB_HOST, DB_USER, DB_NAME, and DB_SCHEMA", () => {
  assert.throws(
    () =>
      readDbConfig(
        {
          DB_HOST: "",
          DB_USER: "postgres",
          DB_PASSWORD: "postgres",
          DB_NAME: "toonflow",
          DB_SCHEMA: "toonflow_app"
        },
        { prefix: "DB" }
      ),
    /DB_HOST/
  );

  assert.throws(
    () =>
      readDbConfig(
        {
          DB_HOST: "127.0.0.1",
          DB_USER: "",
          DB_PASSWORD: "postgres",
          DB_NAME: "toonflow",
          DB_SCHEMA: "toonflow_app"
        },
        { prefix: "DB" }
      ),
    /DB_USER/
  );

  assert.throws(
    () =>
      readDbConfig(
        {
          DB_HOST: "127.0.0.1",
          DB_USER: "postgres",
          DB_PASSWORD: "postgres",
          DB_NAME: "",
          DB_SCHEMA: "toonflow_app"
        },
        { prefix: "DB" }
      ),
    /DB_NAME/
  );

  assert.throws(
    () =>
      readDbConfig(
        {
          DB_HOST: "127.0.0.1",
          DB_USER: "postgres",
          DB_PASSWORD: "postgres",
          DB_NAME: "toonflow",
          DB_SCHEMA: ""
        },
        { prefix: "DB" }
      ),
    /DB_SCHEMA/
  );
});

test("readDbConfig rejects non-integer DB_PORT values", () => {
  assert.throws(
    () =>
      readDbConfig(
        {
          DB_HOST: "127.0.0.1",
          DB_USER: "postgres",
          DB_PASSWORD: "postgres",
          DB_NAME: "toonflow",
          DB_SCHEMA: "toonflow_app",
          DB_PORT: "5432.5"
        },
        { prefix: "DB" }
      ),
    /DB_PORT/
  );
});

test("readDbConfig rejects out-of-range DB_PORT values", () => {
  assert.throws(
    () =>
      readDbConfig(
        {
          DB_HOST: "127.0.0.1",
          DB_USER: "postgres",
          DB_PASSWORD: "postgres",
          DB_NAME: "toonflow",
          DB_SCHEMA: "toonflow_app",
          DB_PORT: "0"
        },
        { prefix: "DB" }
      ),
    /DB_PORT/
  );
});

test("readDbConfig rejects negative pool/timeouts", () => {
  assert.throws(
    () =>
      readDbConfig(
        {
          DB_HOST: "127.0.0.1",
          DB_USER: "postgres",
          DB_PASSWORD: "postgres",
          DB_NAME: "toonflow",
          DB_SCHEMA: "toonflow_app",
          DB_POOL_MIN: "-1"
        },
        { prefix: "DB" }
      ),
    /DB_POOL_MIN/
  );

  assert.throws(
    () =>
      readDbConfig(
        {
          DB_HOST: "127.0.0.1",
          DB_USER: "postgres",
          DB_PASSWORD: "postgres",
          DB_NAME: "toonflow",
          DB_SCHEMA: "toonflow_app",
          DB_POOL_IDLE_TIMEOUT_MS: "-100"
        },
        { prefix: "DB" }
      ),
    /DB_POOL_IDLE_TIMEOUT_MS/
  );
});

test("readDbConfig rejects DB_POOL_MIN greater than DB_POOL_MAX", () => {
  assert.throws(
    () =>
      readDbConfig(
        {
          DB_HOST: "127.0.0.1",
          DB_USER: "postgres",
          DB_PASSWORD: "postgres",
          DB_NAME: "toonflow",
          DB_SCHEMA: "toonflow_app",
          DB_POOL_MIN: "11",
          DB_POOL_MAX: "10"
        },
        { prefix: "DB" }
      ),
    /DB_POOL_MIN.*DB_POOL_MAX|DB_POOL_MAX.*DB_POOL_MIN/
  );
});

test("readDbConfig parses DB_SSL with trimmed, case-insensitive, and numeric values", () => {
  const trueConfig = readDbConfig(
    {
      DB_HOST: "127.0.0.1",
      DB_USER: "postgres",
      DB_PASSWORD: "postgres",
      DB_NAME: "toonflow",
      DB_SCHEMA: "toonflow_app",
      DB_SSL: " TrUe "
    },
    { prefix: "DB" }
  );

  const falseConfig = readDbConfig(
    {
      DB_HOST: "127.0.0.1",
      DB_USER: "postgres",
      DB_PASSWORD: "postgres",
      DB_NAME: "toonflow",
      DB_SCHEMA: "toonflow_app",
      DB_SSL: "0"
    },
    { prefix: "DB" }
  );

  const numericTrueConfig = readDbConfig(
    {
      DB_HOST: "127.0.0.1",
      DB_USER: "postgres",
      DB_PASSWORD: "postgres",
      DB_NAME: "toonflow",
      DB_SCHEMA: "toonflow_app",
      DB_SSL: "1"
    },
    { prefix: "DB" }
  );

  assert.equal(trueConfig.ssl, true);
  assert.equal(falseConfig.ssl, false);
  assert.equal(numericTrueConfig.ssl, true);
});
