"use client";

import React, { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { LayoutGrid, ArrowRightLeft } from "lucide-react";
import { LoomSummarySection } from "@/components/loom/LoomSummarySection";
import { LoomChangeoverSection } from "@/components/loom/LoomChangeoverSection";

export type LoomTab = "summary" | "changeover";

export function LoomClient() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const tabParam = searchParams.get("tab") as LoomTab | null;
  const [activeTab, setActiveTab] = useState<LoomTab>(
    tabParam === "changeover" ? "changeover" : "summary"
  );

  useEffect(() => {
    if (tabParam === "changeover" || tabParam === "summary") {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  const handleTabChange = (tab: LoomTab) => {
    setActiveTab(tab);
    router.replace(`/dashboard/production/loom?tab=${tab}`, { scroll: false });
  };

  return (
    <div className="space-y-5 p-4 sm:p-6 max-w-7xl mx-auto min-w-0">
      {/* Top Module Sub-Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-2.5 rounded-xl border border-slate-200/90 shadow-2xs">
        <div className="inline-flex rounded-lg bg-slate-100 p-1 text-xs font-bold">
          <button
            type="button"
            onClick={() => handleTabChange("summary")}
            className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-md transition-all cursor-pointer ${
              activeTab === "summary"
                ? "bg-white text-slate-900 shadow-2xs font-bold"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <LayoutGrid className="h-4 w-4" />
            <span>1. Loom Summary & Live Allocations</span>
          </button>

          <button
            type="button"
            onClick={() => handleTabChange("changeover")}
            className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-md transition-all cursor-pointer ${
              activeTab === "changeover"
                ? "bg-white text-slate-900 shadow-2xs font-bold"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <ArrowRightLeft className="h-4 w-4" />
            <span>2. Loom Change Over Sheet</span>
          </button>
        </div>

        <div className="hidden sm:flex items-center gap-2 text-[11px] text-slate-500 pr-2 font-medium">
          <span>Factory Circular Looms #1–91</span>
        </div>
      </div>

      {/* Active Tab Content */}
      {activeTab === "summary" && <LoomSummarySection />}
      {activeTab === "changeover" && <LoomChangeoverSection />}
    </div>
  );
}
