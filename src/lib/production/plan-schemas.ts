import { z } from "zod";
import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";

extendZodWithOpenApi(z);

export const ProductionPhaseEnum = z.enum([
  "BOBBIN", "LOOM", "LAMINATION", "PRINTING", "CUTTING",
  "CONVERTEX", "VALVOMATIC", "BCS", "MANUAL_STITCH", "BALING",
]);

export const ProductionPlanStatusEnum = z.enum([
  "DRAFT", "APPROVED", "IN_PROGRESS", "COMPLETED", "CANCELLED",
]);

export const CharacteristicValueSchema = z.object({
  definitionId: z.string().min(1),
  value: z.string(),
});

export const PlanLineSchema = z.object({
  phase: ProductionPhaseEnum,
  machineId: z.string().optional().nullable(),
  operatorId: z.string().optional().nullable(),
  operatorIds: z.array(z.string()).optional(),
  inventoryItemId: z.string().optional().nullable(),
  targetQty: z.number().min(0).default(0),
  priority: z.number().int().default(0),
  instructions: z.string().optional().nullable(),
  sortOrder: z.number().int().default(0),
  characteristics: z.array(CharacteristicValueSchema).optional(),
});

export const CreatePlanSchema = z.object({
  shiftId: z.string().optional().nullable(),
  planDate: z.string().optional(),
  status: ProductionPlanStatusEnum.default("DRAFT"),
  notes: z.string().optional().nullable(),
  lines: z.array(PlanLineSchema).min(1, "At least one plan line is required"),
});

export const UpdatePlanSchema = z.object({
  shiftId: z.string().optional().nullable(),
  planDate: z.string().optional(),
  notes: z.string().optional().nullable(),
  lines: z.array(PlanLineSchema).min(1).optional(),
});

export type PlanLineInput = z.infer<typeof PlanLineSchema>;

export function buildLineCreateData(line: PlanLineInput, index: number) {
  const operatorIds = line.operatorIds?.length
    ? line.operatorIds
    : line.operatorId
      ? [line.operatorId]
      : [];

  return {
    phase: line.phase,
    machineId: line.machineId || null,
    operatorId: operatorIds[0] || line.operatorId || null,
    inventoryItemId: line.inventoryItemId || null,
    targetQty: line.targetQty,
    priority: line.priority,
    instructions: line.instructions || null,
    sortOrder: line.sortOrder ?? index,
    operators: operatorIds.length
      ? { create: operatorIds.map((userId) => ({ userId })) }
      : undefined,
    characteristics: line.characteristics?.length
      ? {
          create: line.characteristics.map((c) => ({
            definitionId: c.definitionId,
            value: c.value,
          })),
        }
      : undefined,
  };
}
