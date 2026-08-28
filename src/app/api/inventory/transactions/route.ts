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
    permissions.some((p: any) => p.module === "INVENTORY" && p.canRead);

  if (!hasAccess) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type");
  const itemId = searchParams.get("itemId");
  
  const where: any = {};
  if (type) where.type = type;
  if (itemId) where.itemId = itemId;

  try {
    const transactions = await db.inventoryTransaction.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 100, // Limit to 100 recent transactions to prevent huge payloads
      include: {
        item: {
          include: {
            uom: true,
            category: true,
          }
        },
        user: { select: { name: true, employeeId: true } },
      },
    });

    return NextResponse.json(transactions);
  } catch (error) {
    console.error("Error fetching inventory transactions:", error);
    return NextResponse.json({ error: "Failed to fetch inventory transactions" }, { status: 500 });
  }
}
