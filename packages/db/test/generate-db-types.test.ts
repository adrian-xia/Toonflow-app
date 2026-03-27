import assert from "node:assert/strict";
import { readFile, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { after, before, test } from "node:test";
import { Client } from "pg";

import { createTestDatabase, TestDatabase } from "../src/test-utils/database";
import { runDbCommand, runDbCommandResult } from "./helpers/run-db-command";

const GENERATED_TYPES_FILE = resolve(
  __dirname,
  "../src/types/generated.ts"
);
const GENERATOR_SCRIPT_FILE = resolve(
  __dirname,
  "../scripts/generate-db-types.ts"
);

let database: TestDatabase;

interface GeneratedTypesSnapshot {
  exists: boolean;
  content: string;
}

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

async function takeGeneratedTypesSnapshot(): Promise<GeneratedTypesSnapshot> {
  try {
    const content = await readFile(GENERATED_TYPES_FILE, "utf8");
    return { exists: true, content };
  } catch (error: unknown) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return { exists: false, content: "" };
    }
    throw error;
  }
}

async function restoreGeneratedTypesSnapshot(
  snapshot: GeneratedTypesSnapshot
): Promise<void> {
  if (snapshot.exists) {
    await writeFile(GENERATED_TYPES_FILE, snapshot.content, "utf8");
    return;
  }

  await rm(GENERATED_TYPES_FILE, { force: true });
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
  const generatedTypesSnapshot = await takeGeneratedTypesSnapshot();
  assert.equal(
    generatedTypesSnapshot.exists,
    true,
    "Expected checked-in src/types/generated.ts to exist before db:types drift check"
  );

  try {
    runDbCommand("db:types", database.dbEnv);
    const cleanGeneratedSource = await readFile(GENERATED_TYPES_FILE, "utf8");
    assert.equal(
      cleanGeneratedSource,
      generatedTypesSnapshot.content,
      "Checked-in src/types/generated.ts is stale. Run `pnpm --filter @toonflow/db db:types` and commit the updated file."
    );
  } finally {
    await restoreGeneratedTypesSnapshot(generatedTypesSnapshot);
  }

  await runSql(
    database.dbEnv,
    `
      CREATE EXTENSION IF NOT EXISTS citext;
      CREATE TABLE ${quoteIdentifier(database.schema)}.${quoteIdentifier("citext_samples")} (
        id uuid PRIMARY KEY,
        title citext NOT NULL,
        notes citext
      );
      CREATE TABLE ${quoteIdentifier(database.schema)}.${quoteIdentifier("project_statuses")} (
        id uuid PRIMARY KEY,
        label text NOT NULL
      );
      CREATE TABLE ${quoteIdentifier(database.schema)}.${quoteIdentifier("companies")} (
        id uuid PRIMARY KEY,
        name text NOT NULL
      );
      CREATE TABLE ${quoteIdentifier(database.schema)}.${quoteIdentifier("cases")} (
        id uuid PRIMARY KEY,
        name text NOT NULL
      );
      CREATE TABLE ${quoteIdentifier(database.schema)}.${quoteIdentifier("bases")} (
        id uuid PRIMARY KEY,
        name text NOT NULL
      );
      CREATE TABLE ${quoteIdentifier(database.schema)}.${quoteIdentifier("analyses")} (
        id uuid PRIMARY KEY,
        name text NOT NULL
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

    const statusRowBlock = readInterfaceBlock(source, "ProjectStatusRow");
    assert.match(statusRowBlock, /label: string;/);

    const companyRowBlock = readInterfaceBlock(source, "CompanyRow");
    assert.match(companyRowBlock, /name: string;/);

    const caseRowBlock = readInterfaceBlock(source, "CaseRow");
    assert.match(caseRowBlock, /name: string;/);

    const baseRowBlock = readInterfaceBlock(source, "BaseRow");
    assert.match(baseRowBlock, /name: string;/);

    const analysisRowBlock = readInterfaceBlock(source, "AnalysisRow");
    assert.match(analysisRowBlock, /name: string;/);
  } finally {
    await runSql(
      database.dbEnv,
      `
        DROP TABLE IF EXISTS ${quoteIdentifier(database.schema)}.${quoteIdentifier("analyses")};
        DROP TABLE IF EXISTS ${quoteIdentifier(database.schema)}.${quoteIdentifier("bases")};
        DROP TABLE IF EXISTS ${quoteIdentifier(database.schema)}.${quoteIdentifier("cases")};
        DROP TABLE IF EXISTS ${quoteIdentifier(database.schema)}.${quoteIdentifier("companies")};
        DROP TABLE IF EXISTS ${quoteIdentifier(database.schema)}.${quoteIdentifier("project_statuses")};
        DROP TABLE IF EXISTS ${quoteIdentifier(database.schema)}.${quoteIdentifier("citext_samples")}
      `
    );
    await restoreGeneratedTypesSnapshot(generatedTypesSnapshot);
  }
});

test("db:types fails with clear details for unsupported type mapping", async () => {
  const generatedTypesSnapshot = await takeGeneratedTypesSnapshot();

  await runSql(
    database.dbEnv,
    `
      CREATE TABLE ${quoteIdentifier(database.schema)}.${quoteIdentifier("unsupported_type_samples")} (
        id uuid PRIMARY KEY,
        marker point NOT NULL
      );
    `
  );

  try {
    const result = runDbCommandResult("db:types", database.dbEnv);
    const output = `${result.stdout}\n${result.stderr}`;

    assert.notEqual(result.status, 0);
    assert.match(output, /Unsupported PostgreSQL type mapping/);
    assert.match(output, new RegExp(`schema "${database.schema}"`));
    assert.match(output, /table "unsupported_type_samples"/);
    assert.match(output, /column "marker"/);
    assert.match(output, /data_type "point"/);
    assert.match(output, /udt_name "point"/);
  } finally {
    await runSql(
      database.dbEnv,
      `DROP TABLE IF EXISTS ${quoteIdentifier(database.schema)}.${quoteIdentifier("unsupported_type_samples")}`
    );
    await restoreGeneratedTypesSnapshot(generatedTypesSnapshot);
  }
});

test("db:types script uses shared knex config construction path", async () => {
  const source = await readFile(GENERATOR_SCRIPT_FILE, "utf8");
  assert.match(source, /buildKnexConfig/);
});
