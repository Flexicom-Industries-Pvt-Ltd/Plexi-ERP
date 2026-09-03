import { requirePermission } from "@/lib/permissions";
import { Module } from "@/generated/prisma";
import { Metadata } from "next";
import { ValvomaticProductionClient } from "./valvomatic-production-client";

export const metadata: Metadata = {
  title: "Valvomatic Production | Flexicom ERP",
  description: "Valvomatic execution — multi-input roll, yarn, PP/LPP to finished bags",
};

export const dynamic = "force-dynamic";

export default async function ValvomaticPage() {
  await requirePermission(Module.PRODUCTION, "canRead");

  return (
    <div className="flex flex-col gap-6 p-6 lg:p-8 max-w-7xl mx-auto w-full">
      <ValvomaticProductionClient />
    </div>
  );
}
