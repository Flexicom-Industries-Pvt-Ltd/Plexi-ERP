import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireTapePlantApiPermission } from "@/lib/tape-plant/permissions";
import {
  computeNetProductionKg,
  computeBobbinStockCount,
  computeCrateStockCount,
  computeBobbinStockTotals,
  BobbinStockItem,
} from "@/lib/tape-plant/bobbin-stock";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: NextRequest) {
  const authResult = await requireTapePlantApiPermission("canRead");
  if (!authResult.ok) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date"); // Specific date if filtered
  const dateFrom = searchParams.get("dateFrom");
  const dateTo = searchParams.get("dateTo");
  const shiftId = searchParams.get("shiftId"); // Optional shift filter
  const scope = searchParams.get("scope"); // "all" (default till date) or "single"

  try {
    const whereClause: any = {};

    if (scope === "single" && date) {
      whereClause.date = date;
    } else if (dateFrom && dateTo) {
      whereClause.date = { gte: dateFrom, lte: dateTo };
    } else if (dateFrom) {
      whereClause.date = { gte: dateFrom };
    } else if (dateTo) {
      whereClause.date = { lte: dateTo };
    } else if (date && !scope) {
      whereClause.date = date;
    }
    // If scope is "all" or default and no date bounds given, all records till date are fetched

    if (shiftId && shiftId.toUpperCase() !== "ALL") {
      whereClause.shiftId = shiftId;
    }

    const postProductions = await db.tapePlantPostProduction.findMany({
      where: whereClause,
      include: {
        shift: true,
      },
      orderBy: [{ date: "asc" }, { createdAt: "asc" }],
    });

    // Quality aggregation map: key = normalized recipeQuality
    const qualityMap = new Map<
      string,
      {
        recipeQuality: string;
        grossDoneKg: number;
        wasteKg: number;
        netProductionKg: number;
        occurrenceCount: number;
      }
    >();

    for (const record of postProductions) {
      const recordEntries = Array.isArray(record.entries) ? (record.entries as any[]) : [];

      if (recordEntries.length > 0) {
        for (const entry of recordEntries) {
          const rawQuality = (entry.recipeQuality || record.recipeQuality || "").trim();
          if (!rawQuality) continue;

          const key = rawQuality.toUpperCase();
          const gross = Number(entry.productionDoneKg) || 0;
          const waste = Number(entry.wasteKg) || 0;
          const net = computeNetProductionKg(gross, waste);

          const existing = qualityMap.get(key) || {
            recipeQuality: rawQuality,
            grossDoneKg: 0,
            wasteKg: 0,
            netProductionKg: 0,
            occurrenceCount: 0,
          };

          existing.grossDoneKg += gross;
          existing.wasteKg += waste;
          existing.netProductionKg += net;
          existing.occurrenceCount += 1;

          qualityMap.set(key, existing);
        }
      } else if (record.recipeQuality) {
        const rawQuality = record.recipeQuality.trim();
        const key = rawQuality.toUpperCase();
        const gross = Number(record.productionDoneKg) || 0;
        const waste = Number(record.wasteKg) || 0;
        const net = computeNetProductionKg(gross, waste);

        const existing = qualityMap.get(key) || {
          recipeQuality: rawQuality,
          grossDoneKg: 0,
          wasteKg: 0,
          netProductionKg: 0,
          occurrenceCount: 0,
        };

        existing.grossDoneKg += gross;
        existing.wasteKg += waste;
        existing.netProductionKg += net;
        existing.occurrenceCount += 1;

        qualityMap.set(key, existing);
      }
    }

    // Convert aggregated map into BobbinStockItems sorted by Quality Name
    const items: BobbinStockItem[] = Array.from(qualityMap.values())
      .sort((a, b) => a.recipeQuality.localeCompare(b.recipeQuality))
      .map((agg, idx) => {
        const netKg = Number(agg.netProductionKg.toFixed(2));
        const bobbinStock = computeBobbinStockCount(netKg);
        const crateStock = computeCrateStockCount(netKg);

        return {
          slNo: idx + 1,
          id: `quality-${idx + 1}`,
          recipeQuality: agg.recipeQuality,
          productionDoneKg: Number(agg.grossDoneKg.toFixed(2)),
          wasteKg: Number(agg.wasteKg.toFixed(2)),
          netProductionKg: netKg,
          bobbinStock,
          crateStock,
        };
      });

    const totals = computeBobbinStockTotals(items);

    return NextResponse.json(
      {
        items,
        totals,
        filter: {
          scope: scope || "all",
          date: date || null,
          dateFrom: dateFrom || null,
          dateTo: dateTo || null,
          shiftId: shiftId || "ALL",
        },
      },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
          Pragma: "no-cache",
          Expires: "0",
        },
      }
    );
  } catch (error) {
    console.error("Error fetching Tape Plant bobbin stock summary:", error);
    return NextResponse.json(
      { error: "Failed to fetch bobbin stock summary" },
      { status: 500 }
    );
  }
}
