import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireLaminationApiPermission } from "@/lib/lamination/permissions";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(_request: NextRequest) {
  const authResult = await requireLaminationApiPermission("canRead");
  if (!authResult.ok) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  try {
    const [loomRolls, recipes, mappings, pastLamination, partyDetails] = await Promise.all([
      db.loomRollCuttingEntry.findMany({
        select: { qualityType: true },
        distinct: ["qualityType"],
        where: { qualityType: { not: "" } },
      }),
      db.tapePlantRecipe.findMany({
        select: { code: true },
        where: { code: { not: "" }, isActive: true },
      }),
      db.loomMachineMapping.findMany({
        select: { qualityCode: true },
        distinct: ["qualityCode"],
        where: { qualityCode: { not: "" } },
      }),
      db.laminationProductionEntry.findMany({
        select: { quality: true },
        distinct: ["quality"],
        where: { quality: { not: "" } },
      }),
      db.partyPrintingDetail.findMany({
        select: { quality: true },
        distinct: ["quality"],
        where: { quality: { not: "" }, isActive: true },
      }),
    ]);

    const set = new Set<string>();
    const addQuality = (q?: string | null) => {
      if (!q) return;
      const trimmed = q.trim();
      if (trimmed.length > 0) {
        set.add(trimmed);
      }
    };

    recipes.forEach((r: { code: string }) => addQuality(r.code));
    mappings.forEach((m: { qualityCode: string | null }) => addQuality(m.qualityCode));
    partyDetails.forEach((p: { quality: string | null }) => addQuality(p.quality));
    loomRolls.forEach((r: { qualityType: string | null }) => addQuality(r.qualityType));
    pastLamination.forEach((p: { quality: string }) => addQuality(p.quality));

    const qualities = Array.from(set).sort((a, b) => a.localeCompare(b));

    return NextResponse.json({
      success: true,
      qualities,
    });
  } catch (error: any) {
    console.error("GET /api/production/lamination/qualities error:", error);
    return NextResponse.json({
      success: true,
      qualities: [],
    });
  }
}
