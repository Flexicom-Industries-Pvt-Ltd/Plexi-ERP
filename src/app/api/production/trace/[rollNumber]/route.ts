import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { traceRollByNumber } from "@/lib/production/roll-trace";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: { rollNumber: string } }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rollNumber = params?.rollNumber;
  if (!rollNumber) {
    return NextResponse.json({ error: "Roll number parameter is required" }, { status: 400 });
  }

  try {
    const trace = await traceRollByNumber(decodeURIComponent(rollNumber));
    return NextResponse.json({ success: true, data: trace });
  } catch (error: any) {
    console.error("Error tracing roll:", error);
    return NextResponse.json(
      { error: error.message || "Failed to trace roll" },
      { status: 500 }
    );
  }
}
