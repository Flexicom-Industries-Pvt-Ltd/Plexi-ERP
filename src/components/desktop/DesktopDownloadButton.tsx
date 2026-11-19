"use client";

import { useEffect, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { Download, Monitor, CheckCircle, X } from "lucide-react";
import Image from "next/image";
import { isMobileOrIos, isElectron } from "@/lib/pwa/pwa-utils";

interface DesktopDownloadButtonProps {
  variant?: "sidebar" | "header" | "button";
  className?: string;
}

export function DesktopDownloadButton({ variant = "sidebar", className = "" }: DesktopDownloadButtonProps) {
  const [mounted, setMounted] = useState(false);
  const [isMobile, setIsMobile] = useState(true);
  const [inElectron, setInElectron] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    setMounted(true);
    const { isMobile: mobile } = isMobileOrIos();
    setIsMobile(mobile);
    setInElectron(isElectron());
  }, []);

  const closeModal = useCallback(() => {
    setIsModalOpen(false);
    setIsDownloading(false);
  }, []);

  // Close modal on Escape key press
  useEffect(() => {
    if (!isModalOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        closeModal();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isModalOpen, closeModal]);

  // Strict enforcement: NEVER render on mobile devices, tablets, or if already inside Electron
  if (!mounted || isMobile || inElectron) {
    return null;
  }

  const handleDownloadClick = () => {
    setIsModalOpen(true);
  };

  const handleDirectDownload = () => {
    setIsDownloading(true);
    const link = document.createElement("a");
    link.href = "/api/desktop/download";
    link.setAttribute("download", "Plexi-ERP-Setup.exe");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Auto-close after download is triggered
    setTimeout(() => {
      closeModal();
    }, 1800);
  };

  const modalContent = isModalOpen && typeof document !== "undefined" ? (
    <div
      className="fixed inset-0 z-[99999] bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
      onClick={closeModal}
    >
      <div
        className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-5 animate-in zoom-in-95 duration-200 relative z-[100000]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-slate-50 p-1.5 rounded-xl border border-slate-200/80 shadow-2xs h-12 w-12 flex items-center justify-center relative">
              <Image
                src="/icon-192x192.png"
                alt="Plexi ERP Logo"
                width={40}
                height={40}
                className="object-contain"
              />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900 tracking-tight">Plexi ERP for Windows</h3>
              <p className="text-xs text-slate-500">Dedicated factory desktop application</p>
            </div>
          </div>
          <button
            onClick={closeModal}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-2.5 text-xs text-slate-600 bg-slate-50/80 p-3.5 rounded-xl border border-slate-200/60">
          <div className="flex items-start gap-2.5">
            <CheckCircle className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
            <span>
              <strong className="text-slate-900 font-semibold">True Native Software Shell:</strong> Browser menu strip (File/Edit/View) stripped for a clean software experience.
            </span>
          </div>
          <div className="flex items-start gap-2.5">
            <CheckCircle className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
            <span>
              <strong className="text-slate-900 font-semibold">Direct Peripheral Support:</strong> Optimized for factory receipt, gate pass, and report printing.
            </span>
          </div>
          <div className="flex items-start gap-2.5">
            <CheckCircle className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
            <span>
              <strong className="text-slate-900 font-semibold">Offline Network Resilience:</strong> Automatic background reconnection if the factory intranet drops.
            </span>
          </div>
        </div>

        <div className="pt-2 flex items-center justify-end gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={closeModal}
            className="h-9 px-4 text-xs font-medium text-slate-600 hover:text-slate-900"
          >
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleDirectDownload}
            disabled={isDownloading}
            className="h-9 px-4 text-xs font-semibold bg-sky-500 hover:bg-sky-600 text-white flex items-center gap-1.5 shadow-sm"
          >
            <Download className="h-4 w-4" />
            <span>{isDownloading ? "Starting Download..." : "Download Installer (.exe)"}</span>
          </Button>
        </div>
      </div>
    </div>
  ) : null;

  return (
    <>
      {variant === "sidebar" && (
        <button
          onClick={handleDownloadClick}
          className={`hidden md:flex items-center gap-2.5 w-full px-3 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 bg-slate-100/80 hover:bg-slate-200/80 border border-slate-200/60 rounded-lg transition-all duration-200 group ${className}`}
          title="Download Plexi ERP Desktop App for Windows"
        >
          <div className="flex shrink-0 items-center justify-center p-1 bg-white rounded-md shadow-2xs border border-slate-200 group-hover:scale-105 transition-transform">
            <Monitor className="h-3.5 w-3.5 text-sky-600" />
          </div>
          <div className="flex flex-col text-left truncate">
            <span className="font-semibold text-slate-900 leading-tight">Desktop App</span>
            <span className="text-[10px] text-slate-500 leading-tight">Windows (.exe)</span>
          </div>
          <Download className="h-3 w-3 text-slate-400 group-hover:text-slate-700 ml-auto shrink-0 transition-colors" />
        </button>
      )}

      {variant === "header" && (
        <Button
          onClick={handleDownloadClick}
          variant="outline"
          size="sm"
          className={`hidden md:inline-flex items-center gap-1.5 h-8 px-2.5 text-xs font-medium text-slate-700 border-slate-200 hover:bg-slate-100 ${className}`}
          title="Download Windows Desktop App"
        >
          <Monitor className="h-3.5 w-3.5 text-sky-600" />
          <span>Desktop App</span>
        </Button>
      )}

      {variant === "button" && (
        <Button
          onClick={handleDownloadClick}
          size="sm"
          className={`hidden md:inline-flex items-center gap-2 bg-sky-500 hover:bg-sky-600 text-white font-medium text-xs h-8 px-3 rounded-lg shadow-sm ${className}`}
        >
          <Download className="h-3.5 w-3.5" />
          <span>Download for Windows</span>
        </Button>
      )}

      {/* Render modal directly in document.body via Portal to escape all stacking contexts */}
      {modalContent && createPortal(modalContent, document.body)}
    </>
  );
}
