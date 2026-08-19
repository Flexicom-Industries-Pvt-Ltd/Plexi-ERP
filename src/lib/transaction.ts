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
  action: TransactionAction<T>
): Promise<T> {
  const startTime = Date.now();
  
  // 1. Get the unified request context (Correlation ID, IP, User Agent, User ID)
  const context = await getRequestContext();

  try {
    // 2. Execute the action inside a transaction
    const result = await db.$transaction(async (tx) => {
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
    });

    return result;
  } catch (error) {
    // Optionally log the failure somewhere (e.g. error tracking service) 
    // including the correlationId for easier debugging
    console.error(`[CorrelationID: ${context.correlationId}] Transaction failed:`, error);
    throw error;
  }
}
