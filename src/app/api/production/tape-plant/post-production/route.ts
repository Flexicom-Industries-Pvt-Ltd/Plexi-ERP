import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireTapePlantApiPermission } from "@/lib/tape-plant/permissions";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const authResult = await requireTapePlantApiPermission("canRead");
  if (!authResult.ok) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date");
  const shiftId = searchParams.get("shiftId");

  if (!date || !shiftId) {
    return NextResponse.json({ error: "Date and Shift are required" }, { status: 400 });
  }

  try {
    const record = await db.tapePlantPostProduction.findUnique({
      where: {
        date_shiftId: { date, shiftId },
      },
      include: {
        shift: true,
      },
    });

    // Fetch all planned recipe runs for this shift
    const plans = await db.tapePlantPlan.findMany({
      where: { date, shiftId },
      orderBy: { createdAt: "asc" },
    });

    // Build per-recipe post-production entries by aligning with planned recipes
    const savedEntries = Array.isArray(record?.entries) ? (record.entries as any[]) : [];

    let entries: any[] = [];

    if (plans.length > 0) {
      entries = plans.map((plan, idx) => {
        const matchingEntry =
          savedEntries.find((e) => e.planId === plan.id) ||
          savedEntries.find((e) => e.recipeQuality === plan.recipeQuality && !entries.some((al) => al.id === e.id)) ||
          savedEntries[idx];

        const plannedKg = plan.plannedQtyKg ?? 0;
        const doneKg = matchingEntry?.productionDoneKg ?? "";
        const wasteKg = matchingEntry?.wasteKg ?? "";
        const numDone = Number(doneKg) || 0;
        const numWaste = Number(wasteKg) || 0;
        const gapKg = plannedKg - numDone;
        const netKg = numDone - numWaste;
        const wastePercent =
          matchingEntry?.wastePercent !== undefined && matchingEntry?.wastePercent !== null && matchingEntry?.wastePercent !== ""
            ? matchingEntry.wastePercent
            : numDone > 0
            ? Number(((numWaste / numDone) * 100).toFixed(2))
            : "";

        return {
          id: matchingEntry?.id || plan.id,
          planId: plan.id,
          recipeQuality: plan.recipeQuality,
          plannedProductionKg: plannedKg,
          productionDoneKg: doneKg,
          gapKg,
          wasteKg,
          wastePercent,
          netProductionKg: netKg,
          remarks: matchingEntry?.remarks || "",
        };
      });
    } else if (savedEntries.length > 0) {
      entries = savedEntries;
    } else if (record) {
      // Legacy single-entry fallback
      entries = [
        {
          id: record.id,
          planId: undefined,
          recipeQuality: record.recipeQuality || "—",
          plannedProductionKg: record.plannedProductionKg,
          productionDoneKg: record.productionDoneKg,
          gapKg: record.gapKg,
          wasteKg: record.wasteKg,
          wastePercent: record.wastePercent ?? "",
          netProductionKg: record.netProductionKg,
          remarks: "",
        },
      ];
    }

    return NextResponse.json({
      postProduction: record,
      plans,
      entries,
    });
  } catch (error) {
    console.error("Error fetching Tape Plant post production:", error);
    return NextResponse.json({ error: "Failed to fetch post production data" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const authResult = await requireTapePlantApiPermission("canCreate");
  if (!authResult.ok) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  try {
    const body = await request.json();
    const { date, shiftId, entries, status, recipeQuality, plannedProductionKg, productionDoneKg, wasteKg, wastePercent } = body;

    if (!date || !shiftId) {
      return NextResponse.json({ error: "Date and Shift are required" }, { status: 400 });
    }

    let processedEntries: any[] = [];
    let totalPlanned = 0;
    let totalDone = 0;
    let totalWaste = 0;
    let combinedRecipeQuality = "";

    if (Array.isArray(entries) && entries.length > 0) {
      processedEntries = entries.map((e: any, index: number) => {
        const plannedKg = Number(e.plannedProductionKg) || 0;
        const doneKg = e.productionDoneKg !== "" && e.productionDoneKg !== null && e.productionDoneKg !== undefined
          ? Number(e.productionDoneKg)
          : 0;
        const waste = e.wasteKg !== "" && e.wasteKg !== null && e.wasteKg !== undefined
          ? Number(e.wasteKg)
          : 0;
        const gap = plannedKg - doneKg;
        const net = doneKg - waste;
        const calculatedWastePct =
          e.wastePercent !== "" && e.wastePercent !== null && e.wastePercent !== undefined
            ? Number(e.wastePercent)
            : doneKg > 0
            ? Number(((waste / doneKg) * 100).toFixed(2))
            : null;

        totalPlanned += plannedKg;
        totalDone += doneKg;
        totalWaste += waste;

        return {
          id: e.id || `entry-${index + 1}`,
          planId: e.planId || null,
          recipeQuality: e.recipeQuality ? String(e.recipeQuality).trim() : "—",
          plannedProductionKg: plannedKg,
          productionDoneKg: e.productionDoneKg !== "" && e.productionDoneKg !== null ? Number(e.productionDoneKg) : "",
          gapKg: gap,
          wasteKg: e.wasteKg !== "" && e.wasteKg !== null ? Number(e.wasteKg) : "",
          wastePercent: calculatedWastePct,
          netProductionKg: net,
          remarks: e.remarks ? String(e.remarks).trim() : "",
        };
      });

      const uniqueRecipes = Array.from(new Set(processedEntries.map((e) => e.recipeQuality).filter(Boolean)));
      combinedRecipeQuality = uniqueRecipes.join(", ");
    } else {
      // Legacy fallback
      const planned = Number(plannedProductionKg) || 0;
      const done = Number(productionDoneKg) || 0;
      const waste = Number(wasteKg) || 0;
      totalPlanned = planned;
      totalDone = done;
      totalWaste = waste;
      combinedRecipeQuality = recipeQuality ? String(recipeQuality).trim() : "";
    }

    const totalGap = totalPlanned - totalDone;
    const totalNet = totalDone - totalWaste;
    const totalWastePct = totalDone > 0 ? Number(((totalWaste / totalDone) * 100).toFixed(2)) : (wastePercent ? Number(wastePercent) : null);

    const record = await db.tapePlantPostProduction.upsert({
      where: {
        date_shiftId: { date, shiftId },
      },
      create: {
        date,
        shiftId,
        recipeQuality: combinedRecipeQuality || null,
        plannedProductionKg: totalPlanned,
        productionDoneKg: totalDone,
        gapKg: totalGap,
        wasteKg: totalWaste,
        wastePercent: totalWastePct,
        netProductionKg: totalNet,
        entries: processedEntries,
        qualityChecks: [],
        status: status || "DRAFT",
      },
      update: {
        recipeQuality: combinedRecipeQuality || null,
        plannedProductionKg: totalPlanned,
        productionDoneKg: totalDone,
        gapKg: totalGap,
        wasteKg: totalWaste,
        wastePercent: totalWastePct,
        netProductionKg: totalNet,
        entries: processedEntries,
        status: status || "DRAFT",
      },
    });

    return NextResponse.json(record);
  } catch (error) {
    console.error("Error saving Tape Plant post production:", error);
    return NextResponse.json({ error: "Failed to save post production" }, { status: 500 });
  }
}
