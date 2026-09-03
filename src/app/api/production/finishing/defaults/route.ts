import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import {
  getFinishingRouteDefaults,
  setFinishingRouteDefaults,
  resolveDefaultFinishingRoute,
} from "@/lib/production/finishing-route-defaults";
import { FinishingRouteEnum } from "@/lib/production/finishing-route-schemas";
import { FINISHING_ROUTES } from "@/lib/production/finishing-routes";
import { requireProductionApiPermission } from "@/lib/production/permissions";

export const dynamic = "force-dynamic";

const DefaultsBodySchema = z.record(z.string(), FinishingRouteEnum);

export async function GET(request: NextRequest) {
  const authResult = await requireProductionApiPermission("canRead");
  if (!authResult.ok) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  const { searchParams } = new URL(request.url);
  const categoryId = searchParams.get("categoryId");

  if (categoryId) {
    const route = await resolveDefaultFinishingRoute(categoryId);
    const meta = FINISHING_ROUTES.find((r) => r.value === route);
    return NextResponse.json({ categoryId, route, meta });
  }

  const defaults = await getFinishingRouteDefaults();
  return NextResponse.json({
    configKey: "FINISHING_ROUTE_DEFAULTS",
    defaults,
    routes: FINISHING_ROUTES,
  });
}

export async function PUT(request: NextRequest) {
  const authResult = await requireProductionApiPermission("canUpdate");
  if (!authResult.ok) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  try {
    const body = await request.json();
    const parsed = DefaultsBodySchema.safeParse(body.defaults ?? body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed", details: parsed.error.format() }, { status: 400 });
    }

    await setFinishingRouteDefaults(parsed.data, authResult.session.user.id);
    return NextResponse.json({ defaults: parsed.data });
  } catch (error) {
    console.error("Error saving finishing route defaults:", error);
    return NextResponse.json({ error: "Failed to save defaults" }, { status: 500 });
  }
}
