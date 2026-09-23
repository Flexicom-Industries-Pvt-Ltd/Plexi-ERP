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
    const plans = await db.tapePlantPlan.findMany({
      where: {
        date,
        shiftId,
      },
      orderBy: {
        createdAt: "asc",
      },
      include: {
        shift: true,
      },
    });

    const totalPlannedKg = plans.reduce((acc, p) => acc + (p.plannedQtyKg || 0), 0);

    return NextResponse.json({
      plans,
      count: plans.length,
      totalPlannedKg,
      // Backward compatibility for single plan consumer:
      ...(plans[0] || {}),
    });
  } catch (error) {
    console.error("Error fetching Tape Plant plans:", error);
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
    console.error("Error deleting recipe plan:", error);
    return NextResponse.json({ error: "Failed to delete recipe plan" }, { status: 500 });
  }
}
