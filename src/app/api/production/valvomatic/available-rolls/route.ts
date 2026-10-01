import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireValvomaticApiPermission } from "@/lib/valvomatic/permissions";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: NextRequest) {
  const authResult = await requireValvomaticApiPermission("canRead");
  if (!authResult.ok) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  const { searchParams } = new URL(request.url);
  const search = (searchParams.get("search") || "").trim();

  try {
    const where: any = {};
    if (search) {
      where.OR = [
        { rollNumber: { contains: search, mode: "insensitive" } },
        { companyName: { contains: search, mode: "insensitive" } },
        { quality: { contains: search, mode: "insensitive" } },
      ];
    }

    // Pull rolls from Printing Daily Report entries
    const printingEntries = await db.printingDailyReportEntry.findMany({
      where,
      include: {
        report: {
          select: {
            date: true,
            shiftName: true,
            machineNo: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    const rolls = printingEntries.map((p) => {
      const rollMtr = Number(p.printMeter) || Number(p.productionMeter) || 0;
      const netWeight = Number(p.netWeight) || 0;
      const avg = rollMtr > 0 && netWeight > 0 ? (netWeight / rollMtr) * 1000 : Number(p.avgWeight) || 0;

      return {
        id: p.id,
        rollNumber: p.rollNumber,
        companyName: p.companyName || "",
        unitName: p.unitName || "",
        grade: p.grade || "",
        targetProductionPcs: p.targetProductionMtrs ? Math.round(p.targetProductionMtrs / 0.6) : null,
        partyName: p.companyName || "",
        loomNumber: p.loomNumber || "",
        rollMtr: Math.round(rollMtr * 100) / 100,
        netWeight: Math.round(netWeight * 100) / 100,
        avgWeight: Math.round(avg * 100) / 100,
        source: "PRINTING",
        sourceDate: p.report?.date || "",
        sourceShift: p.report?.shiftName || "",
      };
    });

    return NextResponse.json({ success: true, rolls });
  } catch (error: any) {
    console.error("GET /api/production/valvomatic/available-rolls error:", error);
    return NextResponse.json(
      { error: "Failed to fetch available rolls for Valvomatic" },
      { status: 500 }
    );
  }
}
