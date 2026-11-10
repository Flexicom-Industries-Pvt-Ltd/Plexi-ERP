import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default function InventoryRootPage() {
  redirect("/dashboard/inventory/items");
}

