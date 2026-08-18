import { db } from "@/lib/db";
import { Module } from "@/generated/prisma";
import { headers } from "next/headers";
import { auth } from "@/auth";

export interface LogAuditParams {
  action: string;
  module: Module;
  entityId?: string;
  oldValues?: any;
  newValues?: any;
  durationMs?: number;
}

/**
 * Asynchronously logs an action to the database.
 * Does not block the main execution thread.
 */
export async function logAudit(params: LogAuditParams) {
  try {
    // Attempt to get the current user session
    const session = await auth();
    const userId = session?.user?.id || null;

    // Attempt to get IP and User-Agent from headers
    let ipAddress = null;
    let userAgent = null;

    try {
      const headersList = await headers();
      ipAddress = headersList.get("x-forwarded-for") || headersList.get("x-real-ip") || null;
      userAgent = headersList.get("user-agent") || null;
    } catch (e) {
      // In some server environments (e.g. background tasks), headers might not be available
      console.warn("Could not retrieve headers for audit log", e);
    }

    // Insert the log record in the background
    // We don't await this so it doesn't block the request response
    db.auditLog.create({
      data: {
        userId,
        action: params.action,
        module: params.module,
        entityId: params.entityId,
        oldValues: params.oldValues || null,
        newValues: params.newValues || null,
        ipAddress,
        userAgent,
        durationMs: params.durationMs,
      },
    }).catch((dbError) => {
      console.error("[AuditLog DB Error]: Failed to save audit log", dbError);
    });

  } catch (error) {
    console.error("[AuditLog Error]: Failed to process audit log", error);
  }
}
