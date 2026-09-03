import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireProductionApiPermission } from "@/lib/production/permissions";

export const dynamic = "force-dynamic";

export async function GET() {
  const authResult = await requireProductionApiPermission("canRead");
  if (!authResult.ok) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  try {
    const items = await db.inventoryItem.findMany({
      where: { isActive: true, stock: { materialType: "FINISHED_BAGS" } },
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
    console.error("Error fetching manual stitch output items:", error);
    return NextResponse.json({ error: "Failed to fetch output items" }, { status: 500 });
  }
}
