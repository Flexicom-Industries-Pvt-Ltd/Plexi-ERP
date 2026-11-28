import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireApiAuth } from "@/lib/api-auth";
import { Module } from "@/generated/prisma";
import { logEvent } from "@/lib/logging";
import { normalizeRpMode } from "@/lib/tape-plant/material-names";
import {
  calculatePermissibleTapeAsh,
  normalizeBlendProfile,
  resolveRecipeProfileForMode,
} from "@/lib/tape-plant/recipe-formulation";

export const dynamic = "force-dynamic";

function toNullableNumber(val: unknown): number | null {
  if (val === "" || val === null || val === undefined) return null;
  const n = Number(val);
  return Number.isFinite(n) ? n : null;
}

export async function GET(
  _request: NextRequest,
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
      vendor,
      tapeType,
      rpMode,
      denier,
      tapeWidth,
      strength,
      eloPercent,
      bobbinMarking,
      colour,
      spacerSize,
      requiredAsh,
      ashPercent,
      permissibleFabAsh,
      permissibleTapeAsh,
      ppPercent,
      ccPercent,
      ldpePercent,
      mbPercent,
      rp1Percent,
      rp2Percent,
      hdrpPercent,
      omega,
      vistamaxPercent,
      tptPercent,
      tptFillerPercent,
      totalPercent,
      withRpComposition,
      withoutRpComposition,
      defaultQtyKg,
      colorGroup,
      recipeGroup,
      copiedFromCode,
      remarks,
      isActive,
    } = body;

    const existing = await db.tapePlantRecipe.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Recipe not found" }, { status: 404 });
    }

    if (code && String(code).trim() !== existing.code) {
      const duplicate = await db.tapePlantRecipe.findUnique({
        where: { code: String(code).trim() },
      });
      if (duplicate && duplicate.id !== id) {
        return NextResponse.json(
          { error: `Recipe with code '${String(code).trim()}' already exists` },
          { status: 409 }
        );
      }
    }

    const resolvedType =
      tapeType !== undefined ? String(tapeType).trim().toUpperCase() : existing.tapeType;
    const resolvedRpMode =
      rpMode !== undefined && rpMode !== null && String(rpMode).trim() !== ""
        ? normalizeRpMode(rpMode)
        : normalizeRpMode(existing.rpMode);

    const fabAshNum =
      permissibleFabAsh !== undefined
        ? toNullableNumber(permissibleFabAsh)
        : existing.permissibleFabAsh;
    const tapeAshNum =
      permissibleTapeAsh !== undefined
        ? toNullableNumber(permissibleTapeAsh) ??
          calculatePermissibleTapeAsh(resolvedType, fabAshNum)
        : permissibleFabAsh !== undefined
        ? calculatePermissibleTapeAsh(resolvedType, fabAshNum)
        : existing.permissibleTapeAsh;

    let normalizedWithRp =
      withRpComposition !== undefined
        ? normalizeBlendProfile(withRpComposition, "WITH_RP")
        : normalizeBlendProfile(existing.withRpComposition, "WITH_RP");
    let normalizedWithoutRp =
      withoutRpComposition !== undefined
        ? normalizeBlendProfile(withoutRpComposition, "WITHOUT_RP")
        : normalizeBlendProfile(existing.withoutRpComposition, "WITHOUT_RP");

    // If caller didn't send dual compositions explicitly, mirror updated flat fields into active mode profile
    if (withRpComposition === undefined && withoutRpComposition === undefined) {
      const flatUpdated = normalizeBlendProfile(
        {
          ppPercent,
          ccPercent,
          ldpePercent,
          mbPercent,
          rp1Percent,
          rp2Percent,
          hdrpPercent,
          tptPercent,
          tptFillerPercent,
        },
        resolvedRpMode
      );
      if (flatUpdated) {
        if (resolvedRpMode === "WITH_RP") normalizedWithRp = flatUpdated;
        else normalizedWithoutRp = flatUpdated;
      }
    }

    const activeProfile = resolveRecipeProfileForMode(
      {
        ppPercent: ppPercent !== undefined ? toNullableNumber(ppPercent) : existing.ppPercent,
        ccPercent: ccPercent !== undefined ? toNullableNumber(ccPercent) : existing.ccPercent,
        ldpePercent: ldpePercent !== undefined ? toNullableNumber(ldpePercent) : existing.ldpePercent,
        mbPercent: mbPercent !== undefined ? toNullableNumber(mbPercent) : existing.mbPercent,
        rp1Percent: rp1Percent !== undefined ? toNullableNumber(rp1Percent) : existing.rp1Percent,
        rp2Percent: rp2Percent !== undefined ? toNullableNumber(rp2Percent) : existing.rp2Percent,
        hdrpPercent: hdrpPercent !== undefined ? toNullableNumber(hdrpPercent) : existing.hdrpPercent,
        tptPercent: tptPercent !== undefined ? toNullableNumber(tptPercent) : existing.tptPercent,
        tptFillerPercent:
          tptFillerPercent !== undefined
            ? toNullableNumber(tptFillerPercent)
            : existing.tptFillerPercent,
        withRpComposition: normalizedWithRp,
        withoutRpComposition: normalizedWithoutRp,
      },
      resolvedRpMode
    );

    const updated = await db.tapePlantRecipe.update({
      where: { id },
      data: {
        code: code ? String(code).trim() : existing.code,
        vendor:
          vendor !== undefined
            ? vendor
              ? String(vendor).trim().toUpperCase()
              : null
            : existing.vendor,
        tapeType: resolvedType,
        rpMode: resolvedRpMode,
        denier: toNullableNumber(denier),
        tapeWidth: toNullableNumber(tapeWidth),
        strength: toNullableNumber(strength),
        eloPercent: toNullableNumber(eloPercent),
        bobbinMarking:
          bobbinMarking !== undefined
            ? bobbinMarking
              ? String(bobbinMarking).trim()
              : null
            : existing.bobbinMarking,
        colour:
          colour !== undefined ? (colour ? String(colour).trim() : null) : existing.colour,
        spacerSize: toNullableNumber(spacerSize),
        permissibleFabAsh: fabAshNum,
        permissibleTapeAsh: tapeAshNum,
        requiredAsh:
          requiredAsh !== undefined
            ? toNullableNumber(requiredAsh) ?? tapeAshNum
            : tapeAshNum ?? existing.requiredAsh,
        ashPercent:
          ashPercent !== undefined
            ? toNullableNumber(ashPercent) ?? activeProfile.actualAshPercent ?? null
            : activeProfile.actualAshPercent ?? existing.ashPercent,
        ppPercent: activeProfile.ppPercent,
        ccPercent: activeProfile.ccPercent,
        ldpePercent: activeProfile.ldpePercent,
        mbPercent: activeProfile.mbPercent,
        rp1Percent: activeProfile.rp1Percent,
        rp2Percent: activeProfile.rp2Percent,
        hdrpPercent: activeProfile.hdrpPercent,
        omega: toNullableNumber(omega),
        vistamaxPercent: toNullableNumber(vistamaxPercent),
        tptPercent: activeProfile.tptPercent,
        tptFillerPercent: activeProfile.tptFillerPercent ?? null,
        totalPercent:
          toNullableNumber(totalPercent) ??
          activeProfile.totalPercent ??
          existing.totalPercent,
        withRpComposition: (normalizedWithRp as any) ?? null,
        withoutRpComposition: (normalizedWithoutRp as any) ?? null,
        defaultQtyKg: toNullableNumber(defaultQtyKg),
        colorGroup:
          colorGroup !== undefined
            ? colorGroup
              ? String(colorGroup).trim()
              : null
            : existing.colorGroup,
        recipeGroup:
          recipeGroup !== undefined
            ? recipeGroup
              ? String(recipeGroup).trim()
              : null
            : existing.recipeGroup,
        copiedFromCode:
          copiedFromCode !== undefined
            ? copiedFromCode
              ? String(copiedFromCode).trim()
              : null
            : existing.copiedFromCode,
        remarks:
          remarks !== undefined ? (remarks ? String(remarks).trim() : null) : existing.remarks,
        isActive: isActive !== undefined ? Boolean(isActive) : existing.isActive,
      },
    });

    try {
      const oldCode = existing.code;
      const newCode = updated.code;

      const existingMapping = await db.loomMachineMapping.findFirst({
        where: {
          OR: [
            { tapePlantRecipeId: updated.id },
            { qualityCode: oldCode },
            { qualityCode: newCode },
          ],
        },
      });

      if (existingMapping) {
        await db.loomMachineMapping.update({
          where: { id: existingMapping.id },
          data: {
            qualityCode: newCode,
            tapePlantRecipeId: updated.id,
            colorGroup: updated.colorGroup,
            colour: updated.colour,
            denier: updated.denier,
            tapeWidth: updated.tapeWidth,
            bobbinMarking: updated.bobbinMarking,
            remarks: updated.remarks,
            isActive: updated.isActive,
          },
        });
      } else {
        await db.loomMachineMapping.create({
          data: {
            qualityCode: newCode,
            tapePlantRecipeId: updated.id,
            colorGroup: updated.colorGroup,
            colour: updated.colour,
            denier: updated.denier,
            tapeWidth: updated.tapeWidth,
            bobbinMarking: updated.bobbinMarking,
            loomNumbers: [],
            totalLooms: 0,
            remarks: updated.remarks,
            isActive: updated.isActive,
          },
        });
      }
    } catch (syncErr) {
      console.warn("Auto-sync update to LoomMachineMapping warning:", syncErr);
    }

    await logEvent({
      action: "UPDATE_RECIPE",
      module: "DATA_CENTRE",
      severity: "INFO",
      payload: {
        id: updated.id,
        code: updated.code,
        vendor: updated.vendor,
        colorGroup: updated.colorGroup,
        recipeGroup: recipeGroup ?? updated.recipeGroup,
      },
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
  _request: NextRequest,
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

    try {
      await db.loomMachineMapping.updateMany({
        where: {
          OR: [{ tapePlantRecipeId: id }, { qualityCode: existing.code }],
        },
        data: {
          isActive: false,
        },
      });
    } catch (delSyncErr) {
      console.warn("Auto-sync delete to LoomMachineMapping warning:", delSyncErr);
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

    return NextResponse.json({ success: true, message: "Recipe deleted" });
  } catch (error: any) {
    console.error("Error deleting Tape Plant Recipe:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete recipe" },
      { status: 500 }
    );
  }
}
