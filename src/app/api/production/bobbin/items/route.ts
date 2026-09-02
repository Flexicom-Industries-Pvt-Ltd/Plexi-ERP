import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

import { requireProductionApiPermission } from "@/lib/production/permissions";

export const dynamic = "force-dynamic";

export async function GET(_request: NextRequest) {
  const authResult = await requireProductionApiPermission("canRead");
  if (!authResult.ok) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  try {
    const [rawMaterials, bobbins] = await Promise.all([
      db.inventoryItem.findMany({
        where: { isActive: true, stock: { materialType: "RAW_MATERIALS" } },
        orderBy: { name: "asc" },
        select: { id: true, code: true, name: true, currentStock: true },
      }),
      db.inventoryItem.findMany({
        where: { isActive: true, stock: { materialType: "BOBBINS" } },
        orderBy: { name: "asc" },
        select: { id: true, code: true, name: true, currentStock: true },
      }),
    ]);

    return NextResponse.json({ rawMaterials, bobbins });
  } catch (error) {
    console.error("Error fetching bobbin items:", error);
    return NextResponse.json({ error: "Failed to fetch items" }, { status: 500 });
  }
}
