// @ts-nocheck

// Seed script to create a SuperAdmin role with full module access and a user account.
// Run with: npx prisma db seed

import { PrismaClient, Module } from '@prisma/client';
import { hash } from 'bcryptjs'; // ensure bcryptjs is installed

const prisma = new PrismaClient();

async function main() {
  // 1. Upsert SuperAdmin role
  const role = await prisma.role.upsert({
    where: { name: 'SuperAdmin' },
    update: {},
    create: {
      name: 'SuperAdmin',
      description: 'Role with full access to all modules',
    },
  });

  // 2. Ensure RolePermission entries for every module with full CRUD rights
  const modules = Object.values(Module);
  for (const mod of modules) {
    await prisma.rolePermission.upsert({
      where: {
        roleId_module: { roleId: role.id, module: mod as any },
      },
      update: {
        canCreate: true,
        canRead: true,
        canUpdate: true,
        canDelete: true,
      },
      create: {
        roleId: role.id,
        module: mod as any,
        canCreate: true,
        canRead: true,
        canUpdate: true,
        canDelete: true,
      },
    });
  }

  // 3. Hash password for the super admin user
  const hashedPassword = await hash('superadmin123', 12);

  // 4. Upsert super admin user and link to role
  await prisma.user.upsert({
    where: { email: 'superadmin@plexierp.com' },
    update: {
      roleId: role.id,
      password: hashedPassword,
    },
    create: {
      email: 'superadmin@plexierp.com',
      name: 'Super Admin',
      password: hashedPassword,
      roleId: role.id,
      isActive: true,
    },
  });

  console.log('? SuperAdmin role and user seeded successfully.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
