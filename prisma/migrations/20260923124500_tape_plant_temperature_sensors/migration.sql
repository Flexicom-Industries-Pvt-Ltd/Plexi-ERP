-- AlterTable TapePlantTemperatureReading: Add meltTemp, h1, h2 sensor columns
ALTER TABLE "TapePlantTemperatureReading" ADD COLUMN IF NOT EXISTS "meltTemp" DOUBLE PRECISION;
ALTER TABLE "TapePlantTemperatureReading" ADD COLUMN IF NOT EXISTS "h1" DOUBLE PRECISION;
ALTER TABLE "TapePlantTemperatureReading" ADD COLUMN IF NOT EXISTS "h2" DOUBLE PRECISION;
