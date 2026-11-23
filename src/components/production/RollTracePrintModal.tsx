"use client";

import React from "react";
import { FileText, Printer, X, CheckCircle2, Clock } from "lucide-react";
import { RollTraceResult } from "@/lib/production/roll-trace";
import { printRollTrace } from "@/lib/production/print-roll-trace";

interface RollTracePrintModalProps {
  open: boolean;
  onClose: () => void;
  data: RollTraceResult;
}

export function RollTracePrintModal({
  open,
  onClose,
  data,
}: RollTracePrintModalProps) {
  if (!open || !data) return null;

  const rollNumber = data.rollNumber || "UNKNOWN";
  const docRef = `TRC-${rollNumber}`;
  const loom = data.stages.loom;
  const lam = data.stages.lamination;
  const print = data.stages.printing;
  const conv = data.stages.conversion;

  const genTimestamp = new Date().toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  const handlePrint = () => {
    printRollTrace(data);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/75 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-300 w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Modal Top Control Bar (Standard Enterprise Dark Theme) */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 bg-slate-900 text-white border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 text-white rounded-lg">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-bold text-white tracking-tight">
                  Roll Tracing Traveler & Passport Preview
                </h2>
                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-sm border bg-emerald-900/40 text-emerald-300 border-emerald-500/40">
                  {data.currentStageLabel}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Roll #{rollNumber} • Quality: {data.specs.qualityType || "—"} • Ref: {docRef}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
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
          <div className="max-w-[920px] mx-auto bg-white rounded-xl shadow-lg border border-slate-200 p-6 sm:p-8 font-sans text-slate-900">
            {/* Standard Sheet Header */}
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
                    SIDCO INDUSTRIAL ESTATE, PHASE-II, KATHUA (J&K) 184143 • CIRCULAR WEAVING & CONVERSION DIVISION
                  </div>
                  <div className="text-sm font-black tracking-wider text-slate-900 mt-1 uppercase">
                    OFFICIAL ROLL PROCESS TRAVELER & GENEALOGY PASSPORT
                  </div>
                </div>
                <div className="w-20 text-right">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                    A4 PORTRAIT
                  </span>
                </div>
              </div>

              {/* Metadata strip */}
              <div className="mt-3 pt-2 border-t border-slate-200 flex flex-wrap items-center justify-between text-xs text-slate-600 font-medium">
                <div>
                  Doc Ref: <strong className="text-slate-900 font-mono">{docRef}</strong>
                </div>
                <div>
                  Roll No: <strong className="text-slate-900 font-mono">{rollNumber}</strong>
                </div>
                <div>
                  Fabric Quality: <strong className="text-slate-900">{data.specs.qualityType || "—"}</strong>
                </div>
                <div>
                  Current Stage: <strong className="text-slate-900">{data.currentStage}</strong>
                </div>
                <div>
                  Generated: <strong className="text-slate-900">{genTimestamp}</strong>
                </div>
              </div>
            </div>

            {/* Section 1: Roll Identification & Master Specifications */}
            <div className="mb-5">
              <div className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2 border-l-2 border-slate-900 pl-2">
                1. Roll Identification & Master Specifications
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <div className="p-2.5 rounded border border-slate-200 bg-slate-50">
                  <div className="text-[10px] font-bold uppercase text-slate-500">Roll Number</div>
                  <div className="text-sm font-black font-mono text-slate-900 mt-0.5">{rollNumber}</div>
                </div>
                <div className="p-2.5 rounded border border-slate-200 bg-slate-50">
                  <div className="text-[10px] font-bold uppercase text-slate-500">Fabric Quality</div>
                  <div className="text-sm font-bold text-slate-900 mt-0.5 truncate">{data.specs.qualityType || "—"}</div>
                </div>
                <div className="p-2.5 rounded border border-slate-200 bg-slate-50">
                  <div className="text-[10px] font-bold uppercase text-slate-500">Fabric Width</div>
                  <div className="text-sm font-bold text-slate-900 mt-0.5">
                    {data.specs.widthMm ? `${data.specs.widthMm} mm` : "—"}
                  </div>
                </div>
                <div className="p-2.5 rounded border border-slate-200 bg-slate-50">
                  <div className="text-[10px] font-bold uppercase text-slate-500">Initial Cut Length</div>
                  <div className="text-sm font-bold text-slate-900 mt-0.5">
                    {data.specs.initialMeters ? `${data.specs.initialMeters.toLocaleString()} m` : "—"}
                  </div>
                </div>
                <div className="p-2.5 rounded border border-slate-200 bg-slate-50">
                  <div className="text-[10px] font-bold uppercase text-slate-500">Initial Net Weight</div>
                  <div className="text-sm font-bold text-slate-900 mt-0.5">
                    {data.specs.initialNettWeightKg ? `${data.specs.initialNettWeightKg.toFixed(2)} kg` : "—"}
                  </div>
                </div>
                <div className="p-2.5 rounded border border-slate-200 bg-slate-50">
                  <div className="text-[10px] font-bold uppercase text-slate-500">Avg Fabric Density</div>
                  <div className="text-sm font-bold text-slate-900 mt-0.5">
                    {data.specs.avgWeightPerMeter ? `${data.specs.avgWeightPerMeter.toFixed(2)} g/m` : "—"}
                  </div>
                </div>
                <div className="p-2.5 rounded border border-slate-200 bg-slate-50">
                  <div className="text-[10px] font-bold uppercase text-slate-500">Loom & Sequence</div>
                  <div className="text-sm font-bold text-slate-900 mt-0.5">
                    {loom ? `Loom #${loom.loomNumber} (Seq ${loom.sequence})` : "—"}
                  </div>
                </div>
                <div className="p-2.5 rounded border border-slate-200 bg-slate-50">
                  <div className="text-[10px] font-bold uppercase text-slate-500">Gross / Tare Weight</div>
                  <div className="text-sm font-bold text-slate-900 mt-0.5">
                    {loom ? `${loom.grossWeightKg} kg / ${loom.tareWeightKg} kg` : "—"}
                  </div>
                </div>
              </div>
            </div>

            {/* Section 2: Process Traveler & Stage Genealogy */}
            <div className="mb-5">
              <div className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2 border-l-2 border-slate-900 pl-2">
                2. Process Traveler & Stage Genealogy
              </div>
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-slate-900 text-white text-[11px] uppercase tracking-wider">
                    <tr>
                      <th className="py-2 px-3 text-left w-1/4">Process Stage</th>
                      <th className="py-2 px-3 text-left w-1/6">Date & Shift</th>
                      <th className="py-2 px-3 text-left w-1/5">In-Charge</th>
                      <th className="py-2 px-3 text-left">Key Operational Parameters</th>
                      <th className="py-2 px-3 text-center w-20">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {/* Stage 1: Loom */}
                    <tr className="hover:bg-slate-50/50">
                      <td className="py-2.5 px-3">
                        <div className="font-bold text-slate-900">1. Loom Section</div>
                        <div className="text-[10px] text-slate-500">Weaving & Roll Cutting</div>
                      </td>
                      <td className="py-2.5 px-3">
                        {loom ? (
                          <div>
                            <div className="font-bold text-slate-900">{loom.date || "—"}</div>
                            <div className="text-[10px] text-slate-500">{loom.shiftName || "Shift"}</div>
                          </div>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3">
                        {loom ? (
                          <div>
                            <div className="font-bold text-slate-900">{loom.supervisorSign || loom.supervisorName || "—"}</div>
                            <div className="text-[10px] text-slate-500">{loom.contractor || "In-House"}</div>
                          </div>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3">
                        {loom ? (
                          <div className="space-y-0.5 text-[11px]">
                            <div>
                              <span className="text-slate-500">Loom:</span> <strong className="text-slate-900">#{loom.loomNumber}</strong> (Seq: {loom.sequence}) • <span className="text-slate-500">Meters:</span> <strong className="text-slate-900">{loom.meter} m</strong>
                            </div>
                            <div>
                              <span className="text-slate-500">Gross:</span> <strong className="text-slate-900">{loom.grossWeightKg} kg</strong> • <span className="text-slate-500">Net:</span> <strong className="text-slate-900">{loom.nettWeightKg} kg</strong> • <span className="text-slate-500">Avg:</span> <strong className="text-slate-900">{loom.avgWeightPerMeter ? `${loom.avgWeightPerMeter.toFixed(2)} g/m` : "—"}</strong>
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-400">No loom cut record found</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            loom
                              ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                              : "bg-slate-100 text-slate-600 border border-slate-200"
                          }`}
                        >
                          {loom ? <CheckCircle2 className="h-3 w-3 text-emerald-600" /> : <Clock className="h-3 w-3 text-slate-400" />}
                          {loom ? "Done" : "Pending"}
                        </span>
                      </td>
                    </tr>

                    {/* Stage 2: Lamination */}
                    <tr className="hover:bg-slate-50/50">
                      <td className="py-2.5 px-3">
                        <div className="font-bold text-slate-900">2. Lamination</div>
                        <div className="text-[10px] text-slate-500">PP Extrusion Coating</div>
                      </td>
                      <td className="py-2.5 px-3">
                        {lam ? (
                          <div>
                            <div className="font-bold text-slate-900">{lam.date || "—"}</div>
                            <div className="text-[10px] text-slate-500">{lam.shiftName || "Shift"}</div>
                          </div>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3">
                        {lam ? (
                          <div className="font-bold text-slate-900">{lam.supervisorName || "—"}</div>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3">
                        {lam ? (
                          <div className="space-y-0.5 text-[11px]">
                            <div>
                              <span className="text-slate-500">Coating:</span> <strong className="text-slate-900">{lam.coating} g/m</strong> • <span className="text-slate-500">Prod Meters:</span> <strong className="text-slate-900">{lam.productionMeter} m</strong>
                            </div>
                            <div>
                              <span className="text-slate-500">Net Wt After:</span> <strong className="text-slate-900">{lam.netWeightAfter} kg</strong> <span className="text-emerald-700 font-semibold">(+{(lam.netWeightAfter - lam.netWeightBefore).toFixed(2)} kg)</span>
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-400">Awaiting processing in Lamination</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            lam
                              ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                              : "bg-slate-100 text-slate-600 border border-slate-200"
                          }`}
                        >
                          {lam ? <CheckCircle2 className="h-3 w-3 text-emerald-600" /> : <Clock className="h-3 w-3 text-slate-400" />}
                          {lam ? "Done" : "Pending"}
                        </span>
                      </td>
                    </tr>

                    {/* Stage 3: Printing */}
                    <tr className="hover:bg-slate-50/50">
                      <td className="py-2.5 px-3">
                        <div className="font-bold text-slate-900">3. Printing</div>
                        <div className="text-[10px] text-slate-500">Rotary / Flexo Printing</div>
                      </td>
                      <td className="py-2.5 px-3">
                        {print ? (
                          <div>
                            <div className="font-bold text-slate-900">{print.date || "—"}</div>
                            <div className="text-[10px] text-slate-500">{print.shiftName || "Shift"}</div>
                          </div>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3">
                        {print ? (
                          <div className="font-bold text-slate-900">{print.supervisorName || "—"}</div>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3">
                        {print ? (
                          <div className="space-y-0.5 text-[11px]">
                            <div>
                              <span className="text-slate-500">Party:</span> <strong className="text-slate-900">{print.companyName || "—"}</strong> ({print.unitName || "—"}) • <span className="text-slate-500">Grade:</span> <strong className="text-slate-900">{print.grade || "—"}</strong>
                            </div>
                            <div>
                              <span className="text-slate-500">Drum:</span> <strong className="text-slate-900">{print.drumSize || "—"}</strong> • <span className="text-slate-500">Printed:</span> <strong className="text-slate-900">{print.printMeter || print.productionMeter} m</strong> • <span className="text-slate-500">Net:</span> <strong className="text-slate-900">{print.netWeight} kg</strong>
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-400">Awaiting processing in Printing</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            print
                              ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                              : "bg-slate-100 text-slate-600 border border-slate-200"
                          }`}
                        >
                          {print ? <CheckCircle2 className="h-3 w-3 text-emerald-600" /> : <Clock className="h-3 w-3 text-slate-400" />}
                          {print ? "Done" : "Pending"}
                        </span>
                      </td>
                    </tr>

                    {/* Stage 4: Convertex / Valvomatic */}
                    <tr className="hover:bg-slate-50/50">
                      <td className="py-2.5 px-3">
                        <div className="font-bold text-slate-900">4. Convertex / Valvomatic</div>
                        <div className="text-[10px] text-slate-500">Bag Making & Conversion</div>
                      </td>
                      <td className="py-2.5 px-3">
                        {conv ? (
                          <div>
                            <div className="font-bold text-slate-900">{conv.date || "—"}</div>
                            <div className="text-[10px] text-slate-500">{conv.shiftName || "Shift"}</div>
                          </div>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3">
                        {conv ? (
                          <div className="font-bold text-slate-900">{conv.supervisorName || "—"}</div>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3">
                        {conv ? (
                          <div className="space-y-0.5 text-[11px]">
                            <div>
                              <span className="text-slate-500">Machine:</span> <strong className="text-slate-900">{conv.type}</strong> • <span className="text-slate-500">Bags:</span> <strong className="text-slate-900">{conv.productionPcs.toLocaleString()} pcs</strong> {conv.productionKg ? `(${conv.productionKg} kg)` : ""}
                            </div>
                            <div>
                              <span className="text-slate-500">Waste:</span> Loom {conv.loomFabricWasteKg}kg • Lam {conv.lamFabricWasteKg}kg • Print {conv.printFabricWasteKg}kg • <span className="text-rose-700 font-bold">Total {(conv.loomFabricWasteKg + conv.lamFabricWasteKg + conv.printFabricWasteKg).toFixed(2)} kg</span>
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-400">Roll has not reached Convertex / Valvomatic cutting</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            conv
                              ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                              : "bg-slate-100 text-slate-600 border border-slate-200"
                          }`}
                        >
                          {conv ? <CheckCircle2 className="h-3 w-3 text-emerald-600" /> : <Clock className="h-3 w-3 text-slate-400" />}
                          {conv ? "Done" : "Pending"}
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Scale Photo Evidence */}
            {loom?.photoUrl && (
              <div className="mb-5">
                <div className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2 border-l-2 border-slate-900 pl-2">
                  3. Calibrated Scale Photo Evidence
                </div>
                <div className="p-3 border border-slate-200 rounded-lg bg-slate-50/50 flex flex-col items-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={loom.photoUrl}
                    alt="Physical scale evidence"
                    className="max-h-36 rounded border border-slate-300 object-contain shadow-xs"
                  />
                  <div className="text-[10px] text-slate-500 font-medium mt-1.5">
                    Physical Scale Weight Reading • Loom #{loom.loomNumber} • Cut Seq #{loom.sequence}
                  </div>
                </div>
              </div>
            )}

            {/* Official Sign-offs */}
            <div>
              <div className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2 border-l-2 border-slate-900 pl-2">
                {loom?.photoUrl ? "4" : "3"}. Process Authorizations & Quality Approvals
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="border border-slate-300 rounded p-2.5 min-h-[56px] flex flex-col justify-between">
                  <div className="text-[10px] font-bold uppercase text-slate-500">Weaving Operator</div>
                  <div className="border-t border-dashed border-slate-400 pt-1 text-[11px] font-medium text-slate-700">
                    {loom?.contractor || loom?.supervisorSign || "Operator Sign"}
                  </div>
                </div>
                <div className="border border-slate-300 rounded p-2.5 min-h-[56px] flex flex-col justify-between">
                  <div className="text-[10px] font-bold uppercase text-slate-500">Production Supervisor</div>
                  <div className="border-t border-dashed border-slate-400 pt-1 text-[11px] font-medium text-slate-700">
                    {loom?.supervisorName || "Supervisor Sign"}
                  </div>
                </div>
                <div className="border border-slate-300 rounded p-2.5 min-h-[56px] flex flex-col justify-between">
                  <div className="text-[10px] font-bold uppercase text-slate-500">QA Inspector</div>
                  <div className="border-t border-dashed border-slate-400 pt-1 text-[11px] font-medium text-slate-700">
                    Inspector Sign
                  </div>
                </div>
                <div className="border border-slate-300 rounded p-2.5 min-h-[56px] flex flex-col justify-between">
                  <div className="text-[10px] font-bold uppercase text-slate-500">Plant / Dispatch Manager</div>
                  <div className="border-t border-dashed border-slate-400 pt-1 text-[11px] font-medium text-slate-700">
                    Authorized Signatory
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
