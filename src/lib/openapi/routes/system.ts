import { reg } from "../helpers";

const AUTH = ["Authentication"];
const SYSTEM = ["System"];

export function registerSystemRoutes() {
  reg({
    method: "get",
    path: "/api/auth/{nextauth}",
    summary: "NextAuth session handlers",
    tags: AUTH,
    description: "NextAuth.js catch-all route for sign-in, sign-out, session, and CSRF.",
    security: false,
  });
  reg({
    method: "post",
    path: "/api/auth/{nextauth}",
    summary: "NextAuth sign-in / callback",
    tags: AUTH,
    description: "Handles credential sign-in and OAuth callbacks.",
    security: false,
  });
  reg({
    method: "get",
    path: "/api/health",
    summary: "Health check",
    tags: SYSTEM,
    description: "Database connectivity and service status.",
    security: false,
  });
  reg({
    method: "get",
    path: "/api/swagger",
    summary: "OpenAPI specification",
    tags: SYSTEM,
    description: "Returns the generated OpenAPI 3.0 JSON document.",
  });
  reg({
    method: "get",
    path: "/api/cron/prune-logs",
    summary: "Prune old log entries",
    tags: SYSTEM,
    description: "Cron job endpoint to delete aged log entries. Requires CRON_SECRET header.",
    security: false,
  });
}
