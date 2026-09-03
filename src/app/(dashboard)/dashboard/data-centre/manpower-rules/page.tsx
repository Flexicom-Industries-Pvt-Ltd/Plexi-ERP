import { requirePermission } from "@/lib/permissions";
import { Module } from "@/generated/prisma";
import { Metadata } from "next";
import { ManpowerRulesClient } from "./manpower-rules-client";

export const metadata: Metadata = {
  title: "Manpower Rules | Flexicom ERP",
  description: "Configure production loom and printing manpower rules",
};

export const dynamic = "force-dynamic";

export default async function ManpowerRulesPage() {
  await requirePermission(Module.DATA_CENTRE, "canRead");

  return (
    <div className="flex flex-col gap-6 p-6 lg:p-8 max-w-4xl mx-auto w-full">
      <ManpowerRulesClient />
    </div>
  );
}
