import { requirePermission } from "@/lib/permissions";
import { Module } from "@/generated/prisma";
import { Metadata } from "next";
import { BcsProductionClient } from "./bcs-production-client";

export const metadata: Metadata = {
  title: "BCS Production | Flexicom ERP",
  description: "BCS execution — multi-input roll, yarn, PP/LPP to finished bags with team",
};

export const dynamic = "force-dynamic";

export default async function BcsPage() {
  await requirePermission(Module.PRODUCTION, "canRead");

  return (
    <div className="flex flex-col gap-6 p-6 lg:p-8 max-w-7xl mx-auto w-full">
      <BcsProductionClient />
    </div>
  );
}
