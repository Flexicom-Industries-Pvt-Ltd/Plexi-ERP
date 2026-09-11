import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getGateStats } from "@/lib/gate/get-gate-stats";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const permissions = (session.user as { permissions?: { module: string; canRead: boolean }[] }).permissions || [];
  const hasAccess =
    (session.user as { role?: string }).role === "SUPERADMIN" ||
    (session.user as { role?: string }).role === "Super Admin" ||
    permissions.some((p) => p.module === "SECURITY_GATE" && p.canRead);

  if (!hasAccess) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const stats = await getGateStats();
    return NextResponse.json(stats);
  } catch (error) {
    console.error("Error fetching gate stats:", error);
    return NextResponse.json({ error: "Failed to fetch gate stats" }, { status: 500 });
  }
}

