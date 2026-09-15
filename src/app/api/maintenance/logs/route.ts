import { NextRequest } from "next/server";
import { requireApiAuth } from "@/lib/api-auth";
import { apiSuccess, apiError } from "@/lib/api-response";
import { Module } from "@/generated/prisma";
import { MaintenanceService } from "@/services/maintenance.service";
import {
  CreateMaintenanceLogSchema,
  ListMaintenanceLogsQuerySchema,
} from "@/lib/schemas/maintenance";

export async function GET(request: NextRequest) {
  const auth = await requireApiAuth({
    module: [Module.PRODUCTION, Module.SETTINGS],
    action: "canRead",
  });
  if (!auth.ok) return auth.response;

  try {
    const { searchParams } = new URL(request.url);
    const query = ListMaintenanceLogsQuerySchema.parse({
      machineId: searchParams.get("machineId") || undefined,
      sectionId: searchParams.get("sectionId") || undefined,
      type: searchParams.get("type") || undefined,
      status: searchParams.get("status") || undefined,
      priority: searchParams.get("priority") || undefined,
      search: searchParams.get("search") || undefined,
      page: searchParams.get("page") || undefined,
      limit: searchParams.get("limit") || undefined,
    });

    const [listResult, stats] = await Promise.all([
      MaintenanceService.listMaintenanceLogs(query, { paginate: true }),
      MaintenanceService.getMaintenanceStats(),
    ]);

    return apiSuccess({
      ...listResult,
      stats,
    });
  } catch (error: any) {
    return apiError(error.message || "Failed to fetch maintenance logs", 400);
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireApiAuth({
    module: [Module.PRODUCTION, Module.SETTINGS],
    action: "canCreate",
  });
  if (!auth.ok) return auth.response;

  try {
    const body = await request.json();
    const data = CreateMaintenanceLogSchema.parse(body);

    const log = await MaintenanceService.createMaintenanceLog(
      data,
      auth.session.user.id
    );

    return apiSuccess(log, { status: 201 });
  } catch (error: any) {
    return apiError(error.message || "Failed to create maintenance log", 400);
  }
}
