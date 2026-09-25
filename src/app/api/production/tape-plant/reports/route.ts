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
  const operator = searchParams.get("operator");

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
  if (operator) {
    wherePost.operatorName = { contains: operator, mode: "insensitive" };
  }

  try {
    const postProductions = await db.tapePlantPostProduction.findMany({
      where: wherePost,
      include: {
        shift: true,
      },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    });

    const wherePlan: any = {};
    if (wherePost.date) wherePlan.date = wherePost.date;
    if (shiftId) wherePlan.shiftId = shiftId;
    if (recipeQuality) wherePlan.recipeQuality = wherePost.recipeQuality;

    const plans = await db.tapePlantPlan.findMany({
      where: wherePlan,
      include: {
        shift: true,
      },
    });

    // 1. Granular Production Summary records
    const summary = postProductions.map((p: any) => {
      const shiftPlans = plans.filter((pl: any) => pl.date === p.date && (pl.shiftId === p.shiftId || pl.isDayNight));
      const plannedKg = p.plannedProductionKg || shiftPlans.reduce((sum, pl) => sum + (pl.plannedQtyKg || 0), 0);
      const doneKg = p.productionDoneKg || 0;
      const gapKg = plannedKg - doneKg;
      const wasteKg = p.wasteKg || 0;
      const netKg = doneKg - wasteKg;
      const efficiency = plannedKg > 0 ? Number(((doneKg / plannedKg) * 100).toFixed(1)) : (doneKg > 0 ? 100 : 0);
      const wasteRate = doneKg > 0 ? Number(((wasteKg / doneKg) * 100).toFixed(2)) : 0;
      const opName = (p.operatorName && p.operatorName.trim()) ? p.operatorName.trim() : "Unassigned / General";

      const combinedRecipe =
        p.recipeQuality ||
        Array.from(new Set(shiftPlans.map((pl) => pl.recipeQuality).filter(Boolean))).join(", ") ||
        "—";

      return {
        id: p.id,
        date: p.date,
        shiftId: p.shiftId,
        shiftName: p.shift?.name || "Unknown Shift",
        operatorName: opName,
        operatorId: p.operatorId || null,
        recipeQuality: combinedRecipe,
        plannedKg,
        actualKg: doneKg,
        gapKg,
        wasteKg,
        wastePercent: p.wastePercent !== null && p.wastePercent !== undefined ? p.wastePercent : wasteRate,
        netKg,
        efficiencyPercent: efficiency,
        status: p.status || "SAVED",
      };
    });

    // 2. Global Totals
    const totalPlannedKg = summary.reduce((sum, r) => sum + r.plannedKg, 0);
    const totalActualKg = summary.reduce((sum, r) => sum + r.actualKg, 0);
    const totalGapKg = totalPlannedKg - totalActualKg;
    const totalWasteKg = summary.reduce((sum, r) => sum + r.wasteKg, 0);
    const totalNetKg = totalActualKg - totalWasteKg;
    const avgWastePercent = totalActualKg > 0 ? Number(((totalWasteKg / totalActualKg) * 100).toFixed(2)) : 0;
    const avgEfficiencyPercent = totalPlannedKg > 0 ? Number(((totalActualKg / totalPlannedKg) * 100).toFixed(1)) : 100;

    // 3. Shift-Wise Aggregation
    const shiftMap = new Map<string, {
      shiftId: string;
      shiftName: string;
      recordCount: number;
      plannedKg: number;
      actualKg: number;
      wasteKg: number;
      operators: Set<string>;
    }>();

    summary.forEach((r) => {
      const key = r.shiftId || r.shiftName;
      if (!shiftMap.has(key)) {
        shiftMap.set(key, {
          shiftId: r.shiftId,
          shiftName: r.shiftName,
          recordCount: 0,
          plannedKg: 0,
          actualKg: 0,
          wasteKg: 0,
          operators: new Set<string>(),
        });
      }
      const item = shiftMap.get(key)!;
      item.recordCount += 1;
      item.plannedKg += r.plannedKg;
      item.actualKg += r.actualKg;
      item.wasteKg += r.wasteKg;
      if (r.operatorName) item.operators.add(r.operatorName);
    });

    const shiftWise = Array.from(shiftMap.values()).map((s) => {
      const gapKg = s.plannedKg - s.actualKg;
      const netKg = s.actualKg - s.wasteKg;
      const wastePercent = s.actualKg > 0 ? Number(((s.wasteKg / s.actualKg) * 100).toFixed(2)) : 0;
      const efficiencyPercent = s.plannedKg > 0 ? Number(((s.actualKg / s.plannedKg) * 100).toFixed(1)) : (s.actualKg > 0 ? 100 : 0);
      const productionShare = totalActualKg > 0 ? Number(((s.actualKg / totalActualKg) * 100).toFixed(1)) : 0;

      return {
        shiftId: s.shiftId,
        shiftName: s.shiftName,
        recordCount: s.recordCount,
        plannedKg: s.plannedKg,
        actualKg: s.actualKg,
        gapKg,
        wasteKg: s.wasteKg,
        wastePercent,
        netKg,
        efficiencyPercent,
        productionShare,
        operators: Array.from(s.operators),
      };
    }).sort((a, b) => b.actualKg - a.actualKg);

    // 4. Operator-Wise Aggregation
    const opMap = new Map<string, {
      operatorName: string;
      shiftCount: number;
      plannedKg: number;
      actualKg: number;
      wasteKg: number;
      shifts: Set<string>;
    }>();

    summary.forEach((r) => {
      const key = r.operatorName;
      if (!opMap.has(key)) {
        opMap.set(key, {
          operatorName: key,
          shiftCount: 0,
          plannedKg: 0,
          actualKg: 0,
          wasteKg: 0,
          shifts: new Set<string>(),
        });
      }
      const item = opMap.get(key)!;
      item.shiftCount += 1;
      item.plannedKg += r.plannedKg;
      item.actualKg += r.actualKg;
      item.wasteKg += r.wasteKg;
      if (r.shiftName) item.shifts.add(r.shiftName);
    });

    const operatorWise = Array.from(opMap.values()).map((op) => {
      const gapKg = op.plannedKg - op.actualKg;
      const netKg = op.actualKg - op.wasteKg;
      const wastePercent = op.actualKg > 0 ? Number(((op.wasteKg / op.actualKg) * 100).toFixed(2)) : 0;
      const efficiencyPercent = op.plannedKg > 0 ? Number(((op.actualKg / op.plannedKg) * 100).toFixed(1)) : (op.actualKg > 0 ? 100 : 0);
      const productionShare = totalActualKg > 0 ? Number(((op.actualKg / totalActualKg) * 100).toFixed(1)) : 0;
      const qualityScore = Number(Math.max(0, efficiencyPercent - (wastePercent * 2)).toFixed(1));

      return {
        operatorName: op.operatorName,
        shiftCount: op.shiftCount,
        plannedKg: op.plannedKg,
        actualKg: op.actualKg,
        gapKg,
        wasteKg: op.wasteKg,
        wastePercent,
        netKg,
        efficiencyPercent,
        qualityScore,
        productionShare,
        shifts: Array.from(op.shifts),
      };
    }).sort((a, b) => b.actualKg - a.actualKg);

    // 5. Wastage Benchmarks (Shift & Operator)
    const wasteShiftWise = shiftWise.map((s) => ({
      shiftName: s.shiftName,
      actualKg: s.actualKg,
      wasteKg: s.wasteKg,
      wastePercent: s.wastePercent,
      statusBenchmark: s.wastePercent <= 1.5 ? "OPTIMAL" : s.wastePercent <= 3.0 ? "ACCEPTABLE" : "HIGH",
    })).sort((a, b) => b.wastePercent - a.wastePercent);

    const wasteOperatorWise = operatorWise.map((op) => ({
      operatorName: op.operatorName,
      actualKg: op.actualKg,
      wasteKg: op.wasteKg,
      wastePercent: op.wastePercent,
      statusBenchmark: op.wastePercent <= 1.5 ? "OPTIMAL" : op.wastePercent <= 3.0 ? "ACCEPTABLE" : "HIGH",
    })).sort((a, b) => b.wastePercent - a.wastePercent);

    // 6. Efficiency Benchmarks (Shift & Operator)
    const efficiencyShiftWise = shiftWise.map((s) => ({
      shiftName: s.shiftName,
      plannedKg: s.plannedKg,
      actualKg: s.actualKg,
      efficiencyPercent: s.efficiencyPercent,
      netEfficiencyPercent: s.plannedKg > 0 ? Number(((s.netKg / s.plannedKg) * 100).toFixed(1)) : (s.netKg > 0 ? 100 : 0),
      performanceTier: s.efficiencyPercent >= 98 ? "TOP_TIER" : s.efficiencyPercent >= 90 ? "ON_TARGET" : "BELOW_TARGET",
    })).sort((a, b) => b.efficiencyPercent - a.efficiencyPercent);

    const efficiencyOperatorWise = operatorWise.map((op) => ({
      operatorName: op.operatorName,
      plannedKg: op.plannedKg,
      actualKg: op.actualKg,
      efficiencyPercent: op.efficiencyPercent,
      qualityScore: op.qualityScore,
      performanceTier: op.efficiencyPercent >= 98 ? "TOP_TIER" : op.efficiencyPercent >= 90 ? "ON_TARGET" : "BELOW_TARGET",
    })).sort((a, b) => b.efficiencyPercent - a.efficiencyPercent);

    const distinctOperators = Array.from(new Set(summary.map((s) => s.operatorName).filter(Boolean)));

    return NextResponse.json(
      {
        summary,
        shiftWise,
        operatorWise,
        wasteShiftWise,
        wasteOperatorWise,
        efficiencyShiftWise,
        efficiencyOperatorWise,
        totals: {
          totalPlannedKg,
          totalActualKg,
          totalGapKg,
          totalWasteKg,
          totalNetKg,
          avgWastePercent,
          avgEfficiencyPercent,
          totalShiftsCount: shiftWise.length,
          totalOperatorsCount: operatorWise.length,
          recordCount: summary.length,
        },
        distinctOperators,
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
