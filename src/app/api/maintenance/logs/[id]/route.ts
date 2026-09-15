import { NextRequest } from "next/server";
import { requireApiAuth } from "@/lib/api-auth";
import { apiSuccess, apiError } from "@/lib/api-response";
import { Module } from "@/generated/prisma";
import { MaintenanceService } from "@/services/maintenance.service";
import { UpdateMaintenanceLogSchema } from "@/lib/schemas/maintenance";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireApiAuth({
    module: [Module.PRODUCTION, Module.SETTINGS],
    action: "canRead",
  });
  if (!auth.ok) return auth.response;

  try {
    const { id } = await params;
    const log = await MaintenanceService.getMaintenanceLogById(id);

    if (!log) {
      return apiError("Maintenance log not found", 404);
    }

    return apiSuccess(log);
  } catch (error: any) {
    return apiError(error.message || "Failed to fetch maintenance log", 400);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireApiAuth({
    module: [Module.PRODUCTION, Module.SETTINGS],
    action: "canUpdate",
  });
  if (!auth.ok) return auth.response;

  try {
    const { id } = await params;
    const body = await request.json();
    const data = UpdateMaintenanceLogSchema.parse(body);

    const updated = await MaintenanceService.updateMaintenanceLog(
      id,
      data,
      auth.session.user.id
    );

    return apiSuccess(updated);
  } catch (error: any) {
    return apiError(error.message || "Failed to update maintenance log", 400);
  }
}
