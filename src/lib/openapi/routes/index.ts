import { registerGateRoutes } from "./gate";
import { registerInventoryRoutes } from "./inventory";
import { registerProductionRoutes } from "./production";
import { registerSettingsRoutes } from "./settings";
import { registerProfileRoutes } from "./profile";
import { registerLogsRoutes } from "./logs";
import { registerSystemRoutes } from "./system";

let loaded = false;

export function loadAllRouteRegistrations() {
  if (loaded) return;
  loaded = true;

  registerGateRoutes();
  registerInventoryRoutes();
  registerProductionRoutes();
  registerSettingsRoutes();
  registerProfileRoutes();
  registerLogsRoutes();
  registerSystemRoutes();
}
