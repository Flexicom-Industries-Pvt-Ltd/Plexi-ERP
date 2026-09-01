import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { logEvent } from "@/lib/logging";
import { TransactionType } from "@/generated/prisma";
import { resolveInventoryItemFromStock } from "@/lib/inventory/resolve-stock-item";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const permissions = session.user.permissions || [];
  const hasAccess =
    session.user.role === "SUPERADMIN" ||
    permissions.some((p: any) => p.module === "INVENTORY" && p.canCreate);

  if (!hasAccess) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { gateEntryId, commits } = await request.json();
    // commits: { stockDetailId, stockId, actualQuantity }

    if (!gateEntryId || !Array.isArray(commits) || commits.length === 0) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    for (const commit of commits) {
      if (!commit.stockDetailId || !commit.stockId || commit.actualQuantity == null) {
        return NextResponse.json({ error: "Each line requires stockDetailId, stockId, and actualQuantity" }, { status: 400 });
      }
    }

    const gateEntry = await db.gateEntry.findUnique({ where: { id: gateEntryId } });
    if (!gateEntry) {
      return NextResponse.json({ error: "Gate Entry not found" }, { status: 404 });
    }

    const transactionType = gateEntry.purpose === "LOADING" ? TransactionType.OUT : TransactionType.IN;
    const diffs: any[] = [];

    await db.$transaction(async (tx) => {
      for (const commit of commits) {
        const { stockDetailId, stockId, actualQuantity } = commit;

        // 1. Update TruckStockDetail
        const stockDetail = await tx.truckStockDetail.update({
          where: { id: stockDetailId },
          data: { actualQuantity, stockId },
        });

        // 2. Resolve catalog stock to inventory item (find or create)
        const item = await resolveInventoryItemFromStock(stockId, tx);
        const itemId = item.id;

        const newStock = transactionType === "IN" 
          ? item.currentStock + actualQuantity 
          : item.currentStock - actualQuantity;

        const updatedItem = await tx.inventoryItem.update({
          where: { id: itemId },
          data: { currentStock: newStock },
        });

        // 3. Create InventoryTransaction
        const invTx = await tx.inventoryTransaction.create({
          data: {
            itemId,
            type: transactionType,
            quantity: actualQuantity,
            referenceType: "GATE_ENTRY",
            referenceId: gateEntryId,
            userId: session.user?.id,
            remarks: `Gate Entry ${gateEntry.entryNumber}`,
          },
        });

        diffs.push({
          entity: "InventoryItem",
          entityId: itemId,
          before: { currentStock: item.currentStock },
          after: { currentStock: updatedItem.currentStock, transactionId: invTx.id },
        });
      }
    });

    // Log the transaction
    await logEvent({
      userId: session.user.id,
      module: "INVENTORY",
      action: "COMMIT_GATE_RECEIPT",
      severity: "INFO",
      payload: { gateEntryId, commits },
      diffs
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error committing gate receipt:", error);
    return NextResponse.json({ error: error.message || "Failed to commit gate receipt" }, { status: 500 });
  }
}
