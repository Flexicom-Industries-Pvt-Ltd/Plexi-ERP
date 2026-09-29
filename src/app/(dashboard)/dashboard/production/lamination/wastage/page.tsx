import { Suspense } from "react";
import { requirePermission } from "@/lib/permissions";
import { Module } from "@/generated/prisma";
import { Metadata } from "next";
import { LaminationWastageClient } from "@/components/lamination/LaminationWastageClient";

export const metadata: Metadata = {
  title: "Lamination Wastage Report | Flexicom ERP",
  description: "Shift-based Lamination lumps and fabric wastage tracking with percentage calculations",
};

export const dynamic = "force-dynamic";

export default async function LaminationWastagePage() {
  try {
    await requirePermission(Module.LAMINATION, "canRead");
  } catch {
    await requirePermission(Module.PRODUCTION, "canRead");
  }

  return (
    <Suspense
      fallback={
        <div className="p-8 text-center text-slate-400">
          Loading Lamination Wastage Report...
        </div>
      }
    >
      <LaminationWastageClient />
    </Suspense>
  );
}
