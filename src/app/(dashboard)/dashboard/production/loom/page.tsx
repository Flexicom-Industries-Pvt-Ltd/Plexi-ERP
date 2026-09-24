import { Suspense } from "react";
import { requirePermission } from "@/lib/permissions";
import { Module } from "@/generated/prisma";
import { Metadata } from "next";
import { LoomClient } from "./loom-client";

export const metadata: Metadata = {
  title: "Circular Loom Section | Flexicom ERP",
  description: "Live Loom machine allocations, running tape plant qualities, and 1-91 factory floor matrix",
};

export const dynamic = "force-dynamic";

export default async function LoomPage() {
  await requirePermission(Module.LOOM, "canRead");


  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-400">Loading Loom section workspace...</div>}>
      <LoomClient />
    </Suspense>
  );
}
