export const planInclude = {
  shift: true,
  createdBy: { select: { id: true, name: true, email: true } },
  approvedBy: { select: { id: true, name: true, email: true } },
  lines: {
    orderBy: { sortOrder: "asc" as const },
    include: {
      machine: { select: { id: true, name: true } },
      operator: { select: { id: true, name: true, email: true } },
      inventoryItem: { select: { id: true, code: true, name: true } },
      operators: {
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
      },
      characteristics: {
        include: { definition: true },
      },
      runs: {
        orderBy: { startedAt: "desc" as const },
        include: {
          recordedBy: { select: { id: true, name: true, email: true } },
        },
      },
    },
  },
};

export type PlanWithLines = {
  id: string;
  planNumber: string;
  shiftId: string | null;
  planDate: Date;
  status: string;
  notes: string | null;
  lines: {
    id: string;
    phase: string;
    targetQty: number;
    characteristics: { definitionId: string; value: string; definition: { required: boolean; label: string } }[];
    operators: { userId: string }[];
  }[];
};
