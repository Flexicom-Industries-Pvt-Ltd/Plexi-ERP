export type FieldType = "text" | "number" | "boolean" | "select" | "time";

export interface FieldConfig {
  key: string;
  label: string;
  type: FieldType;
  required?: boolean;
  options?: { label: string; value: string }[];
  relationEndpoint?: string; // e.g. "department" to fetch dropdown options dynamically
  hiddenInTable?: boolean;
}

export interface ModelConfig {
  modelName: string; // Exact Prisma model name in camelCase (e.g., "department")
  title: string;
  description: string;
  fields: FieldConfig[];
  requiredModule?: string;
  /** Modules whose canRead may list this model (defaults to requiredModule or SETTINGS). */
  readModules?: string[];
}

/** Models shown under Settings → General Settings (org/factory only). */
export const ORGANIZATION_MODEL_NAMES = new Set([
  "department",
  "section",
  "location",
  "machine",
  "shift",
  "configParameter",
]);

export const masterDataConfig: Record<string, ModelConfig> = {
  department: {
    modelName: "department",
    title: "Departments",
    description: "Manage organizational departments.",
    fields: [
      { key: "name", label: "Name", type: "text", required: true },
      { key: "code", label: "Code", type: "text", required: true },
      { key: "description", label: "Description", type: "text" },
      { key: "isActive", label: "Active", type: "boolean", required: true },
    ],
  },
  section: {
    modelName: "section",
    title: "Sections",
    description: "Manage sub-sections within departments.",
    fields: [
      { key: "departmentId", label: "Department", type: "select", required: true, relationEndpoint: "department" },
      { key: "name", label: "Name", type: "text", required: true },
      { key: "code", label: "Code", type: "text", required: true },
      { key: "description", label: "Description", type: "text" },
      { key: "isActive", label: "Active", type: "boolean", required: true },
    ],
  },
  location: {
    modelName: "location",
    title: "Locations",
    description: "Manage physical factory and warehouse locations.",
    fields: [
      { key: "name", label: "Name", type: "text", required: true },
      { key: "code", label: "Code", type: "text", required: true },
      { key: "type", label: "Type", type: "select", required: true, options: [
        { label: "Gate", value: "GATE" },
        { label: "Warehouse", value: "WAREHOUSE" },
        { label: "Production Floor", value: "PRODUCTION_FLOOR" },
        { label: "Scrap Yard", value: "SCRAP_YARD" },
        { label: "Office", value: "OFFICE" },
      ]},
      { key: "description", label: "Description", type: "text" },
      { key: "isActive", label: "Active", type: "boolean", required: true },
    ],
  },
  machine: {
    modelName: "machine",
    title: "Machines",
    description: "Manage production machines and equipment.",
    fields: [
      { key: "sectionId", label: "Section", type: "select", required: true, relationEndpoint: "section" },
      { key: "name", label: "Name", type: "text", required: true },
      { key: "serialNumber", label: "Serial Number", type: "text" },
      { key: "make", label: "Make", type: "text", hiddenInTable: true },
      { key: "model", label: "Model", type: "text", hiddenInTable: true },
      { key: "status", label: "Status", type: "select", required: true, options: [
        { label: "Active", value: "ACTIVE" },
        { label: "Maintenance", value: "MAINTENANCE" },
        { label: "Inactive", value: "INACTIVE" },
      ]},
      { key: "isActive", label: "Active", type: "boolean", required: true },
    ],
  },
  shift: {
    modelName: "shift",
    title: "Shifts",
    description: "Manage factory work shifts.",
    fields: [
      { key: "name", label: "Name", type: "text", required: true },
      { key: "startTime", label: "Start Time", type: "time", required: true },
      { key: "endTime", label: "End Time", type: "time", required: true },
      { key: "isActive", label: "Active", type: "boolean", required: true },
    ],
  },
  unitOfMeasurement: {
    modelName: "unitOfMeasurement",
    title: "Units",
    description: "Manage measurement units for materials and inventory.",
    requiredModule: "DATA_CENTRE",
    readModules: ["DATA_CENTRE", "INVENTORY"],
    fields: [
      { key: "name", label: "Name", type: "text", required: true },
      { key: "abbreviation", label: "Abbreviation", type: "text", required: true },
      { key: "type", label: "Type", type: "select", required: true, options: [
        { label: "Weight", value: "WEIGHT" },
        { label: "Length", value: "LENGTH" },
        { label: "Quantity", value: "QUANTITY" },
        { label: "Volume", value: "VOLUME" },
      ]},
      { key: "isActive", label: "Active", type: "boolean", required: true },
    ],
    readModules: ["SETTINGS", "DATA_CENTRE"],
  },
  category: {
    modelName: "category",
    title: "Item Categories",
    description: "Manage high-level material and product categories.",
    requiredModule: "DATA_CENTRE",
    readModules: ["DATA_CENTRE", "INVENTORY"],
    fields: [
      { key: "name", label: "Name", type: "text", required: true },
      { key: "itemType", label: "Item Type", type: "select", required: true, options: [
        { label: "Raw Material", value: "RAW_MATERIAL" },
        { label: "Finished Good", value: "FINISHED_GOOD" },
        { label: "Semi-Finished Good", value: "SEMI_FINISHED_GOOD" },
        { label: "Scrap", value: "SCRAP" },
      ]},
      { key: "description", label: "Description", type: "text" },
      { key: "isActive", label: "Active", type: "boolean", required: true },
    ],
  },
  configParameter: {
    modelName: "configParameter",
    title: "System Parameters",
    description: "Global business rules and configuration values.",
    fields: [
      { key: "key", label: "Key", type: "text", required: true },
      { key: "value", label: "Value", type: "text", required: true },
      { key: "description", label: "Description", type: "text" },
      { key: "isSystem", label: "System Level", type: "boolean", required: true },
    ],
  },
  driver: {
    modelName: "driver",
    title: "Drivers",
    description: "Manage registered transport drivers and their contact details.",
    requiredModule: "DATA_CENTRE",
    fields: [
      { key: "name", label: "Name", type: "text", required: true },
      { key: "phone", label: "Contact Number", type: "text", required: true },
      { key: "licenseNumber", label: "License Number", type: "text" },
      { key: "isActive", label: "Active", type: "boolean", required: true },
    ],
  },
  stock: {
    modelName: "stock",
    title: "Stocks",
    description: "Reusable material catalog for gate stock lines (name, type, unit).",
    requiredModule: "DATA_CENTRE",
    fields: [
      { key: "code", label: "Code", type: "text", required: true },
      { key: "name", label: "Material / Stock Name", type: "text", required: true },
      { key: "materialType", label: "Material Type", type: "select", required: true, options: [
        { label: "Raw materials", value: "RAW_MATERIALS" },
        { label: "Bobbins", value: "BOBBINS" },
        { label: "PP rolls", value: "PP_ROLLS" },
        { label: "LPP rolls", value: "LPP_ROLLS" },
        { label: "Laminated rolls", value: "LAMINATED_ROLLS" },
        { label: "Printed rolls", value: "PRINTED_ROLLS" },
        { label: "Cut material", value: "CUT_MATERIAL" },
        { label: "Work-in-progress", value: "WORK_IN_PROGRESS" },
        { label: "Finished bags", value: "FINISHED_BAGS" },
        { label: "Bales", value: "BALES" },
        { label: "Scrap", value: "SCRAP" },
        { label: "RP granules", value: "RP_GRANULES" },
        { label: "External materials", value: "EXTERNAL_MATERIALS" },
      ]},
      { key: "uomId", label: "Unit", type: "select", required: true, relationEndpoint: "unitOfMeasurement" },
      { key: "description", label: "Description", type: "text" },
      { key: "isActive", label: "Active", type: "boolean", required: true },
    ],
  }
};
