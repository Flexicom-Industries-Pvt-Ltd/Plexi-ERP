import { Suspense } from "react";
import { requirePermission } from "@/lib/permissions";
import { Module } from "@/generated/prisma";
import { Metadata } from "next";
import { ConvertexWastageClient } from "@/components/convertex/ConvertexWastageClient";

export const metadata: Metadata = {
  title: "Convertex Wastage Report | Flexicom ERP",
  description: "Shift-wise convertex roll wastage tracking, scrap streams, and net production accounting",
};

export const dynamic = "force-dynamic";

export default async function ConvertexWastagePage() {
  try {
    await requirePermission(Module.CONVERTEX, "canRead");
  } catch {
    await requirePermission(Module.PRODUCTION, "canRead");
  }

  return (
    <Suspense
      fallback={
        <div className="p-8 text-center text-slate-400">
          Loading Convertex Wastage Report...
        </div>
      }
    >
      <ConvertexWastageClient />
    </Suspense>
  );
}
