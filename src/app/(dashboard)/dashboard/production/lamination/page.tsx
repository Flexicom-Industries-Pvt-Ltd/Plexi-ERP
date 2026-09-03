import { requirePermission } from "@/lib/permissions";
import { Module } from "@/generated/prisma";
import { Metadata } from "next";
import { LaminationProductionClient } from "./lamination-production-client";

export const metadata: Metadata = {
  title: "Lamination Production | Flexicom ERP",
  description: "Lamination execution — input roll consumption and laminated roll output",
};

export const dynamic = "force-dynamic";

export default async function LaminationProductionPage() {
  await requirePermission(Module.PRODUCTION, "canRead");

  return (
    <div className="flex flex-col gap-6 p-6 lg:p-8 max-w-7xl mx-auto w-full">
      <LaminationProductionClient />
    </div>
  );
}
