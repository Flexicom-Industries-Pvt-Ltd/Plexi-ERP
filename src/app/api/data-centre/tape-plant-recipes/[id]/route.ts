import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireApiAuth } from "@/lib/api-auth";
import { Module } from "@/generated/prisma";
import { logEvent } from "@/lib/logging";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireApiAuth({
    module: [Module.DATA_CENTRE, Module.PRODUCTION],
    action: "canRead",
  });
  if (!auth.ok) return auth.response;

  const { id } = await params;

  try {
    const recipe = await db.tapePlantRecipe.findUnique({
      where: { id },
    });

    if (!recipe) {
      return NextResponse.json({ error: "Recipe not found" }, { status: 404 });
    }

    return NextResponse.json(recipe);
  } catch (error: any) {
    console.error("Error fetching Tape Plant Recipe:", error);
    return NextResponse.json(
      { error: "Failed to fetch recipe" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireApiAuth({
    module: [Module.DATA_CENTRE, Module.PRODUCTION],
    action: "canUpdate",
  });
  if (!auth.ok) return auth.response;

  const { id } = await params;

  try {
    const body = await request.json();
    const {
      code,
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
      ppPercent,
      ccPercent,
      mbPercent,
      rp1Percent,
      rp2Percent,
      hdrpPercent,
      omega,
      vistamaxPercent,
      tptPercent,
      totalPercent,
      defaultQtyKg,
      remarks,
      isActive,
    } = body;

    const existing = await db.tapePlantRecipe.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Recipe not found" }, { status: 404 });
    }

    if (code && String(code).trim().toUpperCase() !== existing.code) {
      const duplicate = await db.tapePlantRecipe.findUnique({
        where: { code: String(code).trim().toUpperCase() },
      });
      if (duplicate && duplicate.id !== id) {
        return NextResponse.json(
          { error: `Recipe with code '${String(code).trim().toUpperCase()}' already exists` },
          { status: 409 }
        );
      }
    }

    const updated = await db.tapePlantRecipe.update({
      where: { id },
      data: {
        code: code ? String(code).trim().toUpperCase() : existing.code,
        tapeType: tapeType !== undefined ? String(tapeType).trim().toUpperCase() : existing.tapeType,
        denier: denier !== "" && denier !== null && denier !== undefined ? Number(denier) : null,
        tapeWidth: tapeWidth !== "" && tapeWidth !== null && tapeWidth !== undefined ? Number(tapeWidth) : null,
        strength: strength !== "" && strength !== null && strength !== undefined ? Number(strength) : null,
        eloPercent: eloPercent !== "" && eloPercent !== null && eloPercent !== undefined ? Number(eloPercent) : null,
        bobbinMarking: bobbinMarking !== undefined ? (bobbinMarking ? String(bobbinMarking).trim() : null) : existing.bobbinMarking,
        colour: colour !== undefined ? (colour ? String(colour).trim() : null) : existing.colour,
        spacerSize: spacerSize !== "" && spacerSize !== null && spacerSize !== undefined ? Number(spacerSize) : null,
        requiredAsh: requiredAsh !== "" && requiredAsh !== null && requiredAsh !== undefined ? Number(requiredAsh) : null,
        ashPercent: ashPercent !== "" && ashPercent !== null && ashPercent !== undefined ? Number(ashPercent) : null,
        ppPercent: ppPercent !== "" && ppPercent !== null && ppPercent !== undefined ? Number(ppPercent) : null,
        ccPercent: ccPercent !== "" && ccPercent !== null && ccPercent !== undefined ? Number(ccPercent) : null,
        mbPercent: mbPercent !== "" && mbPercent !== null && mbPercent !== undefined ? Number(mbPercent) : null,
        rp1Percent: rp1Percent !== "" && rp1Percent !== null && rp1Percent !== undefined ? Number(rp1Percent) : null,
        rp2Percent: rp2Percent !== "" && rp2Percent !== null && rp2Percent !== undefined ? Number(rp2Percent) : null,
        hdrpPercent: hdrpPercent !== "" && hdrpPercent !== null && hdrpPercent !== undefined ? Number(hdrpPercent) : null,
        omega: omega !== "" && omega !== null && omega !== undefined ? Number(omega) : null,
        vistamaxPercent: vistamaxPercent !== "" && vistamaxPercent !== null && vistamaxPercent !== undefined ? Number(vistamaxPercent) : null,
        tptPercent: tptPercent !== "" && tptPercent !== null && tptPercent !== undefined ? Number(tptPercent) : null,
        totalPercent: totalPercent !== "" && totalPercent !== null && totalPercent !== undefined ? Number(totalPercent) : existing.totalPercent,
        defaultQtyKg: defaultQtyKg !== "" && defaultQtyKg !== null && defaultQtyKg !== undefined ? Number(defaultQtyKg) : null,
        remarks: remarks !== undefined ? (remarks ? String(remarks).trim() : null) : existing.remarks,
        isActive: isActive !== undefined ? Boolean(isActive) : existing.isActive,
      },
    });

    await logEvent({
      action: "UPDATE_RECIPE",
      module: "DATA_CENTRE",
      severity: "INFO",
      payload: { id: updated.id, code: updated.code },
      meta: { description: `Updated Tape Plant Recipe ${updated.code}` },
      userId: auth.user.id,
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error("Error updating Tape Plant Recipe:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update recipe" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireApiAuth({
    module: [Module.DATA_CENTRE, Module.PRODUCTION],
    action: "canDelete",
  });
  if (!auth.ok) return auth.response;

  const { id } = await params;

  try {
    const existing = await db.tapePlantRecipe.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Recipe not found" }, { status: 404 });
    }

    await db.tapePlantRecipe.delete({
      where: { id },
    });

    await logEvent({
      action: "DELETE_RECIPE",
      module: "DATA_CENTRE",
      severity: "INFO",
      payload: { id, code: existing.code },
      meta: { description: `Deleted Tape Plant Recipe ${existing.code}` },
      userId: auth.user.id,
    });

    return NextResponse.json({ success: true, message: `Recipe ${existing.code} deleted` });
  } catch (error: any) {
    console.error("Error deleting Tape Plant Recipe:", error);
    return NextResponse.json(
      { error: "Failed to delete recipe" },
      { status: 500 }
    );
  }
}
