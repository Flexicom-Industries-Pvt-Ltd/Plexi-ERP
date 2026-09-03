import { reg } from "../helpers";
import {
  ApprovePlanBody,
  CharacteristicsQuery,
  CompleteBobbinRunBody,
  CompleteLoomRunBody,
  CompleteLaminationRunBody,
  CompletePrintingRunBody,
  CompleteCuttingRunBody,
  CompleteConvertexRunBody,
  CompleteRunBody,
  CreateBobbinRunBody,
  CreateCharacteristicBody,
  CreateHandoverBody,
  CreateLoomAssignmentBody,
  CreateLoomRunBody,
  CreateLaminationRunBody,
  CreatePrintingRunBody,
  CreateCuttingRunBody,
  CreateConvertexRunBody,
  CreatePlanBody,
  CreateRunBody,
  CreateProductionRollBody,
  HandoversQuery,
  IdPathParam,
  InventoryItemSchema,
  LoomAssignmentsQuery,
  LoomMachinesQuery,
  LaminationMachinesQuery,
  LaminationRunsQuery,
  PrintingMachinesQuery,
  PrintingRunsQuery,
  CuttingMachinesQuery,
  CuttingRunsQuery,
  ConvertexMachinesQuery,
  ConvertexRunsQuery,
  OperatorSchema,
  ProductionDashboardQuery,
  ProductionPlanSchema,
  ProductionPlansQuery,
  ProductionRollSchema,
  ProductionRollsQuery,
  ProductionRunsQuery,
  UpdateBobbinRunBody,
  UpdateCharacteristicBody,
  UpdateLoomRunBody,
  UpdateLaminationRunBody,
  UpdatePrintingRunBody,
  UpdateCuttingRunBody,
  UpdateConvertexRunBody,
  UpdatePlanBody,
  UpdateProductionRollBody,
} from "../schemas";

const TAG = ["Production"];

export function registerProductionRoutes() {
  reg({
    method: "get",
    path: "/api/production/dashboard",
    summary: "Production dashboard KPIs",
    tags: TAG,
    query: ProductionDashboardQuery,
  });
  reg({
    method: "get",
    path: "/api/production/plans",
    summary: "List production plans",
    tags: TAG,
    query: ProductionPlansQuery,
    response: ProductionPlanSchema.array(),
  });
  reg({
    method: "post",
    path: "/api/production/plans",
    summary: "Create production plan",
    tags: TAG,
    body: CreatePlanBody,
    response: ProductionPlanSchema,
  });
  reg({
    method: "get",
    path: "/api/production/plans/{id}",
    summary: "Get production plan",
    tags: TAG,
    description: "By ID or plan number. Includes lines, operators, and characteristics.",
    params: IdPathParam,
    response: ProductionPlanSchema,
  });
  reg({
    method: "put",
    path: "/api/production/plans/{id}",
    summary: "Update production plan",
    tags: TAG,
    description: "Draft plans only.",
    params: IdPathParam,
    body: UpdatePlanBody,
    response: ProductionPlanSchema,
    responses: { 409: { description: "Plan is not editable" } },
  });
  reg({
    method: "patch",
    path: "/api/production/plans/{id}",
    summary: "Approve or cancel production plan",
    tags: TAG,
    params: IdPathParam,
    body: ApprovePlanBody,
    response: ProductionPlanSchema,
    responses: { 409: { description: "Invalid status transition" } },
  });
  reg({
    method: "delete",
    path: "/api/production/plans/{id}",
    summary: "Delete draft production plan",
    tags: TAG,
    params: IdPathParam,
    responses: { 409: { description: "Only draft plans can be deleted" } },
  });
  reg({
    method: "post",
    path: "/api/production/plans/{id}/duplicate",
    summary: "Duplicate production plan",
    tags: TAG,
    params: IdPathParam,
    response: ProductionPlanSchema,
  });
  reg({
    method: "get",
    path: "/api/production/runs",
    summary: "List production runs",
    tags: TAG,
    query: ProductionRunsQuery,
  });
  reg({
    method: "post",
    path: "/api/production/runs",
    summary: "Start production run",
    tags: TAG,
    body: CreateRunBody,
  });
  reg({
    method: "get",
    path: "/api/production/runs/{id}",
    summary: "Get production run",
    tags: TAG,
    params: IdPathParam,
  });
  reg({
    method: "patch",
    path: "/api/production/runs/{id}",
    summary: "Update or complete production run",
    tags: TAG,
    params: IdPathParam,
    body: CompleteRunBody,
  });
  reg({
    method: "get",
    path: "/api/production/operators",
    summary: "List operators for plan assignment",
    tags: TAG,
    response: OperatorSchema.array(),
  });
  reg({
    method: "get",
    path: "/api/production/handovers",
    summary: "List shift handovers",
    tags: TAG,
    query: HandoversQuery,
  });
  reg({
    method: "post",
    path: "/api/production/handovers",
    summary: "Create shift handover",
    tags: TAG,
    body: CreateHandoverBody,
  });
  reg({
    method: "get",
    path: "/api/production/characteristics/definitions",
    summary: "List characteristic definitions",
    tags: TAG,
    query: CharacteristicsQuery,
  });
  reg({
    method: "post",
    path: "/api/production/characteristics/definitions",
    summary: "Create characteristic definition",
    tags: TAG,
    body: CreateCharacteristicBody,
  });
  reg({
    method: "patch",
    path: "/api/production/characteristics/definitions/{id}",
    summary: "Update characteristic definition",
    tags: TAG,
    params: IdPathParam,
    body: UpdateCharacteristicBody,
  });
  reg({
    method: "delete",
    path: "/api/production/characteristics/definitions/{id}",
    summary: "Delete characteristic definition",
    tags: TAG,
    params: IdPathParam,
  });
  reg({
    method: "get",
    path: "/api/production/bobbin/runs",
    summary: "List bobbin production runs",
    tags: TAG,
    query: ProductionRunsQuery,
  });
  reg({
    method: "post",
    path: "/api/production/bobbin/runs",
    summary: "Start bobbin production run",
    tags: TAG,
    body: CreateBobbinRunBody,
  });
  reg({
    method: "get",
    path: "/api/production/bobbin/runs/{id}",
    summary: "Get bobbin production run",
    tags: TAG,
    params: IdPathParam,
  });
  reg({
    method: "patch",
    path: "/api/production/bobbin/runs/{id}",
    summary: "Update or complete bobbin run",
    tags: TAG,
    params: IdPathParam,
    body: CompleteBobbinRunBody,
    responses: { 200: { description: "Run updated or completed", schema: UpdateBobbinRunBody } },
  });
  reg({
    method: "get",
    path: "/api/production/bobbin/items",
    summary: "Bobbin production inventory items",
    tags: TAG,
    description: "Raw materials and bobbins for bobbin production.",
    response: InventoryItemSchema.array(),
  });
  reg({
    method: "get",
    path: "/api/production/loom/runs",
    summary: "List loom production runs",
    tags: TAG,
    query: ProductionRunsQuery,
  });
  reg({
    method: "post",
    path: "/api/production/loom/runs",
    summary: "Start loom production run",
    tags: TAG,
    body: CreateLoomRunBody,
  });
  reg({
    method: "get",
    path: "/api/production/loom/runs/{id}",
    summary: "Get loom production run",
    tags: TAG,
    params: IdPathParam,
  });
  reg({
    method: "patch",
    path: "/api/production/loom/runs/{id}",
    summary: "Update or complete loom run",
    tags: TAG,
    params: IdPathParam,
    body: CompleteLoomRunBody,
    responses: { 200: { description: "Run updated or completed", schema: UpdateLoomRunBody } },
  });
  reg({
    method: "get",
    path: "/api/production/loom/machines",
    summary: "Loom machine grid status",
    tags: TAG,
    query: LoomMachinesQuery,
  });
  reg({
    method: "get",
    path: "/api/production/loom/items",
    summary: "Loom production inventory items",
    tags: TAG,
    description: "Bobbins, PP rolls, and LPP rolls.",
  });
  reg({
    method: "get",
    path: "/api/production/loom/assignments",
    summary: "List loom operator assignments",
    tags: TAG,
    query: LoomAssignmentsQuery,
  });
  reg({
    method: "post",
    path: "/api/production/loom/assignments",
    summary: "Create loom operator assignment",
    tags: TAG,
    body: CreateLoomAssignmentBody,
  });
  reg({
    method: "get",
    path: "/api/production/lamination/runs",
    summary: "List lamination production runs",
    tags: TAG,
    query: LaminationRunsQuery,
  });
  reg({
    method: "post",
    path: "/api/production/lamination/runs",
    summary: "Start lamination production run",
    tags: TAG,
    body: CreateLaminationRunBody,
  });
  reg({
    method: "get",
    path: "/api/production/lamination/runs/{id}",
    summary: "Get lamination production run",
    tags: TAG,
    params: IdPathParam,
  });
  reg({
    method: "patch",
    path: "/api/production/lamination/runs/{id}",
    summary: "Update or complete lamination run",
    tags: TAG,
    params: IdPathParam,
    body: CompleteLaminationRunBody,
    responses: { 200: { description: "Run updated or completed", schema: UpdateLaminationRunBody } },
  });
  reg({
    method: "get",
    path: "/api/production/lamination/machines",
    summary: "Lamination machine grid status",
    tags: TAG,
    query: LaminationMachinesQuery,
  });
  reg({
    method: "get",
    path: "/api/production/lamination/input-rolls",
    summary: "Available loom rolls for lamination input",
    tags: TAG,
    description: "Unconsumed loom-output rolls eligible for lamination.",
  });
  reg({
    method: "get",
    path: "/api/production/printing/config",
    summary: "Printing manpower configuration",
    tags: TAG,
    description: "Returns required helper count from PRINTING_HELPERS_PER_OPERATOR (default 2).",
  });
  reg({
    method: "get",
    path: "/api/production/printing/runs",
    summary: "List printing production runs",
    tags: TAG,
    query: PrintingRunsQuery,
  });
  reg({
    method: "post",
    path: "/api/production/printing/runs",
    summary: "Start printing production run",
    tags: TAG,
    body: CreatePrintingRunBody,
  });
  reg({
    method: "get",
    path: "/api/production/printing/runs/{id}",
    summary: "Get printing production run",
    tags: TAG,
    params: IdPathParam,
  });
  reg({
    method: "patch",
    path: "/api/production/printing/runs/{id}",
    summary: "Update or complete printing run",
    tags: TAG,
    params: IdPathParam,
    body: CompletePrintingRunBody,
    responses: { 200: { description: "Run updated or completed", schema: UpdatePrintingRunBody } },
  });
  reg({
    method: "get",
    path: "/api/production/printing/machines",
    summary: "Printing machine grid status",
    tags: TAG,
    query: PrintingMachinesQuery,
  });
  reg({
    method: "get",
    path: "/api/production/printing/input-rolls",
    summary: "Available rolls for printing input",
    tags: TAG,
    description: "Unconsumed loom or laminated rolls eligible for printing.",
  });
  reg({
    method: "get",
    path: "/api/production/cutting/runs",
    summary: "List cutting production runs",
    tags: TAG,
    query: CuttingRunsQuery,
  });
  reg({
    method: "post",
    path: "/api/production/cutting/runs",
    summary: "Start cutting production run",
    tags: TAG,
    body: CreateCuttingRunBody,
  });
  reg({
    method: "get",
    path: "/api/production/cutting/runs/{id}",
    summary: "Get cutting production run",
    tags: TAG,
    params: IdPathParam,
  });
  reg({
    method: "patch",
    path: "/api/production/cutting/runs/{id}",
    summary: "Update or complete cutting run",
    tags: TAG,
    params: IdPathParam,
    body: CompleteCuttingRunBody,
    responses: { 200: { description: "Run updated or completed", schema: UpdateCuttingRunBody } },
  });
  reg({
    method: "get",
    path: "/api/production/cutting/machines",
    summary: "Cutting machine grid status",
    tags: TAG,
    query: CuttingMachinesQuery,
  });
  reg({
    method: "get",
    path: "/api/production/cutting/input-rolls",
    summary: "Available printed rolls for cutting input",
    tags: TAG,
  });
  reg({
    method: "get",
    path: "/api/production/cutting/items",
    summary: "Cut material inventory items",
    tags: TAG,
    description: "CUT_MATERIAL stock items for cutting output.",
  });
  reg({
    method: "get",
    path: "/api/production/finishing/active-routes",
    summary: "Active finishing routes for today",
    tags: TAG,
    description: "Finishing routes from approved/in-progress plans — drives production nav visibility.",
  });
  reg({
    method: "get",
    path: "/api/production/finishing/defaults",
    summary: "Finishing route defaults by category",
    tags: TAG,
    description: "Config key FINISHING_ROUTE_DEFAULTS. Optional ?categoryId= for lookup.",
  });
  reg({
    method: "put",
    path: "/api/production/finishing/defaults",
    summary: "Update finishing route defaults by category",
    tags: TAG,
  });
  reg({
    method: "get",
    path: "/api/production/convertex/runs",
    summary: "List convertex production runs",
    tags: TAG,
    query: ConvertexRunsQuery,
  });
  reg({
    method: "post",
    path: "/api/production/convertex/runs",
    summary: "Start convertex production run",
    tags: TAG,
    body: CreateConvertexRunBody,
  });
  reg({
    method: "get",
    path: "/api/production/convertex/runs/{id}",
    summary: "Get convertex production run",
    tags: TAG,
    params: IdPathParam,
  });
  reg({
    method: "patch",
    path: "/api/production/convertex/runs/{id}",
    summary: "Update or complete convertex run",
    tags: TAG,
    params: IdPathParam,
    body: CompleteConvertexRunBody,
    responses: { 200: { description: "Run updated or completed", schema: UpdateConvertexRunBody } },
  });
  reg({
    method: "get",
    path: "/api/production/convertex/machines",
    summary: "Convertex machine grid status",
    tags: TAG,
    query: ConvertexMachinesQuery,
  });
  reg({
    method: "get",
    path: "/api/production/convertex/input-materials",
    summary: "Cut material items for convertex input",
    tags: TAG,
  });
  reg({
    method: "get",
    path: "/api/production/convertex/output-items",
    summary: "Finished bag items for convertex output",
    tags: TAG,
  });
  reg({
    method: "get",
    path: "/api/production/rolls",
    summary: "List production rolls",
    tags: TAG,
    query: ProductionRollsQuery,
    response: ProductionRollSchema.array(),
  });
  reg({
    method: "post",
    path: "/api/production/rolls",
    summary: "Create production roll",
    tags: TAG,
    body: CreateProductionRollBody,
    response: ProductionRollSchema,
  });
  reg({
    method: "get",
    path: "/api/production/rolls/{id}",
    summary: "Get production roll detail",
    tags: TAG,
    params: IdPathParam,
    response: ProductionRollSchema,
  });
  reg({
    method: "patch",
    path: "/api/production/rolls/{id}",
    summary: "Update production roll status and attributes",
    tags: TAG,
    params: IdPathParam,
    body: UpdateProductionRollBody,
    response: ProductionRollSchema,
  });
}
