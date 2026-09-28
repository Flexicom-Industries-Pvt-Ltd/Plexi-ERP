import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireLoomApiPermission } from "@/lib/loom/permissions";
import {
  LoomRollStockItem,
  computeRollStockSummary,
} from "@/lib/loom/loom-roll-stock-types";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: NextRequest) {
  const authResult = await requireLoomApiPermission("canRead");
  if (!authResult.ok) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  const { searchParams } = new URL(request.url);
  const search = (searchParams.get("search") || "").trim().toLowerCase();
  const quality = (searchParams.get("quality") || "ALL").trim();
  const shiftName = (searchParams.get("shiftName") || "ALL").trim();
  const loomNumberParam = searchParams.get("loomNumber") || "ALL";
  const dateFrom = searchParams.get("dateFrom") || "";
  const dateTo = searchParams.get("dateTo") || "";
  const singleDate = searchParams.get("date") || "";

  try {
    // Build Prisma query condition
    const whereCondition: any = {};

    // Date filtering (via related report)
    if (singleDate) {
      whereCondition.report = {
        date: singleDate,
      };
    } else if (dateFrom || dateTo) {
      whereCondition.report = {
        date: {
          ...(dateFrom ? { gte: dateFrom } : {}),
          ...(dateTo ? { lte: dateTo } : {}),
        },
      };
    }

    // Shift filtering (via related report)
    if (shiftName && shiftName !== "ALL") {
      if (!whereCondition.report) whereCondition.report = {};
      whereCondition.report.shiftName = {
        contains: shiftName,
        mode: "insensitive",
      };
    }

    // Quality filtering
    if (quality && quality !== "ALL") {
      whereCondition.qualityType = {
        equals: quality,
        mode: "insensitive",
      };
    }

    // Loom Number filtering
    if (loomNumberParam && loomNumberParam !== "ALL") {
      const parsedLoom = Number(loomNumberParam);
      if (!isNaN(parsedLoom)) {
        whereCondition.loomNumber = parsedLoom;
      }
    }

    // Text Search
    if (search) {
      const searchNum = Number(search.replace(/[^0-9]/g, ""));
      whereCondition.OR = [
        { rollNumber: { contains: search, mode: "insensitive" } },
        { qualityType: { contains: search, mode: "insensitive" } },
        { contractor: { contains: search, mode: "insensitive" } },
        { size: { contains: search, mode: "insensitive" } },
        { supervisorSign: { contains: search, mode: "insensitive" } },
        { remarks: { contains: search, mode: "insensitive" } },
        ...(!isNaN(searchNum) && searchNum > 0 ? [{ loomNumber: searchNum }] : []),
      ];
    }

    // Concurrent DB fetching
    const [entries, shifts, tapeRecipes, loomMappings] = await Promise.all([
      db.loomRollCuttingEntry.findMany({
        where: whereCondition,
        include: {
          report: {
            select: {
              date: true,
              shiftName: true,
              supervisorName: true,
              status: true,
            },
          },
        },
        orderBy: [
          { report: { date: "desc" } },
          { sequence: "desc" },
          { createdAt: "desc" },
        ],
        take: 1000,
      }),
      db.shift.findMany({
        where: { isActive: true },
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      }),
      db.tapePlantRecipe.findMany({
        where: { isActive: true },
        select: { code: true, colour: true, colorGroup: true, denier: true, spacerSize: true },
        orderBy: { code: "asc" },
      }),
      db.loomMachineMapping.findMany({
        where: { isActive: true },
        select: { qualityCode: true, colour: true, colorGroup: true, denier: true, reedSpaceCm: true },
        orderBy: { qualityCode: "asc" },
      }),
    ]);

    // Construct quality catalog
    const qualityMap = new Map<string, { code: string; colorGroup: string; colour: string }>();
    tapeRecipes.forEach((r) => {
      qualityMap.set(r.code, {
        code: r.code,
        colorGroup: r.colorGroup || "Standard",
        colour: r.colour || "White",
      });
    });
    loomMappings.forEach((m) => {
      if (!qualityMap.has(m.qualityCode)) {
        qualityMap.set(m.qualityCode, {
          code: m.qualityCode,
          colorGroup: m.colorGroup || "Standard",
          colour: m.colour || "White",
        });
      }
    });

    // Transform entries into clean LoomRollStockItem objects
    const rolls: LoomRollStockItem[] = entries.map((e) => {
      // Ensure quality in map
      if (e.qualityType && !qualityMap.has(e.qualityType)) {
        qualityMap.set(e.qualityType, {
          code: e.qualityType,
          colorGroup: "Standard",
          colour: "White",
        });
      }

      return {
        id: e.id,
        sequence: e.sequence,
        rollNumber: e.rollNumber,
        loomNumber: e.loomNumber,
        size: e.size || "",
        qualityType: e.qualityType,
        initialReading: e.initialReading,
        finalReading: e.finalReading,
        meter: e.meter,
        grossWeightKg: e.grossWeightKg,
        tareWeightKg: e.tareWeightKg,
        nettWeightKg: e.nettWeightKg,
        avgWeightPerMeter: e.avgWeightPerMeter || 0,
        contractor: e.contractor || "",
        supervisorSign: e.supervisorSign || e.report?.supervisorName || "",
        remarks: e.remarks || "",
        date: e.report?.date || e.createdAt.toISOString().slice(0, 10),
        shiftName: e.report?.shiftName || "Day Shift",
        reportId: e.reportId,
        status: e.report?.status || "LOGGED",
        createdAt: e.createdAt.toISOString(),
      };
    });

    // Compute live stock summary
    const summary = computeRollStockSummary(rolls);

    const availableQualities = Array.from(qualityMap.values()).sort((a, b) => a.code.localeCompare(b.code));
    const availableLooms = Array.from(new Set(rolls.map((r) => r.loomNumber))).sort((a, b) => a - b);
    const availableContractors = Array.from(
      new Set(rolls.map((r) => r.contractor).filter(Boolean))
    ).sort();

    return NextResponse.json({
      success: true,
      rolls,
      summary,
      availableQualities,
      availableShifts: shifts,
      availableLooms,
      availableContractors,
    });
  } catch (error: any) {
    console.error("GET /api/production/loom/roll-stock error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch Loom Roll Stock" },
      { status: 500 }
    );
  }
}
