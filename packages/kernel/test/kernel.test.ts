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
  const normalized = normalizeError("bad");
  assert.equal(normalized instanceof AppError, true);
  assert.equal(normalized.code, ErrorCode.INTERNAL_ERROR);
  assert.equal(normalized.message, "Unknown error");
  assert.equal(normalized.details, "bad");
});

test("normalizeError preserves context when wrapping Error", () => {
  const original = new Error("bad");
  original.stack = "Error: bad\n    at fake:1:1";

  const normalized = normalizeError(original);

  assert.equal(normalized.code, ErrorCode.INTERNAL_ERROR);
  assert.equal(normalized.message, "bad");
  assert.equal(normalized.stack, original.stack);
  assert.equal(
    (normalized as AppError & {
      cause?: unknown;
    }).cause,
    original
  );
});

test("normalizeError returns AppError instances as-is", () => {
  const original = new AppError(ErrorCode.VALIDATION_ERROR, "invalid", 400, {
    field: "name"
  });

  assert.equal(normalizeError(original), original);
});
