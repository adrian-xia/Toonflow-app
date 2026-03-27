import { Knex } from "knex";

import {
  createProjectStatusType,
  defineProjectsTable,
  dropProjectStatusType,
  PROJECTS_TABLE
} from "../schema/tables/projects";

export async function up(knex: Knex): Promise<void> {
  await createProjectStatusType(knex);
  await knex.schema.createTable(PROJECTS_TABLE, (table) => {
    defineProjectsTable(table, knex);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists(PROJECTS_TABLE);
  await dropProjectStatusType(knex);
}
