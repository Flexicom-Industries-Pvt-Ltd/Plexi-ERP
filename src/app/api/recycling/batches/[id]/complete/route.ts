import { NextRequest } from "next/server";
import { requireApiAuth } from "@/lib/api-auth";
import { apiSuccess, apiError } from "@/lib/api-response";
import { Module } from "@/generated/prisma";
import { RecyclingService } from "@/services/recycling.service";
import { CompleteRecyclingBatchSchema } from "@/lib/schemas/recycling";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireApiAuth({
    module: [Module.RECYCLING_PLANT, Module.PRODUCTION, Module.QUALITY_CONTROL],
    action: "canUpdate",
  });
  if (!auth.ok) return auth.response;

  try {
    const { id } = await params;
    const body = await request.json();
    const data = CompleteRecyclingBatchSchema.parse(body);

    const completedBatch = await RecyclingService.completeRecyclingBatch(id, data);

    return apiSuccess(completedBatch);
  } catch (error: any) {
    return apiError(error.message || "Failed to complete recycling batch", 400);
  }
}
