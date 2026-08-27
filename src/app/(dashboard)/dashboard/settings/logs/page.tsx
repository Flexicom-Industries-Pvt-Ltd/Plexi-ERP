import { requirePermission } from "@/lib/permissions";
import { Module } from "@/generated/prisma";
import { Metadata } from "next";
import { LogsClient } from "./logs-client";

export const metadata: Metadata = {
  title: "System Logs | Flexicom ERP",
  description: "Enterprise audit trail and system event log viewer",
};

export const dynamic = "force-dynamic";

export default async function LogsPage() {
  await requirePermission(Module.SETTINGS, "canRead");

  return (
    <div className="flex flex-col gap-6 p-6 lg:p-8 max-w-full mx-auto w-full">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
          System Logs
        </h1>
        <p className="text-muted-foreground">
          Enterprise audit trail — track every request, event, and data change across the system.
        </p>
      </div>
      <LogsClient />
    </div>
  );
}
