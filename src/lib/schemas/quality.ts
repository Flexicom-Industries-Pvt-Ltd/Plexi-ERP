import { z } from "zod";
import {
  QcReferenceType,
  QcDecision,
  QcInspectionStatus,
  RollQualityStatus,
  QcReworkStatus,
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

export const GetQcQueueQuerySchema = z.object({
  referenceType: z.nativeEnum(QcReferenceType).optional(),
  status: z.union([z.nativeEnum(RollQualityStatus), z.literal("ALL")]).optional(),
  search: z.string().optional(),
  page: z.union([z.string(), z.number()]).optional(),
  limit: z.union([z.string(), z.number()]).optional(),
});

export const CreateQcReworkTicketSchema = z.object({
  inspectionId: z.string().optional(),
  sourceReferenceType: z.nativeEnum(QcReferenceType),
  sourceReferenceId: z.string().min(1, "Source reference ID is required"),
  targetPhase: z.string().min(1, "Target phase is required"),
  defectReason: z.string().optional(),
  reworkInstructions: z.string().optional(),
  assignedOperatorId: z.string().optional(),
  reworkQty: z.number().positive().optional(),
  reworkCost: z.number().nonnegative().optional(),
  notes: z.string().optional(),
});

export const UpdateQcReworkTicketSchema = z.object({
  status: z.nativeEnum(QcReworkStatus).optional(),
  assignedOperatorId: z.string().optional(),
  completedById: z.string().optional(),
  reworkQty: z.number().positive().optional(),
  reworkCost: z.number().nonnegative().optional(),
  notes: z.string().optional(),
  defectReason: z.string().optional(),
  reworkInstructions: z.string().optional(),
  reInspectionId: z.string().optional(),
});

export const ListQcReworkTicketsQuerySchema = z.object({
  status: z.nativeEnum(QcReworkStatus).optional(),
  targetPhase: z.string().optional(),
  sourceReferenceType: z.nativeEnum(QcReferenceType).optional(),
  sourceReferenceId: z.string().optional(),
  assignedOperatorId: z.string().optional(),
  search: z.string().optional(),
  page: z.union([z.string(), z.number()]).optional(),
  limit: z.union([z.string(), z.number()]).optional(),
});


