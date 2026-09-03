import { db } from "@/lib/db";
import type { PlanWithLines } from "./plan-include";
import { isFinishingPhase, finishingRouteForPhase } from "./finishing-routes";

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

  const hasFinishingLine = plan.lines.some((line) => isFinishingPhase(line.phase));

  for (const [index, line] of plan.lines.entries()) {
    const lineNum = index + 1;

    if (!line.phase) {
      errors.push(`Line ${lineNum}: phase is required`);
    }

    if (!line.targetQty || line.targetQty <= 0) {
      errors.push(`Line ${lineNum}: target quantity must be greater than zero`);
    }

    if (isFinishingPhase(line.phase)) {
      if (!line.finishingRoute) {
        errors.push(`Line ${lineNum}: finishing route is required for ${line.phase} phase`);
      } else if (line.finishingRoute !== finishingRouteForPhase(line.phase)) {
        errors.push(
          `Line ${lineNum}: finishing route "${line.finishingRoute}" does not match phase "${line.phase}"`,
        );
      }
    } else if (line.finishingRoute) {
      errors.push(`Line ${lineNum}: finishing route is only valid for Convertex, Valvomatic, BCS, or Manual Stitch phases`);
    }

    const phaseRequired = requiredDefs.filter((d) => d.phase === line.phase);
    for (const def of phaseRequired) {
      const value = line.characteristics.find((c) => c.definitionId === def.id);
      if (!value?.value?.trim()) {
        errors.push(`Line ${lineNum}: required characteristic "${def.label}" is missing`);
      }
    }
  }

  if (hasFinishingLine && !plan.lines.some((line) => line.finishingRoute)) {
    errors.push("Finishing route must be specified on at least one finishing plan line");
  }

  return { valid: errors.length === 0, errors };
}
