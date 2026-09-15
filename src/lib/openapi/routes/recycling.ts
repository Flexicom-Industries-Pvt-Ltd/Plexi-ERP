import { reg } from "../helpers";
import {
  IdPathParam,
  CreateRecyclingBatchBody,
  CompleteRecyclingBatchBody,
  RecyclingBatchQuery,
} from "../schemas";

const RECYCLING = ["Recycling Plant"];

export function registerRecyclingRoutes() {
  reg({
    method: "get",
    path: "/api/recycling/batches",
    summary: "List recycling batches & metrics",
    description: "Retrieve paginated list of recycling plant batches with input scrap weights, output RP granule yields, and conversion metrics.",
    tags: RECYCLING,
    query: RecyclingBatchQuery,
  });

  reg({
    method: "post",
    path: "/api/recycling/batches",
    summary: "Create new recycling batch",
    description: "Start a recycling batch by consuming available un-recycled scrap records and calculating total input weight.",
    tags: RECYCLING,
    body: CreateRecyclingBatchBody,
  });

  reg({
    method: "get",
    path: "/api/recycling/batches/{id}",
    summary: "Get recycling batch details",
    description: "Retrieve recycling batch details including linked scrap records, operator, and inventory movement transaction.",
    tags: RECYCLING,
    params: IdPathParam,
  });

  reg({
    method: "post",
    path: "/api/recycling/batches/{id}/complete",
    summary: "Complete recycling batch and deposit RP granules into inventory",
    description: "Finalize recycling processing, compute waste loss, record output RP granule weight, and post inventory IN movement.",
    tags: RECYCLING,
    params: IdPathParam,
    body: CompleteRecyclingBatchBody,
  });

  reg({
    method: "get",
    path: "/api/recycling/available-scrap",
    summary: "List available un-recycled scrap records",
    description: "Retrieve all unconsumed scrap records ready for batching in the recycling plant.",
    tags: RECYCLING,
  });

  reg({
    method: "get",
    path: "/api/recycling/stats",
    summary: "Get recycling plant performance & yield statistics",
    description: "Compute aggregate recycling metrics, conversion yield efficiency %, and breakdown by granule grade.",
    tags: RECYCLING,
  });
}
