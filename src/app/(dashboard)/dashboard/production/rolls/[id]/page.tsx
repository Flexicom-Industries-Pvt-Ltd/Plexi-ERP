import { requirePermission } from "@/lib/permissions";
import { Module } from "@/generated/prisma";
import { Metadata } from "next";
import { RollDetailClient } from "./roll-detail-client";

export const metadata: Metadata = {
  title: "Roll Detail | Flexicom ERP",
};

export const dynamic = "force-dynamic";

export default async function ProductionRollDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePermission(Module.PRODUCTION, "canRead");
  const { id } = await params;
  return <RollDetailClient rollId={id} />;
}
