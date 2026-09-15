import { NextRequest } from "next/server";
import { requireApiAuth } from "@/lib/api-auth";
import { apiSuccess, apiError } from "@/lib/api-response";
import { RoleService } from "@/services/role.service";
import { CreateRoleSchema } from "@/lib/schemas/roles";
import { Module } from "@/generated/prisma";

export async function GET(request: NextRequest) {
  const auth = await requireApiAuth({ module: Module.SETTINGS, action: "canRead" });
  if (!auth.ok) return auth.response;

  try {
    const roles = await RoleService.listRoles();
    return apiSuccess(roles);
  } catch (error: any) {
    return apiError(error.message || "Failed to fetch roles", 500);
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireApiAuth({ module: Module.SETTINGS, action: "canCreate" });
  if (!auth.ok) return auth.response;

  try {
    const body = await request.json();
    const parsed = CreateRoleSchema.safeParse(body);

    if (!parsed.success) {
      return apiError("Validation failed", 400, {
        validationErrors: parsed.error.flatten().fieldErrors,
      });
    }

    const newRole = await RoleService.createRole(parsed.data);
    return apiSuccess(newRole, { status: 201 });
  } catch (error: any) {
    return apiError(error.message || "Failed to create role", 400);
  }
}
