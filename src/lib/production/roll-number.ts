import { db } from "@/lib/db";
import type { Prisma, RollType } from "@/generated/prisma";

/** Generate unique roll number: PR-PP-YYYYMMDD-001 or PR-LPP-YYYYMMDD-001 */
export async function generateRollNumber(
  rollType: RollType,
  tx: Prisma.TransactionClient | typeof db = db,
): Promise<string> {
  const today = new Date();
  const datePart = `${today.getFullYear()}${(today.getMonth() + 1).toString().padStart(2, "0")}${today.getDate().toString().padStart(2, "0")}`;
  const prefix = `PR-${rollType}-${datePart}`;

  const lastRoll = await tx.productionRoll.findFirst({
    where: { rollNumber: { startsWith: prefix } },
    orderBy: { rollNumber: "desc" },
  });

  let sequence = 1;
  if (lastRoll) {
    const lastSeq = parseInt(lastRoll.rollNumber.split("-").pop() || "0", 10);
    sequence = lastSeq + 1;
  }

  return `${prefix}-${sequence.toString().padStart(3, "0")}`;
}
