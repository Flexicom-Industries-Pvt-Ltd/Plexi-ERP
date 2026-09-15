import { NextRequest } from "next/server";
import { requireApiAuth } from "@/lib/api-auth";
import { apiSuccess, apiError } from "@/lib/api-response";
import { Module } from "@/generated/prisma";
import { DispatchService } from "@/services/dispatch.service";

export async function GET(request: NextRequest) {
  const auth = await requireApiAuth({
    module: [Module.DISPATCH, Module.INVENTORY],
    action: "canRead",
  });
  if (!auth.ok) return auth.response;

  try {
    const { searchParams } = new URL(request.url);
    const itemId = searchParams.get("itemId");

    if (!itemId) {
      return apiError("itemId query parameter is required", 400);
    }

    const lots = await DispatchService.getAvailableLotsForProduct(itemId);
    return apiSuccess(lots);
  } catch (error: any) {
    return apiError(error.message || "Failed to fetch available lots", 400);
  }
}
