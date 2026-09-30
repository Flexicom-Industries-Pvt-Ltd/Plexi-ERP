import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireApiAuth } from "@/lib/api-auth";
import { Module } from "@/generated/prisma";
import { logEvent } from "@/lib/logging";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const auth = await requireApiAuth({
    module: [Module.DATA_CENTRE, Module.PRINTING, Module.PRODUCTION, Module.SETTINGS],
    action: "canRead",
  });
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search")?.trim();
  const activeOnly = searchParams.get("activeOnly") !== "false";
  const limit = Math.min(Number(searchParams.get("limit")) || 100, 200);

  try {
    const where: any = {};

    if (activeOnly) {
      where.isActive = true;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { code: { contains: search, mode: "insensitive" } },
        { category: { contains: search, mode: "insensitive" } },
        { unit: { contains: search, mode: "insensitive" } },
      ];
    }

    const materials = await db.printingRawMaterial.findMany({
      where,
      orderBy: [{ category: "asc" }, { name: "asc" }],
      take: limit,
    });

    return NextResponse.json(materials, {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
      },
    });
  } catch (error: any) {
    console.error("Error fetching printing raw materials:", error);
    return NextResponse.json(
      { error: "Failed to fetch printing raw materials" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireApiAuth({
    module: [Module.DATA_CENTRE, Module.PRINTING, Module.PRODUCTION, Module.SETTINGS],
    action: "canCreate",
  });
  if (!auth.ok) return auth.response;

  try {
    const body = await request.json();
    const {
      id,
      name,
      code,
      category = "INK",
      unit = "LITRE",
      conversionFactor = 0.82,
      defaultRatio,
      targetMileage,
      remarks,
      isActive = true,
    } = body;

    const trimmedName = name?.trim();
    if (!trimmedName) {
      return NextResponse.json(
        { error: "Material name is required" },
        { status: 400 }
      );
    }

    const factor = Number(conversionFactor) > 0 ? Number(conversionFactor) : 0.82;
    const ratio = defaultRatio !== undefined && defaultRatio !== null && defaultRatio !== "" ? Number(defaultRatio) : null;
    const mileage = targetMileage !== undefined && targetMileage !== null && targetMileage !== "" ? Number(targetMileage) : null;
    const sanitizedCode = code?.trim() || null;

    let savedItem;

    if (id) {
      // Update
      savedItem = await db.printingRawMaterial.update({
        where: { id },
        data: {
          name: trimmedName,
          code: sanitizedCode,
          category: category.toUpperCase(),
          unit: unit.toUpperCase(),
          conversionFactor: factor,
          defaultRatio: ratio,
          targetMileage: mileage,
          remarks: remarks?.trim() || null,
          isActive: Boolean(isActive),
        },
      });

      await logEvent({
        action: `Updated printing raw material: ${savedItem.name}`,
        module: "DATA_CENTRE",
        severity: "INFO",
        payload: savedItem,
        httpMethod: "POST",
        url: "/api/data-centre/printing-raw-materials",
        statusCode: 200,
      }).catch(() => {});
    } else {
      // Create or Upsert if matching name exists
      savedItem = await db.printingRawMaterial.upsert({
        where: { name: trimmedName },
        update: {
          code: sanitizedCode,
          category: category.toUpperCase(),
          unit: unit.toUpperCase(),
          conversionFactor: factor,
          defaultRatio: ratio,
          targetMileage: mileage,
          remarks: remarks?.trim() || null,
          isActive: Boolean(isActive),
        },
        create: {
          name: trimmedName,
          code: sanitizedCode,
          category: category.toUpperCase(),
          unit: unit.toUpperCase(),
          conversionFactor: factor,
          defaultRatio: ratio,
          targetMileage: mileage,
          remarks: remarks?.trim() || null,
          isActive: Boolean(isActive),
        },
      });

      await logEvent({
        action: `Created/Registered printing raw material: ${savedItem.name}`,
        module: "DATA_CENTRE",
        severity: "INFO",
        payload: savedItem,
        httpMethod: "POST",
        url: "/api/data-centre/printing-raw-materials",
        statusCode: 200,
      }).catch(() => {});
    }

    return NextResponse.json({ success: true, material: savedItem });
  } catch (error: any) {
    console.error("Error creating/updating printing raw material:", error);
    return NextResponse.json(
      { error: error.message || "Failed to save printing raw material" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  const auth = await requireApiAuth({
    module: [Module.DATA_CENTRE, Module.PRINTING, Module.PRODUCTION, Module.SETTINGS],
    action: "canDelete",
  });
  if (!auth.ok) return auth.response;

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Material ID is required" }, { status: 400 });
    }

    const existing = await db.printingRawMaterial.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Raw material not found" }, { status: 404 });
    }

    await db.printingRawMaterial.delete({ where: { id } });

    await logEvent({
      action: `Deleted printing raw material: ${existing.name}`,
      module: "DATA_CENTRE",
      severity: "INFO",
      payload: existing,
      httpMethod: "DELETE",
      url: "/api/data-centre/printing-raw-materials",
      statusCode: 200,
    }).catch(() => {});

    return NextResponse.json({ success: true, message: "Material deleted successfully" });
  } catch (error: any) {
    console.error("Error deleting printing raw material:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete printing raw material" },
      { status: 500 }
    );
  }
}
