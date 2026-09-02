export const bobbinRunInclude = {
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
  rawMaterialItem: { select: { id: true, code: true, name: true, currentStock: true } },
  outputItem: { select: { id: true, code: true, name: true, currentStock: true } },
};
