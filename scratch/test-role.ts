import { Module } from "../src/generated/prisma";
import { CreateRoleSchema } from "../src/lib/schemas/roles";

const modules = Object.values(Module);
console.log("Modules:", modules);

const data = {
  name: "Test",
  description: "",
  permissions: modules.map(m => ({
    module: m,
    canCreate: true,
    canRead: true,
    canUpdate: true,
    canDelete: true,
  }))
};

const res = CreateRoleSchema.safeParse(data);
console.log("Validation:", res.success ? "Success" : JSON.stringify(res.error.flatten().fieldErrors, null, 2));
