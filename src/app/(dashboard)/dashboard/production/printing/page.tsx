import { requirePermission } from "@/lib/permissions";
import { Module } from "@/generated/prisma";
import { Metadata } from "next";
import { PrintingProductionClient } from "./printing-production-client";

export const metadata: Metadata = {
  title: "Printing Production | Flexicom ERP",
  description: "Pelican printing execution — input roll, helpers, ink consumption, and printed roll output",
};

export const dynamic = "force-dynamic";

export default async function PrintingProductionPage() {
  await requirePermission(Module.PRODUCTION, "canRead");

  return (
    <div className="flex flex-col gap-6 p-6 lg:p-8 max-w-7xl mx-auto w-full">
      <PrintingProductionClient />
    </div>
  );
}
