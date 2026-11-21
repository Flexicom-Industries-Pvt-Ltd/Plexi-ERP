"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Minus, Square, Copy, X } from "lucide-react";
import { isElectron } from "@/lib/pwa/pwa-utils";

interface ElectronWindowBridge {
  isElectron?: boolean;
  minimize?: () => Promise<void>;
  maximize?: () => Promise<void>;
  close?: () => Promise<void>;
  isMaximized?: () => Promise<boolean>;
  onMaximizedChange?: (callback: (isMaximized: boolean) => void) => () => void;
}

export function DesktopTitleBar() {
  const [inElectron, setInElectron] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);

  useEffect(() => {
    const runningInElectron = isElectron();
    setInElectron(runningInElectron);

    if (runningInElectron && typeof window !== "undefined") {
      const electronBridge = (window as unknown as { electron?: ElectronWindowBridge }).electron;
      if (electronBridge?.isMaximized) {
        electronBridge.isMaximized().then(setIsMaximized).catch(() => {});
      }
      if (electronBridge?.onMaximizedChange) {
        const unsubscribe = electronBridge.onMaximizedChange((maximized) => {
          setIsMaximized(maximized);
        });
        return () => {
          unsubscribe();
        };
      }
    }
  }, []);

  // Strictly render ONLY inside the Electron desktop shell (0px footprint in standard web/mobile)
  if (!inElectron) {
    return null;
  }

  const getBridge = (): ElectronWindowBridge | undefined => {
    if (typeof window === "undefined") return undefined;
    return (window as unknown as { electron?: ElectronWindowBridge }).electron;
  };

  const handleMinimize = (e: React.MouseEvent) => {
    e.stopPropagation();
    getBridge()?.minimize?.();
  };

  const handleMaximize = (e: React.MouseEvent) => {
    e.stopPropagation();
    getBridge()?.maximize?.();
  };

  const handleClose = (e: React.MouseEvent) => {
    e.stopPropagation();
    getBridge()?.close?.();
  };

  const handleDoubleClick = () => {
    getBridge()?.maximize?.();
  };

  return (
    <div
      style={{ WebkitAppRegion: "drag" } as React.CSSProperties}
      onDoubleClick={handleDoubleClick}
      className="sticky top-0 z-50 flex h-9 w-full shrink-0 select-none items-center justify-between border-b border-border/50 bg-white/95 backdrop-blur-md text-slate-800 transition-colors"
      data-testid="desktop-titlebar"
    >
      {/* Left: Branding & Identifier */}
      <div
        style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
        className="flex items-center gap-2 pl-3 pr-2"
      >
        <div className="relative flex h-4 w-4 shrink-0 items-center justify-center">
          <Image
            src="/icon-192x192.png"
            alt="Plexi ERP"
            width={16}
            height={16}
            className="object-contain"
          />
        </div>
        <span className="text-xs font-semibold tracking-tight text-slate-900">
          Plexi ERP
        </span>
        <span className="text-[10px] text-slate-400 font-medium hidden sm:inline">
          | Central Factory System
        </span>
      </div>

      {/* Center: Draggable Spacer */}
      <div className="flex-1 h-full flex items-center justify-center" />

      {/* Right: Custom Native-Feel Window Controls */}
      <div
        style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
        className="flex h-full items-center"
      >
        {/* Minimize Button */}
        <button
          type="button"
          onClick={handleMinimize}
          className="flex h-full w-11 items-center justify-center text-slate-600 hover:bg-slate-100 hover:text-slate-900 active:bg-slate-200 transition-colors"
          title="Minimize"
          aria-label="Minimize Window"
          data-testid="window-minimize-btn"
        >
          <Minus className="h-3.5 w-3.5 stroke-[2]" />
        </button>

        {/* Maximize / Restore Button */}
        <button
          type="button"
          onClick={handleMaximize}
          className="flex h-full w-11 items-center justify-center text-slate-600 hover:bg-slate-100 hover:text-slate-900 active:bg-slate-200 transition-colors"
          title={isMaximized ? "Restore" : "Maximize"}
          aria-label={isMaximized ? "Restore Window" : "Maximize Window"}
          data-testid="window-maximize-btn"
        >
          {isMaximized ? (
            <Copy className="h-3 w-3 stroke-[1.8] rotate-90" />
          ) : (
            <Square className="h-3 w-3 stroke-[1.8]" />
          )}
        </button>

        {/* Close Button (Crimson Red on Hover) */}
        <button
          type="button"
          onClick={handleClose}
          className="flex h-full w-12 items-center justify-center text-slate-600 hover:bg-red-500 hover:text-white active:bg-red-600 transition-colors"
          title="Close"
          aria-label="Close Window"
          data-testid="window-close-btn"
        >
          <X className="h-3.5 w-3.5 stroke-[2]" />
        </button>
      </div>
    </div>
  );
}
