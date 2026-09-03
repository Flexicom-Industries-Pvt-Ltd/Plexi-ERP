import { z } from "zod";
import { db } from "@/lib/db";

const CONFIG_KEY = "BCS_PRODUCTION_RULES";

export const BcsProductionRulesSchema = z.object({
  minTeamMembers: z.number().int().min(0).default(0),
  maxTeamMembers: z.number().int().min(0).default(6),
  requireRollInput: z.boolean().default(false),
  requireYarnInput: z.boolean().default(false),
});

export type BcsProductionRules = z.infer<typeof BcsProductionRulesSchema>;

export const DEFAULT_BCS_PRODUCTION_RULES: BcsProductionRules = {
  minTeamMembers: 0,
  maxTeamMembers: 6,
  requireRollInput: false,
  requireYarnInput: false,
};

export async function getBcsProductionRules(): Promise<BcsProductionRules> {
  const config = await db.configParameter.findUnique({ where: { key: CONFIG_KEY } });
  if (!config?.value) return DEFAULT_BCS_PRODUCTION_RULES;
  try {
    const parsed = JSON.parse(config.value);
    const result = BcsProductionRulesSchema.safeParse(parsed);
    return result.success ? result.data : DEFAULT_BCS_PRODUCTION_RULES;
  } catch {
    return DEFAULT_BCS_PRODUCTION_RULES;
  }
}

export async function setBcsProductionRules(rules: BcsProductionRules, updatedBy?: string) {
  const existing = await db.configParameter.findUnique({ where: { key: CONFIG_KEY } });
  const value = JSON.stringify(rules);
  if (existing) {
    return db.configParameter.update({
      where: { key: CONFIG_KEY },
      data: { value, updatedBy },
    });
  }
  return db.configParameter.create({
    data: {
      key: CONFIG_KEY,
      value,
      description: "BCS production rules — team size limits and required input flags",
      updatedBy,
    },
  });
}

export function validateBcsTeamMembers(
  teamMemberIds: string[],
  operatorId: string,
  rules: BcsProductionRules,
): string | null {
  const unique = [...new Set(teamMemberIds.filter(Boolean))];
  if (unique.includes(operatorId)) {
    return "Operator cannot also be listed as a team member";
  }
  if (unique.length < rules.minTeamMembers) {
    return `BCS requires at least ${rules.minTeamMembers} team member(s)`;
  }
  if (unique.length > rules.maxTeamMembers) {
    return `BCS allows at most ${rules.maxTeamMembers} team member(s)`;
  }
  return null;
}

export function validateBcsRulesAgainstInputs(
  inputs: {
    inputRollId?: string | null;
    rollQty: number;
    yarnItemId?: string | null;
    yarnQty: number;
  },
  rules: BcsProductionRules,
): string | null {
  if (rules.requireRollInput && (!inputs.inputRollId || inputs.rollQty <= 0)) {
    return "BCS rules require a roll input with quantity";
  }
  if (rules.requireYarnInput && (!inputs.yarnItemId || inputs.yarnQty <= 0)) {
    return "BCS rules require a yarn input with quantity";
  }
  return null;
}
