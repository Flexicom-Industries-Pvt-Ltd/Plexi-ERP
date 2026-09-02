import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireProductionApiPermission } from "@/lib/production/permissions";

export const dynamic = "force-dynamic";

/** List active users for operator assignment on production plan lines. */
export async function GET() {
  const authResult = await requireProductionApiPermission("canRead");
  if (!authResult.ok) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  try {
    const users = await db.user.findMany({
      where: { isActive: true },
      select: { id: true, name: true, email: true, employeeId: true },
      orderBy: { name: "asc" },
    });
    return NextResponse.json(users);
  } catch (error) {
    console.error("Error fetching operators:", error);
    return NextResponse.json({ error: "Failed to fetch operators" }, { status: 500 });
  }
}
