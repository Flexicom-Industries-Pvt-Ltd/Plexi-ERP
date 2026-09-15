import { NextRequest } from "next/server";
import { requireApiAuth } from "@/lib/api-auth";
import { apiSuccess, apiError } from "@/lib/api-response";
import { Module } from "@/generated/prisma";
import { RecyclingService } from "@/services/recycling.service";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireApiAuth({
    module: [Module.RECYCLING_PLANT, Module.PRODUCTION, Module.QUALITY_CONTROL],
    action: "canRead",
  });
  if (!auth.ok) return auth.response;

  try {
    const { id } = await params;
    const batch = await RecyclingService.getRecyclingBatchById(id);

    if (!batch) {
      return apiError("Recycling batch not found", 404);
    }

    return apiSuccess(batch);
  } catch (error: any) {
    return apiError(error.message || "Failed to fetch recycling batch", 400);
  }
}
