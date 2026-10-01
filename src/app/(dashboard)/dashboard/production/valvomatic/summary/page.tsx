import { Suspense } from "react";
import { requirePermission } from "@/lib/permissions";
import { Module } from "@/generated/prisma";
import { Metadata } from "next";
import { ValvomaticProductionSummaryClient } from "@/components/valvomatic/ValvomaticProductionSummaryClient";

export const metadata: Metadata = {
  title: "Valvomatic Production & Wastage Summary | Flexicom ERP",
  description: "Executive summary and quality-wise performance tracking for Valvomatic machine operations",
};

export const dynamic = "force-dynamic";

export default async function ValvomaticSummaryPage() {
  try {
    await requirePermission(Module.CONVERTEX, "canRead");
  } catch {
    await requirePermission(Module.PRODUCTION, "canRead");
  }

  return (
    <Suspense
      fallback={
        <div className="p-8 text-center text-slate-400">
          Loading Valvomatic Production Summary...
        </div>
      }
    >
      <ValvomaticProductionSummaryClient />
    </Suspense>
  );
}
