import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireApiAuth } from "@/lib/api-auth";
import { Module } from "@/generated/prisma";
import { logEvent } from "@/lib/logging";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const auth = await requireApiAuth({
    module: [Module.DATA_CENTRE, Module.PRODUCTION],
    action: "canRead",
  });
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search")?.trim();
  const tapeType = searchParams.get("tapeType")?.trim();
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

    if (tapeType && tapeType !== "ALL") {
      where.tapeType = { equals: tapeType, mode: "insensitive" };
    }

    if (search) {
      where.OR = [
        { code: { contains: search, mode: "insensitive" } },
        { colour: { contains: search, mode: "insensitive" } },
        { bobbinMarking: { contains: search, mode: "insensitive" } },
        { remarks: { contains: search, mode: "insensitive" } },
        { tapeType: { contains: search, mode: "insensitive" } },
      ];
    }

    const recipes = await db.tapePlantRecipe.findMany({
      where,
      orderBy: [{ tapeType: "asc" }, { code: "asc" }],
    });

    return NextResponse.json(recipes, {
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
    } = body;

    if (!code || !String(code).trim()) {
      return NextResponse.json(
        { error: "Recipe Code / Quality is required" },
        { status: 400 }
      );
    }

    const trimmedCode = String(code).trim().toUpperCase();

    const existing = await db.tapePlantRecipe.findUnique({
      where: { code: trimmedCode },
    });

    if (existing) {
      return NextResponse.json(
        { error: `Recipe with code '${trimmedCode}' already exists` },
        { status: 409 }
      );
    }

    const recipe = await db.tapePlantRecipe.create({
      data: {
        code: trimmedCode,
        tapeType: tapeType ? String(tapeType).trim().toUpperCase() : "PP",
        denier: denier !== "" && denier !== null && denier !== undefined ? Number(denier) : null,
        tapeWidth: tapeWidth !== "" && tapeWidth !== null && tapeWidth !== undefined ? Number(tapeWidth) : null,
        strength: strength !== "" && strength !== null && strength !== undefined ? Number(strength) : null,
        eloPercent: eloPercent !== "" && eloPercent !== null && eloPercent !== undefined ? Number(eloPercent) : null,
        bobbinMarking: bobbinMarking ? String(bobbinMarking).trim() : null,
        colour: colour ? String(colour).trim() : null,
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
        totalPercent: totalPercent !== "" && totalPercent !== null && totalPercent !== undefined ? Number(totalPercent) : 100,
        defaultQtyKg: defaultQtyKg !== "" && defaultQtyKg !== null && defaultQtyKg !== undefined ? Number(defaultQtyKg) : null,
        remarks: remarks ? String(remarks).trim() : null,
        isActive: true,
      },
    });

    await logEvent({
      action: "CREATE_RECIPE",
      module: "DATA_CENTRE",
      severity: "INFO",
      payload: { id: recipe.id, code: recipe.code },
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
