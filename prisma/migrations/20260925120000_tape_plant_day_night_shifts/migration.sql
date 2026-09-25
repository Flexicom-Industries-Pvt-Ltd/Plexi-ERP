-- AlterTable TapePlantPlan: Add isDayNight flag
ALTER TABLE "TapePlantPlan" ADD COLUMN IF NOT EXISTS "isDayNight" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "TapePlantPlan_isDayNight_idx" ON "TapePlantPlan"("isDayNight");

-- Seed standard industrial shift profiles for Flexicom Tape & Loom Plants
INSERT INTO "Shift" ("id", "name", "startTime", "endTime", "isActive", "createdAt", "updatedAt")
VALUES
    ('shift_day', 'Day Shift', '08:00', '20:00', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('shift_night', 'Night Shift', '20:00', '08:00', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('shift_day_night', 'Day + Night (24 Hours)', '08:00', '08:00', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('shift_a', 'Shift A (06:00 - 14:00)', '06:00', '14:00', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('shift_b', 'Shift B (14:00 - 22:00)', '14:00', '22:00', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('shift_c', 'Shift C (22:00 - 06:00)', '22:00', '06:00', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('shift_general', 'General Shift', '09:00', '17:30', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("name") DO UPDATE SET
    "startTime" = EXCLUDED."startTime",
    "endTime" = EXCLUDED."endTime",
    "isActive" = true,
    "updatedAt" = CURRENT_TIMESTAMP;
