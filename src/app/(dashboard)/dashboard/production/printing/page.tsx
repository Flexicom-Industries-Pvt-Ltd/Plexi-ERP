import { Suspense } from "react";
import { requirePermission } from "@/lib/permissions";
import { Module } from "@/generated/prisma";
import { Metadata } from "next";
import { PrintingDailyReportClient } from "@/components/printing/PrintingDailyReportClient";

export const metadata: Metadata = {
  title: "Printing Production Report | Flexicom ERP",
  description: "Shift-wise flexographic printing production tracking, roll consumption, and meters output",
};

export const dynamic = "force-dynamic";

export default async function PrintingPage() {
  try {
    await requirePermission(Module.PRINTING, "canRead");
  } catch {
    await requirePermission(Module.PRODUCTION, "canRead");
  }

  return (
    <Suspense
      fallback={
        <div className="p-8 text-center text-slate-400">
          Loading Printing Production Report...
        </div>
      }
    >
      <PrintingDailyReportClient />
    </Suspense>
  );
}
