import { Suspense } from "react";
import { requirePermission } from "@/lib/permissions";
import { Module } from "@/generated/prisma";
import { Metadata } from "next";
import { PrintingProductionSummaryClient } from "@/components/printing/PrintingProductionSummaryClient";

export const metadata: Metadata = {
  title: "Printing Production Summary | Flexicom ERP",
  description: "Customer-wise printing, quality-wise printing, and total print meters executive summary and analytics.",
};

export const dynamic = "force-dynamic";

export default async function PrintingSummaryPage() {
  try {
    await requirePermission(Module.PRINTING, "canRead");
  } catch {
    await requirePermission(Module.PRODUCTION, "canRead");
  }

  return (
    <Suspense
      fallback={
        <div className="p-8 text-center text-slate-400">
          Loading Printing Production Summary...
        </div>
      }
    >
      <PrintingProductionSummaryClient />
    </Suspense>
  );
}
