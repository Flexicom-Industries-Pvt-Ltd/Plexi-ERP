import { Metadata } from "next";
import { LoomMachineMappingClient } from "./loom-machine-mapping-client";

export const metadata: Metadata = {
  title: "Loom Machine Mapping | Data Centre | Plexi-ERP",
  description: "Manage quality to loom machine number allocations and specifications.",
};

export default function LoomMachineMappingPage() {
  return <LoomMachineMappingClient />;
}
