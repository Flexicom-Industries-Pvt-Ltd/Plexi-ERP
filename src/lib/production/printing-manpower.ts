import { db } from "@/lib/db";

const DEFAULT_PRINTING_HELPERS = 2;

export async function getPrintingHelpersPerOperator(): Promise<number> {
  const config = await db.configParameter.findUnique({
    where: { key: "PRINTING_HELPERS_PER_OPERATOR" },
  });
  if (!config) return DEFAULT_PRINTING_HELPERS;
  const parsed = parseInt(config.value, 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : DEFAULT_PRINTING_HELPERS;
}

export type PrintingHelperValidation = {
  valid: boolean;
  requiredCount: number;
  actualCount: number;
  error?: string;
};

export function validatePrintingHelperCount(
  helperUserIds: string[],
  operatorId: string,
  requiredCount: number,
): PrintingHelperValidation {
  const uniqueHelpers = [...new Set(helperUserIds.filter(Boolean))];
  const actualCount = uniqueHelpers.length;

  if (uniqueHelpers.includes(operatorId)) {
    return {
      valid: false,
      requiredCount,
      actualCount,
      error: "Operator cannot also be listed as a helper",
    };
  }

  if (actualCount !== requiredCount) {
    return {
      valid: false,
      requiredCount,
      actualCount,
      error: `Printing requires exactly ${requiredCount} helper(s); received ${actualCount}`,
    };
  }

  return { valid: true, requiredCount, actualCount };
}
