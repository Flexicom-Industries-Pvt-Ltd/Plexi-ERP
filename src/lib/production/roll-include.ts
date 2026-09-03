export const productionRollInclude = {
  location: { select: { id: true, name: true, code: true } },
  inventoryItem: {
    select: {
      id: true,
      code: true,
      name: true,
      stock: { select: { id: true, name: true, materialType: true } },
    },
  },
  loomProductionRun: {
    include: {
      loomMachine: { select: { id: true, name: true, serialNumber: true } },
      operator: { select: { id: true, name: true, email: true } },
      bobbinItem: { select: { id: true, code: true, name: true } },
    },
  },
  laminationProductionRun: {
    include: {
      laminationMachine: { select: { id: true, name: true, serialNumber: true } },
      operator: { select: { id: true, name: true, email: true } },
      inputRoll: { select: { id: true, rollNumber: true, rollType: true } },
    },
  },
  printingProductionRun: {
    include: {
      printingMachine: { select: { id: true, name: true, serialNumber: true } },
      operator: { select: { id: true, name: true, email: true } },
      inputRoll: { select: { id: true, rollNumber: true, rollType: true } },
      helpers: {
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
      },
    },
  },
  productionRun: {
    include: {
      planLine: {
        include: {
          plan: {
            select: {
              id: true,
              planNumber: true,
              planDate: true,
              status: true,
              shift: { select: { id: true, name: true } },
            },
          },
          machine: { select: { id: true, name: true } },
          operator: { select: { id: true, name: true } },
          inventoryItem: { select: { id: true, code: true, name: true } },
        },
      },
      recordedBy: { select: { id: true, name: true, email: true } },
    },
  },
};
