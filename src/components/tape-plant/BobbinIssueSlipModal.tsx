"use client";

import React from "react";
import { X, Printer, FileText, CheckCircle2, Package, Boxes, Scale } from "lucide-react";
import { BobbinIssueSlipData, printBobbinIssueSlip } from "@/lib/tape-plant/print-bobbin-issue-slip";

interface BobbinIssueSlipModalProps {
  open: boolean;
  onClose: () => void;
  data?: BobbinIssueSlipData | null;
  slipData?: BobbinIssueSlipData | null;
}

export function BobbinIssueSlipModal({ open, onClose, data, slipData }: BobbinIssueSlipModalProps) {
  const activeData = data || slipData;
  if (!open || !activeData) return null;

  const targetLoom = activeData.loomIdentifier || (activeData.loomNumber ? `Loom #${activeData.loomNumber}` : "Loom Shed");
  const printTimestamp = new Date().toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  const handlePrint = () => {
    printBobbinIssueSlip(activeData);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-300 w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Top bar */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-slate-900 text-white border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-blue-500/20 text-blue-400 rounded-lg">
              <FileText className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Bobbin Issue Slip Preview</h3>
              <p className="text-[11px] text-slate-400 font-mono">{activeData.slipNumber}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-md shadow-xs transition-colors cursor-pointer"
            >
              <Printer className="h-4 w-4" />
              <span>Print Slip</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Slip Canvas Preview */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-100">
          <div className="bg-white p-5 rounded-lg border border-slate-300 shadow-sm text-slate-900 space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between border-b-2 border-slate-900 pb-3">
              <div className="w-16">
                <img src="/logo.png" alt="Logo" className="h-10 w-auto object-contain" />
              </div>
              <div className="flex-1 text-center">
                <h2 className="text-sm font-black text-slate-900 uppercase">Flexicom Industries Pvt. Ltd.</h2>
                <p className="text-[10px] text-slate-500">Tape Plant Extrusion • Loom Section Dispense</p>
                <span className="inline-block mt-1 px-2.5 py-0.5 bg-slate-900 text-white text-[10px] font-extrabold uppercase rounded">
                  BOBBIN ISSUE SLIP
                </span>
              </div>
              <div className="text-right text-[11px] text-slate-600">
                <div>SLIP NO: <strong className="font-mono text-slate-900">{activeData.slipNumber}</strong></div>
                <div>DATE: <strong className="text-slate-900">{activeData.date}</strong></div>
                <div>SHIFT: <strong className="text-slate-900">{activeData.shiftName}</strong></div>
              </div>
            </div>

            {/* Loom & Quality Banner */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-blue-50/60 rounded border border-blue-200 border-l-4 border-l-blue-600">
                <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider block">Target Destination</span>
                <span className="text-base font-black text-blue-950 font-mono">{targetLoom}</span>
              </div>
              <div className="p-3 bg-emerald-50/60 rounded border border-emerald-200 border-l-4 border-l-emerald-600">
                <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">Recipe Quality</span>
                <span className="text-xs font-bold text-emerald-950 font-mono block truncate">{activeData.recipeQuality}</span>
              </div>
            </div>

            {/* Metrics */}
            <div className="border border-slate-300 rounded overflow-hidden">
              <table className="w-full text-center text-xs border-collapse">
                <thead className="bg-slate-100 border-b border-slate-300 text-[10px] font-bold uppercase text-slate-700">
                  <tr>
                    <th className="p-2 border-r border-slate-300">Crates Issued</th>
                    <th className="p-2 border-r border-slate-300">Calculated Bobbins (@ 8/crate)</th>
                    <th className="p-2">Calculated Weight (@ 12.8 kg/crate)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="font-mono font-black text-sm">
                    <td className="p-3 border-r border-slate-200 text-purple-900 bg-purple-50/30">
                      {activeData.crateCount} <span className="text-[10px] font-normal">CRATES</span>
                    </td>
                    <td className="p-3 border-r border-slate-200 text-blue-900 bg-blue-50/30">
                      {activeData.bobbinCount} <span className="text-[10px] font-normal">PCS</span>
                    </td>
                    <td className="p-3 text-emerald-800 bg-emerald-50/30">
                      {activeData.weightKg.toFixed(2)} <span className="text-[10px] font-normal">KG</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {activeData.remarks && (
              <div className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded border border-slate-200">
                <strong>Remarks / Notes:</strong> {activeData.remarks}
              </div>
            )}

            {/* Signatures */}
            <div className="pt-6 border-t border-slate-300 grid grid-cols-3 gap-4 text-center text-[10px]">
              <div>
                <div className="font-bold text-slate-800 mb-4">{activeData.issuedBy || "________________"}</div>
                <div className="border-t border-slate-400 pt-1 font-semibold text-slate-600 uppercase">Issued By (Tape Plant)</div>
              </div>
              <div>
                <div className="font-bold text-slate-800 mb-4">{activeData.receivedBy || "________________"}</div>
                <div className="border-t border-slate-400 pt-1 font-semibold text-slate-600 uppercase">Received By (Loom)</div>
              </div>
              <div>
                <div className="font-bold text-slate-800 mb-4">________________</div>
                <div className="border-t border-slate-400 pt-1 font-semibold text-slate-600 uppercase">Supervisor Approval</div>
              </div>
            </div>

            <div className="flex justify-between items-center text-[9px] text-slate-400 pt-1">
              <span>Flexicom ERP • Bobbin Dispense System</span>
              <span>Printed: {printTimestamp}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
