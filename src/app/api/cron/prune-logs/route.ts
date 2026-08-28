import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  // Simple protection: Check cron secret header to ensure it's Vercel calling
  const authHeader = request.headers.get("authorization");
  if (
    process.env.CRON_SECRET &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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
