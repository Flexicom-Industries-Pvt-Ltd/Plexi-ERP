import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireLaminationApiPermission } from "@/lib/lamination/permissions";
import {
  AvailableLaminationRoll,
  GroupedQualityRolls,
} from "@/lib/lamination/lamination-types";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: NextRequest) {
  const authResult = await requireLaminationApiPermission("canRead");
  if (!authResult.ok) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  const { searchParams } = new URL(request.url);
  const quality = (searchParams.get("quality") || "").trim();
  const search = (searchParams.get("search") || "").trim().toLowerCase();
  const loomNumberParam = searchParams.get("loomNumber") || "";

  try {
    const where: any = {};

    if (quality && quality !== "ALL") {
      where.qualityType = {
        equals: quality,
        mode: "insensitive",
      };
    }

    if (loomNumberParam && loomNumberParam !== "ALL") {
      const parsedLoom = Number(loomNumberParam);
      if (!isNaN(parsedLoom) && parsedLoom > 0) {
        where.loomNumber = parsedLoom;
      }
    }

    if (search) {
      const searchNum = Number(search.replace(/[^0-9]/g, ""));
      where.OR = [
        { rollNumber: { contains: search, mode: "insensitive" } },
        { qualityType: { contains: search, mode: "insensitive" } },
        { size: { contains: search, mode: "insensitive" } },
        ...(!isNaN(searchNum) && searchNum > 0 ? [{ loomNumber: searchNum }] : []),
      ];
    }

    const cuttingEntries = await db.loomRollCuttingEntry.findMany({
      where,
      include: {
        report: {
          select: {
            date: true,
            shiftName: true,
          },
        },
      },
      orderBy: [
        { qualityType: "asc" },
        { loomNumber: "asc" },
        { rollNumber: "asc" },
      ],
      take: 500,
    });

    const rolls: AvailableLaminationRoll[] = cuttingEntries.map((e) => {
      const meter = Number(e.meter) || 0;
      const nettWeightKg = Number(e.nettWeightKg) || 0;
      const avg =
        meter > 0 && nettWeightKg > 0
          ? Math.round(((nettWeightKg * 1000) / meter) * 10) / 10
          : Number(e.avgWeightPerMeter) || 0;

      return {
        id: e.id,
        rollNumber: e.rollNumber,
        loomNumber: e.loomNumber,
        size: e.size || "500",
        qualityType: (e.qualityType || "STANDARD").trim(),
        meter,
        nettWeightKg,
        avgWeightPerMeter: avg,
        date: e.report?.date || "",
        shiftName: e.report?.shiftName || "",
        contractor: e.contractor || undefined,
      };
    });

    // Group rolls by Quality
    const qualityMap = new Map<string, AvailableLaminationRoll[]>();
    for (const roll of rolls) {
      const q = roll.qualityType;
      if (!qualityMap.has(q)) {
        qualityMap.set(q, []);
      }
      qualityMap.get(q)!.push(roll);
    }

    const groupedByQuality: GroupedQualityRolls[] = Array.from(
      qualityMap.entries()
    ).map(([qName, qRolls]) => ({
      quality: qName,
      rolls: qRolls,
      totalMeters: Math.round(qRolls.reduce((sum, r) => sum + r.meter, 0) * 100) / 100,
      totalNettWeightKg: Math.round(qRolls.reduce((sum, r) => sum + r.nettWeightKg, 0) * 100) / 100,
    })).sort((a, b) => b.totalMeters - a.totalMeters);

    const uniqueQualities = groupedByQuality.map((g) => g.quality);

    return NextResponse.json({
      success: true,
      totalRolls: rolls.length,
      rolls,
      groupedByQuality,
      uniqueQualities,
    });
  } catch (error: any) {
    console.error("GET /api/production/lamination/available-rolls error:", error);
    return NextResponse.json(
      { error: "Failed to fetch available rolls from roll stock" },
      { status: 500 }
    );
  }
}
