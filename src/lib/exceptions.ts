export class ApiError extends Error {
  public statusCode: number;
  public code?: string;

  constructor(message: string, statusCode: number = 500, code?: string) {
    super(message);
    this.name = "ApiError";
    this.statusCode = statusCode;
    this.code = code;
  }
}

export class ValidationError extends ApiError {
  public validationErrors: Record<string, string[]>;

  constructor(validationErrors: Record<string, string[]>) {
    super("Validation failed", 400, "VALIDATION_ERROR");
    this.name = "ValidationError";
    this.validationErrors = validationErrors;
  }
}

export class UnauthorizedError extends ApiError {
  constructor(message = "You must be logged in to perform this action") {
    super(message, 401, "UNAUTHORIZED");
    this.name = "UnauthorizedError";
  }
}

export class ForbiddenError extends ApiError {
  constructor(message = "You do not have permission to perform this action") {
    super(message, 403, "FORBIDDEN");
    this.name = "ForbiddenError";
  }
}

export class NotFoundError extends ApiError {
  constructor(message = "The requested resource was not found") {
    super(message, 404, "NOT_FOUND");
    this.name = "NotFoundError";
  }
}
