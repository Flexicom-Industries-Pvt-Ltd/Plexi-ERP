import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { finishingRouteDescription, finishingRouteLabel } from "@/lib/production/finishing-routes";
import type { FinishingRoute } from "@/generated/prisma";

type Props = {
  route: FinishingRoute;
  executionIssue: string;
};

export function FinishingRoutePlaceholder({ route, executionIssue }: Props) {
  return (
    <div className="space-y-6 p-6 lg:p-8 max-w-3xl mx-auto w-full">
      <Link href="/dashboard/production" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-primary">
        <ArrowLeft className="h-4 w-4" /> Production
      </Link>
      <div className="bg-white border border-slate-200 rounded-xl p-8 space-y-4">
        <h1 className="text-2xl font-bold text-slate-800">{finishingRouteLabel(route)}</h1>
        <p className="text-sm text-slate-600">{finishingRouteDescription(route)}</p>
        <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-4">
          Execution UI for this route is scheduled in {executionIssue}. The finishing route engine (P30) is active —
          assign this route on shift plan lines to enable it in production navigation when plans are approved.
        </p>
        <Link href="/dashboard/production/plans" className="text-sm text-primary font-medium hover:underline">
          Go to Shift Plans →
        </Link>
      </div>
    </div>
  );
}
