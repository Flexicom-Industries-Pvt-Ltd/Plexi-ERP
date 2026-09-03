export const convertexRunInclude = {
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
  convertexMachine: { select: { id: true, name: true, status: true, serialNumber: true } },
  operator: { select: { id: true, name: true, email: true, employeeId: true } },
  inputMaterial: {
    select: {
      id: true,
      code: true,
      name: true,
      currentStock: true,
      stock: { select: { id: true, name: true, materialType: true } },
    },
  },
  outputItem: {
    select: {
      id: true,
      code: true,
      name: true,
      currentStock: true,
      stock: { select: { id: true, name: true, materialType: true } },
    },
  },
};
