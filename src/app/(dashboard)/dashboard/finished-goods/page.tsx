import { requirePermission } from "@/lib/permissions";
import { Module } from "@/generated/prisma";
import { Metadata } from "next";
import { FinishedGoodsClient } from "./finished-goods-client";

export const metadata: Metadata = {
  title: "Finished Goods Inventory | Plexi-ERP",
  description: "Finished goods stock management, bale promotion, and end-to-end multi-tier traceability",
};

export const dynamic = "force-dynamic";

export default async function FinishedGoodsPage() {
  await requirePermission(Module.FINISHED_GOODS, "canRead");
  return <FinishedGoodsClient />;
}

