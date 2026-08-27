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
}

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
    title: "Units of Measurement (UOM)",
    description: "Manage measurement units for inventory.",
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
  },
  category: {
    modelName: "category",
    title: "Item Categories",
    description: "Manage high-level material and product categories.",
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
  }
};
