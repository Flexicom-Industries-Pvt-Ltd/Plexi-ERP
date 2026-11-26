import { Suspense } from "react";
import { requirePermission } from "@/lib/permissions";
import { Module } from "@/generated/prisma";
import { Metadata } from "next";
import { RpProductionSheet } from "@/components/recycling/RpProductionSheet";

export const metadata: Metadata = {
  title: "RP Plant Production Report | Recycling Plant | Flexicom ERP",
  description:
    "Daily R.P. Plant granule production, issued to Tape Plant, lumps and closing stock ledger",
};

export const dynamic = "force-dynamic";

export default async function RecyclingProductionPage() {
  try {
    await requirePermission(Module.RECYCLING_PLANT, "canRead");
  } catch {
    await requirePermission(Module.PRODUCTION, "canRead");
  }

  return (
    <Suspense
      fallback={
        <div className="p-8 text-center text-slate-400">
          Loading R.P. Plant Production Report...
        </div>
      }
    >
      <RpProductionSheet />
    </Suspense>
  );
}
