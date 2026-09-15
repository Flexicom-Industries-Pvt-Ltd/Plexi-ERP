import { reg } from "../helpers";
import {
  IdPathParam,
  CreateQcInspectionBody,
  RecordQcDecisionBody,
  QcInspectionQuery,
  QcTargetQuery,
  QcQueueQuery,
  CreateQcReworkTicketBody,
  UpdateQcReworkTicketBody,
  QcReworkTicketQuery,
  CreateScrapRecordBody,
  ScrapRecordQuery,
} from "../schemas";

const QUALITY = ["Quality Control"];

export function registerQualityRoutes() {
  reg({
    method: "get",
    path: "/api/quality/queue",
    summary: "Get inspection queue & QC statistics",
    description: "Retrieve pending production rolls, bales, and runs requiring quality inspection alongside today's QC performance KPIs.",
    tags: QUALITY,
    query: QcQueueQuery,
  });

  reg({
    method: "get",
    path: "/api/quality/inspections",
    summary: "List QC inspections history",
    description: "Retrieve paginated inspection queue with inspector and characteristic line evaluations.",
    tags: QUALITY,
    query: QcInspectionQuery,
  });

  reg({
    method: "post",
    path: "/api/quality/inspections",
    summary: "Create a new QC inspection record",
    description: "Initialize an inspection for a production roll, bale, or run with assigned inspector and initial parameters.",
    tags: QUALITY,
    body: CreateQcInspectionBody,
  });

  reg({
    method: "get",
    path: "/api/quality/inspections/{id}",
    summary: "Get QC inspection details by ID",
    description: "Retrieve inspection verdict, parameter lines, and resolved production target metadata.",
    tags: QUALITY,
    params: IdPathParam,
  });

  reg({
    method: "patch",
    path: "/api/quality/inspections/{id}",
    summary: "Record QC decision (Pass / Fail / Rework / On Hold)",
    description: "Finalizes inspection verdict, logs transaction, and automatically synchronizes linked qualityStatus on target roll/bale.",
    tags: QUALITY,
    params: IdPathParam,
    body: RecordQcDecisionBody,
  });

  reg({
    method: "get",
    path: "/api/quality/target",
    summary: "Resolve QC target entity details",
    description: "Fetch real-time details of a roll, bale, or production run undergoing quality inspection.",
    tags: QUALITY,
    query: QcTargetQuery,
  });

  reg({
    method: "get",
    path: "/api/quality/rework",
    summary: "List QC rework tickets",
    description: "Retrieve paginated list of active and completed rework tickets with assigned operators and phase routing.",
    tags: QUALITY,
    query: QcReworkTicketQuery,
  });

  reg({
    method: "post",
    path: "/api/quality/rework",
    summary: "Create a new rework ticket",
    description: "Initialize a rework ticket for non-conforming roll or bale stock and route to target production phase.",
    tags: QUALITY,
    body: CreateQcReworkTicketBody,
  });

  reg({
    method: "get",
    path: "/api/quality/rework/{id}",
    summary: "Get rework ticket details",
    description: "Retrieve rework ticket with assigned operator, instructions, and source production item metadata.",
    tags: QUALITY,
    params: IdPathParam,
  });

  reg({
    method: "patch",
    path: "/api/quality/rework/{id}",
    summary: "Update rework ticket status or complete rework",
    description: "Assign operator, record corrective actions, or complete rework ticket which automatically re-queues item for QC inspection.",
    tags: QUALITY,
    params: IdPathParam,
    body: UpdateQcReworkTicketBody,
  });

  reg({
    method: "get",
    path: "/api/quality/scrap",
    summary: "List scrap and waste records",
    description: "Retrieve paginated log of scrap generation across production phases with root causes, weights, and analytics breakdown.",
    tags: QUALITY,
    query: ScrapRecordQuery,
  });

  reg({
    method: "post",
    path: "/api/quality/scrap",
    summary: "Record scrap generation & deduct inventory",
    description: "Record production scrap waste with cause classification, optional inventory item deduction, and automatic roll/bale failure status sync.",
    tags: QUALITY,
    body: CreateScrapRecordBody,
  });

  reg({
    method: "get",
    path: "/api/quality/scrap/{id}",
    summary: "Get scrap record details",
    description: "Retrieve scrap record with linked inventory transaction and operator details.",
    tags: QUALITY,
    params: IdPathParam,
  });
}


