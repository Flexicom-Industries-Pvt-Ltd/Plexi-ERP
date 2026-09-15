import { NextRequest } from "next/server";
import { requireApiAuth } from "@/lib/api-auth";
import { apiSuccess, apiError } from "@/lib/api-response";
import { UserService } from "@/services/user.service";
import { CreateUserSchema } from "@/lib/schemas/users";
import { Module } from "@/generated/prisma";

export async function GET(request: NextRequest) {
  const auth = await requireApiAuth({ module: Module.USERS, action: "canRead" });
  if (!auth.ok) return auth.response;

  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search");
    const roleId = searchParams.get("roleId");
    const departmentId = searchParams.get("departmentId");
    const isActive = searchParams.get("isActive");
    const page = searchParams.get("page");
    const limit = searchParams.get("limit");

    const result = await UserService.listUsers(
      {
        search,
        roleId,
        departmentId,
        isActive,
        page,
        limit,
      },
      { paginate: Boolean(page || limit) }
    );

    return apiSuccess(result.users, { meta: result.meta ? { ...result.meta } : undefined });
  } catch (error: any) {
    return apiError(error.message || "Failed to fetch users", 500);
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireApiAuth({ module: Module.USERS, action: "canCreate" });
  if (!auth.ok) return auth.response;

  try {
    const body = await request.json();
    const parsed = CreateUserSchema.safeParse(body);

    if (!parsed.success) {
      return apiError("Validation failed", 400, {
        validationErrors: parsed.error.flatten().fieldErrors,
      });
    }

    const newUser = await UserService.createUser(parsed.data);
    return apiSuccess(newUser, { status: 201 });
  } catch (error: any) {
    return apiError(error.message || "Failed to create user", 400);
  }
}
