import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireApiAuth } from "@/lib/api-auth";
import { Module } from "@/generated/prisma";
import { logEvent } from "@/lib/logging";
import { inferRpModeFromComposition, normalizeRpMode } from "@/lib/tape-plant/material-names";
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

export async function GET(request: NextRequest) {
  const auth = await requireApiAuth({
    module: [Module.DATA_CENTRE, Module.PRODUCTION],
    action: "canRead",
  });
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search")?.trim();
  const vendor = searchParams.get("vendor")?.trim();
  const tapeType = searchParams.get("tapeType")?.trim();
  const rpMode = searchParams.get("rpMode")?.trim();
  const colorGroup = searchParams.get("colorGroup")?.trim();
  const recipeGroup = searchParams.get("recipeGroup")?.trim();
  const code = searchParams.get("code")?.trim();
  const activeOnly = searchParams.get("activeOnly") !== "false";

  try {
    const where: any = {};

    if (activeOnly) {
      where.isActive = true;
    }

    if (code) {
      where.code = { equals: code, mode: "insensitive" };
    }

    if (vendor && vendor !== "ALL") {
      where.vendor = { equals: vendor, mode: "insensitive" };
    }

    if (tapeType && tapeType !== "ALL") {
      where.tapeType = { equals: tapeType, mode: "insensitive" };
    }

    if (rpMode && rpMode !== "ALL") {
      where.rpMode = normalizeRpMode(rpMode);
    }

    if (colorGroup && colorGroup !== "ALL") {
      where.colorGroup = { equals: colorGroup, mode: "insensitive" };
    }

    if (recipeGroup && recipeGroup !== "ALL") {
      where.recipeGroup = { equals: recipeGroup, mode: "insensitive" };
    }

    if (search) {
      where.OR = [
        { code: { contains: search, mode: "insensitive" } },
        { vendor: { contains: search, mode: "insensitive" } },
        { colour: { contains: search, mode: "insensitive" } },
        { bobbinMarking: { contains: search, mode: "insensitive" } },
        { remarks: { contains: search, mode: "insensitive" } },
        { tapeType: { contains: search, mode: "insensitive" } },
        { colorGroup: { contains: search, mode: "insensitive" } },
        { recipeGroup: { contains: search, mode: "insensitive" } },
      ];
    }

    const recipes = await db.tapePlantRecipe.findMany({
      where,
      orderBy: [{ vendor: "asc" }, { tapeType: "asc" }, { code: "asc" }],
    });

    const allRecipes = await db.tapePlantRecipe.findMany({
      where: { isActive: true },
      select: { id: true, code: true, recipeGroup: true, copiedFromCode: true },
    });

    const enriched = recipes.map((r) => {
      let sharedCodes: string[] = [];
      if (r.recipeGroup) {
        sharedCodes = allRecipes
          .filter((item) => item.recipeGroup === r.recipeGroup && item.code !== r.code)
          .map((item) => item.code);
      } else if (r.copiedFromCode) {
        sharedCodes = allRecipes
          .filter(
            (item) =>
              (item.code === r.copiedFromCode || item.copiedFromCode === r.copiedFromCode) &&
              item.code !== r.code
          )
          .map((item) => item.code);
      }
      return {
        ...r,
        sharedQualities: sharedCodes,
      };
    });

    return NextResponse.json(enriched, {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
      },
    });
  } catch (error: any) {
    console.error("Error fetching Tape Plant Recipes:", error);
    return NextResponse.json(
      { error: "Failed to fetch Tape Plant Recipes" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireApiAuth({
    module: [Module.DATA_CENTRE, Module.PRODUCTION],
    action: "canCreate",
  });
  if (!auth.ok) return auth.response;

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
    } = body;

    if (!code || !String(code).trim()) {
      return NextResponse.json(
        { error: "Recipe Code / Quality is required" },
        { status: 400 }
      );
    }

    const trimmedCode = String(code).trim();
    const existing = await db.tapePlantRecipe.findUnique({
      where: { code: trimmedCode },
    });

    if (existing) {
      return NextResponse.json(
        { error: `Recipe with code '${trimmedCode}' already exists` },
        { status: 409 }
      );
    }

    const resolvedType = tapeType ? String(tapeType).trim().toUpperCase() : "PP";
    const resolvedRpMode =
      rpMode !== undefined && rpMode !== null && String(rpMode).trim() !== ""
        ? normalizeRpMode(rpMode)
        : inferRpModeFromComposition({ rp1Percent, rp2Percent, hdrpPercent, tptPercent });

    const fabAshNum = toNullableNumber(permissibleFabAsh);
    const tapeAshNum =
      toNullableNumber(permissibleTapeAsh) ??
      calculatePermissibleTapeAsh(resolvedType, fabAshNum);

    let normalizedWithRp = normalizeBlendProfile(withRpComposition, "WITH_RP");
    let normalizedWithoutRp = normalizeBlendProfile(withoutRpComposition, "WITHOUT_RP");

    const flatBlend = normalizeBlendProfile(
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

    if (resolvedRpMode === "WITH_RP" && !normalizedWithRp && flatBlend) {
      normalizedWithRp = flatBlend;
    } else if (resolvedRpMode === "WITHOUT_RP" && !normalizedWithoutRp && flatBlend) {
      normalizedWithoutRp = flatBlend;
    }

    const activeProfile = resolveRecipeProfileForMode(
      {
        ppPercent: toNullableNumber(ppPercent),
        ccPercent: toNullableNumber(ccPercent),
        ldpePercent: toNullableNumber(ldpePercent),
        mbPercent: toNullableNumber(mbPercent),
        rp1Percent: toNullableNumber(rp1Percent),
        rp2Percent: toNullableNumber(rp2Percent),
        hdrpPercent: toNullableNumber(hdrpPercent),
        tptPercent: toNullableNumber(tptPercent),
        tptFillerPercent: toNullableNumber(tptFillerPercent),
        withRpComposition: normalizedWithRp,
        withoutRpComposition: normalizedWithoutRp,
      },
      resolvedRpMode
    );

    const recipe = await db.tapePlantRecipe.create({
      data: {
        code: trimmedCode,
        vendor: vendor ? String(vendor).trim().toUpperCase() : null,
        tapeType: resolvedType,
        rpMode: resolvedRpMode,
        denier: toNullableNumber(denier),
        tapeWidth: toNullableNumber(tapeWidth),
        strength: toNullableNumber(strength),
        eloPercent: toNullableNumber(eloPercent),
        bobbinMarking: bobbinMarking ? String(bobbinMarking).trim() : null,
        colour: colour ? String(colour).trim() : null,
        spacerSize: toNullableNumber(spacerSize),
        permissibleFabAsh: fabAshNum,
        permissibleTapeAsh: tapeAshNum,
        requiredAsh: toNullableNumber(requiredAsh) ?? tapeAshNum,
        ashPercent: toNullableNumber(ashPercent) ?? activeProfile.actualAshPercent ?? null,
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
          toNullableNumber(totalPercent) ?? activeProfile.totalPercent ?? 100,
        withRpComposition: (normalizedWithRp as any) ?? undefined,
        withoutRpComposition: (normalizedWithoutRp as any) ?? undefined,
        defaultQtyKg: toNullableNumber(defaultQtyKg),
        colorGroup: colorGroup ? String(colorGroup).trim() : null,
        recipeGroup: recipeGroup ? String(recipeGroup).trim() : null,
        copiedFromCode: copiedFromCode ? String(copiedFromCode).trim() : null,
        remarks: remarks ? String(remarks).trim() : null,
        isActive: true,
      },
    });

    try {
      await db.loomMachineMapping.upsert({
        where: { qualityCode: recipe.code },
        update: {
          tapePlantRecipeId: recipe.id,
          colorGroup: recipe.colorGroup,
          colour: recipe.colour,
          denier: recipe.denier,
          tapeWidth: recipe.tapeWidth,
          bobbinMarking: recipe.bobbinMarking,
          remarks: recipe.remarks,
          isActive: recipe.isActive,
        },
        create: {
          qualityCode: recipe.code,
          tapePlantRecipeId: recipe.id,
          colorGroup: recipe.colorGroup,
          colour: recipe.colour,
          denier: recipe.denier,
          tapeWidth: recipe.tapeWidth,
          bobbinMarking: recipe.bobbinMarking,
          loomNumbers: [],
          totalLooms: 0,
          remarks: recipe.remarks,
          isActive: recipe.isActive,
        },
      });
    } catch (syncErr) {
      console.warn("Auto-sync to LoomMachineMapping warning:", syncErr);
    }

    await logEvent({
      action: "CREATE_RECIPE",
      module: "DATA_CENTRE",
      severity: "INFO",
      payload: {
        id: recipe.id,
        code: recipe.code,
        vendor: recipe.vendor,
        colorGroup: recipe.colorGroup,
        recipeGroup: recipe.recipeGroup,
      },
      meta: { description: `Created Tape Plant Recipe ${recipe.code}` },
      userId: auth.user.id,
    });

    return NextResponse.json(recipe, { status: 201 });
  } catch (error: any) {
    console.error("Error creating Tape Plant Recipe:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create Tape Plant Recipe" },
      { status: 500 }
    );
  }
}
