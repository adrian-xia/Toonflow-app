import test from "node:test";
import assert from "node:assert/strict";

import { createDbClient, readDbConfig } from "../src/index";

test("db package exposes the phase-1 public API entry points", () => {
  assert.equal(typeof readDbConfig, "function");
  assert.equal(typeof createDbClient, "function");
});
