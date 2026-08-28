import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { logEvent, logDiff } from "@/lib/logging";
import { GateEntryStatus } from "@/generated/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const permissions = (session.user as any).permissions || [];
  const hasAccess =
    (session.user as any).role === "SUPERADMIN" ||
    permissions.some((p: any) => p.module === "SECURITY_GATE" && p.canRead);

  if (!hasAccess) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const entry = await db.gateEntry.findUnique({
      where: { entryNumber: id },
      include: {
        stockDetails: true,
        documents: {
          include: { verifier: { select: { name: true, email: true } } },
        },
        user: { select: { name: true, email: true } },
      },
    });

    if (!entry) return NextResponse.json({ error: "Not found" }, { status: 404 });

    return NextResponse.json(entry);
  } catch (error) {
    console.error("Error fetching gate entry details:", error);
    return NextResponse.json({ error: "Failed to fetch gate entry" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const permissions = (session.user as any).permissions || [];
  const hasAccess =
    (session.user as any).role === "SUPERADMIN" ||
    permissions.some((p: any) => p.module === "SECURITY_GATE" && p.canUpdate);

  if (!hasAccess) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const data = await request.json();
    const existing = await db.gateEntry.findUnique({ where: { entryNumber: id } });

    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const updatedData: any = { ...data, updatedBy: session.user.id };

    // If changing status to GATE_OUT, set exitTime
    if (data.status === "GATE_OUT" && existing.status !== "GATE_OUT") {
      updatedData.exitTime = new Date();
    }

    const updated = await db.gateEntry.update({
      where: { entryNumber: id },
      data: updatedData,
    });

    await logDiff({
      userId: session.user.id,
      module: "SECURITY_GATE",
      entity: "GateEntry",
      entityId: updated.id,
      before: existing,
      after: updated,
    });

    logEvent({
      userId: session.user.id,
      module: "SECURITY_GATE",
      severity: "INFO",
      action: `Updated Gate Entry Status to ${updated.status}`,
      payload: { entryId: updated.id, status: updated.status },
      meta: { entryNumber: updated.entryNumber },
    }).catch(console.error);

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating gate entry:", error);
    return NextResponse.json({ error: "Failed to update gate entry" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const permissions = (session.user as any).permissions || [];
  const hasAccess =
    (session.user as any).role === "SUPERADMIN" ||
    permissions.some((p: any) => p.module === "SECURITY_GATE" && p.canDelete);

  if (!hasAccess) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const existing = await db.gateEntry.findUnique({ where: { entryNumber: id } });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // Prevent deleting COMPLETED or GATE_OUT entries if they are tied to inventory
    if (existing.status === "COMPLETED" || existing.status === "GATE_OUT") {
       return NextResponse.json({ error: "Cannot delete a completed journey." }, { status: 400 });
    }

    await db.gateEntry.delete({
      where: { entryNumber: id },
    });

    logEvent({
      userId: session.user.id,
      module: "SECURITY_GATE",
      severity: "WARN",
      action: "Deleted Gate Entry",
      payload: { deletedEntryId: existing.id, entryNumber: existing.entryNumber },
      meta: { entryNumber: existing.entryNumber },
    }).catch(console.error);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting gate entry:", error);
    return NextResponse.json({ error: "Failed to delete gate entry" }, { status: 500 });
  }
}
