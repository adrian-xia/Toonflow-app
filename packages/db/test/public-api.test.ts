import test from "node:test";
import assert from "node:assert/strict";

import * as dbPublicApi from "../src/index";

test("db package exposes the phase-1 public API entry points", () => {
  const exportNames = Object.keys(dbPublicApi);

  assert.ok(exportNames.includes("readDbConfig"));
  assert.ok(exportNames.includes("createDbClient"));
  assert.ok(exportNames.includes("createProjectRepository"));
  assert.equal(typeof dbPublicApi.readDbConfig, "function");
  assert.equal(typeof dbPublicApi.createDbClient, "function");
  assert.equal(typeof dbPublicApi.createProjectRepository, "function");
  assert.equal("buildKnexConfig" in dbPublicApi, false);
});
