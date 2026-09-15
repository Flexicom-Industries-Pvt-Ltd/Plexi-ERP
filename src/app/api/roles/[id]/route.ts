import { NextRequest } from "next/server";
import { requireApiAuth } from "@/lib/api-auth";
import { apiSuccess, apiError } from "@/lib/api-response";
import { RoleService } from "@/services/role.service";
import { UpdateRoleSchema, RolePermissionSchema } from "@/lib/schemas/roles";
import { Module } from "@/generated/prisma";
import { z } from "zod";

const PatchRoleSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  permissions: z.array(RolePermissionSchema).optional(),
});

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireApiAuth({ module: Module.SETTINGS, action: "canRead" });
  if (!auth.ok) return auth.response;

  try {
    const { id } = await context.params;
    const role = await RoleService.getRoleById(id);

    if (!role) {
      return apiError("Role not found", 404);
    }

    return apiSuccess(role);
  } catch (error: any) {
    return apiError(error.message || "Failed to retrieve role", 500);
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireApiAuth({ module: Module.SETTINGS, action: "canUpdate" });
  if (!auth.ok) return auth.response;

  try {
    const { id } = await context.params;
    const body = await request.json();
    const parsed = PatchRoleSchema.safeParse(body);

    if (!parsed.success) {
      return apiError("Validation failed", 400, {
        validationErrors: parsed.error.flatten().fieldErrors,
      });
    }

    const currentRole = await RoleService.getRoleById(id);
    if (!currentRole) return apiError("Role not found", 404);

    const updatedRole = await RoleService.updateRole(id, {
      name: parsed.data.name ?? currentRole.name,
      description: parsed.data.description ?? (currentRole.description || undefined),
      permissions: parsed.data.permissions ?? (currentRole.permissions as any),
    });

    return apiSuccess(updatedRole);
  } catch (error: any) {
    const status = error.message?.includes("not found") ? 404 : 400;
    return apiError(error.message || "Failed to update role", status);
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireApiAuth({ module: Module.SETTINGS, action: "canDelete" });
  if (!auth.ok) return auth.response;

  try {
    const { id } = await context.params;
    const result = await RoleService.deleteRole(id);
    return apiSuccess(result);
  } catch (error: any) {
    const status = error.message?.includes("not found") ? 404 : 400;
    return apiError(error.message || "Failed to delete role", status);
  }
}
