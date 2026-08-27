"use client";

import { useState } from "react";
import { masterDataConfig, ModelConfig } from "@/lib/config/master-data";
import { DynamicMasterTable } from "@/components/settings/DynamicMasterTable";
import { 
  Building2, 
  MapPin, 
  Settings2, 
  Clock, 
  Scale, 
  Tags,
  LayoutDashboard
} from "lucide-react";

const iconMap: Record<string, any> = {
  department: Building2,
  section: LayoutDashboard,
  location: MapPin,
  machine: Settings2,
  shift: Clock,
  unitOfMeasurement: Scale,
  category: Tags,
  configParameter: Settings2,
};

export function OrganizationClient() {
  const models = Object.values(masterDataConfig);
  const [activeModel, setActiveModel] = useState<ModelConfig>(models[0]);

  return (
    <div className="flex flex-col md:flex-row gap-6 h-full">
      {/* Sidebar Navigation for Settings */}
      <div className="w-full md:w-64 shrink-0 flex flex-col gap-1">
        <h3 className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Master Data</h3>
        {models.map((model) => {
          const Icon = iconMap[model.modelName] || Settings2;
          const isActive = activeModel.modelName === model.modelName;
          
          return (
            <button
              key={model.modelName}
              onClick={() => setActiveModel(model)}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                isActive 
                  ? "bg-primary text-white shadow-md shadow-primary/20" 
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              <Icon className={`h-5 w-5 ${isActive ? "text-white" : "text-slate-400"}`} />
              <div className="flex flex-col items-start">
                <span>{model.title}</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 min-w-0">
        <DynamicMasterTable key={activeModel.modelName} modelConfig={activeModel} />
      </div>
    </div>
  );
}
