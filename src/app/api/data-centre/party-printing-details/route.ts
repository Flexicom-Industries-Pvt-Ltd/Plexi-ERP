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
        { companyName: { contains: search, mode: "insensitive" } },
        { unitName: { contains: search, mode: "insensitive" } },
        { grade: { contains: search, mode: "insensitive" } },
        { drumSize: { contains: search, mode: "insensitive" } },
        { quality: { contains: search, mode: "insensitive" } },
      ];
    }

    const details = await db.partyPrintingDetail.findMany({
      where,
      orderBy: [{ companyName: "asc" }, { unitName: "asc" }, { createdAt: "desc" }],
      take: limit,
    });

    return NextResponse.json(details, {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
      },
    });
  } catch (error: any) {
    console.error("Error fetching party printing details:", error);
    return NextResponse.json(
      { error: "Failed to fetch party printing details" },
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
      companyName,
      unitName,
      grade,
      drumSize,
      targetProductionMtrs,
      quality,
      remarks,
      isActive = true,
    } = body;

    if (!companyName || String(companyName).trim() === "") {
      return NextResponse.json(
        { error: "Company Name is required" },
        { status: 400 }
      );
    }

    const cleanCompany = String(companyName).trim();
    const cleanUnit = unitName ? String(unitName).trim() : null;
    const cleanGrade = grade ? String(grade).trim() : null;
    const cleanDrumSize = drumSize ? String(drumSize).trim() : null;
    const cleanTarget = targetProductionMtrs !== undefined && targetProductionMtrs !== null && targetProductionMtrs !== ""
      ? Number(targetProductionMtrs) || null
      : null;
    const cleanQuality = quality ? String(quality).trim() : null;
    const cleanRemarks = remarks ? String(remarks).trim() : null;

    // Check if an entry with exact company, unit, grade, and drum size already exists
    const existing = await db.partyPrintingDetail.findFirst({
      where: {
        companyName: { equals: cleanCompany, mode: "insensitive" },
        unitName: cleanUnit ? { equals: cleanUnit, mode: "insensitive" } : null,
        grade: cleanGrade ? { equals: cleanGrade, mode: "insensitive" } : null,
        drumSize: cleanDrumSize ? { equals: cleanDrumSize, mode: "insensitive" } : null,
      },
    });

    if (existing) {
      // Upsert: update target, quality, remarks if provided
      const updated = await db.partyPrintingDetail.update({
        where: { id: existing.id },
        data: {
          targetProductionMtrs: cleanTarget ?? existing.targetProductionMtrs,
          quality: cleanQuality ?? existing.quality,
          remarks: cleanRemarks ?? existing.remarks,
          isActive: Boolean(isActive),
        },
      });

      return NextResponse.json({
        success: true,
        party: updated,
        message: "Existing party printing detail updated",
      });
    }

    const detail = await db.partyPrintingDetail.create({
      data: {
        companyName: cleanCompany,
        unitName: cleanUnit,
        grade: cleanGrade,
        drumSize: cleanDrumSize,
        targetProductionMtrs: cleanTarget,
        quality: cleanQuality,
        remarks: cleanRemarks,
        isActive: Boolean(isActive),
      },
    });

    await logEvent({
      action: `Created Party Printing Detail: ${cleanCompany} (${cleanUnit || "General"})`,
      module: "DATA_CENTRE",
      severity: "INFO",
      payload: { id: detail.id, companyName: cleanCompany, unitName: cleanUnit, grade: cleanGrade, drumSize: cleanDrumSize },
      httpMethod: "POST",
      url: "/api/data-centre/party-printing-details",
      statusCode: 200,
    }).catch(() => {});

    return NextResponse.json({
      success: true,
      party: detail,
      message: "Party printing detail saved successfully",
    });
  } catch (error: any) {
    console.error("Error creating party printing detail:", error);
    return NextResponse.json(
      { error: "Failed to create party printing detail" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  const auth = await requireApiAuth({
    module: [Module.DATA_CENTRE, Module.PRINTING, Module.PRODUCTION, Module.SETTINGS],
    action: "canUpdate",
  });
  if (!auth.ok) return auth.response;

  try {
    const body = await request.json();
    const {
      id,
      companyName,
      unitName,
      grade,
      drumSize,
      targetProductionMtrs,
      quality,
      remarks,
      isActive,
    } = body;

    if (!id) {
      return NextResponse.json({ error: "Record ID is required" }, { status: 400 });
    }

    const cleanCompany = companyName ? String(companyName).trim() : undefined;
    const cleanUnit = unitName !== undefined ? (unitName ? String(unitName).trim() : null) : undefined;
    const cleanGrade = grade !== undefined ? (grade ? String(grade).trim() : null) : undefined;
    const cleanDrumSize = drumSize !== undefined ? (drumSize ? String(drumSize).trim() : null) : undefined;
    const cleanTarget = targetProductionMtrs !== undefined
      ? (targetProductionMtrs !== null && targetProductionMtrs !== "" ? Number(targetProductionMtrs) : null)
      : undefined;
    const cleanQuality = quality !== undefined ? (quality ? String(quality).trim() : null) : undefined;
    const cleanRemarks = remarks !== undefined ? (remarks ? String(remarks).trim() : null) : undefined;

    const updated = await db.partyPrintingDetail.update({
      where: { id },
      data: {
        ...(cleanCompany ? { companyName: cleanCompany } : {}),
        ...(cleanUnit !== undefined ? { unitName: cleanUnit } : {}),
        ...(cleanGrade !== undefined ? { grade: cleanGrade } : {}),
        ...(cleanDrumSize !== undefined ? { drumSize: cleanDrumSize } : {}),
        ...(cleanTarget !== undefined ? { targetProductionMtrs: cleanTarget } : {}),
        ...(cleanQuality !== undefined ? { quality: cleanQuality } : {}),
        ...(cleanRemarks !== undefined ? { remarks: cleanRemarks } : {}),
        ...(isActive !== undefined ? { isActive: Boolean(isActive) } : {}),
      },
    });

    await logEvent({
      action: `Updated Party Printing Detail #${id} (${updated.companyName})`,
      module: "DATA_CENTRE",
      severity: "INFO",
      payload: { id, companyName: updated.companyName },
      httpMethod: "PUT",
      url: "/api/data-centre/party-printing-details",
      statusCode: 200,
    }).catch(() => {});

    return NextResponse.json({
      success: true,
      party: updated,
      message: "Party printing detail updated successfully",
    });
  } catch (error: any) {
    console.error("Error updating party printing detail:", error);
    return NextResponse.json(
      { error: "Failed to update party printing detail" },
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

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "Record ID is required" }, { status: 400 });
  }

  try {
    const existing = await db.partyPrintingDetail.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Party printing detail not found" }, { status: 404 });
    }

    await db.partyPrintingDetail.delete({ where: { id } });

    await logEvent({
      action: `Deleted Party Printing Detail #${id} (${existing.companyName})`,
      module: "DATA_CENTRE",
      severity: "WARN",
      payload: { id, companyName: existing.companyName },
      httpMethod: "DELETE",
      url: "/api/data-centre/party-printing-details",
      statusCode: 200,
    }).catch(() => {});

    return NextResponse.json({
      success: true,
      message: "Party printing detail deleted successfully",
    });
  } catch (error: any) {
    console.error("Error deleting party printing detail:", error);
    return NextResponse.json(
      { error: "Failed to delete party printing detail" },
      { status: 500 }
    );
  }
}
