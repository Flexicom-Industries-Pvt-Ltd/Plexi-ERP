export const loomRunInclude = {
  productionRun: {
    include: {
      planLine: {
        include: {
          plan: {
            select: {
              id: true,
              planNumber: true,
              status: true,
              planDate: true,
              shift: { select: { id: true, name: true } },
            },
          },
          machine: { select: { id: true, name: true } },
          operator: { select: { id: true, name: true, email: true } },
          inventoryItem: { select: { id: true, code: true, name: true } },
        },
      },
      recordedBy: { select: { id: true, name: true, email: true } },
    },
  },
  loomMachine: { select: { id: true, name: true, status: true, serialNumber: true } },
  operator: { select: { id: true, name: true, email: true, employeeId: true } },
  bobbinItem: { select: { id: true, code: true, name: true, currentStock: true } },
  rollItem: { select: { id: true, code: true, name: true, currentStock: true } },
};

export const loomAssignmentInclude = {
  shift: { select: { id: true, name: true } },
  operator: { select: { id: true, name: true, email: true, employeeId: true } },
  machines: {
    include: {
      machine: { select: { id: true, name: true, status: true, serialNumber: true } },
    },
  },
};
