import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireTapePlantApiPermission } from "@/lib/tape-plant/permissions";
import {
  computeNetProductionKg,
  computeBobbinStockCount,
  computeCrateStockCount,
  computeBobbinStockTotals,
  BobbinStockItem,
  CRATE_WEIGHT_KG,
  BOBBINS_PER_CRATE,
} from "@/lib/tape-plant/bobbin-stock";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: NextRequest) {
  const authResult = await requireTapePlantApiPermission("canRead");
  if (!authResult.ok) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date");
  const dateFrom = searchParams.get("dateFrom");
  const dateTo = searchParams.get("dateTo");
  const shiftId = searchParams.get("shiftId");
  const scope = searchParams.get("scope"); // "all" (default till date) or "single" | "range"

  try {
    const postWhereClause: any = {};
    const issueWhereClause: any = {
      status: { not: "CANCELLED" },
    };

    if (scope === "single" && date) {
      postWhereClause.date = date;
      issueWhereClause.date = date;
    } else if (dateFrom && dateTo) {
      postWhereClause.date = { gte: dateFrom, lte: dateTo };
      issueWhereClause.date = { gte: dateFrom, lte: dateTo };
    } else if (dateFrom) {
      postWhereClause.date = { gte: dateFrom };
      issueWhereClause.date = { gte: dateFrom };
    } else if (dateTo) {
      postWhereClause.date = { lte: dateTo };
      issueWhereClause.date = { lte: dateTo };
    } else if (date && !scope) {
      postWhereClause.date = date;
      issueWhereClause.date = date;
    }

    if (shiftId && shiftId.toUpperCase() !== "ALL") {
      postWhereClause.shiftId = shiftId;
      issueWhereClause.shiftId = shiftId;
    }

    // 1. Fetch Post Production records
    const postProductions = await db.tapePlantPostProduction.findMany({
      where: postWhereClause,
      include: {
        shift: true,
      },
      orderBy: [{ date: "asc" }, { createdAt: "asc" }],
    });

    // 2. Fetch Bobbin Issue records (Loom dispatches)
    const bobbinIssues = await db.tapePlantBobbinIssue.findMany({
      where: issueWhereClause,
      select: {
        recipeQuality: true,
        crateCount: true,
        bobbinCount: true,
        weightKg: true,
      },
    });

    // Quality aggregation map: key = normalized recipeQuality
    const qualityMap = new Map<
      string,
      {
        recipeQuality: string;
        grossDoneKg: number;
        wasteKg: number;
        netProductionKg: number;
        issuedCrates: number;
        issuedBobbins: number;
        issuedKg: number;
      }
    >();

    // Process Post-Production outputs
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
            issuedCrates: 0,
            issuedBobbins: 0,
            issuedKg: 0,
          };

          existing.grossDoneKg += gross;
          existing.wasteKg += waste;
          existing.netProductionKg += net;

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
          issuedCrates: 0,
          issuedBobbins: 0,
          issuedKg: 0,
        };

        existing.grossDoneKg += gross;
        existing.wasteKg += waste;
        existing.netProductionKg += net;

        qualityMap.set(key, existing);
      }
    }

    // Process Loom Bobbin Issues (deductions)
    for (const issue of bobbinIssues) {
      const rawQuality = (issue.recipeQuality || "").trim();
      if (!rawQuality) continue;

      const key = rawQuality.toUpperCase();
      const crates = Number(issue.crateCount) || 0;
      const bobbins = Number(issue.bobbinCount) || crates * BOBBINS_PER_CRATE;
      const weight = Number(issue.weightKg) || crates * CRATE_WEIGHT_KG;

      const existing = qualityMap.get(key) || {
        recipeQuality: rawQuality,
        grossDoneKg: 0,
        wasteKg: 0,
        netProductionKg: 0,
        issuedCrates: 0,
        issuedBobbins: 0,
        issuedKg: 0,
      };

      existing.issuedCrates += crates;
      existing.issuedBobbins += bobbins;
      existing.issuedKg += weight;

      qualityMap.set(key, existing);
    }

    // Convert aggregated map into BobbinStockItems sorted by Quality Name
    const items: BobbinStockItem[] = Array.from(qualityMap.values())
      .sort((a, b) => a.recipeQuality.localeCompare(b.recipeQuality))
      .map((agg, idx) => {
        const netKg = Number(agg.netProductionKg.toFixed(2));
        const producedBobbins = computeBobbinStockCount(netKg);
        const producedCrates = computeCrateStockCount(netKg);

        const issuedCrates = Number(agg.issuedCrates.toFixed(2));
        const issuedBobbins = Number(agg.issuedBobbins.toFixed(2));
        const issuedKg = Number(agg.issuedKg.toFixed(2));

        // Available stock after subtracting issued crates/bobbins
        const availableKg = Math.max(0, Number((netKg - issuedKg).toFixed(2)));
        const availableBobbins = Math.max(0, Number((producedBobbins - issuedBobbins).toFixed(2)));
        const availableCrates = Math.max(0, Number((producedCrates - issuedCrates).toFixed(2)));

        return {
          slNo: idx + 1,
          id: `quality-${idx + 1}`,
          recipeQuality: agg.recipeQuality,
          productionDoneKg: Number(agg.grossDoneKg.toFixed(2)),
          wasteKg: Number(agg.wasteKg.toFixed(2)),
          netProductionKg: netKg,
          producedBobbins,
          producedCrates,
          issuedCrates,
          issuedBobbins,
          issuedKg,
          bobbinStock: availableBobbins,
          crateStock: availableCrates,
          availableKg,
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
