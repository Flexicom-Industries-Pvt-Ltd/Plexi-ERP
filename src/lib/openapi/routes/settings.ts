import { reg } from "../helpers";

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
    description: "Query param: q (name search).",
  });
  reg({
    method: "get",
    path: "/api/drivers/search",
    summary: "Search drivers",
    tags: DATA_CENTRE,
    description: "Query param: q (name or phone).",
  });
  reg({
    method: "get",
    path: "/api/settings/master-data/{model}",
    summary: "List master data records",
    tags: SETTINGS,
    description: "Model key from masterDataConfig (e.g. department, shift, machine, stock).",
  });
  reg({
    method: "post",
    path: "/api/settings/master-data/{model}",
    summary: "Create master data record",
    tags: SETTINGS,
  });
  reg({
    method: "patch",
    path: "/api/settings/master-data/{model}/{id}",
    summary: "Update master data record",
    tags: SETTINGS,
  });
  reg({
    method: "delete",
    path: "/api/settings/master-data/{model}/{id}",
    summary: "Delete master data record",
    tags: SETTINGS,
  });
}
