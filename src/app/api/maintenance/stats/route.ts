import { NextRequest } from "next/server";
import { requireApiAuth } from "@/lib/api-auth";
import { apiSuccess, apiError } from "@/lib/api-response";
import { Module } from "@/generated/prisma";
import { MaintenanceService } from "@/services/maintenance.service";

export async function GET(request: NextRequest) {
  const auth = await requireApiAuth({
    module: [Module.PRODUCTION, Module.SETTINGS],
    action: "canRead",
  });
  if (!auth.ok) return auth.response;

  try {
    const stats = await MaintenanceService.getMaintenanceStats();
    return apiSuccess({ stats });
  } catch (error: any) {
    return apiError(error.message || "Failed to fetch maintenance statistics", 400);
  }
}
