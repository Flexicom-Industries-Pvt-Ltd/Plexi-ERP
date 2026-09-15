import { requirePermission } from "@/lib/permissions";
import { Module } from "@/generated/prisma";
import { Metadata } from "next";
import { RecyclingClient } from "./recycling-client";

export const metadata: Metadata = {
  title: "Recycling Plant | Flexicom ERP",
  description: "Reprocess production scrap into high-grade RP granules with yield tracking and inventory re-entry",
};

export const dynamic = "force-dynamic";

export default async function RecyclingPage() {
  await requirePermission(Module.RECYCLING_PLANT, "canRead");
  return <RecyclingClient />;
}
