import { requirePermission } from "@/lib/permissions";
import { Module } from "@/generated/prisma";
import { Metadata } from "next";
import { CharacteristicDefinitionsClient } from "./characteristics-client";

export const metadata: Metadata = {
  title: "Production Characteristics | Data Centre",
};

export const dynamic = "force-dynamic";

export default async function ProductionCharacteristicsPage() {
  await requirePermission(Module.PRODUCTION, "canRead");

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Production Characteristics</h2>
        <p className="text-sm text-slate-500 mt-1">
          Configure roll specs, colours, grades, and customer requirements per production phase.
        </p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <CharacteristicDefinitionsClient />
      </div>
    </div>
  );
}
