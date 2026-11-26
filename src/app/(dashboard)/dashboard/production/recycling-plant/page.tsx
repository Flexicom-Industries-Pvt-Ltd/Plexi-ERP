import { Suspense } from "react";
import { requirePermission } from "@/lib/permissions";
import { Module } from "@/generated/prisma";
import { Metadata } from "next";
import { WastageCollectionSheet } from "@/components/recycling/WastageCollectionSheet";

export const metadata: Metadata = {
  title: "Wastage Collection Report | Recycling Plant | Flexicom ERP",
  description:
    "Digital Wastage Collection Report with dynamic shifts, bobbin cleaning, segregation and note reconciliation",
};

export const dynamic = "force-dynamic";

export default async function RecyclingWastageCollectionPage() {
  try {
    await requirePermission(Module.RECYCLING_PLANT, "canRead");
  } catch {
    await requirePermission(Module.PRODUCTION, "canRead");
  }

  return (
    <Suspense
      fallback={
        <div className="p-8 text-center text-slate-400">
          Loading Wastage Collection Report...
        </div>
      }
    >
      <WastageCollectionSheet />
    </Suspense>
  );
}
