"use client";

import React, { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { LayoutGrid, Factory, Boxes, Sparkles } from "lucide-react";
import { LoomSummarySection } from "@/components/loom/LoomSummarySection";

export type LoomTab = "summary";

const LOOM_TABS: { id: LoomTab; label: string; icon: React.ElementType }[] = [
  { id: "summary", label: "1. Loom Summary", icon: LayoutGrid },
];

export function LoomClient() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const tabParam = searchParams.get("tab") as LoomTab | null;
  const [activeTab, setActiveTab] = useState<LoomTab>(
    tabParam && LOOM_TABS.some((t) => t.id === tabParam) ? tabParam : "summary"
  );

  useEffect(() => {
    if (tabParam && LOOM_TABS.some((t) => t.id === tabParam)) {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  const handleTabChange = (tabId: LoomTab) => {
    setActiveTab(tabId);
    router.replace(`/dashboard/production/loom?tab=${tabId}`, { scroll: false });
  };

  return (
    <div className="space-y-5 p-4 sm:p-6 max-w-7xl mx-auto min-w-0">
      {/* Sub-Module Tabs Bar */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-2">
        {LOOM_TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => handleTabChange(tab.id)}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                isActive
                  ? "bg-slate-900 text-white shadow-xs"
                  : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Active Tab Content */}
      {activeTab === "summary" && <LoomSummarySection />}
    </div>
  );
}
