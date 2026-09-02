import { requirePermission } from "@/lib/permissions";
import { Module } from "@/generated/prisma";
import { Metadata } from "next";
import { ProductionDashboardClient } from "./production-dashboard-client";

export const metadata: Metadata = {
  title: "Production | Flexicom ERP",
  description: "Production planning and shift management",
};

export const dynamic = "force-dynamic";

export default async function ProductionPage() {
  await requirePermission(Module.PRODUCTION, "canRead");

  return (
    <div className="flex flex-col gap-6 p-6 lg:p-8 max-w-7xl mx-auto w-full">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Production</h1>
        <p className="text-sm text-slate-500 mt-1">
          Plan shifts, assign machines and operators, and define phase-specific roll characteristics.
        </p>
      </div>

      <ProductionDashboardClient />
    </div>
  );
}
