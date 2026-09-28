"use client";

import React from "react";
import { useSearchParams } from "next/navigation";
import { LoomSummarySection } from "@/components/loom/LoomSummarySection";
import { LoomChangeoverSection } from "@/components/loom/LoomChangeoverSection";
import { LoomReadingSheetSection } from "@/components/loom/LoomReadingSheetSection";
import { LoomRollCuttingSection } from "@/components/loom/LoomRollCuttingSection";

export function LoomClient() {
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");

  return (
    <div className="space-y-5 p-4 sm:p-6 max-w-7xl mx-auto min-w-0">
      {tabParam === "changeover" ? (
        <LoomChangeoverSection />
      ) : tabParam === "reading-sheet" || tabParam === "2-hours" || tabParam === "reading" ? (
        <LoomReadingSheetSection />
      ) : tabParam === "roll-cutting" || tabParam === "cutting-report" ? (
        <LoomRollCuttingSection />
      ) : (
        <LoomSummarySection />
      )}
    </div>
  );
}

