import { NextRequest, NextResponse } from "next/server";

import { getActiveFinishingRoutes } from "@/lib/production/finishing-route-defaults";
import { FINISHING_ROUTES } from "@/lib/production/finishing-routes";
import { requireProductionApiPermission } from "@/lib/production/permissions";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const authResult = await requireProductionApiPermission("canRead");
  if (!authResult.ok) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date") ?? undefined;

  const routes = await getActiveFinishingRoutes(date);
  const nav = FINISHING_ROUTES.filter((r) => routes.includes(r.value));

  return NextResponse.json({ routes, nav });
}
