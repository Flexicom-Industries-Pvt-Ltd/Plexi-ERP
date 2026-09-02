import { requirePermission } from "@/lib/permissions";
import { Module } from "@/generated/prisma";
import { Metadata } from "next";
import { BobbinProductionClient } from "./bobbin-production-client";

export const metadata: Metadata = {
  title: "Bobbin Production | Flexicom ERP",
  description: "Bobbin production execution — record input, output, scrap, and quality",
};

export const dynamic = "force-dynamic";

export default async function BobbinProductionPage() {
  await requirePermission(Module.PRODUCTION, "canRead");

  return (
    <div className="flex flex-col gap-6 p-6 lg:p-8 max-w-6xl mx-auto w-full">
      <BobbinProductionClient />
    </div>
  );
}
