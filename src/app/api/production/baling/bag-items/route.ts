import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireProductionApiPermission } from "@/lib/production/permissions";

export const dynamic = "force-dynamic";

/** Finished bag inventory items available for baling (approved stock). */
export async function GET() {
  const authResult = await requireProductionApiPermission("canRead");
  if (!authResult.ok) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  try {
    const items = await db.inventoryItem.findMany({
      where: {
        isActive: true,
        currentStock: { gt: 0 },
        stock: { materialType: "FINISHED_BAGS" },
      },
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
    console.error("Error fetching bag items:", error);
    return NextResponse.json({ error: "Failed to fetch bag items" }, { status: 500 });
  }
}
