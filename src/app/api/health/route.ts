import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic"; // Ensure it's not cached

export async function GET() {
  try {
    // Attempt to query the database to ensure it's connected
    await db.$queryRaw`SELECT 1`;
    
    return NextResponse.json(
      {
        status: "ok",
        message: "Backend is healthy",
        database: "connected",
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Health check failed:", error);
    return NextResponse.json(
      {
        status: "error",
        message: "Backend is running, but database connection failed",
        database: "disconnected",
        timestamp: new Date().toISOString(),
      },
      { status: 503 } // 503 Service Unavailable
    );
  }
}
