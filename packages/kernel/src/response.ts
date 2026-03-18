export interface SuccessResponse<T> {
  ok: true;
  data: T;
}

export interface ErrorResponse {
  ok: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export type ApiResponse<T> = SuccessResponse<T> | ErrorResponse;

export function ok<T>(data: T): SuccessResponse<T> {
  return { ok: true, data };
}

export function fail(code: string, message: string, details?: unknown): ErrorResponse {
  return {
    ok: false,
    error: details === undefined ? { code, message } : { code, message, details }
  };
}
