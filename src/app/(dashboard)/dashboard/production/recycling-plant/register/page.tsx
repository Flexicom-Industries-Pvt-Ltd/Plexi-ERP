import { Suspense } from "react";
import { requirePermission } from "@/lib/permissions";
import { Module } from "@/generated/prisma";
import { Metadata } from "next";
import { RpReportsRegister } from "@/components/recycling/RpReportsRegister";

export const metadata: Metadata = {
  title: "Reports Register | Recycling Plant | Flexicom ERP",
  description:
    "Historical register of Wastage Collection and R.P. Plant Production daily reports",
};

export const dynamic = "force-dynamic";

export default async function RecyclingRegisterPage() {
  try {
    await requirePermission(Module.RECYCLING_PLANT, "canRead");
  } catch {
    await requirePermission(Module.PRODUCTION, "canRead");
  }

  return (
    <Suspense
      fallback={
        <div className="p-8 text-center text-slate-400">
          Loading Recycling Plant Register...
        </div>
      }
    >
      <RpReportsRegister />
    </Suspense>
  );
}
