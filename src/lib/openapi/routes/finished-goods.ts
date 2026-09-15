import { reg } from "../helpers";
import {
  IdPathParam,
  ReceiveFinishedGoodsBody,
  UpdateFinishedGoodsLotBody,
  FinishedGoodsLotQuery,
  BalesQueueQuery,
} from "../schemas";

const FG = ["Finished Goods"];

export function registerFinishedGoodsRoutes() {
  reg({
    method: "get",
    path: "/api/finished-goods",
    summary: "List finished goods stock lots",
    description: "Retrieve paginated list of Finished Goods inventory lots with filters by item, batch, location, quality status, and warehouse status.",
    tags: FG,
    query: FinishedGoodsLotQuery,
  });

  reg({
    method: "post",
    path: "/api/finished-goods/receive",
    summary: "Receive finished goods / Promote passed bales",
    description: "Promote passed QC bales to Finished Goods sellable stock or perform direct manual stock intake. Automatically creates inventory IN transaction and updates current stock.",
    tags: FG,
    body: ReceiveFinishedGoodsBody,
  });

  reg({
    method: "get",
    path: "/api/finished-goods/bales-queue",
    summary: "List passed bales ready for FG intake",
    description: "Retrieve pending queue of quality-passed bales ready for one-click promotion into sellable finished goods inventory.",
    tags: FG,
    query: BalesQueueQuery,
  });

  reg({
    method: "get",
    path: "/api/finished-goods/stats",
    summary: "Get finished goods inventory statistics",
    description: "Compute plant-wide finished goods stock KPIs including total available bags, allocated stock, dispatched bags, and quality health breakdown.",
    tags: FG,
  });

  reg({
    method: "get",
    path: "/api/finished-goods/{id}",
    summary: "Get finished goods lot details",
    description: "Retrieve single finished goods lot with linked inventory item, source bale, location, and dispatch allocation history.",
    tags: FG,
    params: IdPathParam,
  });

  reg({
    method: "patch",
    path: "/api/finished-goods/{id}",
    summary: "Update finished goods lot",
    description: "Update lot location, warehouse status (AVAILABLE/ALLOCATED/ON_HOLD), weights, or notes.",
    tags: FG,
    params: IdPathParam,
    body: UpdateFinishedGoodsLotBody,
  });

  reg({
    method: "get",
    path: "/api/finished-goods/{id}/traceability",
    summary: "Get end-to-end FG lot traceability tree",
    description: "Retrieve multi-tier provenance graph tracing the FG lot back to source bale, QC inspection, production runs, production plan, rolls, and raw material intake.",
    tags: FG,
    params: IdPathParam,
  });
}
