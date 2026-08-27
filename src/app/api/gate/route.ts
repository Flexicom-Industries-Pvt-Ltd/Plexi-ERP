import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { logEvent } from "@/lib/logging";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check SECURITY_GATE read permission
  const user = await db.user.findUnique({
    where: { id: session.user.id },
    include: { role: { include: { permissions: true } } },
  });

  const hasAccess =
    user?.role?.name === "SUPERADMIN" ||
    user?.role?.permissions.some((p) => p.module === "SECURITY_GATE" && p.canRead);

  if (!hasAccess) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const purpose = searchParams.get("purpose");
  const truckNumber = searchParams.get("truckNumber");
  
  const where: any = {};
  if (status) where.status = status;
  if (purpose) where.purpose = purpose;
  if (truckNumber) where.truckNumber = { contains: truckNumber, mode: "insensitive" };

  try {
    const entries = await db.gateEntry.findMany({
      where,
      orderBy: { arrivalTime: "desc" },
      include: {
        stockDetails: true,
      },
    });
    return NextResponse.json(entries);
  } catch (error) {
    console.error("Error fetching gate entries:", error);
    return NextResponse.json({ error: "Failed to fetch gate entries" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check SECURITY_GATE create permission
  const user = await db.user.findUnique({
    where: { id: session.user.id },
    include: { role: { include: { permissions: true } } },
  });

  const hasAccess =
    user?.role?.name === "SUPERADMIN" ||
    user?.role?.permissions.some((p) => p.module === "SECURITY_GATE" && p.canCreate);

  if (!hasAccess) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const data = await request.json();
    
    // Generate unique entry number (e.g., GE-YYYYMMDD-001)
    const today = new Date();
    const datePrefix = `GE-${today.getFullYear()}${(today.getMonth() + 1).toString().padStart(2, "0")}${today.getDate().toString().padStart(2, "0")}`;
    
    // Get the last entry for today to increment the number
    const lastEntry = await db.gateEntry.findFirst({
      where: { entryNumber: { startsWith: datePrefix } },
      orderBy: { entryNumber: "desc" },
    });

    let sequence = 1;
    if (lastEntry) {
      const lastSeq = parseInt(lastEntry.entryNumber.split("-").pop() || "0");
      sequence = lastSeq + 1;
    }
    const entryNumber = `${datePrefix}-${sequence.toString().padStart(3, "0")}`;

    const newEntry = await db.gateEntry.create({
      data: {
        entryNumber,
        truckNumber: data.truckNumber,
        driverName: data.driverName,
        driverContact: data.driverContact,
        transporter: data.transporter,
        supplierCustomer: data.supplierCustomer,
        purpose: data.purpose,
        expectedMaterial: data.expectedMaterial,
        expectedQuantity: data.expectedQuantity ? parseFloat(data.expectedQuantity) : null,
        createdBy: session.user.id,
      },
    });

    await logEvent({
      userId: session.user.id,
      module: "SECURITY_GATE",
      severity: "INFO",
      action: "Created Gate Entry",
      payload: newEntry,
      meta: { entryId: newEntry.id, entryNumber: newEntry.entryNumber },
    });

    return NextResponse.json(newEntry, { status: 201 });
  } catch (error) {
    console.error("Error creating gate entry:", error);
    return NextResponse.json({ error: "Failed to create gate entry" }, { status: 500 });
  }
}
