import { requirePermission } from "@/lib/permissions";
import { Module } from "@/generated/prisma";
import { Metadata } from "next";
import { CuttingProductionClient } from "./cutting-production-client";

export const metadata: Metadata = {
  title: "Cutting Production | Flexicom ERP",
  description: "Cutting execution — printed roll consumption and cut material output",
};

export const dynamic = "force-dynamic";

export default async function CuttingProductionPage() {
  await requirePermission(Module.PRODUCTION, "canRead");

  return (
    <div className="flex flex-col gap-6 p-6 lg:p-8 max-w-7xl mx-auto w-full">
      <CuttingProductionClient />
    </div>
  );
}
