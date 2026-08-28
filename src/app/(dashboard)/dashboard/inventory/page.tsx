import { requirePermission } from "@/lib/permissions";
import { Module } from "@/generated/prisma";
import { Metadata } from "next";
import { InventoryDashboardClient } from "./inventory-dashboard-client";

export const metadata: Metadata = {
  title: "Inventory Dashboard | Flexicom ERP",
  description: "Overview of factory inventory and stock alerts",
};

export const dynamic = "force-dynamic";

export default async function InventoryDashboardPage() {
  await requirePermission(Module.INVENTORY, "canRead");

  return (
    <div className="flex flex-col gap-6 p-6 lg:p-8 max-w-7xl mx-auto w-full">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Inventory Dashboard</h1>
        <p className="text-sm text-slate-500 mt-1">
          Monitor your raw materials, WIP, finished goods, and pending gate receipts.
        </p>
      </div>

      <InventoryDashboardClient />
    </div>
  );
}
