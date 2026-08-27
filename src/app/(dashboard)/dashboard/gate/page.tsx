import { requirePermission } from "@/lib/permissions";
import { Module } from "@/generated/prisma";
import { Metadata } from "next";
import { GateClient } from "./gate-client";

export const metadata: Metadata = {
  title: "Security & Gate Management | Flexicom ERP",
  description: "Manage truck entries, loading/unloading, and gate-outs",
};

export const dynamic = "force-dynamic";

export default async function GatePage() {
  await requirePermission(Module.SECURITY_GATE, "canRead");

  return (
    <div className="flex flex-col gap-6 p-6 lg:p-8 max-w-full mx-auto w-full">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
          Security & Gate Management
        </h1>
        <p className="text-muted-foreground">
          Track and manage truck lifecycle from arrival to gate-out.
        </p>
      </div>
      <GateClient />
    </div>
  );
}
