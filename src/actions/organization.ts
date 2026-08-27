"use server";

import { db } from "@/lib/db";
import { safeAction } from "@/lib/safe-action";
import { revalidatePath } from "next/cache";
import { 
  DepartmentSchema, 
  SectionSchema, 
  LocationSchema, 
  MachineSchema 
} from "@/lib/schemas/organization";
import { requirePermission } from "@/lib/permissions";
import { Module } from "@/generated/prisma";
import { z } from "zod";

// --- DEPARTMENTS ---

export const createDepartment = safeAction(DepartmentSchema, async (data) => {
  await requirePermission(Module.SETTINGS, "canCreate");

  const dept = await db.department.create({
    data,
  });

  revalidatePath("/dashboard/settings/organization");
  return dept;
});

export const updateDepartment = safeAction(DepartmentSchema, async (data) => {
  await requirePermission(Module.SETTINGS, "canUpdate");

  if (!data.id) throw new Error("ID is required for updating");

  const dept = await db.department.update({
    where: { id: data.id },
    data,
  });

  revalidatePath("/dashboard/settings/organization");
  return dept;
});

// --- SECTIONS ---

export const createSection = safeAction(SectionSchema, async (data) => {
  await requirePermission(Module.SETTINGS, "canCreate");

  const section = await db.section.create({
    data,
  });

  revalidatePath("/dashboard/settings/organization");
  return section;
});

export const updateSection = safeAction(SectionSchema, async (data) => {
  await requirePermission(Module.SETTINGS, "canUpdate");

  if (!data.id) throw new Error("ID is required for updating");

  const section = await db.section.update({
    where: { id: data.id },
    data,
  });

  revalidatePath("/dashboard/settings/organization");
  return section;
});

// --- LOCATIONS ---

export const createLocation = safeAction(LocationSchema, async (data) => {
  await requirePermission(Module.SETTINGS, "canCreate");

  const loc = await db.location.create({
    data,
  });

  revalidatePath("/dashboard/settings/organization");
  return loc;
});

export const updateLocation = safeAction(LocationSchema, async (data) => {
  await requirePermission(Module.SETTINGS, "canUpdate");

  if (!data.id) throw new Error("ID is required for updating");

  const loc = await db.location.update({
    where: { id: data.id },
    data,
  });

  revalidatePath("/dashboard/settings/organization");
  return loc;
});

// --- MACHINES ---

export const createMachine = safeAction(MachineSchema, async (data) => {
  await requirePermission(Module.SETTINGS, "canCreate");

  const machine = await db.machine.create({
    data,
  });

  revalidatePath("/dashboard/settings/organization");
  return machine;
});

export const updateMachine = safeAction(MachineSchema, async (data) => {
  await requirePermission(Module.SETTINGS, "canUpdate");

  if (!data.id) throw new Error("ID is required for updating");

  const machine = await db.machine.update({
    where: { id: data.id },
    data,
  });

  revalidatePath("/dashboard/settings/organization");
  return machine;
});
