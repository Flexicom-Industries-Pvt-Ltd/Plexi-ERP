"use client";

import React, { useMemo } from "react";
import { ConvertexDailyReportData, computeConvertexTotals } from "@/lib/convertex/convertex-types";
import { printConvertexReport } from "@/lib/convertex/print-convertex-production";
import { exportConvertexReportExcel } from "@/lib/convertex/convertex-export";
import { FileText, Printer, FileSpreadsheet, X } from "lucide-react";

interface ConvertexReportPrintModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: ConvertexDailyReportData;
}

export function ConvertexReportPrintModal({
  open,
  onOpenChange,
  data,
}: ConvertexReportPrintModalProps) {
  const totals = useMemo(() => computeConvertexTotals(data.entries), [data.entries]);

  if (!open) return null;

  const docDate = (data.date || new Date().toISOString().slice(0, 10)).replace(/[^a-zA-Z0-9]/g, "");
  const docRef = `CVX-${docDate}-${(data.shiftName || "SHIFT").toUpperCase().replace(/\s+/g, "")}-${(data.machineNo || "M1").replace(/[^a-zA-Z0-9]/g, "")}`;
  const genTimestamp = new Date().toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  const handlePrint = () => {
    printConvertexReport(data);
  };

  const handleExportExcel = () => {
    exportConvertexReportExcel(data);
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
                  Convertex Daily Production Report Preview
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
                  SIDCO INDUSTRIAL ESTATE, PHASE-II, KATHUA (J&K) 184143 • CONVERTEX DIVISION
                </div>
                <div className="inline-block border border-slate-900 bg-slate-50 px-4 py-0.5 text-[11px] font-black tracking-wider uppercase mt-1 mb-1">
                  CONVERTEX MACHINE DAILY PRODUCTION REPORT
                </div>
                <div className="flex flex-wrap justify-center items-center gap-x-4 gap-y-1 text-[10px] text-slate-600 mt-0.5">
                  <span>Doc Ref: <strong className="text-slate-900 font-mono">{docRef}</strong></span>
                  <span>Date: <strong className="text-slate-900">{data.date}</strong></span>
                  <span>Shift: <strong className="text-slate-900">{data.shiftName}</strong></span>
                  <span>Machine: <strong className="text-slate-900">{data.machineNo || "Convertex-1"}</strong></span>
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
            <div className="grid grid-cols-3 sm:grid-cols-9 gap-1.5 bg-slate-50 p-2.5 rounded-lg border border-slate-200 mb-4 text-center">
              <div>
                <div className="text-[9px] uppercase tracking-wider text-slate-500 font-bold">Total Rolls</div>
                <div className="text-sm font-black text-slate-900 font-mono">{totals.totalRolls}</div>
              </div>
              <div>
                <div className="text-[9px] uppercase tracking-wider text-slate-500 font-bold">Target Prod</div>
                <div className="text-sm font-black text-blue-700 font-mono">{totals.totalTargetPcs.toLocaleString()}</div>
              </div>
              <div>
                <div className="text-[9px] uppercase tracking-wider text-slate-500 font-bold">Roll Metres</div>
                <div className="text-sm font-black text-sky-700 font-mono">{totals.totalRollMtr.toLocaleString()} m</div>
              </div>
              <div>
                <div className="text-[9px] uppercase tracking-wider text-slate-500 font-bold">Net Wt (Kg)</div>
                <div className="text-sm font-black text-slate-900 font-mono">{totals.totalNetWt.toFixed(1)}</div>
              </div>
              <div>
                <div className="text-[9px] uppercase tracking-wider text-slate-500 font-bold">Avg GSM</div>
                <div className="text-sm font-black text-sky-800 font-mono">{totals.avgWeightGsm.toFixed(1)}</div>
              </div>
              <div>
                <div className="text-[9px] uppercase tracking-wider text-slate-500 font-bold">Cover (OS/DS)</div>
                <div className="text-xs font-black text-indigo-700 font-mono">
                  {totals.totalCoverPatchOs} / {totals.totalCoverPatchDs}
                </div>
              </div>
              <div>
                <div className="text-[9px] uppercase tracking-wider text-slate-500 font-bold">Valve Patch</div>
                <div className="text-xs font-black text-indigo-900 font-mono">
                  {totals.totalValvePatch}
                </div>
              </div>
              <div className="bg-emerald-50 rounded p-1">
                <div className="text-[9px] uppercase tracking-wider text-emerald-700 font-bold">Prod (Pcs)</div>
                <div className="text-sm font-black text-emerald-800 font-mono">{totals.totalProductionPcs.toLocaleString()}</div>
              </div>
              <div className="bg-teal-50 rounded p-1">
                <div className="text-[9px] uppercase tracking-wider text-teal-700 font-bold">Prod (Kg)</div>
                <div className="text-sm font-black text-teal-800 font-mono">{totals.totalProductionKg.toFixed(1)}</div>
              </div>
            </div>

            {/* Data Table */}
            <div className="border border-slate-400 overflow-x-auto mb-4">
              <table className="w-full border-collapse text-[9px]">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-400 text-slate-900 font-black uppercase text-[8px]">
                    <th rowSpan={2} className="p-1.5 border-r border-slate-300 text-center">Sl</th>
                    <th rowSpan={2} className="p-1.5 border-r border-slate-300 text-left">Company</th>
                    <th rowSpan={2} className="p-1.5 border-r border-slate-300 text-left">Unit</th>
                    <th rowSpan={2} className="p-1.5 border-r border-slate-300 text-center">Grade</th>
                    <th rowSpan={2} className="p-1.5 border-r border-slate-300 text-right">Target</th>
                    <th rowSpan={2} className="p-1.5 border-r border-slate-300 text-left bg-amber-50 text-slate-900">Quality</th>
                    <th rowSpan={2} className="p-1.5 border-r border-slate-300 text-center">Roll No</th>
                    <th rowSpan={2} className="p-1.5 border-r border-slate-300 text-center">Loom</th>
                    <th rowSpan={2} className="p-1.5 border-r border-slate-300 text-right">Roll Mtr</th>
                    <th rowSpan={2} className="p-1.5 border-r border-slate-300 text-right">Net Wt</th>
                    <th rowSpan={2} className="p-1.5 border-r border-slate-300 text-right">Avg</th>
                    <th rowSpan={2} className="p-1.5 border-r border-slate-300 text-right">Open</th>
                    <th rowSpan={2} className="p-1.5 border-r border-slate-300 text-right">Close</th>
                    <th colSpan={2} className="p-1 border-b border-r border-slate-300 text-center bg-indigo-50 text-indigo-900">Cover Patch</th>
                    <th rowSpan={2} className="p-1.5 border-r border-slate-300 text-right bg-indigo-50 text-indigo-900">Valve</th>
                    <th rowSpan={2} className="p-1.5 border-r border-slate-300 text-right bg-emerald-50 text-emerald-800">Prod Pcs</th>
                    <th rowSpan={2} className="p-1.5 border-r border-slate-300 text-right bg-teal-50 text-teal-800">Prod Kg</th>
                    <th rowSpan={2} className="p-1.5 text-left">Remarks</th>
                  </tr>
                  <tr className="bg-slate-100 border-b border-slate-400 text-slate-900 font-bold text-[8px] uppercase">
                    <th className="p-1 border-r border-slate-300 text-right bg-indigo-50/50">OS</th>
                    <th className="p-1 border-r border-slate-300 text-right bg-indigo-50/50">DS</th>
                  </tr>
                </thead>
                <tbody>
                  {data.entries.length > 0 ? (
                    data.entries.map((entry, idx) => (
                      <tr
                        key={idx}
                        className={`border-b border-slate-200 ${
                          idx % 2 === 1 ? "bg-slate-50/70" : "bg-white"
                        }`}
                      >
                        <td className="p-1 border-r border-slate-200 text-center font-bold text-slate-500">
                          {entry.sequence || idx + 1}
                        </td>
                        <td className="p-1 border-r border-slate-200 font-semibold text-slate-900 truncate max-w-[80px]">
                          {entry.companyName || "—"}
                        </td>
                        <td className="p-1 border-r border-slate-200 text-slate-600 truncate max-w-[60px]">
                          {entry.unitName || "—"}
                        </td>
                        <td className="p-1 border-r border-slate-200 text-center text-slate-600">
                          {entry.grade || "—"}
                        </td>
                        <td className="p-1 border-r border-slate-200 text-right font-mono text-blue-700">
                          {entry.targetProductionPcs ? Number(entry.targetProductionPcs).toLocaleString() : "—"}
                        </td>
                        <td className="p-1 border-r border-slate-200 font-bold text-slate-900 bg-amber-50/40 truncate max-w-[90px]">
                          {entry.quality || entry.partyName || "—"}
                        </td>
                        <td className="p-1 border-r border-slate-200 text-center font-mono font-bold text-slate-900 bg-slate-50/50">
                          {entry.rollNumber || "—"}
                        </td>
                        <td className="p-1 border-r border-slate-200 text-center font-mono text-sky-700">
                          {entry.loomNumber ? `#${entry.loomNumber}` : "—"}
                        </td>
                        <td className="p-1 border-r border-slate-200 text-right font-mono font-medium text-slate-900">
                          {entry.rollMtr ? Number(entry.rollMtr).toLocaleString() : "—"}
                        </td>
                        <td className="p-1 border-r border-slate-200 text-right font-mono text-slate-800">
                          {entry.netWeight ? Number(entry.netWeight).toFixed(1) : "—"}
                        </td>
                        <td className="p-1 border-r border-slate-200 text-right font-mono text-sky-700 bg-sky-50/40">
                          {entry.avgWeight ? Number(entry.avgWeight).toFixed(1) : "—"}
                        </td>
                        <td className="p-1 border-r border-slate-200 text-right font-mono text-slate-600">
                          {entry.openingMeterReading ? Number(entry.openingMeterReading).toLocaleString() : "—"}
                        </td>
                        <td className="p-1 border-r border-slate-200 text-right font-mono text-slate-600">
                          {entry.closingMeterReading ? Number(entry.closingMeterReading).toLocaleString() : "—"}
                        </td>
                        <td className="p-1 border-r border-slate-200 text-right font-mono text-indigo-700 bg-indigo-50/20">
                          {entry.coverPatchOs ? Number(entry.coverPatchOs).toLocaleString() : "—"}
                        </td>
                        <td className="p-1 border-r border-slate-200 text-right font-mono text-indigo-700 bg-indigo-50/20">
                          {entry.coverPatchDs ? Number(entry.coverPatchDs).toLocaleString() : "—"}
                        </td>
                        <td className="p-1 border-r border-slate-200 text-right font-mono text-indigo-900 bg-indigo-50/30 font-bold">
                          {entry.valvePatch ? Number(entry.valvePatch).toLocaleString() : "—"}
                        </td>
                        <td className="p-1 border-r border-slate-200 text-right font-mono font-bold text-emerald-700 bg-emerald-50/40">
                          {entry.productionPcs ? Number(entry.productionPcs).toLocaleString() : "—"}
                        </td>
                        <td className="p-1 border-r border-slate-200 text-right font-mono font-bold text-teal-800 bg-teal-50/40">
                          {entry.productionKg ? Number(entry.productionKg).toFixed(1) : "—"}
                        </td>
                        <td className="p-1 text-slate-500 truncate max-w-[80px]">
                          {entry.remarks || ""}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={19} className="p-6 text-center text-slate-400 italic">
                        No rolls recorded for this shift.
                      </td>
                    </tr>
                  )}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-100 font-bold border-t-2 border-b-2 border-slate-900 text-slate-900 text-[9px]">
                    <td className="p-1 text-center">Σ</td>
                    <td colSpan={3} className="p-1 text-left uppercase">
                      Totals / Shift Overall:
                    </td>
                    <td className="p-1 text-right font-mono text-blue-700">
                      {totals.totalTargetPcs > 0 ? totals.totalTargetPcs.toLocaleString() : "—"}
                    </td>
                    <td colSpan={3} className="p-1 text-center text-slate-600">
                      {totals.totalRolls} ROLLS
                    </td>
                    <td className="p-1 text-right font-mono text-sky-800">
                      {totals.totalRollMtr > 0 ? totals.totalRollMtr.toLocaleString() : "—"}
                    </td>
                    <td className="p-1 text-right font-mono">
                      {totals.totalNetWt > 0 ? totals.totalNetWt.toFixed(1) : "—"}
                    </td>
                    <td className="p-1 text-right font-mono text-sky-800 bg-sky-100/50">
                      {totals.avgWeightGsm > 0 ? totals.avgWeightGsm.toFixed(1) : "—"}
                    </td>
                    <td colSpan={2} className="p-1 text-center text-slate-400">—</td>
                    <td className="p-1 text-right font-mono text-indigo-800 bg-indigo-100/40">
                      {totals.totalCoverPatchOs > 0 ? totals.totalCoverPatchOs.toLocaleString() : "—"}
                    </td>
                    <td className="p-1 text-right font-mono text-indigo-800 bg-indigo-100/40">
                      {totals.totalCoverPatchDs > 0 ? totals.totalCoverPatchDs.toLocaleString() : "—"}
                    </td>
                    <td className="p-1 text-right font-mono text-indigo-900 bg-indigo-100/50">
                      {totals.totalValvePatch > 0 ? totals.totalValvePatch.toLocaleString() : "—"}
                    </td>
                    <td className="p-1 text-right font-mono text-emerald-800 bg-emerald-100/60 font-black">
                      {totals.totalProductionPcs > 0 ? totals.totalProductionPcs.toLocaleString() : "—"}
                    </td>
                    <td className="p-1 text-right font-mono text-teal-800 bg-teal-100/60 font-black">
                      {totals.totalProductionKg > 0 ? totals.totalProductionKg.toFixed(1) : "—"}
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Shift Remarks */}
            {data.remarks && (
              <div className="p-2 border border-slate-300 rounded bg-slate-50 text-[10px] text-slate-700 mb-4">
                <strong>Shift Remarks / Observations:</strong> {data.remarks}
              </div>
            )}

            {/* Standard 4-Block Signatures Strip */}
            <div className="flex justify-between items-end mt-8 pt-4 px-4">
              <div className="text-center w-36">
                <div className="border-t border-slate-900 pt-1 text-[10px] font-bold text-slate-700 uppercase">
                  Operator Signature
                </div>
                <div className="text-[8px] text-slate-400 mt-0.5">{data.operatorName || "_______________"}</div>
              </div>
              <div className="text-center w-36">
                <div className="border-t border-slate-900 pt-1 text-[10px] font-bold text-slate-700 uppercase">
                  Supervisor Signature
                </div>
                <div className="text-[8px] text-slate-400 mt-0.5">{data.supervisorName || "_______________"}</div>
              </div>
              <div className="text-center w-36">
                <div className="border-t border-slate-900 pt-1 text-[10px] font-bold text-slate-700 uppercase">
                  Quality In-Charge
                </div>
                <div className="text-[8px] text-slate-400 mt-0.5">_______________</div>
              </div>
              <div className="text-center w-36">
                <div className="border-t border-slate-900 pt-1 text-[10px] font-bold text-slate-700 uppercase">
                  Plant Head / Manager
                </div>
                <div className="text-[8px] text-slate-400 mt-0.5">_______________</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
