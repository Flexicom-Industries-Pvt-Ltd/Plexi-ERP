import { neonConfig, Pool } from '@neondatabase/serverless';
import ws from 'ws';
import bcrypt from 'bcryptjs';

neonConfig.webSocketConstructor = ws;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Create SUPERADMIN role
    const roleId = `cuid_superadmin_${Date.now()}`;
    const roleResult = await client.query(
      `INSERT INTO "Role" (id, name, description, "createdAt", "updatedAt")
       VALUES ($1, 'SUPERADMIN', 'Full access to all modules', now(), now())
       ON CONFLICT (name) DO UPDATE SET description = EXCLUDED.description
       RETURNING id`,
      [roleId]
    );
    const finalRoleId = roleResult.rows[0].id;
    console.log('✅ SUPERADMIN role:', finalRoleId);

    // 2. Create permissions for all modules
    const modules = ['SETTINGS', 'USERS', 'SECURITY_GATE', 'INVENTORY', 'PRODUCTION', 'QUALITY_CONTROL', 'DISPATCH'];
    for (const mod of modules) {
      await client.query(
        `INSERT INTO "RolePermission" (id, "roleId", module, "canCreate", "canRead", "canUpdate", "canDelete")
         VALUES ($1, $2, $3::"Module", true, true, true, true)
         ON CONFLICT ("roleId", module) DO UPDATE
         SET "canCreate" = true, "canRead" = true, "canUpdate" = true, "canDelete" = true`,
        [`perm_${mod.toLowerCase()}_${Date.now()}`, finalRoleId, mod]
      );
    }
    console.log('✅ All module permissions granted');

    // 3. Create superadmin user
    const passwordHash = await bcrypt.hash('superadmin123', 10);
    await client.query(
      `INSERT INTO "User" (id, email, name, password, "isActive", "roleId", "createdAt", "updatedAt")
       VALUES ($1, 'superadmin@plexierp.com', 'Super Admin', $2, true, $3, now(), now())
       ON CONFLICT (email) DO UPDATE
       SET password = EXCLUDED.password, "roleId" = EXCLUDED."roleId", name = EXCLUDED.name`,
      [`user_superadmin_${Date.now()}`, passwordHash, finalRoleId]
    );
    console.log('✅ superadmin@plexierp.com created (password: superadmin123)');

    await client.query('COMMIT');
    console.log('\n🎉 Seeding complete!');
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(console.error);
