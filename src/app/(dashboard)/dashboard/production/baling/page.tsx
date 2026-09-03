import { requirePermission } from "@/lib/permissions";
import { Module } from "@/generated/prisma";
import { Metadata } from "next";
import { BalingProductionClient } from "./baling-production-client";

export const metadata: Metadata = {
  title: "Baling | Flexicom ERP",
  description: "Bundle finished bags into bales with batch and shift traceability",
};

export const dynamic = "force-dynamic";

export default async function BalingPage() {
  await requirePermission(Module.PRODUCTION, "canRead");

  return (
    <div className="flex flex-col gap-6 p-6 lg:p-8 max-w-7xl mx-auto w-full">
      <BalingProductionClient />
    </div>
  );
}
