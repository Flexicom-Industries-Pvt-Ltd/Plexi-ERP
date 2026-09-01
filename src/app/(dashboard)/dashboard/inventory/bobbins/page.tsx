import { requirePermission } from "@/lib/permissions";
import { Module } from "@/generated/prisma";
import { Metadata } from "next";
import { SpecialtyStockView } from "../specialty-stock-client";

export const metadata: Metadata = {
  title: "Bobbin Stock | Flexicom ERP",
  description: "Bobbin inventory stock levels",
};

export const dynamic = "force-dynamic";

export default async function BobbinStockPage() {
  await requirePermission(Module.INVENTORY, "canRead");

  return (
    <div className="flex flex-col gap-6 p-6 lg:p-8 max-w-7xl mx-auto w-full">
      <SpecialtyStockView
        title="Bobbin Stock"
        description="Inventory items linked to bobbin materials from the stock catalog."
        materialTypes={["BOBBINS"]}
      />
    </div>
  );
}
