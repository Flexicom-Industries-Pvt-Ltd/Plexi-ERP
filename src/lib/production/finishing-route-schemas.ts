import type { FinishingRoute } from "@/generated/prisma";
import { z } from "zod";

import { FINISHING_ROUTES } from "./finishing-routes";

export const FinishingRouteEnum = z.enum(["CONVERTEX", "VALVOMATIC", "BCS", "MANUAL_STITCH"]);

export const FINISHING_ROUTE_VALUES = FINISHING_ROUTES.map((r) => r.value) as [
  FinishingRoute,
  ...FinishingRoute[],
];
