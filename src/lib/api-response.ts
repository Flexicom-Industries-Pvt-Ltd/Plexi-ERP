import { NextResponse } from "next/server";

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
 * Creates a standard success response payload for Server Actions.
 */
export function successResponse<T>(data: T, meta?: Record<string, unknown>): ApiSuccessResponse<T> {
  return {
    success: true,
    data,
    ...(meta && { meta }),
  };
}

/**
 * Creates a standard error response payload for Server Actions.
 */
export function errorResponse(
  message: string,
  code?: string,
  validationErrors?: Record<string, string[]>
): ApiErrorResponse {
  return {
    success: false,
    error: {
      message,
      ...(code && { code }),
      ...(validationErrors && { validationErrors }),
    },
  };
}

export interface ApiResponseOptions {
  status?: number;
  headers?: Record<string, string>;
  meta?: Record<string, unknown>;
}

/**
 * apiSuccess
 * Standardized success response envelope for Next.js REST API route handlers.
 */
export function apiSuccess<T>(data: T, options: ApiResponseOptions = {}) {
  const { status = 200, headers = {}, meta } = options;
  return NextResponse.json(
    meta ? { success: true, data, meta } : data,
    { status, headers }
  );
}

/**
 * apiError
 * Standardized error response envelope for Next.js REST API route handlers.
 */
export function apiError(
  message: string,
  status = 500,
  details?: Record<string, unknown>
) {
  return NextResponse.json(
    {
      error: message,
      ...(details ? { details } : {}),
    },
    { status }
  );
}
