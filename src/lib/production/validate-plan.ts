import { db } from "@/lib/db";
import type { PlanWithLines } from "./plan-include";

export interface PlanValidationResult {
  valid: boolean;
  errors: string[];
}

export async function validatePlanForApproval(plan: PlanWithLines): Promise<PlanValidationResult> {
  const errors: string[] = [];

  if (!plan.shiftId) {
    errors.push("Shift is required before approval");
  }

  if (!plan.lines.length) {
    errors.push("Plan must have at least one line");
  }

  const requiredDefs = await db.productionCharacteristicDefinition.findMany({
    where: { isActive: true, required: true },
  });

  for (const [index, line] of plan.lines.entries()) {
    const lineNum = index + 1;

    if (!line.phase) {
      errors.push(`Line ${lineNum}: phase is required`);
    }

    if (!line.targetQty || line.targetQty <= 0) {
      errors.push(`Line ${lineNum}: target quantity must be greater than zero`);
    }

    const phaseRequired = requiredDefs.filter((d) => d.phase === line.phase);
    for (const def of phaseRequired) {
      const value = line.characteristics.find((c) => c.definitionId === def.id);
      if (!value?.value?.trim()) {
        errors.push(`Line ${lineNum}: required characteristic "${def.label}" is missing`);
      }
    }
  }

  return { valid: errors.length === 0, errors };
}
