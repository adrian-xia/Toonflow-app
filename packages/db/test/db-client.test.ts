import test from "node:test";
import assert from "node:assert/strict";
import { Knex } from "knex";

import { DbConfig } from "../src/config/db-config";
import { createDbClient } from "../src/index";

interface TestTransaction {
  commit: () => Promise<void>;
  rollback: () => Promise<void>;
}

interface TestExecutor {
  destroy: () => Promise<void>;
  transaction: () => Promise<TestTransaction>;
}

const baseConfig: DbConfig = {
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
};

test("createDbClient returns executor, destroy, and transaction", () => {
  let receivedConfig: unknown;
  const executor: TestExecutor = {
    destroy: async () => undefined,
    transaction: async () =>
      ({
        commit: async () => undefined,
        rollback: async () => undefined
      }) satisfies TestTransaction
  };

  const db = createDbClient(baseConfig, {
    createExecutor: (config) => {
      receivedConfig = config;
      return executor as unknown as Knex;
    }
  });

  assert.equal(db.executor, executor);
  assert.equal(typeof db.destroy, "function");
  assert.equal(typeof db.transaction, "function");
  assert.deepEqual(receivedConfig, {
    client: "pg",
    connection: {
      host: "127.0.0.1",
      port: 5432,
      user: "postgres",
      password: "postgres",
      database: "toonflow",
      ssl: false
    },
    pool: {
      min: 0,
      max: 10,
      idleTimeoutMillis: 30000,
      acquireTimeoutMillis: 60000
    },
    searchPath: "toonflow_app",
    migrations: {
      schemaName: "toonflow_app"
    }
  });
});

test("transaction commits on success", async () => {
  let committed = false;
  let rolledBack = false;
  const trx: TestTransaction = {
    commit: async () => {
      committed = true;
    },
    rollback: async () => {
      rolledBack = true;
    }
  };

  const executor: TestExecutor = {
    destroy: async () => undefined,
    transaction: async () => trx
  };

  const db = createDbClient(baseConfig, {
    createExecutor: () => executor as unknown as Knex
  });

  const result = await db.transaction(async () => "ok");

  assert.equal(result, "ok");
  assert.equal(committed, true);
  assert.equal(rolledBack, false);
});

test("transaction rolls back and rethrows on error", async () => {
  let committed = false;
  let rolledBack = false;
  const trx: TestTransaction = {
    commit: async () => {
      committed = true;
    },
    rollback: async () => {
      rolledBack = true;
    }
  };

  const executor: TestExecutor = {
    destroy: async () => undefined,
    transaction: async () => trx
  };

  const db = createDbClient(baseConfig, {
    createExecutor: () => executor as unknown as Knex
  });

  await assert.rejects(
    () =>
      db.transaction(async () => {
        throw new Error("rollback me");
      }),
    /rollback me/
  );

  assert.equal(committed, false);
  assert.equal(rolledBack, true);
});

test("transaction rethrows callback error even if rollback fails", async () => {
  const trx: TestTransaction = {
    commit: async () => undefined,
    rollback: async () => {
      throw new Error("rollback failed");
    }
  };

  const executor: TestExecutor = {
    destroy: async () => undefined,
    transaction: async () => trx
  };

  const db = createDbClient(baseConfig, {
    createExecutor: () => executor as unknown as Knex
  });

  await assert.rejects(
    () =>
      db.transaction(async () => {
        throw new Error("original callback error");
      }),
    /original callback error/
  );
});
