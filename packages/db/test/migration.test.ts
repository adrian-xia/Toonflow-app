import test from "node:test";
import assert from "node:assert/strict";

import { createTestDatabase } from "../src/test-utils/database";
import { runDbCommand } from "./helpers/run-db-command";

test("migrations can run, roll back latest batch, and replay", async () => {
  const database = await createTestDatabase();

  try {
    await database.resetSchema();

    runDbCommand("db:migrate", database.dbEnv);

    assert.equal(await database.tableExists("projects"), true);
    assert.equal(await database.tableExists("knex_migrations"), true);
    assert.equal(await database.tableExists("knex_migrations_lock"), true);

    const batchAfterFirstMigrate = await database.latestBatchNumber();
    assert.equal(typeof batchAfterFirstMigrate, "number");

    runDbCommand("db:rollback", database.dbEnv);

    const latestBatchAfterRollback = await database.latestBatchNumber();
    assert.equal(latestBatchAfterRollback, null);

    runDbCommand("db:migrate", database.dbEnv);

    assert.equal(await database.tableExists("projects"), true);
    assert.equal(await database.latestBatchNumber() !== null, true);
  } finally {
    await database.destroy();
  }
});
