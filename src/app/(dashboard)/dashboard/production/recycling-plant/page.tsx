import { Suspense } from "react";
import { requirePermission } from "@/lib/permissions";
import { Module } from "@/generated/prisma";
import { Metadata } from "next";
import { RecyclingPlantWorkspace } from "@/components/recycling/RecyclingPlantWorkspace";

export const metadata: Metadata = {
  title: "Recycling Plant (RP) | Flexicom ERP",
  description:
    "Digital Wastage Collection Report and R.P. Plant Production Report with shift-dynamic stock reconciliation",
};

export const dynamic = "force-dynamic";

export default async function RecyclingPlantPage() {
  try {
    await requirePermission(Module.RECYCLING_PLANT, "canRead");
  } catch {
    await requirePermission(Module.PRODUCTION, "canRead");
  }

  return (
    <Suspense
      fallback={
        <div className="p-8 text-center text-slate-400">
          Loading Recycling Plant workspace...
        </div>
      }
    >
      <RecyclingPlantWorkspace />
    </Suspense>
  );
}
