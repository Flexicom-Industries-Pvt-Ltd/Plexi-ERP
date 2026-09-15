import { NextRequest } from "next/server";
import { requireApiAuth } from "@/lib/api-auth";
import { apiSuccess, apiError } from "@/lib/api-response";
import { Module } from "@/generated/prisma";
import { FinishedGoodsService } from "@/services/finished-goods.service";

export async function GET(request: NextRequest) {
  const auth = await requireApiAuth({
    module: [Module.INVENTORY, Module.PRODUCTION],
    action: "canRead",
  });
  if (!auth.ok) return auth.response;

  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || undefined;
    const shiftId = searchParams.get("shiftId") || undefined;

    const queue = await FinishedGoodsService.getBalesQueue({ search, shiftId });
    return apiSuccess(queue);
  } catch (error: any) {
    return apiError(error.message || "Failed to fetch bales queue", 400);
  }
}
