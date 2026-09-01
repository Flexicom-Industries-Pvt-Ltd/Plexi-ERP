import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
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

  const { searchParams } = new URL(request.url);
  const itemId = searchParams.get("itemId");

  try {
    const batches = await db.inventoryBatch.findMany({
      where: itemId ? { itemId, quantity: { gt: 0 } } : { quantity: { gt: 0 } },
      orderBy: { receivedAt: "desc" },
      include: {
        item: { include: { uom: true } },
        location: true,
      },
      take: 200,
    });

    return NextResponse.json(batches);
  } catch (error) {
    console.error("Error fetching inventory batches:", error);
    return NextResponse.json({ error: "Failed to fetch batches" }, { status: 500 });
  }
}
