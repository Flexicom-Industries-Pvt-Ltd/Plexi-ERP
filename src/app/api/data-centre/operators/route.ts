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
  const section = searchParams.get("section")?.trim();
  const activeOnly = searchParams.get("activeOnly") !== "false";

  try {
    const where: any = {};

    if (activeOnly) {
      where.isActive = true;
    }

    if (section && section !== "ALL") {
      where.OR = [
        { section: { equals: section, mode: "insensitive" } },
        { section: { equals: "ALL", mode: "insensitive" } },
      ];
    }

    if (search) {
      const searchConditions = [
        { name: { contains: search, mode: "insensitive" } },
        { code: { contains: search, mode: "insensitive" } },
        { phone: { contains: search, mode: "insensitive" } },
        { designation: { contains: search, mode: "insensitive" } },
        { sectionName: { contains: search, mode: "insensitive" } },
      ];

      if (where.OR) {
        where.AND = [{ OR: where.OR }, { OR: searchConditions }];
        delete where.OR;
      } else {
        where.OR = searchConditions;
      }
    }

    const operators = await db.operator.findMany({
      where,
      orderBy: [{ section: "asc" }, { name: "asc" }],
    });

    return NextResponse.json(operators, {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
      },
    });
  } catch (error: any) {
    console.error("Error fetching operators:", error);
    return NextResponse.json(
      { error: "Failed to fetch operators" },
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
      section,
      sectionName,
      phone,
      shiftPreference,
      designation,
      notes,
      isActive = true,
    } = body;

    if (!name || String(name).trim() === "") {
      return NextResponse.json(
        { error: "Operator name is required" },
        { status: 400 }
      );
    }

    if (!section || String(section).trim() === "") {
      return NextResponse.json(
        { error: "Plant section is required" },
        { status: 400 }
      );
    }

    const cleanName = String(name).trim();
    const cleanSection = String(section).trim().toUpperCase();
    const cleanCode = code ? String(code).trim().toUpperCase() : null;

    if (cleanCode) {
      const existing = await db.operator.findUnique({
        where: { code: cleanCode },
      });
      if (existing) {
        return NextResponse.json(
          { error: `An operator with code '${cleanCode}' already exists.` },
          { status: 409 }
        );
      }
    }

    const operator = await db.operator.create({
      data: {
        name: cleanName,
        code: cleanCode,
        section: cleanSection,
        sectionName: sectionName ? String(sectionName).trim() : null,
        phone: phone ? String(phone).trim() : null,
        shiftPreference: shiftPreference ? String(shiftPreference).trim() : null,
        designation: designation ? String(designation).trim() : "Operator",
        notes: notes ? String(notes).trim() : null,
        isActive: Boolean(isActive),
      },
    });

    await logEvent({
      action: "CREATE_OPERATOR",
      module: "DATA_CENTRE",
      severity: "INFO",
      payload: { id: operator.id, name: operator.name, section: operator.section },
      meta: { description: `Registered new operator ${operator.name} for section ${operator.section}` },
      userId: auth.user?.id,
    });

    return NextResponse.json(operator, { status: 201 });
  } catch (error: any) {
    console.error("Error creating operator:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to create operator" },
      { status: 500 }
    );
  }
}
