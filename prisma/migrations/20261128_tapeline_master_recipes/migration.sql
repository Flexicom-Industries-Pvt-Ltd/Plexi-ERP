-- Additive migration: Tapeline Master dual formulations (WITH RP & WITHOUT RP), vendor, permissible ash & LDPE 040
ALTER TABLE "TapePlantRecipe" ADD COLUMN IF NOT EXISTS "vendor" TEXT;
ALTER TABLE "TapePlantRecipe" ADD COLUMN IF NOT EXISTS "permissibleFabAsh" DOUBLE PRECISION;
ALTER TABLE "TapePlantRecipe" ADD COLUMN IF NOT EXISTS "permissibleTapeAsh" DOUBLE PRECISION;
ALTER TABLE "TapePlantRecipe" ADD COLUMN IF NOT EXISTS "ldpePercent" DOUBLE PRECISION;
ALTER TABLE "TapePlantRecipe" ADD COLUMN IF NOT EXISTS "tptFillerPercent" DOUBLE PRECISION;
ALTER TABLE "TapePlantRecipe" ADD COLUMN IF NOT EXISTS "withRpComposition" JSONB;
ALTER TABLE "TapePlantRecipe" ADD COLUMN IF NOT EXISTS "withoutRpComposition" JSONB;

CREATE INDEX IF NOT EXISTS "TapePlantRecipe_vendor_idx" ON "TapePlantRecipe"("vendor");

-- Backfill dual JSON composition profiles from existing flat fields where missing
UPDATE "TapePlantRecipe"
SET
  "withRpComposition" = COALESCE(
    "withRpComposition",
    CASE
      WHEN "rpMode" = 'WITH_RP' AND (
        "ppPercent" IS NOT NULL OR "ccPercent" IS NOT NULL OR "mbPercent" IS NOT NULL OR
        "rp1Percent" IS NOT NULL OR "rp2Percent" IS NOT NULL OR "hdrpPercent" IS NOT NULL OR
        "tptPercent" IS NOT NULL OR "ldpePercent" IS NOT NULL
      ) THEN jsonb_build_object(
        'ppPercent', "ppPercent",
        'ccPercent', "ccPercent",
        'ldpePercent', "ldpePercent",
        'mbPercent', "mbPercent",
        'rp1Percent', "rp1Percent",
        'rp2Percent', "rp2Percent",
        'hdrpPercent', "hdrpPercent",
        'tptPercent', "tptPercent",
        'tptFillerPercent', "tptFillerPercent",
        'totalPercent', "totalPercent",
        'actualAshPercent', "ashPercent"
      )
      ELSE NULL
    END
  ),
  "withoutRpComposition" = COALESCE(
    "withoutRpComposition",
    CASE
      WHEN "rpMode" = 'WITHOUT_RP' AND (
        "ppPercent" IS NOT NULL OR "ccPercent" IS NOT NULL OR "mbPercent" IS NOT NULL OR
        "rp1Percent" IS NOT NULL OR "rp2Percent" IS NOT NULL OR "hdrpPercent" IS NOT NULL OR
        "tptPercent" IS NOT NULL OR "ldpePercent" IS NOT NULL
      ) THEN jsonb_build_object(
        'ppPercent', "ppPercent",
        'ccPercent', "ccPercent",
        'ldpePercent', "ldpePercent",
        'mbPercent', "mbPercent",
        'rp1Percent', "rp1Percent",
        'rp2Percent', "rp2Percent",
        'hdrpPercent', "hdrpPercent",
        'tptPercent', "tptPercent",
        'tptFillerPercent', "tptFillerPercent",
        'totalPercent', "totalPercent",
        'actualAshPercent', "ashPercent"
      )
      ELSE NULL
    END
  );
