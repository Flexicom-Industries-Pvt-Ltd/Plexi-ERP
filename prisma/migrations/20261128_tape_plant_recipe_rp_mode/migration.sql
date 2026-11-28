-- Additive migration: explicit With RP / Without RP classification on recipes & shift plans
ALTER TABLE "TapePlantRecipe" ADD COLUMN IF NOT EXISTS "rpMode" TEXT NOT NULL DEFAULT 'WITH_RP';
ALTER TABLE "TapePlantPlan" ADD COLUMN IF NOT EXISTS "rpMode" TEXT NOT NULL DEFAULT 'WITH_RP';

-- Backfill TapePlantRecipe rpMode from existing RP percentage columns
UPDATE "TapePlantRecipe"
SET "rpMode" = CASE
  WHEN COALESCE("rp1Percent", 0) = 0
   AND COALESCE("rp2Percent", 0) = 0
   AND COALESCE("hdrpPercent", 0) = 0
   AND COALESCE("tptPercent", 0) = 0
  THEN 'WITHOUT_RP'
  ELSE 'WITH_RP'
END;

-- Backfill TapePlantPlan rpMode safely from existing materials JSON array
UPDATE "TapePlantPlan" p
SET "rpMode" = CASE
  WHEN EXISTS (
    SELECT 1
    FROM jsonb_array_elements(
      CASE WHEN jsonb_typeof(p."materials") = 'array' THEN p."materials" ELSE '[]'::jsonb END
    ) elem
    WHERE UPPER(REGEXP_REPLACE(COALESCE(elem->>'material', ''), '[\s\-_]', '', 'g'))
          IN ('RP1', 'RP2', 'HDRP', 'TPT', 'RPWHITE', 'RPYELLOW', 'MIXEDRP', 'NATURALRP')
      AND (
        (COALESCE(TRIM(elem->>'quantity'), '') ~ '^[0-9]+(\.[0-9]+)?$' AND (TRIM(elem->>'quantity'))::double precision > 0)
        OR
        (COALESCE(TRIM(elem->>'percentage'), '') ~ '^[0-9]+(\.[0-9]+)?$' AND (TRIM(elem->>'percentage'))::double precision > 0)
      )
  )
  THEN 'WITH_RP'
  ELSE 'WITHOUT_RP'
END;
