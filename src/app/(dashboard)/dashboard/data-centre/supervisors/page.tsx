import { Metadata } from "next";
import { SupervisorsClient } from "./supervisors-client";

export const metadata: Metadata = {
  title: "Supervisors | Data Centre",
  description: "Register and manage floor supervisors and shift in-charge personnel across factory production lines.",
};

export default function SupervisorsPage() {
  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <div>
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
            Data Centre
          </span>
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900 mt-1">
            Supervisor Master
          </h2>
          <p className="text-xs md:text-sm text-slate-500 mt-1">
            Register and manage plant floor supervisors, shift in-charge personnel, department assignments, and sheet attribution.
          </p>
        </div>
      </div>

      <SupervisorsClient />
    </div>
  );
}
