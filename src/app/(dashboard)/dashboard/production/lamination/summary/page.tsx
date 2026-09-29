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
    <Suspense
      fallback={
        <div className="p-8 text-center text-slate-400">
          Loading Lamination Production Summary...
        </div>
      }
    >
      <LaminationProductionSummaryClient />
    </Suspense>
  );
}
