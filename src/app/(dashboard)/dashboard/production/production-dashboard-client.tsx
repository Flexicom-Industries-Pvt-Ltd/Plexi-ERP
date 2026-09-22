"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import {
  Factory,
  ClipboardList,
  Target,
  TrendingUp,
  Clock,
  Layers,
  Sparkles,
  CheckCircle2,
  Cpu,
  Scissors,
  Printer,
  PackageCheck,
  ShieldCheck,
  ArrowRight,
  Sparkle,
} from "lucide-react";

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
}

const PRODUCTION_STAGES = [
  {
    step: 1,
    title: "Shift Planning & Scheduling",
    desc: "Create and approve shift plans, set target quantities, assign machines and operators.",
    icon: ClipboardList,
    badge: "Foundation",
    color: "from-blue-500/20 to-blue-500/5 text-blue-600 border-blue-200",
  },
  {
    step: 2,
    title: "Tape Extrusion & Bobbin",
    desc: "Melt raw polymer granules, slit into tapes, stretch, and wind precision bobbins.",
    icon: Layers,
    badge: "Stage 1",
    color: "from-indigo-500/20 to-indigo-500/5 text-indigo-600 border-indigo-200",
  },
  {
    step: 3,
    title: "Circular Loom Weaving",
    desc: "Weave warp and weft bobbins into continuous PP / LPP tubular fabric rolls.",
    icon: Cpu,
    badge: "Stage 2",
    color: "from-cyan-500/20 to-cyan-500/5 text-cyan-600 border-cyan-200",
  },
  {
    step: 4,
    title: "Extrusion Lamination",
    desc: "Apply molten polymer barrier coating for moisture and chemical resistance.",
    icon: Sparkles,
    badge: "Stage 3",
    color: "from-amber-500/20 to-amber-500/5 text-amber-600 border-amber-200",
  },
  {
    step: 5,
    title: "Flexographic Printing",
    desc: "Print custom customer artwork, branding, color codes, and certification marks.",
    icon: Printer,
    badge: "Stage 4",
    color: "from-purple-500/20 to-purple-500/5 text-purple-600 border-purple-200",
  },
  {
    step: 6,
    title: "Precision Cutting",
    desc: "Cut continuous rolls into precise bag lengths with heat or cold cut sealed edges.",
    icon: Scissors,
    badge: "Stage 5",
    color: "from-pink-500/20 to-pink-500/5 text-pink-600 border-pink-200",
  },
  {
    step: 7,
    title: "Bag Finishing (BCS & Converting)",
    desc: "Convert cut panels into finished bags via BCS, Convertex, Valvomatic, or Manual Stitch.",
    icon: Factory,
    badge: "Stage 6",
    color: "from-emerald-500/20 to-emerald-500/5 text-emerald-600 border-emerald-200",
  },
  {
    step: 8,
    title: "Baling, QC & Warehouse Intake",
    desc: "Compress finished bags into strapped bales, verify QC approval, and post to FG.",
    icon: PackageCheck,
    badge: "Final Stage",
    color: "from-emerald-600/20 to-emerald-600/5 text-emerald-700 border-emerald-300",
  },
];

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
    <div className="space-y-8">
      {/* Date Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-base font-semibold text-slate-800">Manufacturing Command Center</h2>
          <p className="text-xs text-slate-500">Live operational overview across all production lines.</p>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-slate-500">Filter Date:</label>
          <input
            type="date"
            className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
          />
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Today's Target", value: kpis?.todayTarget ?? 0, icon: Target, bg: "bg-blue-50 text-blue-600 border-blue-100", sub: "Planned output units" },
          { label: "Gross Produced", value: kpis?.todayActual ?? 0, icon: TrendingUp, bg: "bg-emerald-50 text-emerald-600 border-emerald-100", sub: `${kpis?.todayAccepted ?? 0} accepted units` },
          { label: "Achievement Rate", value: `${kpis?.achievementPercent ?? 0}%`, icon: Factory, bg: "bg-amber-50 text-amber-600 border-amber-100", sub: "Accepted vs planned" },
          { label: "Active Plans", value: kpis?.activePlans ?? 0, icon: Clock, bg: "bg-purple-50 text-purple-600 border-purple-100", sub: `${kpis?.inProgressPlans ?? 0} currently in progress` },
        ].map((card) => (
          <div key={card.label} className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
            <div className="flex items-center gap-4">
              <div className={`h-12 w-12 rounded-xl flex items-center justify-center border ${card.bg}`}>
                <card.icon className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500">{card.label}</p>
                <p className="text-2xl font-bold text-slate-800 tracking-tight">{loading ? "—" : card.value}</p>
                <p className="text-xs text-slate-400 mt-0.5">{card.sub}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Tape Plant Banner */}
      <div className="bg-gradient-to-r from-indigo-900 via-slate-900 to-indigo-950 text-white p-6 rounded-2xl border border-indigo-700/50 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1 max-w-2xl">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Active Workspace
            </span>
          </div>
          <h3 className="text-xl font-bold text-white tracking-tight">Tape Plant Excel-Style Tabular Module</h3>
          <p className="text-xs text-slate-300 leading-relaxed">
            Directly record shift planning with material compositions, live process temperatures, drive parameters, raw material stock registers, post-production outputs, and consolidated reports.
          </p>
        </div>
        <Link
          href="/dashboard/production/tape-plant"
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-sm rounded-xl transition-all shadow-md hover:shadow-emerald-500/25 shrink-0"
        >
          <span>Open Tape Plant</span>
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      {/* Rebuild Architecture Roadmap */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4 mb-6">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                Step-by-Step Architecture
              </span>
              <h3 className="text-lg font-bold text-slate-900">End-to-End Production Workflow</h3>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              The full linear manufacturing pipeline from raw polymer intake to finished goods dispatch.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {PRODUCTION_STAGES.map((stage) => {
            const Icon = stage.icon;
            return (
              <div
                key={stage.step}
                className="relative flex flex-col justify-between p-5 rounded-xl border bg-gradient-to-b transition-all duration-200 hover:shadow-md hover:-translate-y-0.5"
                style={{ borderColor: "rgba(226, 232, 240, 0.8)" }}
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold text-slate-400 tracking-wider uppercase">
                      Stage {stage.step}
                    </span>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border bg-white ${stage.color}`}>
                      {stage.badge}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 rounded-lg bg-slate-100 text-slate-700">
                      <Icon className="h-5 w-5" />
                    </div>
                    <h4 className="text-sm font-bold text-slate-800 leading-snug">{stage.title}</h4>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed mt-2">{stage.desc}</p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-medium text-slate-400">
                  <span>Ready for Build</span>
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Production Analytics Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SummaryTable
          title="Phase-wise Production"
          loading={loading}
          emptyMessage="No phase production records for this date."
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
          emptyMessage="No shift records for this date."
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
        emptyMessage="No machine production logs for this date."
        headers={["Machine", "Runs", "Target", "Accepted", "Achievement"]}
        rows={(data?.byMachine ?? []).map((row) => [
          row.machineName,
          String(row.runCount),
          row.target.toLocaleString(),
          row.accepted.toLocaleString(),
          `${row.achievement}%`,
        ])}
      />
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
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
      <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50">
        <h3 className="font-semibold text-slate-800 text-sm">{title}</h3>
      </div>
      {loading ? (
        <p className="p-6 text-sm text-slate-400">Loading...</p>
      ) : rows.length === 0 ? (
        <p className="p-6 text-sm text-slate-400">{emptyMessage}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                {headers.map((h) => (
                  <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((row, i) => (
                <tr key={i} className="hover:bg-slate-50/80 transition-colors">
                  {row.map((cell, j) => (
                    <td key={j} className="px-4 py-3 text-slate-700 font-medium text-xs">
                      {cell}
                    </td>
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
