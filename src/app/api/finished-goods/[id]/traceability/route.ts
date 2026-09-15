import { NextRequest } from "next/server";
import { requireApiAuth } from "@/lib/api-auth";
import { apiSuccess, apiError } from "@/lib/api-response";
import { Module } from "@/generated/prisma";
import { FinishedGoodsService } from "@/services/finished-goods.service";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireApiAuth({
    module: [Module.INVENTORY, Module.PRODUCTION, Module.DISPATCH],
    action: "canRead",
  });
  if (!auth.ok) return auth.response;

  try {
    const { id } = await params;
    const traceability = await FinishedGoodsService.getFinishedGoodsTraceability(id);

    if (!traceability) {
      return apiError("Finished goods lot not found", 404);
    }

    return apiSuccess(traceability);
  } catch (error: any) {
    return apiError(error.message || "Failed to fetch traceability tree", 400);
  }
}
