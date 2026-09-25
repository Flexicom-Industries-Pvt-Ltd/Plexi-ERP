-- Remove legacy Day + Night 24h artificial shift record and clean any orphaned references

DELETE FROM "TapePlantPlan" WHERE "shiftId" = 'shift_day_night' OR "shiftId" IN (SELECT "id" FROM "Shift" WHERE UPPER("name") LIKE '%DAY + NIGHT%' OR UPPER("name") LIKE '%DAY+NIGHT%');
DELETE FROM "TapePlantPostProduction" WHERE "shiftId" = 'shift_day_night' OR "shiftId" IN (SELECT "id" FROM "Shift" WHERE UPPER("name") LIKE '%DAY + NIGHT%' OR UPPER("name") LIKE '%DAY+NIGHT%');
DELETE FROM "TapePlantRawMaterial" WHERE "shiftId" = 'shift_day_night' OR "shiftId" IN (SELECT "id" FROM "Shift" WHERE UPPER("name") LIKE '%DAY + NIGHT%' OR UPPER("name") LIKE '%DAY+NIGHT%');
DELETE FROM "TapePlantTemperatureReading" WHERE "shiftId" = 'shift_day_night' OR "shiftId" IN (SELECT "id" FROM "Shift" WHERE UPPER("name") LIKE '%DAY + NIGHT%' OR UPPER("name") LIKE '%DAY+NIGHT%');
DELETE FROM "TapePlantDriveParameter" WHERE "shiftId" = 'shift_day_night' OR "shiftId" IN (SELECT "id" FROM "Shift" WHERE UPPER("name") LIKE '%DAY + NIGHT%' OR UPPER("name") LIKE '%DAY+NIGHT%');
DELETE FROM "ProductionPlan" WHERE "shiftId" = 'shift_day_night' OR "shiftId" IN (SELECT "id" FROM "Shift" WHERE UPPER("name") LIKE '%DAY + NIGHT%' OR UPPER("name") LIKE '%DAY+NIGHT%');
DELETE FROM "LoomAssignment" WHERE "shiftId" = 'shift_day_night' OR "shiftId" IN (SELECT "id" FROM "Shift" WHERE UPPER("name") LIKE '%DAY + NIGHT%' OR UPPER("name") LIKE '%DAY+NIGHT%');
DELETE FROM "Bale" WHERE "shiftId" = 'shift_day_night' OR "shiftId" IN (SELECT "id" FROM "Shift" WHERE UPPER("name") LIKE '%DAY + NIGHT%' OR UPPER("name") LIKE '%DAY+NIGHT%');
DELETE FROM "ShiftHandover" WHERE "shiftId" = 'shift_day_night' OR "shiftId" IN (SELECT "id" FROM "Shift" WHERE UPPER("name") LIKE '%DAY + NIGHT%' OR UPPER("name") LIKE '%DAY+NIGHT%');
DELETE FROM "Shift" WHERE "id" = 'shift_day_night' OR UPPER("name") LIKE '%DAY + NIGHT%' OR UPPER("name") LIKE '%DAY+NIGHT%';
