"use client";

import Link from "next/link";
import {
  AlertTriangle,
  FileText,
  Package,
  X,
  ArrowRight,
  ShieldAlert,
  ExternalLink,
} from "lucide-react";

export interface GateBlockerModalData {
  entryNumber: string;
  truckNumber: string;
  purpose?: string;
  message?: string;
  unverifiedDocuments?: Array<{
    id: string;
    documentType: string;
    status: string;
    remarks?: string | null;
  }>;
  uncommittedStock?: Array<{
    id: string;
    materialName: string;
    quantity: number;
    unit: string;
    batchLot?: string | null;
  }>;
}

interface GateBlockerModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: GateBlockerModalData | null;
}

export function GateBlockerModal({ isOpen, onClose, data }: GateBlockerModalProps) {
  if (!isOpen || !data) return null;

  const docs = data.unverifiedDocuments || [];
  const stock = data.uncommittedStock || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150"
        role="dialog"
        aria-modal="true"
      >
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-start justify-between bg-amber-50/60 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-100 text-amber-800 rounded-xl shrink-0">
              <ShieldAlert className="h-6 w-6" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base sm:text-lg">
                Gate Out Clearance Blocked
              </h3>
              <p className="text-xs text-slate-500 font-mono mt-0.5">
                Truck: <span className="font-bold text-slate-800">{data.truckNumber}</span> • Entry:{" "}
                <span className="font-bold text-slate-800">{data.entryNumber}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
            title="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4 overflow-y-auto flex-1">
          {/* Main Notice */}
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 text-xs text-slate-600 flex items-start gap-2.5">
            <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              This vehicle cannot depart the factory premises. All required documents must be
              verified and consignment stock must be reconciled before final exit clearance.
            </p>
          </div>

          {/* Pending Documents Section */}
          {docs.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <FileText className="h-4 w-4 text-amber-600" />
                  <span>Unverified Documents ({docs.length})</span>
                </h4>
                <Link
                  href={`/dashboard/gate/${data.entryNumber}?tab=documents`}
                  onClick={onClose}
                  className="text-xs font-semibold text-primary hover:underline inline-flex items-center gap-1"
                >
                  <span>Review in Entry</span>
                  <ExternalLink className="h-3 w-3" />
                </Link>
              </div>

              <div className="bg-slate-50 rounded-xl p-3 border border-slate-200/80 divide-y divide-slate-100">
                {docs.map((doc) => (
                  <div key={doc.id} className="py-2 first:pt-0 last:pb-0 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-800 truncate">{doc.documentType}</p>
                      {doc.remarks && <p className="text-[11px] text-slate-500 truncate">{doc.remarks}</p>}
                    </div>
                    <span
                      className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full shrink-0 ${
                        doc.status === "REJECTED"
                          ? "bg-red-100 text-red-700 border border-red-200"
                          : "bg-amber-100 text-amber-700 border border-amber-200"
                      }`}
                    >
                      {doc.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Pending Stock Section */}
          {stock.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Package className="h-4 w-4 text-blue-600" />
                  <span>Consignment Items Pending Inward ({stock.length})</span>
                </h4>
                <Link
                  href="/dashboard/inventory/gate-receipts"
                  onClick={onClose}
                  className="text-xs font-semibold text-primary hover:underline inline-flex items-center gap-1"
                >
                  <span>Open Gate Receipts</span>
                  <ExternalLink className="h-3 w-3" />
                </Link>
              </div>

              <div className="bg-slate-50 rounded-xl p-3 border border-slate-200/80 divide-y divide-slate-100">
                {stock.map((item) => (
                  <div key={item.id} className="py-2 first:pt-0 last:pb-0 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-800 truncate">{item.materialName}</p>
                      {item.batchLot && (
                        <p className="text-[11px] text-slate-500 font-mono">Lot: {item.batchLot}</p>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-xs font-bold text-slate-800">
                        {item.quantity} {item.unit}
                      </span>
                      <span className="block text-[10px] font-semibold text-amber-600">Pending Inward</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {docs.length === 0 && stock.length === 0 && (
            <p className="text-xs text-slate-600 font-medium">
              {data.message || "Entry status cannot be advanced until operational prerequisites are met."}
            </p>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3.5 border-t border-slate-100 bg-slate-50 flex items-center justify-between gap-2 shrink-0">
          <Link
            href={`/dashboard/gate/${data.entryNumber}`}
            onClick={onClose}
            className="text-xs sm:text-sm font-semibold text-slate-700 hover:text-slate-900 px-3 py-2 rounded-lg hover:bg-slate-200/60 transition-colors inline-flex items-center gap-1"
          >
            <span>Open Gate Entry</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs sm:text-sm font-bold bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors shadow-xs cursor-pointer"
          >
            Understood
          </button>
        </div>
      </div>
    </div>
  );
}

