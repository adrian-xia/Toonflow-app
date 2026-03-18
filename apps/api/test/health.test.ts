import test from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import { createApp } from "../src/app";

test("GET /health returns the kernel success envelope", async () => {
  const response = await request(createApp()).get("/health");

  assert.equal(response.status, 200);
  assert.equal(response.body.ok, true);
  assert.equal(response.body.data.status, "ok");
  assert.equal(response.body.data.service, "api");
  assert.match(response.body.data.timestamp, /^\d{4}-\d{2}-\d{2}T/);
});
