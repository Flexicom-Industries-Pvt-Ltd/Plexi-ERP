import { masterDataConfig } from "@/lib/config/master-data";
import { DynamicMasterTable } from "@/components/settings/DynamicMasterTable";

export const metadata = {
  title: "Sub Categories | Data Centre",
};

export default function SubCategoriesPage() {
  const config = masterDataConfig.subCategory;

  if (!config) {
    return <div>Configuration for Sub Categories not found.</div>;
  }

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Data Centre</h2>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200">
        <DynamicMasterTable modelConfig={config} />
      </div>
    </div>
  );
}
