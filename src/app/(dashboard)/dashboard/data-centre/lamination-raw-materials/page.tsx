import { Metadata } from "next";
import { LaminationRawMaterialsClient } from "@/components/data-centre/LaminationRawMaterialsMasterClient";

export const metadata: Metadata = {
  title: "Lamination Raw Materials | Data Centre",
  description: "Configure standard lamination coating formulations, materials, and usage percentages.",
};

export default function LaminationRawMaterialsPage() {
  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <div>
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
            Data Centre
          </span>
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900 mt-1">
            Lamination Raw Material Master
          </h2>
          <p className="text-xs md:text-sm text-slate-500 mt-1">
            Standard coating material recipes, polymer grades, and default composition percentages for daily shift lamination.
          </p>
        </div>
      </div>

      <LaminationRawMaterialsClient />
    </div>
  );
}
