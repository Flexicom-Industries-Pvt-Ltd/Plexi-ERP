import { requirePermission } from "@/lib/permissions";
import { Module } from "@/generated/prisma";
import { Metadata } from "next";
import { GateReceiptsClient } from "./receipts-client";
import { InventorySubNav } from "@/components/inventory/InventorySubNav";

export const metadata: Metadata = {
  title: "Pending Gate Receipts | Flexicom ERP",
  description: "Verify and reconcile pending gate receipts into inventory",
};

export const dynamic = "force-dynamic";

export default async function GateReceiptsPage() {
  await requirePermission(Module.INVENTORY, "canRead");
  const canCreate = await requirePermission(Module.INVENTORY, "canCreate").then(() => true).catch(() => false);

  return (
    <div className="flex flex-col gap-4 sm:gap-6 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full min-w-0">
      <div className="flex flex-col gap-3 sm:gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-800">Pending Gate Receipts</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Review gate consignment items from the Security Gate and reconcile physical quantities into inventory.
          </p>
        </div>
        <InventorySubNav />
      </div>

      <GateReceiptsClient canCreate={canCreate} />
    </div>
  );
}
