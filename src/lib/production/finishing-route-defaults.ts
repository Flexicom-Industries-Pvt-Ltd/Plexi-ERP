import { db } from "@/lib/db";
import type { FinishingRoute } from "@/generated/prisma";

const CONFIG_KEY = "FINISHING_ROUTE_DEFAULTS";

export type FinishingRouteDefaults = Record<string, FinishingRoute>;

export async function getFinishingRouteDefaults(): Promise<FinishingRouteDefaults> {
  const config = await db.configParameter.findUnique({ where: { key: CONFIG_KEY } });
  if (!config?.value) return {};
  try {
    const parsed = JSON.parse(config.value) as FinishingRouteDefaults;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export async function setFinishingRouteDefaults(defaults: FinishingRouteDefaults, updatedBy?: string) {
  const existing = await db.configParameter.findUnique({ where: { key: CONFIG_KEY } });
  const value = JSON.stringify(defaults);
  if (existing) {
    return db.configParameter.update({
      where: { key: CONFIG_KEY },
      data: { value, updatedBy },
    });
  }
  return db.configParameter.create({
    data: {
      key: CONFIG_KEY,
      value,
      description: "Default finishing route per item category ID (CONVERTEX, VALVOMATIC, BCS, MANUAL_STITCH)",
      updatedBy,
    },
  });
}

export async function resolveDefaultFinishingRoute(categoryId?: string | null): Promise<FinishingRoute | null> {
  if (!categoryId) return null;
  const defaults = await getFinishingRouteDefaults();
  return defaults[categoryId] ?? null;
}

export async function getActiveFinishingRoutes(date?: string): Promise<FinishingRoute[]> {
  const day = date ? new Date(date) : new Date();
  day.setHours(0, 0, 0, 0);
  const dayEnd = new Date(day);
  dayEnd.setHours(23, 59, 59, 999);

  const lines = await db.productionPlanLine.findMany({
    where: {
      finishingRoute: { not: null },
      plan: {
        status: { in: ["APPROVED", "IN_PROGRESS"] },
        planDate: { gte: day, lte: dayEnd },
      },
    },
    select: { finishingRoute: true },
    distinct: ["finishingRoute"],
  });

  return lines.map((l) => l.finishingRoute!).filter(Boolean);
}
