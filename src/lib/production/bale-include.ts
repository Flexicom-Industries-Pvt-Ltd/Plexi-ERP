export const baleInclude = {
  product: {
    select: {
      id: true,
      code: true,
      name: true,
      currentStock: true,
      stock: { select: { id: true, name: true, materialType: true } },
    },
  },
  baleItem: {
    select: {
      id: true,
      code: true,
      name: true,
      stock: { select: { id: true, name: true, materialType: true } },
    },
  },
  shift: { select: { id: true, name: true, startTime: true, endTime: true } },
  createdBy: { select: { id: true, name: true, email: true } },
};
