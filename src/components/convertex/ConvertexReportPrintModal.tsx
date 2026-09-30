"use client";

import React, { useMemo } from "react";
import { ConvertexDailyReportData, computeConvertexTotals } from "@/lib/convertex/convertex-types";
import { printConvertexReport } from "@/lib/convertex/print-convertex-production";
import { exportConvertexReportExcel } from "@/lib/convertex/convertex-export";
import { FileText, Printer, FileSpreadsheet, X, CheckCircle2 } from "lucide-react";

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
          <div className="w-full max-w-[1100px] bg-white border border-slate-300 shadow-md p-6 font-sans text-slate-900 text-[10px] flex flex-col justify-between min-h-[500px]">
            {/* Header Titles */}
            <div>
              <div className="border-b border-slate-200 pb-3 mb-3">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-semibold text-slate-500">
                    FLEXICOM ERP
                  </div>
                  <div className="text-center flex-1">
                    <h1 className="text-base sm:text-lg font-black tracking-wide text-slate-900 uppercase">
                      {data.companyName || "FLEXICOM INDUSTRIES PVT. LIMITED, KATHUA"}
                    </h1>
                    <h2 className="text-xs sm:text-sm font-bold text-sky-800 tracking-wider uppercase mt-0.5">
                      CONVERTEX MACHINE - DAILY PRODUCTION REPORT
                    </h2>
                  </div>
                  <div className="text-right text-[9px] font-mono text-slate-500">
                    <div>REF: {docRef}</div>
                    <div>DATE: {data.date}</div>
                  </div>
                </div>
              </div>

              {/* Metadata strip */}
              <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 bg-slate-50 border border-slate-200 rounded p-2.5 mb-3 text-[10px]">
                <div>
                  <span className="font-bold text-slate-500 uppercase block text-[8px]">Date:</span>
                  <span className="font-semibold text-slate-800">{data.date}</span>
                </div>
                <div>
                  <span className="font-bold text-slate-500 uppercase block text-[8px]">Shift:</span>
                  <span className="font-semibold text-slate-800">{data.shiftName}</span>
                </div>
                <div>
                  <span className="font-bold text-slate-500 uppercase block text-[8px]">Machine:</span>
                  <span className="font-semibold text-slate-800">{data.machineNo || "Convertex-1"}</span>
                </div>
                <div>
                  <span className="font-bold text-slate-500 uppercase block text-[8px]">Operator:</span>
                  <span className="font-semibold text-slate-800">{data.operatorName || "—"}</span>
                </div>
                <div>
                  <span className="font-bold text-slate-500 uppercase block text-[8px]">Supervisor:</span>
                  <span className="font-semibold text-slate-800">{data.supervisorName || "—"}</span>
                </div>
                <div>
                  <span className="font-bold text-slate-500 uppercase block text-[8px]">Status:</span>
                  <span className="font-bold text-sky-700 uppercase">{data.status}</span>
                </div>
              </div>

              {/* KPI Strip */}
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mb-3">
                <div className="border border-slate-200 rounded p-2 bg-slate-50 text-center">
                  <div className="text-[8px] font-bold text-slate-500 uppercase">Total Rolls</div>
                  <div className="text-xs sm:text-sm font-mono font-bold text-slate-900 mt-0.5">{totals.totalRolls}</div>
                </div>
                <div className="border border-sky-200 rounded p-2 bg-sky-50 text-center">
                  <div className="text-[8px] font-bold text-sky-700 uppercase">Roll Metres</div>
                  <div className="text-xs sm:text-sm font-mono font-bold text-sky-800 mt-0.5">{totals.totalRollMtr.toLocaleString()} m</div>
                </div>
                <div className="border border-purple-200 rounded p-2 bg-purple-50 text-center">
                  <div className="text-[8px] font-bold text-purple-700 uppercase">Net Weight</div>
                  <div className="text-xs sm:text-sm font-mono font-bold text-purple-800 mt-0.5">{totals.totalNetWt.toFixed(1)} kg</div>
                </div>
                <div className="border border-emerald-200 rounded p-2 bg-emerald-50 text-center">
                  <div className="text-[8px] font-bold text-emerald-700 uppercase">Production (Pcs)</div>
                  <div className="text-xs sm:text-sm font-mono font-bold text-emerald-800 mt-0.5">{totals.totalProductionPcs.toLocaleString()}</div>
                </div>
                <div className="border border-red-200 rounded p-2 bg-red-50 text-center">
                  <div className="text-[8px] font-bold text-red-700 uppercase">Total Wastage</div>
                  <div className="text-xs sm:text-sm font-mono font-bold text-red-800 mt-0.5">{totals.totalWastageKg.toFixed(2)} kg</div>
                </div>
                <div className="border border-amber-200 rounded p-2 bg-amber-50 text-center">
                  <div className="text-[8px] font-bold text-amber-700 uppercase">Overall Wastage %</div>
                  <div className="text-xs sm:text-sm font-mono font-bold text-amber-800 mt-0.5">{totals.totalWastagePct.toFixed(2)}%</div>
                </div>
              </div>

              {/* 22 Column Data Table */}
              <div className="border border-slate-300 rounded overflow-x-auto mb-4">
                <table className="w-full border-collapse text-[9px]">
                  <thead>
                    <tr className="bg-slate-900 text-white font-bold text-[8px] uppercase tracking-wider">
                      <th className="p-1 border border-slate-700 text-center">Sl</th>
                      <th className="p-1 border border-slate-700 text-left">Company</th>
                      <th className="p-1 border border-slate-700 text-left">Unit</th>
                      <th className="p-1 border border-slate-700 text-center">Grade</th>
                      <th className="p-1 border border-slate-700 text-right">Target</th>
                      <th className="p-1 border border-slate-700 text-left">Party</th>
                      <th className="p-1 border border-slate-700 text-center">Roll No</th>
                      <th className="p-1 border border-slate-700 text-center">Loom</th>
                      <th className="p-1 border border-slate-700 text-right">Roll Mtr</th>
                      <th className="p-1 border border-slate-700 text-right">Net Wt</th>
                      <th className="p-1 border border-slate-700 text-right">Avg</th>
                      <th className="p-1 border border-slate-700 text-right">Open</th>
                      <th className="p-1 border border-slate-700 text-right">Close</th>
                      <th className="p-1 border border-slate-700 text-right bg-emerald-950">Prod Pcs</th>
                      <th className="p-1 border border-slate-700 text-right">Loom Wst</th>
                      <th className="p-1 border border-slate-700 text-right">Lam Wst</th>
                      <th className="p-1 border border-slate-700 text-right">Prn Wst</th>
                      <th className="p-1 border border-slate-700 text-right">Mch Wst</th>
                      <th className="p-1 border border-slate-700 text-right bg-red-950">Tot Wst</th>
                      <th className="p-1 border border-slate-700 text-right bg-amber-950">Wst %</th>
                      <th className="p-1 border border-slate-700 text-right">MTD Wst</th>
                      <th className="p-1 border border-slate-700 text-left">Remarks</th>
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
                          <td className="p-1 border-r border-slate-200 font-medium text-slate-800 truncate max-w-[80px]">
                            {entry.partyName || "—"}
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
                          <td className="p-1 border-r border-slate-200 text-right font-mono text-slate-500">
                            {entry.openingMeterReading ? Number(entry.openingMeterReading).toLocaleString() : "—"}
                          </td>
                          <td className="p-1 border-r border-slate-200 text-right font-mono text-slate-500">
                            {entry.closingMeterReading ? Number(entry.closingMeterReading).toLocaleString() : "—"}
                          </td>
                          <td className="p-1 border-r border-slate-200 text-right font-mono font-bold text-emerald-700 bg-emerald-50/50">
                            {entry.productionPcs ? Number(entry.productionPcs).toLocaleString() : "—"}
                          </td>
                          <td className="p-1 border-r border-slate-200 text-right font-mono text-slate-600">
                            {entry.loomFabricWasteKg ? Number(entry.loomFabricWasteKg).toFixed(2) : "—"}
                          </td>
                          <td className="p-1 border-r border-slate-200 text-right font-mono text-slate-600">
                            {entry.lamFabricWasteKg ? Number(entry.lamFabricWasteKg).toFixed(2) : "—"}
                          </td>
                          <td className="p-1 border-r border-slate-200 text-right font-mono text-slate-600">
                            {entry.printFabricWasteKg ? Number(entry.printFabricWasteKg).toFixed(2) : "—"}
                          </td>
                          <td className="p-1 border-r border-slate-200 text-right font-mono text-slate-600">
                            {entry.machineWasteKg ? Number(entry.machineWasteKg).toFixed(2) : "—"}
                          </td>
                          <td className="p-1 border-r border-slate-200 text-right font-mono font-bold text-red-700 bg-red-50/40">
                            {entry.totalWastageKg ? Number(entry.totalWastageKg).toFixed(2) : "—"}
                          </td>
                          <td className="p-1 border-r border-slate-200 text-right font-mono font-bold text-amber-700 bg-amber-50/40">
                            {entry.totalWastagePct ? `${Number(entry.totalWastagePct).toFixed(2)}%` : "—"}
                          </td>
                          <td className="p-1 border-r border-slate-200 text-right font-mono text-purple-700 bg-purple-50/30">
                            {entry.totalWastageMtdKg ? Number(entry.totalWastageMtdKg).toFixed(2) : "—"}
                          </td>
                          <td className="p-1 text-slate-500 text-[8px] truncate max-w-[80px]">
                            {entry.remarks || ""}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={22} className="p-6 text-center text-slate-500 italic">
                          No production entries logged for this shift.
                        </td>
                      </tr>
                    )}

                    {/* Totals Summary Row */}
                    <tr className="bg-slate-100 font-bold border-t-2 border-slate-900 text-slate-900">
                      <td colSpan={4} className="p-1.5 text-right uppercase text-[8px]">
                        SHIFT TOTALS:
                      </td>
                      <td className="p-1 text-right font-mono text-blue-700">
                        {totals.totalTargetPcs > 0 ? totals.totalTargetPcs.toLocaleString() : "—"}
                      </td>
                      <td colSpan={3} className="p-1 text-center font-medium text-slate-600">
                        {totals.totalRolls} ROLLS
                      </td>
                      <td className="p-1 text-right font-mono">
                        {totals.totalRollMtr > 0 ? totals.totalRollMtr.toLocaleString() : "—"}
                      </td>
                      <td className="p-1 text-right font-mono">
                        {totals.totalNetWt > 0 ? totals.totalNetWt.toFixed(1) : "—"}
                      </td>
                      <td className="p-1 text-right font-mono text-sky-700 bg-sky-100/50">
                        {totals.avgWeightGsm > 0 ? totals.avgWeightGsm.toFixed(1) : "—"}
                      </td>
                      <td colSpan={2} className="p-1 text-center text-slate-400">
                        —
                      </td>
                      <td className="p-1 text-right font-mono text-emerald-800 bg-emerald-100/60 font-bold">
                        {totals.totalProductionPcs > 0 ? totals.totalProductionPcs.toLocaleString() : "—"}
                      </td>
                      <td className="p-1 text-right font-mono text-slate-700">
                        {totals.totalLoomWasteKg > 0 ? totals.totalLoomWasteKg.toFixed(2) : "—"}
                      </td>
                      <td className="p-1 text-right font-mono text-slate-700">
                        {totals.totalLamWasteKg > 0 ? totals.totalLamWasteKg.toFixed(2) : "—"}
                      </td>
                      <td className="p-1 text-right font-mono text-slate-700">
                        {totals.totalPrintWasteKg > 0 ? totals.totalPrintWasteKg.toFixed(2) : "—"}
                      </td>
                      <td className="p-1 text-right font-mono text-slate-700">
                        {totals.totalMachineWasteKg > 0 ? totals.totalMachineWasteKg.toFixed(2) : "—"}
                      </td>
                      <td className="p-1 text-right font-mono text-red-800 bg-red-100/50 font-bold">
                        {totals.totalWastageKg > 0 ? totals.totalWastageKg.toFixed(2) : "—"}
                      </td>
                      <td className="p-1 text-right font-mono text-amber-800 bg-amber-100/50 font-bold">
                        {totals.totalWastagePct > 0 ? `${totals.totalWastagePct.toFixed(2)}%` : "—"}
                      </td>
                      <td className="p-1 text-right font-mono text-purple-800 bg-purple-100/50">
                        {totals.totalWastageMtdKg > 0 ? totals.totalWastageMtdKg.toFixed(2) : "—"}
                      </td>
                      <td></td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Remarks */}
              {data.remarks && (
                <div className="bg-slate-50 border border-slate-200 rounded p-2 text-[9px] text-slate-600 mb-3">
                  <span className="font-bold text-slate-700">Shift Remarks: </span>
                  {data.remarks}
                </div>
              )}
            </div>

            {/* Signature Grid */}
            <div className="pt-4 border-t border-slate-200 mt-2">
              <div className="grid grid-cols-4 gap-4 text-center">
                <div className="border-t border-dashed border-slate-400 pt-1">
                  <div className="font-bold text-slate-900">{data.operatorName || "_______________"}</div>
                  <div className="text-[8px] text-slate-500 uppercase">Operator Signature</div>
                </div>
                <div className="border-t border-dashed border-slate-400 pt-1">
                  <div className="font-bold text-slate-900">{data.supervisorName || "_______________"}</div>
                  <div className="text-[8px] text-slate-500 uppercase">Supervisor Signature</div>
                </div>
                <div className="border-t border-dashed border-slate-400 pt-1">
                  <div className="font-bold text-slate-900">Quality In-Charge</div>
                  <div className="text-[8px] text-slate-500 uppercase">QC Verification</div>
                </div>
                <div className="border-t border-dashed border-slate-400 pt-1">
                  <div className="font-bold text-slate-900">Plant Manager / HOD</div>
                  <div className="text-[8px] text-slate-500 uppercase">Authorized Signatory</div>
                </div>
              </div>

              <div className="flex justify-between items-center text-[8px] text-slate-400 mt-3 pt-1 border-t border-slate-100">
                <span>Flexicom ERP • Convertex Production Report</span>
                <span>Generated on {genTimestamp}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
