import { reg } from "../helpers";

const TAG = ["Inventory"];

export function registerInventoryRoutes() {
  reg({
    method: "get",
    path: "/api/inventory/items",
    summary: "List inventory items",
    tags: TAG,
    description: "Search and filter catalog items by type, category, location, and active status.",
  });
  reg({
    method: "post",
    path: "/api/inventory/items",
    summary: "Create inventory item",
    tags: TAG,
    description: "Creates a new master data inventory item.",
  });
  reg({
    method: "get",
    path: "/api/inventory/items/{id}",
    summary: "Get inventory item",
    tags: TAG,
  });
  reg({
    method: "patch",
    path: "/api/inventory/items/{id}",
    summary: "Update inventory item",
    tags: TAG,
  });
  reg({
    method: "delete",
    path: "/api/inventory/items/{id}",
    summary: "Deactivate inventory item",
    tags: TAG,
  });
  reg({
    method: "get",
    path: "/api/inventory/dashboard",
    summary: "Inventory dashboard KPIs",
    tags: TAG,
    description: "Total items, low stock alerts, recent transactions, pending gate receipts.",
  });
  reg({
    method: "get",
    path: "/api/inventory/batches",
    summary: "List inventory batches",
    tags: TAG,
    description: "Filter by itemId and locationId.",
  });
  reg({
    method: "get",
    path: "/api/inventory/by-location",
    summary: "Stock grouped by location",
    tags: TAG,
  });
  reg({
    method: "get",
    path: "/api/inventory/transactions",
    summary: "List inventory transactions",
    tags: TAG,
    description: "Filter by itemId, type, date range, and pagination.",
  });
  reg({
    method: "post",
    path: "/api/inventory/transactions/adjust",
    summary: "Manual stock adjustment",
    tags: TAG,
    description: "Post an inventory adjustment transaction with reason.",
  });
  reg({
    method: "get",
    path: "/api/inventory/gate-receipts",
    summary: "List pending gate receipts",
    tags: TAG,
    description: "Gate stock lines awaiting inventory commit.",
  });
  reg({
    method: "post",
    path: "/api/inventory/gate-receipts/commit",
    summary: "Commit gate receipt to inventory",
    tags: TAG,
    description: "Posts gate stock into inventory ledger.",
  });
}
