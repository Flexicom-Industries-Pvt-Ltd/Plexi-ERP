"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Minus, Square, Copy, X, ArrowDownToLine, Loader2 } from "lucide-react";
import { isElectron } from "@/lib/pwa/pwa-utils";

export interface UpdateStatus {
  state: "idle" | "checking" | "available" | "downloading" | "downloaded" | "error";
  version: string | null;
  percent: number;
  installerPath?: string | null;
  error?: string | null;
}

export interface ElectronWindowBridge {
  isElectron?: boolean;
  minimize?: () => Promise<void>;
  maximize?: () => Promise<void>;
  close?: () => Promise<void>;
  isMaximized?: () => Promise<boolean>;
  onMaximizedChange?: (callback: (isMaximized: boolean) => void) => () => void;
  checkForUpdates?: () => Promise<UpdateStatus>;
  getUpdateStatus?: () => Promise<UpdateStatus>;
  applyUpdate?: () => Promise<boolean>;
  onUpdateStatusChange?: (callback: (status: UpdateStatus) => void) => () => void;
}

export function DesktopTitleBar() {
  const [inElectron, setInElectron] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [updateStatus, setUpdateStatus] = useState<UpdateStatus>({
    state: "idle",
    version: null,
    percent: 0,
  });

  useEffect(() => {
    const runningInElectron = isElectron();
    setInElectron(runningInElectron);

    if (runningInElectron && typeof document !== "undefined") {
      document.documentElement.style.setProperty("--titlebar-height", "36px");
    }

    let unsubscribeMax: (() => void) | undefined;
    let unsubscribeUpd: (() => void) | undefined;

    if (runningInElectron && typeof window !== "undefined") {
      const electronBridge = (window as unknown as { electron?: ElectronWindowBridge }).electron;
      if (electronBridge?.isMaximized) {
        electronBridge.isMaximized().then(setIsMaximized).catch(() => {});
      }
      if (electronBridge?.onMaximizedChange) {
        unsubscribeMax = electronBridge.onMaximizedChange((maximized) => {
          setIsMaximized(maximized);
        });
      }

      if (electronBridge?.getUpdateStatus) {
        electronBridge.getUpdateStatus().then(setUpdateStatus).catch(() => {});
      }
      if (electronBridge?.onUpdateStatusChange) {
        unsubscribeUpd = electronBridge.onUpdateStatusChange((status) => {
          setUpdateStatus(status);
        });
      }
    }

    return () => {
      unsubscribeMax?.();
      unsubscribeUpd?.();
      if (typeof document !== "undefined") {
        document.documentElement.style.setProperty("--titlebar-height", "0px");
      }
    };
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

  const handleApplyUpdate = (e: React.MouseEvent) => {
    e.stopPropagation();
    getBridge()?.applyUpdate?.();
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

      {/* Right Controls Container */}
      <div
        style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
        className="flex h-full items-center gap-1.5 pr-0"
      >
        {/* Dynamic Auto-Updater UI */}
        {updateStatus.state === "downloading" && (
          <div
            className="flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-sky-50 border border-sky-200/80 text-sky-700 text-[11px] font-medium mr-1 shadow-2xs"
            title={`Downloading update: ${updateStatus.percent}%`}
            data-testid="updater-downloading-pill"
          >
            <Loader2 className="h-3 w-3 animate-spin text-sky-600" />
            <span className="tracking-tight">
              Updating {updateStatus.version ? `v${updateStatus.version}` : ""}{" "}
              <span className="font-semibold text-sky-800">{updateStatus.percent}%</span>
            </span>
            <div className="w-10 h-1.5 bg-sky-200/60 rounded-full overflow-hidden">
              <div
                className="h-full bg-sky-600 rounded-full transition-all duration-300"
                style={{ width: `${Math.max(5, updateStatus.percent)}%` }}
              />
            </div>
          </div>
        )}

        {updateStatus.state === "downloaded" && (
          <button
            type="button"
            onClick={handleApplyUpdate}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-[11px] font-semibold mr-1 shadow-xs transition-all cursor-pointer"
            title="Click to install update and restart application"
            data-testid="updater-restart-btn"
          >
            <ArrowDownToLine className="h-3 w-3 stroke-[2.5]" />
            <span>Restart &amp; Update {updateStatus.version ? `v${updateStatus.version}` : ""}</span>
          </button>
        )}

        {/* Window Controls */}
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
