import type { FinishingRoute } from "@/generated/prisma";

export const FINISHING_ROUTES = [
  {
    value: "CONVERTEX" as const,
    label: "Convertex",
    description: "Cut material to finished bags via Convertex line (Ambuja / standard bag flow).",
    path: "/dashboard/production/convertex",
    phase: "CONVERTEX" as const,
  },
  {
    value: "VALVOMATIC" as const,
    label: "Valvomatic",
    description: "Multi-input finishing — roll, yarn, and PP/LPP combined on Valvomatic.",
    path: "/dashboard/production/valvomatic",
    phase: "VALVOMATIC" as const,
  },
  {
    value: "BCS" as const,
    label: "BCS",
    description: "Bottom-close seal finishing route for applicable bag types.",
    path: "/dashboard/production/bcs",
    phase: "BCS" as const,
  },
  {
    value: "MANUAL_STITCH" as const,
    label: "Manual Stitching",
    description: "Hand-stitched finishing when machine routes are not required.",
    path: "/dashboard/production/manual-stitch",
    phase: "MANUAL_STITCH" as const,
  },
] as const;

export type FinishingRouteValue = (typeof FINISHING_ROUTES)[number]["value"];

export const FINISHING_PHASES = FINISHING_ROUTES.map((r) => r.phase);

export function isFinishingPhase(phase: string): boolean {
  return (FINISHING_PHASES as readonly string[]).includes(phase);
}

export function finishingRouteLabel(route: string): string {
  return FINISHING_ROUTES.find((r) => r.value === route)?.label ?? route;
}

export function finishingRouteForPhase(phase: string): FinishingRouteValue | null {
  const match = FINISHING_ROUTES.find((r) => r.phase === phase);
  return match?.value ?? null;
}

export function phaseForFinishingRoute(route: FinishingRoute | string): string {
  return FINISHING_ROUTES.find((r) => r.value === route)?.phase ?? route;
}

export function finishingRouteDescription(route: string): string {
  return FINISHING_ROUTES.find((r) => r.value === route)?.description ?? "";
}
