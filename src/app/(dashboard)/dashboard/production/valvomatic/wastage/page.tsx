import { Suspense } from "react";
import { requirePermission } from "@/lib/permissions";
import { Module } from "@/generated/prisma";
import { Metadata } from "next";
import { ValvomaticWastageClient } from "@/components/valvomatic/ValvomaticWastageClient";

export const metadata: Metadata = {
  title: "Valvomatic Wastage Report | Flexicom ERP",
  description: "Shift-wise Valvomatic wastage report, scrap stream analysis, and net production",
};

export const dynamic = "force-dynamic";

export default async function ValvomaticWastagePage() {
  try {
    await requirePermission(Module.CONVERTEX, "canRead");
  } catch {
    await requirePermission(Module.PRODUCTION, "canRead");
  }

  return (
    <Suspense
      fallback={
        <div className="p-8 text-center text-slate-400">
          Loading Valvomatic Wastage Report...
        </div>
      }
    >
      <ValvomaticWastageClient />
    </Suspense>
  );
}
