import { requirePermission } from "@/lib/permissions";
import { Module } from "@/generated/prisma";
import { Metadata } from "next";
import { ManualStitchProductionClient } from "./manual-stitch-production-client";

export const metadata: Metadata = {
  title: "Manual Stitching Production | Flexicom ERP",
  description: "Manual stitching execution — workers, cut material to finished bags",
};

export const dynamic = "force-dynamic";

export default async function ManualStitchPage() {
  await requirePermission(Module.PRODUCTION, "canRead");

  return (
    <div className="flex flex-col gap-6 p-6 lg:p-8 max-w-7xl mx-auto w-full">
      <ManualStitchProductionClient />
    </div>
  );
}
