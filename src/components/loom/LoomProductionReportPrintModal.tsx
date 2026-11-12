"use client";

import React, { useState } from "react";
import {
  X,
  Printer,
  FileSpreadsheet,
  FileBarChart,
  Layers,
  User,
  Shield,
  Activity,
  Calendar,
  CheckCircle2,
} from "lucide-react";
import {
  LoomWiseRow,
  SupervisorWiseRow,
  OperatorWiseRow,
  ReportKpis,
  ReportPeriod,
  printLoomProductionReport,
} from "@/lib/loom/print-loom-production-report";
import { exportLoomProductionReportExcel } from "@/lib/loom/loom-production-report-export";

export type ViewCriteria = "LOOM" | "SUPERVISOR" | "OPERATOR" | "CONSOLIDATED";

interface LoomProductionReportPrintModalProps {
  open: boolean;
  onClose: () => void;
  initialCriteria?: ViewCriteria;
  period: ReportPeriod;
  kpis: ReportKpis;
  loomWise: LoomWiseRow[];
  supervisorWise: SupervisorWiseRow[];
  operatorWise: OperatorWiseRow[];
}

export function LoomProductionReportPrintModal({
  open,
  onClose,
  initialCriteria = "CONSOLIDATED",
  period,
  kpis,
  loomWise,
  supervisorWise,
  operatorWise,
}: LoomProductionReportPrintModalProps) {
  const [selectedCriteria, setSelectedCriteria] = useState<ViewCriteria>(initialCriteria);

  if (!open) return null;

  const docDate = (period.startDate === period.endDate ? period.startDate : `${period.startDate}_${period.endDate}`).replace(/[^a-zA-Z0-9]/g, "");
  const docRef = `LM-PRD-${docDate}`;
  const genTimestamp = new Date().toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  const periodLabel = period.startDate === period.endDate
    ? period.startDate
    : `${period.startDate} to ${period.endDate}`;

  const criteriaLabel =
    selectedCriteria === "LOOM"
      ? "Loom-Wise Report"
      : selectedCriteria === "SUPERVISOR"
      ? "Supervisor-Wise Report"
      : selectedCriteria === "OPERATOR"
      ? "Operator-Wise Report"
      : "Consolidated Production Report";

  const handlePrint = () => {
    printLoomProductionReport({
      criteria: selectedCriteria,
      period,
      kpis,
      loomWise,
      supervisorWise,
      operatorWise,
    });
  };

  const handleExportExcel = () => {
    exportLoomProductionReportExcel({
      period,
      kpis,
      loomWise,
      supervisorWise,
      operatorWise,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/75 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-300 w-full max-w-6xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Top Header Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 bg-slate-900 text-white border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 text-white rounded-lg">
              <FileBarChart className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-bold text-white tracking-tight">
                  Loom Production Report Print Preview
                </h2>
                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-sm border bg-sky-900/40 text-sky-300 border-sky-500/40">
                  {criteriaLabel}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Period: {periodLabel} • Shift: {period.shiftName} • Ref: {docRef}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
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
              <span>Print Now</span>
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

        {/* View Switcher Sub-Bar */}
        <div className="flex items-center justify-between px-5 py-2 bg-slate-800 text-slate-200 border-b border-slate-700 shrink-0">
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-slate-400 mr-2 font-semibold">Preview Section:</span>
            <button
              onClick={() => setSelectedCriteria("CONSOLIDATED")}
              className={`px-3 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
                selectedCriteria === "CONSOLIDATED"
                  ? "bg-sky-500 text-white shadow-xs"
                  : "bg-slate-700 hover:bg-slate-600 text-slate-300"
              }`}
            >
              Consolidated Total
            </button>
            <button
              onClick={() => setSelectedCriteria("LOOM")}
              className={`px-3 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
                selectedCriteria === "LOOM"
                  ? "bg-sky-500 text-white shadow-xs"
                  : "bg-slate-700 hover:bg-slate-600 text-slate-300"
              }`}
            >
              Loom-Wise (#1-91)
            </button>
            <button
              onClick={() => setSelectedCriteria("SUPERVISOR")}
              className={`px-3 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
                selectedCriteria === "SUPERVISOR"
                  ? "bg-sky-500 text-white shadow-xs"
                  : "bg-slate-700 hover:bg-slate-600 text-slate-300"
              }`}
            >
              Supervisor-Wise
            </button>
            <button
              onClick={() => setSelectedCriteria("OPERATOR")}
              className={`px-3 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
                selectedCriteria === "OPERATOR"
                  ? "bg-sky-500 text-white shadow-xs"
                  : "bg-slate-700 hover:bg-slate-600 text-slate-300"
              }`}
            >
              Operator-Wise
            </button>
          </div>
          <div className="text-[11px] text-slate-400 hidden sm:block font-mono">
            Generated: {genTimestamp}
          </div>
        </div>

        {/* Scrollable Preview Canvas */}
        <div className="flex-1 overflow-auto p-4 sm:p-6 bg-slate-100/80">
          <div className="max-w-[1240px] mx-auto bg-white rounded-xl shadow-lg border border-slate-200 p-6 font-sans text-slate-900">
            {/* Sheet Header */}
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
                  <div className="text-xs font-extrabold text-sky-800 uppercase tracking-widest mt-1">
                    {criteriaLabel}
                  </div>
                </div>
                <div className="text-right text-[11px] text-slate-600 font-mono space-y-0.5">
                  <div>Ref: <strong className="text-slate-900">{docRef}</strong></div>
                  <div>Period: <strong className="text-slate-900">{periodLabel}</strong></div>
                  <div>Shift: <strong className="text-slate-900">{period.shiftName}</strong></div>
                </div>
              </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
              <div className="bg-slate-50 border border-slate-300 rounded-lg p-2.5">
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  Total Production Cut
                </div>
                <div className="text-xl font-black text-slate-950 font-mono">
                  {kpis.totalCutMeters.toLocaleString()}{" "}
                  <span className="text-xs font-normal text-slate-600">Meters</span>
                </div>
                <div className="text-[10px] text-slate-500">
                  {kpis.totalRollsCut} Finished Rolls Cut • Meter Logs: {kpis.totalReadingMeters.toLocaleString()} m
                </div>
              </div>

              <div className="bg-emerald-50/60 border border-emerald-300 rounded-lg p-2.5">
                <div className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider">
                  Total Nett Output
                </div>
                <div className="text-xl font-black text-emerald-800 font-mono">
                  {kpis.totalNettKg.toFixed(2)}{" "}
                  <span className="text-xs font-normal text-emerald-700">KG ({kpis.totalNettMT.toFixed(2)} MT)</span>
                </div>
                <div className="text-[10px] text-slate-500">
                  Gross: {kpis.totalGrossKg.toFixed(2)} kg • Tare: {kpis.totalTareKg.toFixed(2)} kg
                </div>
              </div>

              <div className="bg-purple-50/60 border border-purple-300 rounded-lg p-2.5">
                <div className="text-[10px] font-bold text-purple-800 uppercase tracking-wider">
                  Avg Efficiency & Mass
                </div>
                <div className="text-xl font-black text-purple-900 font-mono">
                  {kpis.avgEfficiency.toFixed(1)}%
                </div>
                <div className="text-[10px] text-purple-800">
                  Avg Linear Mass: <strong>{kpis.avgWeightPerMeter.toFixed(1)} g/m</strong>
                </div>
              </div>

              <div className="bg-amber-50/60 border border-amber-300 rounded-lg p-2.5">
                <div className="text-[10px] font-bold text-amber-800 uppercase tracking-wider">
                  Downtime & Looms Active
                </div>
                <div className="text-xl font-black text-amber-900 font-mono">
                  {kpis.totalBreakdownMinutes}{" "}
                  <span className="text-xs font-normal text-amber-700">Minutes</span>
                </div>
                <div className="text-[10px] text-amber-800">
                  Active Looms: <strong>{kpis.activeLoomsCount} / 91</strong> • Supers: {kpis.activeSupervisorsCount} • Ops: {kpis.activeOperatorsCount}
                </div>
              </div>
            </div>

            {/* Section 1: Loom-Wise Table */}
            {(selectedCriteria === "LOOM" || selectedCriteria === "CONSOLIDATED") && (
              <div className="mb-6">
                <div className="text-xs font-extrabold text-slate-900 uppercase tracking-wide mb-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-sky-600"></span>
                    <span>1. Loom-Wise Production & Performance Breakdown (Looms #1 to #91)</span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-500">{loomWise.length} Looms Recorded</span>
                </div>
                <div className="border border-slate-900 rounded overflow-hidden">
                  <table className="w-full text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-200 text-black border-b-2 border-slate-900">
                        <th className="py-2 px-2 text-center font-black w-14 border-r border-slate-400">Loom #</th>
                        <th className="py-2 px-3 text-left font-black border-r border-slate-400">Running Quality / Code</th>
                        <th className="py-2 px-2 text-center font-black w-16 border-r border-slate-400">Rolls Cut</th>
                        <th className="py-2 px-3 text-right font-black w-24 border-r border-slate-400">Cut Mtrs</th>
                        <th className="py-2 px-3 text-right font-black w-24 border-r border-slate-400">Reading Mtrs</th>
                        <th className="py-2 px-3 text-right font-black w-24 border-r border-slate-400">Gross (kg)</th>
                        <th className="py-2 px-3 text-right font-black w-24 border-r border-slate-400">Nett (kg)</th>
                        <th className="py-2 px-2 text-right font-black w-20 border-r border-slate-400">Avg (g/m)</th>
                        <th className="py-2 px-2 text-right font-black w-18 border-r border-slate-400">Avg Eff.</th>
                        <th className="py-2 px-2 text-right font-black w-18 border-r border-slate-400">Downtime</th>
                        <th className="py-2 px-3 text-left font-black">Primary Breakdown</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {loomWise.length > 0 ? (
                        loomWise.map((r, idx) => (
                          <tr key={r.loomNumber} className={idx % 2 === 1 ? "bg-slate-50" : "bg-white"}>
                            <td className="py-1.5 px-2 text-center font-mono font-black text-sky-700 border-r border-slate-200">
                              #{r.loomNumber}
                            </td>
                            <td className="py-1.5 px-3 font-bold text-slate-900 border-r border-slate-200 max-w-[150px] truncate">
                              {r.qualities}
                            </td>
                            <td className="py-1.5 px-2 text-center font-mono font-bold text-slate-800 border-r border-slate-200">
                              {r.totalRolls}
                            </td>
                            <td className="py-1.5 px-3 text-right font-mono font-extrabold text-sky-700 bg-sky-50/50 border-r border-slate-200">
                              {r.cutMeters.toLocaleString()}
                            </td>
                            <td className="py-1.5 px-3 text-right font-mono text-slate-600 border-r border-slate-200">
                              {r.readingMeters.toLocaleString()}
                            </td>
                            <td className="py-1.5 px-3 text-right font-mono text-slate-600 border-r border-slate-200">
                              {r.grossWeightKg.toFixed(2)}
                            </td>
                            <td className="py-1.5 px-3 text-right font-mono font-extrabold text-emerald-700 bg-emerald-50/50 border-r border-slate-200">
                              {r.nettWeightKg.toFixed(2)}
                            </td>
                            <td className="py-1.5 px-2 text-right font-mono font-semibold text-purple-700 border-r border-slate-200">
                              {r.avgWeightPerMeter.toFixed(1)}
                            </td>
                            <td className="py-1.5 px-2 text-right font-mono font-bold border-r border-slate-200 text-slate-800">
                              {r.avgEfficiency.toFixed(1)}%
                            </td>
                            <td className="py-1.5 px-2 text-right font-mono font-bold text-red-600 border-r border-slate-200">
                              {r.breakdownMinutes > 0 ? `${r.breakdownMinutes}m` : "0m"}
                            </td>
                            <td className="py-1.5 px-3 text-slate-600 max-w-[140px] truncate text-[11px]">
                              {r.primaryBreakdownReason || "—"}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={11} className="py-6 text-center text-slate-500 italic">
                            No loom records match the selected filters.
                          </td>
                        </tr>
                      )}
                    </tbody>
                    <tfoot>
                      <tr className="bg-slate-200 text-black border-t-2 border-slate-900 font-mono font-bold">
                        <td colSpan={2} className="py-2 px-3 text-right font-sans font-black border-r border-slate-400">
                          LOOM TOTALS:
                        </td>
                        <td className="py-2 px-2 text-center border-r border-slate-400">
                          {kpis.totalRollsCut}
                        </td>
                        <td className="py-2 px-3 text-right text-sky-800 font-black border-r border-slate-400">
                          {kpis.totalCutMeters.toLocaleString()}
                        </td>
                        <td className="py-2 px-3 text-right border-r border-slate-400">
                          {kpis.totalReadingMeters.toLocaleString()}
                        </td>
                        <td className="py-2 px-3 text-right border-r border-slate-400">
                          {kpis.totalGrossKg.toFixed(2)}
                        </td>
                        <td className="py-2 px-3 text-right text-emerald-800 font-black border-r border-slate-400">
                          {kpis.totalNettKg.toFixed(2)}
                        </td>
                        <td className="py-2 px-2 text-right text-purple-800 border-r border-slate-400">
                          {kpis.avgWeightPerMeter.toFixed(1)}
                        </td>
                        <td className="py-2 px-2 text-right border-r border-slate-400">
                          {kpis.avgEfficiency.toFixed(1)}%
                        </td>
                        <td className="py-2 px-2 text-right text-red-700 border-r border-slate-400">
                          {kpis.totalBreakdownMinutes}m
                        </td>
                        <td className="py-2 px-3 text-slate-500 font-sans text-center">—</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )}

            {/* Section 2: Supervisor-Wise Table */}
            {(selectedCriteria === "SUPERVISOR" || selectedCriteria === "CONSOLIDATED") && (
              <div className="mb-6">
                <div className="text-xs font-extrabold text-slate-900 uppercase tracking-wide mb-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-emerald-600"></span>
                    <span>2. Supervisor-Wise Performance & Production Breakdown</span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-500">{supervisorWise.length} Supervisors Recorded</span>
                </div>
                <div className="border border-slate-900 rounded overflow-hidden">
                  <table className="w-full text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-200 text-black border-b-2 border-slate-900">
                        <th className="py-2 px-2 text-center font-black w-10 border-r border-slate-400">S.No.</th>
                        <th className="py-2 px-3 text-left font-black border-r border-slate-400">Supervisor Name</th>
                        <th className="py-2 px-2 text-center font-black w-24 border-r border-slate-400">Shifts Supervised</th>
                        <th className="py-2 px-2 text-center font-black w-24 border-r border-slate-400">Looms Covered</th>
                        <th className="py-2 px-2 text-center font-black w-20 border-r border-slate-400">Rolls Cut</th>
                        <th className="py-2 px-3 text-right font-black w-28 border-r border-slate-400">Cut Mtrs</th>
                        <th className="py-2 px-3 text-right font-black w-28 border-r border-slate-400">Gross (kg)</th>
                        <th className="py-2 px-3 text-right font-black w-28 border-r border-slate-400">Nett (kg)</th>
                        <th className="py-2 px-2 text-right font-black w-24 border-r border-slate-400">Avg (g/m)</th>
                        <th className="py-2 px-2 text-right font-black w-20">% Share</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {supervisorWise.length > 0 ? (
                        supervisorWise.map((r, idx) => (
                          <tr key={r.supervisorName} className={idx % 2 === 1 ? "bg-slate-50" : "bg-white"}>
                            <td className="py-1.5 px-2 text-center font-bold text-slate-600 border-r border-slate-200">
                              {idx + 1}
                            </td>
                            <td className="py-1.5 px-3 font-bold text-slate-900 border-r border-slate-200">
                              {r.supervisorName}
                            </td>
                            <td className="py-1.5 px-2 text-center font-mono text-slate-700 border-r border-slate-200">
                              {r.shiftsSupervised}
                            </td>
                            <td className="py-1.5 px-2 text-center font-mono text-slate-700 border-r border-slate-200">
                              {r.loomsCoveredCount}
                            </td>
                            <td className="py-1.5 px-2 text-center font-mono font-bold text-slate-800 border-r border-slate-200">
                              {r.totalRolls}
                            </td>
                            <td className="py-1.5 px-3 text-right font-mono font-extrabold text-sky-700 bg-sky-50/50 border-r border-slate-200">
                              {r.cutMeters.toLocaleString()}
                            </td>
                            <td className="py-1.5 px-3 text-right font-mono text-slate-600 border-r border-slate-200">
                              {r.grossWeightKg.toFixed(2)}
                            </td>
                            <td className="py-1.5 px-3 text-right font-mono font-extrabold text-emerald-700 bg-emerald-50/50 border-r border-slate-200">
                              {r.nettWeightKg.toFixed(2)}
                            </td>
                            <td className="py-1.5 px-2 text-right font-mono font-semibold text-purple-700 border-r border-slate-200">
                              {r.avgWeightPerMeter.toFixed(1)}
                            </td>
                            <td className="py-1.5 px-2 text-right font-mono font-bold text-amber-800 bg-amber-50/50">
                              {r.sharePct.toFixed(1)}%
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={10} className="py-6 text-center text-slate-500 italic">
                            No supervisor records match the selected filters.
                          </td>
                        </tr>
                      )}
                    </tbody>
                    <tfoot>
                      <tr className="bg-slate-200 text-black border-t-2 border-slate-900 font-mono font-bold">
                        <td colSpan={4} className="py-2 px-3 text-right font-sans font-black border-r border-slate-400">
                          SUPERVISOR TOTALS:
                        </td>
                        <td className="py-2 px-2 text-center border-r border-slate-400">
                          {kpis.totalRollsCut}
                        </td>
                        <td className="py-2 px-3 text-right text-sky-800 font-black border-r border-slate-400">
                          {kpis.totalCutMeters.toLocaleString()}
                        </td>
                        <td className="py-2 px-3 text-right border-r border-slate-400">
                          {kpis.totalGrossKg.toFixed(2)}
                        </td>
                        <td className="py-2 px-3 text-right text-emerald-800 font-black border-r border-slate-400">
                          {kpis.totalNettKg.toFixed(2)}
                        </td>
                        <td className="py-2 px-2 text-right text-purple-800 border-r border-slate-400">
                          {kpis.avgWeightPerMeter.toFixed(1)}
                        </td>
                        <td className="py-2 px-2 text-right text-amber-800">
                          100.0%
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )}

            {/* Section 3: Operator-Wise Table */}
            {(selectedCriteria === "OPERATOR" || selectedCriteria === "CONSOLIDATED") && (
              <div className="mb-6">
                <div className="text-xs font-extrabold text-slate-900 uppercase tracking-wide mb-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-purple-600"></span>
                    <span>3. Operator-Wise Shift Efficiency & Production Breakdown</span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-500">{operatorWise.length} Operators Recorded</span>
                </div>
                <div className="border border-slate-900 rounded overflow-hidden">
                  <table className="w-full text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-200 text-black border-b-2 border-slate-900">
                        <th className="py-2 px-2 text-center font-black w-10 border-r border-slate-400">S.No.</th>
                        <th className="py-2 px-3 text-left font-black border-r border-slate-400">Operator Name</th>
                        <th className="py-2 px-2 text-center font-black w-24 border-r border-slate-400">Shift Logs</th>
                        <th className="py-2 px-2 text-center font-black w-24 border-r border-slate-400">Looms Count</th>
                        <th className="py-2 px-3 text-left font-black border-r border-slate-400">Looms Handled</th>
                        <th className="py-2 px-3 text-right font-black w-32 border-r border-slate-400">Production (Mtrs)</th>
                        <th className="py-2 px-2 text-right font-black w-24 border-r border-slate-400">Avg Eff.</th>
                        <th className="py-2 px-2 text-right font-black w-24">Downtime</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {operatorWise.length > 0 ? (
                        operatorWise.map((r, idx) => (
                          <tr key={r.operatorName} className={idx % 2 === 1 ? "bg-slate-50" : "bg-white"}>
                            <td className="py-1.5 px-2 text-center font-bold text-slate-600 border-r border-slate-200">
                              {idx + 1}
                            </td>
                            <td className="py-1.5 px-3 font-bold text-slate-900 border-r border-slate-200">
                              {r.operatorName}
                            </td>
                            <td className="py-1.5 px-2 text-center font-mono text-slate-700 border-r border-slate-200">
                              {r.shiftLogsCount}
                            </td>
                            <td className="py-1.5 px-2 text-center font-mono text-slate-700 border-r border-slate-200">
                              {r.loomsHandledCount}
                            </td>
                            <td className="py-1.5 px-3 text-slate-600 border-r border-slate-200 max-w-[200px] truncate text-[11px]">
                              {r.loomsList || "—"}
                            </td>
                            <td className="py-1.5 px-3 text-right font-mono font-extrabold text-sky-700 bg-sky-50/50 border-r border-slate-200">
                              {r.totalProductionMeters.toLocaleString()}
                            </td>
                            <td className="py-1.5 px-2 text-right font-mono font-bold border-r border-slate-200 text-slate-800">
                              {r.avgEfficiency.toFixed(1)}%
                            </td>
                            <td className="py-1.5 px-2 text-right font-mono font-bold text-red-600">
                              {r.breakdownMinutes > 0 ? `${r.breakdownMinutes}m` : "0m"}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={8} className="py-6 text-center text-slate-500 italic">
                            No operator records match the selected filters.
                          </td>
                        </tr>
                      )}
                    </tbody>
                    <tfoot>
                      <tr className="bg-slate-200 text-black border-t-2 border-slate-900 font-mono font-bold">
                        <td colSpan={5} className="py-2 px-3 text-right font-sans font-black border-r border-slate-400">
                          OPERATOR TOTALS:
                        </td>
                        <td className="py-2 px-3 text-right text-sky-800 font-black border-r border-slate-400">
                          {kpis.totalReadingMeters.toLocaleString()}
                        </td>
                        <td className="py-2 px-2 text-right border-r border-slate-400">
                          {kpis.avgEfficiency.toFixed(1)}%
                        </td>
                        <td className="py-2 px-2 text-right text-red-700">
                          {kpis.totalBreakdownMinutes}m
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )}

            {/* Section 4: Signatures */}
            <div className="grid grid-cols-3 gap-6 pt-8 mt-6 border-t-2 border-slate-900">
              <div className="text-center">
                <div className="border-b border-slate-400 pb-8 mb-1.5"></div>
                <div className="text-xs font-bold text-slate-900">Prepared By</div>
                <div className="text-[10px] text-slate-500 font-semibold">Data Entry Operator</div>
              </div>
              <div className="text-center">
                <div className="border-b border-slate-400 pb-8 mb-1.5"></div>
                <div className="text-xs font-bold text-slate-900">Shift Supervisor</div>
                <div className="text-[10px] text-slate-500 font-semibold">Production In-Charge</div>
              </div>
              <div className="text-center">
                <div className="border-b border-slate-400 pb-8 mb-1.5"></div>
                <div className="text-xs font-bold text-slate-900">Plant / Production Manager</div>
                <div className="text-[10px] text-slate-500 font-semibold">Flexicom Industries Pvt. Ltd.</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
