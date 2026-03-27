import test from "node:test";
import assert from "node:assert/strict";

import * as dbPublicApi from "../src/index";

test("db package exposes the phase-1 public API entry points", () => {
  const exportNames = Object.keys(dbPublicApi).sort();
  assert.deepEqual(
    exportNames,
    ["createDbClient", "createProjectRepository", "readDbConfig"]
  );
  assert.equal(typeof dbPublicApi.readDbConfig, "function");
  assert.equal(typeof dbPublicApi.createDbClient, "function");
  assert.equal(typeof dbPublicApi.createProjectRepository, "function");
});
