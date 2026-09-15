import { NextRequest } from "next/server";
import { requireApiAuth } from "@/lib/api-auth";
import { apiSuccess, apiError } from "@/lib/api-response";
import { Module } from "@/generated/prisma";
import { FinishedGoodsService } from "@/services/finished-goods.service";
import { UpdateFinishedGoodsLotSchema } from "@/lib/schemas/finished-goods";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireApiAuth({
    module: [Module.FINISHED_GOODS, Module.INVENTORY, Module.PRODUCTION, Module.DISPATCH],
    action: "canRead",
  });
  if (!auth.ok) return auth.response;

  try {
    const { id } = await params;
    const lot = await FinishedGoodsService.getFinishedGoodsById(id);

    if (!lot) {
      return apiError("Finished goods lot not found", 404);
    }

    return apiSuccess(lot);
  } catch (error: any) {
    return apiError(error.message || "Failed to fetch finished goods lot", 400);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireApiAuth({
    module: [Module.FINISHED_GOODS, Module.INVENTORY],
    action: "canUpdate",
  });
  if (!auth.ok) return auth.response;

  try {
    const { id } = await params;
    const body = await request.json();
    const data = UpdateFinishedGoodsLotSchema.parse(body);

    const updated = await FinishedGoodsService.updateFinishedGoodsLot(
      id,
      data,
      { userId: auth.session.user.id }
    );

    if (!updated) {
      return apiError("Finished goods lot not found", 404);
    }

    return apiSuccess(updated);
  } catch (error: any) {
    return apiError(error.message || "Failed to update finished goods lot", 400);
  }
}
