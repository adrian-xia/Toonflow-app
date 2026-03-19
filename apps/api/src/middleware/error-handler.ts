import type { NextFunction, Request, Response } from "express";
import { fail, normalizeError } from "@toonflow/kernel";

export function errorHandler(error: unknown, _req: Request, res: Response, _next: NextFunction) {
  const normalized = normalizeError(error);
  res.status(normalized.status).json(
    fail(normalized.code, normalized.message, normalized.details)
  );
}
