import { z } from "zod";
import {
  QcReferenceType,
  QcDecision,
  QcInspectionStatus,
} from "@/generated/prisma";

export const QcInspectionLineInputSchema = z.object({
  parameterName: z.string().min(1, "Parameter name is required"),
  standardValue: z.string().optional(),
  actualValue: z.string().min(1, "Actual value is required"),
  unit: z.string().optional(),
  status: z.nativeEnum(QcDecision).default(QcDecision.PASSED),
  remarks: z.string().optional(),
});

export const CreateQcInspectionSchema = z.object({
  referenceType: z.nativeEnum(QcReferenceType),
  referenceId: z.string().min(1, "Reference ID is required"),
  inspectorId: z.string().optional(),
  notes: z.string().optional(),
  samplesInspected: z.number().int().min(1).default(1),
  parameters: z.record(z.string(), z.unknown()).optional(),
  lines: z.array(QcInspectionLineInputSchema).optional(),
});

export const RecordQcDecisionSchema = z.object({
  decision: z.nativeEnum(QcDecision),
  inspectorId: z.string().optional(),
  notes: z.string().optional(),
  defectReason: z.string().optional(),
  reworkInstructions: z.string().optional(),
  samplesInspected: z.number().int().min(1).optional(),
  parameters: z.record(z.string(), z.unknown()).optional(),
  lines: z.array(QcInspectionLineInputSchema).optional(),
});

export const ListQcInspectionsQuerySchema = z.object({
  referenceType: z.nativeEnum(QcReferenceType).optional(),
  referenceId: z.string().optional(),
  status: z.nativeEnum(QcInspectionStatus).optional(),
  decision: z.nativeEnum(QcDecision).optional(),
  inspectorId: z.string().optional(),
  search: z.string().optional(),
  page: z.union([z.string(), z.number()]).optional(),
  limit: z.union([z.string(), z.number()]).optional(),
});
