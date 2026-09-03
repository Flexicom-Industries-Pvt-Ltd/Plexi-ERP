import { NextRequest, NextResponse } from "next/server";

import { requireProductionApiPermission } from "@/lib/production/permissions";
import { getProductionReports, productionReportToCsv } from "@/lib/production/reports";

export const dynamic = "force-dynamic";

function parseDateRange(searchParams: URLSearchParams) {
  const dateRange = searchParams.get("dateRange");
  if (dateRange) {
    const [from, to] = dateRange.split(",");
    if (from && to) {
      return { dateFrom: new Date(from), dateTo: new Date(to) };
    }
  }

  const dateFrom = searchParams.get("dateFrom");
  const dateTo = searchParams.get("dateTo");
  const today = new Date().toISOString().slice(0, 10);

  return {
    dateFrom: new Date(dateFrom || today),
    dateTo: new Date(dateTo || dateFrom || today),
  };
}

export async function GET(request: NextRequest) {
  const authResult = await requireProductionApiPermission("canRead");
  if (!authResult.ok) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  const { searchParams } = new URL(request.url);
  const { dateFrom, dateTo } = parseDateRange(searchParams);

  const filters = {
    dateFrom,
    dateTo,
    shiftId: searchParams.get("shift") || searchParams.get("shiftId") || undefined,
    phase: searchParams.get("phase") || undefined,
    machineId: searchParams.get("machine") || searchParams.get("machineId") || undefined,
    operatorId: searchParams.get("operator") || searchParams.get("operatorId") || undefined,
  };

  try {
    const report = await getProductionReports(filters);

    if (searchParams.get("format") === "csv") {
      const csv = productionReportToCsv(report);
      const filename = `production-report-${dateFrom.toISOString().slice(0, 10)}-${dateTo.toISOString().slice(0, 10)}.csv`;
      return new Response(csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="${filename}"`,
        },
      });
    }

    return NextResponse.json(report);
  } catch (error) {
    console.error("Error fetching production reports:", error);
    return NextResponse.json({ error: "Failed to fetch production reports" }, { status: 500 });
  }
}
