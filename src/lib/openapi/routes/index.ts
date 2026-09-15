import { registerGateRoutes } from "./gate";
import { registerInventoryRoutes } from "./inventory";
import { registerProductionRoutes } from "./production";
import { registerSettingsRoutes } from "./settings";
import { registerProfileRoutes } from "./profile";
import { registerLogsRoutes } from "./logs";
import { registerSystemRoutes } from "./system";
import { registerIdentityRoutes } from "./identity";
import { registerQualityRoutes } from "./quality";
import { registerRecyclingRoutes } from "./recycling";
import { registerMaintenanceRoutes } from "./maintenance";
import { registerFinishedGoodsRoutes } from "./finished-goods";
import { registerDispatchRoutes } from "./dispatch";

let loaded = false;

export function loadAllRouteRegistrations() {
  if (loaded) return;
  loaded = true;

  registerIdentityRoutes();
  registerGateRoutes();
  registerInventoryRoutes();
  registerFinishedGoodsRoutes();
  registerDispatchRoutes();
  registerProductionRoutes();
  registerQualityRoutes();
  registerRecyclingRoutes();
  registerMaintenanceRoutes();
  registerSettingsRoutes();
  registerProfileRoutes();
  registerLogsRoutes();
  registerSystemRoutes();
}






