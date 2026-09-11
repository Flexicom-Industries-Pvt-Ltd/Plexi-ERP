import { requirePermission } from "@/lib/permissions";
import { Module } from "@/generated/prisma";
import { Metadata } from "next";
import { db } from "@/lib/db";
import { getGateStats } from "@/lib/gate/get-gate-stats";
import { GateClient } from "./gate-client";

export const metadata: Metadata = {
  title: "Security & Gate Management | Flexicom ERP",
  description: "Manage truck entries, loading/unloading, and gate-outs",
};

export const dynamic = "force-dynamic";

export default async function GatePage() {
  await requirePermission(Module.SECURITY_GATE, "canRead");

  const [initialEntries, initialStats] = await Promise.all([
    db.gateEntry.findMany({
      orderBy: { arrivalTime: "desc" },
      include: {
        stockDetails: true,
      },
    }),
    getGateStats(),
  ]);

  return (
    <div className="flex flex-col gap-6 w-full">
      <div className="flex flex-col gap-1.5">
        <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
          Security & Gate Management
        </h1>
        <p className="text-muted-foreground">
          Track and manage truck lifecycle from arrival to gate-out.
        </p>
      </div>
      <GateClient
        initialEntries={JSON.parse(JSON.stringify(initialEntries))}
        initialStats={initialStats}
      />
    </div>
  );
}
