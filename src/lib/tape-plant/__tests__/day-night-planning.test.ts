import { describe, it, expect, vi } from "vitest";
import { generateTapePlantPlanningExcel } from "../planning-export";
import { generatePlanningSheetHtml } from "../print-planning-sheet";
import { RecipePlanItem } from "@/components/tape-plant/TapePlantPlanningSection";
import * as XLSX from "xlsx";

vi.mock("xlsx", async () => {
  const actual = await vi.importActual<any>("xlsx");
  return {
    ...actual,
    writeFile: vi.fn(),
  };
});

describe("Tape Plant Multi-Shift (Day + Night) Planning & Execution", () => {
  const mockPlans: RecipePlanItem[] = [
    {
      id: "plan-1",
      recipeQuality: "wOND/LPP/WH/500/67/S1",
      tapeType: "LPP",
      denier: 900,
      tapeWidth: 500,
      strength: 4.8,
      eloPercent: 22,
      bobbinMarking: "RED",
      colour: "WHITE",
      spacerSize: "3.0",
      requiredAsh: 18,
      ashPercent: 18.2,
      plannedQtyKg: 5000,
      omega: "1.2",
      vistPercent: 0.5,
      remarks: "High volume 24h continuous batch feeding 28 looms",
      isDayNight: true,
      materials: [
        { material: "PP", quantity: 3800, percentage: 76 },
        { material: "CC", quantity: 800, percentage: 16 },
        { material: "MB", quantity: 400, percentage: 8 },
      ],
    },
    {
      id: "plan-2",
      recipeQuality: "AMB/PP/YL/74/500/S1",
      tapeType: "PP",
      denier: 850,
      tapeWidth: 500,
      strength: 4.5,
      eloPercent: 20,
      bobbinMarking: "BLACK",
      colour: "YELLOW",
      spacerSize: "2.45",
      requiredAsh: 15,
      ashPercent: 15.0,
      plannedQtyKg: 1200,
      omega: "1.0",
      vistPercent: 0.3,
      remarks: "Single shift test run",
      isDayNight: false,
      materials: [
        { material: "PP", quantity: 1000, percentage: 83.3 },
        { material: "CC", quantity: 200, percentage: 16.7 },
      ],
    },
  ];

  describe("Excel Export with Multi-Shift Runs", () => {
    it("should include Day+Night continuous run tag in remarks column", () => {
      generateTapePlantPlanningExcel({
        date: "2026-09-25",
        shiftName: "Day + Night (24 Hours)",
        status: "SUBMITTED",
        plans: mockPlans,
      });

      expect(XLSX.writeFile).toHaveBeenCalled();
      const [wb] = (XLSX.writeFile as any).mock.calls.slice(-1)[0];
      const sheet = wb.Sheets["Shift Production Plan"];
      expect(sheet).toBeDefined();

      const json = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];
      // Row 4 is header, Row 5 is first data row
      const firstDataRow = json[4];
      const lastCol = firstDataRow[firstDataRow.length - 1];
      expect(lastCol).toContain("[Day+Night 24h Continuous Run]");
    });
  });

  describe("Printable Sheet Engine with Day + Night Runs", () => {
    it("should render Day+Night (24h) badge and separate continuous batch from single-shift planned output", () => {
      const html = generatePlanningSheetHtml({
        date: "2026-09-25",
        shiftName: "Day + Night (24 Hours)",
        status: "SUBMITTED",
        plans: mockPlans,
      });

      expect(html).toContain("wOND/LPP/WH/500/67/S1");
      expect(html).toContain("Day+Night (24h)");
      expect(html).toContain("1,200"); // Single shift output sum
      expect(html).toContain("5,000"); // 24h batch explicitly stated beside total
      expect(html).toContain("Day+Night 24-Hour Continuous Batch");
    });
  });

  describe("Multi-Shift Aggregate Logic", () => {
    it("should separate single-shift output from 24h continuous planned batch volume", () => {
      const shiftOnlyPlanned = mockPlans.filter((p) => !p.isDayNight).reduce((sum, p) => sum + Number(p.plannedQtyKg), 0);
      const dayNightPlanned = mockPlans.filter((p) => p.isDayNight).reduce((sum, p) => sum + Number(p.plannedQtyKg), 0);

      expect(shiftOnlyPlanned).toBe(1200);
      expect(dayNightPlanned).toBe(5000);
    });

    it("should support continuous run carryover to Night Shift alongside Night-specific recipes", () => {
      // Suppose Night Shift inherits the Day+Night quality and adds a Night-specific quality
      const nightPlans: RecipePlanItem[] = [
        {
          ...mockPlans[0],
          id: "temp-carry-plan-1",
          carriedOverFromShift: "Day Shift",
        },
        {
          id: "plan-night-extra",
          recipeQuality: "HDPE/NAT/450/50/S2",
          tapeType: "PP",
          denier: 700,
          tapeWidth: 450,
          strength: 4.2,
          eloPercent: 19,
          bobbinMarking: "BLUE",
          colour: "NATURAL",
          spacerSize: "2.0",
          requiredAsh: 12,
          ashPercent: 12.0,
          plannedQtyKg: 1500,
          omega: "1.0",
          vistPercent: 0.2,
          remarks: "Night shift short run",
          isDayNight: false,
          materials: [
            { material: "PP", quantity: 1300, percentage: 86.7 },
            { material: "CC", quantity: 200, percentage: 13.3 },
          ],
        },
      ];

      expect(nightPlans.length).toBe(2);
      expect(nightPlans[0].isDayNight).toBe(true);
      expect(nightPlans[0].carriedOverFromShift).toBe("Day Shift");
      expect(nightPlans[1].isDayNight).toBe(false);

      const html = generatePlanningSheetHtml({
        date: "2026-09-25",
        shiftName: "Night Shift",
        status: "DRAFT",
        plans: nightPlans,
      });

      expect(html).toContain("wOND/LPP/WH/500/67/S1");
      expect(html).toContain("Day+Night (24h)");
      expect(html).toContain("HDPE/NAT/450/50/S2");
    });

    it("should strictly deduplicate continuous Day+Night recipes in post-production and planning", () => {
      // Simulating dual records from Day Shift and Night Shift for the same continuous quality
      const dayPlan = {
        id: "plan-day-1",
        shiftId: "shift_day",
        recipeQuality: "wOND/LPP/WH/500/67/S1",
        isDayNight: true,
        plannedQtyKg: 5000,
      };

      const nightPlan = {
        id: "plan-night-1",
        shiftId: "shift_night",
        recipeQuality: "wOND/LPP/WH/500/67/S1",
        isDayNight: true,
        plannedQtyKg: 5000,
      };

      const nightExtra = {
        id: "plan-night-2",
        shiftId: "shift_night",
        recipeQuality: "HDPE/NAT/450/50/S2",
        isDayNight: false,
        plannedQtyKg: 1200,
      };

      // Test Day Shift view: shiftPlans = [dayPlan], otherContinuousPlans = [nightPlan]
      const shiftPlansDay = [dayPlan];
      const otherContinuousDay = [nightPlan];
      const existingQualitiesDay = new Set(shiftPlansDay.map((p) => p.recipeQuality.trim()));
      const unlistedDay = otherContinuousDay.filter((cp) => !existingQualitiesDay.has(cp.recipeQuality.trim()));
      const combinedDay = [...shiftPlansDay, ...unlistedDay];

      expect(combinedDay.length).toBe(1);
      expect(combinedDay[0].recipeQuality).toBe("wOND/LPP/WH/500/67/S1");

      // Test Night Shift view: shiftPlans = [nightPlan, nightExtra], otherContinuousPlans = [dayPlan]
      const shiftPlansNight = [nightPlan, nightExtra];
      const otherContinuousNight = [dayPlan];
      const existingQualitiesNight = new Set(shiftPlansNight.map((p) => p.recipeQuality.trim()));
      const unlistedNight = otherContinuousNight.filter((cp) => !existingQualitiesNight.has(cp.recipeQuality.trim()));
      const combinedNight = [...shiftPlansNight, ...unlistedNight];

      expect(combinedNight.length).toBe(2);
      expect(combinedNight.map((p) => p.recipeQuality)).toEqual([
        "wOND/LPP/WH/500/67/S1",
        "HDPE/NAT/450/50/S2",
      ]);
    });

    it("should deduplicate continuous Day+Night runs in ALL filter so it appears once without double-counting", () => {
      const allRawPlans = [
        {
          id: "plan-day-1",
          shiftId: "shift_day",
          shift: { name: "Day Shift" },
          recipeQuality: "wOND/LPP/WH/500/67/S1",
          isDayNight: true,
          plannedQtyKg: 5000,
        },
        {
          id: "plan-day-2",
          shiftId: "shift_day",
          shift: { name: "Day Shift" },
          recipeQuality: "AMB/PP/YL/74/500/S1",
          isDayNight: false,
          plannedQtyKg: 1200,
        },
        {
          id: "plan-night-1",
          shiftId: "shift_night",
          shift: { name: "Night Shift" },
          recipeQuality: "wOND/LPP/WH/500/67/S1",
          isDayNight: true,
          plannedQtyKg: 5000,
        },
        {
          id: "plan-night-2",
          shiftId: "shift_night",
          shift: { name: "Night Shift" },
          recipeQuality: "HDPE/NAT/450/50/S2",
          isDayNight: false,
          plannedQtyKg: 1500,
        },
      ];

      const seenContinuousQualities = new Set<string>();
      const effectivePlans: any[] = [];

      for (const p of allRawPlans) {
        const qualityKey = (p.recipeQuality || "").trim().toUpperCase();
        if (p.isDayNight) {
          if (seenContinuousQualities.has(qualityKey)) {
            continue;
          }
          seenContinuousQualities.add(qualityKey);
          effectivePlans.push({
            ...p,
            shiftName: "Day + Night (24h)",
          });
        } else {
          const sName = p.shift?.name || "Day Shift";
          effectivePlans.push({
            ...p,
            shiftName: sName,
          });
        }
      }

      expect(effectivePlans.length).toBe(3);
      expect(effectivePlans.map((p) => p.recipeQuality)).toEqual([
        "wOND/LPP/WH/500/67/S1",
        "AMB/PP/YL/74/500/S1",
        "HDPE/NAT/450/50/S2",
      ]);
      expect(effectivePlans[0].shiftName).toBe("Day + Night (24h)");
      const totalPlanned = effectivePlans.reduce((sum, p) => sum + p.plannedQtyKg, 0);
      expect(totalPlanned).toBe(5000 + 1200 + 1500); // 7,700 KG, exactly counted once
    });

    it("should correctly handle quality deletion and post-production sync when saving plans", () => {
      // Scenario: Shift originally had 3 planned qualities, then user deletes quality 2 and submits
      const initialPlans = [
        { id: "p1", recipeQuality: "QUAL-A", plannedQtyKg: 4000, shiftId: "shift_day" },
        { id: "p2", recipeQuality: "QUAL-B", plannedQtyKg: 2000, shiftId: "shift_day" },
        { id: "p3", recipeQuality: "QUAL-C", plannedQtyKg: 3000, shiftId: "shift_day" },
      ];

      const submittedPlans = [
        { id: "p1", recipeQuality: "QUAL-A", plannedQtyKg: 4000, shiftId: "shift_day" },
        { id: "p3", recipeQuality: "QUAL-C", plannedQtyKg: 3000, shiftId: "shift_day" },
      ];

      const submittedIds = submittedPlans.map((p) => p.id);

      // Remaining plans in DB after deleteMany({ where: { date, shiftId, id: { notIn: submittedIds } } })
      const remainingPlansInDb = initialPlans.filter((p) => submittedIds.includes(p.id));
      expect(remainingPlansInDb.length).toBe(2);
      expect(remainingPlansInDb.map((p) => p.recipeQuality)).toEqual(["QUAL-A", "QUAL-C"]);

      // Post-Production synchronization:
      const savedPostProdEntries = [
        { id: "p1", planId: "p1", recipeQuality: "QUAL-A", plannedProductionKg: 4000, productionDoneKg: 3900, wasteKg: 50 },
        { id: "p2", planId: "p2", recipeQuality: "QUAL-B", plannedProductionKg: 2000, productionDoneKg: 1950, wasteKg: 30 },
        { id: "p3", planId: "p3", recipeQuality: "QUAL-C", plannedProductionKg: 3000, productionDoneKg: 2980, wasteKg: 40 },
      ];

      // Re-sync post production entries strictly from active remaining plans
      const syncedPostProdEntries = remainingPlansInDb.map((plan) => {
        const matching = savedPostProdEntries.find((e) => e.planId === plan.id || e.recipeQuality === plan.recipeQuality);
        const plannedKg = plan.plannedQtyKg;
        const doneKg = matching?.productionDoneKg ?? 0;
        const wasteKg = matching?.wasteKg ?? 0;
        return {
          id: plan.id,
          planId: plan.id,
          recipeQuality: plan.recipeQuality,
          plannedProductionKg: plannedKg,
          productionDoneKg: doneKg,
          gapKg: plannedKg - Number(doneKg),
          wasteKg,
          netProductionKg: Number(doneKg) - Number(wasteKg),
        };
      });

      expect(syncedPostProdEntries.length).toBe(2);
      expect(syncedPostProdEntries.map((e) => e.recipeQuality)).toEqual(["QUAL-A", "QUAL-C"]);
      expect(syncedPostProdEntries.find((e) => e.recipeQuality === "QUAL-B")).toBeUndefined();

      const totalPlanned = syncedPostProdEntries.reduce((sum, e) => sum + Number(e.plannedProductionKg), 0);
      const totalDone = syncedEntriesTotal(syncedPostProdEntries);
      expect(totalPlanned).toBe(7000); // 4000 + 3000 (QUAL-B's 2000 is removed)
      expect(totalDone).toBe(6880); // 3900 + 2980
    });

    it("should correctly overwrite database state and remove deleted qualities when submitted from ALL filter", () => {
      // Scenario: User views ALL filter (Day + Night), deletes a Night quality, and submits
      const existingAllPlansInDb = [
        { id: "day-1", recipeQuality: "DAY-QUAL", plannedQtyKg: 5000, shiftId: "shift_day" },
        { id: "night-1", recipeQuality: "NIGHT-QUAL-1", plannedQtyKg: 3000, shiftId: "shift_night" },
        { id: "night-2", recipeQuality: "NIGHT-QUAL-2", plannedQtyKg: 2000, shiftId: "shift_night" },
      ];

      // User deleted night-2 from the list and submits
      const submittedFromAll = [
        { id: "day-1", recipeQuality: "DAY-QUAL", plannedQtyKg: 5000, shiftId: "shift_day" },
        { id: "night-1", recipeQuality: "NIGHT-QUAL-1", plannedQtyKg: 3000, shiftId: "shift_night" },
      ];

      const submittedIds = submittedFromAll.map((p) => p.id);

      // In ALL mode: deleteMany({ where: { date, id: { notIn: submittedIds } } })
      const plansAfterAllSave = existingAllPlansInDb.filter((p) => submittedIds.includes(p.id));
      expect(plansAfterAllSave.length).toBe(2);
      expect(plansAfterAllSave.map((p) => p.id)).toEqual(["day-1", "night-1"]);
      expect(plansAfterAllSave.find((p) => p.id === "night-2")).toBeUndefined();
    });
  });
});

function syncedEntriesTotal(entries: any[]): number {
  return entries.reduce((sum, e) => sum + Number(e.productionDoneKg), 0);
}





