import { Suspense } from "react";
import { requirePermission } from "@/lib/permissions";
import { Module } from "@/generated/prisma";
import { Metadata } from "next";
import { ValvomaticDailyReportClient } from "@/components/valvomatic/ValvomaticDailyReportClient";

export const metadata: Metadata = {
  title: "Valvomatic Production Report | Flexicom ERP",
  description: "Shift-wise Valvomatic production tracking, bag cutting, meter readings, and waste analysis",
};

export const dynamic = "force-dynamic";

export default async function ValvomaticPage() {
  try {
    await requirePermission(Module.CONVERTEX, "canRead");
  } catch {
    await requirePermission(Module.PRODUCTION, "canRead");
  }

  return (
    <Suspense
      fallback={
        <div className="p-8 text-center text-slate-400">
          Loading Valvomatic Production Report...
        </div>
      }
    >
      <ValvomaticDailyReportClient />
    </Suspense>
  );
}
