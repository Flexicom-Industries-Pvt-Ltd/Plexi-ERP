"use client";

import React, { useState, useEffect } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { format } from "date-fns";
import { Recycle, ClipboardList, Factory, FolderArchive } from "lucide-react";
import { cn } from "@/lib/utils";
import { WastageCollectionSheet } from "./WastageCollectionSheet";
import { RpProductionSheet } from "./RpProductionSheet";
import { RpReportsRegister } from "./RpReportsRegister";

type RpTab = "wastage" | "production" | "history";

export function RecyclingPlantWorkspace() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const urlTab = searchParams.get("tab") as RpTab | null;
  const [activeTab, setActiveTab] = useState<RpTab>(
    urlTab === "production" || urlTab === "history" ? urlTab : "wastage"
  );
  const [selectedDate, setSelectedDate] = useState<string>(
    format(new Date(), "yyyy-MM-dd")
  );

  useEffect(() => {
    if (urlTab === "wastage" || urlTab === "production" || urlTab === "history") {
      setActiveTab(urlTab);
    }
  }, [urlTab]);

  const handleTabChange = (tab: RpTab) => {
    setActiveTab(tab);
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", tab);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const handleOpenFromRegister = (tab: "wastage" | "production", date: string) => {
    setSelectedDate(date);
    handleTabChange(tab);
  };

  return (
    <div className="space-y-4 max-w-[1600px] mx-auto">
      {/* Minimalist Page Header + Tab Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-xl bg-slate-900 text-white flex items-center justify-center shrink-0">
            <Recycle className="h-4.5 w-4.5" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900 tracking-tight leading-none">
              Recycling Plant (RP)
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Wastage Collection &amp; Granule Production Daily Sheets
            </p>
          </div>
        </div>

        <div className="inline-flex p-1 rounded-xl bg-slate-200/70 border border-slate-200/80 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => handleTabChange("wastage")}
            className={cn(
              "inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer",
              activeTab === "wastage"
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            )}
          >
            <ClipboardList className="h-3.5 w-3.5" />
            <span>Wastage Collection</span>
          </button>
          <button
            type="button"
            onClick={() => handleTabChange("production")}
            className={cn(
              "inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer",
              activeTab === "production"
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            )}
          >
            <Factory className="h-3.5 w-3.5" />
            <span>RP Plant Production</span>
          </button>
          <button
            type="button"
            onClick={() => handleTabChange("history")}
            className={cn(
              "inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer",
              activeTab === "history"
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            )}
          >
            <FolderArchive className="h-3.5 w-3.5" />
            <span>Register</span>
          </button>
        </div>
      </div>

      {/* Active View */}
      {activeTab === "wastage" && (
        <WastageCollectionSheet
          selectedDate={selectedDate}
          onDateChange={setSelectedDate}
        />
      )}
      {activeTab === "production" && (
        <RpProductionSheet
          selectedDate={selectedDate}
          onDateChange={setSelectedDate}
        />
      )}
      {activeTab === "history" && (
        <RpReportsRegister onOpenSheet={handleOpenFromRegister} />
      )}
    </div>
  );
}
