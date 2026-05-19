// Typed error handling — all backend errors use these shapes.

export type ErrorCode =
  | "VALIDATION_ERROR"
  | "NOT_FOUND"
  | "AI_ERROR"
  | "AI_PARSE_ERROR"
  | "WORKFLOW_ERROR"
  | "INTERNAL_ERROR";

export interface AppError {
  code: ErrorCode;
  message: string;
  details?: unknown;
}

export class AppException extends Error {
  public readonly code: ErrorCode;
  public readonly details?: unknown;
  public readonly statusCode: number;

  constructor(
    code: ErrorCode,
    message: string,
    options?: { details?: unknown; statusCode?: number }
  ) {
    super(message);
    this.name = "AppException";
    this.code = code;
    this.details = options?.details;
    this.statusCode = options?.statusCode ?? 500;
  }

  toResponse(): AppError {
    return {
      code: this.code,
      message: this.message,
      details: this.details,
    };
  }
}

// Convenience factory functions
export function validationError(message: string, details?: unknown) {
  return new AppException("VALIDATION_ERROR", message, {
    details,
    statusCode: 400,
  });
}

export function notFoundError(message: string) {
  return new AppException("NOT_FOUND", message, { statusCode: 404 });
}

export function aiError(message: string, details?: unknown) {
  return new AppException("AI_ERROR", message, {
    details,
    statusCode: 502,
  });
}

export function aiParseError(message: string, details?: unknown) {
  return new AppException("AI_PARSE_ERROR", message, {
    details,
    statusCode: 502,
  });
}