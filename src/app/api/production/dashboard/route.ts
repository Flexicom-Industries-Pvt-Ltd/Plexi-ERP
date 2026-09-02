import { NextRequest, NextResponse } from "next/server";
import { registry } from "@/lib/openapi";
import { requireProductionApiPermission } from "@/lib/production/permissions";
import { getProductionDashboardData } from "@/lib/production/dashboard-stats";

export const dynamic = "force-dynamic";

registry.registerPath({
  method: "get",
  path: "/api/production/dashboard",
  summary: "Production dashboard aggregates",
  description: "Today's target, actual, achievement, phase/shift/machine breakdown, delayed plans",
  tags: ["Production"],
  security: [{ cookieAuth: [] }],
  responses: {
    200: { description: "Dashboard data" },
    401: { description: "Unauthorized" },
    403: { description: "Forbidden" },
  },
});

export async function GET(request: NextRequest) {
  const authResult = await requireProductionApiPermission("canRead");
  if (!authResult.ok) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  const { searchParams } = new URL(request.url);
  const dateParam = searchParams.get("date");
  const date = dateParam ? new Date(dateParam) : new Date();

  try {
    const data = await getProductionDashboardData(date);
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching production dashboard:", error);
    return NextResponse.json({ error: "Failed to fetch production dashboard" }, { status: 500 });
  }
}
