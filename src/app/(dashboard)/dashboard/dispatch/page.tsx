import { Metadata } from "next";
import { DispatchClient } from "./dispatch-client";

export const metadata: Metadata = {
  title: "Commercial Dispatch & Logistics | Plexi-ERP",
  description: "Dispatch orders, Finished Goods picking, truck loading, and inventory OUT execution",
};

export default function DispatchPage() {
  return <DispatchClient />;
}
