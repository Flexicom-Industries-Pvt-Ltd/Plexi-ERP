import { z } from "zod";

export const ValvomaticInputsSchema = z.object({
  inputRollId: z.string().nullable().optional(),
  rollQty: z.number().min(0).default(0),
  yarnItemId: z.string().nullable().optional(),
  yarnQty: z.number().min(0).default(0),
  ppItemId: z.string().nullable().optional(),
  ppQty: z.number().min(0).default(0),
  lppItemId: z.string().nullable().optional(),
  lppQty: z.number().min(0).default(0),
});

export type ValvomaticInputs = z.infer<typeof ValvomaticInputsSchema>;

export function validateValvomaticInputs(inputs: ValvomaticInputs): string | null {
  const hasRoll = Boolean(inputs.inputRollId) && inputs.rollQty > 0;
  const hasYarn = Boolean(inputs.yarnItemId) && inputs.yarnQty > 0;
  const hasPp = Boolean(inputs.ppItemId) && inputs.ppQty > 0;
  const hasLpp = Boolean(inputs.lppItemId) && inputs.lppQty > 0;

  if (!hasRoll && !hasYarn && !hasPp && !hasLpp) {
    return "At least one input (roll, yarn, PP, or LPP) with quantity is required";
  }
  return null;
}

export function summarizeValvomaticInputs(inputs: ValvomaticInputs): string {
  const parts: string[] = [];
  if (inputs.inputRollId && inputs.rollQty > 0) parts.push(`roll ${inputs.rollQty}`);
  if (inputs.yarnItemId && inputs.yarnQty > 0) parts.push(`yarn ${inputs.yarnQty}`);
  if (inputs.ppItemId && inputs.ppQty > 0) parts.push(`PP ${inputs.ppQty}`);
  if (inputs.lppItemId && inputs.lppQty > 0) parts.push(`LPP ${inputs.lppQty}`);
  return parts.join(", ") || "no inputs";
}
