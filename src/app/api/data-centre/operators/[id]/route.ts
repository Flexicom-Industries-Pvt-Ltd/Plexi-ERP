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
    module: [Module.DATA_CENTRE, Module.PRODUCTION, Module.SETTINGS],
    action: "canRead",
  });
  if (!auth.ok) return auth.response;

  const { id } = await params;

  try {
    const operator = await db.operator.findUnique({
      where: { id },
    });

    if (!operator) {
      return NextResponse.json({ error: "Operator not found" }, { status: 404 });
    }

    return NextResponse.json(operator);
  } catch (error: any) {
    console.error("Error fetching operator:", error);
    return NextResponse.json(
      { error: "Failed to fetch operator" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireApiAuth({
    module: [Module.DATA_CENTRE, Module.PRODUCTION, Module.SETTINGS],
    action: "canUpdate",
  });
  if (!auth.ok) return auth.response;

  const { id } = await params;

  try {
    const existing = await db.operator.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Operator not found" }, { status: 404 });
    }

    const body = await request.json();
    const {
      name,
      code,
      section,
      sectionName,
      phone,
      shiftPreference,
      designation,
      notes,
      isActive,
    } = body;

    const cleanCode = code !== undefined ? (code ? String(code).trim().toUpperCase() : null) : existing.code;

    if (cleanCode && cleanCode !== existing.code) {
      const duplicate = await db.operator.findUnique({
        where: { code: cleanCode },
      });
      if (duplicate && duplicate.id !== id) {
        return NextResponse.json(
          { error: `An operator with code '${cleanCode}' already exists.` },
          { status: 409 }
        );
      }
    }

    const updated = await db.operator.update({
      where: { id },
      data: {
        ...(name !== undefined && { name: String(name).trim() }),
        ...(code !== undefined && { code: cleanCode }),
        ...(section !== undefined && { section: String(section).trim().toUpperCase() }),
        ...(sectionName !== undefined && { sectionName: sectionName ? String(sectionName).trim() : null }),
        ...(phone !== undefined && { phone: phone ? String(phone).trim() : null }),
        ...(shiftPreference !== undefined && { shiftPreference: shiftPreference ? String(shiftPreference).trim() : null }),
        ...(designation !== undefined && { designation: designation ? String(designation).trim() : "Operator" }),
        ...(notes !== undefined && { notes: notes ? String(notes).trim() : null }),
        ...(isActive !== undefined && { isActive: Boolean(isActive) }),
      },
    });

    await logEvent({
      action: "UPDATE_OPERATOR",
      module: "DATA_CENTRE",
      severity: "INFO",
      payload: { id, name: updated.name, section: updated.section },
      meta: { description: `Updated operator ${updated.name} (${updated.section})` },
      userId: auth.user?.id,
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error("Error updating operator:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to update operator" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireApiAuth({
    module: [Module.DATA_CENTRE, Module.PRODUCTION, Module.SETTINGS],
    action: "canDelete",
  });
  if (!auth.ok) return auth.response;

  const { id } = await params;

  try {
    const existing = await db.operator.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Operator not found" }, { status: 404 });
    }

    await db.operator.delete({
      where: { id },
    });

    await logEvent({
      action: "DELETE_OPERATOR",
      module: "DATA_CENTRE",
      severity: "INFO",
      payload: { id, name: existing.name, section: existing.section },
      meta: { description: `Deleted operator ${existing.name} (${existing.section})` },
      userId: auth.user?.id,
    });

    return NextResponse.json({ success: true, message: "Operator deleted successfully" });
  } catch (error: any) {
    console.error("Error deleting operator:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to delete operator" },
      { status: 500 }
    );
  }
}
