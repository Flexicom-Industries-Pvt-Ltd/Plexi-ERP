import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { GateEntryStatus } from "@/generated/prisma";

export const dynamic = "force-dynamic";

const INSIDE_STATUSES: GateEntryStatus[] = [
  GateEntryStatus.ARRIVED,
  GateEntryStatus.DOCUMENT_VERIFICATION,
  GateEntryStatus.VERIFIED,
  GateEntryStatus.PARKING,
  GateEntryStatus.READY,
  GateEntryStatus.LOADING,
  GateEntryStatus.UNLOADING,
  GateEntryStatus.ON_HOLD,
  GateEntryStatus.COMPLETED,
];

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const permissions = (session.user as { permissions?: { module: string; canRead: boolean }[] }).permissions || [];
  const hasAccess =
    (session.user as { role?: string }).role === "SUPERADMIN" ||
    permissions.some((p) => p.module === "SECURITY_GATE" && p.canRead);

  if (!hasAccess) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [inside, waiting, loading, unloading, verificationPending, onHold, gateOutToday] =
      await Promise.all([
        db.gateEntry.count({ where: { status: { in: INSIDE_STATUSES } } }),
        db.gateEntry.count({
          where: { status: { in: [GateEntryStatus.PARKING, GateEntryStatus.READY, GateEntryStatus.ON_HOLD] } },
        }),
        db.gateEntry.count({ where: { status: GateEntryStatus.LOADING } }),
        db.gateEntry.count({ where: { status: GateEntryStatus.UNLOADING } }),
        db.gateEntry.count({ where: { status: GateEntryStatus.DOCUMENT_VERIFICATION } }),
        db.gateEntry.count({ where: { status: GateEntryStatus.ON_HOLD } }),
        db.gateEntry.count({
          where: {
            status: GateEntryStatus.GATE_OUT,
            exitTime: { gte: todayStart },
          },
        }),
      ]);

    return NextResponse.json({
      inside,
      waiting,
      loading,
      unloading,
      verificationPending,
      onHold,
      gateOutToday,
    });
  } catch (error) {
    console.error("Error fetching gate stats:", error);
    return NextResponse.json({ error: "Failed to fetch gate stats" }, { status: 500 });
  }
}
