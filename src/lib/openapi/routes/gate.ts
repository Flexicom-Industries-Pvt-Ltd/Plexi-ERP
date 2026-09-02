import { reg } from "../helpers";

const TAG = ["Gate"];

export function registerGateRoutes() {
  reg({
    method: "get",
    path: "/api/gate",
    summary: "List gate entries",
    tags: TAG,
    description: "Filter by status, purpose, truckNumber query params.",
  });
  reg({
    method: "post",
    path: "/api/gate",
    summary: "Create gate entry",
    tags: TAG,
    description: "Registers truck arrival with driver and purpose details.",
  });
  reg({
    method: "get",
    path: "/api/gate/stats",
    summary: "Gate security KPIs",
    tags: TAG,
    description: "Returns inside, waiting, loading, unloading, verification pending, on-hold, and gate-out-today counts.",
  });
  reg({
    method: "get",
    path: "/api/gate/{id}",
    summary: "Get gate entry details",
    tags: TAG,
    description: "Accepts entry ID or entry number. Includes stock lines and documents.",
  });
  reg({
    method: "patch",
    path: "/api/gate/{id}",
    summary: "Update gate entry",
    tags: TAG,
    description: "Update status, parking, timestamps, and other entry fields.",
  });
  reg({
    method: "delete",
    path: "/api/gate/{id}",
    summary: "Delete gate entry",
    tags: TAG,
    description: "Only allowed for entries that have not progressed past initial states.",
  });
  reg({
    method: "post",
    path: "/api/gate/{id}/documents",
    summary: "Upload gate document",
    tags: TAG,
    description: "Attach a document (type, fileUrl, remarks) to a gate entry.",
  });
  reg({
    method: "patch",
    path: "/api/gate/{id}/documents/{docId}",
    summary: "Verify or reject gate document",
    tags: TAG,
    description: "Update document verification status.",
  });
  reg({
    method: "post",
    path: "/api/gate/{id}/stock",
    summary: "Add stock line to gate entry",
    tags: TAG,
    description: "Add truck stock detail; auto-upserts Data Centre stock catalog when needed.",
  });
}
