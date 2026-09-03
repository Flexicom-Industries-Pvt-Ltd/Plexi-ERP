import { db } from "@/lib/db";
import type { Prisma } from "@/generated/prisma";

/** Generate unique bale number: BL-YYYYMMDD-001 */
export async function generateBaleNumber(
  tx: Prisma.TransactionClient | typeof db = db,
): Promise<string> {
  const today = new Date();
  const datePart = `${today.getFullYear()}${(today.getMonth() + 1).toString().padStart(2, "0")}${today.getDate().toString().padStart(2, "0")}`;
  const prefix = `BL-${datePart}`;

  const lastBale = await tx.bale.findFirst({
    where: { baleNumber: { startsWith: prefix } },
    orderBy: { baleNumber: "desc" },
  });

  let sequence = 1;
  if (lastBale) {
    const lastSeq = parseInt(lastBale.baleNumber.split("-").pop() || "0", 10);
    sequence = lastSeq + 1;
  }

  return `${prefix}-${sequence.toString().padStart(3, "0")}`;
}
