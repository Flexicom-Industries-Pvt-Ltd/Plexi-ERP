import { requirePermission } from "@/lib/permissions";
import { Module } from "@/generated/prisma";
import { Metadata } from "next";
import { RollsClient } from "./rolls-client";

export const metadata: Metadata = {
  title: "Roll Stock | Flexicom ERP",
  description: "PP and LPP production roll catalog with traceability",
};

export const dynamic = "force-dynamic";

export default async function ProductionRollsPage() {
  await requirePermission(Module.PRODUCTION, "canRead");
  return <RollsClient />;
}
