"use client";

import React from "react";
import { FileText, Printer, FileSpreadsheet, X } from "lucide-react";
import {
  RpProductionReportData,
  RpWastageCollectionData,
} from "@/lib/recycling/rp-types";
import {
  exportRpProductionExcel,
  exportWastageCollectionExcel,
} from "@/lib/recycling/rp-export";
import {
  generateRpProductionHtml,
  generateWastageCollectionHtml,
  openPrintWindow,
} from "@/lib/recycling/print-rp-reports";

type RpPrintPreviewModalProps =
  | {
      isOpen: boolean;
      onClose: () => void;
      mode: "wastage";
      reportData: RpWastageCollectionData | null;
    }
  | {
      isOpen: boolean;
      onClose: () => void;
      mode: "production";
      reportData: RpProductionReportData | null;
    };

function fmtNum(val: number | undefined | null): string {
  if (!val || val === 0) return "—";
  return Number.isInteger(val) ? String(val) : Number(val).toFixed(1);
}

export function RpPrintPreviewModal(props: RpPrintPreviewModalProps) {
  if (!props.isOpen || !props.reportData) return null;

  const { mode, reportData, onClose } = props;
  const shifts =
    reportData.shiftNames && reportData.shiftNames.length > 0
      ? reportData.shiftNames
      : ["Day Shift", "Night Shift"];
  const serial = String(reportData.serialNo || 1).padStart(3, "0");
  const docDate = (reportData.date || new Date().toISOString().slice(0, 10)).replace(
    /[^a-zA-Z0-9]/g,
    ""
  );
  const docRef =
    mode === "wastage" ? `RP-WC-${docDate}-${serial}` : `RP-PR-${docDate}-${serial}`;
  const genTimestamp = new Date().toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  const handlePrint = () => {
    if (mode === "wastage") {
      openPrintWindow(generateWastageCollectionHtml(reportData));
    } else {
      openPrintWindow(generateRpProductionHtml(reportData));
    }
  };

  const handleExcel = () => {
    if (mode === "wastage") {
      exportWastageCollectionExcel(reportData);
    } else {
      exportRpProductionExcel(reportData);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/75 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-300 w-full max-w-6xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Standard System Modal Control Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 sm:px-5 py-3 bg-slate-900 text-white border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 bg-sky-500/20 text-sky-300 rounded-lg shrink-0">
              <FileText className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-sm sm:text-base font-bold text-white tracking-tight truncate">
                  {mode === "wastage"
                    ? "Wastage Collection Report Preview"
                    : "R.P. Plant Production Report Preview"}
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
              <p className="text-xs text-slate-400 truncate">
                {shifts.join(" + ")} • {reportData.date} •{" "}
                {mode === "wastage"
                  ? `Sl. No. ${serial} • Total: ${reportData.grandTotalKg.toFixed(1)} Kg`
                  : `Sr. No. ${serial} • Closing Stock: ${reportData.totalClosingStock.toLocaleString()} Kg`}{" "}
                • Ref: {docRef}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExcel}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-all inline-flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <FileSpreadsheet className="h-3.5 w-3.5" />
              <span>Export Excel</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="px-4 py-1.5 text-xs font-bold rounded-lg bg-white hover:bg-slate-100 text-slate-900 transition-all inline-flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <Printer className="h-3.5 w-3.5 text-sky-600" />
              <span>Print Document</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-all cursor-pointer ml-1"
              title="Close Preview"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Preview Canvas */}
        <div className="flex-1 overflow-auto p-3 sm:p-6 bg-slate-100/80">
          <div className="max-w-[1040px] mx-auto bg-white rounded-xl shadow-lg border border-slate-200 p-4 sm:p-6 font-sans text-slate-900">
            {/* Standard Company Letterhead */}
            <div className="border-b-2 border-slate-900 pb-3 mb-4">
              <div className="flex items-center justify-between gap-3">
                <div className="w-12 sm:w-16 shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/logo.png"
                    alt="Flexicom Logo"
                    className="h-9 sm:h-10 w-auto object-contain"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = "none";
                    }}
                  />
                </div>
                <div className="flex-1 text-center">
                  <div className="text-sm sm:text-base font-extrabold tracking-wide uppercase text-slate-950">
                    Flexicom Industries Pvt. Limited
                  </div>
                  <div className="text-[10px] sm:text-[11px] font-semibold text-slate-600 tracking-tight">
                    SIDCO INDUSTRIAL ESTATE, PHASE-II, GHATTI, KATHUA (J&amp;K) 184143 • RECYCLING PLANT DIVISION
                  </div>
                  <div className="inline-block border border-slate-900 bg-slate-50 px-3 sm:px-4 py-0.5 text-[11px] sm:text-xs font-black tracking-wider text-slate-900 mt-1 uppercase">
                    {mode === "wastage"
                      ? "Wastage Collection Report"
                      : "R.P. Plant Production Report"}
                  </div>
                </div>
                <div className="w-16 text-right hidden sm:block">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                    {mode === "wastage" ? "A4 PORTRAIT" : "A4 LANDSCAPE"}
                  </span>
                </div>
              </div>

              {/* Metadata Strip */}
              <div className="mt-3 pt-2 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600 font-medium">
                <div>
                  Doc Ref: <strong className="text-slate-900">{docRef}</strong>
                </div>
                <div>
                  {mode === "wastage" ? "Sl. No.:" : "Sr. No.:"}{" "}
                  <strong className="text-rose-600 font-mono">{serial}</strong>
                </div>
                <div>
                  Date: <strong className="text-slate-900">{reportData.date}</strong>
                </div>
                <div>
                  Shifts: <strong className="text-slate-900">{shifts.join(" + ")}</strong>
                </div>
                <div>
                  Operator:{" "}
                  <strong className="text-slate-900">
                    {reportData.operatorName || "—"}
                  </strong>
                </div>
                <div>
                  Generated: <strong className="text-slate-900">{genTimestamp}</strong>
                </div>
              </div>
            </div>

            {mode === "wastage" ? (
              <>
                {/* Bento KPI Strip */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                  <div className="p-3 rounded-lg border border-sky-200 bg-sky-50/50">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-sky-700">
                      Sections Summary
                    </div>
                    <div className="text-base font-black text-sky-900 mt-0.5 font-mono">
                      {reportData.summaryTotalKg.toFixed(1)} Kg
                    </div>
                  </div>
                  <div className="p-3 rounded-lg border border-purple-200 bg-purple-50/50">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-purple-700">
                      Bobbin Cleaning
                    </div>
                    <div className="text-base font-black text-purple-900 mt-0.5 font-mono">
                      {reportData.marginBlocks.bobbinCleaning.totalDay.toFixed(1)} Kg
                    </div>
                  </div>
                  <div className="p-3 rounded-lg border border-amber-200 bg-amber-50/50">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-amber-700">
                      Segregation
                    </div>
                    <div className="text-base font-black text-amber-900 mt-0.5 font-mono">
                      {reportData.marginBlocks.segregation.total.toFixed(1)} Kg
                    </div>
                  </div>
                  <div className="p-3 rounded-lg border border-emerald-200 bg-emerald-50/50">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                      Grand Reconciled
                    </div>
                    <div className="text-base font-black text-emerald-900 mt-0.5 font-mono">
                      {reportData.grandTotalKg.toFixed(1)} Kg
                    </div>
                  </div>
                </div>

                {/* Preview Tables */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
                  <div className="lg:col-span-8 space-y-2.5">
                    {reportData.sections.map((sec) => (
                      <div
                        key={sec.key}
                        className="border border-slate-300 rounded-md overflow-x-auto"
                      >
                        <table className="w-full text-[11px] border-collapse">
                          <thead>
                            <tr className="bg-slate-200/80 border-b border-slate-300">
                              <th
                                colSpan={2 + shifts.length * 2}
                                className="py-1 px-2 text-center font-extrabold text-slate-900 uppercase"
                              >
                                {sec.title}
                              </th>
                            </tr>
                            <tr className="bg-slate-50 border-b border-slate-300 text-[10px] text-slate-600 uppercase">
                              <th className="py-1 px-2 text-left border-r border-slate-200">
                                Colour / Type
                              </th>
                              {shifts.map((s) => (
                                <React.Fragment key={s}>
                                  <th className="py-1 px-2 text-right border-r border-slate-200">
                                    {s.replace(" Shift", "")}
                                  </th>
                                  <th className="py-1 px-2 text-right border-r border-slate-200 text-slate-400">
                                    MTD
                                  </th>
                                </React.Fragment>
                              ))}
                              <th className="py-1 px-2 text-right">Total</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200">
                            {sec.rows.map((r) => (
                              <tr key={r.id}>
                                <td className="py-1 px-2 font-semibold border-r border-slate-200">
                                  {r.label}
                                </td>
                                {shifts.map((s) => (
                                  <React.Fragment key={s}>
                                    <td className="py-1 px-2 text-right font-mono border-r border-slate-200">
                                      {fmtNum(r.shifts[s])}
                                    </td>
                                    <td className="py-1 px-2 text-right font-mono text-slate-400 border-r border-slate-200">
                                      {fmtNum(r.mtdShifts[s])}
                                    </td>
                                  </React.Fragment>
                                ))}
                                <td className="py-1 px-2 text-right font-mono font-bold">
                                  {fmtNum(r.total)}
                                </td>
                              </tr>
                            ))}
                            <tr className="bg-slate-100 font-bold border-t border-slate-300">
                              <td className="py-1 px-2 border-r border-slate-200">TOTAL</td>
                              {shifts.map((s) => (
                                <React.Fragment key={s}>
                                  <td className="py-1 px-2 text-right font-mono border-r border-slate-200">
                                    {fmtNum(sec.sectionShiftTotals[s])}
                                  </td>
                                  <td className="py-1 px-2 text-right font-mono text-slate-400 border-r border-slate-200">
                                    {fmtNum(sec.sectionMtdShiftTotals[s])}
                                  </td>
                                </React.Fragment>
                              ))}
                              <td className="py-1 px-2 text-right font-mono">
                                {fmtNum(sec.sectionTotal)}
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    ))}
                  </div>

                  <div className="lg:col-span-4 space-y-2.5 text-[11px]">
                    <div className="border border-slate-300 rounded-md overflow-hidden">
                      <div className="bg-slate-200/80 py-1 px-2 text-center font-extrabold uppercase border-b border-slate-300">
                        Summary
                      </div>
                      <div className="divide-y divide-slate-200">
                        {reportData.sections.map((s) => (
                          <div key={s.key} className="flex justify-between py-1 px-2.5">
                            <span>{s.title.replace(" SECTION", "")}</span>
                            <span className="font-mono font-bold">
                              {fmtNum(s.sectionTotal)}
                            </span>
                          </div>
                        ))}
                        <div className="flex justify-between py-1.5 px-2.5 bg-sky-50 font-extrabold text-sky-900">
                          <span>TOTAL (KG)</span>
                          <span className="font-mono">{fmtNum(reportData.summaryTotalKg)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="border border-slate-300 rounded-md overflow-hidden">
                      <div className="bg-slate-200/80 py-1 px-2 text-center font-extrabold uppercase border-b border-slate-300">
                        Note (Reconciliation)
                      </div>
                      <div className="divide-y divide-slate-200">
                        <div className="flex justify-between py-1 px-2.5">
                          <span>B. Cleaning</span>
                          <span className="font-mono">
                            {fmtNum(reportData.marginBlocks.noteBox.bCleaning)}
                          </span>
                        </div>
                        <div className="flex justify-between py-1 px-2.5">
                          <span>RP Lums</span>
                          <span className="font-mono">
                            {fmtNum(reportData.marginBlocks.noteBox.rpLums)}
                          </span>
                        </div>
                        <div className="flex justify-between py-1 px-2.5">
                          <span>Summary</span>
                          <span className="font-mono">
                            {fmtNum(reportData.marginBlocks.noteBox.summary)}
                          </span>
                        </div>
                        <div className="flex justify-between py-1.5 px-2.5 bg-emerald-50 font-extrabold text-emerald-900">
                          <span>TOTAL</span>
                          <span className="font-mono">
                            {fmtNum(reportData.marginBlocks.noteBox.total)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <>
                {/* Production Bento KPI Strip */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                  <div className="p-3 rounded-lg border border-slate-200 bg-slate-50/70">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-600">
                      Opening Stock
                    </div>
                    <div className="text-base font-black text-slate-900 mt-0.5 font-mono">
                      {reportData.totalOpeningStock.toLocaleString()} Kg
                    </div>
                  </div>
                  <div className="p-3 rounded-lg border border-emerald-200 bg-emerald-50/50">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                      Production on Date
                    </div>
                    <div className="text-base font-black text-emerald-900 mt-0.5 font-mono">
                      +{reportData.totalProductionOnDate.toLocaleString()} Kg
                    </div>
                  </div>
                  <div className="p-3 rounded-lg border border-sky-200 bg-sky-50/50">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-sky-700">
                      Issued to Tape Plant
                    </div>
                    <div className="text-base font-black text-sky-900 mt-0.5 font-mono">
                      -{reportData.totalIssuedToTapePlant.toLocaleString()} Kg
                    </div>
                  </div>
                  <div className="p-3 rounded-lg border border-purple-200 bg-purple-50/50">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-purple-700">
                      Closing Stock
                    </div>
                    <div className="text-base font-black text-purple-900 mt-0.5 font-mono">
                      {reportData.totalClosingStock.toLocaleString()} Kg
                    </div>
                  </div>
                </div>

                {/* Production Data Table */}
                <div className="overflow-x-auto border border-slate-300 rounded-lg">
                  <table className="w-full border-collapse text-[11px]">
                    <thead>
                      <tr className="bg-slate-100 text-slate-800 text-[10px] font-bold uppercase border-b border-slate-300">
                        <th rowSpan={2} className="p-2 border-r border-slate-300">
                          No.
                        </th>
                        <th rowSpan={2} className="p-2 text-left border-r border-slate-300">
                          Particulars
                        </th>
                        <th rowSpan={2} className="p-2 text-left border-r border-slate-300">
                          Colors
                        </th>
                        <th rowSpan={2} className="p-2 text-right border-r border-slate-300">
                          Opening
                        </th>
                        <th
                          colSpan={shifts.length + 1}
                          className="p-1 text-center border-b border-r border-slate-300"
                        >
                          Production on Date
                        </th>
                        <th rowSpan={2} className="p-2 text-right border-r border-slate-300">
                          Prod MTD
                        </th>
                        <th rowSpan={2} className="p-2 text-right border-r border-slate-300">
                          Issued TP
                        </th>
                        <th rowSpan={2} className="p-2 text-right border-r border-slate-300">
                          Lumps
                        </th>
                        <th rowSpan={2} className="p-2 text-right border-r border-slate-300">
                          Dispatch
                        </th>
                        <th rowSpan={2} className="p-2 text-right border-r border-slate-300">
                          Closing
                        </th>
                        <th rowSpan={2} className="p-2 text-left">
                          Remarks
                        </th>
                      </tr>
                      <tr className="bg-slate-50 text-[10px] text-slate-600 uppercase border-b border-slate-300">
                        {shifts.map((s) => (
                          <th key={s} className="p-1 text-right border-r border-slate-200">
                            {s.replace(" Shift", "")}
                          </th>
                        ))}
                        <th className="p-1 text-right border-r border-slate-300">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {reportData.rows.map((r) => (
                        <tr key={r.id}>
                          <td className="p-1.5 text-center border-r border-slate-200">{r.seq}</td>
                          <td className="p-1.5 font-semibold border-r border-slate-200">
                            {r.particular || "—"}
                          </td>
                          <td className="p-1.5 border-r border-slate-200">{r.color || "—"}</td>
                          <td className="p-1.5 text-right font-mono border-r border-slate-200">
                            {r.isLumpsOnly ? "—" : fmtNum(r.openingStock)}
                          </td>
                          {shifts.map((s) => (
                            <td
                              key={s}
                              className="p-1.5 text-right font-mono border-r border-slate-200"
                            >
                              {fmtNum(r.productionShifts[s])}
                            </td>
                          ))}
                          <td className="p-1.5 text-right font-mono font-bold border-r border-slate-200">
                            {fmtNum(r.productionTotal)}
                          </td>
                          <td className="p-1.5 text-right font-mono text-slate-500 border-r border-slate-200">
                            {fmtNum(r.productionMtd)}
                          </td>
                          <td className="p-1.5 text-right font-mono border-r border-slate-200">
                            {fmtNum(r.issuedToTapePlant)}
                          </td>
                          <td className="p-1.5 text-right font-mono border-r border-slate-200">
                            {fmtNum(r.lumpsOnDate)}
                          </td>
                          <td className="p-1.5 text-right font-mono border-r border-slate-200">
                            {fmtNum(r.dispatchOnDate)}
                          </td>
                          <td className="p-1.5 text-right font-mono font-bold border-r border-slate-200">
                            {r.isLumpsOnly ? "—" : fmtNum(r.closingStock)}
                          </td>
                          <td className="p-1.5 text-slate-600">{r.remarks || ""}</td>
                        </tr>
                      ))}
                      <tr className="bg-sky-50 font-extrabold text-slate-900 border-t-2 border-sky-600">
                        <td colSpan={3} className="p-2 text-right uppercase border-r border-slate-300">
                          Grand Total (Kg)
                        </td>
                        <td className="p-2 text-right font-mono border-r border-slate-300">
                          {fmtNum(reportData.totalOpeningStock)}
                        </td>
                        {shifts.map((s) => (
                          <td
                            key={s}
                            className="p-2 text-right font-mono border-r border-slate-300"
                          >
                            {fmtNum(reportData.shiftProductionTotals?.[s])}
                          </td>
                        ))}
                        <td className="p-2 text-right font-mono border-r border-slate-300">
                          {fmtNum(reportData.totalProductionOnDate)}
                        </td>
                        <td className="p-2 text-right font-mono border-r border-slate-300">
                          {fmtNum(reportData.totalProductionMtd)}
                        </td>
                        <td className="p-2 text-right font-mono border-r border-slate-300">
                          {fmtNum(reportData.totalIssuedToTapePlant)}
                        </td>
                        <td className="p-2 text-right font-mono border-r border-slate-300">
                          {fmtNum(reportData.totalLumpsOnDate)}
                        </td>
                        <td className="p-2 text-right font-mono border-r border-slate-300">
                          {fmtNum(reportData.totalDispatchOnDate)}
                        </td>
                        <td className="p-2 text-right font-mono text-sky-900 border-r border-slate-300">
                          {fmtNum(reportData.totalClosingStock)}
                        </td>
                        <td />
                      </tr>
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {/* Official Signatures */}
            <div className="flex flex-wrap justify-between items-end gap-4 mt-10 pt-4 px-4 sm:px-8">
              <div className="text-center w-36 sm:w-44">
                <div className="border-t border-slate-900 pt-1 text-[11px] font-bold text-slate-800 uppercase">
                  Operator / Technician
                </div>
              </div>
              <div className="text-center w-36 sm:w-44">
                <div className="border-t border-slate-900 pt-1 text-[11px] font-bold text-slate-800 uppercase">
                  Shift Incharge
                </div>
              </div>
              <div className="text-center w-36 sm:w-44">
                <div className="border-t border-slate-900 pt-1 text-[11px] font-bold text-slate-800 uppercase">
                  QC / Plant Head
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
