import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { logEvent, logDiff } from "@/lib/logging";
import { registry } from "@/lib/openapi";
import { requireProductionApiPermission } from "@/lib/production/permissions";

export const dynamic = "force-dynamic";

const CreateDefinitionSchema = z.object({
  phase: z.enum([
    "BOBBIN", "LOOM", "LAMINATION", "PRINTING", "CUTTING",
    "CONVERTEX", "VALVOMATIC", "BCS", "MANUAL_STITCH", "BALING",
  ]),
  key: z.string().min(1).regex(/^[a-z][a-z0-9_]*$/, "Key must be lowercase snake_case"),
  label: z.string().min(1),
  fieldType: z.enum(["TEXT", "NUMBER", "SELECT", "BOOLEAN", "DATE"]),
  options: z.array(z.object({ label: z.string(), value: z.string() })).optional().nullable(),
  required: z.boolean().default(false),
  sortOrder: z.number().int().default(0),
  isActive: z.boolean().default(true),
}).openapi("CreateProductionCharacteristicDefinitionInput");

registry.registerPath({
  method: "get",
  path: "/api/production/characteristics/definitions",
  summary: "List production characteristic definitions",
  tags: ["Production"],
  security: [{ cookieAuth: [] }],
  responses: {
    200: { description: "List of characteristic definitions" },
    401: { description: "Unauthorized" },
    403: { description: "Forbidden" },
  },
});

registry.registerPath({
  method: "post",
  path: "/api/production/characteristics/definitions",
  summary: "Create production characteristic definition",
  tags: ["Production"],
  security: [{ cookieAuth: [] }],
  request: {
    body: {
      content: {
        "application/json": { schema: CreateDefinitionSchema },
      },
    },
  },
  responses: {
    201: { description: "Definition created" },
    400: { description: "Validation error" },
    401: { description: "Unauthorized" },
    403: { description: "Forbidden" },
  },
});

export async function GET(request: NextRequest) {
  const authResult = await requireProductionApiPermission("canRead");
  if (!authResult.ok) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  const { searchParams } = new URL(request.url);
  const phase = searchParams.get("phase");
  const activeOnly = searchParams.get("activeOnly") !== "false";

  const where: Record<string, unknown> = {};
  if (phase) where.phase = phase;
  if (activeOnly) where.isActive = true;

  try {
    const definitions = await db.productionCharacteristicDefinition.findMany({
      where,
      orderBy: [{ phase: "asc" }, { sortOrder: "asc" }],
    });
    return NextResponse.json(definitions);
  } catch (error) {
    console.error("Error fetching characteristic definitions:", error);
    return NextResponse.json({ error: "Failed to fetch definitions" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const authResult = await requireProductionApiPermission("canCreate");
  if (!authResult.ok) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  try {
    const body = await request.json();
    const parsed = CreateDefinitionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed", details: parsed.error.format() }, { status: 400 });
    }

    const data = parsed.data;

    const existing = await db.productionCharacteristicDefinition.findUnique({
      where: { phase_key: { phase: data.phase, key: data.key } },
    });
    if (existing) {
      return NextResponse.json({ error: "A definition with this key already exists for this phase" }, { status: 400 });
    }

    const definition = await db.productionCharacteristicDefinition.create({
      data: {
        phase: data.phase,
        key: data.key,
        label: data.label,
        fieldType: data.fieldType,
        options: data.options ?? undefined,
        required: data.required,
        sortOrder: data.sortOrder,
        isActive: data.isActive,
      },
    });

    await logEvent({
      userId: authResult.session.user.id,
      module: "PRODUCTION",
      severity: "INFO",
      action: "CREATE_CHARACTERISTIC_DEFINITION",
      payload: definition,
      diffs: [{
        entity: "ProductionCharacteristicDefinition",
        entityId: definition.id,
        before: {},
        after: definition,
      }],
    });

    return NextResponse.json(definition, { status: 201 });
  } catch (error) {
    console.error("Error creating characteristic definition:", error);
    return NextResponse.json({ error: "Failed to create definition" }, { status: 500 });
  }
}
