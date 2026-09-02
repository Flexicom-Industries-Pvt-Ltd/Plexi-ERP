import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { logEvent } from "@/lib/logging";
import { registry } from "@/lib/openapi";
import { requireProductionApiPermission } from "@/lib/production/permissions";

export const dynamic = "force-dynamic";

const CreateHandoverSchema = z.object({
  shiftId: z.string().min(1),
  handoverDate: z.string().optional(),
  completedQty: z.number().min(0).default(0),
  pendingQty: z.number().min(0).default(0),
  wipNotes: z.string().optional().nullable(),
  machineStatus: z.string().optional().nullable(),
  qualityIssues: z.string().optional().nullable(),
  scrapNotes: z.string().optional().nullable(),
  remarks: z.string().optional().nullable(),
});

const handoverInclude = {
  shift: true,
  handedOverBy: { select: { id: true, name: true, email: true } },
};

registry.registerPath({
  method: "get",
  path: "/api/production/handovers",
  summary: "List shift handovers",
  description: "Filter by shiftId, date, or latest=true for most recent handover for a shift",
  tags: ["Production"],
  security: [{ cookieAuth: [] }],
  responses: { 200: { description: "List of handovers" } },
});

registry.registerPath({
  method: "post",
  path: "/api/production/handovers",
  summary: "Create shift handover",
  tags: ["Production"],
  security: [{ cookieAuth: [] }],
  responses: { 201: { description: "Handover created" } },
});

export async function GET(request: NextRequest) {
  const authResult = await requireProductionApiPermission("canRead");
  if (!authResult.ok) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  const { searchParams } = new URL(request.url);
  const shiftId = searchParams.get("shiftId");
  const date = searchParams.get("date");
  const latest = searchParams.get("latest") === "true";

  const where: Record<string, unknown> = {};
  if (shiftId) where.shiftId = shiftId;
  if (date) {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);
    where.handoverDate = { gte: start, lte: end };
  }

  try {
    if (latest && shiftId) {
      const handover = await db.shiftHandover.findFirst({
        where: { shiftId },
        orderBy: { handoverDate: "desc" },
        include: handoverInclude,
      });
      return NextResponse.json(handover);
    }

    const handovers = await db.shiftHandover.findMany({
      where,
      orderBy: { handoverDate: "desc" },
      include: handoverInclude,
    });
    return NextResponse.json(handovers);
  } catch (error) {
    console.error("Error fetching handovers:", error);
    return NextResponse.json({ error: "Failed to fetch handovers" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const authResult = await requireProductionApiPermission("canCreate");
  if (!authResult.ok) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  try {
    const body = await request.json();
    const parsed = CreateHandoverSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed", details: parsed.error.format() }, { status: 400 });
    }

    const data = parsed.data;
    const shift = await db.shift.findUnique({ where: { id: data.shiftId } });
    if (!shift) {
      return NextResponse.json({ error: "Shift not found" }, { status: 404 });
    }

    const handover = await db.shiftHandover.create({
      data: {
        shiftId: data.shiftId,
        handoverDate: data.handoverDate ? new Date(data.handoverDate) : new Date(),
        completedQty: data.completedQty,
        pendingQty: data.pendingQty,
        wipNotes: data.wipNotes || null,
        machineStatus: data.machineStatus || null,
        qualityIssues: data.qualityIssues || null,
        scrapNotes: data.scrapNotes || null,
        remarks: data.remarks || null,
        handedOverById: authResult.session.user.id,
      },
      include: handoverInclude,
    });

    await logEvent({
      userId: authResult.session.user.id,
      module: "PRODUCTION",
      severity: "INFO",
      action: "CREATE_SHIFT_HANDOVER",
      payload: { handoverId: handover.id, shiftId: handover.shiftId },
      diffs: [{ entity: "ShiftHandover", entityId: handover.id, before: {}, after: handover }],
    });

    return NextResponse.json(handover, { status: 201 });
  } catch (error) {
    console.error("Error creating shift handover:", error);
    return NextResponse.json({ error: "Failed to create handover" }, { status: 500 });
  }
}
