import { Suspense } from "react";
import { requirePermission } from "@/lib/permissions";
import { Module } from "@/generated/prisma";
import { Metadata } from "next";
import { LaminationRawMaterialEntryClient } from "@/components/lamination/LaminationRawMaterialEntryClient";

export const metadata: Metadata = {
  title: "Lamination Raw Material Entry | Flexicom ERP",
  description: "Shift-based raw material consumption tracking, recipe percentages, machine readings, and difference reconciliation",
};

export const dynamic = "force-dynamic";

export default async function LaminationRawMaterialsPage() {
  try {
    await requirePermission(Module.LAMINATION, "canRead");
  } catch {
    await requirePermission(Module.PRODUCTION, "canRead");
  }

  return (
    <Suspense
      fallback={
        <div className="p-8 text-center text-slate-400">
          Loading Lamination Raw Material Entry...
        </div>
      }
    >
      <LaminationRawMaterialEntryClient />
    </Suspense>
  );
}
