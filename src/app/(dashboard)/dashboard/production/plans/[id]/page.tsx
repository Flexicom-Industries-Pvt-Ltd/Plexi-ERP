import { requirePermission } from "@/lib/permissions";
import { Module } from "@/generated/prisma";
import { Metadata } from "next";
import { PlanDetailClient } from "./plan-detail-client";

export const metadata: Metadata = {
  title: "Plan Detail | Production | Flexicom ERP",
};

export const dynamic = "force-dynamic";

export default async function PlanDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePermission(Module.PRODUCTION, "canRead");
  const { id } = await params;

  return (
    <div className="flex flex-col gap-6 p-6 lg:p-8 max-w-5xl mx-auto w-full">
      <PlanDetailClient planNumber={id} />
    </div>
  );
}
