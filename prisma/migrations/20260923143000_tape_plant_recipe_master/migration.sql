-- CreateTable TapePlantRecipe
CREATE TABLE IF NOT EXISTS "TapePlantRecipe" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "tapeType" TEXT NOT NULL,
    "denier" DOUBLE PRECISION,
    "tapeWidth" DOUBLE PRECISION,
    "strength" DOUBLE PRECISION,
    "eloPercent" DOUBLE PRECISION,
    "bobbinMarking" TEXT,
    "colour" TEXT,
    "spacerSize" DOUBLE PRECISION,
    "requiredAsh" DOUBLE PRECISION,
    "ashPercent" DOUBLE PRECISION,
    "ppPercent" DOUBLE PRECISION,
    "ccPercent" DOUBLE PRECISION,
    "mbPercent" DOUBLE PRECISION,
    "rp1Percent" DOUBLE PRECISION,
    "rp2Percent" DOUBLE PRECISION,
    "hdrpPercent" DOUBLE PRECISION,
    "omega" DOUBLE PRECISION,
    "vistamaxPercent" DOUBLE PRECISION,
    "tptPercent" DOUBLE PRECISION,
    "totalPercent" DOUBLE PRECISION DEFAULT 100,
    "defaultQtyKg" DOUBLE PRECISION,
    "remarks" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TapePlantRecipe_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "TapePlantRecipe_code_key" ON "TapePlantRecipe"("code");
CREATE INDEX IF NOT EXISTS "TapePlantRecipe_code_idx" ON "TapePlantRecipe"("code");
CREATE INDEX IF NOT EXISTS "TapePlantRecipe_tapeType_idx" ON "TapePlantRecipe"("tapeType");
CREATE INDEX IF NOT EXISTS "TapePlantRecipe_isActive_idx" ON "TapePlantRecipe"("isActive");

-- Seed initial master recipes from TAPE PLANT RECIPE.xlsx
INSERT INTO "TapePlantRecipe" ("id", "code", "tapeType", "denier", "tapeWidth", "strength", "eloPercent", "bobbinMarking", "colour", "spacerSize", "requiredAsh", "ashPercent", "ppPercent", "ccPercent", "mbPercent", "rp1Percent", "rp2Percent", "hdrpPercent", "tptPercent", "totalPercent", "defaultQtyKg", "remarks", "isActive", "createdAt", "updatedAt")
VALUES
    ('rec_amb_pp_yl_74', 'AMB/PP/YL/74/500/S1', 'PP', 820.0, 2.45, 5.1, 0.24, 'BLACK - GREEN', 'YELLOW', 6.15, 5.5, 5.42, 84.8, 4.4, 0.8, 8.0, 2.0, NULL, NULL, 100, 2500.0, '', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('rec_top_pp_yl_76', 'TOP/PP/YL/76/500/HC', 'PP', 840.0, 2.45, 4.75, 0.22, 'RED', 'YELLOW', 6.15, NULL, 20.50, 59.7, 19.0, 2.3, 10.0, 7.0, NULL, 2.0, 100, 2500.0, 'A. M.B 1.3 + UT MB 1', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('rec_amb_pp_wht_78', 'AMB/PP/WHT/78/500/S1', 'PP', 860.0, 2.45, 5.1, 0.24, 'Blue', 'WHITE', 6.15, 6.0, 5.45, 88.75, 6.25, NULL, 3.0, NULL, 2.0, NULL, 100, 2500.0, '', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('rec_top_pp_wht_76', 'TOP/PP/WHT/76/500/HC', 'PP', 840.0, 2.45, 4.75, 0.22, 'Red Blue', 'WHITE', 6.15, NULL, 19.10, 66.0, 22.0, NULL, 10.0, NULL, 2.0, NULL, 100, 2000.0, '', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('rec_utcl_pp_yl_75_5', 'UTCL/PP/YL/75.5/495/S1', 'PP', 840.0, 2.45, 4.75, 0.22, 'RED', 'YELLOW', 6.15, NULL, 5.25, 89.0, 5.0, 1.0, 3.0, 2.0, NULL, NULL, 100, 2000.0, '', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('rec_bvcl_pp_yl_75_5', 'BVCL/PP/YL/75.5/495/HC', 'PP', 840.0, 2.45, 4.75, 0.22, '', 'YELLOW', 6.15, NULL, 22.35, 56.5, 22.0, 2.5, 5.0, 13.0, NULL, 1.0, 100, 2000.0, '', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('rec_amb_nvco_lpp_wh_65', 'AMB/NVCO/LPP/WH/65/500/S1', 'LPP', 850.0, 2.98, 5.2, 0.26, 'YELLOW', 'WHITE', 7.15, 4.0, 3.74, 89.7, 5.3, NULL, 5.0, NULL, NULL, NULL, 100, 7000.0, '', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('rec_wond_lpp_wht_69', 'WOND/LPP/WHT/69/500/S1', 'LPP', 900.0, 2.98, 5.2, 0.26, 'RED', 'WHITE', 7.15, 4.0, 3.56, 90.0, 5.0, NULL, 5.0, NULL, NULL, NULL, 100, 2500.0, '', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('rec_top_lpp_wht_63_5', 'TOP/LPP/WHT/63.5/505/HC', 'LPP', 855.0, 2.98, 4.65, 0.24, 'Black', 'WHITE', 7.15, NULL, 14.33, 66.0, 24.0, NULL, 10.0, NULL, 2.0, NULL, 100, 2500.0, '', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('rec_utcl_lpp_yl_67', 'UTCL/LPP/YL/67/500/S1', 'LPP', 900.0, 2.98, 4.65, 0.24, 'BLACK+GREEN', 'YELLOW', 7.15, NULL, 5.0, 89.95, 3.75, 1.3, 4.0, 1.0, NULL, NULL, 100, 2500.0, '', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('rec_bvcl_lpp_yl_67', 'BVCL/LPP/YL/67/500/HC', 'LPP', 890.0, 2.98, 4.65, 0.24, 'RED + GREEN', 'YELLOW', 7.15, NULL, NULL, 60.5, 20.0, 2.5, 7.0, 10.0, NULL, NULL, 100, 2000.0, '', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("code") DO NOTHING;
