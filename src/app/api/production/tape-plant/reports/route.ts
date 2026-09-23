import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireTapePlantApiPermission } from "@/lib/tape-plant/permissions";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: NextRequest) {
  const authResult = await requireTapePlantApiPermission("canRead");
  if (!authResult.ok) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  const { searchParams } = new URL(request.url);
  const dateFrom = searchParams.get("dateFrom");
  const dateTo = searchParams.get("dateTo");
  const shiftId = searchParams.get("shiftId");
  const recipeQuality = searchParams.get("recipeQuality");

  const wherePost: any = {};
  if (dateFrom && dateTo) {
    wherePost.date = { gte: dateFrom, lte: dateTo };
  } else if (dateFrom) {
    wherePost.date = { gte: dateFrom };
  } else if (dateTo) {
    wherePost.date = { lte: dateTo };
  }
  if (shiftId) {
    wherePost.shiftId = shiftId;
  }
  if (recipeQuality) {
    wherePost.recipeQuality = { contains: recipeQuality, mode: "insensitive" };
  }

  try {
    const postProductions = await db.tapePlantPostProduction.findMany({
      where: wherePost,
      include: {
        shift: true,
      },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    });

    const plans = await db.tapePlantPlan.findMany({
      where: wherePost,
      include: {
        shift: true,
      },
    });

    // Match each record
    const summary = postProductions.map((p: any) => {
      const shiftPlans = plans.filter((pl: any) => pl.date === p.date && pl.shiftId === p.shiftId);
      const plannedKg = p.plannedProductionKg || shiftPlans.reduce((sum, pl) => sum + (pl.plannedQtyKg || 0), 0);
      const doneKg = p.productionDoneKg || 0;
      const gapKg = plannedKg - doneKg;
      const wasteKg = p.wasteKg || 0;
      const netKg = doneKg - wasteKg;
      const efficiency = plannedKg > 0 ? Number(((doneKg / plannedKg) * 100).toFixed(1)) : 0;
      const wasteRate = doneKg > 0 ? Number(((wasteKg / doneKg) * 100).toFixed(2)) : 0;

      const combinedRecipe =
        p.recipeQuality ||
        Array.from(new Set(shiftPlans.map((pl) => pl.recipeQuality).filter(Boolean))).join(", ") ||
        "—";

      return {
        id: p.id,
        date: p.date,
        shiftId: p.shiftId,
        shiftName: p.shift?.name || "Unknown Shift",
        recipeQuality: combinedRecipe,
        plannedKg,
        actualKg: doneKg,
        gapKg,
        wasteKg,
        wastePercent: p.wastePercent !== null && p.wastePercent !== undefined ? p.wastePercent : wasteRate,
        netKg,
        efficiencyPercent: efficiency,
        status: p.status,
      };
    });

    // Summary totals
    const totals = summary.reduce(
      (acc: any, curr: any) => ({
        totalPlannedKg: acc.totalPlannedKg + curr.plannedKg,
        totalActualKg: acc.totalActualKg + curr.actualKg,
        totalGapKg: acc.totalGapKg + curr.gapKg,
        totalWasteKg: acc.totalWasteKg + curr.wasteKg,
        totalNetKg: acc.totalNetKg + curr.netKg,
      }),
      {
        totalPlannedKg: 0,
        totalActualKg: 0,
        totalGapKg: 0,
        totalWasteKg: 0,
        totalNetKg: 0,
      }
    );

    return NextResponse.json(
      {
        summary,
        totals,
        count: summary.length,
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
    console.error("Error generating Tape Plant report:", error);
    return NextResponse.json({ error: "Failed to generate reports" }, { status: 500 });
  }
}
