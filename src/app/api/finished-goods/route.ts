import { NextRequest } from "next/server";
import { requireApiAuth } from "@/lib/api-auth";
import { apiSuccess, apiError } from "@/lib/api-response";
import { Module } from "@/generated/prisma";
import { FinishedGoodsService } from "@/services/finished-goods.service";
import { ListFinishedGoodsQuerySchema } from "@/lib/schemas/finished-goods";

export async function GET(request: NextRequest) {
  const auth = await requireApiAuth({
    module: [Module.INVENTORY, Module.PRODUCTION, Module.DISPATCH],
    action: "canRead",
  });
  if (!auth.ok) return auth.response;

  try {
    const { searchParams } = new URL(request.url);
    const query = ListFinishedGoodsQuerySchema.parse({
      inventoryItemId: searchParams.get("inventoryItemId") || undefined,
      productionBatch: searchParams.get("productionBatch") || undefined,
      locationId: searchParams.get("locationId") || undefined,
      status: searchParams.get("status") || undefined,
      qualityStatus: searchParams.get("qualityStatus") || undefined,
      search: searchParams.get("search") || undefined,
      dateFrom: searchParams.get("dateFrom") || undefined,
      dateTo: searchParams.get("dateTo") || undefined,
      page: searchParams.get("page") || undefined,
      limit: searchParams.get("limit") || undefined,
    });

    const [listResult, stats] = await Promise.all([
      FinishedGoodsService.listFinishedGoods(query, { paginate: true }),
      FinishedGoodsService.getFinishedGoodsStats(),
    ]);

    return apiSuccess({
      ...listResult,
      stats,
    });
  } catch (error: any) {
    return apiError(error.message || "Failed to fetch finished goods stock", 400);
  }
}
