import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireApiAuth } from "@/lib/api-auth";
import { Module } from "@/generated/prisma";
import { logEvent } from "@/lib/logging";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const auth = await requireApiAuth({
    module: [Module.DATA_CENTRE, Module.PRODUCTION, Module.SETTINGS],
    action: "canRead",
  });
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search")?.trim();
  const department = searchParams.get("department")?.trim();
  const activeOnly = searchParams.get("activeOnly") !== "false";

  try {
    const where: any = {};

    if (activeOnly) {
      where.isActive = true;
    }

    if (department && department !== "ALL") {
      where.OR = [
        { department: { equals: department, mode: "insensitive" } },
        { department: { equals: "ALL", mode: "insensitive" } },
      ];
    }

    if (search) {
      const searchConditions = [
        { name: { contains: search, mode: "insensitive" } },
        { code: { contains: search, mode: "insensitive" } },
        { phone: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { department: { contains: search, mode: "insensitive" } },
      ];

      if (where.OR) {
        where.AND = [{ OR: where.OR }, { OR: searchConditions }];
        delete where.OR;
      } else {
        where.OR = searchConditions;
      }
    }

    const supervisors = await db.supervisor.findMany({
      where,
      orderBy: [{ department: "asc" }, { name: "asc" }],
    });

    return NextResponse.json(supervisors, {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
      },
    });
  } catch (error: any) {
    console.error("Error fetching supervisors:", error);
    return NextResponse.json(
      { error: "Failed to fetch supervisors" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireApiAuth({
    module: [Module.DATA_CENTRE, Module.PRODUCTION, Module.SETTINGS],
    action: "canCreate",
  });
  if (!auth.ok) return auth.response;

  try {
    const body = await request.json();
    const {
      name,
      code,
      department = "LOOM",
      phone,
      email,
      shiftPreference,
      notes,
      isActive = true,
    } = body;

    if (!name || String(name).trim() === "") {
      return NextResponse.json(
        { error: "Supervisor name is required" },
        { status: 400 }
      );
    }

    let finalCode = code ? String(code).trim().toUpperCase() : null;

    if (!finalCode) {
      const count = await db.supervisor.count();
      let candidate = `SUP-${String(count + 1).padStart(3, "0")}`;
      let exists = await db.supervisor.findUnique({ where: { code: candidate } });
      let increment = 1;
      while (exists) {
        candidate = `SUP-${String(count + 1 + increment).padStart(3, "0")}`;
        exists = await db.supervisor.findUnique({ where: { code: candidate } });
        increment++;
      }
      finalCode = candidate;
    } else {
      const existing = await db.supervisor.findUnique({
        where: { code: finalCode },
      });
      if (existing) {
        return NextResponse.json(
          { error: `A supervisor with code '${finalCode}' already exists.` },
          { status: 409 }
        );
      }
    }

    const supervisor = await db.supervisor.create({
      data: {
        name: String(name).trim(),
        code: finalCode,
        department: department ? String(department).trim().toUpperCase() : "LOOM",
        phone: phone ? String(phone).trim() : null,
        email: email ? String(email).trim().toLowerCase() : null,
        shiftPreference: shiftPreference ? String(shiftPreference).trim() : null,
        notes: notes ? String(notes).trim() : null,
        isActive: Boolean(isActive),
      },
    });

    await logEvent({
      action: "CREATE_SUPERVISOR",
      module: "DATA_CENTRE",
      severity: "INFO",
      payload: { id: supervisor.id, name: supervisor.name, code: supervisor.code, department: supervisor.department },
      meta: { description: `Created supervisor ${supervisor.name} (${supervisor.code})` },
      userId: auth.user?.id,
    });

    return NextResponse.json(supervisor, { status: 201 });
  } catch (error: any) {
    console.error("Error creating supervisor:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to create supervisor" },
      { status: 500 }
    );
  }
}
