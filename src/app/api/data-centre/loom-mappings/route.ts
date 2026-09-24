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
  const colorGroup = searchParams.get("colorGroup")?.trim();
  const qualityCode = searchParams.get("qualityCode")?.trim();
  const loomNumberStr = searchParams.get("loomNumber")?.trim();
  const activeOnly = searchParams.get("activeOnly") !== "false";

  try {
    const where: any = {};

    if (activeOnly) {
      where.isActive = true;
    }

    if (qualityCode) {
      where.qualityCode = { equals: qualityCode, mode: "insensitive" };
    }

    if (colorGroup && colorGroup !== "ALL") {
      where.colorGroup = { equals: colorGroup, mode: "insensitive" };
    }

    if (loomNumberStr && !isNaN(Number(loomNumberStr))) {
      const num = Number(loomNumberStr);
      where.loomNumbers = { has: num };
    }

    if (search) {
      where.OR = [
        { qualityCode: { contains: search, mode: "insensitive" } },
        { colour: { contains: search, mode: "insensitive" } },
        { bobbinMarking: { contains: search, mode: "insensitive" } },
        { remarks: { contains: search, mode: "insensitive" } },
        { colorGroup: { contains: search, mode: "insensitive" } },
        { mesh: { contains: search, mode: "insensitive" } },
      ];
    }

    const mappings = await db.loomMachineMapping.findMany({
      where,
      orderBy: [{ totalLooms: "desc" }, { colorGroup: "asc" }, { qualityCode: "asc" }],
    });

    return NextResponse.json(mappings, {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
      },
    });
  } catch (error: any) {
    console.error("Error fetching Loom Machine Mappings:", error);
    return NextResponse.json(
      { error: "Failed to fetch Loom Machine Mappings" },
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
    } = body;

    if (!qualityCode || !String(qualityCode).trim()) {
      return NextResponse.json(
        { error: "Quality Code is required" },
        { status: 400 }
      );
    }

    const trimmedCode = String(qualityCode).trim();

    const existing = await db.loomMachineMapping.findUnique({
      where: { qualityCode: trimmedCode },
    });

    if (existing) {
      return NextResponse.json(
        { error: `Loom mapping for quality '${trimmedCode}' already exists` },
        { status: 409 }
      );
    }

    // Process loom numbers array (filter invalid, dedup, sort)
    const sanitizedLooms: number[] = Array.isArray(loomNumbers)
      ? Array.from(new Set(loomNumbers.map((n: any) => Number(n)).filter((n: number) => !isNaN(n) && n > 0))).sort((a: number, b: number) => a - b)
      : [];

    const mapping = await db.loomMachineMapping.create({
      data: {
        qualityCode: trimmedCode,
        tapePlantRecipeId: tapePlantRecipeId || null,
        colorGroup: colorGroup ? String(colorGroup).trim() : null,
        colour: colour ? String(colour).trim() : null,
        denier: denier !== "" && denier !== null && denier !== undefined ? Number(denier) : null,
        tapeWidth: tapeWidth !== "" && tapeWidth !== null && tapeWidth !== undefined ? Number(tapeWidth) : null,
        bobbinMarking: bobbinMarking ? String(bobbinMarking).trim() : null,
        loomNumbers: sanitizedLooms,
        totalLooms: sanitizedLooms.length,
        reedSpaceCm: reedSpaceCm !== "" && reedSpaceCm !== null && reedSpaceCm !== undefined ? Number(reedSpaceCm) : null,
        mesh: mesh ? String(mesh).trim() : null,
        targetPpm: targetPpm !== "" && targetPpm !== null && targetPpm !== undefined ? Number(targetPpm) : null,
        remarks: remarks ? String(remarks).trim() : null,
        isActive: true,
      },
    });

    await logEvent({
      action: "CREATE_LOOM_MAPPING",
      module: "DATA_CENTRE",
      severity: "INFO",
      payload: { id: mapping.id, qualityCode: mapping.qualityCode, loomCount: mapping.totalLooms },
      meta: { description: `Created Loom Machine Mapping for ${mapping.qualityCode} (${mapping.totalLooms} looms)` },
      userId: auth.user.id,
    });

    return NextResponse.json(mapping, { status: 201 });
  } catch (error: any) {
    console.error("Error creating Loom Machine Mapping:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to create Loom Machine Mapping" },
      { status: 500 }
    );
  }
}
