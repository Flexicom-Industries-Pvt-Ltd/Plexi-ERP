import { reg } from "../helpers";
import {
  DriverSearchQuery,
  ModelIdPathParam,
  ModelPathParam,
  StockSearchQuery,
} from "../schemas";

const DATA_CENTRE = ["Data Centre"];
const SETTINGS = ["Settings"];

export function registerSettingsRoutes() {
  reg({
    method: "get",
    path: "/api/stocks",
    summary: "List active stocks catalog",
    tags: DATA_CENTRE,
  });
  reg({
    method: "get",
    path: "/api/stocks/search",
    summary: "Search stocks catalog",
    tags: DATA_CENTRE,
    query: StockSearchQuery,
  });
  reg({
    method: "get",
    path: "/api/drivers/search",
    summary: "Search drivers",
    tags: DATA_CENTRE,
    query: DriverSearchQuery,
  });
  reg({
    method: "get",
    path: "/api/settings/master-data/{model}",
    summary: "List master data records",
    tags: SETTINGS,
    params: ModelPathParam,
  });
  reg({
    method: "post",
    path: "/api/settings/master-data/{model}",
    summary: "Create master data record",
    tags: SETTINGS,
    params: ModelPathParam,
  });
  reg({
    method: "patch",
    path: "/api/settings/master-data/{model}/{id}",
    summary: "Update master data record",
    tags: SETTINGS,
    params: ModelIdPathParam,
  });
  reg({
    method: "delete",
    path: "/api/settings/master-data/{model}/{id}",
    summary: "Delete master data record",
    tags: SETTINGS,
    params: ModelIdPathParam,
  });
}
