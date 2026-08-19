export interface ApiErrorResponse {
  success: false;
  error: {
    message: string;
    code?: string;
    validationErrors?: Record<string, string[]>;
  };
}

export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  meta?: Record<string, unknown>;
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

/**
 * Creates a standard success response payload.
 */
export function successResponse<T>(data: T, meta?: Record<string, unknown>): ApiSuccessResponse<T> {
  return {
    success: true,
    data,
    ...(meta && { meta })
  };
}

/**
 * Creates a standard error response payload.
 */
export function errorResponse(message: string, code?: string, validationErrors?: Record<string, string[]>): ApiErrorResponse {
  return {
    success: false,
    error: {
      message,
      ...(code && { code }),
      ...(validationErrors && { validationErrors })
    }
  };
}
