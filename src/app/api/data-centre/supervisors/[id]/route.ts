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
    const supervisor = await db.supervisor.findUnique({
      where: { id },
    });

    if (!supervisor) {
      return NextResponse.json({ error: "Supervisor not found" }, { status: 404 });
    }

    return NextResponse.json(supervisor);
  } catch (error: any) {
    console.error("Error fetching supervisor:", error);
    return NextResponse.json(
      { error: "Failed to fetch supervisor" },
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
    const existing = await db.supervisor.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Supervisor not found" }, { status: 404 });
    }

    const body = await request.json();
    const {
      name,
      code,
      department,
      phone,
      email,
      shiftPreference,
      notes,
      isActive,
    } = body;

    const cleanCode = code !== undefined ? (code ? String(code).trim().toUpperCase() : null) : existing.code;

    if (cleanCode && cleanCode !== existing.code) {
      const duplicate = await db.supervisor.findUnique({
        where: { code: cleanCode },
      });
      if (duplicate && duplicate.id !== id) {
        return NextResponse.json(
          { error: `A supervisor with code '${cleanCode}' already exists.` },
          { status: 409 }
        );
      }
    }

    const updated = await db.supervisor.update({
      where: { id },
      data: {
        ...(name !== undefined && { name: String(name).trim() }),
        ...(code !== undefined && { code: cleanCode }),
        ...(department !== undefined && { department: String(department).trim().toUpperCase() }),
        ...(phone !== undefined && { phone: phone ? String(phone).trim() : null }),
        ...(email !== undefined && { email: email ? String(email).trim().toLowerCase() : null }),
        ...(shiftPreference !== undefined && { shiftPreference: shiftPreference ? String(shiftPreference).trim() : null }),
        ...(notes !== undefined && { notes: notes ? String(notes).trim() : null }),
        ...(isActive !== undefined && { isActive: Boolean(isActive) }),
      },
    });

    await logEvent({
      action: "UPDATE_SUPERVISOR",
      module: "DATA_CENTRE",
      severity: "INFO",
      payload: { id, name: updated.name, code: updated.code, department: updated.department },
      meta: { description: `Updated supervisor ${updated.name} (${updated.code})` },
      userId: auth.user?.id,
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error("Error updating supervisor:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to update supervisor" },
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
    const existing = await db.supervisor.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Supervisor not found" }, { status: 404 });
    }

    await db.supervisor.delete({
      where: { id },
    });

    await logEvent({
      action: "DELETE_SUPERVISOR",
      module: "DATA_CENTRE",
      severity: "INFO",
      payload: { id, name: existing.name, code: existing.code, department: existing.department },
      meta: { description: `Deleted supervisor ${existing.name} (${existing.code})` },
      userId: auth.user?.id,
    });

    return NextResponse.json({ success: true, message: "Supervisor deleted successfully" });
  } catch (error: any) {
    console.error("Error deleting supervisor:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to delete supervisor" },
      { status: 500 }
    );
  }
}
