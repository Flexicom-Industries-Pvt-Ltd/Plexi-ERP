-- AlterTable TapePlantRecipe
ALTER TABLE "TapePlantRecipe" ADD COLUMN IF NOT EXISTS "colorGroup" TEXT;
ALTER TABLE "TapePlantRecipe" ADD COLUMN IF NOT EXISTS "recipeGroup" TEXT;
ALTER TABLE "TapePlantRecipe" ADD COLUMN IF NOT EXISTS "copiedFromCode" TEXT;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "TapePlantRecipe_colorGroup_idx" ON "TapePlantRecipe"("colorGroup");
CREATE INDEX IF NOT EXISTS "TapePlantRecipe_recipeGroup_idx" ON "TapePlantRecipe"("recipeGroup");

-- Update existing recipes with initial color groups and recipe families
UPDATE "TapePlantRecipe"
SET "colorGroup" = 'Yellow', "recipeGroup" = '820D PP Yellow'
WHERE "code" = 'AMB/PP/YL/74/500/S1' AND "colorGroup" IS NULL;

UPDATE "TapePlantRecipe"
SET "colorGroup" = 'Yellow', "recipeGroup" = '840D PP Yellow'
WHERE "code" = 'TOP/PP/YL/76/500/HC' AND "colorGroup" IS NULL;

UPDATE "TapePlantRecipe"
SET "colorGroup" = 'White', "recipeGroup" = '860D PP White'
WHERE "code" = 'AMB/PP/WHT/78/500/S1' AND "colorGroup" IS NULL;

UPDATE "TapePlantRecipe"
SET "colorGroup" = 'White', "recipeGroup" = '840D PP White'
WHERE "code" = 'TOP/PP/WHT/76/500/HC' AND "colorGroup" IS NULL;

UPDATE "TapePlantRecipe"
SET "colorGroup" = 'Yellow', "recipeGroup" = '840D PP Yellow'
WHERE "code" = 'UTCL/PP/YL/75.5/495/S1' AND "colorGroup" IS NULL;

UPDATE "TapePlantRecipe"
SET "colorGroup" = 'Yellow', "recipeGroup" = '840D PP Yellow'
WHERE "code" = 'BVCL/PP/YL/75.5/495/HC' AND "colorGroup" IS NULL;

UPDATE "TapePlantRecipe"
SET "colorGroup" = 'White', "recipeGroup" = '900D LPP White'
WHERE "code" = 'AMB/NVCO/LPP/WH/65/500/S1' AND "colorGroup" IS NULL;

UPDATE "TapePlantRecipe"
SET "colorGroup" = 'White', "recipeGroup" = '900D LPP White'
WHERE "code" = 'WOND/LPP/WHT/69/500/S1' AND "colorGroup" IS NULL;

UPDATE "TapePlantRecipe"
SET "colorGroup" = 'White', "recipeGroup" = '855D LPP White'
WHERE "code" = 'TOP/LPP/WHT/63.5/505/HC' AND "colorGroup" IS NULL;

UPDATE "TapePlantRecipe"
SET "colorGroup" = 'Yellow', "recipeGroup" = '900D LPP Yellow'
WHERE "code" = 'UTCL/LPP/YL/67/500/S1' AND "colorGroup" IS NULL;

UPDATE "TapePlantRecipe"
SET "colorGroup" = 'Yellow', "recipeGroup" = '890D LPP Yellow'
WHERE "code" = 'BVCL/LPP/YL/67/500/HC' AND "colorGroup" IS NULL;
