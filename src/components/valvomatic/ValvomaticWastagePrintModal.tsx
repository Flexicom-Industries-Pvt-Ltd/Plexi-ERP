"use client";

import React, { useMemo } from "react";
import {
  ValvomaticWastageReportData,
  computeValvomaticWastageTotals,
} from "@/lib/valvomatic/valvomatic-types";
import { printValvomaticWastageReport } from "@/lib/valvomatic/print-valvomatic-wastage";
import { exportValvomaticWastageReportExcel } from "@/lib/valvomatic/valvomatic-export";
import { FileText, Printer, FileSpreadsheet, X } from "lucide-react";

interface ValvomaticWastagePrintModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: ValvomaticWastageReportData;
}

export function ValvomaticWastagePrintModal({
  open,
  onOpenChange,
  data,
}: ValvomaticWastagePrintModalProps) {
  const totals = useMemo(
    () => computeValvomaticWastageTotals(data.entries),
    [data.entries]
  );

  if (!open) return null;

  const docDate = (data.date || new Date().toISOString().slice(0, 10)).replace(
    /[^a-zA-Z0-9]/g,
    ""
  );
  const docRef = `VLV-WS-${docDate}-${(data.shiftName || "SHIFT")
    .toUpperCase()
    .replace(/\s+/g, "")}-${(data.machineNo || "M1").replace(/[^a-zA-Z0-9]/g, "")}`;
  const genTimestamp = new Date().toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

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
                  Valvomatic Wastage Report Preview
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
              onClick={() => exportValvomaticWastageReportExcel(data)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-colors shadow-xs"
            >
              <FileSpreadsheet className="h-3.5 w-3.5" />
              Download Excel
            </button>
            <button
              onClick={() => printValvomaticWastageReport(data)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-primary hover:bg-primary/90 text-white transition-colors shadow-xs"
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
                  SIDCO INDUSTRIAL ESTATE, PHASE-II, KATHUA (J&K) 184143 • VALVOMATIC DIVISION
                </div>
                <div className="inline-block border border-slate-900 bg-slate-50 px-4 py-0.5 text-[11px] font-black tracking-wider uppercase mt-1 mb-1">
                  VALVOMATIC WASTAGE & SCRAP ACCOUNTING REPORT
                </div>
                <div className="flex flex-wrap justify-center items-center gap-x-4 gap-y-1 text-[10px] text-slate-600 mt-0.5">
                  <span>Doc Ref: <strong className="text-slate-900 font-mono">{docRef}</strong></span>
                  <span>Date: <strong className="text-slate-900">{data.date}</strong></span>
                  <span>Shift: <strong className="text-slate-900">{data.shiftName}</strong></span>
                  <span>Machine: <strong className="text-slate-900">{data.machineNo || "Valvomatic-1"}</strong></span>
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
            <div className="grid grid-cols-2 sm:grid-cols-10 gap-1.5 bg-slate-50 p-2.5 rounded-lg border border-slate-200 mb-4 text-center">
              <div>
                <div className="text-[8px] uppercase tracking-wider text-slate-500 font-bold">Total Rolls</div>
                <div className="text-sm font-black text-slate-900 font-mono">{data.entries.length}</div>
              </div>
              <div className="bg-teal-50 rounded p-1">
                <div className="text-[8px] uppercase tracking-wider text-teal-700 font-bold">Gross (Kg)</div>
                <div className="text-sm font-black text-teal-800 font-mono">{totals.totalProductionKg.toFixed(1)}</div>
              </div>
              <div>
                <div className="text-[8px] uppercase tracking-wider text-slate-500 font-bold">Loom Waste</div>
                <div className="text-sm font-black text-slate-900 font-mono">{totals.totalLoomWasteKg.toFixed(1)}</div>
              </div>
              <div>
                <div className="text-[8px] uppercase tracking-wider text-slate-500 font-bold">Lam Waste</div>
                <div className="text-sm font-black text-slate-900 font-mono">{totals.totalLamWasteKg.toFixed(1)}</div>
              </div>
              <div>
                <div className="text-[8px] uppercase tracking-wider text-slate-500 font-bold">Print Waste</div>
                <div className="text-sm font-black text-slate-900 font-mono">{totals.totalPrintWasteKg.toFixed(1)}</div>
              </div>
              <div>
                <div className="text-[8px] uppercase tracking-wider text-slate-500 font-bold">Machine Waste</div>
                <div className="text-sm font-black text-slate-900 font-mono">{totals.totalMachineWasteKg.toFixed(1)}</div>
              </div>
              <div>
                <div className="text-[8px] uppercase tracking-wider text-slate-500 font-bold">Cover Waste</div>
                <div className="text-sm font-black text-indigo-700 font-mono">{totals.totalCoverPatchWasteKg.toFixed(1)}</div>
              </div>
              <div className="bg-rose-50 rounded p-1">
                <div className="text-[8px] uppercase tracking-wider text-rose-700 font-bold">Total Waste</div>
                <div className="text-sm font-black text-rose-800 font-mono">{totals.totalWastageKg.toFixed(1)}</div>
              </div>
              <div className="bg-amber-50 rounded p-1">
                <div className="text-[8px] uppercase tracking-wider text-amber-700 font-bold">Waste %</div>
                <div className="text-sm font-black text-amber-800 font-mono">{totals.totalWastagePct.toFixed(2)}%</div>
              </div>
              <div className="bg-emerald-50 rounded p-1">
                <div className="text-[8px] uppercase tracking-wider text-emerald-700 font-bold">Net Prod (Kg)</div>
                <div className="text-sm font-black text-emerald-800 font-mono">{totals.totalNetProductionKg.toFixed(1)}</div>
              </div>
            </div>

            {/* Data Table */}
            <div className="border border-slate-400 overflow-x-auto mb-4">
              <table className="w-full border-collapse text-[9px]">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-400 text-slate-900 font-black uppercase text-[8px]">
                    <th rowSpan={2} className="p-1.5 border-r border-slate-300 text-center">Sl</th>
                    <th rowSpan={2} className="p-1.5 border-r border-slate-300 text-left bg-amber-50 text-slate-900">Quality</th>
                    <th rowSpan={2} className="p-1.5 border-r border-slate-300 text-center">Roll No</th>
                    <th rowSpan={2} className="p-1.5 border-r border-slate-300 text-right bg-teal-50 text-teal-800">Prod (Kg)</th>
                    <th colSpan={2} className="p-1 border-b border-r border-slate-300 text-center">Loom Waste</th>
                    <th colSpan={2} className="p-1 border-b border-r border-slate-300 text-center">Lam Waste</th>
                    <th colSpan={2} className="p-1 border-b border-r border-slate-300 text-center">Print Waste</th>
                    <th colSpan={2} className="p-1 border-b border-r border-slate-300 text-center">Machine Waste</th>
                    <th colSpan={2} className="p-1 border-b border-r border-slate-300 text-center">Cover Patch Waste</th>
                    <th colSpan={2} className="p-1 border-b border-r border-slate-300 text-center bg-rose-50 text-rose-900">Total Waste</th>
                    <th rowSpan={2} className="p-1.5 border-r border-slate-300 text-right bg-emerald-50 text-emerald-800">Net Prod (Kg)</th>
                    <th rowSpan={2} className="p-1.5 text-left">Remarks</th>
                  </tr>
                  <tr className="bg-slate-100 border-b border-slate-400 text-slate-900 font-bold text-[7.5px] uppercase">
                    <th className="p-1 border-r border-slate-300 text-right">Kg</th>
                    <th className="p-1 border-r border-slate-300 text-right">%</th>
                    <th className="p-1 border-r border-slate-300 text-right">Kg</th>
                    <th className="p-1 border-r border-slate-300 text-right">%</th>
                    <th className="p-1 border-r border-slate-300 text-right">Kg</th>
                    <th className="p-1 border-r border-slate-300 text-right">%</th>
                    <th className="p-1 border-r border-slate-300 text-right">Kg</th>
                    <th className="p-1 border-r border-slate-300 text-right">%</th>
                    <th className="p-1 border-r border-slate-300 text-right">Kg</th>
                    <th className="p-1 border-r border-slate-300 text-right">%</th>
                    <th className="p-1 border-r border-slate-300 text-right bg-rose-50">Kg</th>
                    <th className="p-1 border-r border-slate-300 text-right bg-rose-50">%</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {data.entries.length > 0 ? (
                    data.entries.map((r, i) => (
                      <tr key={i} className={i % 2 === 1 ? "bg-slate-50/60" : "bg-white"}>
                        <td className="p-1 border-r border-slate-200 text-center font-bold text-slate-500">{r.sequence || i + 1}</td>
                        <td className="p-1 border-r border-slate-200 font-bold text-slate-900 bg-amber-50/40">{r.quality}</td>
                        <td className="p-1 border-r border-slate-200 text-center font-mono font-bold">{r.rollNumber}</td>
                        <td className="p-1 border-r border-slate-200 text-right font-mono font-bold text-teal-800 bg-teal-50/30">{r.productionKg ? r.productionKg.toFixed(1) : "—"}</td>
                        <td className="p-1 border-r border-slate-200 text-right font-mono text-slate-700">{r.loomWasteKg ? r.loomWasteKg.toFixed(2) : "—"}</td>
                        <td className="p-1 border-r border-slate-200 text-right font-mono text-slate-500 text-[8px]">{r.loomWastePct ? `${r.loomWastePct.toFixed(1)}%` : "—"}</td>
                        <td className="p-1 border-r border-slate-200 text-right font-mono text-slate-700">{r.lamWasteKg ? r.lamWasteKg.toFixed(2) : "—"}</td>
                        <td className="p-1 border-r border-slate-200 text-right font-mono text-slate-500 text-[8px]">{r.lamWastePct ? `${r.lamWastePct.toFixed(1)}%` : "—"}</td>
                        <td className="p-1 border-r border-slate-200 text-right font-mono text-slate-700">{r.printWasteKg ? r.printWasteKg.toFixed(2) : "—"}</td>
                        <td className="p-1 border-r border-slate-200 text-right font-mono text-slate-500 text-[8px]">{r.printWastePct ? `${r.printWastePct.toFixed(1)}%` : "—"}</td>
                        <td className="p-1 border-r border-slate-200 text-right font-mono text-slate-700">{r.machineWasteKg ? r.machineWasteKg.toFixed(2) : "—"}</td>
                        <td className="p-1 border-r border-slate-200 text-right font-mono text-slate-500 text-[8px]">{r.machineWastePct ? `${r.machineWastePct.toFixed(1)}%` : "—"}</td>
                        <td className="p-1 border-r border-slate-200 text-right font-mono text-indigo-700">{r.coverPatchWasteKg ? r.coverPatchWasteKg.toFixed(2) : "—"}</td>
                        <td className="p-1 border-r border-slate-200 text-right font-mono text-indigo-500 text-[8px]">{r.coverPatchWastePct ? `${r.coverPatchWastePct.toFixed(1)}%` : "—"}</td>
                        <td className="p-1 border-r border-slate-200 text-right font-mono font-bold text-rose-700 bg-rose-50/40">{r.totalWasteKg ? r.totalWasteKg.toFixed(2) : "—"}</td>
                        <td className="p-1 border-r border-slate-200 text-right font-mono text-rose-600 bg-rose-50/40 text-[8px]">{r.totalWastePct ? `${r.totalWastePct.toFixed(1)}%` : "—"}</td>
                        <td className="p-1 border-r border-slate-200 text-right font-mono font-bold text-emerald-800 bg-emerald-50/40">{r.netProductionKg ? r.netProductionKg.toFixed(1) : "—"}</td>
                        <td className="p-1 text-slate-500 text-[8.5px] truncate max-w-[120px]">{r.remarks || ""}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={18} className="p-6 text-center text-slate-400 italic">No wastage records entered.</td>
                    </tr>
                  )}
                  {/* Totals Row */}
                  <tr className="bg-slate-100 font-black text-slate-900 border-t-2 border-slate-900">
                    <td className="p-1 border-r border-slate-300 text-center">Σ</td>
                    <td colSpan={2} className="p-1 border-r border-slate-300 uppercase">Totals / Overall</td>
                    <td className="p-1 border-r border-slate-300 text-right font-mono text-teal-800 bg-teal-100">{totals.totalProductionKg.toFixed(1)}</td>
                    <td className="p-1 border-r border-slate-300 text-right font-mono">{totals.totalLoomWasteKg.toFixed(2)}</td>
                    <td className="p-1 border-r border-slate-300 text-right font-mono text-slate-500 text-[8px]">{totals.totalLoomWastePct.toFixed(1)}%</td>
                    <td className="p-1 border-r border-slate-300 text-right font-mono">{totals.totalLamWasteKg.toFixed(2)}</td>
                    <td className="p-1 border-r border-slate-300 text-right font-mono text-slate-500 text-[8px]">{totals.totalLamWastePct.toFixed(1)}%</td>
                    <td className="p-1 border-r border-slate-300 text-right font-mono">{totals.totalPrintWasteKg.toFixed(2)}</td>
                    <td className="p-1 border-r border-slate-300 text-right font-mono text-slate-500 text-[8px]">{totals.totalPrintWastePct.toFixed(1)}%</td>
                    <td className="p-1 border-r border-slate-300 text-right font-mono">{totals.totalMachineWasteKg.toFixed(2)}</td>
                    <td className="p-1 border-r border-slate-300 text-right font-mono text-slate-500 text-[8px]">{totals.totalMachineWastePct.toFixed(1)}%</td>
                    <td className="p-1 border-r border-slate-300 text-right font-mono text-indigo-800">{totals.totalCoverPatchWasteKg.toFixed(2)}</td>
                    <td className="p-1 border-r border-slate-300 text-right font-mono text-indigo-600 text-[8px]">{totals.totalCoverPatchWastePct.toFixed(1)}%</td>
                    <td className="p-1 border-r border-slate-300 text-right font-mono text-rose-800 bg-rose-100">{totals.totalWastageKg.toFixed(2)}</td>
                    <td className="p-1 border-r border-slate-300 text-right font-mono text-rose-700 bg-rose-100 text-[8px]">{totals.totalWastagePct.toFixed(1)}%</td>
                    <td className="p-1 border-r border-slate-300 text-right font-mono text-emerald-800 bg-emerald-100">{totals.totalNetProductionKg.toFixed(1)}</td>
                    <td className="p-1"></td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Observations */}
            {data.remarks && (
              <div className="bg-slate-50 border border-slate-200 p-2 rounded-md mb-4 text-[11px] text-slate-700">
                <strong>Wastage Notes:</strong> {data.remarks}
              </div>
            )}

            {/* 4 Signature Blocks */}
            <div className="grid grid-cols-4 gap-4 mt-8 pt-4 border-t border-slate-200 text-center">
              <div>
                <div className="border-t border-slate-800 pt-1 text-[10px] font-bold uppercase tracking-wider text-slate-700">
                  Operator Signature
                </div>
              </div>
              <div>
                <div className="border-t border-slate-800 pt-1 text-[10px] font-bold uppercase tracking-wider text-slate-700">
                  Supervisor Signature
                </div>
              </div>
              <div>
                <div className="border-t border-slate-800 pt-1 text-[10px] font-bold uppercase tracking-wider text-slate-700">
                  Quality In-Charge
                </div>
              </div>
              <div>
                <div className="border-t border-slate-800 pt-1 text-[10px] font-bold uppercase tracking-wider text-slate-700">
                  Plant Head / Manager
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
