import { requirePermission } from "@/lib/permissions";
import { Module } from "@/generated/prisma";
import { Metadata } from "next";
import { GateDetailsClient } from "./details-client";

export const metadata: Metadata = {
  title: "Gate Entry Details | Flexicom ERP",
  description: "View and manage gate entry lifecycle",
};

export const dynamic = "force-dynamic";

export default async function GateDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requirePermission(Module.SECURITY_GATE, "canRead");

  return (
    <div className="flex flex-col gap-6 p-6 lg:p-8 max-w-7xl mx-auto w-full">
      <GateDetailsClient entryId={id} />
    </div>
  );
}
