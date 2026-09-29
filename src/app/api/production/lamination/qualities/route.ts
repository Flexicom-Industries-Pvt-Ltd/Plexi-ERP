import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireLaminationApiPermission } from "@/lib/lamination/permissions";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const DEFAULT_LAMINATION_QUALITIES: string[] = [
  "NUVOCO SI",
  "UTCL YL SI",
  "White VIP",
  "Mahal/LPP/W",
  "STAR CEMENT",
  "DALMIA",
  "ULTRATECH",
  "AMBUJA",
  "STANDARD",
];

export async function GET(_request: NextRequest) {
  const authResult = await requireLaminationApiPermission("canRead");
  if (!authResult.ok) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  try {
    const [loomRolls, recipes, mappings, pastLamination] = await Promise.all([
      db.loomRollCuttingEntry.findMany({
        select: { qualityType: true },
        distinct: ["qualityType"],
        where: { qualityType: { not: "" } },
      }),
      db.tapePlantRecipe.findMany({
        select: { code: true },
        where: { code: { not: "" } },
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
    ]);

    const set = new Set<string>();
    const addQuality = (q?: string | null) => {
      if (!q) return;
      const trimmed = q.trim();
      if (trimmed.length > 0) {
        set.add(trimmed);
      }
    };

    DEFAULT_LAMINATION_QUALITIES.forEach(addQuality);
    loomRolls.forEach((r: { qualityType: string | null }) => addQuality(r.qualityType));
    recipes.forEach((r: { code: string }) => addQuality(r.code));
    mappings.forEach((m: { qualityCode: string | null }) => addQuality(m.qualityCode));
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
      qualities: DEFAULT_LAMINATION_QUALITIES,
    });
  }
}
