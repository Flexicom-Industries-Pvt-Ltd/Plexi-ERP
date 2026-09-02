import { requirePermission } from "@/lib/permissions";
import { Module } from "@/generated/prisma";
import { Metadata } from "next";
import { LoomProductionClient } from "./loom-production-client";

export const metadata: Metadata = {
  title: "Loom Production | Flexicom ERP",
  description: "Loom assignment, weaving execution, bobbin issue, and roll output",
};

export const dynamic = "force-dynamic";

export default async function LoomProductionPage() {
  await requirePermission(Module.PRODUCTION, "canRead");

  return (
    <div className="flex flex-col gap-6 p-6 lg:p-8 max-w-7xl mx-auto w-full">
      <LoomProductionClient />
    </div>
  );
}
