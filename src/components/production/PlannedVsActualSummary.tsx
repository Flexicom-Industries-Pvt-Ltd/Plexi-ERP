"use client";

import { achievementPercent, sumRunTotals } from "@/lib/production/achievement";

interface Props {
  lines: Array<{
    id: string;
    targetQty: number;
    runs?: Array<{
      targetQty?: number;
      actualQty?: number;
      acceptedQty?: number;
      rejectedQty?: number;
      reworkQty?: number;
      scrapQty?: number;
      downtimeMinutes?: number;
      endedAt?: string | null;
    }>;
  }>;
}

export function PlannedVsActualSummary({ lines }: Props) {
  const plannedTarget = lines.reduce((sum, l) => sum + (l.targetQty ?? 0), 0);
  const allRuns = lines.flatMap((l) => l.runs ?? []);
  const completedRuns = allRuns.filter((r) => r.endedAt);
  const totals = sumRunTotals(completedRuns.length ? completedRuns : allRuns);
  const actual = totals.acceptedQty || totals.actualQty;
  const diff = actual - plannedTarget;
  const achievement = achievementPercent(actual, plannedTarget);

  const cards = [
    { label: "Planned Target", value: plannedTarget.toLocaleString(), sub: "Total across all lines" },
    { label: "Actual Produced", value: actual.toLocaleString(), sub: `${totals.acceptedQty} accepted` },
    { label: "Variance", value: `${diff >= 0 ? "+" : ""}${diff.toLocaleString()}`, sub: diff >= 0 ? "Over plan" : "Under plan", accent: diff >= 0 ? "text-emerald-600" : "text-red-600" },
    { label: "Achievement", value: `${achievement}%`, sub: "Accepted vs planned target", accent: achievement >= 100 ? "text-emerald-600" : achievement >= 80 ? "text-amber-600" : "text-red-600" },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => (
        <div key={card.label} className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{card.label}</p>
          <p className={`text-2xl font-bold mt-1 ${card.accent ?? "text-slate-800"}`}>{card.value}</p>
          <p className="text-xs text-slate-400 mt-1">{card.sub}</p>
        </div>
      ))}
    </div>
  );
}
