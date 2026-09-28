"use client";

import React from "react";
import {
  X,
  Printer,
  FileSpreadsheet,
  FileText,
} from "lucide-react";
import {
  LoomRollCuttingEntryItem,
  LoomRollCuttingReportData,
  RollCuttingKpis,
  computeContractorRollSummary,
  computeQualityRollSummary,
} from "@/lib/loom/loom-roll-cutting-types";
import { exportLoomRollCuttingExcel } from "@/lib/loom/loom-roll-cutting-export";
import { printLoomRollCutting } from "@/lib/loom/print-loom-roll-cutting";

interface LoomRollCuttingPrintModalProps {
  open: boolean;
  onClose: () => void;
  report: LoomRollCuttingReportData;
  entries: LoomRollCuttingEntryItem[];
  kpis?: RollCuttingKpis;
}

export function LoomRollCuttingPrintModal({
  open,
  onClose,
  report,
  entries,
  kpis,
}: LoomRollCuttingPrintModalProps) {
  if (!open) return null;

  const docDate = (report.date || new Date().toISOString().slice(0, 10)).replace(/[^a-zA-Z0-9]/g, "");
  const docRef = `LM-RC-${docDate}-${(report.shiftName || "SHIFT").toUpperCase().replace(/\s+/g, "")}`;
  const genTimestamp = new Date().toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  const totalMeters = entries.reduce((s, e) => s + (Number(e.meter) || 0), 0);
  const totalGross = entries.reduce((s, e) => s + (Number(e.grossWeightKg) || 0), 0);
  const totalTare = entries.reduce((s, e) => {
    const t = e.tareWeightKg !== "" && e.tareWeightKg !== null && e.tareWeightKg !== undefined
      ? (!isNaN(Number(e.tareWeightKg)) ? Number(e.tareWeightKg) : 1.2)
      : 1.2;
    return s + t;
  }, 0);
  const totalNett = entries.reduce((s, e) => s + (Number(e.nettWeightKg) || 0), 0);
  const overallAvg = totalMeters > 0 && totalNett > 0 ? Math.round(((totalNett * 1000) / totalMeters) * 10) / 10 : 0;
  const uniqueLooms = new Set(entries.map((e) => e.loomNumber));

  const contractorSummaries = computeContractorRollSummary(entries);
  const qualitySummaries = computeQualityRollSummary(entries);

  const handlePrint = () => {
    printLoomRollCutting({ report, entries, kpis });
  };

  const handleExportExcel = () => {
    exportLoomRollCuttingExcel({ report, entries, kpis });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/75 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-300 w-full max-w-6xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Modal Top Control Bar (Standard Dark Theme) */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 bg-slate-900 text-white border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 text-white rounded-lg">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-bold text-white tracking-tight">
                  Daily Loom Roll Cutting Report Preview
                </h2>
                <span
                  className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-sm border ${
                    report.status === "SUBMITTED" || report.status === "APPROVED"
                      ? "bg-emerald-900/40 text-emerald-300 border-emerald-500/40"
                      : "bg-amber-900/40 text-amber-300 border-amber-500/40"
                  }`}
                >
                  {report.status || "DRAFT"}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {report.shiftName} • {report.date} • {entries.length} Roll(s) logged • Ref: {docRef}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportExcel}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-all inline-flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <FileSpreadsheet className="h-3.5 w-3.5" />
              <span>Export Excel</span>
            </button>

            <button
              onClick={handlePrint}
              className="px-4 py-1.5 text-xs font-bold rounded-lg bg-white hover:bg-slate-100 text-slate-900 transition-all inline-flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <Printer className="h-3.5 w-3.5 text-slate-900" />
              <span>Print Document</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-all cursor-pointer ml-1"
              title="Close Preview"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Preview Canvas */}
        <div className="flex-1 overflow-auto p-4 sm:p-6 bg-slate-100/80">
          <div className="max-w-[1240px] mx-auto bg-white rounded-xl shadow-lg border border-slate-200 p-6 font-sans text-slate-900">
            {/* Standard Sheet Header */}
            <div className="border-b-2 border-slate-900 pb-3 mb-4">
              <div className="flex items-center justify-between gap-4">
                <div className="w-16">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/logo.png"
                    alt="Flexicom Logo"
                    className="h-10 w-auto object-contain"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = "none";
                    }}
                  />
                </div>
                <div className="flex-1 text-center">
                  <div className="text-base font-extrabold tracking-wide uppercase text-slate-950">
                    Flexicom Industries Pvt. Limited
                  </div>
                  <div className="text-[11px] font-semibold text-slate-600 tracking-tight">
                    SIDCO INDUSTRIAL ESTATE, PHASE-II, KATHUA (J&K) 184143 • CIRCULAR WEAVING DIVISION
                  </div>
                  <div className="text-sm font-black tracking-wider text-slate-900 mt-1 uppercase">
                    DAILY LOOM ROLL CUTTING REPORT
                  </div>
                </div>
                <div className="w-16 text-right">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                    A4 LANDSCAPE
                  </span>
                </div>
              </div>

              {/* Metadata strip */}
              <div className="mt-3 pt-2 border-t border-slate-200 flex flex-wrap items-center justify-between text-xs text-slate-600 font-medium">
                <div>
                  Doc Ref: <strong className="text-slate-900">{docRef}</strong>
                </div>
                <div>
                  Date: <strong className="text-slate-900">{report.date || "—"}</strong>
                </div>
                <div>
                  Shift: <strong className="text-slate-900">{report.shiftName || "—"}</strong>
                </div>
                <div>
                  Supervisor: <strong className="text-slate-900">{report.supervisorName || report.preparedBy || "—"}</strong>
                </div>
                <div>
                  Total Rolls:{" "}
                  <strong className="text-slate-900">
                    {entries.length} Rolls ({uniqueLooms.size} Looms)
                  </strong>
                </div>
                <div>
                  Generated: <strong className="text-slate-900">{genTimestamp}</strong>
                </div>
              </div>
            </div>

            {/* Summary KPI Strip (6 Bento Cards) */}
            <div className="grid grid-cols-2 sm:grid-cols-6 gap-3 mb-4">
              <div className="p-2.5 rounded-lg border border-slate-200 bg-slate-50">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Total Rolls Cut
                </div>
                <div className="text-base font-black text-slate-900 mt-0.5">
                  {entries.length}{" "}
                  <span className="text-xs font-normal text-slate-500">({uniqueLooms.size} Looms)</span>
                </div>
              </div>

              <div className="p-2.5 rounded-lg border border-slate-200 bg-slate-50">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Total Cut Length
                </div>
                <div className="text-base font-black text-blue-700 mt-0.5">
                  {totalMeters.toLocaleString()}{" "}
                  <span className="text-xs font-normal text-slate-500">M</span>
                </div>
              </div>

              <div className="p-2.5 rounded-lg border border-slate-200 bg-slate-50">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Gross Weight
                </div>
                <div className="text-base font-black text-slate-900 mt-0.5">
                  {totalGross.toFixed(2)}{" "}
                  <span className="text-xs font-normal text-slate-500">Kg</span>
                </div>
              </div>

              <div className="p-2.5 rounded-lg border border-slate-200 bg-slate-50">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Tare Weight
                </div>
                <div className="text-base font-black text-slate-500 mt-0.5">
                  {totalTare.toFixed(2)}{" "}
                  <span className="text-xs font-normal text-slate-500">Kg</span>
                </div>
              </div>

              <div className="p-2.5 rounded-lg border border-slate-200 bg-slate-50">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Total Nett Weight
                </div>
                <div className="text-base font-black text-emerald-700 mt-0.5">
                  {totalNett.toFixed(2)}{" "}
                  <span className="text-xs font-normal text-slate-500">Kg</span>
                </div>
              </div>

              <div className="p-2.5 rounded-lg border border-slate-200 bg-slate-50">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Avg Linear Mass
                </div>
                <div className="text-base font-black text-purple-700 mt-0.5">
                  {overallAvg.toFixed(1)}{" "}
                  <span className="text-xs font-normal text-slate-500">g/m</span>
                </div>
              </div>
            </div>

            {/* Main High-Fidelity Table */}
            <div className="border border-slate-300 rounded-lg overflow-x-auto">
              <table className="w-full text-[11px] border-collapse min-w-[1400px]">
                <thead>
                  <tr className="bg-slate-900 text-white font-bold text-[10px] tracking-wider uppercase">
                    <th className="border border-slate-700 px-2 py-1.5 text-center w-10">S.No.</th>
                    <th className="border border-slate-700 px-2 py-1.5 text-center font-mono w-24">Roll No.</th>
                    <th className="border border-slate-700 px-2 py-1.5 text-center w-14">Loom #</th>
                    <th className="border border-slate-700 px-2 py-1.5 text-center w-16">Size (mm)</th>
                    <th className="border border-slate-700 px-2 py-1.5 text-left min-w-[200px]">Quality Code</th>
                    <th className="border border-slate-700 px-2 py-1.5 text-left min-w-[160px]">Contractor</th>
                    <th className="border border-slate-700 px-2 py-1.5 text-right w-20">Init Rdg</th>
                    <th className="border border-slate-700 px-2 py-1.5 text-right w-20">Final Rdg</th>
                    <th className="border border-slate-700 px-2 py-1.5 text-right w-20 bg-slate-800">Meter</th>
                    <th className="border border-slate-700 px-2 py-1.5 text-right w-20">Gross (kg)</th>
                    <th className="border border-slate-700 px-2 py-1.5 text-right w-16 text-slate-300">Tare (kg)</th>
                    <th className="border border-slate-700 px-2 py-1.5 text-right w-20 bg-emerald-950 text-emerald-200">Nett (kg)</th>
                    <th className="border border-slate-700 px-2 py-1.5 text-right w-18 text-purple-300 bg-purple-950/40">Avg (g/m)</th>
                    <th className="border border-slate-700 px-2 py-1.5 text-center w-24">Sup. Sign</th>
                    <th className="border border-slate-700 px-2 py-1.5 text-left min-w-[120px]">Remarks</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.length > 0 ? (
                    entries.map((entry, idx) => (
                      <tr
                        key={entry.id || idx}
                        className={`border-b border-slate-200 transition-colors ${
                          idx % 2 === 1 ? "bg-slate-50/60" : "bg-white"
                        } hover:bg-slate-100/60`}
                      >
                        <td className="border border-slate-200 px-2 py-1 text-center font-bold text-slate-500">
                          {idx + 1}
                        </td>
                        <td className="border border-slate-200 px-2 py-1 text-center font-mono font-black text-slate-900 bg-slate-50/50">
                          {entry.rollNumber || "—"}
                        </td>
                        <td className="border border-slate-200 px-2 py-1 text-center font-bold text-sky-700 font-mono">
                          #{entry.loomNumber}
                        </td>
                        <td className="border border-slate-200 px-2 py-1 text-center font-mono text-slate-600">
                          {entry.size || "—"}
                        </td>
                        <td className="border border-slate-200 px-2 py-1 font-bold text-slate-900 whitespace-nowrap">
                          {entry.qualityType}
                        </td>
                        <td className="border border-slate-200 px-2 py-1 font-semibold text-slate-700 whitespace-nowrap">
                          {entry.contractor || "In-House"}
                        </td>
                        <td className="border border-slate-200 px-2 py-1 text-right font-mono text-slate-600">
                          {entry.initialReading !== undefined && entry.initialReading !== null ? Number(entry.initialReading).toLocaleString() : "—"}
                        </td>
                        <td className="border border-slate-200 px-2 py-1 text-right font-mono text-slate-600">
                          {entry.finalReading !== undefined && entry.finalReading !== null ? Number(entry.finalReading).toLocaleString() : "—"}
                        </td>
                        <td className="border border-slate-200 px-2 py-1 text-right font-mono font-black text-slate-900 bg-slate-100/70">
                          {entry.meter !== undefined && entry.meter !== null ? Number(entry.meter).toLocaleString() : "0"}
                        </td>
                        <td className="border border-slate-200 px-2 py-1 text-right font-mono text-slate-700">
                          {entry.grossWeightKg !== "" && entry.grossWeightKg !== null && entry.grossWeightKg !== undefined
                            ? Number(entry.grossWeightKg).toFixed(2)
                            : "0.00"}
                        </td>
                        <td className="border border-slate-200 px-2 py-1 text-right font-mono text-slate-400">
                          {entry.tareWeightKg !== "" && entry.tareWeightKg !== null && entry.tareWeightKg !== undefined
                            ? Number(entry.tareWeightKg).toFixed(2)
                            : "1.20"}
                        </td>
                        <td className="border border-slate-200 px-2 py-1 text-right font-mono font-black text-emerald-700 bg-emerald-50/60">
                          {entry.nettWeightKg?.toFixed(2) || "0.00"}
                        </td>
                        <td className="border border-slate-200 px-2 py-1 text-right font-mono font-bold text-purple-700">
                          {entry.avgWeightPerMeter?.toFixed(1) || "0.0"}
                        </td>
                        <td className="border border-slate-200 px-2 py-1 text-center text-slate-600 text-[10px]">
                          {entry.supervisorSign || report.supervisorName || "—"}
                        </td>
                        <td className="border border-slate-200 px-2 py-1 text-slate-600 text-[10px] truncate max-w-[120px]">
                          {entry.remarks || "—"}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={15} className="px-4 py-8 text-center text-slate-500 font-medium bg-slate-50">
                        No roll cutting records logged yet.
                      </td>
                    </tr>
                  )}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-100 font-bold border-t-2 border-slate-900 text-slate-950">
                    <td className="border border-slate-300 px-2 py-1.5 text-center font-black">TOTAL</td>
                    <td className="border border-slate-300 px-2 py-1.5 text-center font-mono font-black">{entries.length} Rolls</td>
                    <td className="border border-slate-300 px-2 py-1.5 text-center font-mono font-bold text-sky-700">{uniqueLooms.size} Looms</td>
                    <td className="border border-slate-300"></td>
                    <td className="border border-slate-300"></td>
                    <td className="border border-slate-300"></td>
                    <td className="border border-slate-300"></td>
                    <td className="border border-slate-300"></td>
                    <td className="border border-slate-300 px-2 py-1.5 text-right font-mono font-black text-slate-950 bg-slate-200/60">{totalMeters.toLocaleString()}</td>
                    <td className="border border-slate-300 px-2 py-1.5 text-right font-mono font-bold text-slate-900">{totalGross.toFixed(2)}</td>
                    <td className="border border-slate-300 px-2 py-1.5 text-right font-mono text-slate-500">{totalTare.toFixed(2)}</td>
                    <td className="border border-slate-300 px-2 py-1.5 text-right font-mono font-black text-emerald-800 bg-emerald-100/50">{totalNett.toFixed(2)}</td>
                    <td className="border border-slate-300 px-2 py-1.5 text-right font-mono font-bold text-purple-700">{overallAvg.toFixed(1)}</td>
                    <td className="border border-slate-300"></td>
                    <td className="border border-slate-300"></td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Real-time Summary Breakdown Cards (Below Report Table) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
              {/* Quality Breakdown Card */}
              <div className="border border-slate-300 rounded-lg overflow-hidden bg-white shadow-xs">
                <div className="bg-slate-900 text-white px-3 py-2 flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider">Quality-Wise Roll Breakdown</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/10 text-slate-300">
                    {qualitySummaries.length} Qualities
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-[11px] border-collapse">
                    <thead>
                      <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 text-[10px]">
                        <th className="px-2.5 py-1.5 text-left">Quality Code</th>
                        <th className="px-2.5 py-1.5 text-center w-14">Rolls</th>
                        <th className="px-2.5 py-1.5 text-right w-20">Meters</th>
                        <th className="px-2.5 py-1.5 text-right w-20">Nett (kg)</th>
                        <th className="px-2.5 py-1.5 text-right w-18">Avg (g/m)</th>
                        <th className="px-2.5 py-1.5 text-right w-16">Share</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {qualitySummaries.length > 0 ? (
                        qualitySummaries.map((q) => {
                          const share = entries.length > 0 ? ((q.rollsCount / entries.length) * 100).toFixed(1) : "0.0";
                          return (
                            <tr key={q.qualityType} className="hover:bg-slate-50 transition-colors">
                              <td className="px-2.5 py-1 font-bold text-slate-900">{q.qualityType}</td>
                              <td className="px-2.5 py-1 text-center font-mono font-black text-slate-800">{q.rollsCount}</td>
                              <td className="px-2.5 py-1 text-right font-mono text-slate-700">{q.totalMeters.toLocaleString()}</td>
                              <td className="px-2.5 py-1 text-right font-mono font-bold text-emerald-700">{q.totalNettWtKg.toFixed(2)}</td>
                              <td className="px-2.5 py-1 text-right font-mono font-bold text-purple-700">{q.avgWeightPerMeter.toFixed(1)}</td>
                              <td className="px-2.5 py-1 text-right font-mono text-slate-500">{share}%</td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan={6} className="px-3 py-4 text-center text-slate-400">No qualities recorded</td>
                        </tr>
                      )}
                    </tbody>
                    <tfoot>
                      <tr className="bg-slate-100 font-bold border-t border-slate-300 text-slate-900 text-[10px]">
                        <td className="px-2.5 py-1.5">TOTAL</td>
                        <td className="px-2.5 py-1.5 text-center font-mono">{entries.length}</td>
                        <td className="px-2.5 py-1.5 text-right font-mono">{totalMeters.toLocaleString()}</td>
                        <td className="px-2.5 py-1.5 text-right font-mono text-emerald-800">{totalNett.toFixed(2)}</td>
                        <td className="px-2.5 py-1.5 text-right font-mono text-purple-800">{overallAvg.toFixed(1)}</td>
                        <td className="px-2.5 py-1.5 text-right font-mono">100%</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* Contractor Breakdown Card */}
              <div className="border border-slate-300 rounded-lg overflow-hidden bg-white shadow-xs">
                <div className="bg-slate-900 text-white px-3 py-2 flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider">Contractor-Wise Roll Breakdown</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/10 text-slate-300">
                    {contractorSummaries.length} Contractors
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-[11px] border-collapse">
                    <thead>
                      <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 text-[10px]">
                        <th className="px-2.5 py-1.5 text-left">Contractor</th>
                        <th className="px-2.5 py-1.5 text-center w-14">Rolls</th>
                        <th className="px-2.5 py-1.5 text-right w-24">Meters</th>
                        <th className="px-2.5 py-1.5 text-right w-24">Nett (kg)</th>
                        <th className="px-2.5 py-1.5 text-right w-16">Share</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {contractorSummaries.length > 0 ? (
                        contractorSummaries.map((c) => {
                          const share = entries.length > 0 ? ((c.rollsCount / entries.length) * 100).toFixed(1) : "0.0";
                          return (
                            <tr key={c.contractor} className="hover:bg-slate-50 transition-colors">
                              <td className="px-2.5 py-1 font-bold text-slate-900">{c.contractor}</td>
                              <td className="px-2.5 py-1 text-center font-mono font-black text-slate-800">{c.rollsCount}</td>
                              <td className="px-2.5 py-1 text-right font-mono text-slate-700">{c.totalMeters.toLocaleString()}</td>
                              <td className="px-2.5 py-1 text-right font-mono font-bold text-emerald-700">{c.totalNettWtKg.toFixed(2)}</td>
                              <td className="px-2.5 py-1 text-right font-mono text-slate-500">{share}%</td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan={5} className="px-3 py-4 text-center text-slate-400">No contractors recorded</td>
                        </tr>
                      )}
                    </tbody>
                    <tfoot>
                      <tr className="bg-slate-100 font-bold border-t border-slate-300 text-slate-900 text-[10px]">
                        <td className="px-2.5 py-1.5">TOTAL</td>
                        <td className="px-2.5 py-1.5 text-center font-mono">{entries.length}</td>
                        <td className="px-2.5 py-1.5 text-right font-mono">{totalMeters.toLocaleString()}</td>
                        <td className="px-2.5 py-1.5 text-right font-mono text-emerald-800">{totalNett.toFixed(2)}</td>
                        <td className="px-2.5 py-1.5 text-right font-mono">100%</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </div>

            {/* Floor Sign-Off Blocks */}
            <div className="grid grid-cols-4 gap-4 mt-8 pt-4 border-t border-slate-300 text-center text-[10px] text-slate-600 font-bold uppercase">
              <div className="border-t border-slate-300 pt-2">
                <div>Prepared By / Operator</div>
                <div className="text-[9px] text-slate-400 font-normal mt-0.5">Sign & Date</div>
              </div>
              <div className="border-t border-slate-300 pt-2">
                <div>Shift Supervisor / In-Charge</div>
                <div className="text-[9px] text-slate-400 font-normal mt-0.5">Sign & Date</div>
              </div>
              <div className="border-t border-slate-300 pt-2">
                <div>Quality Control In-Charge</div>
                <div className="text-[9px] text-slate-400 font-normal mt-0.5">Sign & Date</div>
              </div>
              <div className="border-t border-slate-300 pt-2">
                <div>Plant Manager / HOD</div>
                <div className="text-[9px] text-slate-400 font-normal mt-0.5">Sign & Date</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
