import { reg } from "../helpers";

const TAG = ["Production"];

export function registerProductionRoutes() {
  reg({
    method: "get",
    path: "/api/production/dashboard",
    summary: "Production dashboard KPIs",
    tags: TAG,
    description: "Today target/actual/achievement, phase/shift/machine breakdowns, delayed plans.",
  });
  reg({
    method: "get",
    path: "/api/production/plans",
    summary: "List production plans",
    tags: TAG,
    description: "Filter by status, shiftId, phase, dateFrom, dateTo.",
  });
  reg({
    method: "post",
    path: "/api/production/plans",
    summary: "Create production plan",
    tags: TAG,
  });
  reg({
    method: "get",
    path: "/api/production/plans/{id}",
    summary: "Get production plan",
    tags: TAG,
    description: "By ID or plan number.",
  });
  reg({
    method: "put",
    path: "/api/production/plans/{id}",
    summary: "Update production plan",
    tags: TAG,
    description: "Draft plans only.",
    responses: { 409: { description: "Plan is not editable" } },
  });
  reg({
    method: "patch",
    path: "/api/production/plans/{id}",
    summary: "Approve or cancel production plan",
    tags: TAG,
    description: "Status transitions: approve, cancel.",
    responses: { 409: { description: "Invalid status transition" } },
  });
  reg({
    method: "delete",
    path: "/api/production/plans/{id}",
    summary: "Delete draft production plan",
    tags: TAG,
    responses: { 409: { description: "Only draft plans can be deleted" } },
  });
  reg({
    method: "post",
    path: "/api/production/plans/{id}/duplicate",
    summary: "Duplicate production plan",
    tags: TAG,
  });
  reg({
    method: "get",
    path: "/api/production/runs",
    summary: "List production runs",
    tags: TAG,
    description: "Filter by planId, status, shiftId.",
  });
  reg({
    method: "post",
    path: "/api/production/runs",
    summary: "Start production run",
    tags: TAG,
  });
  reg({
    method: "get",
    path: "/api/production/runs/{id}",
    summary: "Get production run",
    tags: TAG,
  });
  reg({
    method: "patch",
    path: "/api/production/runs/{id}",
    summary: "Update or complete production run",
    tags: TAG,
  });
  reg({
    method: "get",
    path: "/api/production/operators",
    summary: "List operators for plan assignment",
    tags: TAG,
    description: "Active users available for production plan line assignment.",
  });
  reg({
    method: "get",
    path: "/api/production/handovers",
    summary: "List shift handovers",
    tags: TAG,
    description: "Filter by shiftId and handoverDate.",
  });
  reg({
    method: "post",
    path: "/api/production/handovers",
    summary: "Create shift handover",
    tags: TAG,
  });
  reg({
    method: "get",
    path: "/api/production/characteristics/definitions",
    summary: "List characteristic definitions",
    tags: TAG,
    description: "Filter by phase (BOBBIN, LOOM, etc.).",
  });
  reg({
    method: "post",
    path: "/api/production/characteristics/definitions",
    summary: "Create characteristic definition",
    tags: TAG,
  });
  reg({
    method: "patch",
    path: "/api/production/characteristics/definitions/{id}",
    summary: "Update characteristic definition",
    tags: TAG,
  });
  reg({
    method: "delete",
    path: "/api/production/characteristics/definitions/{id}",
    summary: "Delete characteristic definition",
    tags: TAG,
  });
  reg({
    method: "get",
    path: "/api/production/bobbin/runs",
    summary: "List bobbin production runs",
    tags: TAG,
  });
  reg({
    method: "post",
    path: "/api/production/bobbin/runs",
    summary: "Start bobbin production run",
    tags: TAG,
  });
  reg({
    method: "get",
    path: "/api/production/bobbin/runs/{id}",
    summary: "Get bobbin production run",
    tags: TAG,
  });
  reg({
    method: "patch",
    path: "/api/production/bobbin/runs/{id}",
    summary: "Update or complete bobbin run",
    tags: TAG,
  });
  reg({
    method: "get",
    path: "/api/production/bobbin/items",
    summary: "Bobbin production inventory items",
    tags: TAG,
    description: "Raw materials and bobbins for bobbin production.",
  });
  reg({
    method: "get",
    path: "/api/production/loom/runs",
    summary: "List loom production runs",
    tags: TAG,
  });
  reg({
    method: "post",
    path: "/api/production/loom/runs",
    summary: "Start loom production run",
    tags: TAG,
  });
  reg({
    method: "get",
    path: "/api/production/loom/runs/{id}",
    summary: "Get loom production run",
    tags: TAG,
  });
  reg({
    method: "patch",
    path: "/api/production/loom/runs/{id}",
    summary: "Update or complete loom run",
    tags: TAG,
  });
  reg({
    method: "get",
    path: "/api/production/loom/machines",
    summary: "Loom machine grid status",
    tags: TAG,
    description: "Machine status and assigned operators for a given date/shift.",
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
  });
  reg({
    method: "post",
    path: "/api/production/loom/assignments",
    summary: "Create loom operator assignment",
    tags: TAG,
    description: "Assign operator to looms with manpower limit validation.",
  });
}
