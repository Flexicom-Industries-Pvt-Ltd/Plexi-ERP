import { Suspense } from "react";
import { requirePermission } from "@/lib/permissions";
import { Module } from "@/generated/prisma";
import { Metadata } from "next";
import { ConvertexProductionSummaryClient } from "@/components/convertex/ConvertexProductionSummaryClient";

export const metadata: Metadata = {
  title: "Convertex Production Summary | Flexicom ERP",
  description: "Quality-wise convertex production aggregation, scrap stream breakdown, and executive reports",
};

export const dynamic = "force-dynamic";

export default async function ConvertexSummaryPage() {
  try {
    await requirePermission(Module.CONVERTEX, "canRead");
  } catch {
    await requirePermission(Module.PRODUCTION, "canRead");
  }

  return (
    <Suspense
      fallback={
        <div className="p-8 text-center text-slate-400">
          Loading Convertex Production Summary...
        </div>
      }
    >
      <ConvertexProductionSummaryClient />
    </Suspense>
  );
}
