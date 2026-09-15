import { z } from "zod";
import { DispatchOrderStatus, DispatchAllocationStatus } from "@/generated/prisma";

export const DispatchOrderLineInputSchema = z.object({
  inventoryItemId: z.string().min(1, "Inventory item is required"),
  orderedQty: z.number().positive("Ordered quantity must be greater than 0"),
  unit: z.string().default("bags"),
  notes: z.string().optional(),
});

export const CreateDispatchOrderSchema = z.object({
  customerName: z.string().min(1, "Customer name is required"),
  customerContact: z.string().optional(),
  customerAddress: z.string().optional(),
  gateEntryId: z.string().optional(),
  transporter: z.string().optional(),
  vehicleNumber: z.string().optional(),
  driverName: z.string().optional(),
  driverPhone: z.string().optional(),
  notes: z.string().optional(),
  lines: z.array(DispatchOrderLineInputSchema).min(1, "At least one order line is required"),
});

export type CreateDispatchOrderInput = z.infer<typeof CreateDispatchOrderSchema>;

export const UpdateDispatchOrderSchema = z.object({
  customerName: z.string().min(1).optional(),
  customerContact: z.string().nullable().optional(),
  customerAddress: z.string().nullable().optional(),
  status: z.nativeEnum(DispatchOrderStatus).optional(),
  gateEntryId: z.string().nullable().optional(),
  transporter: z.string().nullable().optional(),
  vehicleNumber: z.string().nullable().optional(),
  driverName: z.string().nullable().optional(),
  driverPhone: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});

export type UpdateDispatchOrderInput = z.infer<typeof UpdateDispatchOrderSchema>;

export const PickAllocationItemSchema = z.object({
  dispatchOrderLineId: z.string().min(1),
  finishedGoodsLotId: z.string().min(1),
  quantity: z.number().positive("Picked quantity must be positive"),
  notes: z.string().optional(),
});

export const PickDispatchOrderSchema = z.object({
  allocations: z.array(PickAllocationItemSchema).min(1, "At least one lot allocation is required"),
});

export type PickDispatchOrderInput = z.infer<typeof PickDispatchOrderSchema>;

export const LoadAllocationItemSchema = z.object({
  allocationId: z.string().min(1),
  loadedQty: z.number().positive("Loaded quantity must be positive").optional(),
});

export const LoadDispatchOrderSchema = z.object({
  loadedAllocations: z.array(LoadAllocationItemSchema).optional(),
  vehicleNumber: z.string().optional(),
  driverName: z.string().optional(),
  driverPhone: z.string().optional(),
  transporter: z.string().optional(),
  gateEntryId: z.string().optional(),
  notes: z.string().optional(),
});


export type LoadDispatchOrderInput = z.infer<typeof LoadDispatchOrderSchema>;

export const ListDispatchOrdersQuerySchema = z.object({
  status: z.nativeEnum(DispatchOrderStatus).optional(),
  customerName: z.string().optional(),
  search: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  page: z.union([z.string(), z.number()]).optional(),
  limit: z.union([z.string(), z.number()]).optional(),
});

export type ListDispatchOrdersQuery = z.infer<typeof ListDispatchOrdersQuerySchema>;
