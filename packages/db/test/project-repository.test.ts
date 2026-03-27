import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, before, beforeEach, test } from "node:test";

import {
  createDbClient,
  createProjectRepository,
  readDbConfig
} from "../src/index";
import { createTestDatabase, TestDatabase } from "../src/test-utils/database";

let database: TestDatabase;
let db: ReturnType<typeof createDbClient>;

before(async () => {
  database = await createTestDatabase();
  db = createDbClient(readDbConfig(database.dbEnv, { prefix: "DB" }));
});

beforeEach(async () => {
  await database.truncateAllTables();
});

after(async () => {
  await db.destroy();
  await database.destroy();
});

test("project repository inserts and fetches a project by id", async () => {
  const repo = createProjectRepository(db.executor);

  const created = await repo.insert({
    slug: "pilot",
    title: "Pilot"
  });

  assert.equal(typeof created.id, "string");
  assert.equal(created.slug, "pilot");
  assert.equal(created.title, "Pilot");
  assert.equal(created.description, null);
  assert.equal(created.status, "draft");
  assert.equal(typeof created.created_at, "string");
  assert.equal(typeof created.updated_at, "string");

  const found = await repo.getById(created.id);

  assert.deepEqual(found, created);
});

test("project repository returns null for a missing project", async () => {
  const repo = createProjectRepository(db.executor);

  const found = await repo.getById(randomUUID());

  assert.equal(found, null);
});

test("project repository updates mutable fields", async () => {
  const repo = createProjectRepository(db.executor);
  const created = await repo.insert({
    slug: "pilot",
    title: "Pilot"
  });

  const updated = await repo.updateById(created.id, {
    slug: "pilot-revised",
    title: "Pilot Revised",
    description: "Reworked outline",
    status: "archived"
  });

  assert.notEqual(updated, null);
  assert.equal(updated?.id, created.id);
  assert.equal(updated?.slug, "pilot-revised");
  assert.equal(updated?.title, "Pilot Revised");
  assert.equal(updated?.description, "Reworked outline");
  assert.equal(updated?.status, "archived");

  const found = await repo.getById(created.id);

  assert.equal(found?.slug, "pilot-revised");
  assert.equal(found?.title, "Pilot Revised");
  assert.equal(found?.description, "Reworked outline");
  assert.equal(found?.status, "archived");
});

test("project repository deletes by id", async () => {
  const repo = createProjectRepository(db.executor);
  const created = await repo.insert({
    slug: "pilot",
    title: "Pilot"
  });

  const deleted = await repo.deleteById(created.id);

  assert.equal(deleted, true);
  assert.equal(await repo.getById(created.id), null);
  assert.equal(await repo.deleteById(created.id), false);
});

test("project repository works with a transactional executor and commits", async () => {
  let createdId = "";

  await db.transaction(async (trx) => {
    const repo = createProjectRepository(trx);
    const created = await repo.insert({
      slug: "transactional-pilot",
      title: "Transactional Pilot"
    });

    createdId = created.id;
  });

  const found = await createProjectRepository(db.executor).getById(createdId);

  assert.equal(found?.slug, "transactional-pilot");
  assert.equal(found?.title, "Transactional Pilot");
});

test("project repository rolls back transactional writes when the callback throws", async () => {
  let createdId = "";

  await assert.rejects(
    () =>
      db.transaction(async (trx) => {
        const repo = createProjectRepository(trx);
        const created = await repo.insert({
          slug: "rollback-pilot",
          title: "Rollback Pilot"
        });

        createdId = created.id;

        throw new Error("force rollback");
      }),
    /force rollback/
  );

  const found = await createProjectRepository(db.executor).getById(createdId);

  assert.equal(found, null);
});

test("project repository surfaces database unique constraint failures for slug", async () => {
  const repo = createProjectRepository(db.executor);

  await repo.insert({
    slug: "pilot",
    title: "Pilot"
  });

  await assert.rejects(
    () =>
      repo.insert({
        slug: "pilot",
        title: "Duplicate Pilot"
      }),
    /duplicate key|unique/i
  );
});
