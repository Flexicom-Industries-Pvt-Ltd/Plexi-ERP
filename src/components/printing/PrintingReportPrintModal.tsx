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
  const docRef = `PRN-${(data.machineNo || "M1").toUpperCase().replace(/\s+/g, "")}-${docDate}-${(data.shiftName || "SHIFT").toUpperCase().replace(/\s+/g, "")}`;
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

  const machineTitle = (data.machineNo || "Machine-1").toUpperCase();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/75 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-300 w-full max-w-6xl max-h-[94vh] flex flex-col overflow-hidden">
        {/* Modal Top Control Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 bg-slate-900 text-white border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 text-white rounded-lg">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-bold text-white tracking-tight">
                  Printing {machineTitle} Daily Production Report Preview
                </h2>
                <span
                  className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-sm border ${
                    data.status === "SUBMITTED" || data.status === "APPROVED"
                      ? "bg-emerald-900/40 text-emerald-300 border-emerald-500/40"
                      : "bg-amber-900/40 text-amber-300 border-amber-500/40"
                  }`}
                >
                  {data.status}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-mono">
                Ref: {docRef} • {data.date} • {data.shiftName}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={handleExportExcel}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 hover:text-white rounded-lg border border-slate-700 shadow-2xs transition-colors cursor-pointer"
            >
              <FileSpreadsheet className="h-4 w-4 text-emerald-400" />
              <span>Export Excel</span>
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-primary hover:bg-primary/90 rounded-lg shadow-sm transition-colors cursor-pointer"
            >
              <Printer className="h-4 w-4" />
              <span>Print Sheet</span>
            </button>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Printable View Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-100 flex justify-center">
          <div className="bg-white shadow-md border border-slate-300 rounded-md p-6 max-w-5xl w-full text-slate-900 text-xs">
            {/* Header Letterhead */}
            <div className="flex items-center justify-between border-b-2 border-slate-900 pb-3 mb-3">
              <div className="flex items-center gap-3">
                <img
                  src="/logo.png"
                  alt="Flexicom Logo"
                  className="h-10 w-auto object-contain"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = "none";
                  }}
                />
                <div>
                  <h1 className="text-base font-black text-slate-950 uppercase tracking-tight">
                    {data.companyName || "FLEXICOM INDUSTRIES PVT. LIMITED"}
                  </h1>
                  <p className="text-[10px] text-slate-500 font-medium">
                    SIDCO INDUSTRIAL ESTATE, PHASE-II, KATHUA (J&K) 184143 • PRINTING DIVISION
                  </p>
                </div>
              </div>
              <div className="text-right">
                <div className="font-mono text-xs font-bold text-sky-700">{docRef}</div>
                <div className="text-[10px] text-slate-400">Generated: {genTimestamp}</div>
              </div>
            </div>

            {/* Document Subtitle and Metadata */}
            <div className="text-center mb-4">
              <div className="inline-block border border-slate-900 bg-slate-50 px-4 py-1 text-xs font-black uppercase tracking-wider mb-2">
                PRINTING {machineTitle} — DAILY PRODUCTION REPORT
              </div>
              <div className="flex flex-wrap items-center justify-center gap-4 text-[11px] text-slate-600">
                <div>Date: <strong className="text-slate-900">{data.date}</strong></div>
                <div>Shift: <strong className="text-slate-900">{data.shiftName}</strong></div>
                <div>Machine: <strong className="text-slate-900">{machineTitle}</strong></div>
                <div>Operator: <strong className="text-slate-900">{data.operatorName || "—"}</strong></div>
                <div>Supervisor: <strong className="text-slate-900">{data.supervisorName || "—"}</strong></div>
                <div>Status: <strong className="text-slate-900">{data.status}</strong></div>
              </div>
            </div>

            {/* KPI Summary Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 border border-slate-300 rounded bg-slate-50/70 p-2.5 mb-4 text-center">
              <div>
                <span className="block text-[10px] text-slate-500 uppercase font-semibold">Total Rolls</span>
                <span className="text-sm font-black font-mono text-slate-900">{totals.totalRolls}</span>
              </div>
              <div>
                <span className="block text-[10px] text-slate-500 uppercase font-semibold">Production (Fabric)</span>
                <span className="text-sm font-black font-mono text-slate-900">
                  {totals.totalProductionMtrs.toLocaleString()} <span className="text-[10px] font-normal text-slate-400">m</span>
                </span>
              </div>
              <div>
                <span className="block text-[10px] text-slate-500 uppercase font-semibold">Net Weight</span>
                <span className="text-sm font-black font-mono text-slate-900">
                  {totals.totalNetWt.toLocaleString()} <span className="text-[10px] font-normal text-slate-400">kg</span>
                </span>
              </div>
              <div>
                <span className="block text-[10px] text-slate-500 uppercase font-semibold">Average GSM</span>
                <span className="text-sm font-black font-mono text-sky-700">
                  {totals.avgWeightGsm} <span className="text-[10px] font-normal text-slate-400">g/m</span>
                </span>
              </div>
              <div>
                <span className="block text-[10px] text-slate-500 uppercase font-semibold">Print in Metre</span>
                <span className="text-sm font-black font-mono text-emerald-700">
                  {totals.totalPrintMtrs.toLocaleString()} <span className="text-[10px] font-normal text-slate-400">m</span>
                </span>
              </div>
              <div>
                <span className="block text-[10px] text-slate-500 uppercase font-semibold">Variance / Gap</span>
                <span className={`text-sm font-black font-mono ${totals.varianceMtrs >= 0 ? "text-emerald-700" : "text-rose-700"}`}>
                  {totals.varianceMtrs >= 0 ? "+" : ""}{totals.varianceMtrs.toLocaleString()} <span className="text-[10px] font-normal text-slate-400">m</span>
                </span>
              </div>
              <div>
                <span className="block text-[10px] text-slate-500 uppercase font-semibold">Efficiency</span>
                <span className="text-sm font-black font-mono text-indigo-700">
                  {totals.efficiencyPercent}%
                </span>
              </div>
            </div>

            {/* Table */}
            <div className="border border-slate-900 rounded overflow-hidden mb-4">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-900 text-white font-bold text-[10px] uppercase">
                    <th className="py-2 px-2 text-center w-8 border-r border-slate-700">#</th>
                    <th className="py-2 px-3 border-r border-slate-700">quality</th>
                    <th className="py-2 px-3 text-center border-r border-slate-700">Roll No.</th>
                    <th className="py-2 px-3 text-center border-r border-slate-700">Loom No.</th>
                    <th className="py-2 px-3 text-right border-r border-slate-700">Production in Metre</th>
                    <th className="py-2 px-3 text-right border-r border-slate-700">Net Wt. (kg)</th>
                    <th className="py-2 px-3 text-right border-r border-slate-700">Avg. (g/m)</th>
                    <th className="py-2 px-3 text-right border-r border-slate-700">Print in Metre</th>
                    <th className="py-2 px-3">Remarks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {data.entries.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-slate-400 italic">
                        No production records entered.
                      </td>
                    </tr>
                  ) : (
                    data.entries.map((entry, idx) => {
                      const prodMtr = Number(entry.productionMeter) || 0;
                      const netWt = Number(entry.netWeight) || 0;
                      const avg = Number(entry.avgWeight) || 0;
                      const printMtr = Number(entry.printMeter) || 0;

                      return (
                        <tr key={entry.id || idx} className={idx % 2 === 1 ? "bg-slate-50/70" : "bg-white"}>
                          <td className="py-2 px-2 text-center font-bold text-slate-500 border-r border-slate-200">
                            {entry.sequence || idx + 1}
                          </td>
                          <td className="py-2 px-3 font-semibold text-slate-900 border-r border-slate-200">
                            {entry.quality || "—"}
                          </td>
                          <td className="py-2 px-3 text-center font-mono font-bold text-slate-800 border-r border-slate-200">
                            {entry.rollNumber || "—"}
                          </td>
                          <td className="py-2 px-3 text-center font-mono font-semibold text-sky-700 border-r border-slate-200">
                            {entry.loomNumber || "—"}
                          </td>
                          <td className="py-2 px-3 text-right font-mono font-semibold text-slate-800 border-r border-slate-200">
                            {prodMtr > 0 ? prodMtr.toLocaleString() : "—"}
                          </td>
                          <td className="py-2 px-3 text-right font-mono text-slate-800 border-r border-slate-200">
                            {netWt > 0 ? netWt.toFixed(1) : "—"}
                          </td>
                          <td className="py-2 px-3 text-right font-mono font-bold text-sky-700 bg-sky-50/50 border-r border-slate-200">
                            {avg > 0 ? avg.toFixed(1) : "—"}
                          </td>
                          <td className="py-2 px-3 text-right font-mono font-bold text-emerald-800 bg-emerald-50/50 border-r border-slate-200">
                            {printMtr > 0 ? printMtr.toLocaleString() : "—"}
                          </td>
                          <td className="py-2 px-3 text-slate-500 text-[11px]">
                            {entry.remarks || ""}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-100 font-bold border-t-2 border-slate-900">
                    <td colSpan={4} className="py-2.5 px-3 text-right border-r border-slate-200">
                      TOTALS:
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-black text-slate-900 border-r border-slate-200">
                      {totals.totalProductionMtrs.toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-black text-slate-900 border-r border-slate-200">
                      {totals.totalNetWt.toFixed(1)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-black text-sky-700 border-r border-slate-200">
                      {totals.avgWeightGsm.toFixed(1)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-black text-emerald-800 border-r border-slate-200">
                      {totals.totalPrintMtrs.toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600 text-[11px]">
                      Variance: {totals.varianceMtrs >= 0 ? "+" : ""}{totals.varianceMtrs} m ({totals.efficiencyPercent}%)
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {data.remarks && (
              <div className="p-3 bg-slate-50 rounded border border-slate-200 mb-6 text-xs">
                <span className="font-bold text-slate-700 uppercase block mb-1">Shift Remarks:</span>
                <p className="text-slate-600">{data.remarks}</p>
              </div>
            )}

            {/* Signature Blocks */}
            <div className="grid grid-cols-4 gap-4 mt-8 pt-4 border-t border-slate-300 text-center text-[10px] font-bold text-slate-700 uppercase">
              <div>
                <div className="h-10 border-b border-dashed border-slate-300 mb-1"></div>
                <span>Operator Signature</span>
              </div>
              <div>
                <div className="h-10 border-b border-dashed border-slate-300 mb-1"></div>
                <span>QC Inspector</span>
              </div>
              <div>
                <div className="h-10 border-b border-dashed border-slate-300 mb-1"></div>
                <span>Shift Supervisor</span>
              </div>
              <div>
                <div className="h-10 border-b border-dashed border-slate-300 mb-1"></div>
                <span>Factory Manager</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
