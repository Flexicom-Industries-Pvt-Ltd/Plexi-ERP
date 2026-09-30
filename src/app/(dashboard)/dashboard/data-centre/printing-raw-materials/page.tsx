import { Metadata } from "next";
import { PrintingRawMaterialsClient } from "./printing-raw-materials-client";

export const metadata: Metadata = {
  title: "Printing Raw Materials | Data Centre",
  description: "Register and manage inks, solvents, density conversion factors (0.82 Litre to Kg), target mileages, and ratios for flexo printing.",
};

export default function PrintingRawMaterialsPage() {
  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <div>
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
            Data Centre
          </span>
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900 mt-1">
            Printing Raw Materials
          </h2>
          <p className="text-xs md:text-sm text-slate-500 mt-1">
            Configure ink and solvent raw materials with density factor (1 Litre = 0.82 Kg), target mileage, and default ratio percentages.
          </p>
        </div>
      </div>

      <PrintingRawMaterialsClient />
    </div>
  );
}
