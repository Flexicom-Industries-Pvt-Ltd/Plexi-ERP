import { NextRequest, NextResponse } from "next/server";
import { generateAttendanceSampleTemplate } from "@/lib/hr/attendance-export";

export const dynamic = "force-dynamic";

export async function GET(_request: NextRequest) {
  try {
    const buffer = generateAttendanceSampleTemplate();

    return new NextResponse(buffer as any, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition":
          'attachment; filename="Plexi_ERP_Attendance_Import_Template.xlsx"',
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to generate template" },
      { status: 500 }
    );
  }
}
