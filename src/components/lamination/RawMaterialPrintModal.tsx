"use client";

import React from "react";
import { LaminationRawMaterialReportData } from "@/lib/lamination/lamination-raw-material-types";
import { printRawMaterialReport } from "@/lib/lamination/print-raw-material-report";
import { exportRawMaterialReportExcel } from "@/lib/lamination/raw-material-export";
import { FileText, Printer, FileSpreadsheet, X } from "lucide-react";

interface RawMaterialPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  reportData: LaminationRawMaterialReportData | null;
}

export function RawMaterialPrintModal({
  isOpen,
  onClose,
  reportData,
}: RawMaterialPrintModalProps) {
  if (!isOpen || !reportData) return null;

  const docDate = (reportData.date || new Date().toISOString().slice(0, 10)).replace(/[^a-zA-Z0-9]/g, "");
  const docRef = `LAM-RM-${docDate}-${(reportData.shiftName || "SHIFT").toUpperCase().replace(/\s+/g, "")}`;
  const genTimestamp = new Date().toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  const totalPercentage = Number(
    (reportData.entries || []).reduce((sum, e) => sum + (Number(e.percentage) || 0), 0).toFixed(1)
  );
  const diffTotal = Number(reportData.diffTotalKg.toFixed(2));
  const netDiffSign = diffTotal > 0 ? `+${diffTotal}` : `${diffTotal}`;
  const netDiffColor = diffTotal > 0 ? "text-emerald-700" : diffTotal < 0 ? "text-amber-700" : "text-slate-800";

  const handlePrint = () => {
    printRawMaterialReport(reportData);
  };

  const handleExcelExport = () => {
    exportRawMaterialReportExcel(reportData);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/75 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-300 w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Modal Top Control Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 bg-slate-900 text-white border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 text-white rounded-lg">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-bold text-white tracking-tight">
                  Lamination Raw Material Consumption Preview
                </h2>
                <span
                  className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-sm border ${
                    reportData.status === "SUBMITTED" || reportData.status === "APPROVED"
                      ? "bg-emerald-900/40 text-emerald-300 border-emerald-500/40"
                      : "bg-amber-900/40 text-amber-300 border-amber-500/40"
                  }`}
                >
                  {reportData.status || "DRAFT"}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {reportData.shiftName} • {reportData.date} • {reportData.entries.length} Material(s) • Ref: {docRef}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExcelExport}
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
          <div className="max-w-[960px] mx-auto bg-white rounded-xl shadow-lg border border-slate-200 p-6 font-sans text-slate-900">
            {/* Standard Company Letterhead */}
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
                    SIDCO INDUSTRIAL ESTATE, PHASE-II, KATHUA (J&K) 184143 • LAMINATION DIVISION
                  </div>
                  <div className="inline-block border border-slate-900 bg-slate-50 px-4 py-0.5 text-xs font-black tracking-wider text-slate-900 mt-1 uppercase">
                    LAMINATION RAW MATERIAL CONSUMPTION REPORT
                  </div>
                </div>
                <div className="w-16 text-right">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                    A4 PORTRAIT
                  </span>
                </div>
              </div>

              {/* Metadata strip */}
              <div className="mt-3 pt-2 border-t border-slate-200 flex flex-wrap items-center justify-between text-xs text-slate-600 font-medium">
                <div>Doc Ref: <strong className="text-slate-900">{docRef}</strong></div>
                <div>Date: <strong className="text-slate-900">{reportData.date}</strong></div>
                <div>Shift: <strong className="text-slate-900">{reportData.shiftName}</strong></div>
                <div>Operator: <strong className="text-slate-900">{reportData.operatorName || "—"}</strong></div>
                <div>Status: <strong className="text-slate-900">{reportData.status || "DRAFT"}</strong></div>
                <div>Generated: <strong className="text-slate-900">{genTimestamp}</strong></div>
              </div>
            </div>

            {/* Bento KPI Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
              <div className="p-3 rounded-lg border border-sky-200 bg-sky-50/50">
                <div className="text-[10px] font-bold uppercase tracking-wider text-sky-700">Manual Target</div>
                <div className="text-base font-black text-sky-800 mt-0.5">
                  {reportData.manualTotalKg.toLocaleString(undefined, { minimumFractionDigits: 2 })} Kg
                </div>
              </div>
              <div className="p-3 rounded-lg border border-purple-200 bg-purple-50/50">
                <div className="text-[10px] font-bold uppercase tracking-wider text-purple-700">Machine Actual</div>
                <div className="text-base font-black text-purple-800 mt-0.5">
                  {reportData.machineTotalKg.toLocaleString(undefined, { minimumFractionDigits: 2 })} Kg
                </div>
              </div>
              <div className="p-3 rounded-lg border border-slate-200 bg-slate-50">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Net Variance</div>
                <div className={`text-base font-black ${netDiffColor} mt-0.5`}>
                  {netDiffSign} Kg
                </div>
              </div>
              <div className="p-3 rounded-lg border border-slate-200 bg-slate-50">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Recipe Target</div>
                <div className="text-base font-black text-slate-900 mt-0.5">{totalPercentage}%</div>
              </div>
            </div>

            {/* High-Fidelity Data Table */}
            <div className="overflow-x-auto border border-slate-300 rounded-lg">
              <table className="w-full border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100 text-slate-800 text-[11px] font-bold uppercase border-b border-slate-300">
                    <th className="p-2.5 text-center border-r border-slate-300 w-12">Sr</th>
                    <th className="p-2.5 text-left border-r border-slate-300">Raw Material Name</th>
                    <th className="p-2.5 text-right border-r border-slate-300 w-24">Recipe %</th>
                    <th className="p-2.5 text-right border-r border-slate-300 w-32 bg-sky-50 text-sky-900">Manual Target (kg)</th>
                    <th className="p-2.5 text-right border-r border-slate-300 w-32 bg-purple-50 text-purple-900">Machine Actual (kg)</th>
                    <th className="p-2.5 text-right border-r border-slate-300 w-28">Diff (kg)</th>
                    <th className="p-2.5 text-left w-32">Remarks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {reportData.entries.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-400 italic">
                        No materials logged.
                      </td>
                    </tr>
                  ) : (
                    reportData.entries.map((e, idx) => {
                      const diffVal = Number(e.diffKg.toFixed(2));
                      const diffColor = diffVal > 0 ? "text-emerald-700" : diffVal < 0 ? "text-amber-700" : "text-slate-700";
                      const diffSign = diffVal > 0 ? `+${diffVal}` : `${diffVal}`;

                      return (
                        <tr key={idx} className={idx % 2 === 1 ? "bg-slate-50/60" : "bg-white"}>
                          <td className="p-2 text-center font-bold text-slate-500 border-r border-slate-200">{idx + 1}</td>
                          <td className="p-2 font-bold text-slate-900 border-r border-slate-200">{e.materialName}</td>
                          <td className="p-2 text-right font-mono font-bold text-sky-700 border-r border-slate-200">{Number(e.percentage).toFixed(1)}%</td>
                          <td className="p-2 text-right font-mono font-bold text-slate-800 bg-sky-50/30 border-r border-slate-200">{Number(e.manualKg).toFixed(2)}</td>
                          <td className="p-2 text-right font-mono font-bold text-purple-900 bg-purple-50/30 border-r border-slate-200">{Number(e.machineKg).toFixed(2)}</td>
                          <td className={`p-2 text-right font-mono font-bold ${diffColor} border-r border-slate-200`}>{diffSign}</td>
                          <td className="p-2 text-slate-500 truncate max-w-[120px]">{e.remarks || "—"}</td>
                        </tr>
                      );
                    })
                  )}
                  {/* Totals Row */}
                  <tr className="bg-slate-100 font-extrabold text-slate-900 border-t-2 border-slate-800">
                    <td colSpan={2} className="p-2.5 text-right pr-4 uppercase tracking-wider text-[11px]">
                      Shift Total:
                    </td>
                    <td className="p-2.5 text-right font-mono text-sky-700 border-r border-slate-300">{totalPercentage}%</td>
                    <td className="p-2.5 text-right font-mono border-r border-slate-300">{reportData.manualTotalKg.toFixed(2)}</td>
                    <td className="p-2.5 text-right font-mono border-r border-slate-300">{reportData.machineTotalKg.toFixed(2)}</td>
                    <td className={`p-2.5 text-right font-mono ${netDiffColor} border-r border-slate-300`}>{netDiffSign}</td>
                    <td></td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Official Signatures */}
            <div className="flex justify-between items-end mt-12 pt-4 px-8">
              <div className="text-center w-44">
                <div className="border-t border-slate-900 pt-1 text-xs font-bold text-slate-800 uppercase">Operator / Technician</div>
              </div>
              <div className="text-center w-44">
                <div className="border-t border-slate-900 pt-1 text-xs font-bold text-slate-800 uppercase">Shift Incharge</div>
              </div>
              <div className="text-center w-44">
                <div className="border-t border-slate-900 pt-1 text-xs font-bold text-slate-800 uppercase">Plant Head / QA</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
