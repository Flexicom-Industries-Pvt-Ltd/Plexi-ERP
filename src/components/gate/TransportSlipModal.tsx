"use client";

import React, { useRef } from "react";
import {
  X,
  Printer,
  FileText,
  Truck,
  ShieldCheck,
  CheckCircle2,
  Calendar,
  Clock,
  MapPin,
  User,
  Phone,
  Briefcase,
  Layers,
  FileCheck,
  Building2,
  Download,
} from "lucide-react";

export interface GateStatusLogItem {
  id: string;
  status: string;
  timestamp: string | Date;
  updatedBy?: string | null;
  remarks?: string | null;
  user?: { name?: string | null; email?: string | null } | null;
  createdAt?: string | Date;
}

export interface TransportSlipModalProps {
  open: boolean;
  onClose: () => void;
  entry: {
    id: string;
    entryNumber: string;
    truckNumber: string;
    driverName: string;
    driverContact?: string | null;
    driverLicenseNumber?: string | null;
    transporter?: string | null;
    supplierCustomer?: string | null;
    purpose: string;
    status: string;
    arrivalTime: string | Date;
    exitTime?: string | Date | null;
    expectedMaterial?: string | null;
    expectedQuantity?: number | null;
    parkingLocation?: string | null;
    waitingReason?: string | null;
    finalQuantity?: number | null;
    finalRemarks?: string | null;
    createdBy?: string | null;
    user?: { name?: string | null; email?: string | null } | null;
    stockDetails?: any[];
    documents?: any[];
    statusLogs?: GateStatusLogItem[];
  } | null;
}

function formatDateTime(dt: string | Date | null | undefined): string {
  if (!dt) return "—";
  try {
    const d = new Date(dt);
    if (isNaN(d.getTime())) return "—";
    return d.toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    });
  } catch {
    return "—";
  }
}

function formatDateOnly(dt: string | Date | null | undefined): string {
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

function formatStatus(status: string | null | undefined): string {
  if (!status) return "—";
  return status.replace(/_/g, " ");
}

export function TransportSlipModal({ open, onClose, entry }: TransportSlipModalProps) {
  const printAreaRef = useRef<HTMLDivElement>(null);

  if (!open || !entry) return null;

  const handlePrint = () => {
    window.print();
  };

  const statusLogs: GateStatusLogItem[] = entry.statusLogs && entry.statusLogs.length > 0
    ? entry.statusLogs
    : [
        {
          id: "synth-arr",
          status: "ARRIVED",
          timestamp: entry.arrivalTime,
          remarks: "Initial truck arrival registered at gate",
          user: entry.user,
        },
        ...(entry.status !== "ARRIVED"
          ? [
              {
                id: "synth-curr",
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/75 backdrop-blur-xs overflow-y-auto">
      {/* ========================================================================= */}
      {/* STRICT A4 PORTRAIT PRINT STYLES                                           */}
      {/* ========================================================================= */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #transport-slip-print-root,
          #transport-slip-print-root * {
            visibility: visible !important;
          }
          #transport-slip-print-root {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 8mm !important;
            background: #ffffff !important;
            color: #0f172a !important;
            box-shadow: none !important;
            border: none !important;
            font-size: 9.5pt !important;
            line-height: 1.35 !important;
          }
          .no-print {
            display: none !important;
          }
          @page {
            size: A4 portrait;
            margin: 8mm;
          }
          .print-avoid-break {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }
          .print-compact-table th,
          .print-compact-table td {
            padding: 4px 6px !important;
            font-size: 8.5pt !important;
          }
        }
      `}</style>

      {/* Modal Container */}
      <div className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[94vh]">
        {/* Modal Toolbar (Non-printable) */}
        <div className="no-print px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/20 text-primary-400 rounded-lg">
              <FileText className="h-5 w-5 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Transport Slip / Gate Pass
                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-emerald-400 font-mono border border-slate-700">
                  {entry.entryNumber}
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                A4 Portrait Manifest • Includes all 4 Lifecycle & Manifest Sections
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg shadow-sm active:scale-95 transition-all cursor-pointer"
            >
              <Printer className="h-4 w-4" />
              <span>Export as PDF / Print</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              title="Close Preview"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Printable Document Area */}
        <div className="p-4 sm:p-6 overflow-y-auto bg-slate-100/70 flex-1">
          {/* Paper Sheet Preview container with standard A4 proportions */}
          <div
            id="transport-slip-print-root"
            ref={printAreaRef}
            className="bg-white mx-auto p-6 sm:p-8 rounded-xl shadow-md border border-slate-300 text-slate-900 max-w-[210mm] w-full"
          >
            {/* ========================================================================= */}
            {/* DOCUMENT HEADER: Company Info + Barcode + Title                           */}
            {/* ========================================================================= */}
            <div className="border-b-2 border-slate-900 pb-4 mb-4">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="h-7 w-7 rounded-lg bg-slate-900 text-white font-black text-sm flex items-center justify-center">
                      F
                    </span>
                    <h1 className="text-lg sm:text-xl font-black tracking-tight text-slate-950 uppercase">
                      FLEXICOM INDUSTRIES PVT. LTD.
                    </h1>
                  </div>
                  <p className="text-[11px] text-slate-600 font-medium">
                    Kathua Industrial Complex, Phase-II, Kathua, J&K (184102) • Central ERP Logistics Division
                  </p>
                  <p className="text-[10px] text-slate-500 font-mono">
                    ISO 9001:2015 Certified Manufacturing Facility • Security & Gate Management
                  </p>
                </div>

                <div className="text-right flex flex-col items-end">
                  <div className="px-3 py-1 bg-slate-950 text-white font-bold text-xs rounded uppercase tracking-wider mb-1">
                    {entry.purpose} GATE PASS
                  </div>
                  <div className="font-mono text-base font-extrabold text-slate-900 tracking-wider">
                    {entry.entryNumber}
                  </div>
                  {/* Simulated Clean Barcode */}
                  <div className="text-[10px] font-mono tracking-widest text-slate-700 select-none scale-y-125 my-0.5">
                    ||| | ||||| || ||| |||| || |
                  </div>
                  <span className="text-[9px] text-slate-500 font-medium">
                    Issued: {formatDateTime(entry.arrivalTime)}
                  </span>
                </div>
              </div>
            </div>

            {/* Document Title Banner */}
            <div className="bg-slate-100 border border-slate-300 rounded px-3 py-1.5 mb-4 flex items-center justify-between text-xs font-bold text-slate-800">
              <span className="uppercase tracking-wider flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5 text-slate-700" />
                VEHICLE INWARD / OUTWARD TRANSPORT SLIP & GATE MANIFEST
              </span>
              <span className="font-mono text-[11px]">
                CURRENT STATUS: <span className="font-black text-slate-950">{formatStatus(entry.status)}</span>
              </span>
            </div>

            {/* ========================================================================= */}
            {/* SECTION 1: VEHICLE & CONSIGNMENT OVERVIEW                                 */}
            {/* ========================================================================= */}
            <div className="mb-4 print-avoid-break">
              <div className="bg-slate-900 text-white px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider rounded-t">
                Section 1: Vehicle, Driver & Consignment Overview
              </div>
              <div className="border border-slate-300 border-t-0 rounded-b p-3 bg-slate-50/50">
                <div className="grid grid-cols-3 gap-x-4 gap-y-2 text-xs">
                  <div>
                    <span className="text-slate-500 font-semibold block text-[10px] uppercase">Truck / Vehicle No</span>
                    <span className="font-bold text-slate-950 font-mono text-sm bg-white px-1.5 py-0.5 rounded border border-slate-200 inline-block mt-0.5">
                      {entry.truckNumber || "—"}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 font-semibold block text-[10px] uppercase">Driver Name</span>
                    <span className="font-bold text-slate-900 block mt-0.5">{entry.driverName || "—"}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 font-semibold block text-[10px] uppercase">Driver Phone</span>
                    <span className="font-semibold text-slate-800 block mt-0.5">{entry.driverContact || "—"}</span>
                  </div>

                  <div>
                    <span className="text-slate-500 font-semibold block text-[10px] uppercase">Driver License No</span>
                    <span className="font-mono text-slate-800 block mt-0.5">{entry.driverLicenseNumber || "—"}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 font-semibold block text-[10px] uppercase">Transporter Company</span>
                    <span className="font-semibold text-slate-800 block mt-0.5">{entry.transporter || "—"}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 font-semibold block text-[10px] uppercase">Party / Consignor</span>
                    <span className="font-bold text-slate-900 block mt-0.5">{entry.supplierCustomer || "—"}</span>
                  </div>

                  <div>
                    <span className="text-slate-500 font-semibold block text-[10px] uppercase">Gate In (Arrival)</span>
                    <span className="font-medium text-slate-800 block mt-0.5">{formatDateTime(entry.arrivalTime)}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 font-semibold block text-[10px] uppercase">Gate Out (Exit)</span>
                    <span className="font-medium text-slate-800 block mt-0.5">
                      {entry.exitTime ? formatDateTime(entry.exitTime) : "Currently In Factory"}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 font-semibold block text-[10px] uppercase">Parking / Bay Location</span>
                    <span className="font-semibold text-slate-900 block mt-0.5">
                      {entry.parkingLocation || "Waiting Area"}
                    </span>
                  </div>

                  {entry.waitingReason && (
                    <div className="col-span-3 pt-1 border-t border-slate-200">
                      <span className="text-slate-500 font-semibold text-[10px] uppercase">Waiting / Hold Reason: </span>
                      <span className="text-slate-700 italic text-[11px]">{entry.waitingReason}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* ========================================================================= */}
            {/* SECTION 2: MATERIAL & STOCK MANIFEST                                      */}
            {/* ========================================================================= */}
            <div className="mb-4 print-avoid-break">
              <div className="bg-slate-900 text-white px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider rounded-t flex items-center justify-between">
                <span>Section 2: Consignment Material & Stock Manifest</span>
                <span className="text-[10px] font-normal text-slate-300">
                  Total Items: {entry.stockDetails?.length || 0}
                </span>
              </div>
              <div className="border border-slate-300 border-t-0 rounded-b overflow-hidden">
                <table className="w-full text-xs text-left print-compact-table">
                  <thead className="bg-slate-100 border-b border-slate-300 text-[10px] uppercase font-bold text-slate-700">
                    <tr>
                      <th className="px-3 py-1.5 w-10 text-center">#</th>
                      <th className="px-3 py-1.5">Material Description</th>
                      <th className="px-3 py-1.5">Category</th>
                      <th className="px-3 py-1.5">Batch / Lot No</th>
                      <th className="px-3 py-1.5 text-right">Declared Qty</th>
                      <th className="px-3 py-1.5 text-right">Inward / Actual</th>
                      <th className="px-3 py-1.5 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {entry.stockDetails && entry.stockDetails.length > 0 ? (
                      entry.stockDetails.map((item: any, idx: number) => (
                        <tr key={item.id || idx} className={idx % 2 === 1 ? "bg-slate-50/60" : "bg-white"}>
                          <td className="px-3 py-1.5 text-center font-mono text-slate-500">{idx + 1}</td>
                          <td className="px-3 py-1.5 font-bold text-slate-900">{item.materialName}</td>
                          <td className="px-3 py-1.5 text-slate-600 text-[11px]">
                            {item.materialType ? item.materialType.replace(/_/g, " ") : "Raw Material"}
                          </td>
                          <td className="px-3 py-1.5 font-mono text-slate-600 text-[11px]">
                            {item.batchLot || "—"}
                          </td>
                          <td className="px-3 py-1.5 text-right font-bold text-slate-900">
                            {item.expectedQuantity ?? item.quantity} {item.unit}
                          </td>
                          <td className="px-3 py-1.5 text-right font-bold text-slate-800">
                            {item.actualQuantity !== null && item.actualQuantity !== undefined
                              ? `${item.actualQuantity} ${item.unit}`
                              : "—"}
                          </td>
                          <td className="px-3 py-1.5 text-center">
                            {item.actualQuantity !== null && item.actualQuantity !== undefined ? (
                              <span className="inline-block px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                                Verified
                              </span>
                            ) : (
                              <span className="inline-block px-1.5 py-0.5 rounded text-[9px] font-semibold bg-amber-50 text-amber-800 border border-amber-300">
                                Declared
                              </span>
                            )}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={7} className="px-3 py-3 text-center text-slate-500 italic text-xs">
                          {entry.expectedMaterial
                            ? `${entry.expectedMaterial} • Expected Qty: ${entry.expectedQuantity || "—"}`
                            : "No itemized stock entries recorded."}
                        </td>
                      </tr>
                    )}
                  </tbody>
                  {entry.stockDetails && entry.stockDetails.length > 0 && (
                    <tfoot className="bg-slate-100 border-t-2 border-slate-300 font-bold text-slate-900 text-xs">
                      <tr>
                        <td colSpan={4} className="px-3 py-1.5 text-right uppercase tracking-wider text-[10px]">
                          Consignment Total Declared / Received:
                        </td>
                        <td className="px-3 py-1.5 text-right">{totalDeclaredQty.toFixed(2)}</td>
                        <td className="px-3 py-1.5 text-right">
                          {totalReceivedQty > 0 ? totalReceivedQty.toFixed(2) : "—"}
                        </td>
                        <td></td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>

            {/* ========================================================================= */}
            {/* SECTION 3: DOCUMENT VERIFICATION & CLEARANCES                             */}
            {/* ========================================================================= */}
            <div className="mb-4 print-avoid-break">
              <div className="bg-slate-900 text-white px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider rounded-t flex items-center justify-between">
                <span>Section 3: Document Verification & Gate Clearances</span>
                <span className="text-[10px] font-normal text-slate-300">
                  Documents Checked: {entry.documents?.length || 0}
                </span>
              </div>
              <div className="border border-slate-300 border-t-0 rounded-b overflow-hidden">
                <table className="w-full text-xs text-left print-compact-table">
                  <thead className="bg-slate-100 border-b border-slate-300 text-[10px] uppercase font-bold text-slate-700">
                    <tr>
                      <th className="px-3 py-1.5 w-10 text-center">#</th>
                      <th className="px-3 py-1.5">Document Type</th>
                      <th className="px-3 py-1.5">Reference / Remarks</th>
                      <th className="px-3 py-1.5 text-center">Verification Status</th>
                      <th className="px-3 py-1.5">Verified By</th>
                      <th className="px-3 py-1.5 text-right">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {entry.documents && entry.documents.length > 0 ? (
                      entry.documents.map((doc: any, idx: number) => (
                        <tr key={doc.id || idx} className={idx % 2 === 1 ? "bg-slate-50/60" : "bg-white"}>
                          <td className="px-3 py-1.5 text-center font-mono text-slate-500">{idx + 1}</td>
                          <td className="px-3 py-1.5 font-bold text-slate-900">{doc.documentType}</td>
                          <td className="px-3 py-1.5 text-slate-700 text-[11px]">{doc.remarks || "—"}</td>
                          <td className="px-3 py-1.5 text-center">
                            <span
                              className={`inline-block px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                                doc.status === "VERIFIED"
                                  ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                                  : doc.status === "REJECTED"
                                  ? "bg-red-100 text-red-800 border border-red-300"
                                  : "bg-amber-100 text-amber-800 border border-amber-300"
                              }`}
                            >
                              {doc.status}
                            </span>
                          </td>
                          <td className="px-3 py-1.5 text-slate-800 text-[11px]">
                            {doc.verifier?.name || "Security Desk"}
                          </td>
                          <td className="px-3 py-1.5 text-right font-mono text-slate-600 text-[10px]">
                            {doc.verifiedAt ? formatDateTime(doc.verifiedAt) : formatDateTime(doc.createdAt)}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="px-3 py-2 text-center text-slate-500 italic text-xs">
                          Standard gate pass verification completed at arrival check-post.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* ========================================================================= */}
            {/* SECTION 4: STATUS LIFECYCLE & MOVEMENT TIMELINE                           */}
            {/* ========================================================================= */}
            <div className="mb-5 print-avoid-break">
              <div className="bg-slate-900 text-white px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider rounded-t flex items-center justify-between">
                <span>Section 4: Lifecycle Movement & Status Audit Trail</span>
                <span className="text-[10px] font-normal text-slate-300">
                  Total Transitions: {statusLogs.length}
                </span>
              </div>
              <div className="border border-slate-300 border-t-0 rounded-b overflow-hidden">
                <table className="w-full text-xs text-left print-compact-table">
                  <thead className="bg-slate-100 border-b border-slate-300 text-[10px] uppercase font-bold text-slate-700">
                    <tr>
                      <th className="px-3 py-1.5 w-10 text-center">Stage</th>
                      <th className="px-3 py-1.5">Lifecycle Status</th>
                      <th className="px-3 py-1.5">Exact Date & Time</th>
                      <th className="px-3 py-1.5">Actioned By</th>
                      <th className="px-3 py-1.5">Operational Remarks & Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {statusLogs.map((log, idx) => (
                      <tr key={log.id || idx} className={idx % 2 === 1 ? "bg-slate-50/60" : "bg-white"}>
                        <td className="px-3 py-1.5 text-center font-mono font-bold text-slate-600">
                          {idx + 1}
                        </td>
                        <td className="px-3 py-1.5 font-bold text-slate-900">
                          <span className="inline-block px-2 py-0.5 rounded text-[10px] font-extrabold bg-slate-100 border border-slate-300 text-slate-900">
                            {formatStatus(log.status)}
                          </span>
                        </td>
                        <td className="px-3 py-1.5 font-mono text-slate-900 text-[11px] whitespace-nowrap">
                          {formatDateTime(log.timestamp)}
                        </td>
                        <td className="px-3 py-1.5 text-slate-700 text-[11px]">
                          {log.user?.name || log.updatedBy || entry.user?.name || "System Operator"}
                        </td>
                        <td className="px-3 py-1.5 text-slate-600 text-[11px]">
                          {log.remarks || "Status recorded successfully"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* ========================================================================= */}
            {/* SECTION 5: OFFICIAL ERP SIGN-OFF & AUTHORIZATIONS                         */}
            {/* ========================================================================= */}
            <div className="border border-slate-300 rounded p-3 bg-slate-50/50 print-avoid-break">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="space-y-6 pt-1">
                  <div className="text-[10px] uppercase font-bold text-slate-600">
                    Security Gate In-Charge
                  </div>
                  <div className="border-b border-slate-400 w-3/4 mx-auto pb-1 text-[10px] text-slate-400">
                    (Sign & Gate Stamp)
                  </div>
                  <div className="text-[9px] text-slate-500 font-mono">
                    Date: ____________________
                  </div>
                </div>

                <div className="space-y-6 pt-1 border-x border-slate-200">
                  <div className="text-[10px] uppercase font-bold text-slate-600">
                    Warehouse / Inward Supervisor
                  </div>
                  <div className="border-b border-slate-400 w-3/4 mx-auto pb-1 text-[10px] text-slate-400">
                    (Sign & Material Stamp)
                  </div>
                  <div className="text-[9px] text-slate-500 font-mono">
                    Date: ____________________
                  </div>
                </div>

                <div className="space-y-6 pt-1">
                  <div className="text-[10px] uppercase font-bold text-slate-600">
                    Vehicle Driver / Carrier
                  </div>
                  <div className="border-b border-slate-400 w-3/4 mx-auto pb-1 text-[10px] text-slate-400">
                    (Driver Signature / Thumb)
                  </div>
                  <div className="text-[9px] text-slate-500 font-mono">
                    Date: ____________________
                  </div>
                </div>
              </div>

              <div className="mt-3 pt-2 border-t border-slate-200 flex items-center justify-between text-[9px] text-slate-500">
                <span>
                  Authorized electronic transport manifest generated via Flexicom ERP Gate Management System.
                </span>
                <span className="font-mono">Page 1 of 1 • Internal Audit Copy</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
