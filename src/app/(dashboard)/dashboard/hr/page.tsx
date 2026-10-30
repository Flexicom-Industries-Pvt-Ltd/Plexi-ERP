import { Metadata } from "next";
import { HRAttendanceClient } from "@/components/hr/HRAttendanceClient";

export const metadata: Metadata = {
  title: "HR & Attendance | Time Office - Plexi-ERP",
  description: "Real-time Biometric Attendance and Time Office Management",
};

export default function HRAttendancePage() {
  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-slate-200/80 pb-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-900">
            HR & Time Office
          </h2>
          <p className="text-xs md:text-sm text-slate-500 mt-0.5">
            Real-time biometric attendance, dynamic shift schedules, and production headcount rollup.
          </p>
        </div>
      </div>

      <HRAttendanceClient />
    </div>
  );
}

