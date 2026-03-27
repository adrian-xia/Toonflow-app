import { randomUUID } from "node:crypto";

import { DbExecutor } from "../client/types";
import { PROJECTS_TABLE } from "../schema/tables/projects";
import { ProjectInsert, ProjectRow, ProjectUpdate } from "../types";

export type ProjectStatus = ProjectRow["status"];
export type ProjectRecord = ProjectRow;
export type InsertProjectInput = Omit<
  ProjectInsert,
  "id" | "description" | "created_at" | "updated_at"
> & {
  id?: ProjectInsert["id"];
  description?: ProjectInsert["description"];
};
export type UpdateProjectInput = ProjectUpdate;

export interface ProjectRepository {
  getById: (id: string) => Promise<ProjectRecord | null>;
  insert: (input: InsertProjectInput) => Promise<ProjectRecord>;
  updateById: (id: string, input: UpdateProjectInput) => Promise<ProjectRecord | null>;
  deleteById: (id: string) => Promise<boolean>;
}

type RuntimeProjectRow = Omit<ProjectRow, "created_at" | "updated_at"> & {
  created_at: Date | string;
  updated_at: Date | string;
};

function toIsoString(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : value;
}

function normalizeProject(row: RuntimeProjectRow): ProjectRecord {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    description: row.description,
    status: row.status,
    created_at: toIsoString(row.created_at),
    updated_at: toIsoString(row.updated_at)
  };
}

function projectTable(executor: DbExecutor) {
  return executor<RuntimeProjectRow>(PROJECTS_TABLE);
}

function stripUndefined<T extends Record<string, unknown>>(value: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(value).filter(([, entry]) => entry !== undefined)
  ) as Partial<T>;
}

export function createProjectRepository(executor: DbExecutor): ProjectRepository {
  return {
    async getById(id) {
      const row = await projectTable(executor).where({ id }).first();
      return row ? normalizeProject(row) : null;
    },
    async insert(input) {
      const payload: ProjectInsert = {
        id: input.id ?? randomUUID(),
        slug: input.slug,
        title: input.title,
        description: input.description ?? null,
        status: input.status ?? "draft"
      };
      const rows = await projectTable(executor)
        .insert(payload)
        .returning("*");

      return normalizeProject(rows[0]);
    },
    async updateById(id, input) {
      const rows = await projectTable(executor)
        .where({ id })
        .update(
          stripUndefined({
            slug: input.slug,
            title: input.title,
            description: input.description,
            status: input.status,
            updated_at: executor.fn.now()
          })
        )
        .returning("*");

      const row = rows[0];
      return row ? normalizeProject(row) : null;
    },
    async deleteById(id) {
      const deletedCount = await projectTable(executor).where({ id }).delete();
      return deletedCount > 0;
    }
  };
}
