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
        { contactPerson: { contains: search, mode: "insensitive" } },
        { phone: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { section: { contains: search, mode: "insensitive" } },
      ];

      if (where.OR) {
        where.AND = [{ OR: where.OR }, { OR: searchConditions }];
        delete where.OR;
      } else {
        where.OR = searchConditions;
      }
    }

    const contractors = await db.contractor.findMany({
      where,
      orderBy: [{ name: "asc" }],
    });

    return NextResponse.json(contractors, {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
      },
    });
  } catch (error: any) {
    console.error("Error fetching contractors:", error);
    return NextResponse.json(
      { error: "Failed to fetch contractors" },
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
      contactPerson,
      phone,
      email,
      address,
      section = "LOOM",
      notes,
      isActive = true,
    } = body;

    if (!name || String(name).trim() === "") {
      return NextResponse.json(
        { error: "Contractor name is required" },
        { status: 400 }
      );
    }

    let finalCode = code ? String(code).trim().toUpperCase() : null;

    if (!finalCode) {
      const count = await db.contractor.count();
      finalCode = `CON-${String(count + 1).padStart(3, "0")}`;
    }

    // Check duplicate code
    const existingCode = await db.contractor.findUnique({
      where: { code: finalCode },
    });
    if (existingCode) {
      const rand = Math.floor(100 + Math.random() * 900);
      finalCode = `${finalCode}-${rand}`;
    }

    const contractor = await db.contractor.create({
      data: {
        name: String(name).trim(),
        code: finalCode,
        contactPerson: contactPerson ? String(contactPerson).trim() : null,
        phone: phone ? String(phone).trim() : null,
        email: email ? String(email).trim() : null,
        address: address ? String(address).trim() : null,
        section: section ? String(section).trim().toUpperCase() : "LOOM",
        notes: notes ? String(notes).trim() : null,
        isActive: Boolean(isActive),
      },
    });

    await logEvent({
      module: "DATA_CENTRE",
      action: "CONTRACTOR_CREATED",
      severity: "INFO",
      payload: {
        contractorId: contractor.id,
        name: contractor.name,
        code: contractor.code,
        section: contractor.section,
      },
    });

    return NextResponse.json(contractor, { status: 201 });
  } catch (error: any) {
    console.error("Error creating contractor:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create contractor" },
      { status: 500 }
    );
  }
}
