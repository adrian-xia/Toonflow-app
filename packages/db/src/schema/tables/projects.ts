import { Knex } from "knex";

import { addTimestamps, addUuidIdColumn } from "../common/columns";

export const PROJECTS_TABLE = "projects";
export const PROJECT_STATUS_ENUM_NAME = "project_status";
export const PROJECT_STATUS_VALUES = ["draft", "archived"] as const;

export type ProjectStatus = (typeof PROJECT_STATUS_VALUES)[number];

function quoteIdentifier(value: string): string {
  return `"${value.replace(/"/g, "\"\"")}"`;
}

function quoteLiteral(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}

export async function createProjectStatusType(knex: Knex): Promise<void> {
  await knex.raw(
    `
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_type
          INNER JOIN pg_namespace ON pg_namespace.oid = pg_type.typnamespace
          WHERE typname = ${quoteLiteral(PROJECT_STATUS_ENUM_NAME)}
            AND pg_namespace.nspname = current_schema()
        ) THEN
          CREATE TYPE ${quoteIdentifier(PROJECT_STATUS_ENUM_NAME)} AS ENUM (${PROJECT_STATUS_VALUES.map(
            (value) => quoteLiteral(value)
          ).join(", ")});
        END IF;
      END
      $$;
    `
  );
}

export async function dropProjectStatusType(knex: Knex): Promise<void> {
  await knex.raw(`DROP TYPE IF EXISTS ${quoteIdentifier(PROJECT_STATUS_ENUM_NAME)}`);
}

export function defineProjectsTable(
  table: Knex.CreateTableBuilder,
  knex: Knex
): void {
  addUuidIdColumn(table);
  table.text("slug").notNullable().unique();
  table.text("title").notNullable();
  table.text("description").nullable();
  table
    .specificType("status", PROJECT_STATUS_ENUM_NAME)
    .notNullable()
    .defaultTo(PROJECT_STATUS_VALUES[0]);
  addTimestamps(table, knex);
}
