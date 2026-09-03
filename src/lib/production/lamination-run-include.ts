export const laminationRunInclude = {
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
  laminationMachine: { select: { id: true, name: true, status: true, serialNumber: true } },
  operator: { select: { id: true, name: true, email: true, employeeId: true } },
  inputRoll: {
    select: {
      id: true,
      rollNumber: true,
      rollType: true,
      weight: true,
      length: true,
      batchLot: true,
      qualityStatus: true,
      sourcePhase: true,
      consumedAt: true,
    },
  },
  productionRoll: {
    select: {
      id: true,
      rollNumber: true,
      rollType: true,
      weight: true,
      length: true,
      batchLot: true,
      qualityStatus: true,
      sourcePhase: true,
    },
  },
};
