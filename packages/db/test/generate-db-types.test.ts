import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { after, before, test } from "node:test";

import { createTestDatabase, TestDatabase } from "../src/test-utils/database";
import { runDbCommand } from "./helpers/run-db-command";

const GENERATED_TYPES_FILE = resolve(
  __dirname,
  "../src/types/generated.ts"
);

let database: TestDatabase;

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
  runDbCommand("db:types", database.dbEnv);

  const source = await readFile(GENERATED_TYPES_FILE, "utf8");

  assert.match(source, /export type JsonValue =/);
  assert.match(source, /export interface ProjectRow \{/);
  assert.match(source, /description: string \| null;/);

  const insertBlock = readInterfaceBlock(source, "ProjectInsert");
  assert.match(insertBlock, /status\?: "draft" \| "archived";/);

  const updateBlock = readInterfaceBlock(source, "ProjectUpdate");
  assert.match(updateBlock, /status\?: "draft" \| "archived";/);
});
