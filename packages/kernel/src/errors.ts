export enum ErrorCode {
  INTERNAL_ERROR = "INTERNAL_ERROR",
  VALIDATION_ERROR = "VALIDATION_ERROR"
}

export class AppError extends Error {
  constructor(
    public code: ErrorCode,
    message: string,
    public status: number = 500,
    public details?: unknown,
    options?: ErrorOptions
  ) {
    super(message, options);
    this.name = "AppError";
  }
}

export function normalizeError(error: unknown): AppError {
  if (error instanceof AppError) return error;
  if (error instanceof Error) {
    const normalized = new AppError(ErrorCode.INTERNAL_ERROR, error.message, 500, undefined, {
      cause: error
    });
    normalized.stack = error.stack ?? normalized.stack;
    return normalized;
  }
  return new AppError(ErrorCode.INTERNAL_ERROR, "Unknown error", 500, error);
}
