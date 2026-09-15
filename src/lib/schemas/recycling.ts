import { z } from "zod";
import { RecyclingStatus } from "@/generated/prisma";

export const CreateRecyclingBatchSchema = z.object({
  scrapRecordIds: z.array(z.string().min(1)).min(1, "Select at least one scrap record to recycle"),
  granuleGrade: z.string().min(1, "Granule grade/recipe is required"),
  outputItemId: z.string().optional(),
  outputLocationId: z.string().optional(),
  operatorId: z.string().optional(),
  notes: z.string().optional(),
  startedAt: z.union([z.string(), z.date()]).optional(),
});

export type CreateRecyclingBatchInput = z.infer<typeof CreateRecyclingBatchSchema>;

export const CompleteRecyclingBatchSchema = z.object({
  outputRpQty: z.number().positive("Output RP quantity must be greater than 0"),
  outputItemId: z.string().min(1, "Output RP inventory item is required"),
  outputLocationId: z.string().optional(),
  notes: z.string().optional(),
  completedAt: z.union([z.string(), z.date()]).optional(),
});

export type CompleteRecyclingBatchInput = z.infer<typeof CompleteRecyclingBatchSchema>;

export const ListRecyclingBatchesQuerySchema = z.object({
  status: z.nativeEnum(RecyclingStatus).optional(),
  granuleGrade: z.string().optional(),
  search: z.string().optional(),
  page: z.union([z.string(), z.number()]).optional(),
  limit: z.union([z.string(), z.number()]).optional(),
});

export type ListRecyclingBatchesQuery = z.infer<typeof ListRecyclingBatchesQuerySchema>;
