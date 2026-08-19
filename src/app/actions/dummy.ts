"use server";

import { withTransaction } from "@/lib/transaction";
import { Module } from "@/generated/prisma";

export async function createDummyCategoryAction(name: string) {
  // This will enforce authentication, extract context, pass tx, and log audit!
  return await withTransaction({
    action: "CREATE_CATEGORY",
    module: Module.SETTINGS,
    newValues: { name },
  }, async (tx, context) => {
    // Note how we use `tx` here instead of `db`
    const category = await tx.category.create({
      data: {
        name: name + "_" + context.correlationId.slice(0, 4),
        itemType: "RAW_MATERIAL",
      }
    });

    return category;
  });
}
