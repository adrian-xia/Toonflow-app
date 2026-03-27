import { Client } from "pg";

import { DbConfig } from "../config/db-config";
import { readDbConfig } from "../config/read-db-config";

interface QueryResultRow {
  [key: string]: unknown;
}

export interface TestDatabase {
  schema: string;
  dbEnv: Record<string, string>;
  ensureSchema: () => Promise<void>;
  resetSchema: () => Promise<void>;
  tableExists: (tableName: string) => Promise<boolean>;
  latestBatchNumber: () => Promise<number | null>;
  truncateAllTables: (options?: { includeMigrationTables?: boolean }) => Promise<void>;
  destroy: () => Promise<void>;
}

const TEST_DB_DEFAULTS = {
  TEST_DB_HOST: "127.0.0.1",
  TEST_DB_PORT: "55432",
  TEST_DB_USER: "postgres",
  TEST_DB_PASSWORD: "postgres",
  TEST_DB_NAME: "toonflow_db_test",
  TEST_DB_SCHEMA: "toonflow_test"
} as const;

function quoteIdentifier(value: string): string {
  return `"${value.replace(/"/g, "\"\"")}"`;
}

function toDbEnv(config: DbConfig): Record<string, string> {
  return {
    DB_HOST: config.host,
    DB_PORT: String(config.port),
    DB_USER: config.user,
    DB_PASSWORD: config.password,
    DB_NAME: config.database,
    DB_SCHEMA: config.schema,
    DB_SSL: config.ssl ? "true" : "false",
    DB_POOL_MIN: String(config.pool.min),
    DB_POOL_MAX: String(config.pool.max),
    DB_POOL_IDLE_TIMEOUT_MS: String(config.pool.idleTimeoutMillis),
    DB_POOL_ACQUIRE_TIMEOUT_MS: String(config.pool.acquireTimeoutMillis)
  };
}

function readTestDbConfig(env: NodeJS.ProcessEnv): DbConfig {
  return readDbConfig(
    {
      ...TEST_DB_DEFAULTS,
      ...env
    },
    { prefix: "TEST_DB" }
  );
}

async function fetchRows(
  client: Client,
  text: string,
  values: unknown[] = []
): Promise<QueryResultRow[]> {
  const result = await client.query(text, values);
  return result.rows;
}

export async function createTestDatabase(
  env: NodeJS.ProcessEnv = process.env
): Promise<TestDatabase> {
  const config = readTestDbConfig(env);
  const client = new Client({
    host: config.host,
    port: config.port,
    user: config.user,
    password: config.password,
    database: config.database,
    ssl: config.ssl
  });
  const schema = config.schema;

  await client.connect();

  const ensureSchema = async () => {
    await client.query(`CREATE SCHEMA IF NOT EXISTS ${quoteIdentifier(schema)}`);
  };

  const resetSchema = async () => {
    await client.query(`DROP SCHEMA IF EXISTS ${quoteIdentifier(schema)} CASCADE`);
    await ensureSchema();
  };

  const tableExists = async (tableName: string): Promise<boolean> => {
    const rows = await fetchRows(
      client,
      `
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = $1
          AND table_name = $2
        LIMIT 1
      `,
      [schema, tableName]
    );

    return rows.length > 0;
  };

  const latestBatchNumber = async (): Promise<number | null> => {
    if (!(await tableExists("knex_migrations"))) {
      return null;
    }

    const rows = await fetchRows(
      client,
      `SELECT MAX(batch) AS batch FROM ${quoteIdentifier(schema)}.${quoteIdentifier("knex_migrations")}`
    );
    const batch = rows[0]?.batch;
    if (batch === null || batch === undefined) {
      return null;
    }

    const parsedBatch = Number(batch);
    return Number.isFinite(parsedBatch) ? parsedBatch : null;
  };

  const truncateAllTables = async (
    options: { includeMigrationTables?: boolean } = {}
  ): Promise<void> => {
    const includeMigrationTables = options.includeMigrationTables ?? false;
    const rows = await fetchRows(
      client,
      `
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = $1
          AND table_type = 'BASE TABLE'
      `,
      [schema]
    );

    const tableNames = rows
      .map((row) => String(row.table_name))
      .filter((tableName) => {
        if (includeMigrationTables) {
          return true;
        }

        return tableName !== "knex_migrations" && tableName !== "knex_migrations_lock";
      });

    if (tableNames.length === 0) {
      return;
    }

    const tableList = tableNames
      .map((tableName) => `${quoteIdentifier(schema)}.${quoteIdentifier(tableName)}`)
      .join(", ");

    await client.query(`TRUNCATE TABLE ${tableList} RESTART IDENTITY CASCADE`);
  };

  await ensureSchema();

  return {
    schema,
    dbEnv: toDbEnv(config),
    ensureSchema,
    resetSchema,
    tableExists,
    latestBatchNumber,
    truncateAllTables,
    async destroy() {
      await client.end();
    }
  };
}
