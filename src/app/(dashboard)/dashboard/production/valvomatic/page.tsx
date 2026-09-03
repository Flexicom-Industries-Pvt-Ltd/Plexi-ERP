import { requirePermission } from "@/lib/permissions";
import { Module } from "@/generated/prisma";
import { Metadata } from "next";
import { FinishingRoutePlaceholder } from "@/components/production/FinishingRoutePlaceholder";

export const metadata: Metadata = {
  title: "Valvomatic | Flexicom ERP",
};

export const dynamic = "force-dynamic";

export default async function ValvomaticPage() {
  await requirePermission(Module.PRODUCTION, "canRead");
  return <FinishingRoutePlaceholder route="VALVOMATIC" executionIssue="P32" />;
}
