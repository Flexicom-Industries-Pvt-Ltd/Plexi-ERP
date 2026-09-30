import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePrintingApiPermission } from "@/lib/printing/permissions";
import {
  calculatePrintingRow,
  computePrintingTotals,
  PrintingReportItem,
} from "@/lib/printing/printing-types";
import { logEvent } from "@/lib/logging";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: NextRequest) {
  const authResult = await requirePrintingApiPermission("canRead");
  if (!authResult.ok) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  const date = searchParams.get("date");
  const shiftName = searchParams.get("shiftName");
  const machineNo = searchParams.get("machineNo") || "Machine-1";
  const dateFrom = searchParams.get("dateFrom");
  const dateTo = searchParams.get("dateTo");

  try {
    // 1. Single report fetch by ID
    if (id) {
      const report = await db.printingDailyReport.findUnique({
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

    // 2. Single report fetch by Date, Shift, and Machine
    if (date && shiftName) {
      const report = await db.printingDailyReport.findUnique({
        where: {
          date_shiftName_machineNo: {
            date,
            shiftName,
            machineNo,
          },
        },
        include: {
          entries: {
            orderBy: { sequence: "asc" },
          },
        },
      });
      return NextResponse.json({ success: true, report: report || null });
    }

    // 3. List reports with filters
    const where: any = {};
    if (date) {
      where.date = date;
    } else if (dateFrom || dateTo) {
      where.date = {
        ...(dateFrom ? { gte: dateFrom } : {}),
        ...(dateTo ? { lte: dateTo } : {}),
      };
    }
    if (shiftName && shiftName !== "ALL") {
      where.shiftName = shiftName;
    }
    if (machineNo && machineNo !== "ALL") {
      where.machineNo = machineNo;
    }

    const reports = await db.printingDailyReport.findMany({
      where,
      include: {
        _count: {
          select: { entries: true },
        },
      },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      take: 200,
    });

    return NextResponse.json({ success: true, reports });
  } catch (error: any) {
    console.error("GET /api/production/printing/reports error:", error);
    return NextResponse.json(
      { error: "Failed to fetch printing production reports" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const authResult = await requirePrintingApiPermission("canCreate");
  if (!authResult.ok) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  try {
    const body = await request.json();
    const {
      date,
      shiftName,
      machineNo = "Machine-1",
      companyName = "FLEXICOM INDUSTRIES PVT. LIMITED",
      unitName = "Unit-1",
      operatorName,
      operatorId,
      supervisorName,
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

    // Recalculate row GSM and overall totals to guarantee integrity
    const calculatedEntries: PrintingReportItem[] = entries.map(
      (entry: any, index: number) =>
        calculatePrintingRow({
          ...entry,
          sequence: index + 1,
        })
    );

    const totals = computePrintingTotals(calculatedEntries);

    const savedReport = await db.$transaction(async (tx) => {
      // Upsert report header
      const report = await tx.printingDailyReport.upsert({
        where: {
          date_shiftName_machineNo: {
            date,
            shiftName,
            machineNo,
          },
        },
        create: {
          date,
          shiftName,
          machineNo,
          companyName: companyName?.trim() || "FLEXICOM INDUSTRIES PVT. LIMITED",
          unitName: unitName?.trim() || "Unit-1",
          operatorName: operatorName?.trim() || null,
          operatorId: operatorId || null,
          supervisorName: supervisorName?.trim() || null,
          status,
          remarks: remarks?.trim() || null,
          totalRolls: totals.totalRolls,
          totalProductionMtrs: totals.totalProductionMtrs,
          totalNetWt: totals.totalNetWt,
          avgWeightGsm: totals.avgWeightGsm,
          totalPrintMtrs: totals.totalPrintMtrs,
          varianceMtrs: totals.varianceMtrs,
          efficiencyPercent: totals.efficiencyPercent,
        },
        update: {
          companyName: companyName?.trim() || "FLEXICOM INDUSTRIES PVT. LIMITED",
          unitName: unitName?.trim() || "Unit-1",
          operatorName: operatorName?.trim() || null,
          operatorId: operatorId || null,
          supervisorName: supervisorName?.trim() || null,
          status,
          remarks: remarks?.trim() || null,
          totalRolls: totals.totalRolls,
          totalProductionMtrs: totals.totalProductionMtrs,
          totalNetWt: totals.totalNetWt,
          avgWeightGsm: totals.avgWeightGsm,
          totalPrintMtrs: totals.totalPrintMtrs,
          varianceMtrs: totals.varianceMtrs,
          efficiencyPercent: totals.efficiencyPercent,
        },
      });

      // Clear existing entries to replace with atomic latest state
      await tx.printingDailyReportEntry.deleteMany({
        where: { reportId: report.id },
      });

      // Insert fresh entries
      if (calculatedEntries.length > 0) {
        await tx.printingDailyReportEntry.createMany({
          data: calculatedEntries.map((e) => ({
            reportId: report.id,
            sequence: e.sequence,
            companyName: e.companyName?.trim() || null,
            unitName: e.unitName?.trim() || null,
            grade: e.grade?.trim() || null,
            targetProductionMtrs: e.targetProductionMtrs !== undefined && e.targetProductionMtrs !== null && e.targetProductionMtrs !== ""
              ? Number(e.targetProductionMtrs)
              : null,
            drumSize: e.drumSize?.trim() || null,
            quality: e.quality?.trim() || "",
            rollNumber: e.rollNumber?.trim() || "",
            loomNumber: String(e.loomNumber || ""),
            productionMeter: Number(e.productionMeter) || 0,
            netWeight: Number(e.netWeight) || 0,
            avgWeight: Number(e.avgWeight) || 0,
            printMeter: Number(e.printMeter) || 0,
            remarks: e.remarks?.trim() || null,
          })),
        });

        // Auto-save new company details to Data Centre PartyPrintingDetail master
        for (const e of calculatedEntries) {
          const comp = e.companyName?.trim();
          if (comp) {
            const uName = e.unitName?.trim() || null;
            const grd = e.grade?.trim() || null;
            const dSize = e.drumSize?.trim() || null;
            const tgt = e.targetProductionMtrs ? Number(e.targetProductionMtrs) : null;
            const qlt = e.quality?.trim() || null;

            const existingParty = await tx.partyPrintingDetail.findFirst({
              where: {
                companyName: { equals: comp, mode: "insensitive" },
                unitName: uName ? { equals: uName, mode: "insensitive" } : null,
                grade: grd ? { equals: grd, mode: "insensitive" } : null,
                drumSize: dSize ? { equals: dSize, mode: "insensitive" } : null,
              },
            });

            if (!existingParty) {
              await tx.partyPrintingDetail.create({
                data: {
                  companyName: comp,
                  unitName: uName,
                  grade: grd,
                  drumSize: dSize,
                  targetProductionMtrs: tgt,
                  quality: qlt,
                  isActive: true,
                },
              });
            } else if (tgt || qlt) {
              await tx.partyPrintingDetail.update({
                where: { id: existingParty.id },
                data: {
                  targetProductionMtrs: tgt ?? existingParty.targetProductionMtrs,
                  quality: qlt ?? existingParty.quality,
                },
              });
            }
          }
        }
      }

      return tx.printingDailyReport.findUnique({
        where: { id: report.id },
        include: {
          entries: {
            orderBy: { sequence: "asc" },
          },
        },
      });
    });

    // Comprehensive system audit log
    logEvent({
      userId: authResult.session.user.id,
      module: "PRODUCTION",
      severity: "INFO",
      action: `Saved Printing ${machineNo} Daily Production Report for ${date} (${shiftName}) with ${calculatedEntries.length} entries. Total Print: ${totals.totalPrintMtrs}m. Status: ${status}`,
      payload: {
        reportId: savedReport?.id,
        date,
        shiftName,
        machineNo,
        status,
        totalRolls: totals.totalRolls,
        totalPrintMtrs: totals.totalPrintMtrs,
        efficiencyPercent: totals.efficiencyPercent,
      },
      httpMethod: "POST",
      url: "/api/production/printing/reports",
      statusCode: 200,
    }).catch(() => {});

    return NextResponse.json({
      success: true,
      message: `Printing Daily Production Report saved successfully`,
      report: savedReport,
    });
  } catch (error: any) {
    console.error("POST /api/production/printing/reports error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to save printing report" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  const authResult = await requirePrintingApiPermission("canDelete");
  if (!authResult.ok) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "Report ID is required" }, { status: 400 });
  }

  try {
    const report = await db.printingDailyReport.findUnique({
      where: { id },
      select: { id: true, status: true, date: true, shiftName: true, machineNo: true },
    });

    if (!report) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    if (report.status === "APPROVED") {
      return NextResponse.json(
        { error: "Approved printing reports cannot be deleted" },
        { status: 400 }
      );
    }

    await db.printingDailyReport.delete({
      where: { id },
    });

    logEvent({
      userId: authResult.session.user.id,
      module: "PRODUCTION",
      severity: "WARN",
      action: `Deleted Printing Daily Production Report #${id} for ${report.date} (${report.shiftName}) on ${report.machineNo}`,
      payload: { id, date: report.date, shiftName: report.shiftName, machineNo: report.machineNo },
      httpMethod: "DELETE",
      url: "/api/production/printing/reports",
      statusCode: 200,
    }).catch(() => {});

    return NextResponse.json({
      success: true,
      message: "Printing report deleted successfully",
    });
  } catch (error: any) {
    console.error("DELETE /api/production/printing/reports error:", error);
    return NextResponse.json(
      { error: "Failed to delete printing report" },
      { status: 500 }
    );
  }
}
