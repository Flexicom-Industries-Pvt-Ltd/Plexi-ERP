import { execSync } from "node:child_process";

const databaseUrl = process.env.DIRECT_URL || process.env.DATABASE_URL;

if (!databaseUrl) {
  console.log("Skipping prisma migrate deploy (no DIRECT_URL or DATABASE_URL).");
  process.exit(0);
}

console.log("Running prisma migrate deploy...");
execSync("npx prisma migrate deploy", { stdio: "inherit", env: process.env });
