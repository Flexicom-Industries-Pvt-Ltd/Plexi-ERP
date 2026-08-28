import { requirePermission } from "@/lib/permissions";
import { Module } from "@/generated/prisma";
import { Metadata } from "next";
import { TransactionsClient } from "./transactions-client";

export const metadata: Metadata = {
  title: "Inventory Ledger | Flexicom ERP",
  description: "Immutable ledger of all stock movements and adjustments",
};

export const dynamic = "force-dynamic";

export default async function InventoryTransactionsPage() {
  await requirePermission(Module.INVENTORY, "canRead");

  return (
    <div className="flex flex-col gap-6 p-6 lg:p-8 max-w-7xl mx-auto w-full">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Inventory Ledger</h1>
        <p className="text-sm text-slate-500 mt-1">
          Immutable audit trail of all IN, OUT, and ADJUSTMENT stock movements.
        </p>
      </div>

      <TransactionsClient />
    </div>
  );
}
