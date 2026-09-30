import { Suspense } from "react";
import { requirePermission } from "@/lib/permissions";
import { Module } from "@/generated/prisma";
import { Metadata } from "next";
import { ConvertexDailyReportClient } from "@/components/convertex/ConvertexDailyReportClient";

export const metadata: Metadata = {
  title: "Convertex Production Report | Flexicom ERP",
  description: "Shift-wise convertex production tracking, bag cutting, meter readings, and waste analysis",
};

export const dynamic = "force-dynamic";

export default async function ConvertexPage() {
  try {
    await requirePermission(Module.CONVERTEX, "canRead");
  } catch {
    await requirePermission(Module.PRODUCTION, "canRead");
  }

  return (
    <Suspense
      fallback={
        <div className="p-8 text-center text-slate-400">
          Loading Convertex Production Report...
        </div>
      }
    >
      <ConvertexDailyReportClient />
    </Suspense>
  );
}
