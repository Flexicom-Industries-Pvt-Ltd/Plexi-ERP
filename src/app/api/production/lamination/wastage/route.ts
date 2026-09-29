import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireLaminationApiPermission } from "@/lib/lamination/permissions";
import { calculateWastage } from "@/lib/lamination/lamination-wastage-types";
import { logEvent } from "@/lib/logging";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: NextRequest) {
  const authResult = await requireLaminationApiPermission("canRead");
  if (!authResult.ok) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  const date = searchParams.get("date");
  const shiftName = searchParams.get("shiftName");
  const dateFrom = searchParams.get("dateFrom");
  const dateTo = searchParams.get("dateTo");

  try {
    // Single report fetch by ID
    if (id) {
      const report = await db.laminationWastageReport.findUnique({
        where: { id },
      });
      if (!report) {
        return NextResponse.json({ error: "Report not found" }, { status: 404 });
      }
      return NextResponse.json({ success: true, report });
    }

    // Single report fetch by Date & Shift
    if (date && shiftName) {
      const existingReport = await db.laminationWastageReport.findUnique({
        where: {
          date_shiftName: { date, shiftName },
        },
      });

      // Also pull latest base sources from Raw Material and Production sheets
      const [rawMaterialReport, productionReport] = await Promise.all([
        db.laminationRawMaterialReport.findUnique({
          where: { date_shiftName: { date, shiftName } },
        }),
        db.laminationProductionReport.findUnique({
          where: { date_shiftName: { date, shiftName } },
        }),
      ]);

      const sourceRawMaterialKg = rawMaterialReport?.manualTotalKg || 0;
      const sourceFabricNetWtKg = productionReport?.totalNetWtBefore || 0;
      const defaultOperator = productionReport?.operatorName || rawMaterialReport?.operatorName || "";
      const defaultContractor = (productionReport as any)?.contractorName || "";

      if (!existingReport) {
        // Return freshly populated draft with auto-pulled base quantities
        const initialCalculations = calculateWastage(sourceRawMaterialKg, 0, sourceFabricNetWtKg, 0);

        return NextResponse.json({
          success: true,
          exists: false,
          report: {
            date,
            shiftName,
            operatorName: defaultOperator,
            contractorName: defaultContractor,
            supervisorName: "",
            ...initialCalculations,
            status: "DRAFT",
            remarks: "",
          },
          sources: {
            hasRawMaterialReport: Boolean(rawMaterialReport),
            hasProductionReport: Boolean(productionReport),
            sourceRawMaterialKg,
            sourceFabricNetWtKg,
          },
        });
      }

      return NextResponse.json({
        success: true,
        exists: true,
        report: existingReport,
        sources: {
          hasRawMaterialReport: Boolean(rawMaterialReport),
          hasProductionReport: Boolean(productionReport),
          sourceRawMaterialKg,
          sourceFabricNetWtKg,
        },
      });
    }

    // List of reports
    const where: any = {};
    if (dateFrom && dateTo) {
      where.date = { gte: dateFrom, lte: dateTo };
    } else if (dateFrom) {
      where.date = { gte: dateFrom };
    } else if (date) {
      where.date = date;
    }

    const reports = await db.laminationWastageReport.findMany({
      where,
      orderBy: [{ date: "desc" }, { shiftName: "asc" }],
    });

    return NextResponse.json({ success: true, reports });
  } catch (error: any) {
    console.error("Error fetching lamination wastage report:", error);
    return NextResponse.json({ error: "Failed to fetch wastage report" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const authResult = await requireLaminationApiPermission("canCreate");
  if (!authResult.ok) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  try {
    const body = await request.json();
    const {
      date,
      shiftName,
      operatorName,
      operatorId,
      contractorName,
      contractorId,
      supervisorName,
      rawMaterialUsedKg = 0,
      lumpsWastageKg = 0,
      fabricNetWeightKg = 0,
      fabricWastageKg = 0,
      status = "DRAFT",
      remarks,
    } = body;

    if (!date || !shiftName) {
      return NextResponse.json({ error: "Date and Shift are required" }, { status: 400 });
    }

    const calculated = calculateWastage(
      Number(rawMaterialUsedKg) || 0,
      Number(lumpsWastageKg) || 0,
      Number(fabricNetWeightKg) || 0,
      Number(fabricWastageKg) || 0
    );

    const report = await db.laminationWastageReport.upsert({
      where: {
        date_shiftName: { date, shiftName },
      },
      update: {
        operatorName: operatorName?.trim() || null,
        operatorId: operatorId || null,
        contractorName: contractorName?.trim() || null,
        contractorId: contractorId || null,
        supervisorName: supervisorName?.trim() || null,
        rawMaterialUsedKg: calculated.rawMaterialUsedKg,
        lumpsWastageKg: calculated.lumpsWastageKg,
        lumpsWastagePct: calculated.lumpsWastagePct,
        fabricNetWeightKg: calculated.fabricNetWeightKg,
        fabricWastageKg: calculated.fabricWastageKg,
        fabricWastagePct: calculated.fabricWastagePct,
        totalBaseKg: calculated.totalBaseKg,
        totalWastageKg: calculated.totalWastageKg,
        totalWastagePct: calculated.totalWastagePct,
        status,
        remarks: remarks?.trim() || null,
      },
      create: {
        date,
        shiftName,
        operatorName: operatorName?.trim() || null,
        operatorId: operatorId || null,
        contractorName: contractorName?.trim() || null,
        contractorId: contractorId || null,
        supervisorName: supervisorName?.trim() || null,
        rawMaterialUsedKg: calculated.rawMaterialUsedKg,
        lumpsWastageKg: calculated.lumpsWastageKg,
        lumpsWastagePct: calculated.lumpsWastagePct,
        fabricNetWeightKg: calculated.fabricNetWeightKg,
        fabricWastageKg: calculated.fabricWastageKg,
        fabricWastagePct: calculated.fabricWastagePct,
        totalBaseKg: calculated.totalBaseKg,
        totalWastageKg: calculated.totalWastageKg,
        totalWastagePct: calculated.totalWastagePct,
        status,
        remarks: remarks?.trim() || null,
      },
    });

    await logEvent({
      module: "LAMINATION",
      action: `Saved Lamination Wastage Report for ${report.date} (${report.shiftName})`,
      severity: "INFO",
      payload: {
        reportId: report.id,
        date: report.date,
        shift: report.shiftName,
        totalWastageKg: report.totalWastageKg,
        totalWastagePct: report.totalWastagePct,
      },
      httpMethod: "POST",
      url: "/api/production/lamination/wastage",
      statusCode: 200,
    }).catch(console.error);

    return NextResponse.json({
      success: true,
      report,
      message: "Lamination Wastage report saved successfully",
    });
  } catch (error: any) {
    console.error("Error saving lamination wastage report:", error);
    return NextResponse.json(
      { error: "Failed to save wastage report", details: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  const authResult = await requireLaminationApiPermission("canDelete");
  if (!authResult.ok) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  const date = searchParams.get("date");
  const shiftName = searchParams.get("shiftName");

  try {
    if (id) {
      await db.laminationWastageReport.delete({
        where: { id },
      });
      return NextResponse.json({ success: true, deletedId: id });
    }

    if (date && shiftName) {
      await db.laminationWastageReport.delete({
        where: { date_shiftName: { date, shiftName } },
      });
      return NextResponse.json({ success: true, date, shiftName });
    }

    return NextResponse.json({ error: "Missing id or date/shiftName parameter" }, { status: 400 });
  } catch (error: any) {
    console.error("Error deleting lamination wastage report:", error);
    return NextResponse.json({ error: "Failed to delete report" }, { status: 500 });
  }
}
