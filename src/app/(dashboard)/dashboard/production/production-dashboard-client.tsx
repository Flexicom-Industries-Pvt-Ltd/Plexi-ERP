"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import {
  Factory,
  ClipboardList,
  ArrowRight,
  AlertTriangle,
  Target,
  TrendingUp,
  Clock,
  Play,
} from "lucide-react";
import { statusLabel } from "@/lib/production/phases";

interface DashboardData {
  kpis: {
    todayTarget: number;
    todayActual: number;
    todayAccepted: number;
    achievementPercent: number;
    delayedPlansCount: number;
    activePlans: number;
    inProgressPlans: number;
    totalPlansToday: number;
    runsToday: number;
    completedRunsToday: number;
  };
  byPhase: Array<{ phase: string; label: string; target: number; actual: number; accepted: number; achievement: number; planCount: number }>;
  byShift: Array<{ shiftId: string; shiftName: string; target: number; actual: number; accepted: number; achievement: number; planCount: number }>;
  byMachine: Array<{ machineId: string; machineName: string; target: number; actual: number; accepted: number; achievement: number; runCount: number }>;
  delayedPlans: Array<{ id: string; planNumber: string; planDate: string; shiftName: string; status: string }>;
}

export function ProductionDashboardClient() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));

  useEffect(() => {
    setLoading(true);
    fetch(`/api/production/dashboard?date=${selectedDate}`)
      .then((r) => (r.ok ? r.json() : null))
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [selectedDate]);

  const kpis = data?.kpis;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-wrap gap-3">
          <Link href="/dashboard/production/plans" className="text-sm font-medium px-3 py-1.5 rounded-lg bg-white border border-slate-200 hover:border-primary/30 text-slate-700">
            Shift Plans
          </Link>
          <Link href="/dashboard/production/handovers" className="text-sm font-medium px-3 py-1.5 rounded-lg bg-white border border-slate-200 hover:border-primary/30 text-slate-700">
            Shift Handover
          </Link>
          <Link href="/dashboard/data-centre/production-characteristics" className="text-sm font-medium px-3 py-1.5 rounded-lg bg-white border border-slate-200 hover:border-primary/30 text-slate-700">
            Phase Characteristics
          </Link>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">Dashboard Date</label>
          <input
            type="date"
            className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Today's Target", value: kpis?.todayTarget ?? 0, icon: Target, bg: "bg-blue-100", text: "text-blue-600", sub: "Planned output" },
          { label: "Today's Actual", value: kpis?.todayAccepted ?? 0, icon: TrendingUp, bg: "bg-emerald-100", text: "text-emerald-600", sub: `${kpis?.todayActual ?? 0} gross produced` },
          { label: "Achievement", value: `${kpis?.achievementPercent ?? 0}%`, icon: Factory, bg: "bg-amber-100", text: "text-amber-600", sub: "Accepted vs target" },
          { label: "Delayed Plans", value: kpis?.delayedPlansCount ?? 0, icon: AlertTriangle, bg: (kpis?.delayedPlansCount ?? 0) > 0 ? "bg-red-100" : "bg-slate-100", text: (kpis?.delayedPlansCount ?? 0) > 0 ? "text-red-600" : "text-slate-600", sub: "Past due, not completed" },
        ].map((card) => (
          <div key={card.label} className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className={`h-10 w-10 ${card.bg} ${card.text} rounded-lg flex items-center justify-center`}>
                <card.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500">{card.label}</p>
                <p className="text-2xl font-bold text-slate-800">{loading ? "—" : card.value}</p>
                <p className="text-xs text-slate-400">{card.sub}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: "Plans Today", value: kpis?.totalPlansToday ?? 0, icon: ClipboardList },
          { label: "Active / In Progress", value: `${kpis?.activePlans ?? 0} / ${kpis?.inProgressPlans ?? 0}`, icon: Play },
          { label: "Runs Completed", value: `${kpis?.completedRunsToday ?? 0} / ${kpis?.runsToday ?? 0}`, icon: Clock },
        ].map((card) => (
          <div key={card.label} className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-3">
            <card.icon className="h-5 w-5 text-slate-400" />
            <div>
              <p className="text-xs text-slate-500">{card.label}</p>
              <p className="text-lg font-semibold text-slate-800">{loading ? "—" : card.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SummaryTable
          title="Phase-wise Production"
          loading={loading}
          emptyMessage="No production plans for this date."
          headers={["Phase", "Target", "Accepted", "Achievement"]}
          rows={(data?.byPhase ?? []).map((row) => [
            row.label,
            row.target.toLocaleString(),
            row.accepted.toLocaleString(),
            `${row.achievement}%`,
          ])}
        />
        <SummaryTable
          title="Shift-wise Production"
          loading={loading}
          emptyMessage="No shift plans for this date."
          headers={["Shift", "Plans", "Target", "Accepted", "Achievement"]}
          rows={(data?.byShift ?? []).map((row) => [
            row.shiftName,
            String(row.planCount),
            row.target.toLocaleString(),
            row.accepted.toLocaleString(),
            `${row.achievement}%`,
          ])}
        />
      </div>

      <SummaryTable
        title="Machine-wise Output"
        loading={loading}
        emptyMessage="No completed runs for this date."
        headers={["Machine", "Runs", "Target", "Accepted", "Achievement"]}
        rows={(data?.byMachine ?? []).map((row) => [
          row.machineName,
          String(row.runCount),
          row.target.toLocaleString(),
          row.accepted.toLocaleString(),
          `${row.achievement}%`,
        ])}
      />

      {(data?.delayedPlans?.length ?? 0) > 0 && (
        <div className="bg-white rounded-xl border border-red-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-red-100 bg-red-50">
            <h3 className="font-semibold text-red-800 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" /> Delayed Plans
            </h3>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="px-4 py-2 text-left font-medium text-slate-600">Plan #</th>
                <th className="px-4 py-2 text-left font-medium text-slate-600">Date</th>
                <th className="px-4 py-2 text-left font-medium text-slate-600">Shift</th>
                <th className="px-4 py-2 text-left font-medium text-slate-600">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data!.delayedPlans.map((plan) => (
                <tr key={plan.id} className="hover:bg-slate-50">
                  <td className="px-4 py-2">
                    <Link href={`/dashboard/production/plans/${plan.planNumber}`} className="text-primary font-medium">
                      {plan.planNumber}
                    </Link>
                  </td>
                  <td className="px-4 py-2 text-slate-600">{format(new Date(plan.planDate), "dd MMM yyyy")}</td>
                  <td className="px-4 py-2 text-slate-600">{plan.shiftName}</td>
                  <td className="px-4 py-2 text-slate-600">{statusLabel(plan.status)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function SummaryTable({
  title,
  headers,
  rows,
  loading,
  emptyMessage,
}: {
  title: string;
  headers: string[];
  rows: string[][];
  loading: boolean;
  emptyMessage: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100">
        <h3 className="font-semibold text-slate-800">{title}</h3>
      </div>
      {loading ? (
        <p className="p-6 text-sm text-slate-400">Loading...</p>
      ) : rows.length === 0 ? (
        <p className="p-6 text-sm text-slate-400">{emptyMessage}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b">
              <tr>
                {headers.map((h) => (
                  <th key={h} className="px-4 py-2 text-left font-medium text-slate-600">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((row, i) => (
                <tr key={i} className="hover:bg-slate-50">
                  {row.map((cell, j) => (
                    <td key={j} className="px-4 py-2 text-slate-700">{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
