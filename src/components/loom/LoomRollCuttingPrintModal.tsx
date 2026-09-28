"use client";

import React from "react";
import {
  X,
  Printer,
  FileSpreadsheet,
  FileText,
  CheckCircle2,
} from "lucide-react";
import {
  LoomRollCuttingEntryItem,
  LoomRollCuttingReportData,
  RollCuttingKpis,
} from "@/lib/loom/loom-roll-cutting-types";
import { exportLoomRollCuttingExcel } from "@/lib/loom/loom-roll-cutting-export";
import { printLoomRollCutting } from "@/lib/loom/print-loom-roll-cutting";

interface LoomRollCuttingPrintModalProps {
  open: boolean;
  onClose: () => void;
  report: LoomRollCuttingReportData;
  entries: LoomRollCuttingEntryItem[];
  kpis?: RollCuttingKpis;
}

export function LoomRollCuttingPrintModal({
  open,
  onClose,
  report,
  entries,
  kpis,
}: LoomRollCuttingPrintModalProps) {
  if (!open) return null;

  const totalMeters = entries.reduce((s, e) => s + (e.meter || 0), 0);
  const totalGross = entries.reduce((s, e) => s + (e.grossWeightKg || 0), 0);
  const totalTare = entries.reduce((s, e) => s + (e.tareWeightKg || 1.2), 0);
  const totalNett = entries.reduce((s, e) => s + (e.nettWeightKg || 0), 0);
  const overallAvg = totalMeters > 0 && totalNett > 0 ? Math.round(((totalNett * 1000) / totalMeters) * 10) / 10 : 0;

  const handlePrint = () => {
    printLoomRollCutting({ report, entries, kpis });
  };

  const handleExportExcel = () => {
    exportLoomRollCuttingExcel({ report, entries, kpis });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-card w-full max-w-6xl max-h-[92vh] flex flex-col rounded-xl border shadow-2xl overflow-hidden">
        {/* Top Action Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b bg-muted/40">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-base text-foreground flex items-center gap-2">
                Daily Loom Roll Cutting Report — Print Preview
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20">
                  {entries.length} Rolls
                </span>
              </h3>
              <p className="text-xs text-muted-foreground">
                Document Ref: RC-{(report.date || "").replace(/-/g, "")}-{report.shiftName?.slice(0, 3).toUpperCase() || "SHT"} • Shift: {report.shiftName}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportExcel}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-colors cursor-pointer shadow-xs"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              Export Excel (.xlsx)
            </button>
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground transition-colors cursor-pointer shadow-xs"
            >
              <Printer className="w-3.5 h-3.5" />
              Print Report (A4)
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable A4 Document Sheet View */}
        <div className="flex-1 overflow-auto p-4 sm:p-6 bg-muted/20">
          <div className="bg-card text-card-foreground border shadow-sm rounded-lg p-6 max-w-5xl mx-auto text-xs font-sans">
            {/* Header Title */}
            <div className="border-b-2 border-primary/40 pb-4 mb-4 flex justify-between items-end">
              <div>
                <h1 className="text-xl font-extrabold uppercase tracking-wide text-foreground">
                  FLEXICOM INDUSTRIES PVT. LTD.
                </h1>
                <h2 className="text-sm font-bold tracking-wider text-sky-600 dark:text-sky-400 uppercase mt-0.5">
                  DAILY LOOM ROLL CUTTING REPORT
                </h2>
              </div>
              <div className="text-right text-[11px] text-muted-foreground">
                <div>Date: <strong className="text-foreground">{report.date || "—"}</strong></div>
                <div>Shift: <strong className="text-foreground">{report.shiftName || "—"}</strong></div>
              </div>
            </div>

            {/* Meta details bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-muted/50 p-3 rounded-lg border mb-4 text-xs">
              <div>
                <span className="text-muted-foreground text-[10px] uppercase font-bold block">Supervisor</span>
                <span className="font-semibold text-foreground">{report.supervisorName || report.preparedBy || "—"}</span>
              </div>
              <div>
                <span className="text-muted-foreground text-[10px] uppercase font-bold block">Total Rolls Cut</span>
                <span className="font-semibold text-foreground">{entries.length}</span>
              </div>
              <div>
                <span className="text-muted-foreground text-[10px] uppercase font-bold block">Total Cut Length</span>
                <span className="font-semibold text-foreground font-mono">{totalMeters.toLocaleString()} m</span>
              </div>
              <div>
                <span className="text-muted-foreground text-[10px] uppercase font-bold block">Total Nett Weight</span>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400 font-mono">{totalNett.toFixed(2)} kg</span>
              </div>
            </div>

            {/* Main Table */}
            <div className="border rounded-md overflow-hidden">
              <table className="w-full text-[11px] text-left border-collapse">
                <thead>
                  <tr className="bg-muted/80 border-b text-[10px] font-bold uppercase tracking-wider text-foreground">
                    <th className="p-2 text-center border-r w-10">S.No.</th>
                    <th className="p-2 border-r font-mono">Roll No.</th>
                    <th className="p-2 border-r text-center">Loom #</th>
                    <th className="p-2 border-r text-center">Size</th>
                    <th className="p-2 border-r">Quality</th>
                    <th className="p-2 border-r text-right font-mono">Init Rdg</th>
                    <th className="p-2 border-r text-right font-mono">Final Rdg</th>
                    <th className="p-2 border-r text-right font-mono font-bold bg-muted/90">Meter</th>
                    <th className="p-2 border-r text-right font-mono">Gross (kg)</th>
                    <th className="p-2 border-r text-right font-mono text-muted-foreground">Tare (kg)</th>
                    <th className="p-2 border-r text-right font-mono font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/5">Nett (kg)</th>
                    <th className="p-2 border-r text-right font-mono text-purple-600 dark:text-purple-400">Avg (g/m)</th>
                    <th className="p-2 border-r text-center">Sup. Sign</th>
                    <th className="p-2">Remarks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {entries.length > 0 ? (
                    entries.map((entry, idx) => (
                      <tr key={entry.id || idx} className="hover:bg-muted/30">
                        <td className="p-2 text-center border-r font-bold text-muted-foreground">{idx + 1}</td>
                        <td className="p-2 border-r font-mono font-bold text-foreground bg-muted/10">{entry.rollNumber}</td>
                        <td className="p-2 border-r text-center font-bold text-sky-600 dark:text-sky-400">#{entry.loomNumber}</td>
                        <td className="p-2 border-r text-center text-muted-foreground">{entry.size || "—"}</td>
                        <td className="p-2 border-r font-medium text-foreground">{entry.qualityType}</td>
                        <td className="p-2 border-r text-right font-mono text-muted-foreground">
                          {entry.initialReading !== undefined && entry.initialReading !== null ? Number(entry.initialReading).toLocaleString() : "—"}
                        </td>
                        <td className="p-2 border-r text-right font-mono text-muted-foreground">
                          {entry.finalReading !== undefined && entry.finalReading !== null ? Number(entry.finalReading).toLocaleString() : "—"}
                        </td>
                        <td className="p-2 border-r text-right font-mono font-bold text-foreground bg-muted/20">
                          {entry.meter !== undefined && entry.meter !== null ? Number(entry.meter).toLocaleString() : "0"}
                        </td>
                        <td className="p-2 border-r text-right font-mono">{entry.grossWeightKg?.toFixed(2) || "0.00"}</td>
                        <td className="p-2 border-r text-right font-mono text-muted-foreground">{entry.tareWeightKg?.toFixed(2) || "1.20"}</td>
                        <td className="p-2 border-r text-right font-mono font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/5">
                          {entry.nettWeightKg?.toFixed(2) || "0.00"}
                        </td>
                        <td className="p-2 border-r text-right font-mono font-semibold text-purple-600 dark:text-purple-400">
                          {entry.avgWeightPerMeter?.toFixed(1) || "0.0"}
                        </td>
                        <td className="p-2 border-r text-center text-muted-foreground text-[10px]">
                          {entry.supervisorSign || report.supervisorName || "—"}
                        </td>
                        <td className="p-2 text-muted-foreground text-[10px]">{entry.remarks || "—"}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={14} className="p-6 text-center text-muted-foreground italic">
                        No roll cutting records logged yet.
                      </td>
                    </tr>
                  )}
                </tbody>
                <tfoot>
                  <tr className="bg-muted font-bold border-t-2 border-foreground/20">
                    <td className="p-2 text-center border-r font-bold">TOTAL</td>
                    <td className="p-2 border-r font-mono">{entries.length} Rolls</td>
                    <td className="p-2 border-r"></td>
                    <td className="p-2 border-r"></td>
                    <td className="p-2 border-r"></td>
                    <td className="p-2 border-r"></td>
                    <td className="p-2 border-r"></td>
                    <td className="p-2 border-r text-right font-mono font-bold">{totalMeters.toLocaleString()}</td>
                    <td className="p-2 border-r text-right font-mono">{totalGross.toFixed(2)}</td>
                    <td className="p-2 border-r text-right font-mono">{totalTare.toFixed(2)}</td>
                    <td className="p-2 border-r text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">{totalNett.toFixed(2)}</td>
                    <td className="p-2 border-r text-right font-mono text-purple-600 dark:text-purple-400">{overallAvg.toFixed(1)}</td>
                    <td className="p-2 border-r"></td>
                    <td className="p-2"></td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Floor sign-off blocks */}
            <div className="grid grid-cols-4 gap-4 mt-8 pt-4 border-t text-center text-[10px] text-muted-foreground font-semibold uppercase">
              <div className="border-t pt-2">Loom Operator</div>
              <div className="border-t pt-2">Shift Supervisor</div>
              <div className="border-t pt-2">Quality Control</div>
              <div className="border-t pt-2">Factory Manager</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
