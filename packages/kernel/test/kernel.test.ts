import test from "node:test";
import assert from "node:assert/strict";
import { AppError, ErrorCode, fail, normalizeError, ok } from "../src";

test("ok wraps payload in a success envelope", () => {
  assert.deepEqual(ok({ status: "ok" }), {
    ok: true,
    data: { status: "ok" }
  });
});

test("fail returns normalized error metadata", () => {
  assert.deepEqual(fail(ErrorCode.INTERNAL_ERROR, "boom"), {
    ok: false,
    error: { code: ErrorCode.INTERNAL_ERROR, message: "boom" }
  });
});

test("normalizeError converts unknown values into AppError", () => {
  const normalized = normalizeError(new Error("bad"));
  assert.equal(normalized instanceof AppError, true);
  assert.equal(normalized.code, ErrorCode.INTERNAL_ERROR);
});
