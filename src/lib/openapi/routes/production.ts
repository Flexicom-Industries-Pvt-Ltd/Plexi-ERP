import { reg } from "../helpers";
import {
  CharacteristicsQuery,
  CreateCharacteristicBody,
  IdPathParam,
  ManpowerRulesBody,
  SuccessSchema,
  UpdateCharacteristicBody,
} from "../schemas";

const PRODUCTION = ["Production - Tape Plant"];
const DATA_CENTRE = ["Data Centre"];

export function registerProductionRoutes() {
  // Characteristics Definitions
  reg({
    method: "get",
    path: "/api/production/characteristics/definitions",
    summary: "List production characteristic definitions",
    tags: DATA_CENTRE,
    query: CharacteristicsQuery,
  });
  reg({
    method: "post",
    path: "/api/production/characteristics/definitions",
    summary: "Create production characteristic definition",
    tags: DATA_CENTRE,
    body: CreateCharacteristicBody,
  });
  reg({
    method: "put",
    path: "/api/production/characteristics/definitions/{id}",
    summary: "Update production characteristic definition",
    tags: DATA_CENTRE,
    params: IdPathParam,
    body: UpdateCharacteristicBody,
  });
  reg({
    method: "delete",
    path: "/api/production/characteristics/definitions/{id}",
    summary: "Delete production characteristic definition",
    tags: DATA_CENTRE,
    params: IdPathParam,
    response: SuccessSchema,
  });

  // Manpower Rules
  reg({
    method: "get",
    path: "/api/production/manpower-rules",
    summary: "Get manpower planning rules",
    tags: DATA_CENTRE,
  });
  reg({
    method: "put",
    path: "/api/production/manpower-rules",
    summary: "Update manpower planning rules",
    tags: DATA_CENTRE,
    body: ManpowerRulesBody,
  });

  // Tape Plant - Planning
  reg({
    method: "get",
    path: "/api/production/tape-plant/planning",
    summary: "Get Tape Plant production plans by date and shift",
    tags: PRODUCTION,
  });
  reg({
    method: "post",
    path: "/api/production/tape-plant/planning",
    summary: "Save Tape Plant production planning data",
    tags: PRODUCTION,
  });

  // Tape Plant - Process Temperature
  reg({
    method: "get",
    path: "/api/production/tape-plant/temperature",
    summary: "Get process temperature logs",
    tags: PRODUCTION,
  });
  reg({
    method: "post",
    path: "/api/production/tape-plant/temperature",
    summary: "Record process temperature entry",
    tags: PRODUCTION,
  });

  // Tape Plant - Drive Parameters
  reg({
    method: "get",
    path: "/api/production/tape-plant/drive-parameters",
    summary: "Get process drive parameters",
    tags: PRODUCTION,
  });
  reg({
    method: "post",
    path: "/api/production/tape-plant/drive-parameters",
    summary: "Record process drive parameters entry",
    tags: PRODUCTION,
  });

  // Tape Plant - Raw Material
  reg({
    method: "get",
    path: "/api/production/tape-plant/raw-material",
    summary: "Get raw material consumption entries",
    tags: PRODUCTION,
  });
  reg({
    method: "post",
    path: "/api/production/tape-plant/raw-material",
    summary: "Record raw material consumption entry",
    tags: PRODUCTION,
  });

  // Tape Plant - Post Production Entry
  reg({
    method: "get",
    path: "/api/production/tape-plant/post-production",
    summary: "Get post production roll and scrap entries",
    tags: PRODUCTION,
  });
  reg({
    method: "post",
    path: "/api/production/tape-plant/post-production",
    summary: "Record post production roll entry and quality classification",
    tags: PRODUCTION,
  });

  // Tape Plant - Reports
  reg({
    method: "get",
    path: "/api/production/tape-plant/reports",
    summary: "Get Tape Plant shift & aggregated production reports",
    tags: PRODUCTION,
  });
}
