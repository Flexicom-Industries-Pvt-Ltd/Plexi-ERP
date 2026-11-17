"use client";

import React from "react";
import {
  X,
  Printer,
  FileSpreadsheet,
  FlaskConical,
} from "lucide-react";
import { RawMaterialRow } from "./RawMaterialSection";
import {
  printTapePlantRawMaterialSheet,
  RawMaterialPrintData,
} from "@/lib/tape-plant/print-raw-material-sheet";
import { exportTapePlantRawMaterialExcel } from "@/lib/tape-plant/raw-material-export";
import { toast } from "sonner";

interface RawMaterialPrintPreviewModalProps {
  open: boolean;
  onClose: () => void;
  date: string;
  shiftName: string;
  operatorName?: string;
  status?: string;
  records: RawMaterialRow[];
}

function parseNum(val: number | string | undefined | null): number {
  if (val === undefined || val === null || val === "") return 0;
  const n = Number(val);
  return isNaN(n) ? 0 : n;
}

export function RawMaterialPrintPreviewModal({
  open,
  onClose,
  date,
  shiftName,
  operatorName,
  status = "SAVED",
  records,
}: RawMaterialPrintPreviewModalProps) {
  if (!open) return null;

  const docDate = (date || new Date().toISOString().slice(0, 10)).replace(/-/g, "");
  const docRef = `TP-RM-${docDate}-${(shiftName || "SHIFT").toUpperCase().replace(/\s+/g, "")}`;

  let totOpening = 0;
  let totReceived = 0;
  let totAvailable = 0;
  let totConsumption = 0;
  let totClosing = 0;
  let totSettingPercent = 0;
  let totActualPercent = 0;
  let totWastage = 0;

  records.forEach((r) => {
    const openVal = parseNum(r.openingStock);
    const recVal = parseNum(r.received);
    const availVal = openVal + recVal;
    const consVal = parseNum(r.consumption);
    const closeVal = availVal - consVal;
    const setP = parseNum(r.settingPercent);
    const actP = parseNum(r.actualPercent);
    const wstVal = parseNum(r.wastage);

    totOpening += openVal;
    totReceived += recVal;
    totAvailable += availVal;
    totConsumption += consVal;
    totClosing += closeVal;
    totSettingPercent += setP;
    totActualPercent += actP;
    totWastage += wstVal;
  });

  const handlePrint = () => {
    try {
      printTapePlantRawMaterialSheet({
        date,
        shiftName,
        operatorName,
        status,
        records,
      });
      toast.success("Print document generated");
    } catch (err: any) {
      toast.error(err.message || "Failed to trigger print");
    }
  };

  const handleExportExcel = () => {
    try {
      exportTapePlantRawMaterialExcel({
        date,
        shiftName,
        operatorName,
        status,
        records,
      });
      toast.success("Excel exported successfully");
    } catch (err: any) {
      toast.error(err.message || "Failed to export Excel");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="flex flex-col bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-5xl max-h-[92vh] shadow-2xl overflow-hidden">
        {/* Top Action Header */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-slate-900/90 border-b border-slate-800 text-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
              <FlaskConical className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-bold text-white">
                  Tape Plant Raw Material Preview
                </h3>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  {status}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {shiftName} • {date} • {records.length} Raw Materials
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportExcel}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold shadow-xs transition-all active:scale-95 cursor-pointer"
            >
              <FileSpreadsheet className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Export Excel</span>
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary hover:bg-primary/90 text-white rounded-lg text-xs font-semibold shadow-xs transition-all active:scale-95 cursor-pointer"
            >
              <Printer className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Print Sheet</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-all ml-1 cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Paper Preview Scroll Area */}
        <div className="flex-1 overflow-auto bg-slate-950/50 p-3 sm:p-6">
          <div className="bg-white text-slate-900 rounded-xl p-5 sm:p-8 shadow-xl max-w-4xl mx-auto border border-slate-200 text-xs">
            {/* Flexicom Standard Minimalist Header */}
            <div className="text-center pb-4 mb-5 border-b-2 border-slate-900">
              <div className="flex items-center justify-between">
                <div className="w-20 text-left">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/logo.png"
                    alt="Flexicom Logo"
                    className="h-10 object-contain"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = "none";
                    }}
                  />
                </div>
                <div className="flex-1 text-center">
                  <h1 className="text-lg sm:text-xl font-black text-slate-950 tracking-wide uppercase">
                    FLEXICOM INDUSTRIES PVT. LTD.
                  </h1>
                  <p className="text-[11px] font-bold text-slate-700 tracking-wide mt-0.5">
                    Tape Plant Extrusion • Kathua Industrial Complex, Phase-II, Kathua (J&amp;K)
                  </p>
                  <div className="mt-2">
                    <span className="inline-block border border-slate-900 px-4 py-1 text-xs font-extrabold tracking-wider uppercase bg-white">
                      TAPE PLANT RAW MATERIAL MOVEMENT SHEET
                    </span>
                  </div>
                </div>
                <div className="w-20" />
              </div>

              <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-6 text-[11px] text-slate-600 font-medium mt-3">
                <span>
                  Doc Ref: <strong className="text-slate-900">{docRef}</strong>
                </span>
                <span>•</span>
                <span>
                  Date: <strong className="text-slate-900">{date}</strong>
                </span>
                <span>•</span>
                <span>
                  Shift: <strong className="text-slate-900">{shiftName}</strong>
                </span>
                <span>•</span>
                <span>
                  Operator: <strong className="text-slate-900">{operatorName || "Unassigned"}</strong>
                </span>
                <span>•</span>
                <span>
                  Status:{" "}
                  <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 uppercase">
                    {status}
                  </span>
                </span>
              </div>
            </div>

            {/* KPI Summary Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
              <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200 text-center">
                <div className="text-[10px] uppercase font-bold text-emerald-700 tracking-wider">
                  Total Consumption
                </div>
                <div className="text-base sm:text-lg font-black text-emerald-900 mt-1">
                  {totConsumption.toLocaleString()} KG
                </div>
                <div className="text-[10px] text-emerald-600 mt-0.5">
                  Extruder Net Feed
                </div>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-center">
                <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                  Total Received
                </div>
                <div className="text-base sm:text-lg font-black text-slate-900 mt-1">
                  {totReceived.toLocaleString()} KG
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">
                  Store Inward Issue
                </div>
              </div>
              <div className="p-3 bg-rose-50 rounded-lg border border-rose-200 text-center">
                <div className="text-[10px] uppercase font-bold text-rose-700 tracking-wider">
                  Total Wastage
                </div>
                <div className="text-base sm:text-lg font-black text-rose-900 mt-1">
                  {totWastage.toLocaleString()} KG
                </div>
                <div className="text-[10px] text-rose-600 mt-0.5">
                  Floor Scrap Log
                </div>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-center">
                <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                  Closing Stock
                </div>
                <div className="text-base sm:text-lg font-black text-slate-900 mt-1">
                  {totClosing.toLocaleString()} KG
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">
                  {records.length} Formulations
                </div>
              </div>
            </div>

            {/* Table Preview */}
            <div className="overflow-x-auto border border-slate-300 rounded-lg mb-6">
              <table className="w-full border-collapse text-[11px]">
                <thead>
                  <tr className="border-b border-slate-300 text-[10px] font-bold text-slate-700 bg-slate-100">
                    <th className="p-2 border-r border-slate-300 text-center w-8">#</th>
                    <th className="p-2 border-r border-slate-300 text-left w-24">Raw Material</th>
                    <th className="p-2 border-r border-slate-300 text-left w-24">Grade</th>
                    <th className="p-2 border-r border-slate-300 text-center w-12">Photo</th>
                    <th className="p-2 border-r border-slate-300 text-right bg-slate-50">Opening (KG)</th>
                    <th className="p-2 border-r border-slate-300 text-right bg-slate-50">Received (KG)</th>
                    <th className="p-2 border-r border-slate-300 text-right bg-slate-100 font-extrabold text-slate-900">Total (KG)</th>
                    <th className="p-2 border-r border-slate-300 text-right bg-emerald-50 text-emerald-950 font-extrabold">Consumption (KG)</th>
                    <th className="p-2 border-r border-slate-300 text-right bg-slate-50 font-bold">Closing (KG)</th>
                    <th className="p-2 border-r border-slate-300 text-right bg-amber-50/70">Setting %</th>
                    <th className="p-2 border-r border-slate-300 text-right bg-amber-50/70">Actual %</th>
                    <th className="p-2 text-right bg-rose-50/70 text-rose-900 font-bold">Wastage (KG)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {records.length === 0 ? (
                    <tr>
                      <td colSpan={12} className="p-8 text-center text-slate-400 font-medium">
                        No raw material records found for this shift.
                      </td>
                    </tr>
                  ) : (
                    records.map((r, i) => {
                      const open = parseNum(r.openingStock);
                      const rec = parseNum(r.received);
                      const avail = open + rec;
                      const cons = parseNum(r.consumption);
                      const close = avail - cons;

                      return (
                        <tr key={i} className={i % 2 === 1 ? "bg-slate-50/50" : "bg-white"}>
                          <td className="p-2 border-r border-slate-200 text-center font-bold text-slate-700">
                            {i + 1}
                          </td>
                          <td className="p-2 border-r border-slate-200 font-bold text-slate-900">
                            {r.material || "—"}
                          </td>
                          <td className="p-2 border-r border-slate-200 text-slate-600 font-medium">
                            {r.grade || "—"}
                          </td>
                          <td className="p-2 border-r border-slate-200 text-center">
                            {r.photoUrl ? (
                              <span className="inline-block px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-100 text-emerald-800">
                                YES
                              </span>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </td>
                          <td className="p-2 border-r border-slate-200 text-right font-mono">
                            {r.openingStock !== "" ? open.toFixed(1) : "—"}
                          </td>
                          <td className="p-2 border-r border-slate-200 text-right font-mono">
                            {r.received !== "" ? rec.toFixed(1) : "—"}
                          </td>
                          <td className="p-2 border-r border-slate-200 text-right font-mono font-bold bg-slate-50">
                            {avail.toFixed(1)}
                          </td>
                          <td className="p-2 border-r border-slate-200 text-right font-mono font-bold text-emerald-700 bg-emerald-50/50">
                            {r.consumption !== "" ? cons.toFixed(1) : "—"}
                          </td>
                          <td className="p-2 border-r border-slate-200 text-right font-mono font-bold text-slate-800">
                            {close.toFixed(1)}
                          </td>
                          <td className="p-2 border-r border-slate-200 text-right font-mono">
                            {r.settingPercent !== "" ? `${Number(r.settingPercent)}%` : "—"}
                          </td>
                          <td className="p-2 border-r border-slate-200 text-right font-mono">
                            {r.actualPercent !== "" ? `${Number(r.actualPercent)}%` : "—"}
                          </td>
                          <td className="p-2 text-right font-mono font-bold text-rose-700">
                            {r.wastage !== "" ? Number(r.wastage).toFixed(1) : "—"}
                          </td>
                        </tr>
                      );
                    })
                  )}

                  {/* Summary Totals Footer */}
                  <tr className="bg-slate-100 border-t-2 border-slate-900 font-extrabold text-[11px]">
                    <td colSpan={4} className="p-2 border-r border-slate-300 text-center uppercase tracking-wider bg-slate-200">
                      Total
                    </td>
                    <td className="p-2 border-r border-slate-300 text-right font-mono">{totOpening.toFixed(1)}</td>
                    <td className="p-2 border-r border-slate-300 text-right font-mono">{totReceived.toFixed(1)}</td>
                    <td className="p-2 border-r border-slate-300 text-right font-mono font-black bg-slate-200">{totAvailable.toFixed(1)}</td>
                    <td className="p-2 border-r border-slate-300 text-right font-mono font-black text-emerald-800 bg-emerald-100">{totConsumption.toFixed(1)}</td>
                    <td className="p-2 border-r border-slate-300 text-right font-mono font-black">{totClosing.toFixed(1)}</td>
                    <td className="p-2 border-r border-slate-300 text-right font-mono">{totSettingPercent.toFixed(1)}%</td>
                    <td className="p-2 border-r border-slate-300 text-right font-mono">{totActualPercent.toFixed(1)}%</td>
                    <td className="p-2 text-right font-mono font-black text-rose-800 bg-rose-100">{totWastage.toFixed(1)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Standard Signatures Strip */}
            <div className="grid grid-cols-3 gap-6 pt-4 border-t border-slate-300 text-center text-xs">
              <div>
                <div className="border-b border-slate-800 h-10 mb-1" />
                <span className="font-bold text-slate-700 uppercase tracking-wider text-[10px]">
                  Prepared By (Operator)
                </span>
              </div>
              <div>
                <div className="border-b border-slate-800 h-10 mb-1" />
                <span className="font-bold text-slate-700 uppercase tracking-wider text-[10px]">
                  Verified By (Store In-Charge)
                </span>
              </div>
              <div>
                <div className="border-b border-slate-800 h-10 mb-1" />
                <span className="font-bold text-slate-700 uppercase tracking-wider text-[10px]">
                  Approved By (Plant Supervisor)
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
