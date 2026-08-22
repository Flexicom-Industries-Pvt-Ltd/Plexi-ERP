"use server";

import { withTransaction } from "@/lib/transaction";
import { Module } from "@/generated/prisma";
import { revalidatePath } from "next/cache";
import { safeAction } from "@/lib/safe-action";
import { 
  CreateDepartmentSchema, UpdateDepartmentSchema, 
  CreateSectionSchema, UpdateSectionSchema,
  CreateLocationSchema, UpdateLocationSchema,
  CreateMachineSchema, UpdateMachineSchema,
  CreateConfigParameterSchema, UpdateConfigParameterSchema
} from "@/lib/schemas/master-data";

export const createDepartment = safeAction(CreateDepartmentSchema, async (data) => {
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
});

export const updateDepartment = safeAction(UpdateDepartmentSchema, async (data) => {
  const { id, ...updateData } = data;
  const result = await withTransaction({
    action: "UPDATE_DEPARTMENT",
    module: Module.SETTINGS,
    entityId: id,
    newValues: updateData
  }, async (tx) => {
    const department = await tx.department.update({
      where: { id },
      data: updateData
    });
    return department;
  });

  revalidatePath('/dashboard/settings/organization');
  return result;
});

export const createSection = safeAction(CreateSectionSchema, async (data) => {
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
});

export const updateSection = safeAction(UpdateSectionSchema, async (data) => {
  const { id, ...updateData } = data;
  const result = await withTransaction({
    action: "UPDATE_SECTION",
    module: Module.SETTINGS,
    entityId: id,
    newValues: updateData
  }, async (tx) => {
    const section = await tx.section.update({
      where: { id },
      data: updateData
    });
    return section;
  });

  revalidatePath('/dashboard/settings/organization');
  return result;
});

export const createLocation = safeAction(CreateLocationSchema, async (data) => {
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
});

export const updateLocation = safeAction(UpdateLocationSchema, async (data) => {
  const { id, ...updateData } = data;
  const result = await withTransaction({
    action: "UPDATE_LOCATION",
    module: Module.SETTINGS,
    entityId: id,
    newValues: updateData
  }, async (tx) => {
    const location = await tx.location.update({
      where: { id },
      data: updateData
    });
    return location;
  });

  revalidatePath('/dashboard/settings/organization');
  return result;
});

export const createMachine = safeAction(CreateMachineSchema, async (data) => {
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
});

export const updateMachine = safeAction(UpdateMachineSchema, async (data) => {
  const { id, ...updateData } = data;
  const result = await withTransaction({
    action: "UPDATE_MACHINE",
    module: Module.SETTINGS,
    entityId: id,
    newValues: updateData
  }, async (tx) => {
    const machine = await tx.machine.update({
      where: { id },
      data: updateData
    });
    return machine;
  });

  revalidatePath('/dashboard/settings/organization');
  return result;
});

export const createConfigParameter = safeAction(CreateConfigParameterSchema, async (data) => {
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
});

export const updateConfigParameter = safeAction(UpdateConfigParameterSchema, async (data) => {
  const { id, ...updateData } = data;
  const result = await withTransaction({
    action: "UPDATE_CONFIG",
    module: Module.SETTINGS,
    entityId: id,
    newValues: updateData
  }, async (tx) => {
    const config = await tx.configParameter.update({
      where: { id },
      data: updateData
    });
    return config;
  });

  revalidatePath('/dashboard/settings/organization');
  return result;
});
