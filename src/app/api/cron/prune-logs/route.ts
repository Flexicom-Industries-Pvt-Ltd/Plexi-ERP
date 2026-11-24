import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyCronRequest } from "@/lib/cron-auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  // Fail-closed authorization: requires valid CRON_SECRET Bearer header
  const authCheck = verifyCronRequest(request);
  if (!authCheck.ok) return authCheck.response;

  try {
    // Delete logs older than 90 days
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const result = await db.logEntry.deleteMany({
      where: {
        timestamp: {
          lt: ninetyDaysAgo,
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: `Pruned ${result.count} old log entries.`,
      prunedBefore: ninetyDaysAgo.toISOString(),
    });
  } catch (error) {
    console.error("Log pruning failed:", error);
    return NextResponse.json(
      { error: "Failed to prune logs" },
      { status: 500 }
    );
  }
}
