import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireProductionApiPermission } from "@/lib/production/permissions";

export const dynamic = "force-dynamic";

/** Bale stock inventory items for baling output. */
export async function GET() {
  const authResult = await requireProductionApiPermission("canRead");
  if (!authResult.ok) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  try {
    const items = await db.inventoryItem.findMany({
      where: { isActive: true, stock: { materialType: "BALES" } },
      select: {
        id: true,
        code: true,
        name: true,
        currentStock: true,
      },
      orderBy: { name: "asc" },
    });
    return NextResponse.json(items);
  } catch (error) {
    console.error("Error fetching bale items:", error);
    return NextResponse.json({ error: "Failed to fetch bale items" }, { status: 500 });
  }
}
