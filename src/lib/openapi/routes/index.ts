import { registerGateRoutes } from "./gate";
import { registerInventoryRoutes } from "./inventory";
import { registerProductionRoutes } from "./production";
import { registerSettingsRoutes } from "./settings";
import { registerProfileRoutes } from "./profile";
import { registerLogsRoutes } from "./logs";
import { registerSystemRoutes } from "./system";
import { registerIdentityRoutes } from "./identity";
import { registerQualityRoutes } from "./quality";

let loaded = false;

export function loadAllRouteRegistrations() {
  if (loaded) return;
  loaded = true;

  registerIdentityRoutes();
  registerGateRoutes();
  registerInventoryRoutes();
  registerProductionRoutes();
  registerQualityRoutes();
  registerSettingsRoutes();
  registerProfileRoutes();
  registerLogsRoutes();
  registerSystemRoutes();
}


