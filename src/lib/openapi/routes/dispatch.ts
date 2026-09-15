import { reg } from "../helpers";
import {
  IdPathParam,
  CreateDispatchOrderBody,
  UpdateDispatchOrderBody,
  PickDispatchOrderBody,
  LoadDispatchOrderBody,
  DispatchOrderQuery,
} from "../schemas";

const DISPATCH = ["Dispatch & Logistics"];

export function registerDispatchRoutes() {
  reg({
    method: "get",
    path: "/api/dispatch/orders",
    summary: "List dispatch orders",
    description: "Retrieve paginated list of dispatch orders with customer details, order lines, allocated stock, and fulfillment status.",
    tags: DISPATCH,
    query: DispatchOrderQuery,
  });

  reg({
    method: "post",
    path: "/api/dispatch/orders",
    summary: "Create new dispatch order",
    description: "Create a new commercial dispatch order with customer details, delivery address, transporter info, and ordered bag lines.",
    tags: DISPATCH,
    body: CreateDispatchOrderBody,
  });

  reg({
    method: "get",
    path: "/api/dispatch/orders/{id}",
    summary: "Get dispatch order details",
    description: "Retrieve single dispatch order with complete line items, picked Finished Goods lot allocations, loading status, and truck gate entry details.",
    tags: DISPATCH,
    params: IdPathParam,
  });

  reg({
    method: "patch",
    path: "/api/dispatch/orders/{id}",
    summary: "Update dispatch order",
    description: "Update customer details, vehicle number, driver contact, transporter, or order notes.",
    tags: DISPATCH,
    params: IdPathParam,
    body: UpdateDispatchOrderBody,
  });

  reg({
    method: "post",
    path: "/api/dispatch/orders/{id}/pick",
    summary: "Pick and allocate FG stock lots",
    description: "Allocate specific Finished Goods stock lots to order lines and reserve inventory for dispatch picking.",
    tags: DISPATCH,
    params: IdPathParam,
    body: PickDispatchOrderBody,
  });

  reg({
    method: "post",
    path: "/api/dispatch/orders/{id}/load",
    summary: "Confirm loading and execute dispatch",
    description: "Confirm vehicle loading, post inventory OUT ledger transactions to deduct stock, and mark order as DISPATCHED.",
    tags: DISPATCH,
    params: IdPathParam,
    body: LoadDispatchOrderBody,
  });

  reg({
    method: "get",
    path: "/api/dispatch/stats",
    summary: "Get dispatch performance statistics",
    description: "Retrieve plant-wide dispatch KPIs including total orders, pending picking, dispatched bag volumes today, and recent shipments.",
    tags: DISPATCH,
  });
}
