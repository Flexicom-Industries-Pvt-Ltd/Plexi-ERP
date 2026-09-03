import { NextRequest, NextResponse } from "next/server";
import { logEvent } from "@/lib/logging";
import {
  getManpowerRules,
  ManpowerRulesSchema,
  setManpowerRules,
} from "@/lib/production/manpower-rules";
import { requireProductionApiPermission } from "@/lib/production/permissions";

export const dynamic = "force-dynamic";

export async function GET() {
  const authResult = await requireProductionApiPermission("canRead");
  if (!authResult.ok) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  try {
    const rules = await getManpowerRules();
    return NextResponse.json(rules);
  } catch (error) {
    console.error("Error fetching manpower rules:", error);
    return NextResponse.json({ error: "Failed to fetch manpower rules" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const authResult = await requireProductionApiPermission("canUpdate");
  if (!authResult.ok) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  try {
    const body = await request.json();
    const parsed = ManpowerRulesSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed", details: parsed.error.format() }, { status: 400 });
    }

    const rules = await setManpowerRules(parsed.data, authResult.session.user.id);
    await logEvent({
      userId: authResult.session.user.id,
      module: "PRODUCTION",
      severity: "INFO",
      action: "UPDATE_MANPOWER_RULES",
      payload: { rules },
      diffs: [{ entity: "ConfigParameter", entityId: "manpower-rules", before: {}, after: rules }],
    });

    return NextResponse.json(rules);
  } catch (error) {
    console.error("Error updating manpower rules:", error);
    return NextResponse.json({ error: "Failed to update manpower rules" }, { status: 500 });
  }
}
