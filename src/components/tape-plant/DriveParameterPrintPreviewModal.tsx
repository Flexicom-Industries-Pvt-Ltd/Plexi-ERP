"use client";

import React from "react";
import {
  X,
  Printer,
  FileSpreadsheet,
  Gauge,
  CheckCircle,
} from "lucide-react";
import { DriveParameterReading } from "./ProcessDriveParameterSection";
import {
  printTapePlantDriveSheet,
  DriveParameterPrintData,
} from "@/lib/tape-plant/print-drive-parameter-sheet";
import { exportTapePlantDriveExcel } from "@/lib/tape-plant/drive-parameter-export";
import { toast } from "sonner";

interface DriveParameterPrintPreviewModalProps {
  open: boolean;
  onClose: () => void;
  date: string;
  shiftName: string;
  operatorName?: string;
  status?: string;
  records: DriveParameterReading[];
}

function parseNum(val: number | string | undefined | null): number | null {
  if (val === undefined || val === null || val === "") return null;
  const n = Number(val);
  return isNaN(n) ? null : n;
}

function calcAvg(arr: (number | string | undefined | null)[]): string {
  const nums = arr.map(parseNum).filter((n): n is number => n !== null);
  if (nums.length === 0) return "—";
  const sum = nums.reduce((a, b) => a + b, 0);
  return (sum / nums.length).toFixed(1);
}

export function DriveParameterPrintPreviewModal({
  open,
  onClose,
  date,
  shiftName,
  operatorName,
  status = "SAVED",
  records,
}: DriveParameterPrintPreviewModalProps) {
  if (!open) return null;

  const docDate = (date || new Date().toISOString().slice(0, 10)).replace(/-/g, "");
  const docRef = `TP-DRIVE-${docDate}-${(shiftName || "SHIFT").toUpperCase().replace(/\s+/g, "")}`;

  // KPI Metrics
  const avgExtruderRpm = calcAvg(records.map((r) => r.extruderRpm));
  const avgMeltPumpRpm = calcAvg(records.map((r) => r.meltPumpRpm));
  const avgNipRollMpm = calcAvg(records.map((r) => r.nipRollMpm));
  const avgStretchRatio = calcAvg(records.map((r) => r.stretchingRatio));
  const avgWaterBath = calcAvg(records.map((r) => r.waterBath));
  const avgDenier = calcAvg(records.map((r) => r.denier));
  const avgStrength = calcAvg(records.map((r) => r.strength));

  // Column Averages for table footer
  const avgTakeUp = calcAvg(records.map((r) => r.takeUpMpm));
  const avgIsu = calcAvg(records.map((r) => r.isuMpm));
  const avgPau = calcAvg(records.map((r) => r.pauMpm));
  const avgStretching = calcAvg(records.map((r) => r.stretchingMpm));
  const avgAnnealing = calcAvg(records.map((r) => r.annealingMpm));
  const avgP1 = calcAvg(records.map((r) => r.meltPressureP1));
  const avgP2 = calcAvg(records.map((r) => r.meltPressureP2));
  const avgP3 = calcAvg(records.map((r) => r.meltPressureP3));
  const avgTapeWidth = calcAvg(records.map((r) => r.tapeWidth));
  const avgElo = calcAvg(records.map((r) => r.eloPercent));
  const avgSpacer = calcAvg(records.map((r) => r.spacerWidth));
  const avgTapeCount = calcAvg(records.map((r) => r.numberOfTape));

  const handlePrint = () => {
    try {
      printTapePlantDriveSheet({
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
      exportTapePlantDriveExcel({
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
      <div className="flex flex-col bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-6xl max-h-[92vh] shadow-2xl overflow-hidden">
        {/* Top Action Header */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-slate-900/90 border-b border-slate-800 text-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-xl border border-indigo-500/20">
              <Gauge className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-bold text-white">
                  Tape Plant Process Drive Preview
                </h3>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  {status}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {shiftName} • {date} • {records.length} Time Slots Logged
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
          <div className="bg-white text-slate-900 rounded-xl p-5 sm:p-8 shadow-xl max-w-5xl mx-auto border border-slate-200 text-xs">
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
                    Tape Plant Extrusion &amp; Winding Division • Kathua Industrial Complex, Phase-II, Kathua (J&amp;K)
                  </p>
                  <div className="mt-2">
                    <span className="inline-block border border-slate-900 px-4 py-1 text-xs font-extrabold tracking-wider uppercase bg-white">
                      TAPE PLANT PROCESS DRIVE PARAMETERS SHEET
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
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-center">
                <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                  Total Time Slots
                </div>
                <div className="text-base sm:text-lg font-black text-slate-900 mt-1">
                  {records.length} Slots
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">
                  {shiftName} Coverage
                </div>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-center">
                <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                  Avg Extruder Speed
                </div>
                <div className="text-base sm:text-lg font-black text-slate-900 mt-1">
                  {avgExtruderRpm !== "—" ? `${avgExtruderRpm} RPM` : "—"}
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">
                  Melt Pump: {avgMeltPumpRpm !== "—" ? `${avgMeltPumpRpm} RPM` : "—"}
                </div>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-center">
                <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                  Avg Nip Roll Speed
                </div>
                <div className="text-base sm:text-lg font-black text-slate-900 mt-1">
                  {avgNipRollMpm !== "—" ? `${avgNipRollMpm} MPM` : "—"}
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">
                  Stretch Ratio: {avgStretchRatio}
                </div>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-center">
                <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                  Avg Tape Denier &amp; Strength
                </div>
                <div className="text-base sm:text-lg font-black text-slate-900 mt-1">
                  {avgDenier !== "—" ? `${avgDenier} D` : "—"}
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">
                  Strength: {avgStrength !== "—" ? `${avgStrength} gpd` : "—"} | Bath: {avgWaterBath !== "—" ? `${avgWaterBath}°C` : "—"}
                </div>
              </div>
            </div>

            {/* Telemetry Spreadsheet Preview */}
            <div className="overflow-x-auto border border-slate-300 rounded-lg mb-6">
              <table className="w-full border-collapse text-[11px]">
                <thead>
                  {/* Super Header */}
                  <tr className="border-b border-slate-300">
                    <th rowSpan={2} className="p-2 border-r border-slate-300 bg-slate-100 font-bold text-center w-8">
                      #
                    </th>
                    <th rowSpan={2} className="p-2 border-r border-slate-300 bg-slate-100 font-bold text-center w-14">
                      Time
                    </th>
                    <th rowSpan={2} className="p-2 border-r border-slate-300 bg-slate-100 font-bold text-center w-12">
                      Photo
                    </th>
                    <th colSpan={2} className="p-1.5 border-r border-slate-300 bg-blue-100 text-blue-900 font-extrabold text-center uppercase text-[10px] tracking-wide">
                      Extruder &amp; Pump (RPM)
                    </th>
                    <th colSpan={7} className="p-1.5 border-r border-slate-300 bg-indigo-100 text-indigo-900 font-extrabold text-center uppercase text-[10px] tracking-wide">
                      Line Speeds (MPM) &amp; Stretch Ratio
                    </th>
                    <th colSpan={4} className="p-1.5 border-r border-slate-300 bg-amber-100 text-amber-900 font-extrabold text-center uppercase text-[10px] tracking-wide">
                      Pressures (bar) &amp; Bath
                    </th>
                    <th colSpan={7} className="p-1.5 bg-slate-200 text-slate-800 font-extrabold text-center uppercase text-[10px] tracking-wide">
                      Tape Specifications
                    </th>
                  </tr>
                  {/* Sub Header */}
                  <tr className="border-b border-slate-300 text-[10px] font-bold text-slate-700 bg-slate-50">
                    <th className="p-1.5 border-r border-slate-300 text-right bg-blue-50/70">Extruder</th>
                    <th className="p-1.5 border-r border-slate-300 text-right bg-blue-50/70">Melt Pump</th>

                    <th className="p-1.5 border-r border-slate-300 text-right bg-indigo-50/70">Take-Up</th>
                    <th className="p-1.5 border-r border-slate-300 text-right bg-indigo-50/70">Nip Roll</th>
                    <th className="p-1.5 border-r border-slate-300 text-right bg-indigo-50/70">ISU</th>
                    <th className="p-1.5 border-r border-slate-300 text-right bg-indigo-50/70">PAU</th>
                    <th className="p-1.5 border-r border-slate-300 text-right bg-indigo-50/70">Stretch</th>
                    <th className="p-1.5 border-r border-slate-300 text-right bg-indigo-50/70">Anneal</th>
                    <th className="p-1.5 border-r border-slate-300 text-right bg-indigo-100 font-extrabold text-slate-900">Ratio</th>

                    <th className="p-1.5 border-r border-slate-300 text-right bg-amber-50/70">P1</th>
                    <th className="p-1.5 border-r border-slate-300 text-right bg-amber-50/70">P2</th>
                    <th className="p-1.5 border-r border-slate-300 text-right bg-amber-50/70">P3</th>
                    <th className="p-1.5 border-r border-slate-300 text-right bg-amber-50/70">Bath °C</th>

                    <th className="p-1.5 border-r border-slate-300 text-center bg-slate-100">Colour</th>
                    <th className="p-1.5 border-r border-slate-300 text-right bg-slate-100">Denier</th>
                    <th className="p-1.5 border-r border-slate-300 text-right bg-slate-100">Width</th>
                    <th className="p-1.5 border-r border-slate-300 text-right bg-slate-100">Strength</th>
                    <th className="p-1.5 border-r border-slate-300 text-right bg-slate-100">ELO %</th>
                    <th className="p-1.5 border-r border-slate-300 text-right bg-slate-100">Spacer</th>
                    <th className="p-1.5 text-right bg-slate-100">Tapes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {records.length === 0 ? (
                    <tr>
                      <td colSpan={23} className="p-8 text-center text-slate-400 font-medium">
                        No drive parameter readings recorded for this shift.
                      </td>
                    </tr>
                  ) : (
                    records.map((r, i) => (
                      <tr key={i} className={i % 2 === 1 ? "bg-slate-50/50" : "bg-white"}>
                        <td className="p-1.5 border-r border-slate-200 text-center font-bold text-slate-700">
                          {i + 1}
                        </td>
                        <td className="p-1.5 border-r border-slate-200 text-center font-mono font-bold text-slate-900">
                          {r.time || "—"}
                        </td>
                        <td className="p-1.5 border-r border-slate-200 text-center">
                          {r.photoUrl ? (
                            <span className="inline-block px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-100 text-emerald-800">
                              YES
                            </span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                        <td className="p-1.5 border-r border-slate-200 text-right font-mono">{r.extruderRpm || "—"}</td>
                        <td className="p-1.5 border-r border-slate-200 text-right font-mono">{r.meltPumpRpm || "—"}</td>
                        <td className="p-1.5 border-r border-slate-200 text-right font-mono">{r.takeUpMpm || "—"}</td>
                        <td className="p-1.5 border-r border-slate-200 text-right font-mono font-bold text-slate-900">{r.nipRollMpm || "—"}</td>
                        <td className="p-1.5 border-r border-slate-200 text-right font-mono">{r.isuMpm || "—"}</td>
                        <td className="p-1.5 border-r border-slate-200 text-right font-mono">{r.pauMpm || "—"}</td>
                        <td className="p-1.5 border-r border-slate-200 text-right font-mono">{r.stretchingMpm || "—"}</td>
                        <td className="p-1.5 border-r border-slate-200 text-right font-mono">{r.annealingMpm || "—"}</td>
                        <td className="p-1.5 border-r border-slate-200 text-right font-mono font-bold bg-indigo-50/50 text-indigo-950">{r.stretchingRatio || "—"}</td>
                        <td className="p-1.5 border-r border-slate-200 text-right font-mono">{r.meltPressureP1 || "—"}</td>
                        <td className="p-1.5 border-r border-slate-200 text-right font-mono">{r.meltPressureP2 || "—"}</td>
                        <td className="p-1.5 border-r border-slate-200 text-right font-mono">{r.meltPressureP3 || "—"}</td>
                        <td className="p-1.5 border-r border-slate-200 text-right font-mono">{r.waterBath || "—"}</td>
                        <td className="p-1.5 border-r border-slate-200 text-center font-medium">{r.colour || "—"}</td>
                        <td className="p-1.5 border-r border-slate-200 text-right font-mono font-bold text-slate-900">{r.denier || "—"}</td>
                        <td className="p-1.5 border-r border-slate-200 text-right font-mono">{r.tapeWidth || "—"}</td>
                        <td className="p-1.5 border-r border-slate-200 text-right font-mono">{r.strength || "—"}</td>
                        <td className="p-1.5 border-r border-slate-200 text-right font-mono">{r.eloPercent || "—"}</td>
                        <td className="p-1.5 border-r border-slate-200 text-right font-mono">{r.spacerWidth || "—"}</td>
                        <td className="p-1.5 text-right font-mono">{r.numberOfTape || "—"}</td>
                      </tr>
                    ))
                  )}

                  {/* Average Summary Footer */}
                  <tr className="bg-slate-100 border-t-2 border-slate-900 font-extrabold text-[11px]">
                    <td colSpan={3} className="p-2 border-r border-slate-300 text-center uppercase tracking-wider bg-slate-200">
                      Average
                    </td>
                    <td className="p-1.5 border-r border-slate-300 text-right font-mono">{avgExtruderRpm}</td>
                    <td className="p-1.5 border-r border-slate-300 text-right font-mono">{avgMeltPumpRpm}</td>
                    <td className="p-1.5 border-r border-slate-300 text-right font-mono">{avgTakeUp}</td>
                    <td className="p-1.5 border-r border-slate-300 text-right font-mono font-black">{avgNipRollMpm}</td>
                    <td className="p-1.5 border-r border-slate-300 text-right font-mono">{avgIsu}</td>
                    <td className="p-1.5 border-r border-slate-300 text-right font-mono">{avgPau}</td>
                    <td className="p-1.5 border-r border-slate-300 text-right font-mono">{avgStretching}</td>
                    <td className="p-1.5 border-r border-slate-300 text-right font-mono">{avgAnnealing}</td>
                    <td className="p-1.5 border-r border-slate-300 text-right font-mono font-black bg-indigo-100">{avgStretchRatio}</td>
                    <td className="p-1.5 border-r border-slate-300 text-right font-mono">{avgP1}</td>
                    <td className="p-1.5 border-r border-slate-300 text-right font-mono">{avgP2}</td>
                    <td className="p-1.5 border-r border-slate-300 text-right font-mono">{avgP3}</td>
                    <td className="p-1.5 border-r border-slate-300 text-right font-mono">{avgWaterBath}</td>
                    <td className="p-1.5 border-r border-slate-300 text-center">—</td>
                    <td className="p-1.5 border-r border-slate-300 text-right font-mono font-black">{avgDenier}</td>
                    <td className="p-1.5 border-r border-slate-300 text-right font-mono">{avgTapeWidth}</td>
                    <td className="p-1.5 border-r border-slate-300 text-right font-mono">{avgStrength}</td>
                    <td className="p-1.5 border-r border-slate-300 text-right font-mono">{avgElo}</td>
                    <td className="p-1.5 border-r border-slate-300 text-right font-mono">{avgSpacer}</td>
                    <td className="p-1.5 text-right font-mono">{avgTapeCount}</td>
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
                  Verified By (Quality Control)
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
