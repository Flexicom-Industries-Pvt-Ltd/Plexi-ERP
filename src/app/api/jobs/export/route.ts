import { NextRequest, NextResponse } from "next/server";
import { requireApiAuth, isSuperAdminRole } from "@/lib/api-auth";
import { apiError, apiSuccess } from "@/lib/api-response";
import { taskQueue } from "@/lib/queue/task-queue";
import { withIdempotency } from "@/lib/idempotency";
import { rateLimiters, applyRateLimitHeaders } from "@/lib/rate-limit";
import { Module } from "@/generated/prisma";

const ALLOWED_EXPORT_TYPES: Record<string, Module> = {
  EXPORT_AUDIT_LOGS: Module.SETTINGS,
  EXPORT_ATTENDANCE: Module.HR,
  EXPORT_PRODUCTION_SUMMARY: Module.PRODUCTION,
  EXPORT_INVENTORY_STOCK: Module.INVENTORY,
  EXPORT_GATE_REGISTRY: Module.SECURITY_GATE,
};

export async function POST(request: NextRequest) {
  const rateLimitRes = await rateLimiters.mutation(request);
  if (!rateLimitRes.success) {
    const errorResponse = apiError("Too Many Requests: Rate limit exceeded", 429);
    return applyRateLimitHeaders(errorResponse, rateLimitRes);
  }

  const auth = await requireApiAuth();
  if (!auth.ok) return auth.response;

  return withIdempotency(request, async () => {
    try {
      const body = await request.json().catch(() => ({}));
      const exportType = (body.type || "EXPORT_AUDIT_LOGS") as string;

      // Allowlist validation (ERP-029)
      const targetModule = ALLOWED_EXPORT_TYPES[exportType];
      if (!targetModule) {
        return applyRateLimitHeaders(apiError(`Invalid export type: ${exportType}`, 400), rateLimitRes);
      }

      // Check module export permissions
      if (!isSuperAdminRole(auth.user.role)) {
        const permissions = (auth.user.permissions as Array<{ module: string; canRead?: boolean }>) || [];
        const hasAccess = permissions.some((p) => (p.module === targetModule || p.module === "ALL") && Boolean(p.canRead));
        if (!hasAccess) {
          return applyRateLimitHeaders(apiError(`Forbidden: Insufficient permissions for ${targetModule} export`, 403), rateLimitRes);
        }
      }

      const job = await taskQueue.enqueue(
        exportType,
        {
          filters: body.filters || {},
          requestedAt: new Date().toISOString(),
        },
        { createdById: auth.user.id }
      );

      const response = NextResponse.json(
        {
          success: true,
          message: "Export task accepted and queued for background processing",
          data: {
            jobId: job.id,
            type: job.type,
            status: job.status,
            pollUrl: `/api/jobs/${job.id}`,
            createdAt: job.createdAt,
          },
        },
        { status: 202 }
      );

      return applyRateLimitHeaders(response, rateLimitRes);
    } catch (err: any) {
      const errorResponse = apiError(err.message || "Failed to enqueue export job", 500);
      return applyRateLimitHeaders(errorResponse, rateLimitRes);
    }
  });
}
