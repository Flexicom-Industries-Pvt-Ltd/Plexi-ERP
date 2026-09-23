import { Metadata } from "next";
import { TapePlantRecipeClient } from "./tape-plant-recipe-client";

export const metadata: Metadata = {
  title: "Tape Plant Recipes | Data Centre",
  description: "Manage Tape Plant Recipe master formulas, specifications, and raw material compositions.",
};

export default function TapePlantRecipePage() {
  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <div>
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
            Data Centre
          </span>
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900 mt-1">
            Tape Plant Recipe Master
          </h2>
          <p className="text-xs md:text-sm text-slate-500 mt-1">
            Standard formulations, technical parameters, markings, and material composition percentages for Tape Plant extrusion planning.
          </p>
        </div>
      </div>

      <TapePlantRecipeClient />
    </div>
  );
}
