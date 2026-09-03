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

export const CreateLaminationRunBody = z.object({
  planLineId: z.string().min(1),
  laminationMachineId: z.string().min(1),
  operatorId: z.string().min(1),
  inputRollId: z.string().min(1),
  targetQty: z.number().min(0),
  inputQty: z.number().min(0).default(0),
  startedAt: z.string().datetime().optional(),
}).openapi("CreateLaminationRun");

export const UpdateLaminationRunBody = z.object({
  inputQty: z.number().min(0).optional(),
  outputQty: z.number().min(0).optional(),
  characteristics: z.record(z.string(), z.unknown()).optional(),
}).openapi("UpdateLaminationRun");

export const CompleteLaminationRunBody = z.object({
  action: z.literal("complete"),
  actualQty: z.number().min(0),
  acceptedQty: z.number().min(0),
  rejectedQty: z.number().min(0).default(0),
  reworkQty: z.number().min(0).default(0),
  scrapQty: z.number().min(0).default(0),
  downtimeMinutes: z.number().int().min(0).default(0),
  inputQty: z.number().min(0),
  outputQty: z.number().min(0),
  characteristics: z.record(z.string(), z.unknown()).optional(),
  endedAt: z.string().datetime().optional(),
}).openapi("CompleteLaminationRun");

export const LaminationMachinesQuery = z.object({
  shiftId: z.string().optional(),
  assignmentDate: z.string().optional(),
});

export const LaminationRunsQuery = z.object({
  planLineId: z.string().optional(),
  planId: z.string().optional(),
  operatorId: z.string().optional(),
  laminationMachineId: z.string().optional(),
  activeOnly: z.enum(["true", "false"]).optional(),
});

const InkMaterialBody = z.object({
  itemId: z.string().optional(),
  name: z.string().min(1),
  qty: z.number().min(0),
  unit: z.string().optional(),
});

export const CreatePrintingRunBody = z.object({
  planLineId: z.string().min(1),
  printingMachineId: z.string().min(1),
  operatorId: z.string().min(1),
  inputRollId: z.string().min(1),
  helperUserIds: z.array(z.string().min(1)).default([]),
  targetQty: z.number().min(0),
  brand: z.string().optional().nullable(),
  colour: z.string().optional().nullable(),
  artworkRef: z.string().optional().nullable(),
  inkMaterials: z.array(InkMaterialBody).optional(),
  inputQty: z.number().min(0).default(0),
}).openapi("CreatePrintingRun");

export const UpdatePrintingRunBody = z.object({
  inputQty: z.number().min(0).optional(),
  outputQty: z.number().min(0).optional(),
  brand: z.string().optional().nullable(),
  colour: z.string().optional().nullable(),
  artworkRef: z.string().optional().nullable(),
  inkMaterials: z.array(InkMaterialBody).optional(),
  characteristics: z.record(z.string(), z.unknown()).optional(),
}).openapi("UpdatePrintingRun");

export const CompletePrintingRunBody = z.object({
  action: z.literal("complete"),
  actualQty: z.number().min(0),
  acceptedQty: z.number().min(0),
  rejectedQty: z.number().min(0).default(0),
  reworkQty: z.number().min(0).default(0),
  scrapQty: z.number().min(0).default(0),
  downtimeMinutes: z.number().int().min(0).default(0),
  inputQty: z.number().min(0),
  outputQty: z.number().min(0),
  brand: z.string().optional().nullable(),
  colour: z.string().optional().nullable(),
  artworkRef: z.string().optional().nullable(),
  inkMaterials: z.array(InkMaterialBody).optional(),
  characteristics: z.record(z.string(), z.unknown()).optional(),
}).openapi("CompletePrintingRun");

export const PrintingMachinesQuery = z.object({
  shiftId: z.string().optional(),
  assignmentDate: z.string().optional(),
});

export const PrintingRunsQuery = z.object({
  planLineId: z.string().optional(),
  planId: z.string().optional(),
  operatorId: z.string().optional(),
  printingMachineId: z.string().optional(),
  activeOnly: z.enum(["true", "false"]).optional(),
});

export const CreateCuttingRunBody = z.object({
  planLineId: z.string().min(1),
  cuttingMachineId: z.string().min(1),
  operatorId: z.string().min(1),
  inputRollId: z.string().min(1),
  targetQty: z.number().min(0),
  cuttingSpec: z.string().optional().nullable(),
  inputQty: z.number().min(0).default(0),
}).openapi("CreateCuttingRun");

export const UpdateCuttingRunBody = z.object({
  inputQty: z.number().min(0).optional(),
  outputMaterialQty: z.number().min(0).optional(),
  cuttingSpec: z.string().optional().nullable(),
  outputItemId: z.string().nullable().optional(),
  characteristics: z.record(z.string(), z.unknown()).optional(),
}).openapi("UpdateCuttingRun");

export const CompleteCuttingRunBody = z.object({
  action: z.literal("complete"),
  actualQty: z.number().min(0),
  acceptedQty: z.number().min(0),
  rejectedQty: z.number().min(0).default(0),
  reworkQty: z.number().min(0).default(0),
  scrapQty: z.number().min(0).default(0),
  downtimeMinutes: z.number().int().min(0).default(0),
  inputQty: z.number().min(0),
  outputMaterialQty: z.number().min(0),
  cuttingSpec: z.string().optional().nullable(),
  outputItemId: z.string().nullable().optional(),
  characteristics: z.record(z.string(), z.unknown()).optional(),
}).openapi("CompleteCuttingRun");

export const CuttingMachinesQuery = z.object({
  shiftId: z.string().optional(),
  assignmentDate: z.string().optional(),
});

export const CuttingRunsQuery = z.object({
  planLineId: z.string().optional(),
  planId: z.string().optional(),
  operatorId: z.string().optional(),
  cuttingMachineId: z.string().optional(),
  activeOnly: z.enum(["true", "false"]).optional(),
});

export const CreateConvertexRunBody = z.object({
  planLineId: z.string().min(1),
  convertexMachineId: z.string().min(1),
  operatorId: z.string().min(1),
  inputMaterialId: z.string().min(1),
  targetQty: z.number().min(0),
  inputQty: z.number().min(0).default(0),
}).openapi("CreateConvertexRun");

export const UpdateConvertexRunBody = z.object({
  inputQty: z.number().min(0).optional(),
  outputBagQty: z.number().min(0).optional(),
  outputItemId: z.string().nullable().optional(),
  characteristics: z.record(z.string(), z.unknown()).optional(),
}).openapi("UpdateConvertexRun");

export const CompleteConvertexRunBody = z.object({
  action: z.literal("complete"),
  actualQty: z.number().min(0),
  acceptedQty: z.number().min(0),
  rejectedQty: z.number().min(0).default(0),
  reworkQty: z.number().min(0).default(0),
  scrapQty: z.number().min(0).default(0),
  downtimeMinutes: z.number().int().min(0).default(0),
  inputQty: z.number().min(0),
  outputBagQty: z.number().min(0),
  outputItemId: z.string().nullable().optional(),
  characteristics: z.record(z.string(), z.unknown()).optional(),
}).openapi("CompleteConvertexRun");

export const ConvertexMachinesQuery = z.object({
  shiftId: z.string().optional(),
});

export const ConvertexRunsQuery = z.object({
  planLineId: z.string().optional(),
  planId: z.string().optional(),
  operatorId: z.string().optional(),
  convertexMachineId: z.string().optional(),
  activeOnly: z.enum(["true", "false"]).optional(),
});

export const ValvomaticInputsBody = z.object({
  inputRollId: z.string().nullable().optional(),
  rollQty: z.number().min(0).default(0),
  yarnItemId: z.string().nullable().optional(),
  yarnQty: z.number().min(0).default(0),
  ppItemId: z.string().nullable().optional(),
  ppQty: z.number().min(0).default(0),
  lppItemId: z.string().nullable().optional(),
  lppQty: z.number().min(0).default(0),
}).openapi("ValvomaticInputs");

export const CreateValvomaticRunBody = z.object({
  planLineId: z.string().min(1),
  valvomaticMachineId: z.string().min(1),
  operatorId: z.string().min(1),
  targetQty: z.number().min(0),
  inputs: ValvomaticInputsBody,
}).openapi("CreateValvomaticRun");

export const UpdateValvomaticRunBody = z.object({
  inputs: ValvomaticInputsBody.optional(),
  outputBagQty: z.number().min(0).optional(),
  outputItemId: z.string().nullable().optional(),
  characteristics: z.record(z.string(), z.unknown()).optional(),
}).openapi("UpdateValvomaticRun");

export const CompleteValvomaticRunBody = z.object({
  action: z.literal("complete"),
  actualQty: z.number().min(0),
  acceptedQty: z.number().min(0),
  rejectedQty: z.number().min(0).default(0),
  reworkQty: z.number().min(0).default(0),
  scrapQty: z.number().min(0).default(0),
  downtimeMinutes: z.number().int().min(0).default(0),
  inputs: ValvomaticInputsBody,
  outputBagQty: z.number().min(0),
  outputItemId: z.string().nullable().optional(),
  characteristics: z.record(z.string(), z.unknown()).optional(),
}).openapi("CompleteValvomaticRun");

export const ValvomaticMachinesQuery = z.object({
  shiftId: z.string().optional(),
});

export const ValvomaticRunsQuery = z.object({
  planLineId: z.string().optional(),
  planId: z.string().optional(),
  operatorId: z.string().optional(),
  valvomaticMachineId: z.string().optional(),
  activeOnly: z.enum(["true", "false"]).optional(),
});

export const ValvomaticInputMaterialsQuery = z.object({
  type: z.enum(["yarn", "pp", "lpp"]).optional(),
});

export const BcsProductionRulesBody = z.object({
  minTeamMembers: z.number().int().min(0).default(0),
  maxTeamMembers: z.number().int().min(0).default(6),
  requireRollInput: z.boolean().default(false),
  requireYarnInput: z.boolean().default(false),
}).openapi("BcsProductionRules");

export const ManpowerRulesBody = z.object({
  loomsPerOperator: z.number().int().min(1).max(20),
  printingHelpersPerOperator: z.number().int().min(0).max(10),
}).openapi("ManpowerRules");

export const CreateBcsRunBody = z.object({
  planLineId: z.string().min(1),
  bcsMachineId: z.string().min(1),
  operatorId: z.string().min(1),
  teamMemberIds: z.array(z.string().min(1)).default([]),
  targetQty: z.number().min(0),
  inputs: ValvomaticInputsBody,
}).openapi("CreateBcsRun");

export const UpdateBcsRunBody = z.object({
  teamMemberIds: z.array(z.string().min(1)).optional(),
  inputs: ValvomaticInputsBody.optional(),
  outputBagQty: z.number().min(0).optional(),
  outputItemId: z.string().nullable().optional(),
  characteristics: z.record(z.string(), z.unknown()).optional(),
}).openapi("UpdateBcsRun");

export const CompleteBcsRunBody = z.object({
  action: z.literal("complete"),
  actualQty: z.number().min(0),
  acceptedQty: z.number().min(0),
  rejectedQty: z.number().min(0).default(0),
  reworkQty: z.number().min(0).default(0),
  scrapQty: z.number().min(0).default(0),
  downtimeMinutes: z.number().int().min(0).default(0),
  teamMemberIds: z.array(z.string().min(1)).default([]),
  inputs: ValvomaticInputsBody,
  outputBagQty: z.number().min(0),
  outputItemId: z.string().nullable().optional(),
  characteristics: z.record(z.string(), z.unknown()).optional(),
}).openapi("CompleteBcsRun");

export const BcsMachinesQuery = z.object({
  shiftId: z.string().optional(),
});

export const BcsRunsQuery = z.object({
  planLineId: z.string().optional(),
  planId: z.string().optional(),
  operatorId: z.string().optional(),
  bcsMachineId: z.string().optional(),
  activeOnly: z.enum(["true", "false"]).optional(),
});

export const BcsInputMaterialsQuery = z.object({
  type: z.enum(["yarn", "pp", "lpp"]).optional(),
});

export const CreateManualStitchRunBody = z.object({
  planLineId: z.string().min(1),
  operatorId: z.string().min(1),
  workerIds: z.array(z.string().min(1)).min(1),
  targetQty: z.number().min(0),
  inputMaterialId: z.string().min(1),
  inputQty: z.number().min(0).default(0),
}).openapi("CreateManualStitchRun");

export const UpdateManualStitchRunBody = z.object({
  workerIds: z.array(z.string().min(1)).optional(),
  inputQty: z.number().min(0).optional(),
  outputBagQty: z.number().min(0).optional(),
  outputItemId: z.string().nullable().optional(),
  characteristics: z.record(z.string(), z.unknown()).optional(),
}).openapi("UpdateManualStitchRun");

export const CompleteManualStitchRunBody = z.object({
  action: z.literal("complete"),
  actualQty: z.number().min(0),
  acceptedQty: z.number().min(0),
  rejectedQty: z.number().min(0).default(0),
  reworkQty: z.number().min(0).default(0),
  scrapQty: z.number().min(0).default(0),
  downtimeMinutes: z.number().int().min(0).default(0),
  workerIds: z.array(z.string().min(1)).min(1),
  inputQty: z.number().min(0),
  outputBagQty: z.number().min(0),
  outputItemId: z.string().nullable().optional(),
  characteristics: z.record(z.string(), z.unknown()).optional(),
}).openapi("CompleteManualStitchRun");

export const ManualStitchRunsQuery = z.object({
  planLineId: z.string().optional(),
  planId: z.string().optional(),
  operatorId: z.string().optional(),
  activeOnly: z.enum(["true", "false"]).optional(),
});

export const BalesQuery = z.object({
  shiftId: z.string().optional(),
  productId: z.string().optional(),
  qualityStatus: z.enum(["PENDING_QC", "PASSED", "FAILED", "REWORK", "ON_HOLD"]).optional(),
  search: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
});

export const CreateBaleBody = z.object({
  productId: z.string().min(1),
  baleItemId: z.string().nullable().optional(),
  bagsPerBale: z.number().min(1),
  quantity: z.number().min(1),
  productionBatch: z.string().nullable().optional(),
  qualityStatus: z.enum(["PENDING_QC", "PASSED", "FAILED", "REWORK", "ON_HOLD"]).default("PENDING_QC"),
  shiftId: z.string().min(1),
  characteristics: z.record(z.string(), z.unknown()).optional(),
  baledAt: z.string().datetime().optional(),
}).openapi("CreateBale");

export const UpdateBaleBody = z.object({
  productionBatch: z.string().nullable().optional(),
  qualityStatus: z.enum(["PENDING_QC", "PASSED", "FAILED", "REWORK", "ON_HOLD"]).optional(),
  characteristics: z.record(z.string(), z.unknown()).optional(),
  baleItemId: z.string().nullable().optional(),
}).openapi("UpdateBale");

export const BaleSchema = z.object({
  id: z.string(),
  baleNumber: z.string(),
  bagsPerBale: z.number(),
  quantity: z.number(),
  qualityStatus: z.string(),
  productionBatch: z.string().nullable().optional(),
}).openapi("Bale");

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

export const ProductionReportsQuery = z.object({
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  dateRange: z.string().optional().describe("Comma-separated from,to dates"),
  shift: z.string().optional(),
  shiftId: z.string().optional(),
  phase: z.string().optional(),
  machine: z.string().optional(),
  machineId: z.string().optional(),
  operator: z.string().optional(),
  operatorId: z.string().optional(),
  format: z.enum(["json", "csv"]).optional(),
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
