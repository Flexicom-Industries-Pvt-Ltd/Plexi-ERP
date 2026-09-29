import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireLaminationApiPermission } from "@/lib/lamination/permissions";
import { logEvent } from "@/lib/logging";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: NextRequest) {
  const authResult = await requireLaminationApiPermission("canRead");
  if (!authResult.ok) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  const { searchParams } = new URL(request.url);
  const activeOnly = searchParams.get("activeOnly") === "true";
  const search = searchParams.get("search")?.trim();

  try {
    const where: any = {};
    if (activeOnly) {
      where.isActive = true;
    }
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { code: { contains: search, mode: "insensitive" } },
      ];
    }

    const items = await db.laminationRawMaterial.findMany({
      where,
      orderBy: [{ sequence: "asc" }, { createdAt: "asc" }],
    });

    const totalPercentage = items
      .filter((i) => i.isActive)
      .reduce((sum, i) => sum + i.percentage, 0);

    return NextResponse.json({
      success: true,
      items,
      totalPercentage: Number(totalPercentage.toFixed(2)),
    });
  } catch (error: any) {
    console.error("Error fetching lamination raw materials:", error);
    return NextResponse.json({ error: "Failed to fetch lamination raw materials" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const authResult = await requireLaminationApiPermission("canCreate");
  if (!authResult.ok) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  try {
    const body = await request.json();
    const { name, code, percentage, unit = "kg", sequence = 0, isActive = true, remarks } = body;

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json({ error: "Raw Material Name is required" }, { status: 400 });
    }

    const parsedPercentage = Number(percentage);
    if (isNaN(parsedPercentage) || parsedPercentage < 0 || parsedPercentage > 100) {
      return NextResponse.json({ error: "Percentage must be a valid number between 0 and 100" }, { status: 400 });
    }

    const created = await db.laminationRawMaterial.create({
      data: {
        name: name.trim(),
        code: code?.trim() || null,
        percentage: Number(parsedPercentage.toFixed(2)),
        unit: unit?.trim() || "kg",
        sequence: Number(sequence) || 0,
        isActive: Boolean(isActive),
        remarks: remarks?.trim() || null,
      },
    });

    await logEvent({
      module: "DATA_CENTRE",
      action: `Created Lamination Raw Material ${created.name}`,
      severity: "INFO",
      payload: {
        id: created.id,
        name: created.name,
        percentage: created.percentage,
      },
      httpMethod: "POST",
      url: "/api/data-centre/lamination-raw-materials",
      statusCode: 200,
    }).catch(console.error);

    return NextResponse.json({ success: true, item: created });
  } catch (error: any) {
    console.error("Error creating lamination raw material:", error);
    return NextResponse.json({ error: "Failed to create lamination raw material" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const authResult = await requireLaminationApiPermission("canUpdate");
  if (!authResult.ok) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  try {
    const body = await request.json();
    const { id, name, code, percentage, unit, sequence, isActive, remarks } = body;

    if (!id) {
      return NextResponse.json({ error: "ID is required for update" }, { status: 400 });
    }

    const updateData: any = {};
    if (name !== undefined) updateData.name = name.trim();
    if (code !== undefined) updateData.code = code?.trim() || null;
    if (percentage !== undefined) updateData.percentage = Number(Number(percentage).toFixed(2));
    if (unit !== undefined) updateData.unit = unit?.trim() || "kg";
    if (sequence !== undefined) updateData.sequence = Number(sequence) || 0;
    if (isActive !== undefined) updateData.isActive = Boolean(isActive);
    if (remarks !== undefined) updateData.remarks = remarks?.trim() || null;

    const updated = await db.laminationRawMaterial.update({
      where: { id },
      data: updateData,
    });

    await logEvent({
      module: "DATA_CENTRE",
      action: `Updated Lamination Raw Material ${updated.name}`,
      severity: "INFO",
      payload: {
        id: updated.id,
        name: updated.name,
        percentage: updated.percentage,
      },
      httpMethod: "PUT",
      url: "/api/data-centre/lamination-raw-materials",
      statusCode: 200,
    }).catch(console.error);

    return NextResponse.json({ success: true, item: updated });
  } catch (error: any) {
    console.error("Error updating lamination raw material:", error);
    return NextResponse.json({ error: "Failed to update lamination raw material" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const authResult = await requireLaminationApiPermission("canDelete");
  if (!authResult.ok) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "ID is required for deletion" }, { status: 400 });
  }

  try {
    const deleted = await db.laminationRawMaterial.delete({
      where: { id },
    });

    await logEvent({
      module: "DATA_CENTRE",
      action: `Deleted Lamination Raw Material ${deleted.name}`,
      severity: "INFO",
      payload: {
        id: deleted.id,
        name: deleted.name,
      },
      httpMethod: "DELETE",
      url: "/api/data-centre/lamination-raw-materials",
      statusCode: 200,
    }).catch(console.error);

    return NextResponse.json({ success: true, deletedId: deleted.id });
  } catch (error: any) {
    console.error("Error deleting lamination raw material:", error);
    return NextResponse.json({ error: "Failed to delete lamination raw material" }, { status: 500 });
  }
}
