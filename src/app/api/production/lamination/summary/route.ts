import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireLaminationApiPermission } from "@/lib/lamination/permissions";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: NextRequest) {
  const authResult = await requireLaminationApiPermission("canRead");
  if (!authResult.ok) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  const { searchParams } = new URL(request.url);
  const dateFrom = searchParams.get("dateFrom");
  const dateTo = searchParams.get("dateTo");
  const shiftName = searchParams.get("shiftName");
  const contractorName = searchParams.get("contractorName");
  const operatorName = searchParams.get("operatorName");

  try {
    const where: any = {};
    if (dateFrom && dateTo) {
      where.date = { gte: dateFrom, lte: dateTo };
    } else if (dateFrom) {
      where.date = { gte: dateFrom };
    }

    if (shiftName && shiftName !== "ALL") {
      where.shiftName = shiftName;
    }

    if (contractorName && contractorName !== "ALL") {
      where.contractorName = contractorName;
    }

    if (operatorName && operatorName !== "ALL") {
      where.operatorName = { contains: operatorName, mode: "insensitive" };
    }

    const reports = await db.laminationProductionReport.findMany({
      where,
      orderBy: [{ date: "desc" }, { shiftName: "asc" }],
      include: {
        entries: {
          orderBy: { sequence: "asc" },
        },
      },
    });

    // Compute Overall Totals
    let totalShifts = reports.length;
    let totalRolls = 0;
    let totalProductionMtrs = 0;
    let totalNetWtAfter = 0;
    let totalRollMtrsBefore = 0;
    let totalNetWtBefore = 0;
    let coatingWeightedSum = 0;

    // Aggregations
    const contractorMap = new Map<string, any>();
    const operatorMap = new Map<string, any>();
    const qualityMap = new Map<string, any>();

    for (const report of reports) {
      const cName = (report as any).contractorName || "General / In-House";
      const opName = report.operatorName || "Unassigned";

      // Contractor group
      if (!contractorMap.has(cName)) {
        contractorMap.set(cName, {
          contractorName: cName,
          shiftCount: 0,
          rollCount: 0,
          productionMtrs: 0,
          netWtAfter: 0,
          coatingSum: 0,
        });
      }
      const cData = contractorMap.get(cName);
      cData.shiftCount += 1;

      // Operator group
      if (!operatorMap.has(opName)) {
        operatorMap.set(opName, {
          operatorName: opName,
          shiftCount: 0,
          rollCount: 0,
          productionMtrs: 0,
          netWtAfter: 0,
          coatingSum: 0,
        });
      }
      const opData = operatorMap.get(opName);
      opData.shiftCount += 1;

      for (const entry of report.entries) {
        totalRolls += 1;
        totalProductionMtrs += entry.productionMeter || 0;
        totalNetWtAfter += entry.netWeightAfter || 0;
        totalRollMtrsBefore += entry.rollMeter || 0;
        totalNetWtBefore += entry.netWeightBefore || 0;
        coatingWeightedSum += (entry.coating || 0) * (entry.productionMeter || 0);

        // Contractor aggregates
        cData.rollCount += 1;
        cData.productionMtrs += entry.productionMeter || 0;
        cData.netWtAfter += entry.netWeightAfter || 0;
        cData.coatingSum += (entry.coating || 0) * (entry.productionMeter || 0);

        // Operator aggregates
        opData.rollCount += 1;
        opData.productionMtrs += entry.productionMeter || 0;
        opData.netWtAfter += entry.netWeightAfter || 0;
        opData.coatingSum += (entry.coating || 0) * (entry.productionMeter || 0);

        // Quality group
        const qName = entry.quality || "Standard";
        if (!qualityMap.has(qName)) {
          qualityMap.set(qName, {
            quality: qName,
            rollCount: 0,
            productionMtrs: 0,
            netWtAfter: 0,
            coatingSum: 0,
            size: entry.size || "",
          });
        }
        const qData = qualityMap.get(qName);
        qData.rollCount += 1;
        qData.productionMtrs += entry.productionMeter || 0;
        qData.netWtAfter += entry.netWeightAfter || 0;
        qData.coatingSum += (entry.coating || 0) * (entry.productionMeter || 0);
      }
    }

    const avgCoating = totalProductionMtrs > 0
      ? Number((coatingWeightedSum / totalProductionMtrs).toFixed(1))
      : 0;

    const contractorSummary = Array.from(contractorMap.values()).map((c) => ({
      ...c,
      productionMtrs: Number(c.productionMtrs.toFixed(1)),
      netWtAfter: Number(c.netWtAfter.toFixed(1)),
      avgCoating: c.productionMtrs > 0 ? Number((c.coatingSum / c.productionMtrs).toFixed(1)) : 0,
    }));

    const operatorSummary = Array.from(operatorMap.values()).map((op) => ({
      ...op,
      productionMtrs: Number(op.productionMtrs.toFixed(1)),
      netWtAfter: Number(op.netWtAfter.toFixed(1)),
      avgCoating: op.productionMtrs > 0 ? Number((op.coatingSum / op.productionMtrs).toFixed(1)) : 0,
    }));

    const qualitySummary = Array.from(qualityMap.values()).map((q) => ({
      ...q,
      productionMtrs: Number(q.productionMtrs.toFixed(1)),
      netWtAfter: Number(q.netWtAfter.toFixed(1)),
      avgCoating: q.productionMtrs > 0 ? Number((q.coatingSum / q.productionMtrs).toFixed(1)) : 0,
    }));

    return NextResponse.json({
      success: true,
      overall: {
        totalShifts,
        totalRolls,
        totalProductionMtrs: Number(totalProductionMtrs.toFixed(1)),
        totalNetWtAfter: Number(totalNetWtAfter.toFixed(1)),
        totalRollMtrsBefore: Number(totalRollMtrsBefore.toFixed(1)),
        totalNetWtBefore: Number(totalNetWtBefore.toFixed(1)),
        avgCoating,
      },
      contractorSummary,
      operatorSummary,
      qualitySummary,
      reports,
    });
  } catch (error: any) {
    console.error("Error generating lamination production summary:", error);
    return NextResponse.json({ error: "Failed to generate summary" }, { status: 500 });
  }
}
