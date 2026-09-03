import { z } from "zod";
import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";
import { CreatePlanSchema, UpdatePlanSchema } from "@/lib/production/plan-schemas";

extendZodWithOpenApi(z);

// ─── Common ───────────────────────────────────────────────────────────────────

export const ErrorSchema = z.object({
  error: z.string(),
  details: z.unknown().optional(),
}).openapi("Error");

export const SuccessSchema = z.object({
  success: z.boolean(),
}).openapi("Success");

export const IdPathParam = z.object({
  id: z.string().openapi({ param: { name: "id", in: "path" }, description: "Resource ID or business number" }),
});

export const ModelPathParam = z.object({
  model: z.string().openapi({ param: { name: "model", in: "path" }, description: "Master data model key (e.g. department, shift, machine, stock)" }),
});

export const ModelIdPathParam = ModelPathParam.extend({
  id: z.string().openapi({ param: { name: "id", in: "path" } }),
});

export const DocIdPathParam = IdPathParam.extend({
  docId: z.string().openapi({ param: { name: "docId", in: "path" }, description: "Document ID" }),
});

// ─── Gate ─────────────────────────────────────────────────────────────────────

export const GateListQuery = z.object({
  status: z.string().optional().openapi({ description: "GateEntryStatus filter" }),
  purpose: z.string().optional().openapi({ description: "Entry purpose filter" }),
  truckNumber: z.string().optional().openapi({ description: "Partial truck number search" }),
});

export const CreateGateEntryBody = z.object({
  truckNumber: z.string().min(1),
  driverName: z.string().min(1),
  driverContact: z.string().optional(),
  driverLicenseNumber: z.string().optional(),
  transporter: z.string().optional(),
  supplierCustomer: z.string().optional(),
  purpose: z.string().min(1),
  expectedMaterial: z.string().optional(),
  expectedQuantity: z.union([z.number(), z.string()]).optional(),
}).openapi("CreateGateEntry");

export const UpdateGateEntryBody = z.object({
  status: z.string().optional(),
  parkingBay: z.string().optional().nullable(),
  parkingZone: z.string().optional().nullable(),
  remarks: z.string().optional().nullable(),
  arrivalTime: z.string().datetime().optional(),
  exitTime: z.string().datetime().optional(),
}).openapi("UpdateGateEntry");

export const GateEntrySchema = z.object({
  id: z.string(),
  entryNumber: z.string(),
  truckNumber: z.string(),
  driverName: z.string(),
  status: z.string(),
  purpose: z.string(),
  arrivalTime: z.string().datetime().optional(),
}).openapi("GateEntry");

export const GateStatsSchema = z.object({
  inside: z.number(),
  waiting: z.number(),
  loading: z.number(),
  unloading: z.number(),
  verificationPending: z.number(),
  onHold: z.number(),
  gateOutToday: z.number(),
}).openapi("GateStats");

export const CreateGateDocumentBody = z.object({
  documentType: z.string().min(1),
  fileUrl: z.string().url(),
  remarks: z.string().optional(),
}).openapi("CreateGateDocument");

export const UpdateGateDocumentBody = z.object({
  status: z.enum(["VERIFIED", "REJECTED"]),
  remarks: z.string().optional(),
}).openapi("UpdateGateDocument");

export const CreateGateStockBody = z.object({
  stockName: z.string().min(1),
  materialType: z.string().optional(),
  unit: z.string().optional(),
  expectedQty: z.number().optional(),
  actualQty: z.number().optional(),
  batchLot: z.string().optional(),
  remarks: z.string().optional(),
}).openapi("CreateGateStockLine");

// ─── Inventory ────────────────────────────────────────────────────────────────

export const InventoryListQuery = z.object({
  type: z.string().optional().openapi({ description: "ItemType filter" }),
  search: z.string().optional(),
  materialType: z.string().optional(),
  includeMovement: z.enum(["true", "false"]).optional(),
});

export const CreateInventoryItemBody = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  itemType: z.enum(["RAW_MATERIAL", "SEMI_FINISHED_GOOD", "FINISHED_GOOD", "SCRAP"]),
  categoryId: z.string().optional(),
  subCategoryId: z.string().optional(),
  uomId: z.string().min(1),
  locationId: z.string().optional(),
  currentStock: z.number().default(0),
  minimumStock: z.number().default(0),
  isActive: z.boolean().default(true),
}).openapi("CreateInventoryItem");

export const UpdateInventoryItemBody = CreateInventoryItemBody.partial().openapi("UpdateInventoryItem");

export const InventoryItemSchema = z.object({
  id: z.string(),
  code: z.string(),
  name: z.string(),
  itemType: z.string(),
  currentStock: z.number(),
  isActive: z.boolean(),
}).openapi("InventoryItem");

export const InventoryBatchesQuery = z.object({
  itemId: z.string().optional(),
  locationId: z.string().optional(),
});

export const InventoryTransactionsQuery = z.object({
  itemId: z.string().optional(),
  type: z.string().optional(),
  page: z.string().optional(),
  limit: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
});

export const StockAdjustBody = z.object({
  itemId: z.string().min(1),
  adjustmentQuantity: z.number().refine((n) => n !== 0, "Must be non-zero"),
  remarks: z.string().optional(),
}).openapi("StockAdjustment");

export const GateReceiptCommitBody = z.object({
  gateStockDetailId: z.string().min(1),
  itemId: z.string().optional(),
  locationId: z.string().optional(),
  remarks: z.string().optional(),
}).openapi("GateReceiptCommit");

// ─── Production ───────────────────────────────────────────────────────────────

export const ProductionPlansQuery = z.object({
  status: z.string().optional(),
  shiftId: z.string().optional(),
  phase: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
});

export const CreatePlanBody = CreatePlanSchema.openapi("CreateProductionPlan");
export const UpdatePlanBody = UpdatePlanSchema.openapi("UpdateProductionPlan");

export const ApprovePlanBody = z.object({
  action: z.enum(["approve", "cancel"]),
}).openapi("ApproveProductionPlan");

export const ProductionPlanSchema = z.object({
  id: z.string(),
  planNumber: z.string(),
  status: z.string(),
  planDate: z.string().optional(),
}).openapi("ProductionPlan");

export const ProductionRunsQuery = z.object({
  planLineId: z.string().optional(),
  planId: z.string().optional(),
  activeOnly: z.enum(["true", "false"]).optional(),
});

export const CreateRunBody = z.object({
  planLineId: z.string().min(1),
  targetQty: z.number().min(0),
  startedAt: z.string().datetime().optional(),
}).openapi("CreateProductionRun");

export const CompleteRunBody = z.object({
  actualQty: z.number().min(0),
  scrapQty: z.number().min(0).default(0),
  completedAt: z.string().datetime().optional(),
  remarks: z.string().optional().nullable(),
}).openapi("CompleteProductionRun");

export const CreateHandoverBody = z.object({
  shiftId: z.string().min(1),
  handoverDate: z.string().optional(),
  completedQty: z.number().min(0).default(0),
  pendingQty: z.number().min(0).default(0),
  wipNotes: z.string().optional().nullable(),
  machineStatus: z.string().optional().nullable(),
  qualityIssues: z.string().optional().nullable(),
  scrapNotes: z.string().optional().nullable(),
  remarks: z.string().optional().nullable(),
}).openapi("CreateShiftHandover");

export const HandoversQuery = z.object({
  shiftId: z.string().optional(),
  date: z.string().optional(),
});

export const CharacteristicsQuery = z.object({
  phase: z.string().optional(),
});

export const CreateCharacteristicBody = z.object({
  phase: z.string().min(1),
  label: z.string().min(1),
  fieldKey: z.string().min(1),
  fieldType: z.enum(["TEXT", "NUMBER", "SELECT", "BOOLEAN"]),
  options: z.array(z.string()).optional(),
  isRequired: z.boolean().default(false),
  sortOrder: z.number().int().default(0),
}).openapi("CreateCharacteristicDefinition");

export const UpdateCharacteristicBody = CreateCharacteristicBody.partial().openapi("UpdateCharacteristicDefinition");

export const CreateBobbinRunBody = z.object({
  planLineId: z.string().min(1),
  targetQty: z.number().min(0),
  rawMaterialItemId: z.string().min(1),
  outputItemId: z.string().optional(),
  inputQty: z.number().min(0).default(0),
  startedAt: z.string().datetime().optional(),
}).openapi("CreateBobbinRun");

export const UpdateBobbinRunBody = z.object({
  inputQty: z.number().min(0).optional(),
  outputQty: z.number().min(0).optional(),
  scrapQty: z.number().min(0).optional(),
  bobbinCharacteristics: z.record(z.string(), z.unknown()).optional(),
}).openapi("UpdateBobbinRun");

export const CompleteBobbinRunBody = z.object({
  outputQty: z.number().min(0),
  scrapQty: z.number().min(0).default(0),
  bobbinCharacteristics: z.record(z.string(), z.unknown()).optional(),
}).openapi("CompleteBobbinRun");

export const CreateLoomRunBody = z.object({
  planLineId: z.string().min(1),
  loomMachineId: z.string().min(1),
  operatorId: z.string().min(1),
  bobbinItemId: z.string().min(1),
  bobbinIssueQty: z.number().min(0),
  targetQty: z.number().min(0).optional(),
}).openapi("CreateLoomRun");

export const UpdateLoomRunBody = z.object({
  bobbinIssueQty: z.number().min(0).optional(),
  rollOutputQty: z.number().min(0).optional(),
  rollType: z.enum(["PP", "LPP"]).optional(),
  rollItemId: z.string().optional(),
  characteristics: z.record(z.string(), z.unknown()).optional(),
}).openapi("UpdateLoomRun");

export const CompleteLoomRunBody = z.object({
  rollOutputQty: z.number().min(0),
  rollType: z.enum(["PP", "LPP"]),
  rollItemId: z.string().optional(),
  characteristics: z.record(z.string(), z.unknown()).optional(),
}).openapi("CompleteLoomRun");

export const LoomMachinesQuery = z.object({
  date: z.string().optional(),
  shiftId: z.string().optional(),
});

export const LoomAssignmentsQuery = z.object({
  date: z.string().optional(),
  shiftId: z.string().optional(),
  operatorId: z.string().optional(),
});

export const CreateLoomAssignmentBody = z.object({
  shiftId: z.string().min(1),
  operatorId: z.string().min(1),
  assignmentDate: z.string().optional(),
  machineIds: z.array(z.string().min(1)).min(1),
  forceOverride: z.boolean().default(false),
}).openapi("CreateLoomAssignment");

export const ProductionDashboardQuery = z.object({
  date: z.string().optional(),
});

export const ProductionRollsQuery = z.object({
  rollType: z.enum(["PP", "LPP"]).optional(),
  qualityStatus: z.enum(["PENDING_QC", "PASSED", "FAILED", "REWORK", "ON_HOLD"]).optional(),
  sourcePhase: z.enum(["LOOM", "LAMINATION", "PRINTING"]).optional(),
  search: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  locationId: z.string().optional(),
});

export const CreateProductionRollBody = z.object({
  rollType: z.enum(["PP", "LPP"]),
  weight: z.number().min(0).optional(),
  length: z.number().min(0).optional(),
  batchLot: z.string().optional().nullable(),
  locationId: z.string().optional().nullable(),
  inventoryItemId: z.string().optional().nullable(),
  characteristics: z.record(z.string(), z.unknown()).optional(),
  qualityStatus: z.enum(["PENDING_QC", "PASSED", "FAILED", "REWORK", "ON_HOLD"]).default("PENDING_QC"),
  sourcePhase: z.enum(["LOOM", "LAMINATION", "PRINTING"]).default("LOOM"),
  productionRunId: z.string().optional().nullable(),
  loomProductionRunId: z.string().optional().nullable(),
  remarks: z.string().optional().nullable(),
}).openapi("CreateProductionRoll");

export const UpdateProductionRollBody = z.object({
  weight: z.number().min(0).optional(),
  length: z.number().min(0).optional(),
  batchLot: z.string().optional().nullable(),
  locationId: z.string().optional().nullable(),
  inventoryItemId: z.string().optional().nullable(),
  characteristics: z.record(z.string(), z.unknown()).optional(),
  qualityStatus: z.enum(["PENDING_QC", "PASSED", "FAILED", "REWORK", "ON_HOLD"]).optional(),
  remarks: z.string().optional().nullable(),
}).openapi("UpdateProductionRoll");

export const ProductionRollSchema = z.object({
  id: z.string(),
  rollNumber: z.string(),
  rollType: z.enum(["PP", "LPP"]),
  qualityStatus: z.string(),
  weight: z.number().nullable().optional(),
  length: z.number().nullable().optional(),
  batchLot: z.string().nullable().optional(),
}).openapi("ProductionRoll");

// ─── Data Centre & Settings ───────────────────────────────────────────────────

export const StockSearchQuery = z.object({
  q: z.string().optional().openapi({ description: "Search by stock name" }),
});

export const DriverSearchQuery = z.object({
  q: z.string().optional().openapi({ description: "Search by name or phone" }),
});

// ─── Profile ──────────────────────────────────────────────────────────────────

export const UpdateProfileBody = z.object({
  name: z.string().optional(),
  phone: z.string().optional(),
}).openapi("UpdateProfile");

export const ChangePasswordBody = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8),
}).openapi("ChangePassword");

// ─── Logs ─────────────────────────────────────────────────────────────────────

export const LogsQuery = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
  module: z.string().optional(),
  severity: z.string().optional(),
  action: z.string().optional(),
  search: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  httpMethod: z.string().optional(),
  statusCode: z.string().optional(),
  userId: z.string().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(["asc", "desc"]).optional(),
});

export const LogsExportQuery = LogsQuery;

// ─── System ───────────────────────────────────────────────────────────────────

export const HealthSchema = z.object({
  status: z.enum(["ok", "error"]),
  message: z.string(),
  database: z.string(),
  timestamp: z.string().datetime(),
}).openapi("HealthCheck");

export const OperatorSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  employeeId: z.string().nullable().optional(),
}).openapi("Operator");
