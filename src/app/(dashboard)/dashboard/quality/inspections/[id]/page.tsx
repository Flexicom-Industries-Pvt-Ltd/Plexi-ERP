import { requirePermission } from "@/lib/permissions";
import { Module } from "@/generated/prisma";
import { Metadata } from "next";
import { InspectionDetailClient } from "./inspection-detail-client";

export const metadata: Metadata = {
  title: "QC Inspection Certificate | Flexicom ERP",
  description: "Inspection details, quality characteristics test readings, and verdict certificate",
};

export const dynamic = "force-dynamic";

export default async function InspectionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePermission(Module.QUALITY_CONTROL, "canRead");
  const { id } = await params;
  return <InspectionDetailClient inspectionId={id} />;
}
