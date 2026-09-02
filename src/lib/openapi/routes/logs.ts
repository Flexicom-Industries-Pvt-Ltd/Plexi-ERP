import { reg } from "../helpers";
import { LogsExportQuery, LogsQuery } from "../schemas";

const TAG = ["Logs & Audit"];

export function registerLogsRoutes() {
  reg({
    method: "get",
    path: "/api/logs",
    summary: "Query audit logs",
    tags: TAG,
    description: "Paginated log viewer with stats and filter options.",
    query: LogsQuery,
  });
  reg({
    method: "get",
    path: "/api/logs/export",
    summary: "Export audit logs",
    tags: TAG,
    description: "Export filtered logs as CSV.",
    query: LogsExportQuery,
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
  });
}
