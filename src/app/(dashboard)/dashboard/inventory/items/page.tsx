import { requirePermission } from "@/lib/permissions";
import { Module } from "@/generated/prisma";
import { Metadata } from "next";
import { InventoryItemsClient } from "./items-client";

export const metadata: Metadata = {
  title: "Inventory Items | Flexicom ERP",
  description: "Manage inventory items and stock limits",
};

export const dynamic = "force-dynamic";

export default async function InventoryItemsPage() {
  await requirePermission(Module.INVENTORY, "canRead");
  const canCreate = await requirePermission(Module.INVENTORY, "canCreate").then(() => true).catch(() => false);
  const canUpdate = await requirePermission(Module.INVENTORY, "canUpdate").then(() => true).catch(() => false);
  const canDelete = await requirePermission(Module.INVENTORY, "canDelete").then(() => true).catch(() => false);

  return (
    <div className="flex flex-col gap-4 sm:gap-6 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full min-w-0">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-800">Inventory Items</h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Master data for raw materials, WIP, and finished goods.
        </p>
      </div>

      <InventoryItemsClient 
        canCreate={canCreate} 
        canUpdate={canUpdate} 
        canDelete={canDelete} 
      />
    </div>
  );
}
