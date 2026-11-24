import { db } from "@/lib/db";
import { getRequestContext, RequestContext } from "@/lib/context";
import { Module } from "@/generated/prisma";

export type TransactionAction<T> = (tx: Parameters<Parameters<typeof db.$transaction>[0]>[0], context: RequestContext) => Promise<T>;

type AuditOptions = {
  action: string;
  module: Module;
  entityId?: string;
  oldValues?: any;
  newValues?: any;
};

/**
 * Wrapper for database operations that ensures all actions are executed within a Prisma transaction
 * and automatically logs an audit trail with the request's Correlation ID.
 * 
 * @param auditOptions The audit metadata
 * @param action The business logic to execute inside the transaction
 */
export async function withTransaction<T>(
  auditOptions: AuditOptions,
  action: TransactionAction<T>,
  options?: { maxRetries?: number }
): Promise<T> {
  const startTime = Date.now();
  
  // 1. Get the unified request context (Correlation ID, IP, User Agent, User ID)
  const context = await getRequestContext();
  const maxRetries = options?.maxRetries ?? 3;
  let attempt = 0;

  while (attempt < maxRetries) {
    try {
      // 2. Execute the action inside a transaction
      const result = await db.$transaction(
        async (tx) => {
          // Run the business logic
          const actionResult = await action(tx, context);

          // Log the audit event within the same transaction so it succeeds/fails together
          await tx.auditLog.create({
            data: {
              correlationId: context.correlationId,
              userId: context.userId,
              action: auditOptions.action,
              module: auditOptions.module,
              entityId: auditOptions.entityId,
              oldValues: auditOptions.oldValues || null,
              newValues: auditOptions.newValues || null,
              ipAddress: context.ipAddress,
              userAgent: context.userAgent,
              durationMs: Date.now() - startTime,
            },
          });

          return actionResult;
        },
        {
          maxWait: 15000,
          timeout: 30000,
        }
      );

      return result;
    } catch (error: any) {
      // Bounded retry on database write conflicts / deadlocks
      const isRetryable =
        error?.code === "P2034" ||
        error?.message?.includes("could not serialize access") ||
        error?.message?.includes("deadlock detected");

      if (isRetryable && attempt < maxRetries - 1) {
        attempt++;
        const backoffMs = 50 * Math.pow(2, attempt) + Math.floor(Math.random() * 25);
        await new Promise((res) => setTimeout(res, backoffMs));
        continue;
      }

      console.error(`[CorrelationID: ${context.correlationId}] Transaction failed:`, error);
      throw error;
    }
  }

  throw new Error("Transaction retry limit exceeded");
}
