import { requireApiAuth } from "@/lib/api-auth";
import { apiError, apiSuccess } from "@/lib/api-response";
import { Module } from "@/generated/prisma";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const authResult = await requireApiAuth({
    module: [Module.INVENTORY, Module.DATA_CENTRE],
    action: "canRead",
  });
  if (!authResult.ok) return authResult.response;

  try {
    const stocks = await db.stock.findMany({
      where: { isActive: true },
      include: { uom: true },
      orderBy: { name: "asc" },
    });

    return apiSuccess(stocks);
  } catch (error) {
    console.error("[STOCKS_LIST_ERROR]", error);
    return apiError("Failed to fetch stocks", 500);
  }
}
