"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  RotateCw,
  ZoomIn,
  ZoomOut,
  Maximize2,
  CheckCircle,
  XCircle,
  AlertCircle,
  Download,
  Trash2,
  ExternalLink,
  FileText,
  User,
  Clock,
  ShieldCheck,
} from "lucide-react";
import { isPdfFile } from "@/lib/images/compress-image";

export interface GateDocumentLightboxProps {
  isOpen: boolean;
  onClose: () => void;
  document: {
    id: string;
    documentType: string;
    fileUrl?: string | null;
    status: string;
    remarks?: string | null;
    createdAt?: string | Date;
    verifiedAt?: string | Date | null;
    verifier?: { name?: string | null; email?: string | null } | null;
  } | null;
  canVerify?: boolean;
  onUpdateStatus?: (docId: string, status: string) => Promise<void>;
  onDelete?: (docId: string, docType: string) => Promise<void>;
}

export function GateDocumentLightbox({
  isOpen,
  onClose,
  document: doc,
  canVerify = true,
  onUpdateStatus,
  onDelete,
}: GateDocumentLightboxProps) {
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [rotationAngle, setRotationAngle] = useState<number>(0);
  const [actionLoading, setActionLoading] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      setZoomLevel(1);
      setRotationAngle(0);
      setActionLoading(false);
    }
  }, [isOpen, doc]);

  // Handle keyboard shortcuts (Esc to close)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !doc) return null;

  const isPdf = isPdfFile(doc.fileUrl || "");
  const hasFile = Boolean(doc.fileUrl && doc.fileUrl !== "local-check");

  const handleZoomIn = () => setZoomLevel((z) => Math.min(z + 0.25, 3));
  const handleZoomOut = () => setZoomLevel((z) => Math.max(z - 0.25, 0.5));
  const handleRotate = () => setRotationAngle((r) => (r + 90) % 360);
  const handleReset = () => {
    setZoomLevel(1);
    setRotationAngle(0);
  };

  const handleStatusChange = async (status: string) => {
    if (!onUpdateStatus) return;
    setActionLoading(true);
    try {
      await onUpdateStatus(doc.id, status);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!onDelete) return;
    setActionLoading(true);
    try {
      await onDelete(doc.id, doc.documentType);
      onClose();
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-950/90 backdrop-blur-md animate-in fade-in duration-200">
      {/* Top Navigation Bar */}
      <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 bg-slate-900/90 border-b border-slate-800 text-white shrink-0 z-20">
        <div className="flex items-center gap-3 min-w-0">
          <div className="p-2 bg-slate-800 rounded-lg text-primary shrink-0">
            <FileText className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-bold truncate">{doc.documentType}</h3>
              <span
                className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
                  doc.status === "VERIFIED"
                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                    : doc.status === "REJECTED"
                    ? "bg-red-500/20 text-red-300 border border-red-500/30"
                    : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                }`}
              >
                {doc.status}
              </span>
            </div>
            {doc.remarks && (
              <p className="text-xs text-slate-400 truncate max-w-md">{doc.remarks}</p>
            )}
          </div>
        </div>

        {/* Toolbar Controls */}
        <div className="flex items-center gap-2">
          {!isPdf && hasFile && (
            <div className="hidden sm:flex items-center gap-1 bg-slate-800/80 rounded-lg p-1 border border-slate-700/60 mr-2">
              <button
                type="button"
                onClick={handleZoomIn}
                className="p-1.5 hover:bg-slate-700 rounded text-slate-300 hover:text-white transition-colors"
                title="Zoom In"
              >
                <ZoomIn className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={handleZoomOut}
                className="p-1.5 hover:bg-slate-700 rounded text-slate-300 hover:text-white transition-colors"
                title="Zoom Out"
              >
                <ZoomOut className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={handleRotate}
                className="p-1.5 hover:bg-slate-700 rounded text-slate-300 hover:text-white transition-colors"
                title="Rotate 90° Clockwise"
              >
                <RotateCw className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={handleReset}
                className="p-1.5 hover:bg-slate-700 rounded text-slate-300 hover:text-white transition-colors"
                title="Reset View"
              >
                <Maximize2 className="h-4 w-4" />
              </button>
            </div>
          )}

          {hasFile && (
            <a
              href={doc.fileUrl!}
              target="_blank"
              rel="noreferrer"
              className="p-2 hover:bg-slate-800 rounded-lg text-slate-300 hover:text-white transition-colors flex items-center gap-1.5 text-xs font-semibold mr-1"
              title="Open full file in new window"
            >
              <ExternalLink className="h-4 w-4" />
              <span className="hidden md:inline">Open File</span>
            </a>
          )}

          <button
            type="button"
            onClick={onClose}
            className="p-2 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Main Viewport */}
      <div className="flex-1 overflow-auto flex items-center justify-center p-4 relative select-none">
        {hasFile ? (
          isPdf ? (
            <div className="w-full h-full max-w-4xl bg-white rounded-xl shadow-2xl overflow-hidden flex flex-col">
              <iframe src={doc.fileUrl!} className="w-full flex-1 border-0" title="PDF Document Viewer" />
            </div>
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={doc.fileUrl!}
              alt={doc.documentType}
              style={{
                transform: `scale(${zoomLevel}) rotate(${rotationAngle}deg)`,
                transition: "transform 0.15s ease-out",
              }}
              className="max-h-[75vh] max-w-[90vw] object-contain shadow-2xl rounded-lg"
            />
          )
        ) : (
          <div className="text-center p-8 bg-slate-900 border border-slate-800 rounded-2xl text-slate-400 max-w-sm">
            <AlertCircle className="h-10 w-10 text-amber-500 mx-auto mb-3" />
            <h4 className="text-white font-bold text-sm mb-1">Photo Pruned or Not Attached</h4>
            <p className="text-xs text-slate-400">
              The physical photo file has either been pruned per the 3-day retention policy or was logged without an attached image.
            </p>
          </div>
        )}
      </div>

      {/* Bottom Action & Verification Bar */}
      <div className="px-4 sm:px-6 py-3.5 bg-slate-900/95 border-t border-slate-800 text-white shrink-0 flex flex-col sm:flex-row items-center justify-between gap-3 z-20">
        <div className="flex items-center gap-3 text-xs text-slate-400 flex-wrap">
          {doc.verifier && (
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
              <span>
                {doc.status === "VERIFIED" ? "Verified" : "Reviewed"} by {doc.verifier.name}
              </span>
            </span>
          )}
          {doc.verifiedAt && (
            <span className="flex items-center gap-1 text-[11px] font-mono text-slate-500">
              <Clock className="h-3.5 w-3.5" />
              {new Date(doc.verifiedAt).toLocaleString()}
            </span>
          )}
        </div>

        {/* Action Buttons */}
        {canVerify && (
          <div className="flex items-center gap-2 flex-wrap">
            {doc.status !== "VERIFIED" && (
              <button
                type="button"
                disabled={actionLoading}
                onClick={() => handleStatusChange("VERIFIED")}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white rounded-lg font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
              >
                <CheckCircle className="h-3.5 w-3.5" /> Verify
              </button>
            )}
            {doc.status !== "REJECTED" && (
              <button
                type="button"
                disabled={actionLoading}
                onClick={() => handleStatusChange("REJECTED")}
                className="px-3.5 py-2 bg-red-600 hover:bg-red-500 active:scale-95 text-white rounded-lg font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
              >
                <XCircle className="h-3.5 w-3.5" /> Reject
              </button>
            )}
            {doc.status !== "UNDER_VERIFICATION" && (
              <button
                type="button"
                disabled={actionLoading}
                onClick={() => handleStatusChange("UNDER_VERIFICATION")}
                className="px-3.5 py-2 bg-amber-600 hover:bg-amber-500 active:scale-95 text-white rounded-lg font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
              >
                <Clock className="h-3.5 w-3.5" /> Reviewing
              </button>
            )}
            {onDelete && (
              <button
                type="button"
                disabled={actionLoading}
                onClick={handleDelete}
                className="px-3 py-2 bg-slate-800 hover:bg-red-950 hover:text-red-300 text-slate-400 rounded-lg font-semibold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Trash2 className="h-3.5 w-3.5" /> Delete
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
