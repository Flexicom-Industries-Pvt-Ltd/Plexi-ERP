import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const permissions = session.user.permissions || [];
  const hasAccess =
    session.user.role === "SUPERADMIN" ||
    permissions.some((p: { module: string; canRead: boolean }) => p.module === "INVENTORY" && p.canRead);

  if (!hasAccess) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const locations = await db.location.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      include: {
        inventoryItems: {
          where: { isActive: true },
          include: { uom: true, stock: true },
        },
      },
    });

    const unassigned = await db.inventoryItem.findMany({
      where: { isActive: true, locationId: null },
      include: { uom: true, stock: true },
    });

    const groups: {
      locationId: string | null;
      locationName: string;
      locationCode: string;
      locationType: string;
      itemCount: number;
      totalStock: number;
      items: typeof unassigned;
    }[] = locations.map((loc) => ({
      locationId: loc.id,
      locationName: loc.name,
      locationCode: loc.code,
      locationType: loc.type,
      itemCount: loc.inventoryItems.length,
      totalStock: loc.inventoryItems.reduce((sum, item) => sum + item.currentStock, 0),
      items: loc.inventoryItems,
    }));

    if (unassigned.length > 0) {
      groups.push({
        locationId: null as unknown as string,
        locationName: "Unassigned",
        locationCode: "—",
        locationType: "UNASSIGNED",
        itemCount: unassigned.length,
        totalStock: unassigned.reduce((sum, item) => sum + item.currentStock, 0),
        items: unassigned,
      });
    }

    return NextResponse.json(groups);
  } catch (error) {
    console.error("Error fetching location stock:", error);
    return NextResponse.json({ error: "Failed to fetch location stock" }, { status: 500 });
  }
}
