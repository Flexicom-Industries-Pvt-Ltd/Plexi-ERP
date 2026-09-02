import { db } from "@/lib/db";

const DEFAULT_LOOMS_PER_OPERATOR = 4;

export async function getLoomsPerOperatorLimit(): Promise<number> {
  const config = await db.configParameter.findUnique({
    where: { key: "LOOMS_PER_OPERATOR" },
  });
  if (!config) return DEFAULT_LOOMS_PER_OPERATOR;
  const parsed = parseInt(config.value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_LOOMS_PER_OPERATOR;
}

export type LoomAssignmentValidation = {
  valid: boolean;
  limit: number;
  assignedCount: number;
  warnings: string[];
};

export function validateLoomAssignmentCount(
  machineIds: string[],
  limit: number,
): LoomAssignmentValidation {
  const warnings: string[] = [];
  const assignedCount = machineIds.length;

  if (assignedCount > limit) {
    warnings.push(
      `Operator assigned to ${assignedCount} looms exceeds the configured limit of ${limit}.`,
    );
  }

  return {
    valid: warnings.length === 0,
    limit,
    assignedCount,
    warnings,
  };
}
