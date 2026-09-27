export interface LoomIssueAllocationEntry {
  issueId: string;
  slipNumber: string;
  date: string;
  shiftId: string;
  shiftName: string;
  recipeQuality: string;
  loomNumber: number | null;
  loomIdentifier: string;
  crateCount: number;
  bobbinCount: number;
  weightKg: number;
  issuedBy?: string | null;
  receivedBy?: string | null;
  remarks?: string | null;
}

export interface RecipeLoomSummaryItem {
  recipeQuality: string;
  totalLoomsCount: number;
  assignedLooms: number[];
  assignedLoomIdentifiers: string[];
  allocationDate?: string | null;
  activeShifts: string[];
  totalCratesIssued: number;
  totalBobbinsIssued: number;
  totalWeightIssuedKg: number;
  latestIssueDate: string;
  issuesCount: number;
  issuers: string[];
  receivers: string[];
  recentIssues: {
    slipNumber: string;
    date: string;
    shiftName: string;
    crateCount?: number;
    weightKg: number;
    loomIdentifier?: string;
  }[];
}

export interface LoomMachineSummaryItem {
  loomNumber: number;
  loomIdentifier: string;
  isActive: boolean;
  activeRecipe: string | null;
  allRecipes: string[];
  totalCrates: number;
  totalBobbins: number;
  totalWeightKg: number;
  latestDate: string | null;
  latestShiftName: string | null;
  activeShifts: string[];
  allocationDate?: string | null;
  lastIssuedBy: string | null;
  lastReceivedBy: string | null;
  allocationsCount: number;
  recentIssues: {
    slipNumber: string;
    date: string;
    shiftName: string;
    recipeQuality?: string;
    crateCount?: number;
    weightKg: number;
  }[];
}
