"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { Download, Loader2, Target, TrendingUp, Factory } from "lucide-react";
import { PRODUCTION_PHASES } from "@/lib/production/phases";

interface ReportData {
  summary: {
    targetQty: number;
    actualQty: number;
    acceptedQty: number;
    achievementPercent: number;
    planCount: number;
    lineCount: number;
    runCount: number;
    completedRunCount: number;
  };
  plannedVsActual: Array<{
    planNumber: string;
    planDate: string;
    phase: string;
    shift: string;
    targetQty: number;
    acceptedQty: number;
    actualQty: number;
    achievementPercent: number;
  }>;
  byPhase: Array<{ label: string; target: number; accepted: number; achievement: number; planCount?: number }>;
  byOperator: Array<{ operatorName: string; target: number; accepted: number; achievement: number; runCount: number }>;
  byShift: Array<{ shiftName: string; target: number; accepted: number; achievement: number; planCount: number }>;
  byMachine: Array<{ machineName: string; target: number; accepted: number; achievement: number; runCount: number }>;
  byProduct: Array<{ productCode: string; productName: string; target: number; accepted: number; achievement: number; planCount: number }>;
}

function SummaryTable({
  title,
  loading,
  emptyMessage,
  headers,
  rows,
}: {
  title: string;
  loading: boolean;
  emptyMessage: string;
  headers: string[];
  rows: string[][];
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100">
        <h2 className="text-sm font-semibold text-slate-800">{title}</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 text-left text-xs font-medium text-slate-500">
              {headers.map((h) => (
                <th key={h} className="px-4 py-2.5">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={headers.length} className="px-4 py-8 text-center text-slate-400">
                  <Loader2 className="h-5 w-5 animate-spin inline-block" />
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={headers.length} className="px-4 py-8 text-center text-slate-400">{emptyMessage}</td>
              </tr>
            ) : (
              rows.map((row, i) => (
                <tr key={i} className="border-t border-slate-100 hover:bg-slate-50/50">
                  {row.map((cell, j) => (
                    <td key={j} className="px-4 py-2.5 text-slate-700">{cell}</td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function ProductionReportsClient() {
  const today = new Date().toISOString().slice(0, 10);
  const [dateFrom, setDateFrom] = useState(today);
  const [dateTo, setDateTo] = useState(today);
  const [shiftId, setShiftId] = useState("");
  const [phase, setPhase] = useState("");
  const [machineId, setMachineId] = useState("");
  const [operatorId, setOperatorId] = useState("");
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  const [shifts, setShifts] = useState<Array<{ id: string; name: string }>>([]);
  const [machines, setMachines] = useState<Array<{ id: string; name: string }>>([]);
  const [operators, setOperators] = useState<Array<{ id: string; name: string }>>([]);

  useEffect(() => {
    fetch("/api/settings/master-data/shift")
      .then((r) => (r.ok ? r.json() : []))
      .then(setShifts)
      .catch(() => {});
    fetch("/api/settings/master-data/machine")
      .then((r) => (r.ok ? r.json() : []))
      .then(setMachines)
      .catch(() => {});
    fetch("/api/production/operators")
      .then((r) => (r.ok ? r.json() : []))
      .then(setOperators)
      .catch(() => {});
  }, []);

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    params.set("dateFrom", dateFrom);
    params.set("dateTo", dateTo);
    if (shiftId) params.set("shiftId", shiftId);
    if (phase) params.set("phase", phase);
    if (machineId) params.set("machineId", machineId);
    if (operatorId) params.set("operatorId", operatorId);
    return params.toString();
  }, [dateFrom, dateTo, shiftId, phase, machineId, operatorId]);

  const fetchReport = useCallback(() => {
    setLoading(true);
    fetch(`/api/production/reports?${queryString}`)
      .then((r) => (r.ok ? r.json() : null))
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [queryString]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await fetch(`/api/production/reports?${queryString}&format=csv`);
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `production-report-${dateFrom}-${dateTo}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // silent
    } finally {
      setExporting(false);
    }
  };

  const summary = data?.summary;

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">From</label>
            <input
              type="date"
              className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">To</label>
            <input
              type="date"
              className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Shift</label>
            <select
              className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm min-w-[140px]"
              value={shiftId}
              onChange={(e) => setShiftId(e.target.value)}
            >
              <option value="">All shifts</option>
              {shifts.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Phase</label>
            <select
              className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm min-w-[140px]"
              value={phase}
              onChange={(e) => setPhase(e.target.value)}
            >
              <option value="">All phases</option>
              {PRODUCTION_PHASES.map((p) => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Machine</label>
            <select
              className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm min-w-[140px]"
              value={machineId}
              onChange={(e) => setMachineId(e.target.value)}
            >
              <option value="">All machines</option>
              {machines.map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Operator</label>
            <select
              className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm min-w-[140px]"
              value={operatorId}
              onChange={(e) => setOperatorId(e.target.value)}
            >
              <option value="">All operators</option>
              {operators.map((o) => (
                <option key={o.id} value={o.id}>{o.name}</option>
              ))}
            </select>
          </div>
          <button
            type="button"
            onClick={handleExport}
            disabled={exporting || loading}
            className="inline-flex items-center gap-2 px-4 py-1.5 bg-slate-800 text-white text-sm font-medium rounded-lg hover:bg-slate-700 disabled:opacity-50"
          >
            {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            Export CSV
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Target", value: summary?.targetQty ?? 0, icon: Target, bg: "bg-blue-100", text: "text-blue-600", sub: `${summary?.planCount ?? 0} plans` },
          { label: "Total Accepted", value: summary?.acceptedQty ?? 0, icon: TrendingUp, bg: "bg-emerald-100", text: "text-emerald-600", sub: `${summary?.actualQty ?? 0} gross produced` },
          { label: "Achievement", value: `${summary?.achievementPercent ?? 0}%`, icon: Factory, bg: "bg-amber-100", text: "text-amber-600", sub: "Accepted vs target" },
          { label: "Runs", value: `${summary?.completedRunCount ?? 0} / ${summary?.runCount ?? 0}`, icon: Factory, bg: "bg-slate-100", text: "text-slate-600", sub: "Completed / total" },
        ].map((card) => (
          <div key={card.label} className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className={`h-10 w-10 ${card.bg} ${card.text} rounded-lg flex items-center justify-center`}>
                <card.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500">{card.label}</p>
                <p className="text-2xl font-bold text-slate-800">{loading ? "—" : typeof card.value === "number" ? card.value.toLocaleString() : card.value}</p>
                <p className="text-xs text-slate-400">{card.sub}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SummaryTable
          title="Phase-wise Breakdown"
          loading={loading}
          emptyMessage="No data for selected filters."
          headers={["Phase", "Target", "Accepted", "Achievement"]}
          rows={(data?.byPhase ?? []).map((row) => [
            row.label,
            row.target.toLocaleString(),
            row.accepted.toLocaleString(),
            `${row.achievement}%`,
          ])}
        />
        <SummaryTable
          title="Operator-wise Breakdown"
          loading={loading}
          emptyMessage="No data for selected filters."
          headers={["Operator", "Target", "Accepted", "Achievement", "Runs"]}
          rows={(data?.byOperator ?? []).map((row) => [
            row.operatorName,
            row.target.toLocaleString(),
            row.accepted.toLocaleString(),
            `${row.achievement}%`,
            String(row.runCount),
          ])}
        />
        <SummaryTable
          title="Shift-wise Breakdown"
          loading={loading}
          emptyMessage="No data for selected filters."
          headers={["Shift", "Target", "Accepted", "Achievement", "Lines"]}
          rows={(data?.byShift ?? []).map((row) => [
            row.shiftName,
            row.target.toLocaleString(),
            row.accepted.toLocaleString(),
            `${row.achievement}%`,
            String(row.planCount),
          ])}
        />
        <SummaryTable
          title="Product-wise Breakdown"
          loading={loading}
          emptyMessage="No data for selected filters."
          headers={["Product", "Target", "Accepted", "Achievement", "Lines"]}
          rows={(data?.byProduct ?? []).map((row) => [
            `${row.productCode} — ${row.productName}`,
            row.target.toLocaleString(),
            row.accepted.toLocaleString(),
            `${row.achievement}%`,
            String(row.planCount),
          ])}
        />
      </div>

      <SummaryTable
        title="Planned vs Actual"
        loading={loading}
        emptyMessage="No plan lines for selected filters."
        headers={["Plan", "Date", "Shift", "Phase", "Target", "Accepted", "Actual", "Achievement"]}
        rows={(data?.plannedVsActual ?? []).map((row) => [
          row.planNumber,
          format(new Date(row.planDate), "dd MMM yyyy"),
          row.shift,
          row.phase,
          row.targetQty.toLocaleString(),
          row.acceptedQty.toLocaleString(),
          row.actualQty.toLocaleString(),
          `${row.achievementPercent}%`,
        ])}
      />
    </div>
  );
}
