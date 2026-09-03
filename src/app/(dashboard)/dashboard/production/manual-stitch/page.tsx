import { requirePermission } from "@/lib/permissions";
import { Module } from "@/generated/prisma";
import { Metadata } from "next";
import { FinishingRoutePlaceholder } from "@/components/production/FinishingRoutePlaceholder";

export const metadata: Metadata = {
  title: "Manual Stitching | Flexicom ERP",
};

export const dynamic = "force-dynamic";

export default async function ManualStitchPage() {
  await requirePermission(Module.PRODUCTION, "canRead");
  return <FinishingRoutePlaceholder route="MANUAL_STITCH" executionIssue="P34" />;
}
