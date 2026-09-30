import { Metadata } from "next";
import { PartyPrintingClient } from "./party-printing-client";

export const metadata: Metadata = {
  title: "Party Printing Details | Data Centre",
  description: "Register and manage customer parties, units, grades, and cylinder drum sizes for flexo printing.",
};

export default function PartyPrintingPage() {
  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <div>
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
            Data Centre
          </span>
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900 mt-1">
            Party Printing Details
          </h2>
          <p className="text-xs md:text-sm text-slate-500 mt-1">
            Maintain party master specifications including company name, unit, grade, and cylinder drum size for automated report fill and lookup.
          </p>
        </div>
      </div>

      <PartyPrintingClient />
    </div>
  );
}
