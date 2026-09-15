import { NextResponse } from "next/server";

export async function GET() {
  const memory = process.memoryUsage();

  return NextResponse.json(
    {
      status: "UP",
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
      process: {
        nodeVersion: process.version,
        pid: process.pid,
        memoryUsageMb: {
          rss: Math.round((memory.rss / 1024 / 1024) * 100) / 100,
          heapTotal: Math.round((memory.heapTotal / 1024 / 1024) * 100) / 100,
          heapUsed: Math.round((memory.heapUsed / 1024 / 1024) * 100) / 100,
        },
      },
    },
    { status: 200 }
  );
}
