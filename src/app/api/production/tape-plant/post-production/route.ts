import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireProductionApiPermission } from "@/lib/production/permissions";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const authResult = await requireProductionApiPermission("canRead");
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

    // Also fetch the plan to default planned quantity if post-production record is new
    const plan = await db.tapePlantPlan.findUnique({
      where: {
        date_shiftId: { date, shiftId },
      },
    });

    return NextResponse.json({
      postProduction: record,
      plan: plan
        ? {
            recipeQuality: plan.recipeQuality,
            plannedProductionKg: plan.plannedQtyKg,
          }
        : null,
    });
  } catch (error) {
    console.error("Error fetching Tape Plant post production:", error);
    return NextResponse.json({ error: "Failed to fetch post production data" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const authResult = await requireProductionApiPermission("canCreate");
  if (!authResult.ok) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  try {
    const body = await request.json();
    const {
      date,
      shiftId,
      recipeQuality,
      plannedProductionKg,
      productionDoneKg,
      gapKg,
      wasteKg,
      wastePercent,
      netProductionKg,
      qualityChecks,
      status,
    } = body;

    if (!date || !shiftId) {
      return NextResponse.json({ error: "Date and Shift are required" }, { status: 400 });
    }

    const planned = Number(plannedProductionKg) || 0;
    const done = Number(productionDoneKg) || 0;
    const gap = planned - done;
    const waste = Number(wasteKg) || 0;
    const net = done - waste;

    const record = await db.tapePlantPostProduction.upsert({
      where: {
        date_shiftId: { date, shiftId },
      },
      create: {
        date,
        shiftId,
        recipeQuality: recipeQuality ? String(recipeQuality).trim() : null,
        plannedProductionKg: planned,
        productionDoneKg: done,
        gapKg: gap,
        wasteKg: waste,
        wastePercent: wastePercent !== "" && wastePercent !== null && wastePercent !== undefined ? Number(wastePercent) : null,
        netProductionKg: net,
        qualityChecks: Array.isArray(qualityChecks) ? qualityChecks : [],
        status: status || "DRAFT",
      },
      update: {
        recipeQuality: recipeQuality ? String(recipeQuality).trim() : null,
        plannedProductionKg: planned,
        productionDoneKg: done,
        gapKg: gap,
        wasteKg: waste,
        wastePercent: wastePercent !== "" && wastePercent !== null && wastePercent !== undefined ? Number(wastePercent) : null,
        netProductionKg: net,
        qualityChecks: Array.isArray(qualityChecks) ? qualityChecks : [],
        status: status || "DRAFT",
      },
    });

    return NextResponse.json(record);
  } catch (error) {
    console.error("Error saving Tape Plant post production:", error);
    return NextResponse.json({ error: "Failed to save post production" }, { status: 500 });
  }
}
