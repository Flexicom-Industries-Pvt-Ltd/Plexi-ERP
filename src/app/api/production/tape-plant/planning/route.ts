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
    const plan = await db.tapePlantPlan.findUnique({
      where: {
        date_shiftId: {
          date,
          shiftId,
        },
      },
      include: {
        shift: true,
      },
    });

    return NextResponse.json(plan);
  } catch (error) {
    console.error("Error fetching Tape Plant plan:", error);
    return NextResponse.json({ error: "Failed to fetch plan" }, { status: 500 });
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
      tapeType,
      denier,
      tapeWidth,
      strength,
      eloPercent,
      bobbinMarking,
      colour,
      spacerSize,
      requiredAsh,
      ashPercent,
      plannedQtyKg,
      omega,
      vistPercent,
      remarks,
      materials,
      status,
    } = body;

    if (!date || !shiftId || !recipeQuality) {
      return NextResponse.json({ error: "Date, Shift, and Recipe / Quality are required" }, { status: 400 });
    }

    const plan = await db.tapePlantPlan.upsert({
      where: {
        date_shiftId: {
          date,
          shiftId,
        },
      },
      create: {
        date,
        shiftId,
        recipeQuality: String(recipeQuality).trim(),
        tapeType: tapeType || "PP",
        denier: denier !== undefined && denier !== null && denier !== "" ? Number(denier) : null,
        tapeWidth: tapeWidth !== undefined && tapeWidth !== null && tapeWidth !== "" ? Number(tapeWidth) : null,
        strength: strength !== undefined && strength !== null && strength !== "" ? Number(strength) : null,
        eloPercent: eloPercent !== undefined && eloPercent !== null && eloPercent !== "" ? Number(eloPercent) : null,
        bobbinMarking: bobbinMarking || null,
        colour: colour || null,
        spacerSize: spacerSize || null,
        requiredAsh: requiredAsh !== undefined && requiredAsh !== null && requiredAsh !== "" ? Number(requiredAsh) : null,
        ashPercent: ashPercent !== undefined && ashPercent !== null && ashPercent !== "" ? Number(ashPercent) : null,
        plannedQtyKg: plannedQtyKg ? Number(plannedQtyKg) : 0,
        omega: omega || null,
        vistPercent: vistPercent !== undefined && vistPercent !== null && vistPercent !== "" ? Number(vistPercent) : null,
        remarks: remarks || null,
        materials: Array.isArray(materials) ? materials : [],
        status: status || "DRAFT",
      },
      update: {
        recipeQuality: String(recipeQuality).trim(),
        tapeType: tapeType || "PP",
        denier: denier !== undefined && denier !== null && denier !== "" ? Number(denier) : null,
        tapeWidth: tapeWidth !== undefined && tapeWidth !== null && tapeWidth !== "" ? Number(tapeWidth) : null,
        strength: strength !== undefined && strength !== null && strength !== "" ? Number(strength) : null,
        eloPercent: eloPercent !== undefined && eloPercent !== null && eloPercent !== "" ? Number(eloPercent) : null,
        bobbinMarking: bobbinMarking || null,
        colour: colour || null,
        spacerSize: spacerSize || null,
        requiredAsh: requiredAsh !== undefined && requiredAsh !== null && requiredAsh !== "" ? Number(requiredAsh) : null,
        ashPercent: ashPercent !== undefined && ashPercent !== null && ashPercent !== "" ? Number(ashPercent) : null,
        plannedQtyKg: plannedQtyKg ? Number(plannedQtyKg) : 0,
        omega: omega || null,
        vistPercent: vistPercent !== undefined && vistPercent !== null && vistPercent !== "" ? Number(vistPercent) : null,
        remarks: remarks || null,
        materials: Array.isArray(materials) ? materials : [],
        status: status || "DRAFT",
      },
    });

    return NextResponse.json(plan);
  } catch (error) {
    console.error("Error saving Tape Plant plan:", error);
    return NextResponse.json({ error: "Failed to save plan" }, { status: 500 });
  }
}
