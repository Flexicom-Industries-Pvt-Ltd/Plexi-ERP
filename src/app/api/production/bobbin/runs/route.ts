import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { logEvent } from "@/lib/logging";

import { bobbinRunInclude } from "@/lib/production/bobbin-run-include";
import { requireProductionApiPermission } from "@/lib/production/permissions";

export const dynamic = "force-dynamic";

const CreateBobbinRunSchema = z.object({
  planLineId: z.string().min(1),
  targetQty: z.number().min(0),
  rawMaterialItemId: z.string().min(1),
  outputItemId: z.string().optional(),
  inputQty: z.number().min(0).default(0),
  startedAt: z.string().datetime().optional(),
});

export async function GET(request: NextRequest) {
  const authResult = await requireProductionApiPermission("canRead");
  if (!authResult.ok) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  const { searchParams } = new URL(request.url);
  const planLineId = searchParams.get("planLineId");
  const planId = searchParams.get("planId");
  const activeOnly = searchParams.get("activeOnly") === "true";

  const where: Record<string, unknown> = {};
  if (planLineId) {
    where.productionRun = { planLineId };
  }
  if (planId) {
    where.productionRun = { planLine: { planId } };
  }
  if (activeOnly) {
    where.productionRun = {
      ...(where.productionRun as object),
      endedAt: null,
    };
  }

  try {
    const runs = await db.bobbinProductionRun.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: bobbinRunInclude,
    });
    return NextResponse.json(runs);
  } catch (error) {
    console.error("Error fetching bobbin runs:", error);
    return NextResponse.json({ error: "Failed to fetch bobbin runs" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const authResult = await requireProductionApiPermission("canCreate");
  if (!authResult.ok) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  try {
    const body = await request.json();
    const parsed = CreateBobbinRunSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed", details: parsed.error.format() }, { status: 400 });
    }

    const line = await db.productionPlanLine.findUnique({
      where: { id: parsed.data.planLineId },
      include: { plan: true },
    });
    if (!line) {
      return NextResponse.json({ error: "Plan line not found" }, { status: 404 });
    }
    if (line.phase !== "BOBBIN") {
      return NextResponse.json({ error: "Plan line must be a BOBBIN phase" }, { status: 400 });
    }
    if (!["APPROVED", "IN_PROGRESS"].includes(line.plan.status)) {
      return NextResponse.json({ error: "Plan must be approved or in progress to start a run" }, { status: 409 });
    }

    const rawMaterial = await db.inventoryItem.findUnique({
      where: { id: parsed.data.rawMaterialItemId },
    });
    if (!rawMaterial) {
      return NextResponse.json({ error: "Raw material item not found" }, { status: 404 });
    }

    if (parsed.data.outputItemId) {
      const outputItem = await db.inventoryItem.findUnique({
        where: { id: parsed.data.outputItemId },
      });
      if (!outputItem) {
        return NextResponse.json({ error: "Output bobbin item not found" }, { status: 404 });
      }
    }

    const bobbinRun = await db.$transaction(async (tx) => {
      if (line.plan.status === "APPROVED") {
        await tx.productionPlan.update({
          where: { id: line.planId },
          data: { status: "IN_PROGRESS" },
        });
      }

      const productionRun = await tx.productionRun.create({
        data: {
          planLineId: parsed.data.planLineId,
          targetQty: parsed.data.targetQty,
          startedAt: parsed.data.startedAt ? new Date(parsed.data.startedAt) : new Date(),
          recordedById: authResult.session.user.id,
        },
      });

      return tx.bobbinProductionRun.create({
        data: {
          productionRunId: productionRun.id,
          rawMaterialItemId: parsed.data.rawMaterialItemId,
          outputItemId: parsed.data.outputItemId,
          inputQty: parsed.data.inputQty,
        },
        include: bobbinRunInclude,
      });
    });

    await logEvent({
      userId: authResult.session.user.id,
      module: "PRODUCTION",
      severity: "INFO",
      action: "START_BOBBIN_RUN",
      payload: {
        bobbinRunId: bobbinRun.id,
        productionRunId: bobbinRun.productionRunId,
        planLineId: parsed.data.planLineId,
        rawMaterialItemId: parsed.data.rawMaterialItemId,
      },
      diffs: [{ entity: "BobbinProductionRun", entityId: bobbinRun.id, before: {}, after: bobbinRun }],
    });

    return NextResponse.json(bobbinRun, { status: 201 });
  } catch (error) {
    console.error("Error creating bobbin run:", error);
    return NextResponse.json({ error: "Failed to create bobbin run" }, { status: 500 });
  }
}
