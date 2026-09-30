import { Suspense } from "react";
import { requirePermission } from "@/lib/permissions";
import { Module } from "@/generated/prisma";
import { Metadata } from "next";
import { PrintingWastageClient } from "@/components/printing/PrintingWastageClient";

export const metadata: Metadata = {
  title: "Printing Wastage Report | Flexicom ERP",
  description: "Track lamination fabric waste (kg and %), print fabric waste (kg and %), and total wastage calculated against production.",
};

export const dynamic = "force-dynamic";

export default async function PrintingWastagePage() {
  try {
    await requirePermission(Module.PRINTING, "canRead");
  } catch {
    await requirePermission(Module.PRODUCTION, "canRead");
  }

  return (
    <Suspense
      fallback={
        <div className="p-8 text-center text-slate-400">
          Loading Printing Wastage Report...
        </div>
      }
    >
      <PrintingWastageClient />
    </Suspense>
  );
}
