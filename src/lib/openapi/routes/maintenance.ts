import { reg } from "../helpers";
import {
  IdPathParam,
  CreateMaintenanceLogBody,
  UpdateMaintenanceLogBody,
  MaintenanceLogQuery,
} from "../schemas";

const MAINTENANCE = ["Maintenance & Service"];

export function registerMaintenanceRoutes() {
  reg({
    method: "get",
    path: "/api/maintenance/logs",
    summary: "List machine maintenance & service logs",
    description: "Retrieve paginated list of machine breakdown and preventative service tickets with severity, technician assignments, and downtime metrics.",
    tags: MAINTENANCE,
    query: MaintenanceLogQuery,
  });

  reg({
    method: "post",
    path: "/api/maintenance/logs",
    summary: "Report machine breakdown or schedule service",
    description: "Create a new maintenance log ticket and automatically mark machine status to MAINTENANCE if breakdown.",
    tags: MAINTENANCE,
    body: CreateMaintenanceLogBody,
  });

  reg({
    method: "get",
    path: "/api/maintenance/logs/{id}",
    summary: "Get maintenance ticket details",
    description: "Retrieve maintenance ticket with machine details, assigned technician, downtime minutes, and corrective actions.",
    tags: MAINTENANCE,
    params: IdPathParam,
  });

  reg({
    method: "patch",
    path: "/api/maintenance/logs/{id}",
    summary: "Update or resolve maintenance ticket",
    description: "Update status, record repair actions, downtime, and parts replaced. Automatically restores machine status to ACTIVE when resolved.",
    tags: MAINTENANCE,
    params: IdPathParam,
    body: UpdateMaintenanceLogBody,
  });

  reg({
    method: "get",
    path: "/api/maintenance/stats",
    summary: "Get machine downtime and maintenance statistics",
    description: "Compute plant-wide maintenance KPIs, total downtime minutes today/month, open tickets, and machine breakdown breakdown.",
    tags: MAINTENANCE,
  });
}
