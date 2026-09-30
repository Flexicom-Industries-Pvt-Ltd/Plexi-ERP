import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePrintingApiPermission } from "@/lib/printing/permissions";
import { AvailablePrintingRoll } from "@/lib/printing/printing-types";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: NextRequest) {
  const authResult = await requirePrintingApiPermission("canRead");
  if (!authResult.ok) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  const { searchParams } = new URL(request.url);
  const search = (searchParams.get("search") || "").trim().toLowerCase();
  const quality = (searchParams.get("quality") || "").trim();

  try {
    const where: any = {};

    if (quality && quality !== "ALL") {
      where.qualityType = {
        equals: quality,
        mode: "insensitive",
      };
    }

    if (search) {
      where.OR = [
        { rollNumber: { contains: search, mode: "insensitive" } },
        { qualityType: { contains: search, mode: "insensitive" } },
        { size: { contains: search, mode: "insensitive" } },
      ];
    }

    // Pull from Loom Roll Cutting Entries
    const cuttingEntries = await db.loomRollCuttingEntry.findMany({
      where,
      include: {
        report: {
          select: {
            date: true,
            shiftName: true,
          },
        },
      },
      orderBy: [{ createdAt: "desc" }, { rollNumber: "asc" }],
      take: 200,
    });

    const rolls: AvailablePrintingRoll[] = cuttingEntries.map((e) => {
      const meter = Number(e.meter) || 0;
      const nettWeightKg = Number(e.nettWeightKg) || 0;
      const avg =
        meter > 0 && nettWeightKg > 0
          ? Math.round(((nettWeightKg * 1000) / meter) * 10) / 10
          : Number(e.avgWeightPerMeter) || 0;

      // Format Loom Number with shift if available
      const shiftShort = e.report?.shiftName ? (e.report.shiftName.includes("Day") ? "S1" : "S2") : "";
      const loomDisplay = shiftShort ? `${e.loomNumber} ${shiftShort}` : String(e.loomNumber);

      return {
        id: e.id,
        rollNumber: e.rollNumber,
        loomNumber: loomDisplay,
        qualityType: (e.qualityType || "STANDARD").trim(),
        meter,
        nettWeightKg,
        avgWeightPerMeter: avg,
        date: e.report?.date || "",
        shiftName: e.report?.shiftName || "",
      };
    });

    return NextResponse.json({
      success: true,
      rolls,
    });
  } catch (error: any) {
    console.error("GET /api/production/printing/available-rolls error:", error);
    return NextResponse.json(
      { error: "Failed to fetch available rolls for printing" },
      { status: 500 }
    );
  }
}
