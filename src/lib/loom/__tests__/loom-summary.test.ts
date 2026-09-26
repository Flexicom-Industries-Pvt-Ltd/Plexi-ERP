import { describe, it, expect, vi } from "vitest";
import {
  exportLoomSummaryExcel,
  LoomSummaryDataset,
} from "../loom-summary-export";
import { generateLoomSummaryHtml } from "../print-loom-summary";
import * as XLSX from "xlsx";

vi.mock("xlsx", async () => {
  const actual = await vi.importActual<any>("xlsx");
  return {
    ...actual,
    writeFile: vi.fn(),
  };
});

describe("Loom Summary Export & Print Engine", () => {
  const mockDataset: LoomSummaryDataset = {
    selectedDate: "2026-09-26",
    selectedShiftName: "Day Shift",
    recipeSummaries: [
      {
        recipeQuality: "1000D White Standard",
        totalLoomsCount: 3,
        assignedLooms: [4, 12, 45],
        assignedLoomIdentifiers: ["Loom #4", "Loom #12", "Loom #45"],
        totalCratesIssued: 15,
        totalBobbinsIssued: 120,
        totalWeightIssuedKg: 192,
        latestIssueDate: "2026-09-26",
        activeShifts: ["Day Shift"],
        issuesCount: 2,
        issuers: ["Rajesh Kumar"],
        receivers: ["Mahesh Loom Incharge"],
        recentIssues: [
          {
            slipNumber: "TP-ISS-20260926-0001",
            date: "2026-09-26",
            shiftName: "Day Shift",
            crateCount: 5,
            weightKg: 64,
            loomIdentifier: "Loom #4",
          },
        ],
      },
      {
        recipeQuality: "850D Milky White",
        totalLoomsCount: 2,
        assignedLooms: [1, 2],
        assignedLoomIdentifiers: ["Loom #1", "Loom #2"],
        totalCratesIssued: 10,
        totalBobbinsIssued: 80,
        totalWeightIssuedKg: 128,
        latestIssueDate: "2026-09-26",
        activeShifts: ["Day Shift"],
        issuesCount: 1,
        issuers: ["Rajesh Kumar"],
        receivers: ["Suresh"],
        recentIssues: [],
      },
    ],
    loomSummaries: [
      {
        loomNumber: 1,
        loomIdentifier: "Loom #1",
        isActive: true,
        activeRecipe: "850D Milky White",
        allRecipes: ["850D Milky White"],
        totalCrates: 5,
        totalBobbins: 40,
        totalWeightKg: 64,
        latestDate: "2026-09-26",
        latestShiftName: "Day Shift",
        lastIssuedBy: "Rajesh Kumar",
        lastReceivedBy: "Suresh",
        allocationsCount: 1,
        recentIssues: [],
      },
      {
        loomNumber: 4,
        loomIdentifier: "Loom #4",
        isActive: true,
        activeRecipe: "1000D White Standard",
        allRecipes: ["1000D White Standard"],
        totalCrates: 5,
        totalBobbins: 40,
        totalWeightKg: 64,
        latestDate: "2026-09-26",
        latestShiftName: "Day Shift",
        lastIssuedBy: "Rajesh Kumar",
        lastReceivedBy: "Mahesh",
        allocationsCount: 1,
        recentIssues: [],
      },
      {
        loomNumber: 91,
        loomIdentifier: "Loom #91",
        isActive: false,
        activeRecipe: null,
        allRecipes: [],
        totalCrates: 0,
        totalBobbins: 0,
        totalWeightKg: 0,
        latestDate: null,
        latestShiftName: null,
        lastIssuedBy: null,
        lastReceivedBy: null,
        allocationsCount: 0,
        recentIssues: [],
      },
    ],
    qualities: [],
    loomMatrix: [],
    kpis: {
      totalLooms: 91,
      activeLoomsCount: 2,
      idleLoomsCount: 89,
      uniqueRecipesCount: 2,
      totalCratesDispatched: 25,
      totalBobbinsDispatched: 200,
      totalWeightDispatchedKg: 320,
      totalIssueSlipsCount: 3,
      totalFactoryLooms: 91,
      totalAllocatedLooms: 2,
      totalRunningLooms: 2,
      totalPlannedLooms: 0,
      totalStandbyLooms: 89,
      totalUnallocatedLooms: 89,
      runningQualitiesCount: 2,
      plannedQualitiesCount: 0,
      totalQualitiesCount: 2,
      totalTapePlannedKg: 0,
      totalTapeProducedKg: 320,
    },
  };

  it("should export multi-sheet Excel workbook for Loom Summary with Recipe Allocations & 1-91 Matrix", () => {
    exportLoomSummaryExcel(mockDataset);

    expect(XLSX.writeFile).toHaveBeenCalled();
    const calls = vi.mocked(XLSX.writeFile).mock.calls;
    const lastCall = calls[calls.length - 1];
    const wb = lastCall[0];
    const filename = lastCall[1];

    expect(filename).toContain("Loom_Summary_Allocations_20260926.xlsx");
    expect(wb.SheetNames).toContain("Recipe Allocations");
    expect(wb.SheetNames).toContain("Looms 1-91 Matrix");
  });

  it("should generate Recipe-Wise printable HTML when activeView is 'recipes'", () => {
    const html = generateLoomSummaryHtml({
      ...mockDataset,
      activeView: "recipes",
    });

    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain("Flexicom Industries Pvt. Ltd.");
    expect(html).toContain("LOOM RECIPE FORMULATION & DISPENSE SCHEDULE");
    expect(html).toContain("1000D White Standard");
    expect(html).toContain("850D Milky White");
    expect(html).toContain("#4, #12, #45");
    expect(html).toContain("logo.png");
    expect(html).toContain("Prepared By (Loom Shed In-Charge)");
    expect(html).toContain("Verified By (Tape Plant Supervisor)");
    expect(html).toContain("Approved By (Plant Manager)");
    // Should NOT contain the loom machines table title
    expect(html).not.toContain("CIRCULAR LOOM MACHINES OPERATIONAL STATUS");
  });

  it("should generate Loom-Wise printable HTML when activeView is 'looms'", () => {
    const html = generateLoomSummaryHtml({
      ...mockDataset,
      activeView: "looms",
    });

    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain("Flexicom Industries Pvt. Ltd.");
    expect(html).toContain("CIRCULAR LOOM MACHINES STATUS & ALLOCATIONS");
    expect(html).toContain("#1");
    expect(html).toContain("#4");
    expect(html).toContain("#91");
    expect(html).toContain("IDLE");
    expect(html).toContain("RUNNING");
    // Should NOT contain the recipe table title
    expect(html).not.toContain("RECIPE-WISE CIRCULAR LOOM ALLOCATIONS");
  });

  it("should respect showActiveOnly filter in Loom-Wise printout", () => {
    const html = generateLoomSummaryHtml({
      ...mockDataset,
      activeView: "looms",
      showActiveOnly: true,
    });

    expect(html).toContain("Active Running Looms Only");
    expect(html).toContain("#1");
    expect(html).toContain("#4");
    expect(html).not.toContain("#91");
  });
});

vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

import { requireLoomApiPermission } from "../permissions";
import { auth } from "@/auth";

describe("Loom RBAC Permission Guard", () => {
  it("should deny access when user is not logged in", async () => {
    vi.mocked(auth).mockResolvedValueOnce(null as any);
    const result = await requireLoomApiPermission("canRead");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(401);
    }
  });

  it("should deny access when user has PRODUCTION permission but NOT LOOM permission", async () => {
    vi.mocked(auth).mockResolvedValueOnce({
      user: {
        id: "u-1",
        role: "Operator",
        permissions: [
          { module: "PRODUCTION", canRead: true },
          { module: "TAPE_PLANT", canRead: true },
        ],
      },
    } as any);

    const result = await requireLoomApiPermission("canRead");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(403);
    }
  });

  it("should grant access when user has explicit LOOM permission", async () => {
    vi.mocked(auth).mockResolvedValueOnce({
      user: {
        id: "u-2",
        role: "Loom Master",
        permissions: [{ module: "LOOM", canRead: true }],
      },
    } as any);

    const result = await requireLoomApiPermission("canRead");
    expect(result.ok).toBe(true);
  });

  it("should grant access when user has Super Admin role", async () => {
    vi.mocked(auth).mockResolvedValueOnce({
      user: {
        id: "u-3",
        role: "Super Admin",
        permissions: [],
      },
    } as any);

    const result = await requireLoomApiPermission("canRead");
    expect(result.ok).toBe(true);
  });
});

describe("Pre-Occupied Loom Allocation Protection", () => {
  interface LoomState {
    loomNumber: number;
    activeRecipe: string | null;
  }

  const checkLoomAllocationConflict = (
    existingLooms: LoomState[],
    targetRecipe: string,
    requestedLoomNumbers: number[]
  ) => {
    const conflicts: { loomNumber: number; currentRecipe: string }[] = [];
    const allowed: number[] = [];

    for (const num of requestedLoomNumbers) {
      const match = existingLooms.find((l) => l.loomNumber === num);
      if (
        match &&
        match.activeRecipe &&
        match.activeRecipe.trim().toLowerCase() !== targetRecipe.trim().toLowerCase()
      ) {
        conflicts.push({ loomNumber: num, currentRecipe: match.activeRecipe });
      } else {
        allowed.push(num);
      }
    }

    return {
      hasConflict: conflicts.length > 0,
      conflicts,
      allowed,
    };
  };

  const sampleState: LoomState[] = [
    { loomNumber: 1, activeRecipe: "1000D White Standard" },
    { loomNumber: 2, activeRecipe: "1000D White Standard" },
    { loomNumber: 3, activeRecipe: "850D Milky White" },
    { loomNumber: 4, activeRecipe: null },
    { loomNumber: 5, activeRecipe: null },
  ];

  it("should block assigning an already occupied loom to a different recipe", () => {
    const result = checkLoomAllocationConflict(sampleState, "850D Milky White", [1, 2, 4]);
    expect(result.hasConflict).toBe(true);
    expect(result.conflicts).toEqual([
      { loomNumber: 1, currentRecipe: "1000D White Standard" },
      { loomNumber: 2, currentRecipe: "1000D White Standard" },
    ]);
    expect(result.allowed).toEqual([4]);
  });

  it("should allow assigning an already occupied loom to the same recipe (idempotent)", () => {
    const result = checkLoomAllocationConflict(sampleState, "1000D White Standard", [1, 2, 5]);
    expect(result.hasConflict).toBe(false);
    expect(result.conflicts).toEqual([]);
    expect(result.allowed).toEqual([1, 2, 5]);
  });

  it("should allow assigning idle looms to any recipe", () => {
    const result = checkLoomAllocationConflict(sampleState, "New Quality ABC", [4, 5]);
    expect(result.hasConflict).toBe(false);
    expect(result.conflicts).toEqual([]);
    expect(result.allowed).toEqual([4, 5]);
  });
});

