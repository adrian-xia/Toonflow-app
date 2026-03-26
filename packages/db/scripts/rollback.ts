import path from "node:path";
import knex from "knex";

import { buildKnexConfig, readDbConfig } from "../src";

const MIGRATIONS_DIRECTORY = path.resolve(__dirname, "../src/migrations");

async function main() {
  const config = readDbConfig(process.env, { prefix: "DB" });
  const db = knex(
    buildKnexConfig(config, {
      migrationsDirectory: MIGRATIONS_DIRECTORY,
      migrationsExtension: "ts"
    })
  );

  try {
    const [batchNumber, migrationNames] = await db.migrate.rollback();
    console.info(
      `db:rollback complete (batch ${batchNumber})`,
      migrationNames
    );
  } finally {
    await db.destroy();
  }
}

main().catch((error: unknown) => {
  console.error("db:rollback failed", error);
  process.exitCode = 1;
});
