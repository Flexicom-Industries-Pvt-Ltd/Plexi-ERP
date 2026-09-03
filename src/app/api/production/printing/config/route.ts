import { NextResponse } from "next/server";

import { getPrintingHelpersPerOperator } from "@/lib/production/printing-manpower";
import { requireProductionApiPermission } from "@/lib/production/permissions";

export const dynamic = "force-dynamic";

export async function GET() {
  const authResult = await requireProductionApiPermission("canRead");
  if (!authResult.ok) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  const helpersPerOperator = await getPrintingHelpersPerOperator();
  return NextResponse.json({
    helpersPerOperator,
    configKey: "PRINTING_HELPERS_PER_OPERATOR",
  });
}
