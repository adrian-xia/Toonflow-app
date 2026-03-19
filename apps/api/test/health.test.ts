import test from "node:test";
import assert from "node:assert/strict";
import express from "express";
import request from "supertest";
import { createApp } from "../src/app";
import healthRouter from "../src/routes/health";
import { errorHandler } from "../src/middleware/error-handler";

function createTestApp(configure: (app: express.Express) => void) {
  const app = express();
  app.use(express.json());
  app.use("/health", healthRouter);
  configure(app);
  app.use(errorHandler);
  return app;
}

test("GET /health returns the kernel success envelope", async () => {
  const response = await request(createApp()).get("/health");

  assert.equal(response.status, 200);
  assert.equal(response.body.ok, true);
  assert.equal(response.body.data.status, "ok");
  assert.equal(response.body.data.service, "api");
  assert.match(response.body.data.timestamp, /^\d{4}-\d{2}-\d{2}T/);
});

test("error handler returns the kernel error envelope for sync throw", async () => {
  const app = createTestApp((instance) => {
    instance.get("/test-error", () => {
      throw new Error("boom");
    });
  });

  const response = await request(app).get("/test-error");

  assert.equal(response.status, 500);
  assert.deepEqual(response.body, {
    ok: false,
    error: {
      code: "INTERNAL_ERROR",
      message: "boom"
    }
  });
});

test("error handler returns the kernel error envelope for async throw", async () => {
  const app = createTestApp((instance) => {
    instance.get("/test-async-error", async () => {
      throw new Error("async boom");
    });
  });

  const response = await request(app).get("/test-async-error");

  assert.equal(response.status, 500);
  assert.deepEqual(response.body, {
    ok: false,
    error: {
      code: "INTERNAL_ERROR",
      message: "async boom"
    }
  });
});

test("error handler returns the kernel error envelope for next(err)", async () => {
  const app = createTestApp((instance) => {
    instance.get("/test-next-error", (_req, _res, next) => {
      next(new Error("next boom"));
    });
  });

  const response = await request(app).get("/test-next-error");

  assert.equal(response.status, 500);
  assert.deepEqual(response.body, {
    ok: false,
    error: {
      code: "INTERNAL_ERROR",
      message: "next boom"
    }
  });
});
