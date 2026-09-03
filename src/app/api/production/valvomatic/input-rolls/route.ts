import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma";
import { db } from "@/lib/db";

import { productionRollInclude } from "@/lib/production/roll-include";
import { requireProductionApiPermission } from "@/lib/production/permissions";

export const dynamic = "force-dynamic";

/** Available production rolls for valvomatic input. */
export async function GET(request: NextRequest) {
  const authResult = await requireProductionApiPermission("canRead");
  if (!authResult.ok) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  const { searchParams } = new URL(request.url);
  const rollType = searchParams.get("rollType");

  const where: Prisma.ProductionRollWhereInput = {
    consumedAt: null,
    sourcePhase: { in: ["LOOM", "LAMINATION", "PRINTING"] },
  };
  if (rollType) where.rollType = rollType as "PP" | "LPP";

  try {
    const rolls = await db.productionRoll.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: productionRollInclude,
    });
    return NextResponse.json(rolls);
  } catch (error) {
    console.error("Error fetching valvomatic input rolls:", error);
    return NextResponse.json({ error: "Failed to fetch input rolls" }, { status: 500 });
  }
}
