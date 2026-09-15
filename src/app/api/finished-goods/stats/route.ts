import { NextRequest } from "next/server";
import { requireApiAuth } from "@/lib/api-auth";
import { apiSuccess, apiError } from "@/lib/api-response";
import { Module } from "@/generated/prisma";
import { FinishedGoodsService } from "@/services/finished-goods.service";

export async function GET(request: NextRequest) {
  const auth = await requireApiAuth({
    module: [Module.FINISHED_GOODS, Module.INVENTORY, Module.PRODUCTION, Module.DISPATCH],
    action: "canRead",
  });
  if (!auth.ok) return auth.response;

  try {
    const stats = await FinishedGoodsService.getFinishedGoodsStats();
    return apiSuccess(stats);
  } catch (error: any) {
    return apiError(error.message || "Failed to fetch finished goods statistics", 400);
  }
}
