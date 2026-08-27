import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { logEvent } from "@/lib/logging";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Check update permission
  const user = await db.user.findUnique({
    where: { id: session.user.id },
    include: { role: { include: { permissions: true } } },
  });

  const hasAccess =
    user?.role?.name === "SUPERADMIN" ||
    user?.role?.permissions.some((p) => p.module === "SECURITY_GATE" && p.canUpdate);

  if (!hasAccess) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const data = await request.json();
    const entry = await db.gateEntry.findUnique({ where: { entryNumber: id } });

    if (!entry) return NextResponse.json({ error: "Gate Entry not found" }, { status: 404 });

    if (entry.status === "GATE_OUT") {
      return NextResponse.json({ error: "Cannot add stock details to a completed journey (GATE_OUT)" }, { status: 400 });
    }

    const newStock = await db.truckStockDetail.create({
      data: {
        gateEntryId: entry.id,
        materialName: data.materialName,
        materialType: data.materialType,
        quantity: parseFloat(data.quantity),
        unit: data.unit,
        batchLot: data.batchLot,
        supplierCustomer: data.supplierCustomer,
        expectedQuantity: data.expectedQuantity ? parseFloat(data.expectedQuantity) : null,
        actualQuantity: data.actualQuantity ? parseFloat(data.actualQuantity) : null,
      },
    });

    await logEvent({
      userId: session.user.id,
      module: "SECURITY_GATE",
      severity: "INFO",
      action: "Added Stock Detail to Gate Entry",
      payload: newStock,
      meta: { entryId: entry.id, entryNumber: entry.entryNumber },
    });

    return NextResponse.json(newStock, { status: 201 });
  } catch (error) {
    console.error("Error adding stock detail:", error);
    return NextResponse.json({ error: "Failed to add stock detail" }, { status: 500 });
  }
}
