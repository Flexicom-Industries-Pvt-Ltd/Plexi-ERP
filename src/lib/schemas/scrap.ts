import { z } from "zod";
import { ScrapSourceType } from "@/generated/prisma";

export const CreateScrapRecordSchema = z.object({
  sourceType: z.nativeEnum(ScrapSourceType).default(ScrapSourceType.QC_INSPECTION),
  sourceId: z.string().optional(),
  phase: z.string().min(1, "Production phase is required"),
  reasonCode: z.string().min(1, "Reason code is required"),
  quantity: z.number().positive("Quantity must be greater than 0"),
  unit: z.string().default("kg"),
  inventoryItemId: z.string().optional(),
  locationId: z.string().optional(),
  notes: z.string().optional(),
  recordedAt: z.string().datetime().optional(),
});

export const ListScrapRecordsQuerySchema = z.object({
  phase: z.string().optional(),
  sourceType: z.nativeEnum(ScrapSourceType).optional(),
  reasonCode: z.string().optional(),
  inventoryItemId: z.string().optional(),
  locationId: z.string().optional(),
  search: z.string().optional(),
  page: z.union([z.string(), z.number()]).optional(),
  limit: z.union([z.string(), z.number()]).optional(),
});
