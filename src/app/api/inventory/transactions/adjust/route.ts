import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { logEvent } from "@/lib/logging";
import { TransactionType } from "@/generated/prisma";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const permissions = session.user.permissions || [];
  const hasAccess =
    session.user.role === "SUPERADMIN" ||
    permissions.some((p: any) => p.module === "INVENTORY" && p.canUpdate); // Updating stock requires update permission

  if (!hasAccess) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { itemId, adjustmentQuantity, remarks } = await request.json();

    if (!itemId || adjustmentQuantity === undefined || adjustmentQuantity === 0) {
      return NextResponse.json({ error: "Invalid adjustment payload" }, { status: 400 });
    }

    const diffs: any[] = [];
    
    await db.$transaction(async (tx) => {
      const item = await tx.inventoryItem.findUnique({ where: { id: itemId } });
      if (!item) throw new Error("Item not found");

      const newStock = item.currentStock + Number(adjustmentQuantity);

      const updatedItem = await tx.inventoryItem.update({
        where: { id: itemId },
        data: { currentStock: newStock },
      });

      const invTx = await tx.inventoryTransaction.create({
        data: {
          itemId,
          type: TransactionType.ADJUSTMENT,
          quantity: Number(adjustmentQuantity),
          referenceType: "MANUAL",
          remarks: remarks || "Manual Stock Adjustment",
          userId: session.user?.id,
        },
      });

      diffs.push({
        entity: "InventoryItem",
        entityId: itemId,
        before: { currentStock: item.currentStock },
        after: { currentStock: updatedItem.currentStock, transactionId: invTx.id },
      });
    });

    await logEvent({
      userId: session.user.id,
      module: "INVENTORY",
      action: "MANUAL_STOCK_ADJUSTMENT",
      severity: "WARN", // Using WARN because manual adjustments skip normal processes
      payload: { itemId, adjustmentQuantity, remarks },
      diffs
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error adjusting stock:", error);
    return NextResponse.json({ error: error.message || "Failed to adjust stock" }, { status: 500 });
  }
}
