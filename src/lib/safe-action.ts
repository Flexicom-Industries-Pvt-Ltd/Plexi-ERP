import { z } from "zod";
import { errorResponse, successResponse, ApiResponse } from "./api-response";
import { ApiError, ValidationError } from "./exceptions";
import { Module } from "@/generated/prisma";

/**
 * A higher-order function to wrap Next.js Server Actions.
 * It automatically parses Zod schemas, catches exceptions, and returns a standardized JSON response.
 * Optionally logs the action to the AuditLog.
 *
 * @param schema The Zod schema to validate the input against
 * @param handler The actual server action logic to execute
 * @param auditConfig Optional configuration to automatically log this action
 */
export function safeAction<TInput, TOutput>(
  schema: z.ZodType<TInput>,
  handler: (parsedInput: TInput) => Promise<TOutput>
): (input: unknown) => Promise<ApiResponse<TOutput>> {
  return async (input: unknown): Promise<ApiResponse<TOutput>> => {
    try {
      // 1. Validate input against the Zod schema
      const validationResult = schema.safeParse(input);
      if (!validationResult.success) {
        throw new ValidationError(validationResult.error.flatten().fieldErrors as Record<string, string[]>);
      }

      // 2. Execute the handler with the parsed input
      const result = await handler(validationResult.data);

      // 3. Return a standardized success response
      return successResponse(result);
    } catch (error) {
      // 5. Catch and format errors
      console.error("[SafeAction Error]:", error);

      if (error instanceof ValidationError) {
        return errorResponse(error.message, error.code, error.validationErrors);
      }

      if (error instanceof ApiError) {
        return errorResponse(error.message, error.code);
      }

      // Hide internal server crash details from the client
      return errorResponse(
        "An unexpected error occurred on the server.",
        "INTERNAL_SERVER_ERROR"
      );
    }
  };
}
