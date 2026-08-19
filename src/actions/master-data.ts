"use server";

import { withTransaction } from "@/lib/transaction";
import { Module, LocationType } from "@/generated/prisma";
import { revalidatePath } from "next/cache";

export async function createDepartment(data: { name: string; code: string; description?: string }) {
  const result = await withTransaction({
    action: "CREATE_DEPARTMENT",
    module: Module.SETTINGS,
    newValues: data
  }, async (tx) => {
    const department = await tx.department.create({ data });
    return department;
  });

  revalidatePath('/dashboard/settings/organization');
  return result;
}

export async function updateDepartment(id: string, data: { name: string; code: string; description?: string; isActive: boolean }) {
  const result = await withTransaction({
    action: "UPDATE_DEPARTMENT",
    module: Module.SETTINGS,
    entityId: id,
    newValues: data
  }, async (tx) => {
    const department = await tx.department.update({
      where: { id },
      data
    });
    return department;
  });

  revalidatePath('/dashboard/settings/organization');
  return result;
}

export async function createSection(data: { name: string; code: string; departmentId: string; description?: string }) {
  const result = await withTransaction({
    action: "CREATE_SECTION",
    module: Module.SETTINGS,
    newValues: data
  }, async (tx) => {
    const section = await tx.section.create({ data });
    return section;
  });

  revalidatePath('/dashboard/settings/organization');
  return result;
}

export async function updateSection(id: string, data: { name: string; code: string; departmentId: string; description?: string; isActive: boolean }) {
  const result = await withTransaction({
    action: "UPDATE_SECTION",
    module: Module.SETTINGS,
    entityId: id,
    newValues: data
  }, async (tx) => {
    const section = await tx.section.update({
      where: { id },
      data
    });
    return section;
  });

  revalidatePath('/dashboard/settings/organization');
  return result;
}

export async function createLocation(data: { name: string; code: string; type: LocationType; description?: string }) {
  const result = await withTransaction({
    action: "CREATE_LOCATION",
    module: Module.SETTINGS,
    newValues: data
  }, async (tx) => {
    const location = await tx.location.create({ data });
    return location;
  });

  revalidatePath('/dashboard/settings/organization');
  return result;
}

export async function updateLocation(id: string, data: { name: string; code: string; type: LocationType; description?: string; isActive: boolean }) {
  const result = await withTransaction({
    action: "UPDATE_LOCATION",
    module: Module.SETTINGS,
    entityId: id,
    newValues: data
  }, async (tx) => {
    const location = await tx.location.update({
      where: { id },
      data
    });
    return location;
  });

  revalidatePath('/dashboard/settings/organization');
  return result;
}

export async function createMachine(data: { name: string; sectionId: string; serialNumber?: string; make?: string; model?: string }) {
  const result = await withTransaction({
    action: "CREATE_MACHINE",
    module: Module.SETTINGS,
    newValues: data
  }, async (tx) => {
    const machine = await tx.machine.create({ data });
    return machine;
  });

  revalidatePath('/dashboard/settings/organization');
  return result;
}

export async function updateMachine(id: string, data: { name: string; sectionId: string; serialNumber?: string; make?: string; model?: string; status?: string; isActive?: boolean }) {
  const result = await withTransaction({
    action: "UPDATE_MACHINE",
    module: Module.SETTINGS,
    entityId: id,
    newValues: data
  }, async (tx) => {
    const machine = await tx.machine.update({
      where: { id },
      data
    });
    return machine;
  });

  revalidatePath('/dashboard/settings/organization');
  return result;
}

export async function createConfigParameter(data: { key: string; value: string; description?: string }) {
  const result = await withTransaction({
    action: "CREATE_CONFIG",
    module: Module.SETTINGS,
    newValues: data
  }, async (tx) => {
    const config = await tx.configParameter.create({ data });
    return config;
  });

  revalidatePath('/dashboard/settings/organization');
  return result;
}

export async function updateConfigParameter(id: string, data: { value: string; description?: string }) {
  const result = await withTransaction({
    action: "UPDATE_CONFIG",
    module: Module.SETTINGS,
    entityId: id,
    newValues: data
  }, async (tx) => {
    const config = await tx.configParameter.update({
      where: { id },
      data
    });
    return config;
  });

  revalidatePath('/dashboard/settings/organization');
  return result;
}
