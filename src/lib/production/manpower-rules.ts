import { z } from "zod";
import { db } from "@/lib/db";

export const ManpowerRulesSchema = z.object({
  loomsPerOperator: z.number().int().min(1).max(20).default(4),
  printingHelpersPerOperator: z.number().int().min(0).max(10).default(2),
});

export type ManpowerRules = z.infer<typeof ManpowerRulesSchema>;

export const DEFAULT_MANPOWER_RULES: ManpowerRules = {
  loomsPerOperator: 4,
  printingHelpersPerOperator: 2,
};

export const LOOMS_KEY = "LOOMS_PER_OPERATOR";
export const PRINTING_KEY = "PRINTING_HELPERS_PER_OPERATOR";

export async function getManpowerRules(): Promise<ManpowerRules> {
  const [loomsConfig, printingConfig] = await Promise.all([
    db.configParameter.findUnique({ where: { key: LOOMS_KEY } }),
    db.configParameter.findUnique({ where: { key: PRINTING_KEY } }),
  ]);

  const loomsParsed = loomsConfig ? parseInt(loomsConfig.value, 10) : NaN;
  const printingParsed = printingConfig ? parseInt(printingConfig.value, 10) : NaN;

  return {
    loomsPerOperator:
      Number.isFinite(loomsParsed) && loomsParsed > 0
        ? loomsParsed
        : DEFAULT_MANPOWER_RULES.loomsPerOperator,
    printingHelpersPerOperator:
      Number.isFinite(printingParsed) && printingParsed >= 0
        ? printingParsed
        : DEFAULT_MANPOWER_RULES.printingHelpersPerOperator,
  };
}

async function upsertConfigKey(
  key: string,
  value: string,
  description: string,
  updatedBy?: string,
) {
  const existing = await db.configParameter.findUnique({ where: { key } });
  if (existing) {
    return db.configParameter.update({
      where: { key },
      data: { value, description, updatedBy },
    });
  }
  return db.configParameter.create({
    data: { key, value, description, isSystem: true, updatedBy },
  });
}

export async function setManpowerRules(rules: ManpowerRules, updatedBy?: string) {
  await Promise.all([
    upsertConfigKey(
      LOOMS_KEY,
      String(rules.loomsPerOperator),
      "Maximum looms assignable per operator per shift",
      updatedBy,
    ),
    upsertConfigKey(
      PRINTING_KEY,
      String(rules.printingHelpersPerOperator),
      "Required helper count per printing machine operator",
      updatedBy,
    ),
  ]);
  return rules;
}

export type ManpowerAssignmentOptions = {
  machineIds?: string[];
  helperUserIds?: string[];
};

export type ManpowerValidationResult = {
  valid: boolean;
  phase: "LOOM" | "PRINTING";
  warnings: string[];
  error?: string;
  limit?: number;
  assignedCount?: number;
  requiredCount?: number;
  actualCount?: number;
};

function validateLoomAssignmentCount(
  machineIds: string[],
  limit: number,
): Pick<ManpowerValidationResult, "valid" | "warnings" | "limit" | "assignedCount" | "error"> {
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
    error: warnings[0],
  };
}

function validatePrintingHelperCount(
  helperUserIds: string[],
  operatorId: string,
  requiredCount: number,
): Pick<ManpowerValidationResult, "valid" | "warnings" | "requiredCount" | "actualCount" | "error"> {
  const uniqueHelpers = [...new Set(helperUserIds.filter(Boolean))];
  const actualCount = uniqueHelpers.length;

  if (uniqueHelpers.includes(operatorId)) {
    return {
      valid: false,
      requiredCount,
      actualCount,
      warnings: ["Operator cannot also be listed as a helper"],
      error: "Operator cannot also be listed as a helper",
    };
  }

  if (actualCount !== requiredCount) {
    const error = `Printing requires exactly ${requiredCount} helper(s); received ${actualCount}`;
    return {
      valid: false,
      requiredCount,
      actualCount,
      warnings: [error],
      error,
    };
  }

  return { valid: true, requiredCount, actualCount, warnings: [] };
}

/** Central manpower validation for loom assignments and printing helper selection. */
export async function validateManpowerAssignment(
  phase: "LOOM" | "PRINTING",
  operatorId: string,
  options: ManpowerAssignmentOptions = {},
): Promise<ManpowerValidationResult> {
  const rules = await getManpowerRules();

  if (phase === "LOOM") {
    const result = validateLoomAssignmentCount(options.machineIds ?? [], rules.loomsPerOperator);
    return { phase, ...result };
  }

  const result = validatePrintingHelperCount(
    options.helperUserIds ?? [],
    operatorId,
    rules.printingHelpersPerOperator,
  );
  return { phase, ...result };
}

export async function getLoomsPerOperatorLimit(): Promise<number> {
  const rules = await getManpowerRules();
  return rules.loomsPerOperator;
}

export async function getPrintingHelpersPerOperator(): Promise<number> {
  const rules = await getManpowerRules();
  return rules.printingHelpersPerOperator;
}
