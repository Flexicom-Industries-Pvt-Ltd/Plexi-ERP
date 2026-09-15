import { NextRequest } from "next/server";
import { requireApiAuth } from "@/lib/api-auth";
import { apiSuccess, apiError } from "@/lib/api-response";
import { Module } from "@/generated/prisma";
import { RecyclingService } from "@/services/recycling.service";

export async function GET(request: NextRequest) {
  const auth = await requireApiAuth({
    module: [Module.PRODUCTION, Module.QUALITY_CONTROL],
    action: "canRead",
  });
  if (!auth.ok) return auth.response;

  try {
    const records = await RecyclingService.getAvailableScrapForRecycling();
    return apiSuccess({ records });
  } catch (error: any) {
    return apiError(error.message || "Failed to fetch available scrap", 400);
  }
}
