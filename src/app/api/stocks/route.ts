import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const permissions = session.user.permissions || [];
  const hasAccess =
    session.user.role === "SUPERADMIN" ||
    permissions.some(
      (p: { module: string; canRead?: boolean }) =>
        (p.module === "INVENTORY" || p.module === "DATA_CENTRE") && p.canRead
    );

  if (!hasAccess) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const stocks = await db.stock.findMany({
      where: { isActive: true },
      include: { uom: true },
      orderBy: { name: "asc" },
    });

    return NextResponse.json(stocks);
  } catch (error) {
    console.error("[STOCKS_LIST_ERROR]", error);
    return NextResponse.json({ error: "Failed to fetch stocks" }, { status: 500 });
  }
}
