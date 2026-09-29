import { Suspense } from "react";
import { requirePermission } from "@/lib/permissions";
import { Module } from "@/generated/prisma";
import { Metadata } from "next";
import { LaminationReportClient } from "@/components/lamination/LaminationReportClient";

export const metadata: Metadata = {
  title: "Lamination Production Report | Flexicom ERP",
  description: "Shift-based Lamination production tracking, roll stock consumption, and coating calculation",
};

export const dynamic = "force-dynamic";

export default async function LaminationPage() {
  try {
    await requirePermission(Module.LAMINATION, "canRead");
  } catch {
    await requirePermission(Module.PRODUCTION, "canRead");
  }

  return (
    <Suspense
      fallback={
        <div className="p-8 text-center text-slate-400">
          Loading Lamination Production Report...
        </div>
      }
    >
      <LaminationReportClient />
    </Suspense>
  );
}
