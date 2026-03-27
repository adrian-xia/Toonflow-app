import { Knex } from "knex";

export function addUuidIdColumn(
  table: Knex.CreateTableBuilder,
  columnName = "id"
): void {
  table.uuid(columnName).primary();
}

export function addTimestamps(
  table: Knex.CreateTableBuilder,
  knex: Knex
): void {
  table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
  table.timestamp("updated_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
}
