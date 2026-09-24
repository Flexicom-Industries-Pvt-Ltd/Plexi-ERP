-- CreateTable LoomMachineMapping
CREATE TABLE IF NOT EXISTS "LoomMachineMapping" (
    "id" TEXT NOT NULL,
    "qualityCode" TEXT NOT NULL,
    "tapePlantRecipeId" TEXT,
    "colorGroup" TEXT,
    "colour" TEXT,
    "denier" DOUBLE PRECISION,
    "tapeWidth" DOUBLE PRECISION,
    "bobbinMarking" TEXT,
    "loomNumbers" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "totalLooms" INTEGER NOT NULL DEFAULT 0,
    "reedSpaceCm" DOUBLE PRECISION,
    "mesh" TEXT,
    "targetPpm" INTEGER,
    "remarks" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LoomMachineMapping_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "LoomMachineMapping_qualityCode_key" ON "LoomMachineMapping"("qualityCode");
CREATE INDEX IF NOT EXISTS "LoomMachineMapping_qualityCode_idx" ON "LoomMachineMapping"("qualityCode");
CREATE INDEX IF NOT EXISTS "LoomMachineMapping_colorGroup_idx" ON "LoomMachineMapping"("colorGroup");
CREATE INDEX IF NOT EXISTS "LoomMachineMapping_isActive_idx" ON "LoomMachineMapping"("isActive");

-- Seed initial 27 qualities and 91 loom machine assignments from LOOM Master DATA.pdf
INSERT INTO "LoomMachineMapping" ("id", "qualityCode", "colorGroup", "colour", "denier", "tapeWidth", "bobbinMarking", "loomNumbers", "totalLooms", "reedSpaceCm", "remarks", "isActive", "createdAt", "updatedAt")
VALUES
    ('lmap_001', 'GRADE "B"', 'Grey', 'MIX', NULL, 2.45, 'AL', ARRAY[2, 3, 4]::INTEGER[], 3, NULL, 'Transition & Grade B recycled bobbins', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('lmap_002', 'FERRUS/LPP/WH/450/57/S1', 'White', 'YELLOW', 850.0, 3.0, 'GREEN', ARRAY[]::INTEGER[], 0, 57.0, '', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('lmap_003', 'NOVCO/LPP/WHITE/64/S1', 'White', 'WHITE', 850.0, 3.0, 'YELLOW', ARRAY[]::INTEGER[], 0, 64.0, '', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('lmap_004', 'wOND/LPP/WH/500/67/S1', 'Yellow', 'WHITE', 900.0, 3.0, 'RED', ARRAY[6, 7, 8, 12, 14, 16, 20, 23, 24, 25, 29, 33, 34, 35, 39, 40, 41, 43, 45, 49, 52, 76, 77, 78, 83, 87, 88, 90]::INTEGER[], 28, 67.0, 'High volume running quality (28 looms)', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('lmap_005', 'TOP/ALPP/WH/54/500/HC', 'White', 'WHITE', 850.0, 3.0, 'BLACK', ARRAY[30, 63, 86, 89]::INTEGER[], 4, 54.0, '', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('lmap_006', 'CMNYAD/LPP/WH/660/53/CP', 'White', 'WHITE', 850.0, 3.0, 'BLACK', ARRAY[17, 18, 21]::INTEGER[], 3, 53.0, '', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('lmap_007', 'CMN/AD/LPP/WH/680/89/CP', 'Yellow', 'WHITE', 850.0, 3.0, 'BLACK', ARRAY[]::INTEGER[], 0, 89.0, '', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('lmap_008', 'BVCL/LPP/YLO/500/67/HC', 'Yellow', 'YELLOW', 900.0, 3.0, 'GRN/RED', ARRAY[]::INTEGER[], 0, 67.0, '', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('lmap_009', 'STYM/YL/LPP/500/64/HC', 'White', 'YELLOW', 900.0, 3.0, 'GRN/RED', ARRAY[26, 27, 28]::INTEGER[], 3, 64.0, '', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('lmap_010', 'MAHA/LPP/WH+R/500/56', 'White', 'WHITE', 700.0, 3.0, 'RED/GRN/YL', ARRAY[82]::INTEGER[], 1, 56.0, '', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('lmap_011', 'MAHA/LPP/WHR/480/52', 'White', 'WH+RED', 700.0, 3.0, 'RED/GRN/YL', ARRAY[]::INTEGER[], 0, 52.0, '', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('lmap_012', 'MAHA/LPP/WH-RED/480/52', 'White', 'WHITE', 700.0, 3.0, 'RED/GRN/YL', ARRAY[31]::INTEGER[], 1, 52.0, '', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('lmap_013', 'UTCL/LPP/YL/500/S1', 'White', 'YELLOW', 900.0, 3.0, 'BLK/GRN', ARRAY[36, 46, 47, 48, 50, 51, 81]::INTEGER[], 7, 50.0, '', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('lmap_014', 'UTC/LPP/Y/550/89/CP/1', 'White', 'YELLOW', 900.0, 3.0, 'BLACK GREEN', ARRAY[15]::INTEGER[], 1, 89.0, '', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('lmap_015', 'ULTR/PP/YL/490/76/S1', 'Dark Green', 'YELLOW', 840.0, 2.45, 'GREEN', ARRAY[44, 55, 59, 60, 61, 62]::INTEGER[], 6, 76.0, '', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('lmap_016', 'BVCL/PP/YLO/75.5/490/HC', 'White', 'YELLOW', 825.0, 2.45, 'NO', ARRAY[73, 75, 91]::INTEGER[], 3, 75.5, '', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('lmap_017', 'AMB/PP/YLO/500/77/S1', 'White', 'YELLOW', 860.0, 2.45, 'RED/BLACK', ARRAY[]::INTEGER[], 0, 77.0, '', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('lmap_018', 'AMB/PP/YLO/500/76/S1', 'Dark Green', 'YELLOW', 815.0, 2.45, 'GREEN', ARRAY[9, 10, 19, 22, 37, 42, 57, 66, 67, 68]::INTEGER[], 10, 76.0, '10 active looms allocated', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('lmap_019', 'TOP/PP/YLO/500/76/HC', 'Light Green', 'YELLOW', 825.0, 2.45, 'RED', ARRAY[56, 58]::INTEGER[], 2, 76.0, '', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('lmap_020', 'AMB/PP/WH/500/76/S1', 'Light Green', 'WHITE', 860.0, 2.45, 'BLUE', ARRAY[11, 13, 32, 38, 53, 54, 64, 65, 69, 70, 71, 72, 74, 79, 80, 84, 85]::INTEGER[], 17, 76.0, '17 active looms allocated', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('lmap_021', 'AMB/PP/WH/500/74/S1', 'Light Green', 'WH/RED', 815.0, 3.0, 'BLUE/BLACK', ARRAY[]::INTEGER[], 0, 74.0, '', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('lmap_022', 'CC/PP/W+Y/480/77/S1', 'Light Green', 'WH+YL', 860.0, 2.45, 'BLUE', ARRAY[]::INTEGER[], 0, 77.0, '', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('lmap_023', 'C/PP/Y/480/77/S1', 'Light Green', 'YELLOW', 860.0, 2.45, 'RED+BLACK', ARRAY[]::INTEGER[], 0, 77.0, '', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('lmap_024', 'cCi/PP/Y/480/77/HC', 'Light Green', 'YELLOW', 860.0, 2.45, 'BLACK', ARRAY[]::INTEGER[], 0, 77.0, '', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('lmap_025', 'TOP/PP/WH/500/76/HC', 'Light Blue', 'WHITE', 830.0, 2.45, 'RED/BLUE', ARRAY[1, 5]::INTEGER[], 2, 76.0, '', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('lmap_026', 'UMABRIJ/PP/ORNG/490/72/HC', 'Yellow', 'ORANGE', 800.0, 2.45, 'NO', ARRAY[]::INTEGER[], 0, 72.0, '', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('lmap_027', 'BIS/SAMPLE/485/77/WH/PP/S1', 'Dark Blue', 'WHITE', 860.0, 2.45, 'SAMPLE', ARRAY[]::INTEGER[], 0, 77.0, 'BIS Certification Trial Quality', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("qualityCode") DO NOTHING;
