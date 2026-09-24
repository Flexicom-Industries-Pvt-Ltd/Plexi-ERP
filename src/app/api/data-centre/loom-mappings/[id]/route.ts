import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireApiAuth } from "@/lib/api-auth";
import { Module } from "@/generated/prisma";
import { logEvent } from "@/lib/logging";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const auth = await requireApiAuth({
    module: [Module.DATA_CENTRE, Module.PRODUCTION],
    action: "canRead",
  });
  if (!auth.ok) return auth.response;

  try {
    const mapping = await db.loomMachineMapping.findUnique({
      where: { id },
    });

    if (!mapping) {
      return NextResponse.json(
        { error: "Loom Machine Mapping not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(mapping);
  } catch (error: any) {
    console.error(`Error fetching Loom Machine Mapping ${id}:`, error);
    return NextResponse.json(
      { error: "Failed to fetch Loom Machine Mapping" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const auth = await requireApiAuth({
    module: [Module.DATA_CENTRE, Module.PRODUCTION],
    action: "canUpdate",
  });
  if (!auth.ok) return auth.response;

  try {
    const body = await request.json();
    const existing = await db.loomMachineMapping.findUnique({ where: { id } });

    if (!existing) {
      return NextResponse.json(
        { error: "Loom Machine Mapping not found" },
        { status: 404 }
      );
    }

    const {
      qualityCode,
      tapePlantRecipeId,
      colorGroup,
      colour,
      denier,
      tapeWidth,
      bobbinMarking,
      loomNumbers,
      reedSpaceCm,
      mesh,
      targetPpm,
      remarks,
      isActive,
    } = body;

    // Sanitize and dedup loom numbers if provided
    let sanitizedLooms = existing.loomNumbers;
    if (loomNumbers !== undefined) {
      sanitizedLooms = Array.isArray(loomNumbers)
        ? Array.from(new Set(loomNumbers.map((n: any) => Number(n)).filter((n: number) => !isNaN(n) && n > 0))).sort((a: number, b: number) => a - b)
        : [];
    }

    const updated = await db.loomMachineMapping.update({
      where: { id },
      data: {
        ...(qualityCode !== undefined && { qualityCode: String(qualityCode).trim() }),
        ...(tapePlantRecipeId !== undefined && { tapePlantRecipeId: tapePlantRecipeId || null }),
        ...(colorGroup !== undefined && { colorGroup: colorGroup ? String(colorGroup).trim() : null }),
        ...(colour !== undefined && { colour: colour ? String(colour).trim() : null }),
        ...(denier !== undefined && { denier: denier !== "" && denier !== null ? Number(denier) : null }),
        ...(tapeWidth !== undefined && { tapeWidth: tapeWidth !== "" && tapeWidth !== null ? Number(tapeWidth) : null }),
        ...(bobbinMarking !== undefined && { bobbinMarking: bobbinMarking ? String(bobbinMarking).trim() : null }),
        ...(loomNumbers !== undefined && {
          loomNumbers: sanitizedLooms,
          totalLooms: sanitizedLooms.length,
        }),
        ...(reedSpaceCm !== undefined && { reedSpaceCm: reedSpaceCm !== "" && reedSpaceCm !== null ? Number(reedSpaceCm) : null }),
        ...(mesh !== undefined && { mesh: mesh ? String(mesh).trim() : null }),
        ...(targetPpm !== undefined && { targetPpm: targetPpm !== "" && targetPpm !== null ? Number(targetPpm) : null }),
        ...(remarks !== undefined && { remarks: remarks ? String(remarks).trim() : null }),
        ...(isActive !== undefined && { isActive: Boolean(isActive) }),
      },
    });

    await logEvent({
      action: "UPDATE_LOOM_MAPPING",
      module: "DATA_CENTRE",
      severity: "INFO",
      payload: { id: updated.id, qualityCode: updated.qualityCode, totalLooms: updated.totalLooms },
      meta: { description: `Updated Loom Machine Mapping for ${updated.qualityCode}` },
      userId: auth.user.id,
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error(`Error updating Loom Machine Mapping ${id}:`, error);
    return NextResponse.json(
      { error: error?.message || "Failed to update Loom Machine Mapping" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const auth = await requireApiAuth({
    module: [Module.DATA_CENTRE, Module.PRODUCTION],
    action: "canDelete",
  });
  if (!auth.ok) return auth.response;

  try {
    const existing = await db.loomMachineMapping.findUnique({ where: { id } });

    if (!existing) {
      return NextResponse.json(
        { error: "Loom Machine Mapping not found" },
        { status: 404 }
      );
    }

    await db.loomMachineMapping.delete({ where: { id } });

    await logEvent({
      action: "DELETE_LOOM_MAPPING",
      module: "DATA_CENTRE",
      severity: "WARN",
      payload: { id, qualityCode: existing.qualityCode },
      meta: { description: `Deleted Loom Machine Mapping for ${existing.qualityCode}` },
      userId: auth.user.id,
    });

    return NextResponse.json({ success: true, message: "Loom Machine Mapping deleted" });
  } catch (error: any) {
    console.error(`Error deleting Loom Machine Mapping ${id}:`, error);
    return NextResponse.json(
      { error: "Failed to delete Loom Machine Mapping" },
      { status: 500 }
    );
  }
}
