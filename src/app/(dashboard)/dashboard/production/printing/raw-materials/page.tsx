import { Suspense } from "react";
import { requirePermission } from "@/lib/permissions";
import { Module } from "@/generated/prisma";
import { Metadata } from "next";
import { PrintingRawMaterialEntryClient } from "@/components/printing/PrintingRawMaterialEntryClient";

export const metadata: Metadata = {
  title: "Printing Raw Material Entry | Flexicom ERP",
  description: "Track shift-wise printing raw materials, inks, solvents, 0.82 density conversion, mileage and ratios.",
};

export const dynamic = "force-dynamic";

export default async function PrintingRawMaterialPage() {
  try {
    await requirePermission(Module.PRINTING, "canRead");
  } catch {
    await requirePermission(Module.PRODUCTION, "canRead");
  }

  return (
    <Suspense
      fallback={
        <div className="p-8 text-center text-slate-400">
          Loading Printing Raw Material Entry...
        </div>
      }
    >
      <PrintingRawMaterialEntryClient />
    </Suspense>
  );
}
