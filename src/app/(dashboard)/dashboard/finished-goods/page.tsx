import { Metadata } from "next";
import { FinishedGoodsClient } from "./finished-goods-client";

export const metadata: Metadata = {
  title: "Finished Goods Inventory | Plexi-ERP",
  description: "Finished goods stock management, bale promotion, and end-to-end multi-tier traceability",
};

export default function FinishedGoodsPage() {
  return <FinishedGoodsClient />;
}
