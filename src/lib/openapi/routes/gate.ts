import { reg } from "../helpers";
import {
  CreateGateDocumentBody,
  CreateGateEntryBody,
  CreateGateStockBody,
  GateEntrySchema,
  GateListQuery,
  GateStatsSchema,
  IdPathParam,
  DocIdPathParam,
  SuccessSchema,
  UpdateGateDocumentBody,
  UpdateGateEntryBody,
} from "../schemas";

const TAG = ["Gate"];

export function registerGateRoutes() {
  reg({
    method: "get",
    path: "/api/gate",
    summary: "List gate entries",
    tags: TAG,
    description: "Returns gate entries ordered by arrival time (newest first).",
    query: GateListQuery,
    response: GateEntrySchema.array(),
  });
  reg({
    method: "post",
    path: "/api/gate",
    summary: "Create gate entry",
    tags: TAG,
    description: "Registers truck arrival. Auto-generates entry number and upserts driver to Data Centre.",
    body: CreateGateEntryBody,
    response: GateEntrySchema,
  });
  reg({
    method: "get",
    path: "/api/gate/stats",
    summary: "Gate security KPIs",
    tags: TAG,
    description: "Real-time counts for inside, waiting, loading, unloading, verification pending, on-hold, and gate-out today.",
    response: GateStatsSchema,
  });
  reg({
    method: "get",
    path: "/api/gate/{id}",
    summary: "Get gate entry details",
    tags: TAG,
    description: "Accepts entry ID or entry number. Includes stock lines, documents, and creator.",
    params: IdPathParam,
    response: GateEntrySchema,
  });
  reg({
    method: "patch",
    path: "/api/gate/{id}",
    summary: "Update gate entry",
    tags: TAG,
    description: "Update status, parking, timestamps. Gate-out validates documents and stock before exit.",
    params: IdPathParam,
    body: UpdateGateEntryBody,
    response: GateEntrySchema,
  });
  reg({
    method: "delete",
    path: "/api/gate/{id}",
    summary: "Delete gate entry",
    tags: TAG,
    description: "Only allowed before journey is completed or gate-out.",
    params: IdPathParam,
    response: SuccessSchema,
  });
  reg({
    method: "post",
    path: "/api/gate/{id}/documents",
    summary: "Upload gate document",
    tags: TAG,
    params: IdPathParam,
    body: CreateGateDocumentBody,
  });
  reg({
    method: "patch",
    path: "/api/gate/{id}/documents/{docId}",
    summary: "Verify or reject gate document",
    tags: TAG,
    params: DocIdPathParam,
    body: UpdateGateDocumentBody,
  });
  reg({
    method: "post",
    path: "/api/gate/{id}/stock",
    summary: "Add stock line to gate entry",
    tags: TAG,
    description: "Adds truck stock detail and auto-upserts Data Centre stock catalog when needed.",
    params: IdPathParam,
    body: CreateGateStockBody,
  });
}
