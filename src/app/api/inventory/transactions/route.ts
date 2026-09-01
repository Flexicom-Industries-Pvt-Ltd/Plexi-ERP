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
      take: 100,
      include: {
        item: {
          include: {
            uom: true,
            category: true,
          },
        },
        user: { select: { name: true, employeeId: true } },
      },
    });

    const gateEntryIds = [
      ...new Set(
        transactions
          .filter((tx) => tx.referenceType === "GATE_ENTRY" && tx.referenceId)
          .map((tx) => tx.referenceId as string),
      ),
    ];

    const gateEntries =
      gateEntryIds.length > 0
        ? await db.gateEntry.findMany({
            where: { id: { in: gateEntryIds } },
            select: { id: true, entryNumber: true },
          })
        : [];

    const gateEntryNumbers = Object.fromEntries(
      gateEntries.map((entry) => [entry.id, entry.entryNumber]),
    );

    const enriched = transactions.map((tx) => ({
      ...tx,
      gateEntryNumber:
        tx.referenceType === "GATE_ENTRY" && tx.referenceId
          ? gateEntryNumbers[tx.referenceId] ?? null
          : null,
    }));

    return NextResponse.json(enriched);
  } catch (error) {
    console.error("Error fetching inventory transactions:", error);
    return NextResponse.json({ error: "Failed to fetch inventory transactions" }, { status: 500 });
  }
}
