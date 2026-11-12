"use client";

import React from "react";
import {
  X,
  Printer,
  FileSpreadsheet,
  FileText,
  CheckCircle,
} from "lucide-react";
import { TemperatureReading } from "./ProcessTemperatureSection";
import {
  printTapePlantTemperatureSheet,
  TemperaturePrintData,
} from "@/lib/tape-plant/print-temperature-sheet";
import { exportTapePlantTemperatureExcel } from "@/lib/tape-plant/temperature-export";
import { toast } from "sonner";

interface TemperaturePrintPreviewModalProps {
  open: boolean;
  onClose: () => void;
  date: string;
  shiftName: string;
  operatorName?: string;
  status?: string;
  readings: TemperatureReading[];
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

export function TemperaturePrintPreviewModal({
  open,
  onClose,
  date,
  shiftName,
  operatorName,
  status = "SAVED",
  readings,
}: TemperaturePrintPreviewModalProps) {
  if (!open) return null;

  const docDate = (date || new Date().toISOString().slice(0, 10)).replace(/-/g, "");
  const docRef = `TP-TEMP-${docDate}-${(shiftName || "SHIFT").toUpperCase().replace(/\s+/g, "")}`;

  const allBarrelTemps: (number | string)[] = [];
  const allDieTemps: (number | string)[] = [];
  const allMeltTemps: (number | string)[] = [];

  readings.forEach((r) => {
    ["b1", "b2", "b3", "b4", "b5", "b6", "b7"].forEach((k) => {
      const v = (r as any)[k];
      if (v !== "" && v !== undefined && v !== null) allBarrelTemps.push(v);
    });
    ["d1", "d2", "d3", "d4", "d5", "d6", "d7"].forEach((k) => {
      const v = (r as any)[k];
      if (v !== "" && v !== undefined && v !== null) allDieTemps.push(v);
    });
    if (r.meltTemp !== "" && r.meltTemp !== undefined && r.meltTemp !== null) {
      allMeltTemps.push(r.meltTemp);
    }
  });

  const avgBarrel = calcAvg(allBarrelTemps);
  const avgDie = calcAvg(allDieTemps);
  const avgMelt = calcAvg(allMeltTemps);

  // Column Averages
  const avgB1 = calcAvg(readings.map((r) => r.b1));
  const avgB2 = calcAvg(readings.map((r) => r.b2));
  const avgB3 = calcAvg(readings.map((r) => r.b3));
  const avgB4 = calcAvg(readings.map((r) => r.b4));
  const avgB5 = calcAvg(readings.map((r) => r.b5));
  const avgB6 = calcAvg(readings.map((r) => r.b6));
  const avgB7 = calcAvg(readings.map((r) => r.b7));

  const avgScreen = calcAvg(readings.map((r) => r.screenChanger));
  const avgAd1 = calcAvg(readings.map((r) => r.ad1));
  const avgAd2 = calcAvg(readings.map((r) => r.ad2));
  const avgMeltPump = calcAvg(readings.map((r) => r.meltPump));

  const avgD1 = calcAvg(readings.map((r) => r.d1));
  const avgD2 = calcAvg(readings.map((r) => r.d2));
  const avgD3 = calcAvg(readings.map((r) => r.d3));
  const avgD4 = calcAvg(readings.map((r) => r.d4));
  const avgD5 = calcAvg(readings.map((r) => r.d5));
  const avgD6 = calcAvg(readings.map((r) => r.d6));
  const avgD7 = calcAvg(readings.map((r) => r.d7));

  const avgH1 = calcAvg(readings.map((r) => r.h1));
  const avgH2 = calcAvg(readings.map((r) => r.h2));
  const avgHotAir = calcAvg(readings.map((r) => r.hotAirTemp));

  const printData: TemperaturePrintData = {
    date,
    shiftName,
    operatorName,
    status,
    readings,
  };

  const handleDirectPrint = () => {
    printTapePlantTemperatureSheet(printData);
  };

  const handleExportExcel = () => {
    try {
      exportTapePlantTemperatureExcel(printData);
      toast.success("Excel report exported successfully");
    } catch (err) {
      console.error("Export error:", err);
      toast.error("Failed to export Excel report");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/75 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-300 w-full max-w-6xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Top Control Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 bg-slate-900 text-white border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 text-white rounded-lg">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-bold text-white tracking-tight">
                  Tape Plant Process Temperature Preview
                </h2>
                <span
                  className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-sm border ${
                    status === "SUBMITTED"
                      ? "bg-emerald-900/40 text-emerald-300 border-emerald-500/40"
                      : "bg-amber-900/40 text-amber-300 border-amber-500/40"
                  }`}
                >
                  {status}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {shiftName} • {date} • {readings.length} Time Slot(s) •{" "}
                <span className="font-mono text-white font-bold">
                  Operator: {operatorName || "Unassigned"}
                </span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportExcel}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-semibold rounded-md shadow-xs transition-colors cursor-pointer"
            >
              <FileSpreadsheet className="h-4 w-4" />
              <span>Export Excel</span>
            </button>

            <button
              type="button"
              onClick={handleDirectPrint}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-md shadow-xs transition-colors cursor-pointer"
            >
              <Printer className="h-4 w-4" />
              <span>Print Sheet</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              title="Close preview"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Preview Canvas */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-100">
          <div className="max-w-5xl mx-auto bg-white p-6 sm:p-8 rounded-lg shadow-sm border border-slate-300 text-slate-900 space-y-5">
            {/* Main Header with Top-Left Corner Vivid Flexicom Logo */}
            <div className="border-b-2 border-slate-900 pb-3 text-center">
              <div className="flex items-center justify-between gap-2 sm:gap-4">
                {/* Top-Left Corner Logo - Bigger and Vivid */}
                <div className="w-16 sm:w-24 text-left shrink-0 flex items-center">
                  <img
                    src="/logo.png"
                    alt="Flexicom Logo"
                    className="h-12 sm:h-16 w-auto object-contain shrink-0 filter contrast-125 saturate-125 drop-shadow-sm"
                  />
                </div>

                {/* Centered Document Header */}
                <div className="flex-1 text-center space-y-1">
                  <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight uppercase">
                    Flexicom Industries Pvt. Ltd.
                  </h1>
                  <p className="text-[11px] sm:text-xs font-semibold text-slate-600">
                    Tape Plant Extrusion &amp; Winding Division • Kathua Industrial Complex, Phase-II, Kathua (J&amp;K)
                  </p>
                  <div>
                    <div className="inline-block my-0.5 px-3 py-0.5 bg-slate-100 text-slate-900 font-extrabold text-xs uppercase tracking-wider border border-slate-400">
                      Tape Plant Process Temperature Plan
                    </div>
                  </div>
                </div>

                {/* Right Balance Spacer */}
                <div className="w-16 sm:w-24 shrink-0 hidden sm:block" aria-hidden="true" />
              </div>

              {/* Meta strip */}
              <div className="flex flex-wrap items-center justify-center gap-3 text-xs text-slate-600 pt-1">
                <span>Doc Ref: <strong className="text-slate-900 font-mono">{docRef}</strong></span>
                <span>•</span>
                <span>Date: <strong className="text-slate-900">{date}</strong></span>
                <span>•</span>
                <span>Shift: <strong className="text-slate-900">{shiftName}</strong></span>
                <span>•</span>
                <span>Operator: <strong className="text-slate-900">{operatorName || "Unassigned"}</strong></span>
                <span>•</span>
                <span>Status: <strong className="text-slate-900">{status}</strong></span>
              </div>
            </div>

            {/* Key Metrics Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-slate-50 p-2.5 rounded border border-slate-300 text-xs text-center">
              <div className="border-r border-slate-200 last:border-0 pr-2">
                <span className="text-slate-500 block text-[10px] uppercase font-bold tracking-wider">
                  Total Time Slots
                </span>
                <span className="text-base font-black font-mono text-slate-900">
                  {readings.length} <span className="text-xs font-normal">Slots</span>
                </span>
              </div>
              <div className="border-r border-slate-200 last:border-0 pr-2">
                <span className="text-slate-500 block text-[10px] uppercase font-bold tracking-wider">
                  Avg Barrel (B1-B7)
                </span>
                <span className="text-base font-black font-mono text-slate-900">
                  {avgBarrel !== "—" ? `${avgBarrel} °C` : "—"}
                </span>
              </div>
              <div className="border-r border-slate-200 last:border-0 pr-2">
                <span className="text-slate-500 block text-[10px] uppercase font-bold tracking-wider">
                  Avg Die (D1-D7)
                </span>
                <span className="text-base font-black font-mono text-slate-900">
                  {avgDie !== "—" ? `${avgDie} °C` : "—"}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px] uppercase font-bold tracking-wider">
                  Approval Status
                </span>
                <span className="text-xs font-bold text-slate-800">
                  {status}
                </span>
              </div>
            </div>

            {/* Box 1: TEMPERATURE TELEMETRY READINGS */}
            <div className="space-y-1.5">
              <div className="bg-slate-200 border border-slate-300 border-b-0 py-1 px-3 text-center">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-900">
                  1. EXTRUDER &amp; DIE ZONE TEMPERATURE TELEMETRY
                </h3>
              </div>

              <div className="overflow-x-auto border border-slate-300 rounded-b">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-slate-900 text-[10px] font-bold uppercase tracking-wider border-b border-slate-300">
                      <th rowSpan={2} className="p-1.5 border-r border-slate-300 text-center w-8">#</th>
                      <th rowSpan={2} className="p-1.5 border-r border-slate-300 text-center w-14">Time</th>
                      <th rowSpan={2} className="p-1.5 border-r border-slate-300 text-center w-12">Photo</th>
                      <th colSpan={7} className="p-1 border-r border-slate-300 text-center font-bold">
                        Barrel Zone (°C)
                      </th>
                      <th colSpan={4} className="p-1 border-r border-slate-300 text-center font-bold">
                        Adaptor (°C)
                      </th>
                      <th colSpan={7} className="p-1 border-r border-slate-300 text-center font-bold">
                        Die Zone (°C)
                      </th>
                      <th rowSpan={2} className="p-1 border-r border-slate-300 text-right font-bold w-14">
                        Melt T.
                      </th>
                      <th colSpan={2} className="p-1 border-r border-slate-300 text-center font-bold">
                        Cooling (°C)
                      </th>
                      <th rowSpan={2} className="p-1 text-right font-bold w-14">
                        Hot Air
                      </th>
                    </tr>
                    <tr className="bg-slate-50 text-slate-600 text-[9px] font-bold uppercase tracking-wider border-b border-slate-300">
                      <th className="p-1 border-r border-slate-200 text-right">B1</th>
                      <th className="p-1 border-r border-slate-200 text-right">B2</th>
                      <th className="p-1 border-r border-slate-200 text-right">B3</th>
                      <th className="p-1 border-r border-slate-200 text-right">B4</th>
                      <th className="p-1 border-r border-slate-200 text-right">B5</th>
                      <th className="p-1 border-r border-slate-200 text-right">B6</th>
                      <th className="p-1 border-r border-slate-300 text-right">B7</th>

                      <th className="p-1 border-r border-slate-200 text-right">Scr.Chg</th>
                      <th className="p-1 border-r border-slate-200 text-right">AD-1</th>
                      <th className="p-1 border-r border-slate-200 text-right">AD-2</th>
                      <th className="p-1 border-r border-slate-300 text-right">Melt.P</th>

                      <th className="p-1 border-r border-slate-200 text-right">D-1</th>
                      <th className="p-1 border-r border-slate-200 text-right">D-2</th>
                      <th className="p-1 border-r border-slate-200 text-right">D-3</th>
                      <th className="p-1 border-r border-slate-200 text-right">D-4</th>
                      <th className="p-1 border-r border-slate-200 text-right">D-5</th>
                      <th className="p-1 border-r border-slate-200 text-right">D-6</th>
                      <th className="p-1 border-r border-slate-300 text-right">D-7</th>

                      <th className="p-1 border-r border-slate-200 text-right">H1</th>
                      <th className="p-1 border-r border-slate-300 text-right">H2</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {readings.map((r, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="p-1.5 border-r border-slate-200 text-center font-bold text-slate-500">
                          {idx + 1}
                        </td>
                        <td className="p-1.5 border-r border-slate-200 text-center font-mono font-bold text-slate-900">
                          {r.time || "—"}
                        </td>
                        <td className="p-1.5 border-r border-slate-200 text-center text-[10px]">
                          {r.photoUrl ? (
                            <span className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold">
                              <CheckCircle className="h-2.5 w-2.5 text-emerald-600" />
                              <span>YES</span>
                            </span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                        <td className="p-1.5 border-r border-slate-200 text-right font-mono">{r.b1 !== "" ? r.b1 : "—"}</td>
                        <td className="p-1.5 border-r border-slate-200 text-right font-mono">{r.b2 !== "" ? r.b2 : "—"}</td>
                        <td className="p-1.5 border-r border-slate-200 text-right font-mono">{r.b3 !== "" ? r.b3 : "—"}</td>
                        <td className="p-1.5 border-r border-slate-200 text-right font-mono">{r.b4 !== "" ? r.b4 : "—"}</td>
                        <td className="p-1.5 border-r border-slate-200 text-right font-mono">{r.b5 !== "" ? r.b5 : "—"}</td>
                        <td className="p-1.5 border-r border-slate-200 text-right font-mono">{r.b6 !== "" ? r.b6 : "—"}</td>
                        <td className="p-1.5 border-r border-slate-300 text-right font-mono">{r.b7 !== "" ? r.b7 : "—"}</td>

                        <td className="p-1.5 border-r border-slate-200 text-right font-mono">{r.screenChanger !== "" ? r.screenChanger : "—"}</td>
                        <td className="p-1.5 border-r border-slate-200 text-right font-mono">{r.ad1 !== "" ? r.ad1 : "—"}</td>
                        <td className="p-1.5 border-r border-slate-200 text-right font-mono">{r.ad2 !== "" ? r.ad2 : "—"}</td>
                        <td className="p-1.5 border-r border-slate-300 text-right font-mono">{r.meltPump !== "" ? r.meltPump : "—"}</td>

                        <td className="p-1.5 border-r border-slate-200 text-right font-mono">{r.d1 !== "" ? r.d1 : "—"}</td>
                        <td className="p-1.5 border-r border-slate-200 text-right font-mono">{r.d2 !== "" ? r.d2 : "—"}</td>
                        <td className="p-1.5 border-r border-slate-200 text-right font-mono">{r.d3 !== "" ? r.d3 : "—"}</td>
                        <td className="p-1.5 border-r border-slate-200 text-right font-mono">{r.d4 !== "" ? r.d4 : "—"}</td>
                        <td className="p-1.5 border-r border-slate-200 text-right font-mono">{r.d5 !== "" ? r.d5 : "—"}</td>
                        <td className="p-1.5 border-r border-slate-200 text-right font-mono">{r.d6 !== "" ? r.d6 : "—"}</td>
                        <td className="p-1.5 border-r border-slate-300 text-right font-mono">{r.d7 !== "" ? r.d7 : "—"}</td>

                        <td className="p-1.5 border-r border-slate-300 text-right font-mono font-bold text-slate-900 bg-slate-50">
                          {r.meltTemp !== "" ? r.meltTemp : "—"}
                        </td>

                        <td className="p-1.5 border-r border-slate-200 text-right font-mono">{r.h1 !== "" ? r.h1 : "—"}</td>
                        <td className="p-1.5 border-r border-slate-300 text-right font-mono">{r.h2 !== "" ? r.h2 : "—"}</td>
                        <td className="p-1.5 text-right font-mono font-bold text-slate-900">
                          {r.hotAirTemp !== "" ? r.hotAirTemp : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-100 font-bold border-t-2 border-slate-300 text-slate-900">
                      <td colSpan={3} className="p-2 text-right uppercase tracking-wider text-[10px]">
                        Average Telemetry (°C):
                      </td>
                      <td className="p-1.5 text-right font-mono">{avgB1}</td>
                      <td className="p-1.5 text-right font-mono">{avgB2}</td>
                      <td className="p-1.5 text-right font-mono">{avgB3}</td>
                      <td className="p-1.5 text-right font-mono">{avgB4}</td>
                      <td className="p-1.5 text-right font-mono">{avgB5}</td>
                      <td className="p-1.5 text-right font-mono">{avgB6}</td>
                      <td className="p-1.5 text-right font-mono border-r border-slate-300">{avgB7}</td>

                      <td className="p-1.5 text-right font-mono">{avgScreen}</td>
                      <td className="p-1.5 text-right font-mono">{avgAd1}</td>
                      <td className="p-1.5 text-right font-mono">{avgAd2}</td>
                      <td className="p-1.5 text-right font-mono border-r border-slate-300">{avgMeltPump}</td>

                      <td className="p-1.5 text-right font-mono">{avgD1}</td>
                      <td className="p-1.5 text-right font-mono">{avgD2}</td>
                      <td className="p-1.5 text-right font-mono">{avgD3}</td>
                      <td className="p-1.5 text-right font-mono">{avgD4}</td>
                      <td className="p-1.5 text-right font-mono">{avgD5}</td>
                      <td className="p-1.5 text-right font-mono">{avgD6}</td>
                      <td className="p-1.5 text-right font-mono border-r border-slate-300">{avgD7}</td>

                      <td className="p-1.5 text-right font-mono font-black border-r border-slate-300 bg-slate-200">
                        {avgMelt}
                      </td>

                      <td className="p-1.5 text-right font-mono">{avgH1}</td>
                      <td className="p-1.5 text-right font-mono border-r border-slate-300">{avgH2}</td>
                      <td className="p-1.5 text-right font-mono font-black bg-slate-200">
                        {avgHotAir}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Authorizations & Signatures Footer */}
            <div className="pt-4 border-t border-slate-300 grid grid-cols-3 gap-6 text-center text-xs text-slate-700">
              <div className="space-y-6">
                <div className="border-b border-slate-400 pb-1"></div>
                <span className="block font-bold uppercase tracking-wider text-[10px]">
                  Prepared By (Operator / In-Charge)
                </span>
              </div>
              <div className="space-y-6">
                <div className="border-b border-slate-400 pb-1"></div>
                <span className="block font-bold uppercase tracking-wider text-[10px]">
                  Verified By (Quality Control / Lab)
                </span>
              </div>
              <div className="space-y-6">
                <div className="border-b border-slate-400 pb-1"></div>
                <span className="block font-bold uppercase tracking-wider text-[10px]">
                  Approved By (Plant Supervisor / Manager)
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
