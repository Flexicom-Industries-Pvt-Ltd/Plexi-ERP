import { NextResponse } from "next/server";

import { getManpowerRules, PRINTING_KEY } from "@/lib/production/manpower-rules";
import { requireProductionApiPermission } from "@/lib/production/permissions";

export const dynamic = "force-dynamic";

export async function GET() {
  const authResult = await requireProductionApiPermission("canRead");
  if (!authResult.ok) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  const rules = await getManpowerRules();
  return NextResponse.json({
    helpersPerOperator: rules.printingHelpersPerOperator,
    configKey: PRINTING_KEY,
    loomsPerOperator: rules.loomsPerOperator,
  });
}
