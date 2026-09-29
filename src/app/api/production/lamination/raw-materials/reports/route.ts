import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireLaminationApiPermission } from "@/lib/lamination/permissions";
import {
  calculateRawMaterialRow,
  computeRawMaterialTotals,
  RawMaterialEntryItem,
} from "@/lib/lamination/lamination-raw-material-types";
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
      const report = await db.laminationRawMaterialReport.findUnique({
        where: { id },
        include: {
          entries: {
            orderBy: { sequence: "asc" },
          },
        },
      });
      if (!report) {
        return NextResponse.json({ error: "Report not found" }, { status: 404 });
      }
      return NextResponse.json({ success: true, report });
    }

    // Single report fetch by Date & Shift
    if (date && shiftName) {
      const report = await db.laminationRawMaterialReport.findUnique({
        where: {
          date_shiftName: { date, shiftName },
        },
        include: {
          entries: {
            orderBy: { sequence: "asc" },
          },
        },
      });

      // Always fetch active master raw materials from Data Centre for quick sync
      const activeMasterMaterials = await db.laminationRawMaterial.findMany({
        where: { isActive: true },
        orderBy: [{ sequence: "asc" }, { createdAt: "asc" }],
      });

      if (!report) {
        // Prepare template entries initialized from Data Centre master
        const templateEntries = activeMasterMaterials.map((rm, idx) => ({
          rawMaterialId: rm.id,
          materialName: rm.name,
          percentage: rm.percentage,
          manualKg: 0,
          machineKg: 0,
          diffKg: 0,
          sequence: rm.sequence || idx + 1,
          remarks: "",
        }));

        return NextResponse.json({
          success: true,
          exists: false,
          report: null,
          templateEntries,
          masterMaterials: activeMasterMaterials,
        });
      }

      return NextResponse.json({
        success: true,
        exists: true,
        report,
        masterMaterials: activeMasterMaterials,
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

    const reports = await db.laminationRawMaterialReport.findMany({
      where,
      orderBy: [{ date: "desc" }, { shiftName: "asc" }],
      include: {
        entries: {
          orderBy: { sequence: "asc" },
        },
      },
    });

    return NextResponse.json({ success: true, reports });
  } catch (error: any) {
    console.error("Error fetching lamination raw material reports:", error);
    return NextResponse.json({ error: "Failed to fetch raw material reports" }, { status: 500 });
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
      supervisorName,
      manualTotalKg = 0,
      status = "DRAFT",
      remarks,
      entries = [],
    } = body;

    if (!date || !shiftName) {
      return NextResponse.json(
        { error: "Date and Shift are required" },
        { status: 400 }
      );
    }

    const numManualTotal = Number(manualTotalKg) || 0;

    // Process each entry using calculation logic
    const processedEntries: RawMaterialEntryItem[] = entries.map(
      (entry: any, index: number) => {
        const percentage = Number(entry.percentage) || 0;
        const machineKg = Number(entry.machineKg) || 0;
        const { manualKg, diffKg } = calculateRawMaterialRow(
          numManualTotal,
          machineKg,
          percentage
        );

        return {
          rawMaterialId: entry.rawMaterialId || null,
          materialName: entry.materialName?.trim() || `Material ${index + 1}`,
          percentage,
          manualKg,
          machineKg,
          diffKg,
          sequence: entry.sequence || index + 1,
          remarks: entry.remarks?.trim() || null,
        };
      }
    );

    const totals = computeRawMaterialTotals(processedEntries, numManualTotal);

    // Upsert transaction in Neon DB
    const report = await db.$transaction(async (tx) => {
      const existing = await tx.laminationRawMaterialReport.findUnique({
        where: {
          date_shiftName: { date, shiftName },
        },
      });

      if (existing) {
        // Delete previous entries and recreate
        await tx.laminationRawMaterialReportEntry.deleteMany({
          where: { reportId: existing.id },
        });

        return tx.laminationRawMaterialReport.update({
          where: { id: existing.id },
          data: {
            operatorName: operatorName?.trim() || null,
            operatorId: operatorId || null,
            supervisorName: supervisorName?.trim() || null,
            manualTotalKg: totals.manualTotalKg,
            machineTotalKg: totals.machineTotalKg,
            diffTotalKg: totals.diffTotalKg,
            status,
            remarks: remarks?.trim() || null,
            entries: {
              create: processedEntries.map((e) => ({
                rawMaterialId: e.rawMaterialId,
                materialName: e.materialName,
                percentage: e.percentage,
                manualKg: e.manualKg,
                machineKg: e.machineKg,
                diffKg: e.diffKg,
                sequence: e.sequence,
                remarks: e.remarks,
              })),
            },
          },
          include: {
            entries: {
              orderBy: { sequence: "asc" },
            },
          },
        });
      } else {
        return tx.laminationRawMaterialReport.create({
          data: {
            date,
            shiftName,
            operatorName: operatorName?.trim() || null,
            operatorId: operatorId || null,
            supervisorName: supervisorName?.trim() || null,
            manualTotalKg: totals.manualTotalKg,
            machineTotalKg: totals.machineTotalKg,
            diffTotalKg: totals.diffTotalKg,
            status,
            remarks: remarks?.trim() || null,
            entries: {
              create: processedEntries.map((e) => ({
                rawMaterialId: e.rawMaterialId,
                materialName: e.materialName,
                percentage: e.percentage,
                manualKg: e.manualKg,
                machineKg: e.machineKg,
                diffKg: e.diffKg,
                sequence: e.sequence,
                remarks: e.remarks,
              })),
            },
          },
          include: {
            entries: {
              orderBy: { sequence: "asc" },
            },
          },
        });
      }
    });

    await logEvent({
      module: "LAMINATION",
      action: `Saved Lamination Raw Material Report for ${report.date} (${report.shiftName})`,
      severity: "INFO",
      payload: {
        reportId: report.id,
        date: report.date,
        shift: report.shiftName,
        manualTotalKg: report.manualTotalKg,
        machineTotalKg: report.machineTotalKg,
        diffTotalKg: report.diffTotalKg,
        entriesCount: report.entries.length,
      },
      httpMethod: "POST",
      url: "/api/production/lamination/raw-materials/reports",
      statusCode: 200,
    }).catch(console.error);

    return NextResponse.json({
      success: true,
      report,
      message: "Lamination Raw Material report saved successfully",
    });
  } catch (error: any) {
    console.error("Error saving lamination raw material report:", error);
    return NextResponse.json(
      { error: "Failed to save lamination raw material report", details: error.message },
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
      await db.laminationRawMaterialReport.delete({
        where: { id },
      });
      return NextResponse.json({ success: true, deletedId: id });
    }

    if (date && shiftName) {
      await db.laminationRawMaterialReport.delete({
        where: { date_shiftName: { date, shiftName } },
      });
      return NextResponse.json({ success: true, date, shiftName });
    }

    return NextResponse.json({ error: "Missing id or date/shiftName parameter" }, { status: 400 });
  } catch (error: any) {
    console.error("Error deleting lamination raw material report:", error);
    return NextResponse.json({ error: "Failed to delete report" }, { status: 500 });
  }
}
