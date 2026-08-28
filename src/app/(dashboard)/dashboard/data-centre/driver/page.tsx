import { masterDataConfig } from "@/lib/config/master-data";
import { DynamicMasterTable } from "@/components/settings/DynamicMasterTable";

export const metadata = {
  title: "Drivers | Data Centre",
};

export default function DriversPage() {
  const driverConfig = masterDataConfig.driver;

  if (!driverConfig) {
    return <div>Configuration for Drivers not found.</div>;
  }

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Data Centre</h2>
      </div>
      
      <div className="bg-white rounded-xl shadow-sm border border-slate-200">
        <DynamicMasterTable modelConfig={driverConfig} />
      </div>
    </div>
  );
}
