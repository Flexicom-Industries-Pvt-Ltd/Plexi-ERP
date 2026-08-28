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

  try {
    const [totalItems, lowStockItems, recentTransactions, pendingGateReceiptsCount] = await Promise.all([
      db.inventoryItem.count({ where: { isActive: true } }),
      db.inventoryItem.findMany({
        where: {
          isActive: true,
          minimumStock: { gt: 0 },
          // Prisma doesn't support field-to-field comparison natively in a simple `where` for some versions without raw,
          // so we will fetch items where minimumStock > 0 and filter in memory if needed, 
          // or we can just fetch all active items and filter in memory since catalog might not be huge.
          // Wait, Prisma can do field comparisons now? No, not easily without queryRaw.
          // We will just fetch all active items that have a minimumStock > 0 and filter in JS.
        },
        include: { uom: true, location: true },
      }),
      db.inventoryTransaction.findMany({
        orderBy: { createdAt: "desc" },
        take: 10,
        include: { item: { include: { uom: true } }, user: { select: { name: true } } }
      }),
      db.gateEntry.count({
        where: {
          status: { in: ["UNLOADING", "COMPLETED", "GATE_OUT"] },
          stockDetails: { some: { actualQuantity: null } }
        }
      })
    ]);

    const actualLowStock = lowStockItems.filter(item => item.currentStock <= item.minimumStock);

    const stats = {
      totalItems,
      lowStockCount: actualLowStock.length,
      pendingReceipts: pendingGateReceiptsCount,
    };

    return NextResponse.json({
      stats,
      lowStockItems: actualLowStock,
      recentTransactions
    });
  } catch (error) {
    console.error("Error fetching inventory dashboard:", error);
    return NextResponse.json({ error: "Failed to fetch dashboard data" }, { status: 500 });
  }
}
