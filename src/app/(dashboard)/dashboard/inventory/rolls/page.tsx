import { requirePermission } from "@/lib/permissions";
import { Module } from "@/generated/prisma";
import { Metadata } from "next";
import { SpecialtyStockView } from "../specialty-stock-client";

export const metadata: Metadata = {
  title: "Roll Stock | Flexicom ERP",
  description: "PP, LPP, laminated and printed roll inventory",
};

export const dynamic = "force-dynamic";

export default async function RollStockPage() {
  await requirePermission(Module.INVENTORY, "canRead");

  return (
    <div className="flex flex-col gap-6 p-6 lg:p-8 max-w-7xl mx-auto w-full">
      <SpecialtyStockView
        title="Roll Stock"
        description="PP, LPP, laminated and printed roll inventory levels."
        materialTypes={["PP_ROLLS", "LPP_ROLLS", "LAMINATED_ROLLS", "PRINTED_ROLLS"]}
      />
    </div>
  );
}
