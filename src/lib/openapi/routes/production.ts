import { reg } from "../helpers";
import {
  ApprovePlanBody,
  CharacteristicsQuery,
  CompleteBobbinRunBody,
  CompleteLoomRunBody,
  CompleteRunBody,
  CreateBobbinRunBody,
  CreateCharacteristicBody,
  CreateHandoverBody,
  CreateLoomAssignmentBody,
  CreateLoomRunBody,
  CreatePlanBody,
  CreateRunBody,
  CreateProductionRollBody,
  HandoversQuery,
  IdPathParam,
  InventoryItemSchema,
  LoomAssignmentsQuery,
  LoomMachinesQuery,
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
