"use client";

import React, { useEffect, useState } from "react";
import { ProductionSyncUser } from "@/lib/realtime/production-bus";
import { UserCheck, Radio } from "lucide-react";

interface RealtimeSyncBadgeProps {
  isConnected: boolean;
  lastUpdatedBy?: ProductionSyncUser | null;
  lastUpdatedAt?: Date | null;
  lastAction?: string | null;
  isSelfUpdate?: boolean;
  className?: string;
}

export function RealtimeSyncBadge({
  isConnected,
  lastUpdatedBy,
  lastUpdatedAt,
  lastAction = "Saved",
  isSelfUpdate = false,
  className = "",
}: RealtimeSyncBadgeProps) {
  const [, setTicker] = useState(0);

  // Update relative time string every 5 seconds
  useEffect(() => {
    if (!lastUpdatedAt) return;
    const interval = setInterval(() => {
      setTicker((prev) => prev + 1);
    }, 5000);
    return () => clearInterval(interval);
  }, [lastUpdatedAt]);

  const formatRelativeTime = (date: Date): string => {
    const diffSec = Math.floor((Date.now() - date.getTime()) / 1000);
    if (diffSec < 5) return "just now";
    if (diffSec < 60) return `${diffSec}s ago`;
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHr = Math.floor(diffMin / 60);
    return `${diffHr}h ago`;
  };

  return (
    <div
      className={`hidden md:inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-[11px] font-medium border transition-all duration-300 ${
        isConnected
          ? "bg-slate-50/90 border-slate-200/90 text-slate-700 shadow-2xs"
          : "bg-amber-50/70 border-amber-200/70 text-amber-700"
      } ${className}`}
      title={
        isConnected
          ? "Live synchronization active • updates appear in real-time"
          : "Reconnecting to live sync..."
      }
    >
      {/* Live status dot */}
      <span className="relative flex h-2 w-2 shrink-0">
        {isConnected ? (
          <>
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </>
        ) : (
          <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-400" />
        )}
      </span>

      {/* Sync State / Attribution */}
      {lastUpdatedBy ? (
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-slate-400 font-normal">
            {lastAction === "SAVE" || lastAction === "UPDATE" ? "Updated" : lastAction}
          </span>
          <span className="font-semibold text-slate-900 truncate max-w-[130px]">
            {isSelfUpdate ? "You" : lastUpdatedBy.name || "Operator"}
          </span>
          {lastUpdatedBy.role && !isSelfUpdate && (
            <span className="text-[9.5px] uppercase tracking-wider px-1 py-0.2 rounded bg-slate-200/70 text-slate-600 font-bold shrink-0">
              {lastUpdatedBy.role}
            </span>
          )}
          {lastUpdatedAt && (
            <span className="text-slate-400 text-[10px] shrink-0">
              • {formatRelativeTime(lastUpdatedAt)}
            </span>
          )}
        </div>
      ) : (
        <span className="text-slate-500 font-normal flex items-center gap-1">
          <Radio className="w-3 h-3 text-emerald-500 shrink-0" />
          <span>Live Sync</span>
        </span>
      )}
    </div>
  );
}
