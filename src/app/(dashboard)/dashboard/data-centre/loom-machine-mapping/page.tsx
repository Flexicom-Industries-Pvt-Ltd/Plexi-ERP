import { redirect } from "next/navigation";

// BUG-019: Consolidated authoritatively into Circular Loom Summary
export default function LoomMachineMappingPage() {
  redirect("/dashboard/production/loom?tab=summary");
}
