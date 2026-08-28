import { requirePermission } from "@/lib/permissions";
import { Module } from "@/generated/prisma";
import { Metadata } from "next";
import { GateReceiptsClient } from "./receipts-client";

export const metadata: Metadata = {
  title: "Gate Receipts | Flexicom ERP",
  description: "Verify and commit pending gate receipts into inventory",
};

export const dynamic = "force-dynamic";

export default async function GateReceiptsPage() {
  await requirePermission(Module.INVENTORY, "canRead");
  const canCreate = await requirePermission(Module.INVENTORY, "canCreate").then(() => true).catch(() => false);

  return (
    <div className="flex flex-col gap-6 p-6 lg:p-8 max-w-7xl mx-auto w-full">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Pending Gate Receipts</h1>
        <p className="text-sm text-slate-500 mt-1">
          Review incoming materials from the Security Gate and commit them to the physical inventory.
        </p>
      </div>

      <GateReceiptsClient canCreate={canCreate} />
    </div>
  );
}
