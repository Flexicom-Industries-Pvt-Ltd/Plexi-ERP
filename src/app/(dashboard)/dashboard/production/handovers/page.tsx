import { requirePermission } from "@/lib/permissions";
import { Module } from "@/generated/prisma";
import { Metadata } from "next";
import { HandoversClient } from "./handovers-client";

export const metadata: Metadata = {
  title: "Shift Handover | Production | Flexicom ERP",
};

export const dynamic = "force-dynamic";

export default async function HandoversPage() {
  await requirePermission(Module.PRODUCTION, "canRead");

  return (
    <div className="flex flex-col gap-6 p-6 lg:p-8 max-w-6xl mx-auto w-full">
      <HandoversClient />
    </div>
  );
}
