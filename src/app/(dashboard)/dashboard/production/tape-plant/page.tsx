import { Suspense } from "react";
import { requirePermission } from "@/lib/permissions";
import { Module } from "@/generated/prisma";
import { Metadata } from "next";
import { TapePlantClient } from "./tape-plant-client";

export const metadata: Metadata = {
  title: "Tape Plant Module | Plascom ERP",
  description: "End-to-end digitised tape plant planning, process temperature, drive parameters, raw material stock, post-production and reporting",
};

export const dynamic = "force-dynamic";

export default async function TapePlantPage() {
  await requirePermission(Module.PRODUCTION, "canRead");

  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-400">Loading Tape Plant workspace...</div>}>
      <TapePlantClient />
    </Suspense>
  );
}
