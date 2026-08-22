import { db } from "../src/lib/db";

async function main() {
  const roles = await db.role.findMany({ include: { permissions: true } });
  console.log("Roles:", JSON.stringify(roles, null, 2));
}

main().catch(console.error);
