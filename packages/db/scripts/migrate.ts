import path from "node:path";
import knex from "knex";

import { buildKnexConfig, readDbConfig } from "../src";

const MIGRATIONS_DIRECTORY = path.resolve(__dirname, "../src/migrations");

function quoteIdentifier(value: string): string {
  return `"${value.replace(/"/g, "\"\"")}"`;
}

async function main() {
  const config = readDbConfig(process.env, { prefix: "DB" });
  const connection = {
    host: config.host,
    port: config.port,
    user: config.user,
    password: config.password,
    database: config.database,
    ssl: config.ssl
  };

  const schemaSetup = knex({
    client: "pg",
    connection
  });
  await schemaSetup.raw(
    `CREATE SCHEMA IF NOT EXISTS ${quoteIdentifier(config.schema)}`
  );
  await schemaSetup.destroy();

  const db = knex(
    buildKnexConfig(config, {
      migrationsDirectory: MIGRATIONS_DIRECTORY,
      migrationsExtension: "ts"
    })
  );

  try {
    const [batchNumber, migrationNames] = await db.migrate.latest();
    console.info(
      `db:migrate complete (batch ${batchNumber})`,
      migrationNames
    );
  } finally {
    await db.destroy();
  }
}

main().catch((error: unknown) => {
  console.error("db:migrate failed", error);
  process.exitCode = 1;
});
