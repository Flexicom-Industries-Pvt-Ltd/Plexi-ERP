"use client";

import React from "react";
import {
  X,
  Printer,
  FileText,
  ShieldCheck,
  Building2,
} from "lucide-react";
import { printTransportSlip, GatePrintEntry } from "@/lib/gate/print-transport-slip";

export interface TransportSlipModalProps {
  open: boolean;
  onClose: () => void;
  entry: GatePrintEntry | null;
}

function formatDate(dt: string | Date | null | undefined): string {
  if (!dt) return "—";
  try {
    const d = new Date(dt);
    if (isNaN(d.getTime())) return "—";
    return d.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}

function formatTime(dt: string | Date | null | undefined): string {
  if (!dt) return "—";
  try {
    const d = new Date(dt);
    if (isNaN(d.getTime())) return "—";
    return d.toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    });
  } catch {
    return "—";
  }
}

function formatDateTime(dt: string | Date | null | undefined): string {
  if (!dt) return "—";
  return `${formatDate(dt)} ${formatTime(dt)}`;
}

function formatStatus(status: string | null | undefined): string {
  if (!status) return "—";
  return String(status).replace(/_/g, " ");
}

export function TransportSlipModal({ open, onClose, entry }: TransportSlipModalProps) {
  if (!open || !entry) return null;

  const handlePrint = () => {
    printTransportSlip(entry);
  };

  const statusLogs = entry.statusLogs && entry.statusLogs.length > 0
    ? entry.statusLogs
    : [
        {
          id: "arr",
          status: "ARRIVED",
          timestamp: entry.arrivalTime,
          remarks: "Initial truck arrival recorded at security gate",
          user: entry.user,
        },
        ...(entry.status !== "ARRIVED"
          ? [
              {
                id: "curr",
                status: entry.status,
                timestamp: entry.exitTime || new Date(),
                remarks: entry.finalRemarks || entry.waitingReason || `Status at ${formatStatus(entry.status)}`,
                user: null,
              },
            ]
          : []),
      ];

  const totalDeclaredQty = (entry.stockDetails || []).reduce(
    (acc, item) => acc + (Number(item.expectedQuantity ?? item.quantity) || 0),
    0
  );

  const totalReceivedQty = (entry.stockDetails || []).reduce(
    (acc, item) => acc + (item.actualQuantity !== null && item.actualQuantity !== undefined ? Number(item.actualQuantity) : 0),
    0
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
      {/* Modal Container */}
      <div className="relative w-full max-w-4xl bg-white rounded-xl shadow-2xl border border-slate-300 overflow-hidden flex flex-col max-h-[95vh]">
        {/* Top Minimalist Action Bar */}
        <div className="px-5 py-3 bg-slate-100 border-b border-slate-300 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <FileText className="h-5 w-5 text-slate-700" />
            <div>
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                Transport Slip / Gate Pass
                <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-white border border-slate-300 text-slate-700">
                  {entry.entryNumber}
                </span>
              </h2>
              <p className="text-[11px] text-slate-500">
                Standard ERP A4 Portrait Manifest
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-lg shadow-xs active:scale-95 transition-all cursor-pointer"
            >
              <Printer className="h-4 w-4 text-emerald-400" />
              <span>Export as PDF / Print</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
              title="Close Preview"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Document Preview (Clean Minimalist ERP Design) */}
        <div className="p-4 sm:p-8 overflow-y-auto bg-slate-200/60 flex-1">
          <div className="bg-white mx-auto p-6 sm:p-8 rounded-lg shadow-sm border border-slate-300 text-slate-900 max-w-[210mm] w-full text-[12px] leading-relaxed">
            
            {/* 1. HEADER */}
            <div className="border-b-2 border-slate-900 pb-3 mb-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h1 className="text-base sm:text-lg font-bold tracking-tight text-slate-950 uppercase">
                    FLEXICOM INDUSTRIES PVT. LTD.
                  </h1>
                  <p className="text-[11px] text-slate-600 font-medium">
                    Kathua Industrial Complex, Phase-II, Kathua, J&K (184102)
                  </p>
                  <p className="text-[10px] text-slate-500">
                    Security & Gate Logistics Division • ISO 9001:2015
                  </p>
                </div>

                <div className="text-right flex flex-col items-end">
                  <div className="border border-slate-900 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider mb-1">
                    {entry.purpose} GATE PASS
                  </div>
                  <div className="font-mono text-sm font-extrabold text-slate-900 tracking-wider">
                    {entry.entryNumber}
                  </div>
                  <div className="text-[9px] font-mono tracking-widest text-slate-600 select-none">
                    ||| | ||||| || ||| |||| || |
                  </div>
                  <span className="text-[10px] text-slate-500 mt-0.5">
                    Status: <strong>{formatStatus(entry.status)}</strong>
                  </span>
                </div>
              </div>
            </div>

            {/* 2. SECTION 1: VEHICLE & MOVEMENT OVERVIEW */}
            <div className="mb-4">
              <div className="text-[11px] font-bold text-slate-900 uppercase tracking-wider border-b border-slate-900 pb-1 mb-2">
                1. Vehicle & Movement Overview
              </div>
              <table className="w-full border-collapse border border-slate-300 text-[11px]">
                <tbody>
                  <tr className="border-b border-slate-200">
                    <td className="w-1/6 bg-slate-50 p-2 font-semibold text-slate-600 border-r border-slate-200 uppercase text-[10px]">
                      Truck / Vehicle No
                    </td>
                    <td className="w-2/6 p-2 font-mono font-bold text-slate-950 border-r border-slate-200 text-xs">
                      {entry.truckNumber || "—"}
                    </td>
                    <td className="w-1/6 bg-slate-50 p-2 font-semibold text-slate-600 border-r border-slate-200 uppercase text-[10px]">
                      Gate In Date/Time
                    </td>
                    <td className="w-2/6 p-2 text-slate-800">
                      {formatDateTime(entry.arrivalTime)}
                    </td>
                  </tr>
                  <tr className="border-b border-slate-200">
                    <td className="bg-slate-50 p-2 font-semibold text-slate-600 border-r border-slate-200 uppercase text-[10px]">
                      Driver Name
                    </td>
                    <td className="p-2 font-bold text-slate-900 border-r border-slate-200">
                      {entry.driverName || "—"}
                    </td>
                    <td className="bg-slate-50 p-2 font-semibold text-slate-600 border-r border-slate-200 uppercase text-[10px]">
                      Gate Out Date/Time
                    </td>
                    <td className="p-2 text-slate-800">
                      {entry.exitTime ? formatDateTime(entry.exitTime) : "Currently In Factory"}
                    </td>
                  </tr>
                  <tr className="border-b border-slate-200">
                    <td className="bg-slate-50 p-2 font-semibold text-slate-600 border-r border-slate-200 uppercase text-[10px]">
                      Driver Contact
                    </td>
                    <td className="p-2 text-slate-800 border-r border-slate-200">
                      {entry.driverContact || "—"}
                    </td>
                    <td className="bg-slate-50 p-2 font-semibold text-slate-600 border-r border-slate-200 uppercase text-[10px]">
                      License Number
                    </td>
                    <td className="p-2 font-mono text-slate-800">
                      {entry.driverLicenseNumber || "—"}
                    </td>
                  </tr>
                  <tr className="border-b border-slate-200">
                    <td className="bg-slate-50 p-2 font-semibold text-slate-600 border-r border-slate-200 uppercase text-[10px]">
                      Transporter
                    </td>
                    <td className="p-2 text-slate-800 border-r border-slate-200">
                      {entry.transporter || "—"}
                    </td>
                    <td className="bg-slate-50 p-2 font-semibold text-slate-600 border-r border-slate-200 uppercase text-[10px]">
                      Parking / Bay
                    </td>
                    <td className="p-2 font-semibold text-slate-900">
                      {entry.parkingLocation || "Waiting Area"}
                    </td>
                  </tr>
                  <tr>
                    <td className="bg-slate-50 p-2 font-semibold text-slate-600 border-r border-slate-200 uppercase text-[10px]">
                      Supplier / Party
                    </td>
                    <td colSpan={3} className="p-2 font-bold text-slate-900">
                      {entry.supplierCustomer || "—"}
                    </td>
                  </tr>
                  {entry.waitingReason && (
                    <tr className="border-t border-slate-200">
                      <td className="bg-slate-50 p-2 font-semibold text-slate-600 border-r border-slate-200 uppercase text-[10px]">
                        Waiting Reason
                      </td>
                      <td colSpan={3} className="p-2 italic text-slate-700">
                        {entry.waitingReason}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* 3. SECTION 2: CONSIGNMENT MATERIAL & STOCK MANIFEST */}
            <div className="mb-4">
              <div className="text-[11px] font-bold text-slate-900 uppercase tracking-wider border-b border-slate-900 pb-1 mb-2 flex items-center justify-between">
                <span>2. Consignment & Stock Manifest</span>
                <span className="text-[10px] font-normal text-slate-500">
                  {entry.stockDetails?.length || 0} items
                </span>
              </div>
              <table className="w-full border-collapse border border-slate-300 text-[11px]">
                <thead className="bg-slate-50 border-b border-slate-300 text-[10px] uppercase font-bold text-slate-700">
                  <tr>
                    <th className="p-2 border-r border-slate-300 w-8 text-center">#</th>
                    <th className="p-2 border-r border-slate-300 text-left">Material Description</th>
                    <th className="p-2 border-r border-slate-300 text-left">Category</th>
                    <th className="p-2 border-r border-slate-300 text-left">Batch / Lot</th>
                    <th className="p-2 border-r border-slate-300 text-right">Declared Qty</th>
                    <th className="p-2 border-r border-slate-300 text-right">Inward Qty</th>
                    <th className="p-2 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {entry.stockDetails && entry.stockDetails.length > 0 ? (
                    entry.stockDetails.map((item: any, idx: number) => (
                      <tr key={item.id || idx}>
                        <td className="p-2 text-center font-mono text-slate-500 border-r border-slate-200">{idx + 1}</td>
                        <td className="p-2 font-bold text-slate-900 border-r border-slate-200">{item.materialName}</td>
                        <td className="p-2 text-slate-600 border-r border-slate-200 text-[10px]">
                          {item.materialType ? String(item.materialType).replace(/_/g, " ") : "Raw Material"}
                        </td>
                        <td className="p-2 font-mono text-slate-600 border-r border-slate-200 text-[10px]">
                          {item.batchLot || "—"}
                        </td>
                        <td className="p-2 text-right font-bold text-slate-900 border-r border-slate-200">
                          {item.expectedQuantity ?? item.quantity} {item.unit}
                        </td>
                        <td className="p-2 text-right font-semibold text-slate-800 border-r border-slate-200">
                          {item.actualQuantity !== null && item.actualQuantity !== undefined
                            ? `${item.actualQuantity} ${item.unit}`
                            : "—"}
                        </td>
                        <td className="p-2 text-center text-[10px] font-semibold">
                          {item.actualQuantity !== null && item.actualQuantity !== undefined ? "Verified" : "Declared"}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="p-3 text-center text-slate-500 italic">
                        {entry.expectedMaterial
                          ? `${entry.expectedMaterial} • Expected Qty: ${entry.expectedQuantity || "—"}`
                          : "No itemized stock entries recorded."}
                      </td>
                    </tr>
                  )}
                </tbody>
                {entry.stockDetails && entry.stockDetails.length > 0 && (
                  <tfoot className="bg-slate-50 border-t border-slate-300 font-bold text-slate-900 text-[11px]">
                    <tr>
                      <td colSpan={4} className="p-2 text-right uppercase tracking-wider text-[10px]">
                        Total Quantity:
                      </td>
                      <td className="p-2 text-right border-r border-slate-200">{totalDeclaredQty.toFixed(2)}</td>
                      <td className="p-2 text-right border-r border-slate-200">
                        {totalReceivedQty > 0 ? totalReceivedQty.toFixed(2) : "—"}
                      </td>
                      <td></td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>

            {/* 4. SECTION 3: DOCUMENT VERIFICATION */}
            <div className="mb-4">
              <div className="text-[11px] font-bold text-slate-900 uppercase tracking-wider border-b border-slate-900 pb-1 mb-2 flex items-center justify-between">
                <span>3. Document Verification & Clearances</span>
                <span className="text-[10px] font-normal text-slate-500">
                  {entry.documents?.length || 0} verified
                </span>
              </div>
              <table className="w-full border-collapse border border-slate-300 text-[11px]">
                <thead className="bg-slate-50 border-b border-slate-300 text-[10px] uppercase font-bold text-slate-700">
                  <tr>
                    <th className="p-2 border-r border-slate-300 w-8 text-center">#</th>
                    <th className="p-2 border-r border-slate-300 text-left">Document Type</th>
                    <th className="p-2 border-r border-slate-300 text-left">Remarks / Reference</th>
                    <th className="p-2 border-r border-slate-300 text-center">Status</th>
                    <th className="p-2 border-r border-slate-300 text-left">Verified By</th>
                    <th className="p-2 text-right">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {entry.documents && entry.documents.length > 0 ? (
                    entry.documents.map((doc: any, idx: number) => (
                      <tr key={doc.id || idx}>
                        <td className="p-2 text-center font-mono text-slate-500 border-r border-slate-200">{idx + 1}</td>
                        <td className="p-2 font-bold text-slate-900 border-r border-slate-200">{doc.documentType}</td>
                        <td className="p-2 text-slate-700 border-r border-slate-200 text-[10px]">{doc.remarks || "—"}</td>
                        <td className="p-2 text-center font-bold text-[10px] border-r border-slate-200">
                          {doc.status}
                        </td>
                        <td className="p-2 text-slate-800 border-r border-slate-200 text-[10px]">
                          {doc.verifier?.name || "Security Desk"}
                        </td>
                        <td className="p-2 text-right font-mono text-slate-600 text-[10px]">
                          {doc.verifiedAt ? formatDateTime(doc.verifiedAt) : formatDateTime(doc.createdAt)}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="p-2.5 text-center text-slate-500 italic">
                        Standard gate pass verification completed at arrival check-post.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* 5. SECTION 4: MOVEMENT & STATUS TIMELINE */}
            <div className="mb-5">
              <div className="text-[11px] font-bold text-slate-900 uppercase tracking-wider border-b border-slate-900 pb-1 mb-2 flex items-center justify-between">
                <span>4. Movement Status & Audit Trail</span>
                <span className="text-[10px] font-normal text-slate-500">
                  {statusLogs.length} updates
                </span>
              </div>
              <table className="w-full border-collapse border border-slate-300 text-[11px]">
                <thead className="bg-slate-50 border-b border-slate-300 text-[10px] uppercase font-bold text-slate-700">
                  <tr>
                    <th className="p-2 border-r border-slate-300 w-8 text-center">#</th>
                    <th className="p-2 border-r border-slate-300 text-left">Stage Status</th>
                    <th className="p-2 border-r border-slate-300 text-left">Exact Date & Time</th>
                    <th className="p-2 border-r border-slate-300 text-left">Actioned By</th>
                    <th className="p-2 text-left">Operational Remarks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {statusLogs.map((log: any, idx: number) => (
                    <tr key={log.id || idx}>
                      <td className="p-2 text-center font-mono font-bold text-slate-600 border-r border-slate-200">
                        {idx + 1}
                      </td>
                      <td className="p-2 font-bold text-slate-900 border-r border-slate-200">
                        {formatStatus(log.status)}
                      </td>
                      <td className="p-2 font-mono text-slate-900 border-r border-slate-200 text-[10px] whitespace-nowrap">
                        {formatDateTime(log.timestamp)}
                      </td>
                      <td className="p-2 text-slate-700 border-r border-slate-200 text-[10px]">
                        {log.user?.name || log.updatedBy || entry.user?.name || "Security / System"}
                      </td>
                      <td className="p-2 text-slate-600 text-[10px]">
                        {log.remarks || "Status recorded successfully"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* 6. SIGN-OFF AUTHORIZATIONS */}
            <div className="border border-slate-300 p-3 bg-slate-50/40">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="space-y-6 pt-1">
                  <div className="text-[10px] uppercase font-bold text-slate-700">
                    Security Gate In-Charge
                  </div>
                  <div className="border-b border-slate-400 w-3/4 mx-auto pb-1 text-[9px] text-slate-500">
                    (Signature & Gate Stamp)
                  </div>
                </div>

                <div className="space-y-6 pt-1 border-x border-slate-200">
                  <div className="text-[10px] uppercase font-bold text-slate-700">
                    Warehouse / Store Inward
                  </div>
                  <div className="border-b border-slate-400 w-3/4 mx-auto pb-1 text-[9px] text-slate-500">
                    (Signature & Material Stamp)
                  </div>
                </div>

                <div className="space-y-6 pt-1">
                  <div className="text-[10px] uppercase font-bold text-slate-700">
                    Driver / Carrier
                  </div>
                  <div className="border-b border-slate-400 w-3/4 mx-auto pb-1 text-[9px] text-slate-500">
                    (Driver Signature / Thumb)
                  </div>
                </div>
              </div>

              <div className="mt-3 pt-2 border-t border-slate-200 flex items-center justify-between text-[9px] text-slate-500">
                <span>Flexicom ERP Gate Logistics • Valid for factory entry/exit inspection</span>
                <span>Generated: {formatDateTime(new Date())}</span>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
