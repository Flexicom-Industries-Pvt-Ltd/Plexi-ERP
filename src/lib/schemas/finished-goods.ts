import { z } from "zod";
import { FinishedGoodsStatus, RollQualityStatus } from "@/generated/prisma";

export const ReceiveFinishedGoodsSchema = z.object({
  // Single or multiple bale receiving
  baleIds: z.array(z.string().min(1)).optional(),
  baleId: z.string().optional(),

  // Manual / direct FG receipt
  inventoryItemId: z.string().optional(),
  quantity: z.number().positive("Quantity must be positive").optional(),
  unit: z.string().default("bags").optional(),
  productionBatch: z.string().optional(),
  grossWeight: z.number().positive().optional(),
  netWeight: z.number().positive().optional(),
  qualityStatus: z.nativeEnum(RollQualityStatus).default(RollQualityStatus.PASSED).optional(),
  locationId: z.string().optional(),
  notes: z.string().optional(),
  receivedAt: z.union([z.string(), z.date()]).optional(),
});

export type ReceiveFinishedGoodsInput = z.infer<typeof ReceiveFinishedGoodsSchema>;

export const UpdateFinishedGoodsLotSchema = z.object({
  locationId: z.string().nullable().optional(),
  status: z.nativeEnum(FinishedGoodsStatus).optional(),
  qualityStatus: z.nativeEnum(RollQualityStatus).optional(),
  notes: z.string().nullable().optional(),
  grossWeight: z.number().positive().nullable().optional(),
  netWeight: z.number().positive().nullable().optional(),
});

export type UpdateFinishedGoodsLotInput = z.infer<typeof UpdateFinishedGoodsLotSchema>;

export const ListFinishedGoodsQuerySchema = z.object({
  inventoryItemId: z.string().optional(),
  productionBatch: z.string().optional(),
  locationId: z.string().optional(),
  status: z.nativeEnum(FinishedGoodsStatus).optional(),
  qualityStatus: z.nativeEnum(RollQualityStatus).optional(),
  search: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  page: z.union([z.string(), z.number()]).optional(),
  limit: z.union([z.string(), z.number()]).optional(),
});

export type ListFinishedGoodsQuery = z.infer<typeof ListFinishedGoodsQuerySchema>;
