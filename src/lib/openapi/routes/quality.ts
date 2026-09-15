import { reg } from "../helpers";
import {
  IdPathParam,
  CreateQcInspectionBody,
  RecordQcDecisionBody,
  QcInspectionQuery,
  QcTargetQuery,
  QcQueueQuery,
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
}
