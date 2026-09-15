import { NextRequest } from "next/server";
import { requireApiAuth } from "@/lib/api-auth";
import { apiSuccess, apiError } from "@/lib/api-response";
import { UserService } from "@/services/user.service";
import { Module } from "@/generated/prisma";
import { z } from "zod";

const PatchUserSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  password: z.string().min(6).optional().or(z.literal("")),
  employeeId: z.string().optional(),
  roleId: z.string().optional(),
  departmentId: z.string().optional(),
  phone: z.string().optional(),
  isActive: z.boolean().optional(),
});

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireApiAuth({ module: Module.USERS, action: "canRead" });
  if (!auth.ok) return auth.response;

  try {
    const { id } = await context.params;
    const user = await UserService.getUserById(id);

    if (!user) {
      return apiError("User not found", 404);
    }

    return apiSuccess(user);
  } catch (error: any) {
    return apiError(error.message || "Failed to retrieve user", 500);
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireApiAuth({ module: Module.USERS, action: "canUpdate" });
  if (!auth.ok) return auth.response;

  try {
    const { id } = await context.params;
    const body = await request.json();
    const parsed = PatchUserSchema.safeParse(body);

    if (!parsed.success) {
      return apiError("Validation failed", 400, {
        validationErrors: parsed.error.flatten().fieldErrors,
      });
    }

    const updatedUser = await UserService.updateUser(id, parsed.data);
    return apiSuccess(updatedUser);
  } catch (error: any) {
    const status = error.message?.includes("not found") ? 404 : 400;
    return apiError(error.message || "Failed to update user", status);
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireApiAuth({ module: Module.USERS, action: "canDelete" });
  if (!auth.ok) return auth.response;

  try {
    const { id } = await context.params;
    const result = await UserService.deleteUser(id);
    return apiSuccess(result);
  } catch (error: any) {
    const status = error.message?.includes("not found") ? 404 : 400;
    return apiError(error.message || "Failed to delete user", status);
  }
}
