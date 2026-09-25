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
  const date = searchParams.get("date");
  const shiftId = searchParams.get("shiftId");

  if (!date || !shiftId) {
    return NextResponse.json({ error: "Date and Shift are required" }, { status: 400 });
  }

  try {
    const plans = await db.tapePlantPlan.findMany({
      where: { date, shiftId },
      orderBy: { createdAt: "asc" },
      include: {
        shift: true,
      },
    });

    // Also query active 2-shift continuous plans (isDayNight = true) on the same date from other shifts (e.g. Day Shift)
    const otherContinuousPlans = await db.tapePlantPlan.findMany({
      where: {
        date,
        isDayNight: true,
        shiftId: { not: shiftId },
      },
      include: {
        shift: true,
      },
      orderBy: { createdAt: "asc" },
    });

    let effectivePlans = [...plans];

    if (plans.length === 0) {
      // If current shift has no plans yet, pre-populate active Day+Night continuous runs
      if (otherContinuousPlans.length > 0) {
        const seen = new Set<string>();
        const uniqueContinuous = otherContinuousPlans.filter((cp) => {
          const key = (cp.recipeQuality || "").trim();
          if (!key || seen.has(key)) return false;
          seen.add(key);
          return true;
        });

        effectivePlans = uniqueContinuous.map((cp) => ({
          ...cp,
          id: `temp-carry-${cp.id}`,
          shiftId,
          isDayNight: true,
          carriedOverFromShift: cp.shift?.name || "Day Shift",
          status: "DRAFT",
        }));
      }
    } else if (otherContinuousPlans.length > 0) {
      // If current shift already has plans, include any continuous recipe from earlier shift that is not yet in the list
      const existingQualities = new Set(plans.map((p) => (p.recipeQuality || "").trim()));
      const seen = new Set<string>();
      const unlistedContinuous = otherContinuousPlans.filter((cp) => {
        const key = (cp.recipeQuality || "").trim();
        if (!key || existingQualities.has(key) || seen.has(key)) return false;
        seen.add(key);
        return true;
      });
      if (unlistedContinuous.length > 0) {
        effectivePlans = [
          ...plans,
          ...unlistedContinuous.map((cp) => ({
            ...cp,
            id: `temp-carry-${cp.id}`,
            shiftId,
            isDayNight: true,
            carriedOverFromShift: cp.shift?.name || "Day Shift",
            status: plans[0]?.status || "DRAFT",
          })),
        ];
      }
    }

    const totalPlannedKg = effectivePlans.reduce((acc, p) => acc + (p.plannedQtyKg || 0), 0);

    return NextResponse.json(
      {
        plans: effectivePlans,
        count: effectivePlans.length,
        totalPlannedKg,
        ...(effectivePlans[0] || {}),
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
    console.error("Error fetching Tape Plant plan:", error);
    return NextResponse.json({ error: "Failed to fetch plan" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const authResult = await requireTapePlantApiPermission("canCreate");
  if (!authResult.ok) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  try {
    const body = await request.json();
    const { date, shiftId, plans: rawPlans, status } = body;

    if (!date || !shiftId) {
      return NextResponse.json({ error: "Date and Shift are required" }, { status: 400 });
    }

    // Support both multi-plan array and single plan object
    const plansToSave: any[] = Array.isArray(rawPlans) && rawPlans.length > 0
      ? rawPlans
      : Array.isArray(body)
      ? body
      : [body];

    const savedPlans = await db.$transaction(async (tx) => {
      const results = [];
      const submittedIds: string[] = [];

      for (const item of plansToSave) {
        if (!item.recipeQuality || !String(item.recipeQuality).trim()) continue;

        const payload = {
          date,
          shiftId,
          recipeQuality: String(item.recipeQuality).trim(),
          tapeType: item.tapeType || "LPP",
          denier: item.denier !== undefined && item.denier !== null && item.denier !== "" ? Number(item.denier) : null,
          tapeWidth: item.tapeWidth !== undefined && item.tapeWidth !== null && item.tapeWidth !== "" ? Number(item.tapeWidth) : null,
          strength: item.strength !== undefined && item.strength !== null && item.strength !== "" ? Number(item.strength) : null,
          eloPercent: item.eloPercent !== undefined && item.eloPercent !== null && item.eloPercent !== "" ? Number(item.eloPercent) : null,
          bobbinMarking: item.bobbinMarking || null,
          colour: item.colour || null,
          spacerSize: item.spacerSize || null,
          requiredAsh: item.requiredAsh !== undefined && item.requiredAsh !== null && item.requiredAsh !== "" ? Number(item.requiredAsh) : null,
          ashPercent: item.ashPercent !== undefined && item.ashPercent !== null && item.ashPercent !== "" ? Number(item.ashPercent) : null,
          plannedQtyKg: item.plannedQtyKg ? Number(item.plannedQtyKg) : 0,
          omega: item.omega || null,
          vistPercent: item.vistPercent !== undefined && item.vistPercent !== null && item.vistPercent !== "" ? Number(item.vistPercent) : null,
          remarks: item.remarks || null,
          materials: Array.isArray(item.materials) ? item.materials : [],
          isDayNight: Boolean(item.isDayNight),
          status: item.status || status || "DRAFT",
        };

        let record;
        if (item.id && !item.id.startsWith("temp-")) {
          record = await tx.tapePlantPlan.upsert({
            where: { id: item.id },
            update: payload,
            create: payload,
          });
        } else {
          record = await tx.tapePlantPlan.create({
            data: payload,
          });
        }

        submittedIds.push(record.id);
        results.push(record);
      }

      // If explicit plans array was sent, remove any existing plans for that shift not included in submittedIds
      if (Array.isArray(rawPlans) && submittedIds.length > 0) {
        await tx.tapePlantPlan.deleteMany({
          where: {
            date,
            shiftId,
            id: { notIn: submittedIds },
          },
        });
      }

      return results;
    });

    const totalPlannedKg = savedPlans.reduce((acc, p) => acc + (p.plannedQtyKg || 0), 0);
    const uniqueRecipes = Array.from(new Set(savedPlans.map((p) => p.recipeQuality).filter(Boolean)));
    const combinedRecipe = uniqueRecipes.join(", ");

    // Synchronize existing PostProduction record for this shift if it exists
    const existingPostProd = await db.tapePlantPostProduction.findUnique({
      where: { date_shiftId: { date, shiftId } },
    });

    if (existingPostProd) {
      const existingEntries = Array.isArray(existingPostProd.entries) ? (existingPostProd.entries as any[]) : [];
      let totalDone = 0;
      let totalWaste = 0;

      const syncedEntries = savedPlans.map((plan, idx) => {
        const matching =
          existingEntries.find((e) => e.planId === plan.id || e.id === plan.id) ||
          existingEntries.find((e) => e.recipeQuality === plan.recipeQuality) ||
          existingEntries[idx];

        const plannedKg = plan.plannedQtyKg || 0;
        const doneKg = matching?.productionDoneKg !== undefined && matching?.productionDoneKg !== null && matching?.productionDoneKg !== ""
          ? Number(matching.productionDoneKg)
          : "";
        const wasteKg = matching?.wasteKg !== undefined && matching?.wasteKg !== null && matching?.wasteKg !== ""
          ? Number(matching.wasteKg)
          : "";
        const numDone = Number(doneKg) || 0;
        const numWaste = Number(wasteKg) || 0;

        totalDone += numDone;
        totalWaste += numWaste;

        return {
          id: plan.id,
          planId: plan.id,
          recipeQuality: plan.recipeQuality,
          plannedProductionKg: plannedKg,
          productionDoneKg: doneKg,
          gapKg: plannedKg - numDone,
          wasteKg: wasteKg,
          wastePercent: matching?.wastePercent ?? (numDone > 0 ? Number(((numWaste / numDone) * 100).toFixed(2)) : null),
          netProductionKg: numDone - numWaste,
          remarks: matching?.remarks || "",
        };
      });

      await db.tapePlantPostProduction.update({
        where: { date_shiftId: { date, shiftId } },
        data: {
          plannedProductionKg: totalPlannedKg,
          productionDoneKg: totalDone,
          gapKg: totalPlannedKg - totalDone,
          wasteKg: totalWaste,
          netProductionKg: totalDone - totalWaste,
          recipeQuality: combinedRecipe || null,
          entries: syncedEntries,
        },
      });
    }

    return NextResponse.json({
      plans: savedPlans,
      count: savedPlans.length,
      totalPlannedKg,
      // Backward compatibility:
      ...(savedPlans[0] || {}),
    });
  } catch (error) {
    console.error("Error saving Tape Plant plan:", error);
    return NextResponse.json({ error: "Failed to save plan" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const authResult = await requireTapePlantApiPermission("canDelete");
  if (!authResult.ok) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "Plan ID is required" }, { status: 400 });
  }

  try {
    await db.tapePlantPlan.delete({
      where: { id },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting Tape Plant plan:", error);
    return NextResponse.json({ error: "Failed to delete plan" }, { status: 500 });
  }
}
