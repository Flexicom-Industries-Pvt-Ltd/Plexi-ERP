import { requirePermission } from "@/lib/permissions";
import { Module } from "@/generated/prisma";
import { Metadata } from "next";
import { ProductionReportsClient } from "./production-reports-client";

export const metadata: Metadata = {
  title: "Production Reports | Flexicom ERP",
  description: "Production analytics with planned vs actual, phase and operator breakdowns",
};

export const dynamic = "force-dynamic";

export default async function ProductionReportsPage() {
  await requirePermission(Module.PRODUCTION, "canRead");

  return (
    <div className="flex flex-col gap-6 p-6 lg:p-8 max-w-7xl mx-auto w-full">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Production Reports</h1>
        <p className="text-sm text-slate-500 mt-1">
          Planned vs actual output with phase, shift, machine, and operator breakdowns.
        </p>
      </div>

      <ProductionReportsClient />
    </div>
  );
}
