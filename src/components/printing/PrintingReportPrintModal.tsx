"use client";

import React, { useMemo } from "react";
import { PrintingDailyReportData, computePrintingTotals } from "@/lib/printing/printing-types";
import { printPrintingReport } from "@/lib/printing/print-printing-report";
import { exportPrintingReportExcel } from "@/lib/printing/printing-export";
import { FileText, Printer, FileSpreadsheet, X } from "lucide-react";

interface PrintingReportPrintModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: PrintingDailyReportData;
}

export function PrintingReportPrintModal({
  open,
  onOpenChange,
  data,
}: PrintingReportPrintModalProps) {
  const totals = useMemo(() => computePrintingTotals(data.entries), [data.entries]);

  if (!open) return null;

  const docDate = (data.date || new Date().toISOString().slice(0, 10)).replace(/[^a-zA-Z0-9]/g, "");
  const docRef = `PRN-${docDate}-${(data.shiftName || "SHIFT").toUpperCase().replace(/\s+/g, "")}`;
  const genTimestamp = new Date().toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  const handlePrint = () => {
    printPrintingReport(data);
  };

  const handleExportExcel = () => {
    exportPrintingReportExcel(data);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/75 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-300 w-full max-w-7xl max-h-[94vh] flex flex-col overflow-hidden">
        {/* Modal Top Control Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 bg-slate-900 text-white border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 text-white rounded-lg">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-bold text-white tracking-tight">
                  Printing Daily Production Report Preview
                </h2>
                <span
                  className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-sm border ${
                    data.status === "APPROVED"
                      ? "bg-emerald-500/20 text-emerald-300 border-emerald-400/40"
                      : data.status === "SUBMITTED"
                      ? "bg-blue-500/20 text-blue-300 border-blue-400/40"
                      : "bg-amber-500/20 text-amber-300 border-amber-400/40"
                  }`}
                >
                  {data.status}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                A4 Landscape Formal Enterprise Printout • Ref: {docRef}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportExcel}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-colors shadow-xs"
            >
              <FileSpreadsheet className="h-3.5 w-3.5" />
              Download Excel
            </button>
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-primary hover:bg-primary/90 text-white transition-colors shadow-xs"
            >
              <Printer className="h-3.5 w-3.5" />
              Print Sheet
            </button>
            <button
              onClick={() => onOpenChange(false)}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors ml-1"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Document Paper Preview */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-100 flex justify-center">
          <div className="bg-white shadow-xl border border-slate-300 w-full max-w-6xl p-6 text-slate-900 font-sans text-xs">
            {/* Header Letterhead */}
            <div className="flex items-center justify-between border-b-2 border-slate-900 pb-3 mb-3">
              <div className="w-16">
                <img src="/logo.png" alt="Logo" className="h-10 w-auto object-contain" />
              </div>
              <div className="flex-1 text-center">
                <div className="text-base font-black tracking-tight text-slate-950 uppercase">
                  FLEXICOM INDUSTRIES PVT. LIMITED
                </div>
                <div className="text-[10px] text-slate-500 font-semibold tracking-wide mt-0.5">
                  SIDCO INDUSTRIAL ESTATE, PHASE-II, KATHUA (J&K) 184143 • PRINTING DIVISION
                </div>
                <div className="inline-block border border-slate-900 bg-slate-50 px-4 py-0.5 text-[11px] font-black tracking-wider uppercase mt-1 mb-1">
                  PRINTING MACHINE DAILY PRODUCTION REPORT
                </div>
                <div className="flex flex-wrap justify-center items-center gap-x-4 gap-y-1 text-[10px] text-slate-600 mt-0.5">
                  <span>Doc Ref: <strong className="text-slate-900 font-mono">{docRef}</strong></span>
                  <span>Date: <strong className="text-slate-900">{data.date}</strong></span>
                  <span>Shift: <strong className="text-slate-900">{data.shiftName}</strong></span>
                  <span>Supervisor: <strong className="text-slate-900">{data.supervisorName || "—"}</strong></span>
                  <span>Operator: <strong className="text-slate-900">{data.operatorName || "—"}</strong></span>
                  <span>Generated: <strong className="text-slate-900">{genTimestamp}</strong></span>
                </div>
              </div>
              <div className="w-16 text-right">
                <span className="text-[9px] font-bold border border-slate-300 px-1.5 py-0.5 rounded-sm bg-slate-50 text-slate-500">
                  A4 LANDSCAPE
                </span>
              </div>
            </div>

            {/* KPI Strip */}
            <div className="grid grid-cols-4 sm:grid-cols-8 gap-2 bg-slate-50 p-2.5 rounded-lg border border-slate-200 mb-4 text-center">
              <div>
                <div className="text-[9px] uppercase tracking-wider text-slate-500 font-bold">Total Rolls</div>
                <div className="text-sm font-black text-slate-900 font-mono">{totals.totalRolls}</div>
              </div>
              <div>
                <div className="text-[9px] uppercase tracking-wider text-slate-500 font-bold">Target Prod</div>
                <div className="text-sm font-black text-blue-700 font-mono">{totals.totalTargetMtrs.toLocaleString()}m</div>
              </div>
              <div>
                <div className="text-[9px] uppercase tracking-wider text-slate-500 font-bold">Fabric Prod</div>
                <div className="text-sm font-black text-sky-700 font-mono">{totals.totalProductionMtrs.toLocaleString()}m</div>
              </div>
              <div>
                <div className="text-[9px] uppercase tracking-wider text-slate-500 font-bold">Net Wt.</div>
                <div className="text-sm font-black text-slate-900 font-mono">{totals.totalNetWt.toFixed(1)} kg</div>
              </div>
              <div>
                <div className="text-[9px] uppercase tracking-wider text-slate-500 font-bold">Avg GSM</div>
                <div className="text-sm font-black text-blue-600 font-mono">{totals.avgWeightGsm.toFixed(1)}</div>
              </div>
              <div>
                <div className="text-[9px] uppercase tracking-wider text-slate-500 font-bold">Total Printed</div>
                <div className="text-sm font-black text-emerald-700 font-mono">{totals.totalPrintMtrs.toLocaleString()}m</div>
              </div>
              <div>
                <div className="text-[9px] uppercase tracking-wider text-slate-500 font-bold">Variance</div>
                <div className={`text-sm font-black font-mono ${totals.varianceMtrs < 0 ? "text-rose-600" : "text-emerald-700"}`}>
                  {totals.varianceMtrs > 0 ? `+${totals.varianceMtrs}` : totals.varianceMtrs}m
                </div>
              </div>
              <div>
                <div className="text-[9px] uppercase tracking-wider text-slate-500 font-bold">Efficiency</div>
                <div className="text-sm font-black text-primary font-mono">{totals.efficiencyPercent.toFixed(1)}%</div>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto border border-slate-300 mb-4">
              <table className="w-full text-[10px] border-collapse">
                <thead>
                  <tr className="bg-slate-200 text-slate-900 font-bold uppercase text-center border-b border-slate-300">
                    <th className="p-1 border-r border-slate-300 w-8">Sl.</th>
                    <th className="p-1 border-r border-slate-300 text-left">Company Name</th>
                    <th className="p-1 border-r border-slate-300">Unit</th>
                    <th className="p-1 border-r border-slate-300">Grade</th>
                    <th className="p-1 border-r border-slate-300 text-right">Target (m)</th>
                    <th className="p-1 border-r border-slate-300">Drum Size</th>
                    <th className="p-1 border-r border-slate-300 text-left">Quality</th>
                    <th className="p-1 border-r border-slate-300">Roll No.</th>
                    <th className="p-1 border-r border-slate-300">Loom</th>
                    <th className="p-1 border-r border-slate-300 text-right">Prod (m)</th>
                    <th className="p-1 border-r border-slate-300 text-right">Net Wt</th>
                    <th className="p-1 border-r border-slate-300 text-right">Avg</th>
                    <th className="p-1 border-r border-slate-300 text-right">Print (m)</th>
                    <th className="p-1 text-left">Remarks</th>
                  </tr>
                </thead>
                <tbody>
                  {data.entries.length === 0 ? (
                    <tr>
                      <td colSpan={14} className="p-6 text-center text-slate-400 italic">
                        No production entries recorded for this report.
                      </td>
                    </tr>
                  ) : (
                    data.entries.map((entry, idx) => (
                      <tr key={entry.id || idx} className={idx % 2 === 1 ? "bg-slate-50/60" : "bg-white"}>
                        <td className="p-1 border-r border-b border-slate-200 text-center font-bold text-slate-500">
                          {entry.sequence || idx + 1}
                        </td>
                        <td className="p-1 border-r border-b border-slate-200 font-bold text-slate-900">
                          {entry.companyName || "—"}
                        </td>
                        <td className="p-1 border-r border-b border-slate-200 text-center text-slate-700">
                          {entry.unitName || "—"}
                        </td>
                        <td className="p-1 border-r border-b border-slate-200 text-center text-slate-700">
                          {entry.grade || "—"}
                        </td>
                        <td className="p-1 border-r border-b border-slate-200 text-right font-mono text-blue-700">
                          {entry.targetProductionMtrs ? Number(entry.targetProductionMtrs).toLocaleString() : "—"}
                        </td>
                        <td className="p-1 border-r border-b border-slate-200 text-center font-mono text-slate-700">
                          {entry.drumSize || "—"}
                        </td>
                        <td className="p-1 border-r border-b border-slate-200 font-semibold text-slate-800">
                          {entry.quality || "—"}
                        </td>
                        <td className="p-1 border-r border-b border-slate-200 text-center font-mono font-bold text-slate-900">
                          {entry.rollNumber || "—"}
                        </td>
                        <td className="p-1 border-r border-b border-slate-200 text-center font-mono font-semibold text-blue-600">
                          {entry.loomNumber ? `#${entry.loomNumber}` : "—"}
                        </td>
                        <td className="p-1 border-r border-b border-slate-200 text-right font-mono font-bold text-slate-800">
                          {entry.productionMeter ? Number(entry.productionMeter).toLocaleString() : "—"}
                        </td>
                        <td className="p-1 border-r border-b border-slate-200 text-right font-mono text-slate-700">
                          {entry.netWeight ? Number(entry.netWeight).toFixed(1) : "—"}
                        </td>
                        <td className="p-1 border-r border-b border-slate-200 text-right font-mono font-semibold text-blue-700 bg-blue-50/40">
                          {entry.avgWeight ? Number(entry.avgWeight).toFixed(1) : "—"}
                        </td>
                        <td className="p-1 border-r border-b border-slate-200 text-right font-mono font-bold text-emerald-700 bg-emerald-50/40">
                          {entry.printMeter ? Number(entry.printMeter).toLocaleString() : "—"}
                        </td>
                        <td className="p-1 border-b border-slate-200 text-slate-600 truncate max-w-[120px]">
                          {entry.remarks || ""}
                        </td>
                      </tr>
                    ))
                  )}
                  {/* Totals Row */}
                  <tr className="bg-slate-100 font-bold border-t-2 border-b-2 border-slate-900 text-slate-950">
                    <td className="p-1.5 text-center">Σ</td>
                    <td colSpan={3} className="p-1.5 uppercase font-black text-slate-900">
                      Total Summary
                    </td>
                    <td className="p-1.5 text-right font-mono text-blue-700">
                      {totals.totalTargetMtrs.toLocaleString()}
                    </td>
                    <td colSpan={4}></td>
                    <td className="p-1.5 text-right font-mono text-sky-800 font-black">
                      {totals.totalProductionMtrs.toLocaleString()}
                    </td>
                    <td className="p-1.5 text-right font-mono">
                      {totals.totalNetWt.toFixed(1)}
                    </td>
                    <td className="p-1.5 text-right font-mono text-blue-700">
                      {totals.avgWeightGsm.toFixed(1)}
                    </td>
                    <td className="p-1.5 text-right font-mono text-emerald-800 font-black">
                      {totals.totalPrintMtrs.toLocaleString()}
                    </td>
                    <td className="p-1.5 text-slate-600 text-[9px]">
                      {totals.efficiencyPercent.toFixed(1)}% Eff.
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Remarks */}
            {data.remarks && (
              <div className="p-2 bg-slate-50 border border-slate-200 rounded text-[10px] text-slate-700 mb-4">
                <strong>Shift Remarks:</strong> {data.remarks}
              </div>
            )}

            {/* Signatures */}
            <div className="grid grid-cols-4 gap-4 mt-8 pt-4 text-center">
              <div className="border-t border-slate-800 pt-1 text-[10px] font-bold uppercase text-slate-700">
                Operator Signature
              </div>
              <div className="border-t border-slate-800 pt-1 text-[10px] font-bold uppercase text-slate-700">
                Supervisor Signature
              </div>
              <div className="border-t border-slate-800 pt-1 text-[10px] font-bold uppercase text-slate-700">
                Quality In-Charge
              </div>
              <div className="border-t border-slate-800 pt-1 text-[10px] font-bold uppercase text-slate-700">
                Plant Head / Manager
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
