import { NextRequest } from "next/server";
import { requireApiAuth } from "@/lib/api-auth";
import { apiSuccess, apiError } from "@/lib/api-response";
import { Module } from "@/generated/prisma";
import { FinishedGoodsService } from "@/services/finished-goods.service";
import { ReceiveFinishedGoodsSchema } from "@/lib/schemas/finished-goods";

export async function POST(request: NextRequest) {
  const auth = await requireApiAuth({
    module: [Module.FINISHED_GOODS, Module.INVENTORY, Module.PRODUCTION],
    action: "canCreate",
  });
  if (!auth.ok) return auth.response;

  try {
    const body = await request.json();
    const data = ReceiveFinishedGoodsSchema.parse(body);

    const result = await FinishedGoodsService.receiveFinishedGoods(data, {
      userId: auth.session.user.id,
    });

    return apiSuccess(result, { status: 201 });
  } catch (error: any) {
    return apiError(error.message || "Failed to receive finished goods stock", 400);
  }
}
