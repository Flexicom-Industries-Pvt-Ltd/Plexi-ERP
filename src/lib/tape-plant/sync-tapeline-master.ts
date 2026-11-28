import type { PrismaClient } from "@/generated/prisma";
import { TAPELINE_MASTER_RECIPES } from "./tapeline-master-data";

export interface SyncTapelineMasterResult {
  seededCount: number;
  retiredRecipesCount: number;
  retiredMappingsCount: number;
}

/**
 * Idempotently syncs the canonical 27 Tapeline Master recipes (dual WITH RP / WITHOUT RP)
 * into `TapePlantRecipe` and `LoomMachineMapping`, preserving physical tape specs while
 * safely retiring unmatched legacy/sample records from active dropdowns.
 */
export async function syncTapelineMasterRecipes(
  db: PrismaClient
): Promise<SyncTapelineMasterResult> {
  const canonicalCodes = TAPELINE_MASTER_RECIPES.map((r) => r.code);
  let seededCount = 0;

  for (const r of TAPELINE_MASTER_RECIPES) {
    const existing = await db.tapePlantRecipe.findUnique({
      where: { code: r.code },
    });

    const w = r.withRpComposition;
    const preservedSpecs = {
      denier: existing?.denier ?? r.denier,
      tapeWidth: existing?.tapeWidth ?? r.tapeWidth,
      strength: existing?.strength ?? r.strength,
      eloPercent: existing?.eloPercent ?? r.eloPercent,
      bobbinMarking: existing?.bobbinMarking ?? r.bobbinMarking,
      spacerSize: existing?.spacerSize ?? r.spacerSize,
      defaultQtyKg: existing?.defaultQtyKg ?? r.defaultQtyKg,
      colorGroup: existing?.colorGroup ?? r.colorGroup,
      omega: existing?.omega ?? null,
      vistamaxPercent: existing?.vistamaxPercent ?? null,
    };

    const upserted = await db.tapePlantRecipe.upsert({
      where: { code: r.code },
      update: {
        vendor: r.vendor,
        tapeType: r.tapeType,
        rpMode: "WITH_RP",
        colour: r.colour,
        permissibleFabAsh: r.permissibleFabAsh,
        permissibleTapeAsh: r.permissibleTapeAsh,
        requiredAsh: r.permissibleTapeAsh,
        ashPercent: w.actualAshPercent ?? null,
        ppPercent: w.ppPercent,
        ccPercent: w.ccPercent,
        ldpePercent: w.ldpePercent,
        mbPercent: w.mbPercent,
        rp1Percent: w.rp1Percent,
        rp2Percent: w.rp2Percent,
        hdrpPercent: w.hdrpPercent,
        tptPercent: w.tptPercent,
        tptFillerPercent: w.tptFillerPercent ?? 0,
        totalPercent: w.totalPercent ?? 100,
        withRpComposition: w as any,
        withoutRpComposition: r.withoutRpComposition as any,
        recipeGroup: r.recipeGroup,
        remarks: existing?.remarks || r.remarks,
        isActive: true,
        ...preservedSpecs,
      },
      create: {
        code: r.code,
        vendor: r.vendor,
        tapeType: r.tapeType,
        rpMode: "WITH_RP",
        colour: r.colour,
        permissibleFabAsh: r.permissibleFabAsh,
        permissibleTapeAsh: r.permissibleTapeAsh,
        requiredAsh: r.permissibleTapeAsh,
        ashPercent: w.actualAshPercent ?? null,
        ppPercent: w.ppPercent,
        ccPercent: w.ccPercent,
        ldpePercent: w.ldpePercent,
        mbPercent: w.mbPercent,
        rp1Percent: w.rp1Percent,
        rp2Percent: w.rp2Percent,
        hdrpPercent: w.hdrpPercent,
        tptPercent: w.tptPercent,
        tptFillerPercent: w.tptFillerPercent ?? 0,
        totalPercent: w.totalPercent ?? 100,
        withRpComposition: w as any,
        withoutRpComposition: r.withoutRpComposition as any,
        recipeGroup: r.recipeGroup,
        remarks: r.remarks,
        isActive: true,
        ...preservedSpecs,
      },
    });

    await db.loomMachineMapping.upsert({
      where: { qualityCode: upserted.code },
      update: {
        tapePlantRecipeId: upserted.id,
        colorGroup: upserted.colorGroup,
        colour: upserted.colour,
        denier: upserted.denier,
        tapeWidth: upserted.tapeWidth,
        bobbinMarking: upserted.bobbinMarking,
        isActive: true,
      },
      create: {
        qualityCode: upserted.code,
        tapePlantRecipeId: upserted.id,
        colorGroup: upserted.colorGroup,
        colour: upserted.colour,
        denier: upserted.denier,
        tapeWidth: upserted.tapeWidth,
        bobbinMarking: upserted.bobbinMarking,
        loomNumbers: [],
        totalLooms: 0,
        remarks: upserted.remarks,
        isActive: true,
      },
    });

    seededCount++;
  }

  // Safely deactivate unmatched legacy/sample recipes so active dropdowns show only canonical recipes
  const retiredRecipes = await db.tapePlantRecipe.updateMany({
    where: {
      code: { notIn: canonicalCodes },
      isActive: true,
    },
    data: { isActive: false },
  });

  // Deactivate empty legacy loom mappings linked to retired codes while preserving any live loom allocations
  const retiredMappings = await db.loomMachineMapping.updateMany({
    where: {
      qualityCode: { notIn: canonicalCodes },
      totalLooms: 0,
      isActive: true,
    },
    data: { isActive: false },
  });

  return {
    seededCount,
    retiredRecipesCount: retiredRecipes.count,
    retiredMappingsCount: retiredMappings.count,
  };
}
