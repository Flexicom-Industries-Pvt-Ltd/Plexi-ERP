import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { traceRollByNumber, listRecentRolls } from "@/lib/production/roll-trace";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search");
  const limit = parseInt(searchParams.get("limit") || "25", 10);

  try {
    if (search && search.trim()) {
      const trace = await traceRollByNumber(search.trim());
      return NextResponse.json({ success: true, data: trace });
    }

    const recentRolls = await listRecentRolls(Math.min(limit, 100));
    return NextResponse.json({ success: true, data: { recentRolls } });
  } catch (error: any) {
    console.error("Error fetching roll trace listing:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch roll trace data" },
      { status: 500 }
    );
  }
}
