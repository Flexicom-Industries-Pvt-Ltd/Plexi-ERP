"use client";

import React, { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { shareReportPdfViaWhatsApp } from "@/lib/shared/whatsapp-share";

interface WhatsAppShareButtonProps {
  getHtml: () => string;
  fileName: string;
  title: string;
  message?: string;
  label?: string;
  className?: string;
}

/**
 * Unified "Send via WhatsApp" button for all ERP Print Preview modals.
 * Generates the A4 PDF lazily on click and opens the platform-optimal WhatsApp flow.
 */
export function WhatsAppShareButton({
  getHtml,
  fileName,
  title,
  message,
  label = "Send via WhatsApp",
  className,
}: WhatsAppShareButtonProps) {
  const [isSharing, setIsSharing] = useState(false);

  const handleClick = async () => {
    if (isSharing) return;
    setIsSharing(true);
    try {
      await shareReportPdfViaWhatsApp({
        getHtml,
        fileName,
        title,
        message,
      });
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to prepare PDF for WhatsApp"
      );
    } finally {
      setIsSharing(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isSharing}
      title="Generate A4 PDF and share via WhatsApp"
      className={
        className ||
        "inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-[#25D366] hover:bg-[#1ebe5b] disabled:opacity-60 text-slate-950 transition-colors shadow-xs cursor-pointer"
      }
    >
      {isSharing ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" />
      ) : (
        <svg
          viewBox="0 0 24 24"
          className="h-3.5 w-3.5 fill-current shrink-0"
          aria-hidden="true"
        >
          <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38c1.45.79 3.08 1.21 4.79 1.21 5.46 0 9.91-4.45 9.91-9.91C21.95 6.45 17.5 2 12.04 2Zm5.77 14.07c-.24.68-1.41 1.3-1.95 1.38-.5.08-1.14.11-1.84-.11-.43-.14-.98-.32-1.69-.63-2.97-1.28-4.91-4.28-5.06-4.48-.15-.2-1.21-1.61-1.21-3.07 0-1.46.76-2.18 1.03-2.48.27-.3.59-.37.79-.37h.57c.18 0 .43-.07.67.51.24.59.84 2.04.91 2.19.08.15.13.33.03.53-.1.2-.15.33-.3.5-.15.17-.31.38-.44.51-.15.15-.3.31-.13.61.17.3.77 1.27 1.65 2.06 1.14 1.01 2.1 1.33 2.4 1.48.3.15.48.13.66-.08.18-.2.76-.88.96-1.18.2-.3.4-.25.67-.15.27.1 1.74.82 2.04.97.3.15.5.22.57.35.08.13.08.74-.16 1.42Z" />
        </svg>
      )}
      <span>{isSharing ? "Preparing PDF..." : label}</span>
    </button>
  );
}
