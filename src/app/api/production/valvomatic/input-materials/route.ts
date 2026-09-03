import { NextRequest, NextResponse } from "next/server";
import type { StockMaterialType } from "@/generated/prisma";
import { db } from "@/lib/db";
import { requireProductionApiPermission } from "@/lib/production/permissions";

export const dynamic = "force-dynamic";

const TYPE_MAP: Record<string, StockMaterialType> = {
  yarn: "BOBBINS",
  pp: "PP_ROLLS",
  lpp: "LPP_ROLLS",
};

export async function GET(request: NextRequest) {
  const authResult = await requireProductionApiPermission("canRead");
  if (!authResult.ok) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type");
  const materialTypes = type
    ? [TYPE_MAP[type.toLowerCase()]].filter(Boolean)
    : (["BOBBINS", "PP_ROLLS", "LPP_ROLLS"] as StockMaterialType[]);

  if (type && materialTypes.length === 0) {
    return NextResponse.json({ error: "Invalid type — use yarn, pp, or lpp" }, { status: 400 });
  }

  try {
    const items = await db.inventoryItem.findMany({
      where: { isActive: true, stock: { materialType: { in: materialTypes } } },
      orderBy: { name: "asc" },
      select: {
        id: true,
        code: true,
        name: true,
        currentStock: true,
        stock: { select: { id: true, name: true, materialType: true } },
      },
    });
    return NextResponse.json(items);
  } catch (error) {
    console.error("Error fetching valvomatic input materials:", error);
    return NextResponse.json({ error: "Failed to fetch input materials" }, { status: 500 });
  }
}
