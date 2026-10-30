import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireApiAuth } from "@/lib/api-auth";
import { Module } from "@/generated/prisma";
import { apiSuccess, apiError } from "@/lib/api-response";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const auth = await requireApiAuth({
    module: [Module.HR, Module.SETTINGS, Module.DATA_CENTRE],
    action: "canRead",
  });
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(request.url);
  const dateStr = searchParams.get("date");
  const employeeCode = searchParams.get("employeeCode")?.trim();
  const limit = Math.min(200, parseInt(searchParams.get("limit") || "100", 10));

  try {
    const where: any = {};

    if (dateStr) {
      const startOfDay = new Date(dateStr);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(dateStr);
      endOfDay.setHours(23, 59, 59, 999);
      where.punchTime = { gte: startOfDay, lte: endOfDay };
    }

    if (employeeCode) {
      where.employeeCode = { contains: employeeCode, mode: "insensitive" };
    }

    const punches = await db.attendancePunch.findMany({
      where,
      orderBy: { punchTime: "desc" },
      take: limit,
      include: {
        device: {
          select: { name: true, location: true, serialNumber: true },
        },
      },
    });

    return apiSuccess({ punches });
  } catch (err: any) {
    return apiError(err.message || "Failed to fetch punches", 500);
  }
}

