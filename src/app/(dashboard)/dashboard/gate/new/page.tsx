import { requirePermission } from "@/lib/permissions";
import { Module } from "@/generated/prisma";
import { Metadata } from "next";
import { NewGateClient } from "./new-gate-client";

export const metadata: Metadata = {
  title: "New Gate Entry | Flexicom ERP",
  description: "Create a new gate entry for arriving trucks",
};

export const dynamic = "force-dynamic";

export default async function NewGatePage() {
  await requirePermission(Module.SECURITY_GATE, "canCreate");

  return (
    <div className="flex flex-col gap-4 sm:gap-6 p-0 sm:p-4 md:p-6 lg:p-8 max-w-4xl mx-auto w-full min-w-0">
      <div className="flex flex-col gap-1 sm:gap-2">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
          New Gate Entry
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground">
          Log a newly arrived truck into the factory premises.
        </p>
      </div>
      <NewGateClient />
    </div>
  );
}
