import { db } from "@/lib/db";

/** Generate a unique plan number: PP-YYYYMMDD-001 */
export async function generatePlanNumber(): Promise<string> {
  const today = new Date();
  const datePrefix = `PP-${today.getFullYear()}${(today.getMonth() + 1).toString().padStart(2, "0")}${today.getDate().toString().padStart(2, "0")}`;

  const lastPlan = await db.productionPlan.findFirst({
    where: { planNumber: { startsWith: datePrefix } },
    orderBy: { planNumber: "desc" },
  });

  let sequence = 1;
  if (lastPlan) {
    const lastSeq = parseInt(lastPlan.planNumber.split("-").pop() || "0", 10);
    sequence = lastSeq + 1;
  }

  return `${datePrefix}-${sequence.toString().padStart(3, "0")}`;
}
