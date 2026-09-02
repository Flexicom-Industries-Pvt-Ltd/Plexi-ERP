import { reg } from "../helpers";

const TAG = ["Logs & Audit"];

export function registerLogsRoutes() {
  reg({
    method: "get",
    path: "/api/logs",
    summary: "Query audit logs",
    tags: TAG,
    description:
      "Paginated log viewer. Filters: page, limit, module, severity, action, search, from, to, httpMethod, statusCode, userId, sortBy, sortOrder.",
  });
  reg({
    method: "get",
    path: "/api/logs/export",
    summary: "Export audit logs",
    tags: TAG,
    description: "Export filtered logs as CSV. Same filter params as /api/logs.",
  });
  reg({
    method: "get",
    path: "/api/logs/stream",
    summary: "Stream live audit logs",
    tags: TAG,
    description: "Server-sent events stream of new log entries.",
  });
  reg({
    method: "get",
    path: "/api/telemetry",
    summary: "Client telemetry ingest status",
    tags: TAG,
    description: "Telemetry endpoint health check.",
  });
}
