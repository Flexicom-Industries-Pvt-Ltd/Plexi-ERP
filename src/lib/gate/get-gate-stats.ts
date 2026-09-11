import { db } from "@/lib/db";
import { GateEntryStatus } from "@/generated/prisma";

export const INSIDE_STATUSES: GateEntryStatus[] = [
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

export type GateStats = {
  inside: number;
  waiting: number;
  loading: number;
  unloading: number;
  verificationPending: number;
  onHold: number;
  gateOutToday: number;
};

export async function getGateStats(): Promise<GateStats> {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const [groupedCounts, gateOutToday] = await Promise.all([
    db.gateEntry.groupBy({
      by: ["status"],
      _count: { _all: true },
    }),
    db.gateEntry.count({
      where: {
        status: GateEntryStatus.GATE_OUT,
        exitTime: { gte: todayStart },
      },
    }),
  ]);

  const statusMap: Record<string, number> = {};
  for (const item of groupedCounts) {
    statusMap[item.status] = item._count._all;
  }

  const inside = INSIDE_STATUSES.reduce((acc, s) => acc + (statusMap[s] || 0), 0);
  const waiting =
    (statusMap[GateEntryStatus.PARKING] || 0) +
    (statusMap[GateEntryStatus.READY] || 0) +
    (statusMap[GateEntryStatus.ON_HOLD] || 0);
  const loading = statusMap[GateEntryStatus.LOADING] || 0;
  const unloading = statusMap[GateEntryStatus.UNLOADING] || 0;
  const verificationPending = statusMap[GateEntryStatus.DOCUMENT_VERIFICATION] || 0;
  const onHold = statusMap[GateEntryStatus.ON_HOLD] || 0;

  return {
    inside,
    waiting,
    loading,
    unloading,
    verificationPending,
    onHold,
    gateOutToday,
  };
}
