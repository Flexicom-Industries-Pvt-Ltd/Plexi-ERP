import { requirePermission } from "@/lib/permissions";
import { Module } from "@/generated/prisma";
import { Metadata } from "next";
import { GateDetailsClient } from "./details-client";
import { findGateEntryByIdOrNumber } from "@/lib/gate/resolve-gate-entry";
import { GateBreadcrumb } from "@/components/layout/GateBreadcrumb";
import { notFound, redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Gate Entry Details | Flexicom ERP",
  description: "View and manage gate entry lifecycle",
};

export const dynamic = "force-dynamic";

export default async function GateDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requirePermission(Module.SECURITY_GATE, "canRead");

  const entry = await findGateEntryByIdOrNumber(id);
  if (!entry) notFound();

  if (entry.entryNumber !== id) {
    redirect(`/dashboard/gate/${entry.entryNumber}`);
  }

  return (
    <div className="flex flex-col gap-6 p-6 lg:p-8 max-w-7xl mx-auto w-full">
      <GateBreadcrumb entryNumber={entry.entryNumber} />
      <GateDetailsClient entryId={entry.entryNumber} />
    </div>
  );
}
