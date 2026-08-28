import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check SETTINGS or SUPERADMIN access
  const user = await db.user.findUnique({
    where: { id: session.user.id },
    include: { role: { include: { permissions: true } } },
  });

  const hasAccess =
    user?.role?.name === "SUPERADMIN" ||
    user?.role?.permissions.some((p) => p.module === "SETTINGS" && p.canRead);

  if (!hasAccess) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    // 1. Time-series data (Last 24 Hours grouped by hour)
    // We use Prisma queryRaw for fast time-bucketing in PostgreSQL
    const timelineRaw = await db.$queryRaw<
      { hour: Date; totalRequests: bigint; avgDuration: number | null; errorCount: bigint }[]
    >`
      SELECT 
        date_trunc('hour', timestamp) AS hour,
        COUNT(*) as "totalRequests",
        AVG("durationMs") as "avgDuration",
        SUM(CASE WHEN "statusCode" >= 400 THEN 1 ELSE 0 END) as "errorCount"
      FROM "LogEntry"
      WHERE timestamp >= NOW() - INTERVAL '24 hours'
      GROUP BY hour
      ORDER BY hour ASC;
    `;

    // Map bigints to numbers for JSON serialization
    const timeline = timelineRaw.map((row) => ({
      time: row.hour.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit' }),
      date: row.hour.toISOString(),
      requests: Number(row.totalRequests),
      avgLatency: row.avgDuration ? Math.round(row.avgDuration) : 0,
      errors: Number(row.errorCount),
    }));

    // 2. Slowest API Routes (For Tabular Drill-Down)
    const slowestRoutesRaw = await db.$queryRaw<
      { url: string; httpMethod: string; avgDuration: number; maxDuration: number; count: bigint }[]
    >`
      SELECT 
        url, 
        "httpMethod", 
        AVG("durationMs") as "avgDuration",
        MAX("durationMs") as "maxDuration",
        COUNT(*) as count
      FROM "LogEntry"
      WHERE timestamp >= NOW() - INTERVAL '24 hours' AND url IS NOT NULL
      GROUP BY url, "httpMethod"
      HAVING COUNT(*) > 5
      ORDER BY "avgDuration" DESC
      LIMIT 10;
    `;

    const slowestRoutes = slowestRoutesRaw.map((r) => ({
      url: r.url,
      method: r.httpMethod,
      avgLatency: Math.round(r.avgDuration),
      maxLatency: r.maxDuration,
      calls: Number(r.count),
    }));

    // 3. Module Activity Distribution
    const moduleActivityRaw = await db.$queryRaw<
      { module: string; count: bigint }[]
    >`
      SELECT module, COUNT(*) as count
      FROM "LogEntry"
      WHERE timestamp >= NOW() - INTERVAL '24 hours'
      GROUP BY module
      ORDER BY count DESC
      LIMIT 5;
    `;

    const moduleActivity = moduleActivityRaw.map((r) => ({
      name: r.module,
      value: Number(r.count),
    }));

    // 4. Hardware/System Health (Zero DB Load)
    const mem = process.memoryUsage();
    const systemHealth = {
      uptimeSeconds: Math.floor(process.uptime()),
      memoryHeapUsedMB: Math.round(mem.heapUsed / 1024 / 1024),
      memoryHeapTotalMB: Math.round(mem.heapTotal / 1024 / 1024),
    };

    return NextResponse.json({
      timeline,
      slowestRoutes,
      moduleActivity,
      systemHealth,
    }, {
      headers: {
        // Cache this response for 60 seconds on the Edge (Zero DB load for 60s)
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120'
      }
    });
  } catch (error) {
    console.error("Telemetry fetch failed:", error);
    return NextResponse.json({ error: "Failed to fetch telemetry data" }, { status: 500 });
  }
}
