import { reg } from "../helpers";
import {
  CreateInventoryItemBody,
  GateReceiptCommitBody,
  IdPathParam,
  InventoryBatchesQuery,
  InventoryItemSchema,
  InventoryListQuery,
  InventoryTransactionsQuery,
  StockAdjustBody,
  SuccessSchema,
  UpdateInventoryItemBody,
} from "../schemas";

const TAG = ["Inventory"];

export function registerInventoryRoutes() {
  reg({
    method: "get",
    path: "/api/inventory/items",
    summary: "List inventory items",
    tags: TAG,
    description: "Search and filter catalog items. Set includeMovement=true to attach recent transaction counts.",
    query: InventoryListQuery,
    response: InventoryItemSchema.array(),
  });
  reg({
    method: "post",
    path: "/api/inventory/items",
    summary: "Create inventory item",
    tags: TAG,
    body: CreateInventoryItemBody,
    response: InventoryItemSchema,
  });
  reg({
    method: "get",
    path: "/api/inventory/items/{id}",
    summary: "Get inventory item",
    tags: TAG,
    params: IdPathParam,
    response: InventoryItemSchema,
  });
  reg({
    method: "patch",
    path: "/api/inventory/items/{id}",
    summary: "Update inventory item",
    tags: TAG,
    params: IdPathParam,
    body: UpdateInventoryItemBody,
    response: InventoryItemSchema,
  });
  reg({
    method: "delete",
    path: "/api/inventory/items/{id}",
    summary: "Deactivate inventory item",
    tags: TAG,
    params: IdPathParam,
    response: SuccessSchema,
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
    query: InventoryBatchesQuery,
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
    query: InventoryTransactionsQuery,
  });
  reg({
    method: "post",
    path: "/api/inventory/transactions/adjust",
    summary: "Manual stock adjustment",
    tags: TAG,
    description: "Posts an ADJUSTMENT transaction and updates current stock.",
    body: StockAdjustBody,
    response: SuccessSchema,
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
    body: GateReceiptCommitBody,
    response: SuccessSchema,
  });
}
