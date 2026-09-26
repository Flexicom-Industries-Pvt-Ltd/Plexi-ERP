import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireTapePlantApiPermission } from "@/lib/tape-plant/permissions";
import {
  BOBBIN_WEIGHT_KG,
  CRATE_WEIGHT_KG,
  BOBBINS_PER_CRATE,
  computeNetProductionKg,
  computeCrateStockCount,
} from "@/lib/tape-plant/bobbin-stock";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: NextRequest) {
  const authResult = await requireTapePlantApiPermission("canRead");
  if (!authResult.ok) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date");
  const dateFrom = searchParams.get("dateFrom");
  const dateTo = searchParams.get("dateTo");
  const shiftId = searchParams.get("shiftId");
  const recipeQuality = searchParams.get("recipeQuality");
  const loomNumber = searchParams.get("loomNumber");
  const search = searchParams.get("search");
  const scope = searchParams.get("scope"); // "all" | "single" | "range"

  try {
    const whereClause: any = {
      status: { not: "CANCELLED" },
    };

    if (scope === "single" && date) {
      whereClause.date = date;
    } else if (dateFrom && dateTo) {
      whereClause.date = { gte: dateFrom, lte: dateTo };
    } else if (dateFrom) {
      whereClause.date = { gte: dateFrom };
    } else if (dateTo) {
      whereClause.date = { lte: dateTo };
    } else if (date && !scope) {
      whereClause.date = date;
    }

    if (shiftId && shiftId.toUpperCase() !== "ALL") {
      whereClause.shiftId = shiftId;
    }

    if (recipeQuality && recipeQuality.trim() !== "") {
      whereClause.recipeQuality = {
        contains: recipeQuality.trim(),
        mode: "insensitive",
      };
    }

    if (loomNumber && !isNaN(Number(loomNumber))) {
      whereClause.loomNumber = Number(loomNumber);
    }

    if (search && search.trim() !== "") {
      const q = search.trim();
      whereClause.OR = [
        { slipNumber: { contains: q, mode: "insensitive" } },
        { recipeQuality: { contains: q, mode: "insensitive" } },
        { issuedBy: { contains: q, mode: "insensitive" } },
        { receivedBy: { contains: q, mode: "insensitive" } },
        { remarks: { contains: q, mode: "insensitive" } },
      ];
    }

    const issues = await db.tapePlantBobbinIssue.findMany({
      where: whereClause,
      include: {
        shift: {
          select: { id: true, name: true },
        },
      },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    });

    const formattedIssues = issues.map((i, idx) => ({
      slNo: idx + 1,
      id: i.id,
      slipNumber: i.slipNumber,
      date: i.date,
      shiftId: i.shiftId,
      shiftName: i.shift?.name || i.shiftId,
      recipeQuality: i.recipeQuality,
      loomNumber: i.loomNumber,
      loomIdentifier: i.loomIdentifier || (i.loomNumber ? `Loom #${i.loomNumber}` : null),
      crateCount: Number(i.crateCount),
      bobbinCount: Number(i.bobbinCount),
      weightKg: Number(i.weightKg),
      issuedBy: i.issuedBy || "—",
      receivedBy: i.receivedBy || "—",
      remarks: i.remarks || "",
      status: i.status,
      createdAt: i.createdAt.toISOString(),
    }));

    const totalCrates = formattedIssues.reduce((sum, i) => sum + i.crateCount, 0);
    const totalBobbins = formattedIssues.reduce((sum, i) => sum + i.bobbinCount, 0);
    const totalWeightKg = formattedIssues.reduce((sum, i) => sum + i.weightKg, 0);
    const uniqueLooms = new Set(formattedIssues.map((i) => i.loomNumber).filter(Boolean));
    const uniqueQualities = new Set(formattedIssues.map((i) => i.recipeQuality.trim()).filter(Boolean));

    return NextResponse.json({
      issues: formattedIssues,
      totals: {
        totalIssuesCount: formattedIssues.length,
        totalCratesIssued: Number(totalCrates.toFixed(2)),
        totalBobbinsIssued: Number(totalBobbins.toFixed(2)),
        totalWeightIssuedKg: Number(totalWeightKg.toFixed(2)),
        uniqueLoomsCount: uniqueLooms.size,
        uniqueQualitiesCount: uniqueQualities.size,
      },
    });
  } catch (error) {
    console.error("Error fetching bobbin issues:", error);
    return NextResponse.json({ error: "Failed to fetch bobbin issues" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const authResult = await requireTapePlantApiPermission("canCreate");
  if (!authResult.ok) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  try {
    const body = await request.json();
    const {
      date,
      shiftId,
      recipeQuality,
      loomNumber,
      loomIdentifier,
      crateCount,
      issuedBy,
      receivedBy,
      remarks,
    } = body;

    if (!date || typeof date !== "string") {
      return NextResponse.json({ error: "Date is required (YYYY-MM-DD)" }, { status: 400 });
    }

    if (!shiftId || typeof shiftId !== "string") {
      return NextResponse.json({ error: "Shift is required" }, { status: 400 });
    }

    if (!recipeQuality || typeof recipeQuality !== "string" || !recipeQuality.trim()) {
      return NextResponse.json({ error: "Quality name / recipe code is required" }, { status: 400 });
    }

    const crates = Number(crateCount);
    if (isNaN(crates) || crates <= 0) {
      return NextResponse.json({ error: "Number of crates must be greater than 0" }, { status: 400 });
    }

    const cleanQuality = recipeQuality.trim();
    const parsedLoomNumber = loomNumber !== undefined && loomNumber !== null && loomNumber !== "" ? Number(loomNumber) : null;

    // Check Cumulative Stock Available for this Quality
    // 1. Calculate cumulative net produced till now
    const allPostProd = await db.tapePlantPostProduction.findMany({
      select: {
        recipeQuality: true,
        productionDoneKg: true,
        wasteKg: true,
        entries: true,
      },
    });

    let totalProducedNetKg = 0;
    for (const post of allPostProd) {
      const entries = Array.isArray(post.entries) ? (post.entries as any[]) : [];
      if (entries.length > 0) {
        for (const e of entries) {
          const eq = (e.recipeQuality || post.recipeQuality || "").trim().toUpperCase();
          if (eq === cleanQuality.toUpperCase()) {
            const g = Number(e.productionDoneKg) || 0;
            const w = Number(e.wasteKg) || 0;
            totalProducedNetKg += computeNetProductionKg(g, w);
          }
        }
      } else if (post.recipeQuality && post.recipeQuality.trim().toUpperCase() === cleanQuality.toUpperCase()) {
        const g = Number(post.productionDoneKg) || 0;
        const w = Number(post.wasteKg) || 0;
        totalProducedNetKg += computeNetProductionKg(g, w);
      }
    }

    // 2. Calculate cumulative previously issued crates for this quality
    const prevIssues = await db.tapePlantBobbinIssue.findMany({
      where: {
        recipeQuality: {
          equals: cleanQuality,
          mode: "insensitive",
        },
        status: { not: "CANCELLED" },
      },
      select: {
        crateCount: true,
        weightKg: true,
      },
    });

    const totalPrevIssuedCrates = prevIssues.reduce((sum, i) => sum + (Number(i.crateCount) || 0), 0);
    const totalAvailableCrates = Math.max(0, computeCrateStockCount(totalProducedNetKg) - totalPrevIssuedCrates);

    if (crates > totalAvailableCrates && totalProducedNetKg > 0) {
      return NextResponse.json(
        {
          error: `Insufficient stock for "${cleanQuality}". Requested: ${crates} crates, Available balance: ${totalAvailableCrates.toFixed(2)} crates (${(totalAvailableCrates * CRATE_WEIGHT_KG).toFixed(1)} kg).`,
          availableCrates: totalAvailableCrates,
        },
        { status: 400 }
      );
    }

    // Auto-compute Bobbins and KG
    const bobbinCount = Number((crates * BOBBINS_PER_CRATE).toFixed(2));
    const weightKg = Number((crates * CRATE_WEIGHT_KG).toFixed(2));

    // Safely resolve Shift FK without throwing constraint violation
    let resolvedShiftId: string | null = null;
    let resolvedShiftName: string = body.shiftName ? String(body.shiftName).trim() : "";

    if (shiftId && String(shiftId).toUpperCase() !== "ALL") {
      const rawShift = String(shiftId).trim();
      let match = await db.shift.findUnique({
        where: { id: rawShift },
      });

      if (!match) {
        match = await db.shift.findFirst({
          where: {
            name: { equals: rawShift, mode: "insensitive" },
          },
        });
      }

      if (!match) {
        if (/night/i.test(rawShift)) {
          match = await db.shift.findFirst({
            where: { name: { contains: "Night", mode: "insensitive" } },
          });
        } else if (/day/i.test(rawShift)) {
          match = await db.shift.findFirst({
            where: { name: { contains: "Day", mode: "insensitive" } },
          });
        }
      }

      if (match) {
        resolvedShiftId = match.id;
        if (!resolvedShiftName) resolvedShiftName = match.name;
      } else {
        resolvedShiftId = null;
        if (!resolvedShiftName) {
          if (/night/i.test(rawShift)) resolvedShiftName = "Night Shift";
          else if (/day/i.test(rawShift)) resolvedShiftName = "Day Shift";
          else resolvedShiftName = rawShift;
        }
      }
    } else {
      const firstShift = await db.shift.findFirst({
        where: { isActive: true },
        orderBy: { createdAt: "asc" },
      });
      resolvedShiftId = firstShift?.id || null;
      if (!resolvedShiftName) resolvedShiftName = firstShift?.name || "General Shift";
    }

    // Generate unique sequential slipNumber: TP-ISS-YYYYMMDD-XXXX
    const dateCompact = date.replace(/-/g, "");
    const todayIssuesCount = await db.tapePlantBobbinIssue.count({
      where: {
        date,
      },
    });

    const seq = String(todayIssuesCount + 1).padStart(4, "0");
    const slipNumber = `TP-ISS-${dateCompact}-${seq}`;

    const created = await db.tapePlantBobbinIssue.create({
      data: {
        slipNumber,
        date,
        shiftId: resolvedShiftId,
        shiftName: resolvedShiftName,
        recipeQuality: cleanQuality,
        loomNumber: parsedLoomNumber,
        loomIdentifier: loomIdentifier || (parsedLoomNumber ? `Loom #${parsedLoomNumber}` : null),
        crateCount: crates,
        bobbinCount,
        weightKg,
        issuedBy: issuedBy ? String(issuedBy).trim() : null,
        receivedBy: receivedBy ? String(receivedBy).trim() : null,
        remarks: remarks ? String(remarks).trim() : null,
        status: "ISSUED",
      },
      include: {
        shift: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json({
      success: true,
      issue: {
        id: created.id,
        slipNumber: created.slipNumber,
        date: created.date,
        shiftId: created.shiftId || "shift_day",
        shiftName: created.shift?.name || created.shiftName || "General Shift",
        recipeQuality: created.recipeQuality,
        loomNumber: created.loomNumber,
        loomIdentifier: created.loomIdentifier,
        crateCount: Number(created.crateCount),
        bobbinCount: Number(created.bobbinCount),
        weightKg: Number(created.weightKg),
        issuedBy: created.issuedBy || "—",
        receivedBy: created.receivedBy || "—",
        remarks: created.remarks || "",
        status: created.status,
        createdAt: created.createdAt.toISOString(),
      },
    });
  } catch (error: any) {
    console.error("Error creating bobbin issue:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to record bobbin issue" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  const authResult = await requireTapePlantApiPermission("canDelete");
  if (!authResult.ok) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "Issue ID is required" }, { status: 400 });
  }

  try {
    const existing = await db.tapePlantBobbinIssue.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Bobbin issue record not found" }, { status: 404 });
    }

    await db.tapePlantBobbinIssue.update({
      where: { id },
      data: { status: "CANCELLED" },
    });

    return NextResponse.json({
      success: true,
      message: `Bobbin issue ${existing.slipNumber} has been cancelled`,
    });
  } catch (error) {
    console.error("Error cancelling bobbin issue:", error);
    return NextResponse.json({ error: "Failed to cancel bobbin issue" }, { status: 500 });
  }
}
