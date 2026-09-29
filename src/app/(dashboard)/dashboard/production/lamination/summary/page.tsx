import { Suspense } from "react";
import { requirePermission } from "@/lib/permissions";
import { Module } from "@/generated/prisma";
import { Metadata } from "next";
import { LaminationProductionSummaryClient } from "@/components/lamination/LaminationProductionSummaryClient";

export const metadata: Metadata = {
  title: "Lamination Production Summary | Flexicom ERP",
  description: "Comprehensive contractor-wise, operator-wise, and quality-wise production analysis and reporting",
};

export const dynamic = "force-dynamic";

export default async function LaminationSummaryPage() {
  try {
    await requirePermission(Module.LAMINATION, "canRead");
  } catch {
    await requirePermission(Module.PRODUCTION, "canRead");
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <div>
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
            Lamination Module
          </span>
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900 mt-1">
            Production Summary & Analytics
          </h2>
          <p className="text-xs md:text-sm text-slate-500 mt-1">
            Aggregate shift performance, contractor volume, operator output, and quality metrics with export capabilities.
          </p>
        </div>
      </div>

      <Suspense
        fallback={
          <div className="p-8 text-center text-slate-400">
            Loading Lamination Production Summary...
          </div>
        }
      >
        <LaminationProductionSummaryClient />
      </Suspense>
    </div>
  );
}
