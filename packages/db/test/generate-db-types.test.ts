import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { after, before, test } from "node:test";
import { Client } from "pg";

import { createTestDatabase, TestDatabase } from "../src/test-utils/database";
import { runDbCommand } from "./helpers/run-db-command";

const GENERATED_TYPES_FILE = resolve(
  __dirname,
  "../src/types/generated.ts"
);

let database: TestDatabase;

function quoteIdentifier(value: string): string {
  return `"${value.replace(/"/g, "\"\"")}"`;
}

async function runSql(env: Record<string, string>, text: string): Promise<void> {
  const client = new Client({
    host: env.DB_HOST,
    port: Number(env.DB_PORT),
    user: env.DB_USER,
    password: env.DB_PASSWORD,
    database: env.DB_NAME,
    ssl: env.DB_SSL === "true"
  });

  await client.connect();
  try {
    await client.query(text);
  } finally {
    await client.end();
  }
}

function readInterfaceBlock(source: string, interfaceName: string): string {
  const match = source.match(
    new RegExp(`export interface ${interfaceName} \\{([\\s\\S]*?)\\n\\}`, "m")
  );
  assert.notEqual(match, null, `Missing interface: ${interfaceName}`);
  return match[1];
}

before(async () => {
  database = await createTestDatabase();
  await database.resetSchema();
  runDbCommand("db:migrate", database.dbEnv);
});

after(async () => {
  if (database) {
    await database.destroy();
  }
});

test("db:types generates required project and json type shapes", async () => {
  await runSql(
    database.dbEnv,
    `
      CREATE EXTENSION IF NOT EXISTS citext;
      CREATE TABLE ${quoteIdentifier(database.schema)}.${quoteIdentifier("citext_samples")} (
        id uuid PRIMARY KEY,
        title citext NOT NULL,
        notes citext
      );
    `
  );

  try {
    runDbCommand("db:types", database.dbEnv);

    const source = await readFile(GENERATED_TYPES_FILE, "utf8");

    assert.match(source, /export type JsonValue =/);
    assert.match(source, /export interface ProjectRow \{/);
    assert.match(source, /description: string \| null;/);

    const insertBlock = readInterfaceBlock(source, "ProjectInsert");
    assert.match(insertBlock, /description\?: string \| null;/);
    assert.match(insertBlock, /status\?: "draft" \| "archived";/);

    const updateBlock = readInterfaceBlock(source, "ProjectUpdate");
    assert.match(updateBlock, /status\?: "draft" \| "archived";/);

    const citextRowBlock = readInterfaceBlock(source, "CitextSampleRow");
    assert.match(citextRowBlock, /title: string;/);
    assert.match(citextRowBlock, /notes: string \| null;/);
  } finally {
    await runSql(
      database.dbEnv,
      `DROP TABLE IF EXISTS ${quoteIdentifier(database.schema)}.${quoteIdentifier("citext_samples")}`
    );
    runDbCommand("db:types", database.dbEnv);
  }
});
