import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireApiAuth } from "@/lib/api-auth";
import { Module } from "@/generated/prisma";
import { apiSuccess, apiError } from "@/lib/api-response";

export const dynamic = "force-dynamic";

/**
 * Headcount Rollup API (Requirements H-04 & X-01)
 * Provides real-time present staff headcount grouped by Section (Loom, Tape Plant, etc.)
 * directly consumable by factory production shift handovers.
 */
export async function GET(request: NextRequest) {
  const auth = await requireApiAuth({
    module: [Module.HR, Module.PRODUCTION, Module.LOOM, Module.TAPE_PLANT, Module.SETTINGS],
    action: "canRead",
  });
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(request.url);
  const dateStr = searchParams.get("date") || new Date().toISOString().split("T")[0];
  const shiftName = searchParams.get("shift")?.trim();

  try {
    const targetDate = new Date(dateStr);
    targetDate.setHours(0, 0, 0, 0);

    const where: any = { date: targetDate };
    if (shiftName && shiftName !== "ALL") {
      where.shiftName = { equals: shiftName, mode: "insensitive" };
    }

    const headcounts = await db.shiftHeadcount.findMany({
      where,
      orderBy: { department: "asc" },
    });

    return apiSuccess({
      date: dateStr,
      headcounts,
    });
  } catch (err: any) {
    return apiError(err.message || "Failed to fetch shift headcount", 500);
  }
}

