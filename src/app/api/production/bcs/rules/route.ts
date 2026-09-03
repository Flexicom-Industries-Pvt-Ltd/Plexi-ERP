import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@/generated/prisma";
import { db } from "@/lib/db";
import { logEvent } from "@/lib/logging";

import { bcsRunInclude } from "@/lib/production/bcs-run-include";
import {
  BcsProductionRulesSchema,
  getBcsProductionRules,
  setBcsProductionRules,
} from "@/lib/production/bcs-rules";
import { requireProductionApiPermission } from "@/lib/production/permissions";

export const dynamic = "force-dynamic";

export async function GET() {
  const authResult = await requireProductionApiPermission("canRead");
  if (!authResult.ok) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  try {
    const rules = await getBcsProductionRules();
    return NextResponse.json(rules);
  } catch (error) {
    console.error("Error fetching BCS rules:", error);
    return NextResponse.json({ error: "Failed to fetch BCS rules" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const authResult = await requireProductionApiPermission("canUpdate");
  if (!authResult.ok) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  try {
    const body = await request.json();
    const parsed = BcsProductionRulesSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed", details: parsed.error.format() }, { status: 400 });
    }
    if (parsed.data.maxTeamMembers < parsed.data.minTeamMembers) {
      return NextResponse.json({ error: "maxTeamMembers must be >= minTeamMembers" }, { status: 400 });
    }

    const updated = await setBcsProductionRules(parsed.data, authResult.session.user.id);
    await logEvent({
      userId: authResult.session.user.id,
      module: "PRODUCTION",
      severity: "INFO",
      action: "UPDATE_BCS_RULES",
      payload: { rules: parsed.data },
      diffs: [{ entity: "ConfigParameter", entityId: updated.id, before: {}, after: updated }],
    });

    return NextResponse.json(parsed.data);
  } catch (error) {
    console.error("Error updating BCS rules:", error);
    return NextResponse.json({ error: "Failed to update BCS rules" }, { status: 500 });
  }
}
