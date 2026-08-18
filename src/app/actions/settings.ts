"use server";

import { z } from "zod";
import { safeAction } from "@/lib/safe-action";
import { db } from "@/lib/db";
import { ItemType, UomType } from "@/generated/prisma";
import { revalidatePath } from "next/cache";

// --- SHIFTS ---

const createShiftSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  startTime: z.string().regex(/^([01]\d|2[0-3]):?([0-5]\d)$/, "Invalid start time format (HH:MM)"),
  endTime: z.string().regex(/^([01]\d|2[0-3]):?([0-5]\d)$/, "Invalid end time format (HH:MM)"),
});

export const createShift = safeAction(createShiftSchema, async (data) => {
  const shift = await db.shift.create({
    data: {
      name: data.name,
      startTime: data.startTime,
      endTime: data.endTime,
    },
  });

  revalidatePath("/settings/shifts");
  return shift;
});

// --- UNIT OF MEASUREMENT (UOM) ---

const createUomSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  abbreviation: z.string().min(1, "Abbreviation is required"),
  type: z.nativeEnum(UomType),
});

export const createUom = safeAction(createUomSchema, async (data) => {
  const uom = await db.unitOfMeasurement.create({
    data: {
      name: data.name,
      abbreviation: data.abbreviation,
      type: data.type,
    },
  });

  revalidatePath("/settings/uom");
  return uom;
});

// --- CATEGORIES ---

const createCategorySchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  description: z.string().optional(),
  itemType: z.nativeEnum(ItemType),
});

export const createCategory = safeAction(createCategorySchema, async (data) => {
  const category = await db.category.create({
    data: {
      name: data.name,
      description: data.description,
      itemType: data.itemType,
    },
  });

  revalidatePath("/settings/categories");
  return category;
});
