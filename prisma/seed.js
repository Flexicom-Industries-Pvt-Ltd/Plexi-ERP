// prisma/seed.js
// This file seeds a SuperAdmin role with full module permissions and a user.

const { PrismaClient, Module } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  // Upsert SuperAdmin role
  const role = await prisma.role.upsert({
    where: { name: 'SuperAdmin' },
    update: {},
    create: {
      name: 'SuperAdmin',
      description: 'Role with full access to all modules',
    },
  });

  // Ensure RolePermission entries for every module with full CRUD rights
  const modules = Object.values(Module);
  for (const mod of modules) {
    await prisma.rolePermission.upsert({
      where: {
        roleId_module: { roleId: role.id, module: mod },
      },
      update: {
        canCreate: true,
        canRead: true,
        canUpdate: true,
        canDelete: true,
      },
      create: {
        roleId: role.id,
        module: mod,
        canCreate: true,
        canRead: true,
        canUpdate: true,
        canDelete: true,
      },
    });
  }

  // Hash password for the super admin user
  const hashedPassword = await bcrypt.hash('superadmin123', 12);

  // Upsert super admin user and link to role
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

  console.log('✅ SuperAdmin role and user seeded successfully.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
